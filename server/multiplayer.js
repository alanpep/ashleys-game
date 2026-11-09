// Two-player support. This runs inside the Vite dev server (the one Play.bat starts),
// and uses Vite's own WebSocket, so there is nothing extra to install.
//
// The server keeps the one shared copy of the neighborhood (and saves it to
// saves/world.json), and passes each player's position along to everyone else.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MAX_PLAYERS = 4;

export default function multiplayer() {
  return {
    name: 'ashleys-house-multiplayer',
    configureServer(server) {
      // HOUSE_SAVE lets a test server use its own save file instead of the real house
      const file = process.env.HOUSE_SAVE || path.join(server.config.root, 'saves', 'world.json');
      let world = null; // { areas: [...], rooms: {name: {wall, floor}}, items: {id: record} }
      try { world = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first time */ }

      let writeTimer = null;
      const persist = () => {
        clearTimeout(writeTimer);
        writeTimer = setTimeout(() => {
          try {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file + '.tmp', JSON.stringify(world));
            fs.renameSync(file + '.tmp', file);
          } catch (e) { console.warn('[multiplayer] could not save', e.message); }
        }, 500);
      };

      const players = new Map(); // socket -> { id, character, pose }
      let nextId = 1;
      const others = (socket) => [...server.ws.clients].filter((c) => c.socket !== socket && players.has(c.socket));
      const tellOthers = (socket, event, data) => { for (const c of others(socket)) c.send(event, data); };

      const lanUrls = () => {
        const port = server.httpServer?.address()?.port ?? server.config.server.port ?? 5173;
        const urls = [];
        for (const [name, list] of Object.entries(os.networkInterfaces())) {
          if (/vEthernet|WSL|Docker|VirtualBox|VMware|Hyper-V|Loopback|Tailscale|ZeroTier/i.test(name)) continue; // not the home Wi-Fi
          for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) urls.push(`http://${a.address}:${port}/`);
        }
        return urls;
      };

      server.ws.on('connection', (socket) => {
        socket.on('close', () => {
          const p = players.get(socket);
          if (!p) return;
          players.delete(socket);
          tellOthers(socket, 'mp:leave', { id: p.id });
        });
      });

      server.ws.on('mp:hello', (data, client) => {
        if (players.size >= MAX_PLAYERS && !players.has(client.socket)) { client.send('mp:full', {}); return; }
        const p = { id: nextId++, character: data.character, pose: null };
        players.set(client.socket, p);
        let adopted = false;
        if (!world && data.world) { world = data.world; adopted = true; persist(); }
        client.send('mp:welcome', {
          id: p.id,
          world: adopted ? null : world,
          players: [...players.values()].filter((o) => o !== p),
          urls: lanUrls(),
        });
        tellOthers(client.socket, 'mp:join', p);
      });

      server.ws.on('mp:char', (data, client) => {
        const p = players.get(client.socket);
        if (!p) return;
        p.character = data.character;
        tellOthers(client.socket, 'mp:char', { id: p.id, character: p.character });
      });

      server.ws.on('mp:pose', (data, client) => {
        const p = players.get(client.socket);
        if (!p) return;
        p.pose = data;
        tellOthers(client.socket, 'mp:pose', { id: p.id, ...data });
      });

      // A list of changes to the neighborhood: new/moved items, removed items, paint colors.
      server.ws.on('mp:changes', (data, client) => {
        const p = players.get(client.socket);
        if (!p) return;
        world ??= { areas: [], rooms: {}, items: {} };
        for (const rec of data.items ?? []) world.items[rec.id] = rec;
        for (const id of data.del ?? []) delete world.items[id];
        Object.assign(world.rooms, data.rooms ?? {});
        if (data.areas) world.areas = [...new Set([...world.areas, ...data.areas])];
        persist();
        tellOthers(client.socket, 'mp:changes', { from: p.id, ...data });
      });

      // Doors opening and closing
      server.ws.on('mp:door', (data, client) => {
        const p = players.get(client.socket);
        if (!p) return;
        world ??= { areas: [], rooms: {}, items: {} };
        world.doors ??= {};
        world.doors[data.id] = !!data.open;
        persist();
        tellOthers(client.socket, 'mp:door', data);
      });

      // Little fun things everyone should hear/see (quacks, sparkles, waves).
      server.ws.on('mp:fx', (data, client) => {
        const p = players.get(client.socket);
        if (p) tellOthers(client.socket, 'mp:fx', { id: p.id, ...data });
      });

      server.httpServer?.once('listening', () => {
        const urls = lanUrls();
        if (!urls.length) return;
        console.log('\n  👫 Second player? On another computer on the same Wi-Fi, open:');
        for (const u of urls) console.log('     ' + u);
        console.log('');
      });
    },
  };
}
