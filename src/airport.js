// PepCity Airport (south of town, down Airport Rd): a runway, an apron for the planes,
// a control tower, a hangar and a windsock. The terminal itself is a normal building.
import * as THREE from 'three';
import { std, makeSign } from './buildHouse.js';
import { createItem } from './items.js';

export function buildAirport(W, A) {
  const group = new THREE.Group();
  const flat = (w, d, x, z, y, m, list = W.surfaces) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), m); b.position.set(x, y - 0.02, z); b.receiveShadow = true; group.add(b); if (list) list.push(b); return b; };
  const rect = ([x0, z0, x1, z1], y, m) => flat(x1 - x0, z1 - z0, (x0 + x1) / 2, (z0 + z1) / 2, y, m);
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); b.castShadow = b.receiveShadow = true; group.add(b); return b; };
  const rects = [], circles = [];
  const asphalt = std('#6f6f74'), yellow = std('#f2cf63'), white = std('#fbfaf7');

  // Airport Rd from the loop
  const [r0, r1] = A.road;
  flat(6, r0 - r1, A.roadX, (r0 + r1) / 2, 0.035, asphalt, null);
  for (let z = r0 - 2; z > r1 + 1; z -= 4) flat(0.15, 2, A.roadX, z, 0.045, yellow, null);
  makeSign(group, { text: 'Airport Rd', x: A.roadX + 4, y: 2.0, z: r0 - 4, rot: 90, w: 1.8, h: 0.38, bg: '#3f7a52', posts: true });
  makeSign(group, { text: 'Airport this way! ✈', x: A.roadX - 4, y: 1.6, z: r0 - 6, rot: -90, w: 2.8, h: 0.5, bg: '#4f86c6', posts: true });
  // parking lot, apron and runway
  rect(A.lot, 0.03, std('#77797f'));
  rect(A.apron, 0.02, std('#b9b6ae'));
  rect(A.runway, 0.03, std('#4f4f56'));
  const [x0, z0, x1, z1] = A.runway, cz = (z0 + z1) / 2, half = (z1 - z0) / 2;
  for (let x = x0 + 18; x < x1 - 18; x += 9) flat(4.5, 0.4, x, cz, 0.04, white, null); // center line
  for (const s of [-1, 1]) flat(x1 - x0 - 2, 0.3, (x0 + x1) / 2, cz + s * (half - 0.8), 0.04, white, null); // side lines
  for (const end of [x0 + 5, x1 - 5]) for (let i = -3; i <= 3; i++) if (i) flat(4.5, 0.9, end, cz + i * 2.1, 0.04, white, null); // piano keys
  // taxi line from the apron
  for (let z = A.apron[1] - 0.5; z > z1 + 0.5; z -= 1.6) flat(0.25, 0.8, A.taxiX, z, 0.04, yellow, null);
  // runway lights (one instanced mesh)
  const lights = [];
  for (let x = x0 + 2; x <= x1 - 2; x += 8) for (const s of [-1, 1]) lights.push([x, cz + s * (half + 0.6)]);
  const lim = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff3b0', emissive: '#ffd84a', emissiveIntensity: 1.4 }), lights.length);
  const dummy = new THREE.Object3D();
  lights.forEach(([x, z], i) => { dummy.position.set(x, 0.15, z); dummy.updateMatrix(); lim.setMatrixAt(i, dummy.matrix); });
  lim.computeBoundingSphere(); group.add(lim);
  makeSign(group, { text: 'PepCity Airport', x: A.roadX + 5, y: 1.8, z: A.lot[1] + 1.5, rot: 90, w: 3.6, h: 0.6, bg: '#4f86c6', posts: true });

  // control tower
  const [tx, tz] = A.tower;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.7, 14, 20), std('#e9e4da')); shaft.position.set(tx, 7, tz); shaft.castShadow = true; group.add(shaft);
  const cabFloor = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 2.2, 0.8, 24), std('#d9d4cc')); cabFloor.position.set(tx, 14.2, tz); group.add(cabFloor);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 2.8, 2.4, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#7fb6d9', roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
  cab.position.set(tx, 15.8, tz); group.add(cab);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 3.4, 0.7, 24), std('#4f86c6')); roof.position.set(tx, 17.35, tz); group.add(roof);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), std('#d9d4cc')); mast.position.set(tx, 18.8, tz); group.add(mast);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshStandardMaterial({ color: '#ff6a5a', emissive: '#ff3a2a', emissiveIntensity: 1.5 })); beacon.position.set(tx, 20, tz); group.add(beacon);
  // the dish on the tower spins
  const radar = new THREE.Group(); radar.position.set(tx + 1.2, 18, tz); group.add(radar);
  const dish = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), std('#fbfaf7')); dish.position.y = 0.4; radar.add(dish);
  circles.push([tx, tz, 1.9]);

  // hangar: walls on three sides, open toward the apron (+x), with a round roof
  const [hx0, hz0, hx1, hz1] = A.hangar, hw = hz1 - hz0, hd = hx1 - hx0, H = 5.5, wall = std('#c9ccd2');
  box(0.3, H, hw, hx0, 0, (hz0 + hz1) / 2, wall);
  box(hd, H, 0.3, (hx0 + hx1) / 2, 0, hz0, wall);
  box(hd, H, 0.3, (hx0 + hx1) / 2, 0, hz1, wall);
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(hw / 2, hw / 2, hd, 28, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#9aa3ad', side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3 }));
  arch.rotation.z = Math.PI / 2; arch.rotation.y = 0; arch.position.set((hx0 + hx1) / 2, H, (hz0 + hz1) / 2); arch.scale.set(0.5, 1, 1);
  arch.castShadow = true; group.add(arch);
  // close the round end at the back
  const backCap = new THREE.Mesh(new THREE.CircleGeometry(hw / 2, 28, 0, Math.PI), std('#c9ccd2')); backCap.material.side = THREE.DoubleSide;
  backCap.rotation.y = Math.PI / 2; backCap.position.set(hx0 + 0.02, H, (hz0 + hz1) / 2); backCap.scale.set(1, 0.5, 1); group.add(backCap);
  makeSign(group, { text: 'Hangar 1', x: hx1 + 0.05, y: H - 0.5, z: hz1 - 2.4, rot: 90, w: 2.2, h: 0.5, bg: '#d9443a' });
  rects.push([hx0 - 0.2, hz0 - 0.2, hx0 + 0.2, hz1 + 0.2], [hx0, hz0 - 0.2, hx1, hz0 + 0.2], [hx0, hz1 - 0.2, hx1, hz1 + 0.2]);

  // windsock
  const [sx, sz] = A.sock;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 6, 8), std('#d9d4cc')); pole.position.set(sx, 3, sz); group.add(pole);
  const sock = new THREE.Group(); sock.position.set(sx, 5.8, sz); group.add(sock);
  for (let i = 0; i < 5; i++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.42 - i * 0.05, 0.37 - i * 0.05, 0.55, 12, 1, true), std(i % 2 ? '#fbfaf7' : '#f2803a')); seg.material.side = THREE.DoubleSide; seg.rotation.z = Math.PI / 2; seg.position.x = 0.3 + i * 0.55; sock.add(seg); }
  circles.push([sx, sz, 0.3]);

  // a jet flying around high above town
  const flyer = createItem('jet', '#fbfaf7');
  flyer.traverse((o) => { o.castShadow = false; });
  group.add(flyer);

  return {
    group,
    blocked(x, z, r = 0.3) {
      for (const [cx, cz2, cr] of circles) if ((x - cx) ** 2 + (z - cz2) ** 2 < (r + cr) ** 2) return true;
      for (const [a, b, c, d] of rects) if (x > a - r && x < c + r && z > b - r && z < d + r) return true;
      return false;
    },
    update(dt, t, cam) {
      radar.rotation.y = t * 1.5;
      beacon.visible = Math.sin(t * 4) > 0;
      sock.rotation.y = 0.4 + Math.sin(t * 0.3) * 0.5;
      sock.rotation.z = -0.15 + Math.sin(t * 2.1) * 0.05;
      const a = t * 0.05;
      flyer.position.set(10 + Math.cos(a) * 260, 70 + Math.sin(t * 0.2) * 4, -40 + Math.sin(a) * 200);
      flyer.rotation.set(0, Math.atan2(-Math.sin(a) * 260, Math.cos(a) * 200), -0.25, 'YXZ');
      flyer.visible = (flyer.position.x - cam.x) ** 2 + (flyer.position.z - cam.z) ** 2 < 400 * 400;
    },
  };
}
