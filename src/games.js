// Playground games with the neighborhood kids: Tag and Hide & Seek.
// The kids hang out at Kenwood Park and at the school playground. Right-click one to play!
import * as THREE from 'three';
import { createCharacter, animateCharacter, setMood, DEFAULT_CHARACTER } from './character.js';
import { bubble } from './townsfolk.js';

export const PLAYGROUNDS = [
  { id: 'park', name: 'Kenwood Park', x: 33, z: -28, r: 13, kids: [
    { name: 'Lily', look: { age: 'kid', body: 'girl', skin: '#f1c7a3', hair: 'pigtails', hairColor: '#a8592f', top: 'tee', topColor: '#ef84ad', bottom: 'skirt', bottomColor: '#bba6e6', hat: 'bow', extraColor: '#f7da7e', face: 'none' } },
    { name: 'Sam', look: { age: 'kid', body: 'boy', skin: '#9a6440', hair: 'curly', hairColor: '#2b2220', top: 'hoodie', topColor: '#93c9ea', bottom: 'shorts', bottomColor: '#3f5f8f', hat: 'none', face: 'none' } },
    { name: 'Maya', look: { age: 'kid', body: 'girl', skin: '#e0ac84', hair: 'ponytail', hairColor: '#2b2220', top: 'tee', topColor: '#aee0c5', bottom: 'pants', bottomColor: '#5b7fb0', hat: 'none', face: 'glasses' } },
    { name: 'Leo', look: { age: 'kid', body: 'boy', skin: '#fbe3cf', hair: 'spiky', hairColor: '#d9a95a', top: 'tee', topColor: '#f2a25f', bottom: 'shorts', bottomColor: '#4f8a46', hat: 'cap', extraColor: '#d9443a', face: 'none' } },
  ] },
  { id: 'school', name: 'the school playground', x: 13.4, z: -41.9, r: 9, kids: [
    { name: 'Nora', look: { age: 'kid', body: 'girl', skin: '#6b4128', hair: 'curly', hairColor: '#2b2220', top: 'long', topColor: '#f7da7e', bottom: 'pants', bottomColor: '#bba6e6', hat: 'none', face: 'none' } },
    { name: 'Finn', look: { age: 'kid', body: 'boy', skin: '#f1c7a3', hair: 'short', hairColor: '#7a4a2c', top: 'tee', topColor: '#5fb3a8', bottom: 'pants', bottomColor: '#3f5f8f', hat: 'none', face: 'none' } },
    { name: 'Ivy', look: { age: 'kid', body: 'girl', skin: '#c68c63', hair: 'bob', hairColor: '#4a2f22', top: 'hoodie', topColor: '#bba6e6', bottom: 'shorts', bottomColor: '#5b7fb0', hat: 'none', face: 'none' } },
  ] },
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const TAG_TIME = 90, SEEK_TIME = 180, COUNT = 10;

export function setupGames(ctx) {
  const { scene, $, player } = ctx;
  const kids = [];
  for (const pg of PLAYGROUNDS) for (const d of pg.kids) {
    const ch = createCharacter({ ...DEFAULT_CHARACTER, ...d.look, name: d.name });
    const k = { def: { name: d.name, look: d.look }, ch, root: ch.root, pg, pos: ch.root.position, facing: rand(0, 6), speed: 0, wait: rand(0, 3), target: null, bub: null, bubUntil: 0, mood: null };
    ch.root.traverse((o) => { o.userData.gameKid = k; });
    k.pos.set(pg.x + rand(-3, 3), 0, pg.z + rand(-3, 3));
    scene.add(ch.root);
    kids.push(k);
  }
  let game = null; // { kind: 'tag'|'seek', pg, kids, t, ... }

  function say(k, text, ms = 2200, voice = true) {
    if (k.bub) scene.remove(k.bub);
    k.bub = bubble(text); scene.add(k.bub); k.bubUntil = performance.now() + ms;
    if (voice) ctx.speak(text, k);
  }
  function face(k, x, z, dt, rate = 10) {
    const want = Math.atan2(x - k.pos.x, z - k.pos.z);
    k.facing += Math.atan2(Math.sin(want - k.facing), Math.cos(want - k.facing)) * Math.min(1, dt * rate);
  }
  // walk or run toward a spot, sliding around things in the way
  function step(k, tx, tz, sp, dt) {
    const dx = tx - k.pos.x, dz = tz - k.pos.z, l = Math.hypot(dx, dz);
    if (l < 0.15) { k.speed = 0; return true; }
    const base = Math.atan2(dx, dz), go = Math.min(l, sp * dt);
    for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
      const a = base + off, nx = k.pos.x + Math.sin(a) * go, nz = k.pos.z + Math.cos(a) * go;
      if (!ctx.blocked(nx, nz)) {
        k.pos.x = nx; k.pos.z = nz; k.speed = sp;
        k.facing += Math.atan2(Math.sin(a - k.facing), Math.cos(a - k.facing)) * Math.min(1, dt * 10);
        return l < 0.3;
      }
    }
    k.speed = 0;
    return false;
  }
  function wander(k, dt, r = 4) {
    if (!k.target) {
      k.wait -= dt;
      k.speed = 0;
      if (k.wait <= 0) { const a = rand(0, 6.28), d = rand(0, r); k.target = [k.pg.x + Math.cos(a) * d, k.pg.z + Math.sin(a) * d]; }
      return;
    }
    if (step(k, k.target[0], k.target[1], 1.1, dt)) { k.target = null; k.wait = rand(1.5, 5); }
    if (k.target && k.speed === 0) { k.target = null; k.wait = 1; }
  }
  const distTo = (k, p) => Math.hypot(k.pos.x - p.x, k.pos.z - p.z);
  function bar(text) { $('gamebar').textContent = text; $('gamebar').classList.toggle('show', !!text); }
  function crouch(k, on) { k.crouch = on; }

  // ---------------- TAG ----------------
  function startTag(pg) {
    const ks = kids.filter((k) => k.pg === pg);
    for (const k of ks) { k.target = null; k.found = false; crouch(k, false); }
    game = { kind: 'tag', pg, kids: ks, t: TAG_TIME, it: pick(ks), freeze: 2.5, tagsBy: 0, tagged: 0, lastIt: null };
    say(game.it, "I'm IT! Count to 3... then RUN! 🏃");
    ctx.chime();
  }
  const youAreIt = () => game.it === 'you';
  function tagUpdate(dt) {
    const g = game, me = player.pos;
    g.t -= dt; g.freeze -= dt;
    bar(youAreIt() ? `🏃 TAG! You're IT! Catch someone! · ⏱ ${Math.ceil(g.t)}` : `🏃 TAG! ${g.it.def.name} is IT! Run away! · ⏱ ${Math.ceil(g.t)}`);
    for (const k of g.kids) {
      if (k === g.it) {
        if (g.freeze > 0) { k.speed = 0; face(k, me.x, me.z, dt); continue; }
        // chase whoever is closest (but not the one who just tagged you)
        let tgt = null, bd = Infinity;
        for (const o of [...g.kids, 'you']) {
          if (o === k || o === g.lastIt) continue;
          const d = o === 'you' ? distTo(k, me) : distTo(k, o.pos);
          if (d < bd) { bd = d; tgt = o; }
        }
        if (!tgt) continue;
        const tp = tgt === 'you' ? me : tgt.pos;
        step(k, tp.x, tp.z, 3.3, dt);
        if (bd < 0.9) {
          g.lastIt = k; g.it = tgt; g.freeze = 2.2;
          if (tgt === 'you') { g.tagged++; say(k, "Tag! You're IT! 😆"); ctx.toast("🏃 You're IT! Count to 3...", 1800); ctx.tagSound(); }
          else { say(k, `Tag, ${tgt.def.name}! 😆`, 1800, false); say(tgt, "Aww! I'm IT! 😤", 1800); }
        }
        continue;
      }
      // run away from IT when it gets close
      const itPos = youAreIt() ? me : g.it.pos;
      const d = Math.hypot(k.pos.x - itPos.x, k.pos.z - itPos.z);
      if (d < 7 && !(youAreIt() && g.freeze > 0 && d > 3)) {
        let ax = k.pos.x - itPos.x, az = k.pos.z - itPos.z;
        const cx = g.pg.x - k.pos.x, cz = g.pg.z - k.pos.z, cd = Math.hypot(cx, cz);
        if (cd > g.pg.r * 0.7) { ax += (cx / cd) * 6; az += (cz / cd) * 6; } // don't run off too far: curve back toward the playground
        const l = Math.hypot(ax, az) || 1;
        step(k, k.pos.x + (ax / l) * 2, k.pos.z + (az / l) * 2, 3.5, dt);
        k.target = null;
      } else wander(k, dt, g.pg.r * 0.6);
    }
    // you tag someone
    if (youAreIt() && g.freeze <= 0) {
      for (const k of g.kids) if (k !== g.lastIt && distTo(k, me) < 1.1) {
        g.lastIt = 'you'; g.it = k; g.freeze = 2.5; g.tagsBy++;
        say(k, pick(["Oh no! I'm IT! 😆", 'You got me! 😂', "Hey! No fair! I'm IT! 😤"]));
        ctx.tagSound(); ctx.burst(k.pos.clone().setY(1.2));
        break;
      }
    }
    if (Math.hypot(me.x - g.pg.x, me.z - g.pg.z) > g.pg.r + 18) { endGame('You ran too far away, so the game stopped! 🏃'); return; }
    if (g.t <= 0) endGame(g.tagsBy ? `⏱ Time's up! You tagged ${g.tagsBy} friend${g.tagsBy > 1 ? 's' : ''}! 🎉` : '⏱ Time’s up! Great running! 🎉', true);
  }

  // ---------------- HIDE & SEEK ----------------
  function startSeek(pg) {
    const ks = kids.filter((k) => k.pg === pg);
    const spots = ctx.hideSpots(pg.x, pg.z, 24).sort(() => Math.random() - 0.5);
    const chosen = [];
    for (const s of spots) {
      if (chosen.length >= ks.length) break;
      if (Math.hypot(s.x - player.pos.x, s.z - player.pos.z) < 6) continue;
      if (chosen.some((c) => Math.hypot(c.x - s.x, c.z - s.z) < 4)) continue;
      chosen.push(s);
    }
    while (chosen.length < ks.length) { const a = rand(0, 6.28), d = rand(10, 18), x = pg.x + Math.cos(a) * d, z = pg.z + Math.sin(a) * d; if (!ctx.blocked(x, z)) chosen.push({ x, z }); }
    ks.forEach((k, i) => { k.spot = chosen[i]; k.found = false; k.hidden = false; k.target = null; });
    game = { kind: 'seek', pg, kids: ks, count: COUNT, t: SEEK_TIME, giggle: 18, found: 0 };
    $('peek').classList.add('show');
    for (const k of ks) say(k, pick(['Ready? Close your eyes! 🙈', 'No peeking! 🙈', 'Hide! Hide! 🤫']), 1800, false);
    ctx.speak(`Close your eyes and count to ${COUNT}!`, ks[0]);
  }
  function seekUpdate(dt) {
    const g = game, me = player.pos;
    if (g.count > 0) {
      const before = Math.ceil(g.count);
      g.count -= dt;
      const now = Math.ceil(g.count);
      $('peekNum').textContent = Math.max(1, now);
      if (now !== before && now > 0) ctx.countSound(now);
      for (const k of g.kids) {
        if (k.hidden) continue;
        if (step(k, k.spot.x, k.spot.z, 4.2, dt) || g.count <= 0.3) { k.pos.set(k.spot.x, 0, k.spot.z); k.hidden = true; k.speed = 0; crouch(k, true); }
      }
      if (g.count <= 0) {
        for (const k of g.kids) { k.pos.set(k.spot.x, 0, k.spot.z); k.hidden = true; crouch(k, true); k.facing = Math.atan2(g.pg.x - k.pos.x, g.pg.z - k.pos.z) + Math.PI; }
        $('peek').classList.remove('show');
        ctx.speak('Ready or not, here I come!', { def: { name: 'narrator', look: {} }, root: { position: me } });
        ctx.toast('🔎 Ready or not, here I come! Find everyone!', 2600);
      }
      bar('🙈 Counting... no peeking!');
      return;
    }
    g.t -= dt;
    const left = g.kids.filter((k) => !k.found);
    bar(`🔎 HIDE & SEEK! Find your friends! · ${g.found} of ${g.kids.length} found · ⏱ ${Math.ceil(g.t)}`);
    for (const k of g.kids) {
      if (k.found) {
        // found kids go back to base and cheer you on
        if (!k.home && step(k, g.pg.x + (k.pg.kids.indexOf(k.def) - 1) * 1.2, g.pg.z, 2.8, dt)) k.home = true;
        if (k.home) { k.speed = 0; face(k, me.x, me.z, dt, 4); }
        continue;
      }
      const d = distTo(k, me);
      if (d < 2.4 || (ctx.looking() === k && d < 14)) {
        k.found = true; k.home = false; crouch(k, false); g.found++;
        say(k, pick(['You found me! 😆', 'Aww, you found me! 😂', 'How did you see me?! 🤭', 'Found! Good looking! 👀']));
        ctx.foundSound(); ctx.burst(k.pos.clone().setY(1.2));
      }
    }
    g.giggle -= dt;
    if (g.giggle <= 0 && left.length) { g.giggle = 15; const k = pick(left); say(k, 'Hee hee! 🤭', 1500, false); ctx.giggle(k.pos); }
    if (!left.length) endGame(`🎉 You found everyone! You're a super seeker!`, true);
    else if (g.t <= 0) {
      for (const k of left) { k.found = true; k.home = false; crouch(k, false); say(k, 'Here I am! 😄'); }
      endGame(`⏱ Time's up! You found ${g.found} of ${g.kids.length}! 🔎`, g.found > 0);
    }
  }

  function endGame(msg, good) {
    const g = game;
    game = null;
    bar('');
    $('peek').classList.remove('show');
    for (const k of g.kids) { crouch(k, false); k.target = null; k.wait = rand(1, 3); }
    ctx.toast(msg, 3500);
    if (good) { ctx.celebrate(); ctx.job('game'); }
    const k = g.kids[0];
    setTimeout(() => say(k, 'That was fun! Let’s play again soon! 😄'), 1200);
  }

  return {
    meshes: () => kids.filter((k) => k.root.visible).map((k) => k.root),
    find: (obj) => { while (obj) { if (obj.userData?.gameKid) return obj.userData.gameKid; obj = obj.parent; } return null; },
    playing: () => game?.kind ?? null,
    playgroundOf: (k) => k.pg,
    start(kind, pg) { if (game) endGame('Starting a new game!'); kind === 'tag' ? startTag(pg) : startSeek(pg); },
    stop() { if (game) endGame('Game over! 👋'); },
    hint(k) {
      if (!game) return `<b>${k.def.name}</b> — <kbd>Right-click</kbd> play tag or hide & seek!`;
      if (game.kind === 'tag') return game.kids.includes(k) ? (game.it === k ? `<b>${k.def.name}</b> is IT! Run! 🏃` : `<b>${k.def.name}</b>` + (youAreIt() ? ' — get close to tag them!' : '')) : `<b>${k.def.name}</b>`;
      return k.found ? `<b>${k.def.name}</b> — found! ✅` : `<b>${k.def.name}</b>`;
    },
    update(dt, t, cam) {
      if (game?.kind === 'tag') tagUpdate(dt);
      else if (game?.kind === 'seek') seekUpdate(dt);
      for (const k of kids) {
        const inGame = game?.kids.includes(k);
        if (!inGame) wander(k, dt);
        const far = (k.pos.x - cam.x) ** 2 + (k.pos.z - cam.z) ** 2 > 70 * 70;
        k.root.visible = !far;
        if (k.bub) { k.bub.position.set(k.pos.x, k.pos.y + k.ch.height + (k.crouch ? 0 : 0.45), k.pos.z); if (performance.now() > k.bubUntil) { scene.remove(k.bub); k.bub = null; } }
        if (far) continue;
        k.root.rotation.y = k.facing;
        animateCharacter(k.ch, t + k.def.name.length, k.speed, false);
        const p = k.ch.parts;
        if (k.crouch) { // squat down small behind something
          k.root.position.y = -k.ch.height * 0.18;
          p.legL.rotation.x = p.legR.rotation.x = -1.4;
          p.armL.rotation.x = p.armR.rotation.x = -1.2;
        } else {
          const cheering = game?.kind === 'seek' && k.found && k.home;
          k.root.position.y = cheering ? Math.abs(Math.sin(t * 6 + k.def.name.length)) * 0.25 : 0;
          if (cheering) p.armL.rotation.x = p.armR.rotation.x = -2.8;
        }
        if (game?.kind === 'tag' && game.it === k && k.mood !== 'mad') { setMood(k.ch, 'mad'); k.mood = 'mad'; }
        else if (!(game?.kind === 'tag' && game.it === k) && k.mood !== 'happy') { setMood(k.ch, 'happy'); k.mood = 'happy'; }
      }
    },
  };
}
