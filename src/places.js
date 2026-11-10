// The farm (out west) and the beach on the Great Lake (out east).
import * as THREE from 'three';
import { std, makeSign } from './buildHouse.js';
import { tex } from './textures.js';

const rand = (a, b) => a + Math.random() * (b - a);
const mat = (c, o) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
function part(geo, m, parent, x, y, z) { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh; }

// ---------- farm animals ----------
function animal(kind) {
  const g = new THREE.Group();
  const legs = [];
  const leg = (x, z, h, r, m) => { const l = new THREE.Group(); l.position.set(x, h, z); g.add(l); part(new THREE.CylinderGeometry(r, r * 0.9, h, 6), m, l, 0, -h / 2, 0); legs.push(l); };
  let head;
  if (kind === 'cow') {
    const white = mat('#f4f1ea'), black = mat('#2a2727'), pink = mat('#f4a3c4');
    part(new THREE.BoxGeometry(0.75, 0.7, 1.4), white, g, 0, 1.0, 0);
    for (const [x, y, z, s] of [[0.38, 1.1, 0.2, 0.25], [-0.38, 0.95, -0.3, 0.3], [0.1, 1.36, -0.4, 0.22]]) part(new THREE.SphereGeometry(s, 10, 8), black, g, x, y, z).scale.set(0.3, 1, 1.2);
    head = new THREE.Group(); head.position.set(0, 1.2, 0.8); g.add(head);
    part(new THREE.BoxGeometry(0.45, 0.45, 0.5), white, head, 0, 0, 0.1);
    part(new THREE.BoxGeometry(0.47, 0.22, 0.2), pink, head, 0, -0.12, 0.38);
    for (const s of [-1, 1]) { part(new THREE.ConeGeometry(0.05, 0.18, 6), mat('#e9e4da'), head, s * 0.18, 0.3, 0).rotation.z = -s * 0.5; part(new THREE.SphereGeometry(0.04, 8, 6), black, head, s * 0.13, 0.08, 0.36); }
    for (const [x, z] of [[-0.25, 0.5], [0.25, 0.5], [-0.25, -0.5], [0.25, -0.5]]) leg(x, z, 0.68, 0.08, white);
  } else if (kind === 'pig') {
    const pink = mat('#f4b3c4'), dark = mat('#2a2727');
    part(new THREE.SphereGeometry(0.4, 14, 10), pink, g, 0, 0.5, 0).scale.set(0.9, 0.85, 1.3);
    head = new THREE.Group(); head.position.set(0, 0.6, 0.5); g.add(head);
    part(new THREE.SphereGeometry(0.25, 12, 10), pink, head, 0, 0, 0);
    part(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), mat('#ef84ad'), head, 0, -0.04, 0.24).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { part(new THREE.ConeGeometry(0.08, 0.14, 4), pink, head, s * 0.14, 0.22, 0).rotation.z = -s * 0.4; part(new THREE.SphereGeometry(0.03, 6, 4), dark, head, s * 0.1, 0.06, 0.2); }
    for (const [x, z] of [[-0.18, 0.25], [0.18, 0.25], [-0.18, -0.3], [0.18, -0.3]]) leg(x, z, 0.3, 0.06, pink);
  } else if (kind === 'sheep') {
    const wool = mat('#fbfaf7', { roughness: 1 }), face = mat('#3b3b42');
    for (const [x, y, z] of [[0, 0.75, 0], [0.2, 0.8, 0.25], [-0.2, 0.8, -0.25], [0.2, 0.8, -0.2], [-0.2, 0.8, 0.22], [0, 0.95, 0]]) part(new THREE.SphereGeometry(0.28, 10, 8), wool, g, x, y, z);
    head = new THREE.Group(); head.position.set(0, 0.85, 0.5); g.add(head);
    part(new THREE.SphereGeometry(0.16, 10, 8), face, head, 0, 0, 0.05).scale.set(0.8, 1, 1.2);
    part(new THREE.SphereGeometry(0.13, 10, 8), wool, head, 0, 0.13, -0.02);
    for (const [x, z] of [[-0.15, 0.25], [0.15, 0.25], [-0.15, -0.25], [0.15, -0.25]]) leg(x, z, 0.5, 0.04, face);
  } else if (kind === 'horse') {
    const coat = mat('#8a5a3a'), mane = mat('#3b2a20');
    part(new THREE.BoxGeometry(0.6, 0.7, 1.6), coat, g, 0, 1.35, 0);
    head = new THREE.Group(); head.position.set(0, 1.7, 0.85); g.add(head);
    part(new THREE.BoxGeometry(0.28, 0.75, 0.3), coat, head, 0, 0.2, 0).rotation.x = -0.5;
    part(new THREE.BoxGeometry(0.26, 0.26, 0.55), coat, head, 0, 0.5, 0.35);
    part(new THREE.BoxGeometry(0.06, 0.6, 0.25), mane, head, 0, 0.35, -0.12).rotation.x = -0.5;
    for (const s of [-1, 1]) part(new THREE.ConeGeometry(0.04, 0.14, 4), coat, head, s * 0.09, 0.7, 0.2);
    part(new THREE.CylinderGeometry(0.04, 0.12, 0.7, 6), mane, g, 0, 1.3, -0.85).rotation.x = 0.4;
    for (const [x, z] of [[-0.2, 0.6], [0.2, 0.6], [-0.2, -0.6], [0.2, -0.6]]) leg(x, z, 1.0, 0.07, coat);
  } else { // chicken
    const white = mat('#fbfaf7'), red = mat('#d9443a'), beak = mat('#f2a25f');
    part(new THREE.SphereGeometry(0.15, 10, 8), white, g, 0, 0.25, 0).scale.set(0.9, 1, 1.2);
    head = new THREE.Group(); head.position.set(0, 0.4, 0.13); g.add(head);
    part(new THREE.SphereGeometry(0.08, 10, 8), white, head, 0, 0, 0);
    part(new THREE.BoxGeometry(0.02, 0.07, 0.08), red, head, 0, 0.09, 0);
    part(new THREE.ConeGeometry(0.025, 0.07, 5), beak, head, 0, 0, 0.09).rotation.x = Math.PI / 2;
    part(new THREE.ConeGeometry(0.08, 0.15, 5), white, g, 0, 0.32, -0.18).rotation.x = -0.8;
    for (const x of [-0.05, 0.05]) leg(x, 0, 0.12, 0.012, beak);
  }
  return { g, legs, head };
}

export function buildPlaces(W, { FARM, BEACH, loop }) {
  const group = new THREE.Group();
  const colliders = []; // [x, z, r]
  const flat = (w, d, x, z, y, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), m); b.position.set(x, y - 0.02, z); b.receiveShadow = true; group.add(b); W.surfaces.push(b); return b; };

  // =================== THE FARM ===================
  // dirt road from Birch Ln to the barn
  const [rx0, rz0, rx1, rz1] = FARM.road;
  flat(rx1 - rx0, rz1 - rz0, (rx0 + rx1) / 2, (rz0 + rz1) / 2, 0.0, std('#a08a6a'));
  makeSign(group, { text: 'PepCity Farm', x: -76.2, y: 1.3, z: -43.6, rot: 0, w: 2.4, h: 0.5, bg: '#b5403a', posts: true });
  // silo
  const silo = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 10, 20), std('#c9ccd1', { metalness: 0.3, roughness: 0.5 })); silo.position.set(-104.5, 5, -40); silo.castShadow = true; group.add(silo);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.05, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#b5403a')); dome.position.set(-104.5, 10, -40); group.add(dome);
  for (let i = 1; i < 5; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(2.02, 0.05, 6, 30), std('#8d8a85')); ring.rotation.x = Math.PI / 2; ring.position.set(-104.5, i * 2, -40); group.add(ring); }
  colliders.push([-104.5, -40, 2.1]);
  // fenced pasture (wooden fence with a gate)
  const [px0, pz0, px1, pz1] = FARM.pen, fence = std('#f4efe4');
  const rail = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), a = Math.atan2(bx - ax, bz - az);
    for (const y of [0.45, 0.85]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, len), fence); r.position.set((ax + bx) / 2, y, (az + bz) / 2); r.rotation.y = a; r.castShadow = true; group.add(r); }
    for (let k = 0; k <= Math.ceil(len / 2.5); k++) { const t = Math.min(1, (k * 2.5) / len); const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.12), fence); p.position.set(ax + (bx - ax) * t, 0.52, az + (bz - az) * t); p.castShadow = true; group.add(p); }
  };
  const [g0, g1] = FARM.gate;
  rail(px0, pz0, px1, pz0); rail(px0, pz1, px1, pz1); rail(px0, pz0, px0, pz1);
  rail(px1, pz0, px1, g0); rail(px1, g1, px1, pz1);
  const inPen = (x, z, m = 0.6) => x > px0 + m && x < px1 - m && z > pz0 + m && z < pz1 - m;
  W.fences = { pen: FARM.pen, gate: FARM.gate }; // the player can't walk through fences
  // a water trough and a feed bin in the pen
  const trough = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.6), std('#8d8a85')); trough.position.set(-90, 0.25, -34.8); group.add(trough);
  const tw = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.02, 0.5), std('#7fc4e0', { roughness: 0.1 })); tw.position.set(-90, 0.46, -34.8); group.add(tw);
  // cornfield
  const [cx0, cz0, cx1, cz1] = FARM.corn, stalk = std('#7aa14a'), cob = std('#f2cf63'), leaf = std('#8cbd5a');
  const stalkGeo = new THREE.CylinderGeometry(0.04, 0.05, 2.0, 5), leafGeo = new THREE.BoxGeometry(0.5, 0.02, 0.1), cobGeo = new THREE.CapsuleGeometry(0.05, 0.16, 4, 6);
  const corn = { stalk: [], leaf: [], cob: [] };
  for (let x = cx0; x <= cx1; x += 1.1) for (let z = cz0; z <= cz1; z += 0.7) {
    const jx = x + rand(-0.12, 0.12), jz = z + rand(-0.12, 0.12), h = rand(0.85, 1.1);
    corn.stalk.push([jx, h, jz, 0, h]);
    corn.leaf.push([jx, 1.1 * h, jz, rand(0, 3), 1]); corn.leaf.push([jx, 1.5 * h, jz, rand(0, 3), 1]);
    if (Math.random() < 0.6) corn.cob.push([jx + 0.07, 1.25 * h, jz, 0, 1]);
  }
  const dummy = new THREE.Object3D();
  for (const [k, geo, m] of [['stalk', stalkGeo, stalk], ['leaf', leafGeo, leaf], ['cob', cobGeo, cob]]) {
    const im = new THREE.InstancedMesh(geo, m, corn[k].length);
    corn[k].forEach(([x, y, z, ry, sy], i) => { dummy.position.set(x, y, z); dummy.rotation.set(k === 'leaf' ? 0.4 : 0, ry, k === 'cob' ? 0.3 : 0); dummy.scale.set(1, sy, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    im.castShadow = true; im.computeBoundingSphere(); group.add(im);
  }
  flat(cx1 - cx0 + 1, cz1 - cz0 + 1, (cx0 + cx1) / 2, (cz0 + cz1) / 2, 0.005, std('#8a6a4a'));
  flat(9, 7, -88.2, -5, 0.005, std('#8a6a4a')); // pumpkin patch dirt
  // farm animals
  const herd = [];
  const addAnimal = (kind, n, speed) => { for (let i = 0; i < n; i++) {
    const a = animal(kind), x = rand(px0 + 2, px1 - 2), z = rand(pz0 + 2, pz1 - 2);
    a.g.position.set(x, 0, z); a.g.rotation.y = rand(0, 6); group.add(a.g);
    herd.push({ ...a, kind, speed, target: null, wait: rand(0, 5), sound: rand(5, 25) });
  } };
  addAnimal('cow', 3, 0.6); addAnimal('pig', 3, 0.8); addAnimal('sheep', 4, 0.7); addAnimal('horse', 2, 1.2); addAnimal('chicken', 6, 1.0);

  // =================== THE BEACH ON THE GREAT LAKE ===================
  const B = BEACH;
  const sandMat = new THREE.MeshStandardMaterial({ color: '#efdcaa', map: tex.carpet(), roughness: 1 });
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(B.shore - B.sand + 8, 420), sandMat);
  sand.rotation.x = -Math.PI / 2; sand.position.set((B.sand + B.shore + 8) / 2, 0.004, -10); sand.receiveShadow = true; group.add(sand);
  const lakeMat = new THREE.MeshStandardMaterial({ color: '#5aa9d6', map: tex.water(), roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.88 });
  lakeMat.map = lakeMat.map.clone(); lakeMat.map.repeat.set(60, 60); lakeMat.map.needsUpdate = true;
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(700, 900), lakeMat);
  lake.rotation.x = -Math.PI / 2; lake.position.set(B.shore + 350, 0.03, -10); lake.userData.isWater = true; group.add(lake);
  W.surfaces.push(lake);
  // the lake floor gets darker as it gets deeper
  const shallow = new THREE.Mesh(new THREE.PlaneGeometry(12, 420), std('#d9c68e')); shallow.rotation.x = -Math.PI / 2; shallow.position.set(B.shore + 5, 0.01, -10); group.add(shallow);
  // foam where the waves reach the sand
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 420), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, roughness: 0.4 }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(B.shore, 0.036, -10); group.add(foam);
  // parking lot
  const [lx0, lz0, lx1, lz1] = B.lot;
  flat(lx1 - lx0, lz1 - lz0, (lx0 + lx1) / 2, (lz0 + lz1) / 2, 0.0, std('#77797f'));
  makeSign(group, { text: 'Great Lake Beach', x: 97.5, y: 1.4, z: -17.4, rot: -90, w: 3, h: 0.55, bg: '#2e9fd0', posts: true });
  // pier and lighthouse
  const P = B.pier, plank = std('#a0745a'), plankDark = std('#7a5a3a');
  const deck = new THREE.Mesh(new THREE.BoxGeometry(P.x1 - P.x0, 0.1, P.w), plank); deck.position.set((P.x0 + P.x1) / 2, 0.08, P.z); deck.receiveShadow = deck.castShadow = true; group.add(deck);
  for (let x = P.x0 + 1; x < P.x1; x += 3) for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 8), plankDark); post.position.set(x, 0.3, P.z + s * (P.w / 2 - 0.1)); group.add(post);
  }
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(P.x1 - P.x0, 0.08, 0.08), plankDark); r.position.set((P.x0 + P.x1) / 2, 0.95, P.z + s * (P.w / 2 - 0.05)); group.add(r); }
  const LH = { x: P.x1 + 3.2, z: P.z };
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 1.2, 24), std('#8d8a85')); base.position.set(LH.x, 0.3, LH.z); group.add(base);
  for (let i = 0; i < 6; i++) { const band = new THREE.Mesh(new THREE.CylinderGeometry(1.5 - i * 0.12 - 0.12, 1.5 - i * 0.12, 2, 20), std(i % 2 ? '#d9443a' : '#fbfaf7')); band.position.set(LH.x, 1.9 + i * 2, LH.z); band.castShadow = true; group.add(band); }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.3, 12), new THREE.MeshStandardMaterial({ color: '#fff6c4', emissive: '#ffe27a', emissiveIntensity: 1.2 })); lamp.position.set(LH.x, 13.6, LH.z); group.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.3, 12), std('#d9443a')); cap.position.set(LH.x, 14.9, LH.z); group.add(cap);
  colliders.push([LH.x, LH.z, 3.5]);
  // lifeguard tower
  const tower = new THREE.Group(); tower.position.set(110.2, 0, -8); group.add(tower);
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) part(new THREE.BoxGeometry(0.1, 1.8, 0.1), std('#fbfaf7'), tower, x, 0.9, z);
  part(new THREE.BoxGeometry(1.5, 0.1, 1.5), std('#fbfaf7'), tower, 0, 1.8, 0);
  part(new THREE.BoxGeometry(1.6, 0.1, 1.6), std('#d9443a'), tower, 0, 3.0, 0);
  for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) part(new THREE.BoxGeometry(0.06, 1.2, 0.06), std('#fbfaf7'), tower, x, 2.4, z);
  // sailboats out on the lake
  const boats = [];
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Group();
    part(new THREE.BoxGeometry(1.4, 0.6, 4), std(['#fbfaf7', '#d9443a', '#4f86c6', '#f7da7e'][i]), b, 0, 0.2, 0);
    part(new THREE.CylinderGeometry(0.06, 0.06, 5, 6), std('#8a6a3a'), b, 0, 3, 0);
    const sail = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.6, 0.2), new THREE.Vector3(0, 5.2, 0.2), new THREE.Vector3(0, 0.8, -2.0)]), new THREE.MeshStandardMaterial({ color: '#fbfaf7', side: THREE.DoubleSide }));
    sail.geometry.computeVertexNormals(); b.add(sail);
    group.add(b);
    boats.push({ g: b, r: 40 + i * 25, cx: 210 + i * 15, cz: -10 + i * 30 - 45, sp: 0.02 + i * 0.006, ph: i * 1.7 });
  }
  // seagulls circling over the water
  const gulls = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group(), white = std('#fbfaf7');
    part(new THREE.SphereGeometry(0.15, 8, 6), white, g, 0, 0, 0).scale.set(0.8, 0.8, 1.6);
    const wings = [-1, 1].map((s) => { const p = new THREE.Group(); g.add(p); const w = part(new THREE.BoxGeometry(0.5, 0.02, 0.15), white, p, s * 0.25, 0, 0); w.rotation.z = 0; return p; });
    group.add(g);
    gulls.push({ g, wings, cx: rand(112, 135), cz: rand(-40, 40), r: rand(5, 12), h: rand(6, 11), sp: rand(0.25, 0.45), ph: rand(0, 6) });
  }

  // how deep the water is here (how far you sink in), or 0 on land
  function waterDepth(x, z) {
    if (x < B.shore + 0.5) return 0;
    if (Math.abs(z - P.z) < P.w / 2 && x < P.x1 + 0.5) return 0; // on the pier
    return Math.min(1, (x - B.shore) / 7);
  }

  return {
    group,
    waterDepth,
    blocked(x, z, r = 0.3) {
      for (const [cx, cz, cr] of colliders) if ((x - cx) ** 2 + (z - cz) ** 2 < (r + cr) ** 2) return true;
      // too deep to wade (except along the pier)
      if (x > B.swimTo && !(Math.abs(z - P.z) < P.w / 2 - 0.2 && x < P.x1)) return true;
      // the pasture fence (with a gap for the gate)
      const [a, b, c, d] = FARM.pen, t = 0.35 + r;
      const nearX0 = Math.abs(x - a) < t && z > b - t && z < d + t, nearX1 = Math.abs(x - c) < t && z > b - t && z < d + t && !(z > g0 && z < g1);
      const nearZ = (Math.abs(z - b) < t || Math.abs(z - d) < t) && x > a - t && x < c + t;
      return nearX0 || nearX1 || nearZ;
    },
    update(dt, t, cam, people, sound) {
      const near = (x, z, r) => (x - cam.x) ** 2 + (z - cam.z) ** 2 < r * r;
      lakeMat.map.offset.set(t * 0.01, Math.sin(t * 0.15) * 0.02);
      foam.position.x = B.shore + Math.sin(t * 0.9) * 0.35;
      for (const b of boats) {
        const a = t * b.sp + b.ph;
        b.g.position.set(b.cx + Math.cos(a) * b.r, 0.05 + Math.sin(t * 1.3 + b.ph) * 0.08, b.cz + Math.sin(a) * b.r);
        b.g.rotation.y = -a; b.g.rotation.z = Math.sin(t * 1.1 + b.ph) * 0.05;
      }
      for (const g of gulls) {
        const a = t * g.sp + g.ph;
        g.g.position.set(g.cx + Math.cos(a) * g.r, g.h + Math.sin(t + g.ph) * 0.5, g.cz + Math.sin(a) * g.r);
        g.g.rotation.y = -a;
        const flap = Math.sin(t * 6 + g.ph) * 0.5;
        g.wings[0].rotation.z = flap; g.wings[1].rotation.z = -flap;
      }
      for (const h of herd) {
        const pos = h.g.position;
        if (!near(pos.x, pos.z, 70)) continue;
        if (!h.target) {
          h.wait -= dt;
          if (h.wait <= 0) { const x = pos.x + rand(-5, 5), z = pos.z + rand(-5, 5); if (inPen(x, z)) h.target = new THREE.Vector2(x, z); h.wait = rand(2, 8); }
        }
        let moving = false;
        if (h.target) {
          const dx = h.target.x - pos.x, dz = h.target.y - pos.z, l = Math.hypot(dx, dz);
          if (l < 0.1) h.target = null;
          else {
            pos.x += (dx / l) * h.speed * dt; pos.z += (dz / l) * h.speed * dt; moving = true;
            const want = Math.atan2(dx, dz);
            h.g.rotation.y += Math.atan2(Math.sin(want - h.g.rotation.y), Math.cos(want - h.g.rotation.y)) * Math.min(1, dt * 5);
          }
        }
        const k = moving ? Math.sin(t * (h.kind === 'chicken' ? 18 : 7)) * 0.5 : 0;
        h.legs.forEach((l, i) => { l.rotation.x = i % 2 ? k : -k; });
        if (h.head && !moving) h.head.rotation.x = Math.sin(t * 0.6 + pos.x) > 0.3 ? 0.6 : 0; // munching grass
        if (h.kind === 'chicken') pos.y = moving ? Math.abs(Math.sin(t * 14)) * 0.05 : 0;
        h.sound -= dt;
        if (h.sound <= 0) { h.sound = rand(10, 30); if (near(pos.x, pos.z, 18)) sound?.(h.kind, pos); }
      }
    },
  };
}
