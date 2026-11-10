// PepCity Fun Park: roller coasters, a Ferris wheel and lots of other rides.
// Every ride moves by itself. Right-click one to get on: you ride a seat, then get off at the end.
import * as THREE from 'three';
import { std, makeSign } from './buildHouse.js';
import { stripes } from './textures.js';
import { mergeStatic } from './merge.js';

const rand = (a, b) => a + Math.random() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (c, o) => std(c, o);
function mesh(geo, m, parent, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
// a cylinder from point a to point b (posts, poles, struts)
function beam(parent, a, b, r, m) {
  const d = b.clone().sub(a), len = d.length();
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m);
  o.position.copy(a).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  o.castShadow = true; parent.add(o); return o;
}
// an empty spot where a rider sits (+z is the way they face)
function seatAt(parent, x, y, z, ry = 0) { const s = new THREE.Object3D(); s.position.set(x, y, z); s.rotation.y = ry; parent.add(s); return s; }
const COLORS = ['#ec7d72', '#93c9ea', '#f7da7e', '#aee0c5', '#ef84ad', '#bba6e6', '#f2a25f', '#5fb3a8'];

// ======================= roller coaster =======================
function coaster({ name, points, track, support, cars, carColor, liftSpeed = 4, maxSpeed = 22, station }) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => V(x, y, z)), true, 'centripetal');
  const L = curve.getLength(), N = Math.ceil(L / 0.5);
  // frames: where the track is, which way is forward, up and sideways (up is carried through the loop)
  const P = [], T = [], U = [], S = [];
  let up = V(0, 1, 0);
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    // side, up and forward must make a proper (right-handed) set, or the cars come out sideways and tilted
    let side = new THREE.Vector3().crossVectors(up, t);
    if (side.lengthSq() < 1e-6) side = new THREE.Vector3().crossVectors(V(0, 0, 1), t);
    side.normalize();
    up = new THREE.Vector3().crossVectors(t, side).normalize();
    // gently settle back to "right side up" when the track isn't steep
    if (Math.abs(t.y) < 0.6 && up.y > 0) { up.lerp(V(0, 1, 0), 0.08).normalize(); side.crossVectors(up, t).normalize(); up.crossVectors(t, side).normalize(); }
    P.push(p); T.push(t); U.push(up.clone()); S.push(side.clone());
  }
  const topY = Math.max(...P.map((p) => p.y));
  const offsetCurve = (fn) => new THREE.CatmullRomCurve3(P.slice(0, N).map((p, i) => fn(p, i)), true);
  const railMat = mat(track, { metalness: 0.4, roughness: 0.35 });
  for (const s of [-0.45, 0.45]) g.add(new THREE.Mesh(new THREE.TubeGeometry(offsetCurve((p, i) => p.clone().addScaledVector(S[i], s)), N, 0.07, 6, true), railMat));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(offsetCurve((p, i) => p.clone().addScaledVector(U[i], -0.32)), N, 0.15, 6, true), railMat));
  // cross ties and support posts (many copies, drawn together)
  const ties = [], posts = [], m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i += 2) {
    m4.makeBasis(S[i], U[i], T[i]).setPosition(P[i].clone().addScaledVector(U[i], -0.2));
    ties.push(m4.clone());
    if (i % 8 === 0 && U[i].y > 0.6 && P[i].y > 1.2) {
      const h = P[i].y - 0.35;
      posts.push(new THREE.Matrix4().compose(V(P[i].x, h / 2, P[i].z), new THREE.Quaternion(), V(1, h, 1)));
    }
  }
  const tieM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.08, 0.15), mat('#5a5a62'), ties.length);
  ties.forEach((m, i) => tieM.setMatrixAt(i, m)); g.add(tieM);
  const postM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.22, 1, 8), mat(support), posts.length);
  posts.forEach((m, i) => postM.setMatrixAt(i, m)); postM.castShadow = true; g.add(postM);
  // the station: a platform next to the start of the track, with a roof
  const st = P[0].clone().addScaledVector(S[0], station.side * 2.1), rotY = Math.atan2(T[0].x, T[0].z);
  const plat = mesh(new THREE.BoxGeometry(2.6, P[0].y - 0.15, 9), mat('#c9c3b8'), g, st.x, (P[0].y - 0.15) / 2, st.z); plat.rotation.y = rotY;
  const roof = mesh(new THREE.BoxGeometry(6, 0.2, 10), mat(track), g, P[0].x + S[0].x * station.side, P[0].y + 3.2, P[0].z + S[0].z * station.side); roof.rotation.y = rotY;
  for (const k of [-4, 4]) beam(g, V(st.x + T[0].x * k, 0, st.z + T[0].z * k), V(st.x + T[0].x * k, P[0].y + 3.1, st.z + T[0].z * k), 0.12, mat('#fbfaf7'));
  const clickables = [plat, roof];
  // the train
  const train = [];
  const cm = mat(carColor, { roughness: 0.35 }), seatM = mat('#2a2727');
  for (let c = 0; c < cars; c++) {
    const car = new THREE.Group(); g.add(car);
    mesh(new THREE.BoxGeometry(1.25, 0.55, 1.9), cm, car, 0, 0.35, 0);
    mesh(new THREE.BoxGeometry(1.1, 0.5, 0.15), seatM, car, 0, 0.75, -0.75);
    mesh(new THREE.BoxGeometry(1.15, 0.12, 0.6), seatM, car, 0, 0.78, 0.55).rotation.x = -0.3;
    if (c === 0) mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), cm, car, 0, 0.6, 0.95).rotation.x = Math.PI / 2;
    car.userData.seat = seatAt(car, 0.25, 0.62, -0.2);
    train.push(car); clickables.push(...car.children.filter((o) => o.isMesh));
  }
  let s = rand(0, L), v = 6, lap = null;
  const frameAt = (dist) => { const f = (((dist % L) + L) % L) / L * N, i = Math.floor(f) % N; return i; };
  // how the track is turned at each point, so the cars can glide smoothly between points
  const Q = P.map((_, i) => new THREE.Quaternion().setFromRotationMatrix(m4.makeBasis(S[i], U[i], T[i])));
  const cp = new THREE.Vector3(), cq = new THREE.Quaternion(), one = V(1, 1, 1);
  function place() {
    train.forEach((car, c) => {
      const f = (((s - c * 2.1) % L) + L) % L / L * N, i0 = Math.floor(f) % N, i1 = (i0 + 1) % N, k = f - Math.floor(f);
      cp.lerpVectors(P[i0], P[i1], k);
      cq.slerpQuaternions(Q[i0], Q[i1], k);
      car.matrixAutoUpdate = false;
      car.matrix.compose(cp, cq, one);
      car.updateMatrixWorld(true);
    });
  }
  place();
  return {
    name, group: g, clickables, label: `ride the ${name}! 🎢`, follow: true, coaster: true, topY,
    update(dt) {
      const i = frameAt(s);
      const t = T[i], y = P[i].y;
      let want = Math.sqrt(Math.max(0, 2 * 9.8 * (topY + 0.6 - y)));
      if (t.y > 0.12) want = Math.max(liftSpeed, Math.min(want, liftSpeed + 1)); // chain lift: clank clank up the hill
      want = Math.min(maxSpeed, Math.max(3, want));
      const toStation = L - (((s % L) + L) % L);
      if (toStation < 10) want = Math.min(want, 3 + toStation * 0.4); // brakes coming into the station
      v += (want - v) * Math.min(1, dt * 3);
      s += v * dt;
      if (lap !== null) lap += v * dt;
      place();
    },
    board() {
      s = 0; v = 0; lap = 0; place();
      return {
        anchor: train[0].userData.seat,
        canLeave: false,
        speed: () => v,
        done: () => lap >= L - 0.5,
        exit: st.clone().setY(0).addScaledVector(T[0], 6).addScaledVector(S[0], station.side * 1.6),
        end: () => { lap = null; },
      };
    },
  };
}

// ======================= Ferris wheel =======================
function ferrisWheel(cx, cz) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz);
  const C = 15.5, R = 13, wheel = new THREE.Group(); wheel.position.y = C; g.add(wheel);
  const white = mat('#fbfaf7'), pink = mat('#ef84ad'), metal = mat('#c9ccd1', { metalness: 0.4 });
  for (const z of [-1.5, 1.5]) {
    mesh(new THREE.TorusGeometry(R, 0.22, 8, 72), pink, wheel, 0, 0, z);
    mesh(new THREE.TorusGeometry(R * 0.55, 0.12, 6, 48), white, wheel, 0, 0, z);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; beam(wheel, V(0, 0, z), V(Math.cos(a) * R, Math.sin(a) * R, z), 0.07, white); }
  }
  mesh(new THREE.CylinderGeometry(0.6, 0.6, 3.6, 16), metal, wheel).rotation.x = Math.PI / 2;
  const lights = mat('#fff2a8', { emissive: '#ffd84d', emissiveIntensity: 0.9 });
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; mesh(new THREE.SphereGeometry(0.12, 6, 4), lights, wheel, Math.cos(a) * (R + 0.25), Math.sin(a) * (R + 0.25), 1.6); }
  const legs = [];
  for (const z of [-2.4, 2.4]) for (const x of [-7, 7]) legs.push(beam(g, V(x, 0, z * 1.6), V(0, C, z), 0.3, white));
  const gondolas = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const pivot = new THREE.Group(); pivot.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); wheel.add(pivot);
    const cab = new THREE.Group(); pivot.add(cab);
    const cm = mat(COLORS[i % COLORS.length], { roughness: 0.4 });
    mesh(new THREE.BoxGeometry(1.7, 0.5, 1.5), cm, cab, 0, -2.0, 0);
    mesh(new THREE.BoxGeometry(1.8, 0.12, 1.6), cm, cab, 0, -0.55, 0);
    for (const [x, z] of [[-0.8, -0.7], [0.8, -0.7], [-0.8, 0.7], [0.8, 0.7]]) mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), white, cab, x, -1.2, z);
    beam(cab, V(0, -0.55, 0), V(0, 0, 0), 0.05, metal);
    gondolas.push({ pivot, cab, seat: seatAt(cab, 0, -1.75, -0.2) });
  }
  const plat = mesh(new THREE.BoxGeometry(6, 0.5, 4), mat('#c9c3b8'), g, 0, 0.25, 4.5);
  const colliders = [[cx - 7, cz - 3.84, 0.6], [cx + 7, cz - 3.84, 0.6], [cx - 7, cz + 3.84, 0.6], [cx + 7, cz + 3.84, 0.6]];
  let spin = 0;
  return {
    name: 'Ferris Wheel', group: g, clickables: [plat, ...legs, ...gondolas.map((q) => q.cab.children[0])], label: 'ride the Ferris wheel! 🎡', colliders,
    update(dt) {
      spin += dt * 0.2;
      wheel.rotation.z = -spin;
      for (const q of gondolas) q.cab.rotation.z = spin + Math.sin(spin * 3) * 0.03; // stays level
    },
    board() {
      let best = gondolas[0], low = Infinity;
      const p = new THREE.Vector3();
      for (const q of gondolas) { q.seat.getWorldPosition(p); if (p.y < low) { low = p.y; best = q; } }
      let t = 0;
      return { anchor: best.seat, canLeave: true, tick: (dt) => { t += dt; }, done: () => t > (Math.PI * 2) / 0.2, exit: V(cx + 2.5, 0, cz + 7.5) }; // one full turn
    },
  };
}

// ======================= carousel =======================
function carousel(cx, cz) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz);
  const plat = new THREE.Group(); g.add(plat);
  mesh(new THREE.CylinderGeometry(7, 7.2, 0.5, 40), mat('#fbfaf7'), g, 0, 0.25, 0);
  mesh(new THREE.CylinderGeometry(6.6, 6.6, 0.1, 40), mat('#c8963c'), plat, 0, 0.55, 0);
  mesh(new THREE.CylinderGeometry(1.2, 1.2, 5, 16), mat('#ef84ad'), plat, 0, 3, 0);
  const canopy = new THREE.MeshStandardMaterial({ map: stripes('#ef84ad', '#fbfaf7'), roughness: 0.7, side: THREE.DoubleSide });
  canopy.map.repeat.set(16, 1);
  mesh(new THREE.ConeGeometry(7.6, 2.6, 32, 1, true), canopy, plat, 0, 6.7, 0);
  mesh(new THREE.SphereGeometry(0.5, 12, 8), mat('#f2cf63', { metalness: 0.5 }), plat, 0, 8.2, 0);
  const gold = mat('#f2cf63', { metalness: 0.6, roughness: 0.3 });
  const horses = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r = i % 2 ? 4.8 : 3.4;
    const h = new THREE.Group(); h.position.set(Math.cos(a) * r, 1.2, Math.sin(a) * r); h.rotation.y = -a; plat.add(h);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), gold, plat, h.position.x, 3.1, h.position.z);
    const coat = mat(['#fbfaf7', '#f7da7e', '#93c9ea', '#ef84ad'][i % 4]);
    mesh(new THREE.BoxGeometry(0.35, 0.45, 1.1), coat, h, 0, 0.6, 0);
    mesh(new THREE.BoxGeometry(0.25, 0.6, 0.3), coat, h, 0, 0.95, 0.5).rotation.x = -0.4;
    mesh(new THREE.BoxGeometry(0.22, 0.25, 0.45), coat, h, 0, 1.2, 0.7);
    mesh(new THREE.BoxGeometry(0.4, 0.08, 0.45), mat('#d9443a'), h, 0, 0.86, -0.05);
    for (const [x, z] of [[-0.12, 0.4], [0.12, 0.4], [-0.12, -0.4], [0.12, -0.4]]) mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), coat, h, x, 0.2, z).rotation.x = z > 0 ? -0.5 : 0.5;
    horses.push({ h, seat: seatAt(h, 0, 0.9, -0.05), ph: i * 0.9 });
  }
  let spin = 0;
  return {
    name: 'Carousel', group: g, clickables: [g.children[0], ...horses.map((x) => x.h.children[0])], label: 'ride the carousel! 🎠', colliders: [[cx, cz, 7.2]],
    music: V(cx, 0, cz),
    update(dt, t) {
      spin += dt * 0.55; plat.rotation.y = -spin; // turn the way the horses face, so they go nose first
      for (const x of horses) x.h.position.y = 1.0 + Math.sin(t * 2 + x.ph) * 0.35;
    },
    board(player) {
      let best = horses[0], bd = Infinity; const p = new THREE.Vector3();
      for (const x of horses) { x.seat.getWorldPosition(p); const d = p.distanceTo(player); if (d < bd) { bd = d; best = x; } }
      let t = 0;
      return { anchor: best.seat, canLeave: true, tick: (dt) => { t += dt; }, done: () => t > 28, exit: V(cx, 0, cz + 9) };
    },
  };
}

// ======================= swing ride =======================
function swingRide(cx, cz) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz);
  mesh(new THREE.CylinderGeometry(0.7, 1.0, 10, 16), mat('#93c9ea'), g, 0, 5, 0);
  mesh(new THREE.CylinderGeometry(3, 3, 0.5, 24), mat('#fbfaf7'), g, 0, 0.25, 0);
  const top = new THREE.Group(); top.position.y = 9.6; g.add(top);
  const canopy = new THREE.MeshStandardMaterial({ map: stripes('#93c9ea', '#fbfaf7'), roughness: 0.7, side: THREE.DoubleSide });
  canopy.map.repeat.set(12, 1);
  mesh(new THREE.ConeGeometry(4.2, 1.8, 24, 1, true), canopy, top, 0, 1.0, 0);
  const swings = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const arm = new THREE.Group(); arm.position.set(Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4); arm.rotation.y = -a; top.add(arm);
    const pivot = new THREE.Group(); arm.add(pivot);
    for (const z of [-0.2, 0.2]) beam(pivot, V(0, 0, z), V(0, -4.2, z), 0.02, mat('#8d8a85'));
    mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat(COLORS[i % 8]), pivot, 0, -4.3, 0);
    mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), mat(COLORS[i % 8]), pivot, -0.24, -4.05, 0).rotation.y = Math.PI / 2;
    swings.push({ pivot, seat: seatAt(pivot, 0, -4.25, 0, Math.PI / 2) });
  }
  let spin = 0, speed = 0.9;
  return {
    name: 'Swing Ride', group: g, clickables: [g.children[0], g.children[1]], label: 'ride the swings! 🪢', colliders: [[cx, cz, 3]],
    update(dt) {
      spin += dt * speed; top.rotation.y = -spin;
      for (const s of swings) s.pivot.rotation.z = Math.min(0.85, speed * 0.75); // fly outward
    },
    board(player) {
      let best = swings[0], bd = Infinity; const p = new THREE.Vector3();
      for (const s of swings) { s.seat.getWorldPosition(p); const d = p.distanceTo(player); if (d < bd) { bd = d; best = s; } }
      let t = 0;
      return { anchor: best.seat, canLeave: true, tick: (dt) => { t += dt; }, done: () => t > 25, exit: V(cx, 0, cz + 10) };
    },
  };
}

// ======================= teacups =======================
function teacups(cx, cz) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz);
  mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.3, 40), mat('#f7da7e'), g, 0, 0.15, 0);
  const plat = new THREE.Group(); plat.position.y = 0.3; g.add(plat);
  const cups = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, cup = new THREE.Group(); cup.position.set(Math.cos(a) * 4.2, 0, Math.sin(a) * 4.2); plat.add(cup);
    const cm = mat(COLORS[(i * 3) % 8], { roughness: 0.35 });
    mesh(new THREE.CylinderGeometry(1.2, 0.8, 1.1, 20, 1, true), new THREE.MeshStandardMaterial({ color: cm.color, side: THREE.DoubleSide, roughness: 0.35 }), cup, 0, 0.6, 0);
    mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 20), cm, cup, 0, 0.1, 0);
    mesh(new THREE.TorusGeometry(0.4, 0.08, 8, 16), cm, cup, 1.25, 0.7, 0).rotation.y = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.6, 10), mat('#fbfaf7'), cup, 0, 0.35, 0);
    cups.push({ cup, seat: seatAt(cup, 0, 0.5, -0.5), ph: i });
  }
  let spin = 0;
  return {
    name: 'Teacups', group: g, clickables: [g.children[0], ...cups.map((c) => c.cup.children[0])], label: 'ride the spinning teacups! ☕', colliders: [[cx, cz, 7.5]],
    update(dt, t) { spin += dt * 0.4; plat.rotation.y = spin; for (const c of cups) c.cup.rotation.y = t * (1.2 + c.ph * 0.15) * (c.ph % 2 ? 1 : -1); },
    board(player) {
      let best = cups[0], bd = Infinity; const p = new THREE.Vector3();
      for (const c of cups) { c.cup.getWorldPosition(p); const d = p.distanceTo(player); if (d < bd) { bd = d; best = c; } }
      let t = 0;
      return { anchor: best.seat, canLeave: true, tick: (dt) => { t += dt; }, done: () => t > 22, exit: V(cx, 0, cz + 9) };
    },
  };
}

// ======================= drop tower =======================
function dropTower(cx, cz) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz);
  const H = 36;
  mesh(new THREE.BoxGeometry(1.6, H, 1.6), mat('#bba6e6'), g, 0, H / 2, 0);
  for (let y = 2; y < H; y += 3) mesh(new THREE.BoxGeometry(1.7, 0.12, 1.7), mat('#fbfaf7'), g, 0, y, 0);
  mesh(new THREE.ConeGeometry(1.4, 2, 4), mat('#ef84ad'), g, 0, H + 1, 0).rotation.y = Math.PI / 4;
  const ring = new THREE.Group(); g.add(ring);
  mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.5, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#f2a25f', side: THREE.DoubleSide }), ring, 0, 0, 0);
  const seats = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, x = Math.cos(a) * 2.4, z = Math.sin(a) * 2.4;
    const s = mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), mat(COLORS[i]), ring, x, 0.2, z); s.rotation.y = Math.PI / 2 - a;
    seats.push(seatAt(ring, Math.cos(a) * 2.7, -0.15, Math.sin(a) * 2.7, Math.PI / 2 - a));
  }
  mesh(new THREE.CylinderGeometry(4, 4, 0.3, 24), mat('#c9c3b8'), g, 0, 0.15, 0);
  let phase = 0;
  const heightAt = (p) => {
    if (p < 12) return 1.2 + (p / 12) * 30.5;   // slowly up...
    if (p < 15) return 31.7;                       // wait at the top...
    if (p < 16.3) { const k = (p - 15) / 1.3; return 31.7 - 30.2 * k * k; } // DROP!
    if (p < 17) return 1.5 + Math.sin((p - 16.3) / 0.7 * Math.PI) * 1.2;
    return 1.2;
  };
  return {
    name: 'Drop Tower', group: g, clickables: [g.children[0], g.children.at(-1)], label: 'ride the drop tower! 😱', colliders: [[cx, cz, 4]],
    update(dt) { phase = (phase + dt) % 21; ring.position.y = heightAt(phase); },
    board() { phase = 0; let t = 0; return { anchor: seats[0], canLeave: false, tick: (dt) => { t += dt; }, done: () => t > 18.5, exit: V(cx, 0, cz + 6), drop: () => phase > 15 && phase < 16.3 }; },
  };
}

// ======================= pirate ship =======================
function pirateShip(cx, cz) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz);
  const wood = mat('#8a5a3a'), dark = mat('#5a3d2b');
  for (const z of [-2, 2]) for (const x of [-4, 4]) beam(g, V(x, 0, z * 1.4), V(0, 12, z), 0.25, mat('#5a5a62'));
  beam(g, V(0, 12, -2.2), V(0, 12, 2.2), 0.3, mat('#5a5a62'));
  const swing = new THREE.Group(); swing.position.y = 12; g.add(swing);
  for (const z of [-1.5, 1.5]) beam(swing, V(0, 0, z), V(0, -8, z), 0.12, mat('#5a5a62'));
  const ship = new THREE.Group(); ship.position.y = -9; swing.add(ship);
  mesh(new THREE.BoxGeometry(10, 1.6, 3), wood, ship, 0, 0, 0);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(2, 1.2, 2.6), wood, ship, s * 5.6, 0.6, 0).rotation.z = s * 0.4;
  mesh(new THREE.BoxGeometry(10, 0.15, 2.8), dark, ship, 0, 0.8, 0);
  beam(ship, V(0, 0.8, 0), V(0, 7, 0), 0.12, dark);
  const sail = mesh(new THREE.PlaneGeometry(3.4, 3), new THREE.MeshStandardMaterial({ color: '#fbfaf7', side: THREE.DoubleSide }), ship, 0, 4.6, 0);
  mesh(new THREE.BoxGeometry(1, 0.6, 0.02), mat('#2a2727'), ship, 0, 6.6, 0.02);
  const seats = [];
  for (let i = -3; i <= 3; i++) { mesh(new THREE.BoxGeometry(0.3, 0.5, 2.4), dark, ship, i * 1.3, 1.0, 0); seats.push(seatAt(ship, i * 1.3 + 0.35, 1.25, 0, Math.PI / 2)); }
  let t0 = 0, amp = 0.5, riding = false;
  return {
    name: 'Pirate Ship', group: g, clickables: [ship.children[0], ship.children[1], ship.children[2], sail], label: 'ride the pirate ship! 🏴‍☠️', colliders: [[cx - 4, cz - 2.8, 0.5], [cx + 4, cz - 2.8, 0.5], [cx - 4, cz + 2.8, 0.5], [cx + 4, cz + 2.8, 0.5]],
    update(dt) { t0 += dt; amp += ((riding ? 1.05 : 0.55) - amp) * dt * 0.15; swing.rotation.z = Math.sin(t0 * 1.0) * amp; },
    board() { riding = true; let t = 0; return { anchor: seats[1], canLeave: true, tick: (dt) => { t += dt; }, done: () => t > 25, exit: V(cx, 0, cz + 6), end: () => { riding = false; } }; },
  };
}

// ======================= bumper cars (you drive!) =======================
function bumperCars(cx, cz) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz);
  const W = 18, D = 12;
  mesh(new THREE.BoxGeometry(W, 0.2, D), mat('#5a5a62', { roughness: 0.3, metalness: 0.2 }), g, 0, 0.1, 0);
  const rail = mat('#f7da7e');
  for (const s of [-1, 1]) { mesh(new THREE.BoxGeometry(W, 0.5, 0.3), rail, g, 0, 0.45, s * D / 2); mesh(new THREE.BoxGeometry(0.3, 0.5, D), rail, g, s * W / 2, 0.45, 0); }
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) beam(g, V(x, 0, z), V(x, 4, z), 0.15, mat('#ef84ad'));
  const roof = mesh(new THREE.BoxGeometry(W + 0.6, 0.2, D + 0.6), new THREE.MeshStandardMaterial({ color: '#93c9ea', transparent: true, opacity: 0.6 }), g, 0, 4, 0);
  const cars = [];
  for (let i = 0; i < 7; i++) {
    const car = new THREE.Group(); g.add(car);
    const cm = mat(COLORS[i % 8], { roughness: 0.3 });
    mesh(new THREE.BoxGeometry(1.3, 0.4, 1.7), cm, car, 0, 0.45, 0);
    mesh(new THREE.TorusGeometry(0.85, 0.12, 6, 20), mat('#2a2727'), car, 0, 0.4, 0).scale.set(0.85, 1.05, 1);
    car.children.at(-1).rotation.x = Math.PI / 2;
    mesh(new THREE.BoxGeometry(1.0, 0.5, 0.15), mat('#2a2727'), car, 0, 0.75, -0.55);
    beam(car, V(0, 0.7, -0.75), V(0, 3.9, -0.75), 0.03, mat('#c9ccd1'));
    car.position.set(rand(-W / 2 + 2, W / 2 - 2), 0.2, rand(-D / 2 + 2, D / 2 - 2));
    car.rotation.y = rand(0, 6);
    cars.push({ car, v: 2, seat: seatAt(car, 0, 0.75, -0.25), turn: rand(-1, 1) });
  }
  let mine = null, controls = null;
  return {
    name: 'Bumper Cars', group: g, clickables: [g.children[0], ...cars.map((c) => c.car.children[0])], label: 'drive a bumper car! 🚗', colliders: [],
    fence: [cx - W / 2, cz - D / 2, cx + W / 2, cz + D / 2],
    update(dt, t, bump) {
      for (const c of cars) {
        if (c === mine && controls) {
          const k = controls();
          c.v += (k.f * 4 - c.v) * Math.min(1, dt * 2);
          c.car.rotation.y -= k.s * dt * 2.2 * (c.v >= 0 ? 1 : -1);
        } else {
          c.turn += rand(-1, 1) * dt; c.turn = Math.max(-1, Math.min(1, c.turn));
          c.car.rotation.y += c.turn * dt; c.v += (2.6 - c.v) * dt;
        }
        const h = c.car.rotation.y;
        c.car.position.x += Math.sin(h) * c.v * dt; c.car.position.z += Math.cos(h) * c.v * dt;
        // bounce off the walls
        const lx = W / 2 - 1, lz = D / 2 - 1;
        if (Math.abs(c.car.position.x) > lx) { c.car.position.x = Math.sign(c.car.position.x) * lx; c.car.rotation.y = -h; c.v *= 0.6; if (c === mine) bump?.(); }
        if (Math.abs(c.car.position.z) > lz) { c.car.position.z = Math.sign(c.car.position.z) * lz; c.car.rotation.y = Math.PI - h; c.v *= 0.6; if (c === mine) bump?.(); }
      }
      // bump into each other
      for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i].car.position, b = cars[j].car.position, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (d < 1.7 && d > 0.01) {
          const push = (1.7 - d) / 2, nx = dx / d, nz = dz / d;
          a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
          cars[i].v *= -0.4; cars[j].v *= -0.4;
          if (cars[i] === mine || cars[j] === mine) bump?.();
        }
      }
    },
    board(player, ctrl) {
      mine = cars[0]; controls = ctrl;
      return { anchor: mine.seat, canLeave: true, follow: true, done: () => false, exit: V(cx, 0, cz + D / 2 + 1.5), end: () => { mine = null; controls = null; } };
    },
  };
}

// ======================= the whole park =======================
export function buildFunPark(W, P) {
  const group = new THREE.Group();
  const statics = new THREE.Group(); group.add(statics);
  const flat = (w, d, x, z, y, m, list = W.surfaces) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), m); b.position.set(x, y - 0.02, z); b.receiveShadow = true; statics.add(b); if (list) list.push(b); return b; };
  // the road from Kenwood Ave, with a bridge over the creek
  const asphalt = std('#6f6f74'), yellow = std('#f2cf63');
  const [r0, r1] = P.road;
  flat(6, r1 - r0, P.roadX, (r0 + r1) / 2, 0.035, asphalt, null);
  for (let z = r0 + 2; z < r1 - 1; z += 4) flat(0.15, 2, P.roadX, z, 0.045, yellow, null);
  const br = P.bridgeZ, wood = std('#8a6a3a');
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 10), wood); rail.position.set(P.roadX + s * 3.2, 0.45, br); statics.add(rail);
  }
  makeSign(statics, { text: 'Fun Park Dr', x: P.roadX + 4, y: 2.0, z: r0 + 4, rot: -90, w: 1.8, h: 0.38, bg: '#3f7a52', posts: true });
  makeSign(statics, { text: 'Fun Park this way!', x: P.roadX - 4, y: 1.6, z: r0 + 6, rot: 90, w: 2.6, h: 0.5, bg: '#ef84ad', posts: true });
  // parking lot, gate and paths
  const [lx0, lz0, lx1, lz1] = P.lot;
  flat(lx1 - lx0, lz1 - lz0, (lx0 + lx1) / 2, (lz0 + lz1) / 2, 0.0, std('#77797f'));
  const path = std('#e6d9c3');
  for (const [x0, z0, x1, z1] of P.paths) flat(x1 - x0, z1 - z0, (x0 + x1) / 2, (z0 + z1) / 2, 0.01, path);
  const [gx, gz] = P.gate;
  for (const s of [-1, 1]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 8, 12), std('#ef84ad')); tower.position.set(gx + s * 5, 4, gz); tower.castShadow = true; statics.add(tower);
    const capM = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2, 12), std('#f7da7e')); capM.position.set(gx + s * 5, 9, gz); statics.add(capM);
  }
  makeSign(statics, { text: 'PepCity Fun Park', x: gx, y: 7.2, z: gz - 0.1, rot: 180, w: 9, h: 1.4, bg: '#ef84ad' });
  makeSign(statics, { text: 'PepCity Fun Park', x: gx, y: 7.2, z: gz + 0.1, rot: 0, w: 9, h: 1.4, bg: '#ef84ad' });
  const colliders = [[gx - 5, gz, 1.1], [gx + 5, gz, 1.1]];
  // string lights along the main path
  const bulb = std('#fff2a8', { emissive: '#ffd84d', emissiveIntensity: 0.9 });
  for (let z = gz + 4; z < 172; z += 6) for (const s of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), std('#34503f')); pole.position.set(gx + s * 3.5, 2, z); statics.add(pole);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bulb); b.position.set(gx + s * 3.5, 4.1, z); statics.add(b);
  }

  // the rides
  const rides = [
    coaster({ name: 'Thunder Loop', points: P.coasters.thunder, track: '#d9443a', support: '#f7da7e', cars: 4, carColor: '#2e6fb5', station: { side: -1 } }),
    coaster({ name: 'Dragon Coaster', points: P.coasters.dragon, track: '#4f8a46', support: '#c8963c', cars: 3, carColor: '#5fb3a8', maxSpeed: 14, station: { side: 1 } }),
    coaster({ name: 'Caterpillar Coaster', points: P.coasters.kiddie, track: '#f2cf63', support: '#4f8a46', cars: 4, carColor: '#7cc46a', liftSpeed: 3, maxSpeed: 7, station: { side: -1 } }),
    ferrisWheel(...P.ferris), carousel(...P.carousel), swingRide(...P.swings), teacups(...P.teacups), dropTower(...P.drop), pirateShip(...P.pirate), bumperCars(...P.bumper),
  ];
  const clickables = [];
  for (const r of rides) {
    group.add(r.group);
    for (const c of r.clickables) { c.userData.ride = r; clickables.push(c); }
    if (r.colliders) colliders.push(...r.colliders);
  }
  mergeStatic(statics);
  const fences = rides.filter((r) => r.fence).map((r) => r.fence);

  return {
    group, rides, clickables,
    blocked(x, z, r = 0.3) {
      for (const [cx, cz, cr] of colliders) if ((x - cx) ** 2 + (z - cz) ** 2 < (r + cr) ** 2) return true;
      for (const [a, b, c, d] of fences) { // the bumper car arena's wall (step in through the gap on the south side)
        const inside = x > a && x < c && z > b && z < d, near = x > a - r - 0.3 && x < c + r + 0.3 && z > b - r - 0.3 && z < d + r + 0.3;
        if (near && !inside && !(z > d - 0.5 && Math.abs(x - (a + c) / 2) < 1.2)) return true;
      }
      return false;
    },
    update(dt, t, cam, bump) {
      const near = Math.hypot(cam.x - 45, cam.z - 145) < 260;
      group.visible = near;
      if (!near) return;
      for (const r of rides) r.update(dt, t, bump);
    },
  };
}
