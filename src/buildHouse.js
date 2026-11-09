// Turns the HOUSE description (src/house.js) into 3D walls, floors, windows, roof and yard.
import * as THREE from 'three';
import { tex, worldBoxUV } from './textures.js';
import { P } from './palette.js';

const T = 0.1; // each room's wall is 10cm thick (shared walls end up 20cm)

export function buildHouse(house) {
  const H = house.wallHeight ?? 2.6;
  const group = new THREE.Group();
  const walls = [], floors = [], surfaces = [], solids = [], colliders = [], rooms = [], fans = [];

  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...o });
  const white = std(P.white, { roughness: 0.6 });
  const trim = std(P.white, { roughness: 0.5 });
  const dark = std(P.charcoal);
  const glow = new THREE.MeshStandardMaterial({ color: P.white, emissive: P.lampGlow, emissiveIntensity: 1.1 });
  const counterMat = std('#e8e2d8', { roughness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const brickMat = new THREE.MeshStandardMaterial({ map: tex.brick(), roughness: 0.95 });
  const ceilMat = new THREE.MeshBasicMaterial({ color: '#ece8e0' }); // unlit, so lights don't make hot spots
  const floorTex = { wood: tex.wood(), carpet: tex.carpet(), tile: tex.tile() };

  const collide = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

  // y = bottom of the box
  function addBox(w, h, d, x, y, z, mat, opts = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (opts.worldUV) worldBoxUV(geo, x, y + h / 2, z);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = !mat.transparent && !opts.noCast;
    m.receiveShadow = true;
    group.add(m);
    if (opts.list) opts.list.push(m);
    if (opts.collide) collide(x, z, w, d);
    return m;
  }
  function addCyl(r, h, x, y, z, mat, seg = 16) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  }

  const inAnyRoom = (x, z) => house.rooms.some((r) => x > r.x && x < r.x + r.w && z > r.z && z < r.z + r.d);

  const DEFAULTS = { door: [0, 2.1], window: [0.9, 2.0], open: [0, H], railing: [0, H], half: [1.05, H] };
  const ops = house.openings.map((o) => {
    const kind = o.kind ?? 'door';
    const def = DEFAULTS[kind] ?? DEFAULTS.door;
    return { ...o, kind, bottom: o.bottom ?? def[0], top: Math.min(o.top ?? def[1], H), edges: [] };
  });

  // ---------- rooms ----------
  for (const r of house.rooms) {
    const style = r.floorStyle ?? 'wood';
    const floorMat = new THREE.MeshStandardMaterial({ color: r.floor, map: floorTex[style] ?? null, roughness: style === 'tile' ? 0.4 : 0.85 });
    const wallMat = std(r.wall);
    const room = { name: r.name, x: r.x, z: r.z, w: r.w, d: r.d, wallMat, floorMat, wallColor: r.wall, floorColor: r.floor };
    rooms.push(room);
    const cx = r.x + r.w / 2, cz = r.z + r.d / 2;

    const fgeo = new THREE.PlaneGeometry(r.w, r.d);
    const uv = fgeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r.w + r.x, (uv.getY(i) - 1) * r.d - r.z);
    const floor = new THREE.Mesh(fgeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0.01, cz);
    floor.userData = { isFloor: true, room };
    floor.receiveShadow = true;
    group.add(floor);
    floors.push(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, H, cz);
    ceil.castShadow = true;
    group.add(ceil);

    const light = new THREE.PointLight('#fff1dc', r.light ?? 5, 0, 2);
    light.position.set(cx, H - 0.3, cz);
    group.add(light);

    if (r.fan) fans.push(makeFan(cx, cz));
    else if (r.recessed) {
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.01, 20), glow);
        can.position.set(cx + dx * r.w / 4, H - 0.004, cz + dz * r.d / 4);
        group.add(can);
      }
    } else {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), glow);
      dome.rotation.x = Math.PI; dome.scale.y = 0.45;
      dome.position.set(cx, H, cz);
      group.add(dome);
    }

    const edges = [
      { axis: 'x', c: r.z, a: r.x, b: r.x + r.w, inward: 1 },
      { axis: 'x', c: r.z + r.d, a: r.x, b: r.x + r.w, inward: -1 },
      { axis: 'z', c: r.x, a: r.z, b: r.z + r.d, inward: 1 },
      { axis: 'z', c: r.x + r.w, a: r.z, b: r.z + r.d, inward: -1 },
    ];
    for (const e of edges) {
      const cuts = [];
      for (const o of ops) {
        const along = e.axis === 'x' ? o.x : o.z, perp = e.axis === 'x' ? o.z : o.x;
        if (Math.abs(perp - e.c) > 0.05) continue;
        const s = Math.max(along - o.width / 2, e.a), en = Math.min(along + o.width / 2, e.b);
        if (en - s < 0.01) continue;
        cuts.push({ s, e: en, o });
        o.edges.push({ ...e, room });
      }
      cuts.sort((p, q) => p.s - q.s);
      let cur = e.a;
      for (const cut of cuts) {
        if (cut.s > cur + 0.001) piece(e, room, cur, cut.s, 0, H);
        const o = cut.o;
        if ((o.kind === 'window' || o.kind === 'half') && o.bottom > 0) piece(e, room, cut.s, cut.e, 0, o.bottom);
        if (o.top < H - 0.001) piece(e, room, cut.s, cut.e, o.top, H);
        cur = Math.max(cur, cut.e);
      }
      if (cur < e.b - 0.001) piece(e, room, cur, e.b, 0, H);
    }
  }

  function piece(e, room, s, en, y0, y1) {
    const len = en - s, h = y1 - y0, mid = (s + en) / 2;
    const perp = e.c + e.inward * T / 2;
    const [x, z, w, d] = e.axis === 'x' ? [mid, perp, len, T] : [perp, mid, T, len];
    const m = addBox(w, h, d, x, y0, z, room.wallMat, { list: walls, collide: y0 < 1.0 });
    m.userData = { isWall: true, room };
    // Baseboard and crown molding on the room side
    const face = e.c + e.inward * (T + 0.008);
    const strip = (y, hh) => {
      const [bx, bz, bw, bd] = e.axis === 'x' ? [mid, face, len, 0.016] : [face, mid, 0.016, len];
      addBox(bw, hh, bd, bx, y, bz, trim, { noCast: true });
    };
    const k = e.axis === 'x' ? 0 : 0.006;
    if (y0 === 0 && h > 0.2) strip(0, 0.1 + k);
    if (Math.abs(y1 - H) < 0.001 && h > 0.2) strip(H - 0.07 - k, 0.07 + k);
    // Outside face gets brick
    const outX = e.axis === 'x' ? mid : e.c - e.inward * 0.3;
    const outZ = e.axis === 'x' ? e.c - e.inward * 0.3 : mid;
    if (!inAnyRoom(outX, outZ)) {
      const SK = 0.08;
      const s2 = Math.abs(s - e.a) < 0.001 ? s - SK : s;
      const e2 = Math.abs(en - e.b) < 0.001 ? en + SK : en;
      const pp = e.c - e.inward * SK / 2, l2 = e2 - s2, m2 = (s2 + e2) / 2;
      const [sx, sz, sw, sd] = e.axis === 'x' ? [m2, pp, l2, SK] : [pp, m2, SK, l2];
      addBox(sw, h, sd, sx, y0, sz, brickMat, { worldUV: true });
    }
  }

  // ---------- openings: glass, sills, shutters, railings, curtains ----------
  for (const o of ops) {
    if (!o.edges.length) { console.warn('This opening is not on any room edge:', o); continue; }
    const e = o.edges[0];
    const exterior = o.edges.length === 1;
    const along = e.axis === 'x' ? o.x : o.z;
    const inS = e.inward;
    const toWorld = (a, p) => (e.axis === 'x' ? [a, e.c + p] : [e.c + p, a]);
    // box in (along, perpendicular) coordinates. y = bottom
    const put = (len, h, thick, a, y, p, mat, opts) => {
      const [x, z] = toWorld(a, p);
      return e.axis === 'x' ? addBox(len, h, thick, x, y, z, mat, opts) : addBox(thick, h, len, x, y, z, mat, opts);
    };

    if (o.kind === 'window') {
      put(o.width, o.top - o.bottom, 0.02, along, o.bottom, 0, glassMat);
      put(o.width, 0.04, 0.04, along, (o.bottom + o.top) / 2 - 0.02, 0, white);
      put(0.04, o.top - o.bottom, 0.04, along, o.bottom, 0, white);
      const cd = exterior ? 0.14 : 0.24, cp = exterior ? inS * 0.06 : 0;
      for (const side of [-1, 1]) put(0.08, o.top - o.bottom + 0.08, cd, along + side * (o.width / 2 + 0.028), o.bottom, cp, trim);
      put(o.width + 0.14, 0.09, cd, along, o.top - 0.015, cp, trim);
      const sill = put(o.width + 0.12, 0.055, exterior ? 0.32 : 0.44, along, o.bottom - 0.04, exterior ? inS * 0.06 : 0, white);
      surfaces.push(sill);
      if (exterior) {
        for (const side of [-1, 1]) put(0.36, o.top - o.bottom + 0.1, 0.04, along + side * (o.width / 2 + 0.22), o.bottom - 0.05, -inS * 0.1, white);
        if (o.box) {
          put(o.width + 0.1, 0.2, 0.22, along, o.bottom - 0.4, -inS * 0.2, white);
          const fl = [P.coral, P.bubblegum, P.white, P.lavender, P.butter];
          for (let i = 0; i < Math.floor(o.width / 0.12); i++) {
            const [x, z] = toWorld(along - o.width / 2 + 0.08 + i * 0.12, -inS * (0.2 + ((i % 2) - 0.5) * 0.08));
            const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), std(i % 3 === 1 ? P.leaf : fl[i % fl.length]));
            m.position.set(x, o.bottom - 0.17, z);
            group.add(m);
          }
        }
      }
    }

    if (o.kind === 'door') {
      for (const side of [-1, 1]) put(0.08, o.top, 0.24, along + side * (o.width / 2 + 0.028), 0, 0, white);
      put(o.width + 0.14, 0.085, 0.24, along, o.top - 0.015, 0, white);
    }

    if (o.kind === 'railing') {
      const L = o.width, start = along - L / 2;
      put(L, 0.07, 0.1, along, 0.92, 0, white, { list: solids });
      put(L, 0.05, 0.08, along, 0, 0, white);
      const n = Math.max(2, Math.round(L / 0.14));
      for (let i = 1; i < n; i++) {
        const [x, z] = toWorld(start + (i * L) / n, 0);
        addCyl(0.02, 0.88, x, 0.05, z, white, 8);
      }
      for (const a of [start + 0.06, start + L - 0.06]) put(0.12, 1.05, 0.12, a, 0, 0, white);
      const [cx, cz] = toWorld(along, 0);
      e.axis === 'x' ? collide(cx, cz, L, 0.14) : collide(cx, cz, 0.14, L);
    }

    if (o.column !== undefined) {
      const [x, z] = toWorld(o.column, 0);
      put(0.2, 0.25, 0.2, o.column, 0, 0, white);
      addCyl(0.08, H - 0.25, x, 0.25, z, white, 20);
      collide(x, z, 0.22, 0.22);
    }

    if (o.kind === 'half') {
      surfaces.push(put(o.width, 0.05, 0.45, along, o.bottom, 0, counterMat));
    }

    if (o.curtains) {
      const mat = o.curtains === 'floral'
        ? new THREE.MeshStandardMaterial({ map: tex.floral(), roughness: 0.95 })
        : std(o.curtains);
      const yT = Math.min(o.top + 0.12, H - 0.05);
      const yB = o.kind === 'door' ? 0.02 : Math.max(0.02, o.bottom - 0.25);
      const off = inS * 0.17;
      for (const side of [-1, 1]) {
        const panel = put(0.55, yT - yB, 0.04, along + side * (o.width / 2 + 0.12), yB, off, mat);
        if (o.curtains === 'floral') worldBoxUV(panel.geometry, panel.position.x, panel.position.y, panel.position.z);
      }
      put(o.width + 1.1, 0.03, 0.03, along, yT, off, dark);
    }
  }

  // ---------- ceiling fans ----------
  function makeFan(x, z) {
    const g = new THREE.Group();
    g.position.set(x, H, z);
    const wood = std('#6b4a2b');
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), std('#8a6a3a'));
    rod.position.y = -0.15; g.add(rod);
    const spin = new THREE.Group(); spin.position.y = -0.35; g.add(spin);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.12, 20), std('#8a6a3a'));
    spin.add(motor);
    for (let i = 0; i < 5; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.012, 0.13), wood);
      const a = (i / 5) * Math.PI * 2;
      blade.position.set(Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38);
      blade.rotation.y = -a;
      spin.add(blade);
    }
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), std('#fff6dd', { emissive: '#ffe9b0', emissiveIntensity: 0.8 }));
    bulb.position.y = -0.47; g.add(bulb);
    group.add(g);
    return spin;
  }

  // ---------- roof ----------
  const minX = Math.min(...house.rooms.map((r) => r.x)), maxX = Math.max(...house.rooms.map((r) => r.x + r.w));
  const minZ = Math.min(...house.rooms.map((r) => r.z)), maxZ = Math.max(...house.rooms.map((r) => r.z + r.d));
  const OH = 0.5, depth = maxZ - minZ + OH * 2, len = maxX - minX + OH * 2;
  const shape = new THREE.Shape();
  shape.moveTo(-depth / 2, 0); shape.lineTo(depth / 2, 0); shape.lineTo(0, house.roofHeight ?? 1.6); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
  roofGeo.rotateY(-Math.PI / 2);
  const shingleMat = new THREE.MeshStandardMaterial({ map: tex.shingles(), roughness: 0.95 });
  const sidingMat = new THREE.MeshStandardMaterial({ map: tex.siding(), roughness: 0.9 });
  const roof = new THREE.Mesh(roofGeo, [sidingMat, shingleMat]);
  roof.position.set(maxX + OH, H + 0.06, (minZ + maxZ) / 2);
  roof.castShadow = roof.receiveShadow = true;
  group.add(roof);
  // soffit under the eaves, white fascia boards along the edges
  // soffit: only under the overhang (outside the walls), so it never overlaps the ceilings
  const soff = std('#efe9da'), SO = OH - 0.08, sy = H + 0.04, fullLen = len;
  addBox(fullLen, 0.02, SO, (minX + maxX) / 2, sy, minZ - 0.08 - SO / 2, soff, { noCast: true });
  addBox(fullLen, 0.02, SO, (minX + maxX) / 2, sy, maxZ + 0.08 + SO / 2, soff, { noCast: true });
  addBox(SO, 0.021, maxZ - minZ + 0.16, minX - 0.08 - SO / 2, sy, (minZ + maxZ) / 2, soff, { noCast: true });
  addBox(SO, 0.021, maxZ - minZ + 0.16, maxX + 0.08 + SO / 2, sy, (minZ + maxZ) / 2, soff, { noCast: true });
  for (const z of [minZ - OH, maxZ + OH]) addBox(len + 0.04, 0.2, 0.05, (minX + maxX) / 2, H - 0.08, z, trim);
  // little foundation strip so the house sits on the ground
  const fnd = std('#9d978d'), FW = 0.1, FO = 0.08 + FW / 2;
  const cxH = (minX + maxX) / 2, czH = (minZ + maxZ) / 2, wH = maxX - minX + 2 * (FO + FW / 2), dH = maxZ - minZ + 2 * (FO + FW / 2);
  addBox(wH, 0.14, FW, cxH, 0, minZ - FO, fnd, { noCast: true });
  addBox(wH, 0.14, FW, cxH, 0, maxZ + FO, fnd, { noCast: true });
  addBox(FW, 0.14, dH, minX - FO, 0, czH, fnd, { noCast: true });
  addBox(FW, 0.14, dH, maxX + FO, 0, czH, fnd, { noCast: true });
  if (house.chimney) {
    const c = house.chimney, top = H + (house.roofHeight ?? 1.6) + 0.5;
    addBox(c.w ?? 0.9, top - H - 0.08, c.d ?? 0.7, c.x, H + 0.08, c.z, brickMat, { worldUV: true });
    addBox((c.w ?? 0.9) + 0.1, 0.08, (c.d ?? 0.7) + 0.1, c.x, top, c.z, std('#8e8a84'));
  }

  // ---------- yard ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: P.grass, map: tex.grass(), roughness: 1 }));
  const gu = ground.geometry.attributes.uv;
  for (let i = 0; i < gu.count; i++) gu.setXY(i, gu.getX(i) * 160, gu.getY(i) * 160);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.userData = { isGround: true };
  ground.receiveShadow = true;
  group.add(ground);

  for (const p of house.patios ?? []) {
    surfaces.push(addBox(p.w, 0.03, p.d, p.x + p.w / 2, 0, p.z + p.d / 2, std(p.color ?? '#c3bdb2')));
  }

  for (const t of house.trees ?? []) {
    const [x, z, type = 'round', size = 1] = Array.isArray(t) ? t : [t.x, t.z, t.type, t.size];
    addCyl(0.15 * size, 1.6 * size, x, 0, z, std('#6b4a2b'), 10);
    collide(x, z, 0.4, 0.4);
    if (type === 'pine') {
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(new THREE.ConeGeometry((1.8 - i * 0.35) * size, 1.6 * size, 12), std(P.pine));
        m.position.set(x, (1.6 + i * 0.9) * size, z);
        m.castShadow = true;
        group.add(m);
      }
    } else {
      for (const [dx, dy, dz, r] of [[0, 2.6, 0, 1.4], [0.8, 2.2, 0.3, 1.0], [-0.7, 2.3, -0.4, 1.1], [0.2, 3.3, -0.2, 0.9]]) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r * size, 14, 10), std(P.leaf));
        m.position.set(x + dx * size, dy * size, z + dz * size);
        m.castShadow = true;
        group.add(m);
      }
    }
  }

  // Bushes (like the hostas out front)
  const bushMats = [std(P.leafDark), std(P.leaf), std('#4f8a46')];
  for (const [x, z, size = 1] of house.bushes ?? []) {
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.32 * size, 14, 10), bushMats[i % 3]);
      const a = i * 2.1;
      m.position.set(x + Math.cos(a) * 0.22 * size, 0.18 * size, z + Math.sin(a) * 0.18 * size);
      m.scale.y = 0.7;
      m.castShadow = m.receiveShadow = true;
      group.add(m);
    }
  }

  return { group, walls, floors, surfaces, solids, colliders, rooms, fans, ground, H };
}
