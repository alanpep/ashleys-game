// Turns a building description (like src/house.js) into 3D walls, floors, windows and roof.
// Used for the home and for every building in the neighborhood.
import * as THREE from 'three';
import { tex, worldBoxUV, stripes, signTexture } from './textures.js';
import { P } from './palette.js';
import { mergeStatic, remap } from './merge.js';

const T = 0.1; // each room's wall is 10cm thick (shared walls end up 20cm)

// Shared materials (one copy for the whole neighborhood)
const matCache = new Map();
export const std = (color, o = {}) => {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...o }));
  return matCache.get(key);
};
let M;
function mats() {
  if (M) return M;
  M = {
    white: std(P.white, { roughness: 0.6 }),
    trim: std(P.white, { roughness: 0.5 }),
    dark: std(P.charcoal),
    glow: new THREE.MeshStandardMaterial({ color: P.white, emissive: P.lampGlow, emissiveIntensity: 1.1 }),
    counter: std('#e8e2d8', { roughness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }),
    tinted: new THREE.MeshStandardMaterial({ color: '#9fc3dc', transparent: true, opacity: 0.7, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide }),
    brick: new THREE.MeshStandardMaterial({ map: tex.brick(), roughness: 0.95 }),
    ceil: new THREE.MeshBasicMaterial({ color: '#ece8e0' }), // unlit, so lights don't make hot spots
    soffit: std('#efe9da'),
    foundation: std('#9d978d'),
    floral: new THREE.MeshStandardMaterial({ map: tex.floral(), roughness: 0.95 }),
  };
  return M;
}
const floorTex = () => ({ wood: tex.wood(), carpet: tex.carpet(), tile: tex.tile(), checker: tex.checker() });
const sidingMats = new Map();
function sidingMat(color) {
  if (!sidingMats.has(color)) sidingMats.set(color, new THREE.MeshStandardMaterial({ color, map: tex.lap(), roughness: 0.85 }));
  return sidingMats.get(color);
}

// ---------- reusable yard things ----------
export function makeTree(group, colliders, x, z, type = 'round', size = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * size, 0.15 * size, 1.6 * size, 10), std('#6b4a2b'));
  trunk.position.set(x, 0.8 * size, z);
  trunk.castShadow = trunk.receiveShadow = true;
  group.add(trunk);
  colliders.push({ minX: x - 0.25, maxX: x + 0.25, minZ: z - 0.25, maxZ: z + 0.25 });
  if (type === 'pine') {
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry((1.8 - i * 0.35) * size, 1.6 * size, 12), std(P.pine));
      m.position.set(x, (1.6 + i * 0.9) * size, z);
      m.castShadow = true;
      group.add(m);
    }
  } else {
    const leaf = type === 'autumn' ? std('#e39a4c') : std(P.leaf);
    for (const [dx, dy, dz, r] of [[0, 2.6, 0, 1.4], [0.8, 2.2, 0.3, 1.0], [-0.7, 2.3, -0.4, 1.1], [0.2, 3.3, -0.2, 0.9]]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r * size, 14, 10), leaf);
      m.position.set(x + dx * size, dy * size, z + dz * size);
      m.castShadow = true;
      group.add(m);
    }
  }
}

const bushMats = () => [std(P.leafDark), std(P.leaf), std('#4f8a46')];
export function makeBush(group, x, z, size = 1, flowers = null) {
  const mm = bushMats();
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.32 * size, 14, 10), mm[i % 3]);
    const a = i * 2.1;
    m.position.set(x + Math.cos(a) * 0.22 * size, 0.18 * size, z + Math.sin(a) * 0.18 * size);
    m.scale.y = 0.7;
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  }
  if (flowers) {
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.06 * size, 8, 6), std(flowers));
      const a = i * 1.1;
      f.position.set(x + Math.cos(a) * 0.3 * size, 0.38 * size, z + Math.sin(a) * 0.25 * size);
      group.add(f);
    }
  }
}

export function makeSign(group, { text, x, y, z, rot = 0, w = 2.4, h = 0.6, bg = P.bubblegum, fg = '#ffffff', posts = false }) {
  const mm = mats();
  const mat = new THREE.MeshStandardMaterial({ map: signTexture(text, bg, fg), roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.12 });
  mat.emissiveMap = mat.map;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), [mm.white, mm.white, mm.white, mm.white, mat, mm.white]);
  sign.position.set(x, y, z);
  sign.rotation.y = THREE.MathUtils.degToRad(rot);
  sign.castShadow = true;
  group.add(sign);
  if (posts) {
    const a = THREE.MathUtils.degToRad(rot);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, y + h / 2, 0.08), std(P.woodMid));
      post.position.set(x + Math.cos(a) * s * (w / 2 - 0.15), (y + h / 2) / 2, z - Math.sin(a) * s * (w / 2 - 0.15) - Math.cos(a) * 0.06);
      post.castShadow = true;
      group.add(post);
    }
  }
  return sign;
}

export function buildHouse(house) {
  const H = house.wallHeight ?? 2.7;
  const m = mats();
  const group = new THREE.Group();
  const walls = [], floors = [], surfaces = [], solids = [], colliders = [], rooms = [], fans = [], lightSpots = [], doors = [], glass = [];
  const outside = house.exterior && house.exterior !== 'brick' ? sidingMat(house.exterior) : m.brick;

  const collide = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

  // y = bottom of the box
  function addBox(w, h, d, x, y, z, mat, opts = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (opts.worldUV) worldBoxUV(geo, x, y + h / 2, z);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = !(Array.isArray(mat) ? false : mat.transparent) && !opts.noCast;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (opts.list) opts.list.push(mesh);
    if (opts.collide) collide(x, z, w, d);
    return mesh;
  }
  function addCyl(r, h, x, y, z, mat, seg = 16) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  const inAnyRoom = (x, z) => house.rooms.some((r) => x > r.x && x < r.x + r.w && z > r.z && z < r.z + r.d);

  const DEFAULTS = { door: [0, 2.1], window: [0.9, 2.0], open: [0, H], railing: [0, H], half: [1.05, H], fakedoor: [0, 2.1], garage: [0, 2.2] };
  const ops = house.openings.map((o) => {
    const kind = o.kind ?? 'door';
    const def = DEFAULTS[kind] ?? DEFAULTS.door;
    return { ...o, kind, bottom: o.bottom ?? def[0], top: Math.min(o.top ?? def[1], H), edges: [] };
  });

  // ---------- rooms ----------
  const FT = floorTex();
  for (const r of house.rooms) {
    const style = r.floorStyle ?? 'wood';
    const floorMat = new THREE.MeshStandardMaterial({ color: r.floor, map: FT[style] ?? null, roughness: style === 'tile' || style === 'checker' ? 0.4 : 0.85 });
    const wallMat = new THREE.MeshStandardMaterial({ color: r.wall, roughness: 0.9 });
    const room = { name: r.name, x: r.x, z: r.z, w: r.w, d: r.d, H, wallMat, floorMat, wallColor: r.wall, floorColor: r.floor, defWall: r.wall, defFloor: r.floor, building: house.id };
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
    floor.userData.keep = true;
    group.add(floor);
    floors.push(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), m.ceil);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, H, cz);
    ceil.castShadow = true;
    group.add(ceil);

    lightSpots.push({ x: cx, y: H - 0.3, z: cz, intensity: r.light ?? Math.min(9, 3 + (r.w * r.d) / 8), room });

    if (r.fan) fans.push(makeFan(cx, cz));
    else if (r.recessed) {
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.01, 20), m.glow);
        can.position.set(cx + dx * r.w / 4, H - 0.004, cz + dz * r.d / 4);
        group.add(can);
      }
    } else {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.glow);
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
        o.edges.push({ ...e, room });
        if (o.kind !== 'fakedoor') cuts.push({ s, e: en, o });
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
    const mesh = addBox(w, h, d, x, y0, z, room.wallMat, { list: walls, collide: y0 < 1.0 });
    mesh.userData = { isWall: true, room };
    // Baseboard and crown molding on the room side
    const face = e.c + e.inward * (T + 0.008);
    const strip = (y, hh) => {
      const [bx, bz, bw, bd] = e.axis === 'x' ? [mid, face, len, 0.016] : [face, mid, 0.016, len];
      addBox(bw, hh, bd, bx, y, bz, m.trim, { noCast: true });
    };
    const k = e.axis === 'x' ? 0 : 0.006;
    if (y0 === 0 && h > 0.2) strip(0, 0.1 + k);
    if (Math.abs(y1 - H) < 0.001 && h > 0.2) strip(H - 0.07 - k, 0.07 + k);
    // Outside face gets brick or siding
    const outX = e.axis === 'x' ? mid : e.c - e.inward * 0.3;
    const outZ = e.axis === 'x' ? e.c - e.inward * 0.3 : mid;
    if (!inAnyRoom(outX, outZ)) {
      const SK = 0.08;
      const s2 = Math.abs(s - e.a) < 0.001 ? s - SK : s;
      const e2 = Math.abs(en - e.b) < 0.001 ? en + SK : en;
      const pp = e.c - e.inward * SK / 2, l2 = e2 - s2, m2 = (s2 + e2) / 2;
      const [sx, sz, sw, sd] = e.axis === 'x' ? [m2, pp, l2, SK] : [pp, m2, SK, l2];
      addBox(sw, h, sd, sx, y0, sz, outside, { worldUV: true });
    }
  }

  // ---------- openings: glass, sills, shutters, railings, curtains, awnings ----------
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
      glass.push(put(o.width, o.top - o.bottom, 0.02, along, o.bottom, 0, o.tint ? m.tinted : m.glass)); // the camera can't go through windows
      if (!o.noMullions) {
        put(o.width, 0.04, 0.04, along, (o.bottom + o.top) / 2 - 0.02, 0, m.white);
        put(0.04, o.top - o.bottom, 0.04, along, o.bottom, 0, m.white);
      }
      const cd = exterior ? 0.14 : 0.24, cp = exterior ? inS * 0.06 : 0;
      for (const side of [-1, 1]) put(0.08, o.top - o.bottom + 0.08, cd, along + side * (o.width / 2 + 0.028), o.bottom, cp, m.trim);
      put(o.width + 0.14, 0.09, cd, along, o.top - 0.015, cp, m.trim);
      if (o.bottom > 0.1) {
        const sill = put(o.width + 0.12, 0.055, exterior ? 0.32 : 0.44, along, o.bottom - 0.04, exterior ? inS * 0.06 : 0, m.white);
        surfaces.push(sill);
      }
      if (exterior && !o.noShutters) {
        for (const side of [-1, 1]) put(0.36, o.top - o.bottom + 0.1, 0.04, along + side * (o.width / 2 + 0.22), o.bottom - 0.05, -inS * 0.1, o.shutters ? std(o.shutters) : m.white);
      }
      if (exterior && o.box) {
        put(o.width + 0.1, 0.2, 0.22, along, o.bottom - 0.4, -inS * 0.2, m.white);
        const fl = [P.coral, P.bubblegum, P.white, P.lavender, P.butter];
        for (let i = 0; i < Math.floor(o.width / 0.12); i++) {
          const [x, z] = toWorld(along - o.width / 2 + 0.08 + i * 0.12, -inS * (0.2 + ((i % 2) - 0.5) * 0.08));
          const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), std(i % 3 === 1 ? P.leaf : fl[i % fl.length]));
          f.position.set(x, o.bottom - 0.17, z);
          group.add(f);
        }
      }
    }

    if (o.kind === 'door' || o.kind === 'garage') {
      for (const side of [-1, 1]) put(0.08, o.top, 0.24, along + side * (o.width / 2 + 0.028), 0, 0, m.white);
      put(o.width + 0.14, 0.085, 0.24, along, o.top - 0.015, 0, m.white);
      // into: the room the door swings into (otherwise whichever room was listed first)
      if (!o.noDoor) doors.push(makeDoor(o, o.edges.find((ed) => ed.room.name === o.into) ?? e, exterior, along, toWorld));
    }

    if (o.kind === 'fakedoor') {
      // A closed front door (this house is locked)
      const out = -inS * (0.08 + 0.03);
      put(o.width, o.top, 0.06, along, 0, out, std(o.doorColor ?? P.forest));
      for (const side of [-1, 1]) put(0.09, o.top + 0.05, 0.1, along + side * (o.width / 2 + 0.045), 0, out, m.trim);
      put(o.width + 0.28, 0.09, 0.1, along, o.top, out, m.trim);
      const [kx, kz] = toWorld(along + o.width / 2 - 0.12, out - inS * 0.05);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), std(P.gold, { metalness: 0.6, roughness: 0.3 }));
      knob.position.set(kx, 1.0, kz);
      group.add(knob);
      put(o.width + 0.6, 0.12, 0.6, along, 0, -inS * 0.45, std('#c3bdb2'), { noCast: true }); // step
    }

    if (o.awning && exterior) {
      const [ca, cb] = o.awning;
      const map = stripes(ca, cb);
      const W = o.width + 0.5, D = 1.0;
      map.repeat.set(W / 0.5, 1);
      const topMat = new THREE.MeshStandardMaterial({ map, roughness: 0.8, side: THREE.DoubleSide });
      const [ax, az] = toWorld(along, -inS * (0.08 + D / 2 - 0.05));
      const geo = e.axis === 'x' ? new THREE.BoxGeometry(W, 0.04, D) : new THREE.BoxGeometry(D, 0.04, W);
      if (e.axis === 'z') { // rotate texture coordinates so stripes run the right way
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
      }
      const aw = new THREE.Mesh(geo, topMat);
      aw.position.set(ax, o.top + 0.35, az);
      if (e.axis === 'x') aw.rotation.x = -inS * 0.38; else aw.rotation.z = inS * 0.38;
      aw.castShadow = true;
      group.add(aw);
    }

    if (o.kind === 'railing') {
      const L = o.width, start = along - L / 2;
      put(L, 0.07, 0.1, along, 0.92, 0, m.white, { list: solids });
      put(L, 0.05, 0.08, along, 0, 0, m.white);
      const n = Math.max(2, Math.round(L / 0.14));
      for (let i = 1; i < n; i++) {
        const [x, z] = toWorld(start + (i * L) / n, 0);
        addCyl(0.02, 0.88, x, 0.05, z, m.white, 8);
      }
      for (const a of [start + 0.06, start + L - 0.06]) put(0.12, 1.05, 0.12, a, 0, 0, m.white);
      const [cx, cz] = toWorld(along, 0);
      e.axis === 'x' ? collide(cx, cz, L, 0.14) : collide(cx, cz, 0.14, L);
    }

    if (o.column !== undefined) {
      const [x, z] = toWorld(o.column, 0);
      put(0.2, 0.25, 0.2, o.column, 0, 0, m.white);
      addCyl(0.08, H - 0.25, x, 0.25, z, m.white, 20);
      collide(x, z, 0.22, 0.22);
    }

    if (o.kind === 'half') {
      surfaces.push(put(o.width, 0.05, 0.45, along, o.bottom, 0, m.counter));
    }

    if (o.curtains) {
      const mat = o.curtains === 'floral' ? m.floral : std(o.curtains);
      const yT = Math.min(o.top + 0.12, H - 0.05);
      const yB = o.kind === 'door' ? 0.02 : Math.max(0.02, o.bottom - 0.25);
      const off = inS * 0.17;
      for (const side of [-1, 1]) {
        const panel = put(0.55, yT - yB, 0.04, along + side * (o.width / 2 + 0.12), yB, off, mat);
        if (o.curtains === 'floral') worldBoxUV(panel.geometry, panel.position.x, panel.position.y, panel.position.z);
      }
      put(o.width + 1.1, 0.03, 0.03, along, yT, off, m.dark);
    }
  }

  // ---------- doors that open and close ----------
  // swing: one door on a hinge. double: two doors. slide: glass doors that slide into the wall.
  // garage: a white door made of strips that rolls up to the ceiling.
  function makeDoor(o, e, exterior, along, toWorld) {
    const inS = e.inward, w = o.width, h = o.top;
    const kind = o.kind === 'garage' ? 'garage' : o.slide ? 'slide' : o.double ? 'double' : 'swing';
    const perpC = exterior ? inS * 0.05 : 0; // middle of the wall
    const color = o.doorColor ?? (exterior ? '#f6f3ec' : P.white);
    const panelMat = std(color, { roughness: 0.55 });
    const g = new THREE.Group();
    group.add(g);
    const parts = [];
    const door = {
      id: `${house.id}:${doors.length}`, kind, auto: !!o.auto, leaves: [], parts, building: house.id, exterior,
      open: o.open ?? (kind !== 'garage' && kind !== 'slide' && !exterior),
      name: kind === 'garage' ? 'Garage Door' : 'Door',
    };
    const [cx, cz] = toWorld(along, perpC);
    door.x = cx; door.z = cz;
    const knobMat = std(P.gold, { metalness: 0.6, roughness: 0.3 });
    const mesh = (geo, mat, parent, x, y, z) => {
      const mm = new THREE.Mesh(geo, mat);
      mm.position.set(x, y, z);
      mm.castShadow = !mat.transparent; mm.receiveShadow = true;
      mm.userData.door = door;
      parent.add(mm); parts.push(mm);
      return mm;
    };
    // a leaf is built pointing along local +x from its hinge
    function leaf(lw, glass) {
      const pivot = new THREE.Group();
      if (glass) {
        const fr = std(color, { roughness: 0.5 });
        mesh(new THREE.BoxGeometry(lw, 0.9, 0.045), fr, pivot, lw / 2, 0.45, 0);
        mesh(new THREE.BoxGeometry(lw, 0.1, 0.045), fr, pivot, lw / 2, h - 0.07, 0);
        mesh(new THREE.BoxGeometry(0.08, h - 0.92, 0.045), fr, pivot, 0.04, 0.9 + (h - 0.92) / 2 - 0.01, 0);
        mesh(new THREE.BoxGeometry(0.08, h - 0.92, 0.045), fr, pivot, lw - 0.04, 0.9 + (h - 0.92) / 2 - 0.01, 0);
        mesh(new THREE.BoxGeometry(lw - 0.16, h - 1.02, 0.015), m.glass, pivot, lw / 2, 0.9 + (h - 1.02) / 2, 0);
      } else {
        mesh(new THREE.BoxGeometry(lw, h - 0.02, 0.045), panelMat, pivot, lw / 2, (h - 0.02) / 2, 0);
        for (const side of [-1, 1]) for (const [py, ph] of [[0.25, 0.75], [1.15, 0.7]]) {
          if (py + ph > h - 0.1) continue;
          mesh(new THREE.BoxGeometry(lw - 0.2, ph, 0.012), panelMat, pivot, lw / 2, py + ph / 2, side * 0.028);
        }
      }
      for (const side of [-1, 1]) mesh(new THREE.SphereGeometry(0.035, 12, 8), knobMat, pivot, lw - 0.09, 1.0, side * 0.045);
      return pivot;
    }
    const base = e.axis === 'x' ? 0 : -Math.PI / 2;
    const swingA = (e.axis === 'x' ? -inS : inS) * Math.PI / 2 * 0.92;
    const dirA = e.axis === 'x' ? [1, 0] : [0, 1]; // world direction of "along"
    const at = (a, p, y = 0) => { const [x, z] = toWorld(a, p); return new THREE.Vector3(x, y, z); };

    if (kind === 'swing' || kind === 'double') {
      const n = kind === 'double' ? 2 : 1, lw = w / n - 0.01;
      for (let i = 0; i < n; i++) {
        const p = leaf(lw, o.glass);
        const s = i === 0 ? 1 : -1;
        p.position.copy(at(along - s * (w / 2 - 0.005), perpC));
        g.add(p);
        door.leaves.push({ p, base: base + (i === 0 ? 0 : Math.PI), a: i === 0 ? swingA : -swingA });
      }
      door.apply = (t) => { const k = t * t * (3 - 2 * t); for (const l of door.leaves) l.p.rotation.y = l.base + l.a * k; };
    } else if (kind === 'slide') {
      for (let i = 0; i < 2; i++) {
        const s = i === 0 ? 1 : -1, lw = w / 2 + 0.02;
        const p = leaf(lw, true);
        const start = at(along - s * (w / 2), perpC);
        p.position.copy(start);
        p.rotation.y = base + (i === 0 ? 0 : Math.PI);
        g.add(p);
        door.leaves.push({ p, start, dx: -s * dirA[0] * (lw - 0.08), dz: -s * dirA[1] * (lw - 0.08) });
      }
      door.apply = (t) => { const k = t * t * (3 - 2 * t); for (const l of door.leaves) l.p.position.set(l.start.x + l.dx * k, 0, l.start.z + l.dz * k); };
    } else {
      // garage: strips ride up the track and lie flat under the ceiling
      const N = 5, sh = h / N, P0 = inS * 0.16;
      const stripMat = std('#fbfaf7', { roughness: 0.5 }), groove = std('#dcd8d0');
      for (let i = 0; i < N; i++) {
        const p = new THREE.Group();
        mesh(new THREE.BoxGeometry(w - 0.02, sh - 0.01, 0.05), stripMat, p, 0, 0, 0);
        for (let k = 0; k < 4; k++) {
          const pw = (w - 0.3) / 4;
          mesh(new THREE.BoxGeometry(pw - 0.1, sh * 0.5, 0.012), groove, p, -w / 2 + 0.15 + pw * (k + 0.5), 0.02, -0.03);
        }
        if (i === 1) mesh(new THREE.BoxGeometry(0.3, 0.05, 0.06), std(P.metal, { metalness: 0.5 }), p, 0, 0, -0.05);
        g.add(p);
        door.leaves.push({ p, i });
      }
      // tracks along the ceiling
      for (const side of [-1, 1]) {
        const tl = 2.4, [tx, tz] = toWorld(along + side * (w / 2 - 0.02), P0 + inS * tl / 2);
        const tr = new THREE.Mesh(e.axis === 'x' ? new THREE.BoxGeometry(0.05, 0.05, tl) : new THREE.BoxGeometry(tl, 0.05, 0.05), std(P.metal));
        tr.position.set(tx, h + 0.1, tz);
        g.add(tr);
      }
      // the strip's -z side faces outside: turn it so that is true on any wall
      const face = Math.atan2(-(e.axis === 'x' ? 0 : -inS), -(e.axis === 'x' ? -inS : 0)); // local -z -> outward
      door.apply = (t) => {
        const k = t * t * (3 - 2 * t);
        for (const l of door.leaves) {
          const s = l.i * sh + k * (h + 0.05);
          const p = l.p;
          if (s + sh <= h) {
            p.position.copy(at(along, P0, s + sh / 2));
            p.rotation.set(0, face, 0);
          } else {
            const d = s + sh - h; // how far along the ceiling
            p.position.copy(at(along, P0 + inS * (d - sh / 2), h + 0.06));
            p.rotation.set(-Math.PI / 2, face, 0, 'YXZ');
          }
        }
      };
    }
    // fewer pieces to draw: merge each moving part, then remember every piece you can click on
    for (const l of door.leaves) mergeStatic(l.p);
    parts.length = 0;
    g.traverse((o) => { if (o.isMesh) { o.userData.door = door; parts.push(o); } });
    door.t = door.open ? 1 : 0;
    door.apply(door.t);
    // closed doors block the way
    const half = w / 2;
    door.collider = e.axis === 'x'
      ? { minX: along - half, maxX: along + half, minZ: cz - 0.1, maxZ: cz + 0.1, door }
      : { minX: cx - 0.1, maxX: cx + 0.1, minZ: along - half, maxZ: along + half, door };
    colliders.push(door.collider);
    return door;
  }

  // ---------- ceiling fans ----------
  function makeFan(x, z) {
    const g = new THREE.Group();
    g.position.set(x, H, z);
    const wood = std('#6b4a2b');
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), std('#8a6a3a'));
    rod.position.y = -0.15; g.add(rod);
    const spin = new THREE.Group(); spin.position.y = -0.35; g.add(spin);
    spin.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.12, 20), std('#8a6a3a')));
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
    spin.userData.room = rooms[rooms.length - 1];
    g.traverse((o) => { if (o.isMesh) o.userData.fan = spin; });
    return spin;
  }

  // ---------- roof ----------
  const minX = Math.min(...house.rooms.map((r) => r.x)), maxX = Math.max(...house.rooms.map((r) => r.x + r.w));
  const minZ = Math.min(...house.rooms.map((r) => r.z)), maxZ = Math.max(...house.rooms.map((r) => r.z + r.d));
  const cxH = (minX + maxX) / 2, czH = (minZ + maxZ) / 2;
  const roofColor = house.roofColor ?? '#57514e';
  if (house.roof === 'flat') {
    const OH = 0.25;
    addBox(maxX - minX + OH * 2, 0.3, maxZ - minZ + OH * 2, cxH, H + 0.06, czH, std(house.roofColor ?? '#e9e3d6'));
    addBox(maxX - minX + OH * 2 + 0.02, 0.12, maxZ - minZ + OH * 2 + 0.02, cxH, H + 0.36, czH, m.trim);
    // extra floors you can see from outside (an office tower)
    if (house.floors) {
      const W2 = maxX - minX + 0.16, D2 = maxZ - minZ + 0.16, FH = 3.0, y0 = H + 0.48;
      const glassBand = std('#9fc3dc', { roughness: 0.1, metalness: 0.3 });
      for (let f = 0; f < house.floors; f++) {
        const y = y0 + f * FH;
        addBox(W2, FH, D2, cxH, y, czH, outside, { worldUV: true });
        addBox(W2 + 0.04, 1.5, D2 + 0.04, cxH, y + 0.8, czH, glassBand, { noCast: true }); // a band of windows all the way around
        for (let x = minX + 1.2; x < maxX - 0.6; x += 1.6) for (const z of [minZ - 0.1, maxZ + 0.1]) addBox(0.08, 1.5, 0.04, x, y + 0.8, z, m.trim, { noCast: true });
        for (let z = minZ + 1.2; z < maxZ - 0.6; z += 1.6) for (const x of [minX - 0.1, maxX + 0.1]) addBox(0.04, 1.5, 0.08, x, y + 0.8, z, m.trim, { noCast: true });
      }
      const yt = y0 + house.floors * FH;
      addBox(W2 + 0.3, 0.25, D2 + 0.3, cxH, yt, czH, std(house.roofColor ?? '#e9e3d6'));
    }
  } else {
    const OH = 0.5, OHL = house.attach === 'minX' ? 0 : OH, depth = maxZ - minZ + OH * 2, len = maxX - minX + OH + OHL;
    const lenC = (minX - OHL + maxX + OH) / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-depth / 2, 0); shape.lineTo(depth / 2, 0); shape.lineTo(0, house.roofHeight ?? 1.6); shape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
    roofGeo.rotateY(-Math.PI / 2);
    const shingleMat = new THREE.MeshStandardMaterial({ color: roofColor, map: tex.shingles(), roughness: 0.95 });
    const roof = new THREE.Mesh(roofGeo, [sidingMat(house.gableColor ?? '#ece5d1'), shingleMat]);
    roof.position.set(maxX + OH, H + 0.06, czH);
    roof.castShadow = roof.receiveShadow = true;
    group.add(roof);
    // soffit: only under the overhang (outside the walls), so it never overlaps the ceilings
    const SO = OH - 0.08, sy = H + 0.04;
    addBox(len, 0.02, SO, lenC, sy, minZ - 0.08 - SO / 2, m.soffit, { noCast: true });
    addBox(len, 0.02, SO, lenC, sy, maxZ + 0.08 + SO / 2, m.soffit, { noCast: true });
    if (!house.attach) addBox(SO, 0.021, maxZ - minZ + 0.16, minX - 0.08 - SO / 2, sy, czH, m.soffit, { noCast: true });
    addBox(SO, 0.021, maxZ - minZ + 0.16, maxX + 0.08 + SO / 2, sy, czH, m.soffit, { noCast: true });
    for (const z of [minZ - OH, maxZ + OH]) addBox(len + 0.04, 0.2, 0.05, lenC, H - 0.08, z, m.trim);
  }
  // little foundation strip so the house sits on the ground
  const FW = 0.1, FO = 0.08 + FW / 2;
  const wH = maxX - minX + 2 * (FO + FW / 2), dH = maxZ - minZ + 2 * (FO + FW / 2);
  addBox(wH, 0.14, FW, cxH, 0, minZ - FO, m.foundation, { noCast: true });
  addBox(wH, 0.14, FW, cxH, 0, maxZ + FO, m.foundation, { noCast: true });
  if (!house.attach) addBox(FW, 0.14, dH, minX - FO, 0, czH, m.foundation, { noCast: true });
  addBox(FW, 0.14, dH, maxX + FO, 0, czH, m.foundation, { noCast: true });
  if (house.chimney) {
    const c = house.chimney, top = H + (house.roofHeight ?? 1.6) + 0.5;
    addBox(c.w ?? 0.9, top - H - 0.08, c.d ?? 0.7, c.x, H + 0.08, c.z, m.brick, { worldUV: true });
    addBox((c.w ?? 0.9) + 0.1, 0.08, (c.d ?? 0.7) + 0.1, c.x, top, c.z, std('#8e8a84'));
  }
  for (const sg of [house.sign, ...(house.signs ?? [])]) if (sg) makeSign(group, sg);

  // ---------- yard bits that belong to this building ----------
  for (const p of house.patios ?? []) {
    surfaces.push(addBox(p.w, 0.03, p.d, p.x + p.w / 2, 0, p.z + p.d / 2, std(p.color ?? '#c3bdb2')));
  }
  for (const t of house.trees ?? []) {
    const [x, z, type, size] = Array.isArray(t) ? t : [t.x, t.z, t.type, t.size];
    makeTree(group, colliders, x, z, type, size);
  }
  for (const [x, z, size = 1, fl] of house.bushes ?? []) makeBush(group, x, z, size, fl);

  // Combine the many small static pieces (much faster to draw)
  for (const w of walls) w.userData.tag = 'wall';
  for (const s of surfaces) s.userData.tag = 'surface';
  for (const s of solids) s.userData.tag = 'solid';
  for (const g of glass) g.userData.tag = 'glass';
  const replaced = mergeStatic(group);
  return {
    group, walls: remap(walls, replaced), floors, surfaces: remap(surfaces, replaced), solids: remap(solids, replaced),
    colliders, rooms, fans, lightSpots, H, doors, glass: remap(glass, replaced),
  };
}
