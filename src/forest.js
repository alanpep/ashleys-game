// Kenwood Woods: a big forest behind the houses and all around the neighborhood,
// with trails, a creek with bridges, a frog pond, and lots of animals and plants to find.
// Thousands of trees are drawn with "instancing" (one draw for many copies), in chunks,
// so it stays fast.
import * as THREE from 'three';
import { makeSign, std } from './buildHouse.js';
import { tex } from './textures.js';

const rand = (a, b) => a + Math.random() * (b - a);
// a repeatable random number for a spot (so the forest is the same every time)
const hash = (x, z, k = 0) => { const s = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };

// smooth a list of points into a curve, then sample it
function sampleLine(pts, step = 1) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const n = Math.max(2, Math.ceil(curve.getLength() / step));
  return curve.getSpacedPoints(n).map((p) => [p.x, p.z]);
}
function distToLine(line, x, z) {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1], [bx, bz] = line[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const d = (x - ax - t * dx) ** 2 + (z - az - t * dz) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
// a flat strip along a line
function strip(line, width, y, mat) {
  const pos = [], idx = [];
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    const w = width / 2 * (0.85 + 0.15 * Math.sin(i * 0.7));
    pos.push(line[i][0] - tz * w, y, line[i][1] + tx * w, line[i][0] + tz * w, y, line[i][1] - tx * w);
    if (i) { const k = 2 * i; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uv = [];
  for (let i = 0; i < line.length; i++) uv.push(0, i * 0.5, 1, i * 0.5);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  if (geo.attributes.normal.getY(0) < 0) { for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]; geo.setIndex(idx); geo.computeVertexNormals(); }
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  m.userData.keep = true;
  return m;
}

// ---------- animal models ----------
const mat = (c, o) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
function part(geo, m, parent, x, y, z) { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh; }
function makeDeer(buck) {
  const g = new THREE.Group(), fur = mat('#a0704a'), light = mat('#e8d6bd'), dark = mat('#3b2a20');
  const body = part(new THREE.SphereGeometry(0.35, 14, 10), fur, g, 0, 0.95, 0); body.scale.set(0.8, 0.85, 1.6);
  const neck = new THREE.Group(); neck.position.set(0, 1.1, 0.4); g.add(neck);
  part(new THREE.CylinderGeometry(0.09, 0.12, 0.55, 8), fur, neck, 0, 0.22, 0.08).rotation.x = 0.5;
  const head = part(new THREE.SphereGeometry(0.13, 12, 8), fur, neck, 0, 0.48, 0.24); head.scale.set(0.8, 0.85, 1.4);
  part(new THREE.SphereGeometry(0.03, 8, 6), dark, neck, 0, 0.45, 0.42);
  for (const s of [-1, 1]) {
    part(new THREE.ConeGeometry(0.05, 0.14, 6), fur, neck, s * 0.1, 0.62, 0.18).rotation.z = -s * 0.6;
    if (buck) for (const k of [0, 1]) part(new THREE.CylinderGeometry(0.012, 0.018, 0.3 - k * 0.12, 5), light, neck, s * (0.06 + k * 0.07), 0.72 + k * 0.08, 0.18 - k * 0.05).rotation.z = -s * (0.3 + k * 0.5);
  }
  const legs = [];
  for (const [x, z] of [[-0.15, 0.35], [0.15, 0.35], [-0.15, -0.35], [0.15, -0.35]]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.8, z); g.add(leg);
    part(new THREE.CylinderGeometry(0.035, 0.03, 0.8, 6), fur, leg, 0, -0.4, 0);
    part(new THREE.SphereGeometry(0.035, 6, 4), dark, leg, 0, -0.8, 0);
    legs.push(leg);
  }
  part(new THREE.SphereGeometry(0.07, 8, 6), light, g, 0, 1.08, -0.55);
  return { g, neck, legs };
}
function makeFox() {
  const g = new THREE.Group(), fur = mat('#e0773a'), white = mat('#fbfaf7'), dark = mat('#2a2727');
  const body = part(new THREE.SphereGeometry(0.16, 12, 8), fur, g, 0, 0.32, 0); body.scale.set(0.9, 0.9, 1.9);
  const head = new THREE.Group(); head.position.set(0, 0.42, 0.32); g.add(head);
  part(new THREE.SphereGeometry(0.11, 12, 8), fur, head, 0, 0, 0);
  part(new THREE.ConeGeometry(0.06, 0.14, 8), white, head, 0, -0.02, 0.12).rotation.x = Math.PI / 2;
  part(new THREE.SphereGeometry(0.02, 6, 4), dark, head, 0, -0.02, 0.2);
  for (const s of [-1, 1]) part(new THREE.ConeGeometry(0.045, 0.12, 6), fur, head, s * 0.06, 0.12, -0.01);
  const legs = [];
  for (const [x, z] of [[-0.07, 0.17], [0.07, 0.17], [-0.07, -0.17], [0.07, -0.17]]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.26, z); g.add(leg);
    part(new THREE.CylinderGeometry(0.025, 0.02, 0.26, 6), dark, leg, 0, -0.13, 0);
    legs.push(leg);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.36, -0.28); g.add(tail);
  part(new THREE.SphereGeometry(0.08, 10, 8), fur, tail, 0, 0, -0.14).scale.set(1, 1, 2.2);
  part(new THREE.SphereGeometry(0.05, 8, 6), white, tail, 0, 0, -0.32);
  return { g, legs, tail };
}
function makeSquirrel() {
  const g = new THREE.Group(), fur = mat('#8a6a50'), belly = mat('#e8d6bd'), dark = mat('#2a2727');
  part(new THREE.SphereGeometry(0.07, 10, 8), fur, g, 0, 0.09, 0).scale.set(1, 1, 1.4);
  part(new THREE.SphereGeometry(0.05, 10, 8), fur, g, 0, 0.16, 0.08);
  part(new THREE.SphereGeometry(0.04, 8, 6), belly, g, 0, 0.08, 0.05);
  for (const s of [-1, 1]) { part(new THREE.ConeGeometry(0.015, 0.04, 5), fur, g, s * 0.025, 0.21, 0.07); part(new THREE.SphereGeometry(0.008, 6, 4), dark, g, s * 0.025, 0.17, 0.12); }
  const tail = part(new THREE.SphereGeometry(0.07, 10, 8), fur, g, 0, 0.18, -0.1); tail.scale.set(0.7, 1.6, 0.8);
  return { g, tail };
}
function makeOwl() {
  const g = new THREE.Group(), fur = mat('#8a6a50'), belly = mat('#d9c3a0'), eye = mat('#f7da7e'), dark = mat('#2a2727');
  part(new THREE.SphereGeometry(0.17, 14, 10), fur, g, 0, 0.17, 0).scale.set(1, 1.2, 0.95);
  part(new THREE.SphereGeometry(0.12, 12, 8), belly, g, 0, 0.13, 0.07).scale.set(1, 1.2, 0.6);
  const head = new THREE.Group(); head.position.set(0, 0.36, 0); g.add(head);
  part(new THREE.SphereGeometry(0.13, 14, 10), fur, head, 0, 0, 0);
  const eyes = [];
  for (const s of [-1, 1]) {
    part(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 14), eye, head, s * 0.05, 0.01, 0.115).rotation.x = Math.PI / 2;
    eyes.push(part(new THREE.CylinderGeometry(0.022, 0.022, 0.025, 10), dark, head, s * 0.05, 0.01, 0.12));
    eyes.at(-1).rotation.x = Math.PI / 2;
    part(new THREE.ConeGeometry(0.03, 0.08, 5), fur, head, s * 0.08, 0.12, 0).rotation.z = -s * 0.3;
  }
  part(new THREE.ConeGeometry(0.02, 0.05, 5), mat('#e0b25a'), head, 0, -0.04, 0.13).rotation.x = Math.PI * 0.6;
  return { g, head, eyes };
}
function makeFrog() {
  const g = new THREE.Group(), skin = mat('#6cbf4f'), belly = mat('#e9f2c4'), dark = mat('#2a2727');
  part(new THREE.SphereGeometry(0.1, 12, 8), skin, g, 0, 0.07, 0).scale.set(1.1, 0.6, 1.2);
  part(new THREE.SphereGeometry(0.07, 10, 6), belly, g, 0, 0.05, 0.03).scale.set(1, 0.5, 1);
  for (const s of [-1, 1]) {
    part(new THREE.SphereGeometry(0.035, 8, 6), skin, g, s * 0.05, 0.12, 0.06);
    part(new THREE.SphereGeometry(0.018, 6, 4), dark, g, s * 0.055, 0.13, 0.085);
    part(new THREE.SphereGeometry(0.04, 8, 6), skin, g, s * 0.09, 0.03, -0.05).scale.set(0.7, 0.5, 1.4);
  }
  return { g };
}
function makeTurtle() {
  const g = new THREE.Group(), shell = mat('#5a7a3a'), skin = mat('#9cc06a');
  part(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), shell, g, 0, 0.05, 0).scale.set(1, 0.7, 1.25);
  const head = part(new THREE.SphereGeometry(0.06, 10, 8), skin, g, 0, 0.08, 0.27);
  for (const [x, z] of [[-0.14, 0.14], [0.14, 0.14], [-0.14, -0.14], [0.14, -0.14]]) part(new THREE.SphereGeometry(0.045, 8, 6), skin, g, x, 0.04, z).scale.set(1, 0.6, 1.3);
  return { g, head };
}

export function buildForest(W, cfg, { loop, keepClear, bounds }) {
  const group = new THREE.Group();
  const colliders = new Map(); // grid of tree trunks, for bumping into
  const cell = 4;
  const addCollider = (x, z, r) => {
    const k = `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
    if (!colliders.has(k)) colliders.set(k, []);
    colliders.get(k).push([x, z, r]);
  };

  // ---------- trails, creek, pond ----------
  const trails = cfg.trails.map((t) => sampleLine(t, 1));
  const creeks = cfg.creeks.map((c) => sampleLine(c, 1));
  const trailMat = new THREE.MeshStandardMaterial({ color: '#b08a5f', map: tex.carpet(), roughness: 1 });
  for (const t of trails) group.add(strip(t, 2.2, 0.012, trailMat));
  const bank = std('#bfae8a'), waterMat = new THREE.MeshStandardMaterial({ color: '#7fc4e0', map: tex.water(), roughness: 0.12, metalness: 0.1 });
  for (const c of creeks) {
    group.add(strip(c, 4.2, 0.004, bank));
    const w = strip(c, 2.8, 0.02, waterMat);
    w.userData.isWater = true;
    group.add(w);
    W.surfaces.push(w);
  }
  const P = cfg.pond;
  const sand = new THREE.Mesh(new THREE.CircleGeometry(P.r + 1.2, 40), bank);
  sand.rotation.x = -Math.PI / 2; sand.position.set(P.x, 0.006, P.z); sand.receiveShadow = true; sand.userData.keep = true; group.add(sand);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(P.r, 40), waterMat);
  pond.rotation.x = -Math.PI / 2; pond.position.set(P.x, 0.022, P.z); pond.userData = { isWater: true, keep: true }; group.add(pond);
  W.surfaces.push(pond);
  W.circles.push({ x: P.x, z: P.z, r: P.r - 0.4 });
  const pad = std('#5a9a4e');
  const pads = [];
  for (let i = 0; i < 9; i++) {
    const a = i * 0.9, r = rand(1.5, P.r - 0.8);
    const lp = new THREE.Mesh(new THREE.CircleGeometry(rand(0.3, 0.5), 12, 0.3, Math.PI * 1.8), pad);
    lp.rotation.x = -Math.PI / 2; lp.position.set(P.x + Math.cos(a) * r, 0.03, P.z + Math.sin(a) * r);
    group.add(lp); pads.push(lp.position);
    if (i % 3 === 0) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), std('#f4a3c4')); fl.position.set(lp.position.x + 0.1, 0.07, lp.position.z); group.add(fl); }
  }
  const reed = std('#6b8a3a'), cattail = std('#6b4a2b');
  for (let i = 0; i < 40; i++) {
    const a = rand(0, Math.PI * 2), r = P.r + rand(-0.3, 0.6);
    const h = rand(0.7, 1.3);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, h, 5), reed);
    m.position.set(P.x + Math.cos(a) * r, h / 2, P.z + Math.sin(a) * r); m.rotation.z = rand(-0.15, 0.15); group.add(m);
    if (i % 3 === 0) { const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.14, 4, 6), cattail); c.position.set(m.position.x, h, m.position.z); group.add(c); }
  }

  // ---------- bridges where trails cross the creek ----------
  const wood = std('#8a6a3a'), woodDark = std('#6b4a2b');
  const bridges = [];
  for (const t of trails) for (let i = 1; i < t.length; i++) {
    const [x, z] = t[i];
    if (creeks.some((c) => distToLine(c, x, z) < 0.6) && !bridges.some(([bx, bz]) => Math.hypot(bx - x, bz - z) < 8)) {
      const [px, pz] = t[i - 1], a = Math.atan2(x - px, z - pz);
      bridges.push([x, z]);
      const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = a; group.add(b);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 4.6), wood); deck.position.y = 0.05; deck.receiveShadow = deck.castShadow = true; b.add(deck);
      for (let k = -2; k <= 2; k++) { const plank = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.02, 0.04), woodDark); plank.position.set(0, 0.1, k * 0.9); b.add(plank); }
      for (const s of [-1, 1]) {
        for (const zz of [-2.1, -0.7, 0.7, 2.1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), woodDark); post.position.set(s * 1.05, 0.45, zz); post.castShadow = true; b.add(post); }
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.4), wood); rail.position.set(s * 1.05, 0.88, 0); b.add(rail);
      }
    }
  }

  // ---------- signposts ----------
  for (const s of cfg.signs) makeSign(group, { ...s, y: 1.3, w: s.w ?? 2.2, h: 0.45, bg: '#5a7a3a', posts: true });

  // ---------- Owl Hollow: a giant old tree ----------
  const O = cfg.owlTree;
  const bark = std('#5a3d2b'), canopy = [std('#3f7a3a'), std('#4f8a46'), std('#5a9a4e')];
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 7, 12), bark); trunk.position.set(O.x, 3.5, O.z); trunk.castShadow = true; group.add(trunk);
  const hollow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), std('#1f1712')); hollow.position.set(O.x, 3.0, O.z + 0.86); hollow.scale.y = 1.4; group.add(hollow);
  for (const [dx, dy, dz, r] of [[0, 8, 0, 3], [2, 7, 1, 2.2], [-2, 7.3, -0.5, 2.4], [0.5, 9.5, -1, 2], [-1, 7, 2, 2]]) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), canopy[Math.abs(dx) % 3]); c.position.set(O.x + dx, dy, O.z + dz); c.castShadow = true; group.add(c);
  }
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.4, 8), bark); branch.position.set(O.x + 1.4, 4.4, O.z + 0.3); branch.rotation.z = Math.PI / 2 - 0.2; branch.castShadow = true; group.add(branch);
  for (const [dx, dz] of [[0.9, 0], [-0.8, 0.5], [0.3, -0.9], [-0.4, -0.7]]) { const root = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 1.4, 6), bark); root.position.set(O.x + dx, 0.3, O.z + dz); root.rotation.set(dz * 0.9, 0, -dx * 0.9); group.add(root); }
  addCollider(O.x, O.z, 1.1);

  // ---------- where trees may grow ----------
  const T = cfg.townStrip;
  const insideLoop = (x, z) => x > loop0.x0 + 4 && x < loop0.x1 - 4 && z > loop0.z0 + 4 && z < loop0.z1 - 4;
  const loop0 = cfg.loopRect;
  const clear = (x, z, pad = 0) => {
    if (loop.dist(x, z) < 7) return false;
    if (insideLoop(x, z)) return false;
    if (x > T.x0 && x < T.x1 && z > T.z0 && z < T.z1) return false;
    if (keepClear.some(([a, b, c, d]) => x > a && x < c && z > b && z < d)) return false;
    if (Math.hypot(x - P.x, z - P.z) < P.r + 2.5 + pad) return false;
    if (Math.hypot(x - O.x, z - O.z) < 4) return false;
    for (const c of cfg.clearings) if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return false;
    for (const t of trails) if (distToLine(t, x, z) < 2.6 + pad) return false;
    for (const c of creeks) if (distToLine(c, x, z) < 2.8 + pad) return false;
    return true;
  };

  // ---------- trees and plants, drawn in chunks ----------
  const geos = {
    trunk: new THREE.CylinderGeometry(0.1, 0.15, 1, 6).translate(0, 0.5, 0),
    ball: new THREE.SphereGeometry(1, 9, 7),
    cone: new THREE.ConeGeometry(1, 1, 8),
    fern: new THREE.ConeGeometry(1, 1, 6),
    flower: new THREE.SphereGeometry(1, 6, 4),
    stem: new THREE.CylinderGeometry(1, 1, 1, 5).translate(0, 0.5, 0),
    cap: new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    rock: new THREE.DodecahedronGeometry(1, 0),
    log: new THREE.CylinderGeometry(1, 1, 1, 8),
  };
  const mats = {
    trunk: new THREE.MeshStandardMaterial({ roughness: 0.95 }), ball: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    cone: new THREE.MeshStandardMaterial({ roughness: 0.85 }), fern: new THREE.MeshStandardMaterial({ roughness: 0.9 }),
    flower: new THREE.MeshStandardMaterial({ roughness: 0.6 }), stem: new THREE.MeshStandardMaterial({ roughness: 0.8 }),
    cap: new THREE.MeshStandardMaterial({ roughness: 0.5 }), rock: new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
    log: new THREE.MeshStandardMaterial({ roughness: 0.95 }),
  };
  const CH = 75; // size of each forest chunk (bigger = fewer things to draw)
  const chunks = new Map();
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  function put(kind, x, y, z, sx, sy, sz, color, rx = 0, ry = 0, rz = 0) {
    const k = `${Math.floor(x / CH)},${Math.floor(z / CH)}`;
    if (!chunks.has(k)) chunks.set(k, {});
    const c = chunks.get(k);
    (c[kind] ??= []).push([x, y, z, sx, sy, sz, color, rx, ry, rz]);
  }
  const GREENS = ['#3f7a3a', '#4f8a46', '#5a9a4e', '#467f3e', '#6aa85a'];
  const AUTUMN = ['#e39a4c', '#d9763a', '#f2c14e', '#c8563c'];
  const PINES = ['#2f5d3a', '#356a3f', '#2b5233'];
  function tree(x, z, s, kind) {
    if (kind === 'pine') {
      put('trunk', x, 0, z, s * 1.2, 1.3 * s, s * 1.2, '#6b4a2b');
      [[1.8, 1.7], [1.4, 2.7], [1.0, 3.6], [0.6, 4.4]].forEach(([r, y], i) => put('cone', x, y * s, z, r * s, 1.7 * s, r * s, PINES[(i + Math.floor(x)) % 3], 0, hash(x, z, i) * 3, 0));
    } else {
      const birch = kind === 'birch';
      put('trunk', x, 0, z, s, (birch ? 2.8 : 2.0) * s, s, birch ? '#e9e4da' : '#6b4a2b');
      const pal = kind === 'autumn' ? AUTUMN : GREENS;
      const top = birch ? 2.9 : 2.6;
      [[0, top, 0, 1.4], [0.75, top - 0.4, 0.35, 1.0], [-0.65, top - 0.2, -0.4, 1.05], [0.15, top + 0.75, -0.2, 0.9]].forEach(([dx, dy, dz, r], i) =>
        put('ball', x + dx * s, dy * s, z + dz * s, r * s * (birch ? 0.8 : 1), r * s * (birch ? 0.8 : 1), r * s * (birch ? 0.8 : 1), pal[(i + Math.floor(hash(x, z) * 9)) % pal.length]));
    }
    addCollider(x, z, 0.3 * s);
  }
  const B = bounds, RIM = 18;
  for (let x = B.minX - RIM; x <= B.maxX + RIM; x += 3.6) {
    for (let z = B.minZ - RIM; z <= B.maxZ + RIM; z += 3.6) {
      const jx = x + (hash(x, z, 1) - 0.5) * 3.2, jz = z + (hash(x, z, 2) - 0.5) * 3.2;
      const outside = jx < B.minX || jx > B.maxX || jz < B.minZ || jz > B.maxZ;
      if (outside && hash(x, z, 9) < 0.3) continue; // beyond the edge: a bit thinner
      if (!clear(jx, jz)) continue;
      const r = hash(x, z, 3);
      if (r < 0.62) {
        const kinds = ['round', 'pine', 'pine', 'round', 'birch', 'autumn', 'round', 'pine'];
        tree(jx, jz, 0.85 + hash(x, z, 4) * 0.55, kinds[Math.floor(hash(x, z, 5) * kinds.length)]);
      } else if (!outside) {
        // forest floor: ferns, flowers, mushrooms, rocks, logs, stumps
        const f = hash(x, z, 6);
        if (f < 0.35) for (let i = 0; i < 4; i++) put('fern', jx + rand(-0.6, 0.6), 0.15, jz + rand(-0.6, 0.6), 0.35, 0.35, 0.35, GREENS[i % 5], rand(-0.3, 0.3), rand(0, 3), rand(-0.3, 0.3));
        else if (f < 0.55) for (let i = 0; i < 6; i++) put('flower', jx + rand(-0.8, 0.8), 0.12, jz + rand(-0.8, 0.8), 0.06, 0.06, 0.06, ['#f4a3c4', '#f7da7e', '#bba6e6', '#fbfaf7', '#93c9ea'][i % 5]);
        else if (f < 0.68) for (let i = 0; i < 3; i++) { const mx = jx + rand(-0.5, 0.5), mz = jz + rand(-0.5, 0.5), h = rand(0.08, 0.18); put('stem', mx, 0, mz, 0.025, h, 0.025, '#f4efe4'); put('cap', mx, h, mz, rand(0.06, 0.11), 0.07, rand(0.06, 0.11), ['#d9443a', '#c8963c', '#bba6e6'][i % 3]); }
        else if (f < 0.8) put('rock', jx, 0.1, jz, rand(0.3, 0.8), rand(0.25, 0.5), rand(0.3, 0.8), ['#9a958c', '#8a857c', '#a8a39a'][Math.floor(f * 30) % 3], 0, rand(0, 3), 0);
        else if (f < 0.88) put('log', jx, 0.2, jz, 0.2, rand(1.6, 2.6), 0.2, '#6b4a2b', 0, rand(0, 3), Math.PI / 2);
        else if (f < 0.94) put('trunk', jx, 0, jz, 2.6, 0.4, 2.6, '#7a5a3a');
      }
    }
  }
  // the deer meadow is full of wildflowers
  const M = cfg.clearings.find((c) => c.meadow);
  if (M) for (let i = 0; i < 260; i++) {
    const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * M.r;
    put('flower', M.x + Math.cos(a) * r, rand(0.1, 0.25), M.z + Math.sin(a) * r, 0.06, 0.06, 0.06, ['#f4a3c4', '#f7da7e', '#bba6e6', '#fbfaf7', '#ec7d72', '#93c9ea'][i % 6]);
  }
  const chunkMeshes = [];
  for (const c of chunks.values()) {
    for (const [kind, list] of Object.entries(c)) {
      const im = new THREE.InstancedMesh(geos[kind], mats[kind], list.length);
      list.forEach(([x, y, z, sx, sy, sz, color, rx, ry, rz], i) => {
        dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        im.setColorAt(i, col.set(color));
      });
      im.castShadow = kind !== 'flower' && kind !== 'fern';
      im.receiveShadow = true;
      im.computeBoundingSphere();
      im.userData.small = ['fern', 'flower', 'stem', 'cap', 'rock', 'log'].includes(kind);
      group.add(im);
      chunkMeshes.push(im);
    }
  }

  // ---------- fireflies ----------
  const FLIES = 80;
  const flyGeo = new THREE.BufferGeometry();
  const flyPos = new Float32Array(FLIES * 3);
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  const flyHome = Array.from({ length: FLIES }, (_, i) => {
    const spot = cfg.fireflies[i % cfg.fireflies.length];
    return { x: spot[0] + rand(-6, 6), z: spot[1] + rand(-6, 6), ph: rand(0, 10) };
  });
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: '#fff27a', size: 0.12, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  flies.frustumCulled = false;
  group.add(flies);

  // ---------- animals ----------
  const critters = [];
  const blockedAt = (x, z, r = 0.3) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const [tx, tz, tr] of colliders.get(`${cx + i},${cz + j}`) ?? []) if ((x - tx) ** 2 + (z - tz) ** 2 < (r + tr) ** 2) return true;
    }
    return false;
  };
  const walkable = (x, z) => !blockedAt(x, z) && loop.dist(x, z) > 5 && !insideLoop(x, z) && Math.hypot(x - P.x, z - P.z) > P.r + 0.3
    && x > B.minX && x < B.maxX && z > B.minZ && z < B.maxZ;
  function addWalker(kind, x, z, opts = {}) {
    const m = kind === 'deer' ? makeDeer(opts.buck) : kind === 'fox' ? makeFox() : kind === 'turtle' ? makeTurtle() : makeSquirrel();
    m.g.position.set(x, 0, z); m.g.rotation.y = rand(0, 6);
    group.add(m.g);
    critters.push({ kind, ...m, home: new THREE.Vector2(x, z), target: null, wait: rand(0, 4), flee: 0, climb: 0, ...opts });
  }
  for (const [x, z, buck] of cfg.deer) addWalker('deer', x, z, { buck, range: 14, speed: 1.1, run: 6, scare: 7 });
  for (const [x, z] of cfg.foxes) addWalker('fox', x, z, { range: 18, speed: 2.0, run: 5, scare: 4.5 });
  for (const [x, z] of cfg.squirrels) addWalker('squirrel', x, z, { range: 8, speed: 2.5, run: 4, scare: 3.5 });
  for (let i = 0; i < 2; i++) { const a = i * 3; addWalker('turtle', P.x + Math.cos(a) * (P.r + 0.7), P.z + Math.sin(a) * (P.r + 0.7), { range: 0, speed: 0.15, ring: a, scare: 0 }); }
  const owls = cfg.owls.map(([x, y, z]) => { const o = makeOwl(); o.g.position.set(x, y, z); group.add(o.g); return { ...o, hoot: rand(4, 12) }; });
  const frogs = Array.from({ length: 6 }, (_, i) => {
    const f = makeFrog(); const spot = pads[i % pads.length];
    f.g.position.set(spot.x, 0.03, spot.z); f.g.rotation.y = rand(0, 6); group.add(f.g);
    return { ...f, from: spot.clone(), to: null, t: 0, wait: rand(1, 6), croak: rand(3, 15) };
  });

  function nearest(people, x, z) {
    let best = null, bd = Infinity;
    for (const p of people) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
    return { p: best, d: bd };
  }

  return {
    group,
    // is a tree trunk here?
    blocked: blockedAt,
    // don't draw forest that's too far away to see (small plants vanish sooner)
    cull(cam, view) {
      for (const im of chunkMeshes) {
        const s = im.boundingSphere;
        const d = Math.hypot(s.center.x - cam.x, s.center.z - cam.z) - s.radius;
        im.visible = d < (im.userData.small ? view * 0.45 : view + 20);
      }
      flies.visible = view > 50;
    },
    update(dt, t, people, cam, sound) {
      const near = (x, z, r) => (x - cam.x) ** 2 + (z - cam.z) ** 2 < r * r;
      // fireflies
      for (let i = 0; i < FLIES; i++) {
        const h = flyHome[i], k = t * 0.4 + h.ph;
        flyPos[i * 3] = h.x + Math.sin(k) * 2 + Math.sin(k * 2.7) * 0.5;
        flyPos[i * 3 + 1] = 0.6 + Math.sin(k * 1.3) * 0.4 + 0.4;
        flyPos[i * 3 + 2] = h.z + Math.cos(k * 0.8) * 2;
      }
      flyGeo.attributes.position.needsUpdate = true;
      flies.material.size = 0.1 + Math.sin(t * 6) * 0.03;

      for (const c of critters) {
        if (!near(c.g.position.x, c.g.position.z, 70)) continue;
        const pos = c.g.position;
        if (c.kind === 'turtle') { // slow laps around the pond
          c.ring += dt * 0.02;
          const r = P.r + 0.7;
          pos.set(P.x + Math.cos(c.ring) * r, 0, P.z + Math.sin(c.ring) * r);
          c.g.rotation.y = -c.ring;
          c.head.position.z = 0.27 + Math.sin(t * 2) * 0.02;
          continue;
        }
        if (c.climb > 0) { // a squirrel up a tree
          c.climb -= dt;
          pos.y = Math.min(2.6, pos.y + dt * 6);
          if (c.climb <= 0) c.down = true;
          continue;
        }
        if (c.down) { pos.y = Math.max(0, pos.y - dt * 4); if (pos.y <= 0) c.down = false; continue; }
        const { p, d } = nearest(people, pos.x, pos.z);
        if (p && d < c.scare && c.flee <= 0) {
          c.flee = 2.5;
          if (c.kind === 'squirrel' && Math.random() < 0.7) { c.climb = rand(3, 7); sound?.('squirrel', pos); continue; }
          const a = Math.atan2(pos.x - p.x, pos.z - p.z) + rand(-0.4, 0.4);
          c.target = new THREE.Vector2(pos.x + Math.sin(a) * 10, pos.z + Math.cos(a) * 10);
        }
        c.flee -= dt;
        if (!c.target) {
          c.wait -= dt;
          if (c.wait <= 0) {
            const a = rand(0, Math.PI * 2), r = rand(2, c.range);
            const x = c.home.x + Math.cos(a) * r, z = c.home.y + Math.sin(a) * r;
            if (walkable(x, z)) c.target = new THREE.Vector2(x, z);
            c.wait = rand(2, 7);
          }
        }
        let moving = false;
        if (c.target) {
          const dx = c.target.x - pos.x, dz = c.target.y - pos.z, l = Math.hypot(dx, dz);
          const speed = c.flee > 0 ? c.run : c.speed;
          if (l < 0.15) c.target = null;
          else {
            const nx = pos.x + (dx / l) * speed * dt, nz = pos.z + (dz / l) * speed * dt;
            if (!walkable(nx, nz)) c.target = null;
            else {
              pos.x = nx; pos.z = nz; moving = true;
              const want = Math.atan2(dx, dz);
              c.g.rotation.y += Math.atan2(Math.sin(want - c.g.rotation.y), Math.cos(want - c.g.rotation.y)) * Math.min(1, dt * 8);
            }
          }
        }
        const fast = c.flee > 0;
        const k = moving ? Math.sin(t * (fast ? 16 : 8)) * (fast ? 0.7 : 0.4) : 0;
        if (c.legs) c.legs.forEach((leg, i) => { leg.rotation.x = (i % 2 ? k : -k) * (i < 2 ? 1 : -1); });
        if (c.kind === 'deer') { // graze when standing still
          const graze = !moving && Math.sin(t * 0.5 + c.home.x) > 0.2;
          c.neck.rotation.x += ((graze ? 1.2 : 0) - c.neck.rotation.x) * Math.min(1, dt * 3);
          pos.y = moving && fast ? Math.abs(Math.sin(t * 8)) * 0.2 : 0;
        }
        if (c.kind === 'fox') c.tail.rotation.y = Math.sin(t * 3) * 0.3;
        if (c.kind === 'squirrel') { pos.y = moving ? Math.abs(Math.sin(t * 14)) * 0.08 : 0; c.tail.rotation.x = Math.sin(t * 5) * 0.2; }
      }
      for (const o of owls) {
        if (!near(o.g.position.x, o.g.position.z, 60)) continue;
        const { p, d } = nearest(people, o.g.position.x, o.g.position.z);
        const want = p && d < 15 ? Math.atan2(p.x - o.g.position.x, p.z - o.g.position.z) : Math.sin(t * 0.3) * 1.5;
        o.head.rotation.y += (want - o.head.rotation.y) * Math.min(1, dt * 2);
        for (const e of o.eyes) e.scale.y = (t % 4.3) < 0.15 ? 0.1 : 1;
        o.hoot -= dt;
        if (o.hoot <= 0) { o.hoot = rand(8, 18); if (p && d < 20) sound?.('owl', o.g.position); }
      }
      for (const f of frogs) {
        if (!near(f.g.position.x, f.g.position.z, 50)) continue;
        if (!f.to) {
          f.wait -= dt;
          if (f.wait <= 0) {
            const target = pads[Math.floor(Math.random() * pads.length)];
            f.from = f.g.position.clone(); f.to = target.clone(); f.t = 0; f.wait = rand(3, 9);
            f.g.rotation.y = Math.atan2(f.to.x - f.from.x, f.to.z - f.from.z);
          }
          f.croak -= dt;
          if (f.croak <= 0) { f.croak = rand(6, 16); sound?.('frog', f.g.position); f.g.scale.y = 1.3; }
          f.g.scale.y += (1 - f.g.scale.y) * Math.min(1, dt * 6);
        } else {
          f.t += dt / 0.6;
          const k = Math.min(1, f.t);
          f.g.position.lerpVectors(f.from, f.to, k);
          f.g.position.y = 0.03 + Math.sin(k * Math.PI) * 0.6;
          if (k >= 1) f.to = null;
        }
      }
      if (waterMat.map) waterMat.map.offset.set(t * 0.05, Math.sin(t * 0.2) * 0.05);
    },
  };
}
