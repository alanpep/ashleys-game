// Builds the whole neighborhood: every building, the street, the park, stars and little critters.
import * as THREE from 'three';
import { buildHouse, makeTree, makeBush, makeSign, std } from './buildHouse.js';
import { HOUSE } from './house.js';
import { BUILDINGS, AREAS, ZONES, STARS, WORLD_BOUNDS, LOOP, ROAD_WIDTH, POOLS } from './neighborhood.js';
import { makeLoop } from './roads.js';
import { buildForest } from './forest.js';
import { WOODS, FARM, BEACH } from './neighborhood.js';
import { buildPlaces } from './places.js';
import { buildFunPark } from './funpark.js';
import { FUNPARK, AIRPORT, FOREST_BOUNDS } from './neighborhood.js';
import { buildAirport } from './airport.js';
import { tex } from './textures.js';
import { P } from './palette.js';
import { mergeStatic, remap } from './merge.js';

export function buildWorld() {
  const group = new THREE.Group();
  const W = { group, walls: [], floors: [], surfaces: [], solids: [], colliders: [], circles: [], rooms: [], fans: [], lightSpots: [], doors: [], glass: [] };
  const buildings = [{ ...HOUSE, id: 'home' }, ...BUILDINGS];

  for (const b of buildings) {
    const h = buildHouse(b);
    group.add(h.group);
    for (const k of ['walls', 'floors', 'surfaces', 'solids', 'colliders', 'rooms', 'fans', 'lightSpots', 'doors', 'glass']) W[k].push(...h[k]);
  }
  W.doorParts = W.doors.flatMap((d) => d.parts);
  W.fanParts = [];
  W.fans.forEach((f, i) => { f.userData.id = 'fan:' + i; f.userData.speed = 3; f.parent.traverse((o) => { if (o.isMesh) W.fanParts.push(o); }); });

  const flat = (w, d, x, z, y, mat, list = W.surfaces) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat);
    m.position.set(x, y - 0.02, z);
    m.receiveShadow = true;
    group.add(m);
    if (list) list.push(m);
    return m;
  };

  // ---------- ground + distant hills ----------
  const GROUND = 900; // big enough to reach past every forest edge
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND, GROUND), new THREE.MeshStandardMaterial({ color: P.grass, map: tex.grass(), roughness: 1 }));
  const gu = ground.geometry.attributes.uv;
  for (let i = 0; i < gu.count; i++) gu.setXY(i, gu.getX(i) * GROUND, gu.getY(i) * GROUND);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(8, -0.02, -12);
  ground.userData = { isGround: true, keep: true };
  ground.receiveShadow = true;
  group.add(ground);
  W.ground = ground;

  const hillMat = [std('#86b96b'), std('#7aae62'), std('#93c278')];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2, r = 205 + (i % 3) * 15;
    if (Math.cos(a) > 0.35) continue; // no hills out east: that's the Great Lake
    if (Math.sin(a) < -0.5) continue; // or down south by the airport
    if (Math.sin(a) > 0.35) continue; // or up north, behind the Fun Park
    const hill = new THREE.Mesh(new THREE.SphereGeometry(30 + (i % 4) * 8, 20, 12), hillMat[i % 3]);
    hill.position.set(8 + Math.cos(a) * r, -12, -12 + Math.sin(a) * r);
    hill.scale.y = 0.55;
    group.add(hill);
  }

  // ---------- the road loop (Kenwood Ave is the front part) ----------
  const asphalt = std('#6f6f74'), side = std('#d4cec4'), curb = std('#bdb6aa'), paint = std('#f7f1e6'), yellow = std('#f2cf63');
  const loop = makeLoop(LOOP);
  W.loop = loop;
  // a flat strip that follows the loop, between two distances from the middle of the road
  function ribbon(a, b, y, mat) {
    const P = loop.pts, n = P.length, pos = [], idx = [];
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[(i + 1) % n];
      let tx = p1[0] - p0[0], tz = p1[1] - p0[1];
      const l = Math.hypot(tx, tz); tx /= l; tz /= l;
      const rx = -tz, rz = tx;
      pos.push(P[i][0] + rx * a, y, P[i][1] + rz * a, P[i][0] + rx * b, y, P[i][1] + rz * b);
      const j = (i + 1) % n;
      idx.push(2 * i, 2 * j, 2 * i + 1, 2 * i + 1, 2 * j, 2 * j + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    if (geo.attributes.normal.getY(0) < 0) { // make sure it faces up
      for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]];
      geo.setIndex(idx); geo.computeVertexNormals();
    }
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    group.add(m);
    return m;
  }
  const HW = ROAD_WIDTH / 2;
  ribbon(-HW, HW, 0.006, asphalt);
  ribbon(HW - 0.2, HW - 0.08, 0.013, paint);    // white edge lines
  ribbon(-HW + 0.08, -HW + 0.2, 0.013, paint);
  for (let s = 1; s < loop.L - 2; s += 4) {      // dashed yellow middle line
    const p = loop.at(s + 1);
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 2), yellow);
    dash.position.set(p.x, 0.007, p.z);
    dash.rotation.y = Math.atan2(p.tx, p.tz);
    dash.receiveShadow = true;
    group.add(dash);
  }
  // sidewalks and curbs along Kenwood Ave
  const XA = LOOP.x0 + LOOP.R, XB = LOOP.x1 - LOOP.R, XC = (XA + XB) / 2, XL = XB - XA;
  flat(XL, 1.5, XC, -8.25, 0.06, side);           // sidewalk (home side)
  flat(XL, 1.5, XC, -15.75, 0.06, side);          // sidewalk (shop side)
  flat(XL, 0.15, XC, -9.08, 0.1, curb, null);
  flat(XL, 0.15, XC, -14.92, 0.1, curb, null);
  // street signs at the corners
  for (const [text, x, z, rot] of [['Kenwood Ave', XB - 2, -16.8, 0], ['Maple Dr', LOOP.x1 - 4.4, -22, 90], ['Willow Way', XB - 6, LOOP.z0 + 4.4, 180],
    ['Birch Ln', LOOP.x0 + 4.4, -30, -90], ['Lessenger Ln', -23.2, -64, 90]]) {
    makeSign(group, { text, x, y: 2.0, z, rot, w: 1.7, h: 0.38, bg: '#3f7a52', posts: true });
  }

  // ---------- school parking lot + Lessenger Lane down to Willow Way ----------
  const lotMat = std('#77797f');
  flat(14, 16, -27, -42, 0.0, lotMat);                        // the lot
  const laneEnd = LOOP.z0 + HW - 0.5;                        // tucks just under the loop road
  flat(6, -50 - laneEnd, -27, (-50 + laneEnd) / 2, 0.0, lotMat); // Lessenger Lane
  for (let i = 0; i < 6; i++) flat(4.2, 0.1, -31.9, -48 + i * 2.8, 0.008, paint, null); // parking spaces
  for (let z = -51; z > LOOP.z0 + 4; z -= 4) flat(0.15, 2, -27, z, 0.008, yellow, null);
  for (const cx of [15, 37.5]) for (let i = 0; i < 7; i++) flat(0.5, 2.6, cx - 1.8 + i * 0.6, -12, 0.024, paint, null); // crosswalks
  flat(3.4, 7.5, 19.2, -3.8, 0.03, std('#c9c3b8'));  // home driveway (up to the garage)
  flat(3.2, 1.6, 19, -8.25, 0.075, std('#c9c3b8'), null);

  // ---------- park: paths and the duck pond ----------
  const path = std('#e3d6bf');
  flat(2, 22, 37.5, -27, 0.025, path);               // main path from the street
  flat(10.5, 2, 33.25, -30, 0.035, path);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(6.2, 40), std('#e9d9b0'));
  sand.rotation.x = -Math.PI / 2; sand.position.set(44.5, 0.008, -32); sand.receiveShadow = true;
  group.add(sand);
  const water = new THREE.Mesh(new THREE.CircleGeometry(5.4, 40), new THREE.MeshStandardMaterial({ color: '#8fcbe6', map: tex.water(), roughness: 0.15, metalness: 0.1 }));
  water.rotation.x = -Math.PI / 2; water.position.set(44.5, 0.02, -32);
  water.userData = { isWater: true, keep: true };
  group.add(water);
  W.surfaces.push(water);
  W.circles.push({ x: 44.5, z: -32, r: 5.2 });
  W.water = water;
  for (let i = 0; i < 6; i++) { // lily pads
    const a = i * 1.3, pad = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12, 0.3, Math.PI * 1.8), std('#5a9a4e'));
    pad.rotation.x = -Math.PI / 2; pad.position.set(44.5 + Math.cos(a) * 3.6, 0.03, -32 + Math.sin(a) * 3.2);
    group.add(pad);
  }
  makeSign(group, { text: 'Sunny Park', x: 39.6, y: 1.1, z: -17.6, w: 2.4, h: 0.55, bg: P.leaf, posts: true });

  // ---------- swimming pool ----------
  W.pools = [];
  for (const [x0, z0, x1, z1] of POOLS) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, B2 = 3;
    const deck = std('#f1e9da'), coping = std('#fbfaf7');
    flat(w + 2 * B2, B2, cx, z0 - B2 / 2, 0.03, deck);       // deck all around
    flat(w + 2 * B2, B2, cx, z1 + B2 / 2, 0.03, deck);
    flat(B2, d, x0 - B2 / 2, cz, 0.03, deck);
    flat(B2, d, x1 + B2 / 2, cz, 0.03, deck);
    for (const [ww, dd, xx, zz] of [[w + 0.6, 0.3, cx, z0 - 0.15], [w + 0.6, 0.3, cx, z1 + 0.15], [0.3, d, x0 - 0.15, cz], [0.3, d, x1 + 0.15, cz]]) flat(ww, dd, xx, zz, 0.05, coping, null);
    const tile = tex.tile();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: '#6cc4ea', map: tile, roughness: 0.5 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(cx, -0.012, cz); floor.receiveShadow = true; floor.userData.keep = true;
    group.add(floor);
    const pw = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: '#8fd8f5', map: tex.water(), roughness: 0.1, transparent: true, opacity: 0.6 }));
    pw.rotation.x = -Math.PI / 2; pw.position.set(cx, 0.035, cz);
    pw.userData = { isWater: true, keep: true };
    group.add(pw);
    W.surfaces.push(pw);
    W.pools.push({ x0, z0, x1, z1, water: pw });
    makeSign(group, { text: 'Kenwood Pool', x: cx, y: 1.2, z: z1 + B2 + 0.6, rot: 0, w: 2.8, h: 0.55, bg: '#2e9fd0', posts: true });
  }

  // ---------- trees & bushes around the neighborhood ----------
  // never put a tree inside a building, a parking lot or the pool deck
  const keepClear = [];
  for (const b of buildings) {
    const xs = b.rooms.flatMap((r) => [r.x, r.x + r.w]), zs = b.rooms.flatMap((r) => [r.z, r.z + r.d]);
    keepClear.push([Math.min(...xs) - 3, Math.min(...zs) - 3, Math.max(...xs) + 3, Math.max(...zs) + 3]);
    for (const p of b.patios ?? []) keepClear.push([p.x - 1, p.z - 1, p.x + p.w + 1, p.z + p.d + 1]);
  }
  for (const p of W.pools) keepClear.push([p.x0 - 5, p.z0 - 5, p.x1 + 5, p.z1 + 5]);
  const clearOf = (x, z) => !keepClear.some(([a, b2, c, d]) => x > a && x < c && z > b2 && z < d);
  const trees = [
    [24, -19.5, 'round', 1.1], [51, -19.5, 'round', 1.2], [25, -44], [33, -45, 'pine'], [42, -44, 'round', 1.2], [51, -43, 'pine'],
    [50, -28, 'autumn', 1.1], [26.5, -32, 'round', 0.9], [44, -23.5, 'autumn', 0.8],
    [-22.5, -22], [-38, -30, 'pine'], [6, -31], [16, -31, 'pine'], [21, -27, 'autumn'],
    [-22, 3, 'pine'], [-4.5, -2.5, 'round', 0.8], [22.5, 10, 'pine', 0.9], [41, 4], [42.5, 12, 'autumn'],
    [52, 6, 'round', 1.2], [56, -4], [48, 18, 'pine'], [62, 15, 'round', 1.1], [54, 27, 'pine'],
    [-20, 18], [-8, 22, 'pine'], [10, 23], [26, 20, 'autumn'], [38, 24, 'round', 1.1],
  ];
  // Kenwood Woods: the big forest all around town (but not on the farm or the beach)
  for (const r of WOODS.clearRects) keepClear.push(r);
  const forest = buildForest(W, WOODS, { loop, keepClear, bounds: FOREST_BOUNDS });
  // the farm and the beach
  const places = buildPlaces(W, { FARM, BEACH, loop });
  group.add(places.group);
  W.places = places;
  // PepCity Fun Park
  const funpark = buildFunPark(W, FUNPARK);
  group.add(funpark.group);
  W.funpark = funpark;
  // PepCity Airport
  const airport = buildAirport(W, AIRPORT);
  group.add(airport.group);
  W.airport = airport;
  group.add(forest.group);
  W.forest = forest;
  // a few scattered trees inside the road loop (never on a road or the parking lot)
  const KINDS = ['round', 'pine', 'round', 'autumn'];
  const LR = WOODS.loopRect;
  for (let i = 0; i < 140; i++) {
    const x = LR.x0 + 4 + (((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1) * (LR.x1 - LR.x0 - 8);
    const z = LR.z0 + 4 + (((Math.sin(i * 78.233) * 12345.678) % 1 + 1) % 1) * (LR.z1 - LR.z0 - 8);
    const inOldTown = x > -48 && x < 64 && z > -52 && z < 28;
    const onLot = x > -36 && x < -18 && z > -71 && z < -32;
    if (inOldTown || onLot || loop.dist(x, z) < 6) continue;
    trees.push([x, z, KINDS[i % 4], 0.9 + (i % 5) * 0.1]);
  }
  for (const [x, z, type, size] of trees) {
    if (loop.dist(x, z) < 4.5) continue; // keep the road clear
    if (!clearOf(x, z) && !(x > -48 && x < 64 && z > -52 && z < 28 && z > -47)) continue; // (old-town trees were placed by hand)
    makeTree(group, W.colliders, x, z, type, size);
  }
  for (const [x, z, s, f] of [[27, -19.2, 1, P.butter], [48, -19.2, 1, P.bubblegum], [55, 18, 1.2, P.lavender], [62, 26, 1, P.bubblegum], [57, 28, 1.1, P.butter]]) makeBush(group, x, z, s, f);

  // ---------- golden stars ----------
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.11 : 0.26;
    i === 0 ? starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  starGeo.center();
  const starMat = new THREE.MeshStandardMaterial({ color: '#ffd34d', emissive: '#ffb703', emissiveIntensity: 0.7, metalness: 0.5, roughness: 0.3 });
  const stars = STARS.map(([x, y, z], i) => {
    const m = new THREE.Mesh(starGeo, starMat);
    m.position.set(x, y, z);
    m.userData = { id: i, baseY: y, keep: true };
    m.castShadow = true;
    group.add(m);
    return m;
  });

  // ---------- butterflies ----------
  const flyers = [];
  const wingGeo = new THREE.CircleGeometry(0.09, 10);
  const spots = [[32, -24], [40, -28], [46, -38], [8, 11], [3, -4], [30, -3], [-12, -4], [58, 22], [36, -40], [14, -6],
    [-5, 60], [-2, 64], [-9, 58], [45, 40], [12, 33], [25, 45], [-50, 40], [66, 52], [-28, 42], [0, 70]];
  spots.forEach(([x, z], i) => {
    const g = new THREE.Group();
    const col = [P.bubblegum, P.butter, P.sky, P.lavender, P.coral][i % 5];
    const wm = new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, roughness: 0.5, emissive: col, emissiveIntensity: 0.2 });
    const wings = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      const w = new THREE.Mesh(wingGeo, wm);
      w.position.x = s * 0.08; w.scale.set(1, 1.3, 1);
      w.rotation.x = -Math.PI / 2;
      pivot.add(w);
      g.add(pivot);
      wings.push(pivot);
    }
    group.add(g);
    flyers.push({ g, wings, x, z, ph: i * 1.7 });
  });

  // ---------- combine static pieces (much faster to draw) ----------
  for (const s of W.surfaces) if (s.parent === group) s.userData.tag = 'surface';
  const replaced = mergeStatic(group);
  W.surfaces = remap(W.surfaces, replaced);

  // ---------- update every frame ----------
  function update(dt, t) {
    for (const s of stars) {
      if (!s.visible) continue;
      s.rotation.y = t * 1.6 + s.userData.id;
      s.position.y = s.userData.baseY + Math.sin(t * 2 + s.userData.id) * 0.08;
    }
    for (const f of flyers) {
      const k = t * 0.35 + f.ph;
      f.g.position.set(f.x + Math.sin(k) * 2.5 + Math.sin(k * 2.3) * 0.6, 0.8 + Math.sin(k * 1.7) * 0.35, f.z + Math.cos(k * 0.8) * 2.2);
      f.g.rotation.y = Math.atan2(Math.cos(k) * 2.5, -Math.sin(k * 0.8) * 1.8);
      const flap = Math.sin(t * 18 + f.ph) * 0.9;
      f.wings[0].rotation.z = flap; f.wings[1].rotation.z = -flap;
    }
    if (W.water.material.map) W.water.material.map.offset.set(Math.sin(t * 0.1) * 0.2, t * 0.01);
    for (const p of W.pools) p.water.material.map.offset.set(t * 0.02, Math.sin(t * 0.2) * 0.1);
  }

  return { ...W, buildings, areas: AREAS, zones: ZONES, stars, bounds: WORLD_BOUNDS, update };
}
