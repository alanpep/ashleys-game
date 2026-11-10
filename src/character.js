// The player's character: options, a 3D model made of soft rounded shapes, and animation.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { P } from './palette.js';
import { mergeStatic } from './merge.js';

// [value, label] for choices; plain arrays are color swatches
export const OPTIONS = {
  age: [['kid', 'Kid'], ['grownup', 'Grown-up']],
  body: [['girl', 'Girl'], ['boy', 'Boy']],
  skin: ['#fbe3cf', '#f1c7a3', '#e0ac84', '#c68c63', '#9a6440', '#6b4128'],
  eyes: ['#5a3d2b', '#3d6e9e', '#4f8a46', '#8a7a3c', '#6f7480'],
  hair: [['long', 'Long'], ['ponytail', 'Ponytail'], ['pigtails', 'Pigtails'], ['bun', 'Bun'], ['bob', 'Bob'],
    ['curly', 'Curly'], ['short', 'Short'], ['spiky', 'Spiky'], ['buzz', 'Buzz']],
  hairColor: ['#2b2220', '#4a2f22', '#7a4a2c', '#a8592f', '#d9a95a', '#f1d69a', '#c9c4bf', P.bubblegum, P.lavender, P.sky, P.mint],
  beard: [['none', 'None'], ['beard', 'Beard'], ['mustache', 'Mustache']],
  top: [['tee', 'T-Shirt'], ['long', 'Long Sleeves'], ['tank', 'Tank Top'], ['hoodie', 'Hoodie'], ['dress', 'Dress']],
  topColor: [P.bubblegum, P.blush, P.lavender, P.sky, '#4f86c6', P.teal, P.mint, P.butter, P.ginger, P.coral, P.white, P.slate, P.charcoal],
  bottom: [['pants', 'Pants'], ['shorts', 'Shorts'], ['skirt', 'Skirt']],
  bottomColor: ['#5b7fb0', '#3f5f8f', P.charcoal, P.slate, P.oat, P.bubblegum, P.lavender, P.mint, P.coral, P.butter],
  shoes: [P.white, P.coral, P.bubblegum, P.sky, P.butter, P.charcoal, '#8a5a3c'],
  hat: [['none', 'None'], ['bow', 'Bow'], ['cap', 'Cap'], ['flowers', 'Flower Crown'], ['catears', 'Cat Ears'],
    ['bunny', 'Bunny Ears'], ['crown', 'Golden Crown']],
  face: [['none', 'None'], ['glasses', 'Glasses'], ['sunglasses', 'Sunglasses'], ['freckles', 'Freckles']],
  back: [['none', 'None'], ['backpack', 'Backpack'], ['cape', 'Cape'], ['wings', 'Fairy Wings']],
  extraColor: [P.bubblegum, P.lavender, P.sky, P.mint, P.butter, P.coral, P.white, P.charcoal],
};

export const LOCKED = { crown: 'Find all the golden stars to unlock!' };

export const DEFAULT_CHARACTER = {
  name: 'Ashley', age: 'kid', body: 'girl', skin: '#f1c7a3', eyes: '#5a3d2b',
  hair: 'long', hairColor: '#7a4a2c', beard: 'none',
  top: 'tee', topColor: P.bubblegum, bottom: 'pants', bottomColor: '#5b7fb0', shoes: P.white,
  hat: 'none', face: 'none', back: 'none', extraColor: P.lavender,
};

// When switching boy/girl, suggest a matching look (everything stays changeable)
export const BODY_SUGGEST = {
  girl: { hair: 'long', top: 'tee', topColor: P.bubblegum, bottom: 'pants' },
  boy: { hair: 'short', top: 'tee', topColor: P.sky, bottom: 'shorts' },
};

const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function randomCharacter(keep = {}) {
  const c = {};
  for (const [k, list] of Object.entries(OPTIONS)) {
    const vals = list.map((v) => (Array.isArray(v) ? v[0] : v)).filter((v) => !LOCKED[v]);
    c[k] = pickOne(vals);
  }
  if (Math.random() < 0.7) c.beard = 'none';
  if (Math.random() < 0.4) c.hat = 'none';
  if (Math.random() < 0.6) c.face = 'none';
  if (Math.random() < 0.6) c.back = 'none';
  return { ...c, ...keep };
}

// ---------- model ----------
const matCache = new Map();
function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o }));
  return matCache.get(key);
}

function dims(c) {
  if (c.age === 'grownup') {
    const girl = c.body === 'girl';
    return { legH: 0.8, torsoH: 0.56, torsoW: girl ? 0.36 : 0.42, torsoD: 0.22, headR: 0.17, armL: 0.6, limbR: girl ? 0.052 : 0.06, neck: 0.06 };
  }
  return { legH: 0.42, torsoH: 0.36, torsoW: 0.3, torsoD: 0.18, headR: 0.165, armL: 0.36, limbR: 0.05, neck: 0.03 };
}

function mesh(geo, material, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// A limb piece hanging DOWN from its parent's origin, `len` long
function segment(parent, len, r, material, y0 = 0) {
  return mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 6, 12), material, parent, 0, y0 - len / 2, 0);
}

export function createCharacter(c) {
  const d = dims(c);
  const skin = mat(c.skin, { roughness: 0.6 });
  const top = mat(c.topColor);
  const bottom = mat(c.bottomColor);
  const shoes = mat(c.shoes, { roughness: 0.5 });
  const hairM = new THREE.MeshStandardMaterial({ color: c.hairColor, roughness: 0.95, side: THREE.DoubleSide });
  const extra = mat(c.extraColor);

  const root = new THREE.Group();
  const body = new THREE.Group(); // everything bobs together
  root.add(body);
  const parts = { root, body };

  // ---- legs ----
  const hipX = d.torsoW * 0.24;
  const legLen = d.legH - 0.06;
  const legColor = (upper) => {
    if (c.top === 'dress' || c.bottom === 'skirt') return skin;
    if (c.bottom === 'shorts') return upper ? bottom : skin;
    return bottom;
  };
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * hipX, d.legH, 0);
    body.add(leg);
    segment(leg, legLen * 0.55, d.limbR * 1.1, legColor(true));
    segment(leg, legLen * 0.5, d.limbR, legColor(false), -legLen * 0.5);
    mesh(new RoundedBoxGeometry(d.limbR * 2.4, 0.08, d.limbR * 4, 2, 0.03), shoes, leg, 0, -d.legH + 0.04, d.limbR * 0.8);
    parts[side < 0 ? 'legL' : 'legR'] = leg;
  }

  // ---- hips + torso ----
  const waist = c.top === 'dress' ? top : bottom;
  mesh(new RoundedBoxGeometry(d.torsoW * 0.92, 0.12, d.torsoD * 0.95, 2, 0.04), waist, body, 0, d.legH, 0);
  const torso = new THREE.Group();
  torso.position.y = d.legH;
  body.add(torso);
  parts.torso = torso;
  mesh(new RoundedBoxGeometry(d.torsoW, d.torsoH, d.torsoD, 3, Math.min(0.07, d.torsoD * 0.45)), top, torso, 0, d.torsoH / 2, 0);
  if (c.top === 'dress' || c.bottom === 'skirt') {
    const sm = c.top === 'dress' ? top : bottom;
    const len = c.top === 'dress' ? d.legH * 0.5 : d.legH * 0.38;
    const skirt = mesh(new THREE.CylinderGeometry(d.torsoW * 0.5, d.torsoW * 0.78, len, 20, 1, true), new THREE.MeshStandardMaterial({ color: sm.color, roughness: 0.7, side: THREE.DoubleSide }), body, 0, d.legH + 0.04 - len / 2, 0);
    skirt.scale.z = 0.8;
  }
  if (c.top === 'hoodie') {
    const hood = mesh(new THREE.TorusGeometry(d.torsoW * 0.32, d.limbR * 0.9, 8, 20), top, torso, 0, d.torsoH - 0.01, -d.torsoD * 0.25);
    hood.rotation.x = Math.PI / 2 - 0.3;
    mesh(new RoundedBoxGeometry(d.torsoW * 0.6, d.torsoH * 0.22, 0.03, 2, 0.012), top, torso, 0, d.torsoH * 0.25, d.torsoD / 2);
  }
  if (c.top === 'tank') {
    // a little neckline so it reads as a tank top
    mesh(new THREE.SphereGeometry(d.torsoW * 0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin, torso, 0, d.torsoH - 0.005, d.torsoD * 0.32).scale.set(1, 0.4, 0.5);
  }

  // ---- arms ----
  const sleeve = { tee: [top, skin], long: [top, top], hoodie: [top, top], tank: [skin, skin], dress: [skin, skin] }[c.top];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * (d.torsoW / 2 + d.limbR * 0.85), d.torsoH - d.limbR * 1.1, 0);
    arm.rotation.z = side * 0.12;
    torso.add(arm);
    segment(arm, d.armL * 0.52, d.limbR * 1.02, sleeve[0]);
    segment(arm, d.armL * 0.5, d.limbR * 0.92, sleeve[1], -d.armL * 0.48);
    mesh(new THREE.SphereGeometry(d.limbR * 1.25, 14, 10), skin, arm, 0, -d.armL - d.limbR * 0.3, 0);
    parts[side < 0 ? 'armL' : 'armR'] = arm;
  }

  // ---- head ----
  const r = d.headR;
  mesh(new THREE.CylinderGeometry(d.limbR * 0.9, d.limbR * 0.9, d.neck + 0.06, 12), skin, torso, 0, d.torsoH + d.neck / 2, 0);
  const head = new THREE.Group();
  head.position.y = d.torsoH + d.neck + r * 0.95;
  torso.add(head);
  parts.head = head;
  mesh(new THREE.SphereGeometry(r, 32, 24), skin, head);
  for (const side of [-1, 1]) mesh(new THREE.SphereGeometry(r * 0.2, 12, 8), skin, head, side * r * 0.97, -r * 0.05, 0).scale.set(0.6, 1, 1);

  // face
  const eyes = new THREE.Group();
  head.add(eyes);
  parts.eyes = eyes;
  for (const side of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(r * 0.13, 16, 12), mat(c.eyes, { roughness: 0.3 }), eyes, side * r * 0.36, r * 0.06, r * 0.9);
    e.scale.set(1, 1.15, 0.5);
    mesh(new THREE.SphereGeometry(r * 0.045, 8, 6), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 }), eyes, side * r * 0.36 + r * 0.04, r * 0.12, r * 0.98);
    if (c.body === 'girl') {
      const lash = mesh(new THREE.BoxGeometry(r * 0.12, r * 0.03, r * 0.02), mat('#2b2220'), eyes, side * r * 0.5, r * 0.18, r * 0.86);
      lash.rotation.z = side * 0.5;
    }
    const cheek = mesh(new THREE.SphereGeometry(r * 0.15, 12, 8), mat('#f39aa5', { transparent: true, opacity: 0.55 }), head, side * r * 0.55, -r * 0.22, r * 0.79);
    cheek.scale.z = 0.3;
    cheek.castShadow = false;
  }
  mesh(new THREE.SphereGeometry(r * 0.07, 10, 8), skin, head, 0, -r * 0.08, r * 0.99);
  const mouth = mesh(new THREE.TorusGeometry(r * 0.17, r * 0.035, 8, 16, Math.PI), mat('#a8483f'), head, 0, -r * 0.3, r * 0.93);
  mouth.rotation.z = Math.PI;
  mouth.rotation.x = -0.2;
  parts.mouth = mouth;
  // eyebrows only show up for strong feelings (mad or sad)
  for (const side of [-1, 1]) {
    const brow = mesh(new THREE.BoxGeometry(r * 0.34, r * 0.085, r * 0.05), mat(c.hairColor ?? '#4a2f22'), head, side * r * 0.36, r * 0.34, r * 0.92);
    brow.visible = false;
    parts[side < 0 ? 'browL' : 'browR'] = brow;
  }
  parts.r = r;

  if (c.face === 'freckles') {
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1, k = i % 4;
      mesh(new THREE.SphereGeometry(r * 0.025, 6, 4), mat('#b06a4a'), head, side * r * (0.42 + (k % 2) * 0.12), -r * (0.08 + Math.floor(k / 2) * 0.1), r * 0.92).castShadow = false;
    }
  }
  if (c.face === 'glasses' || c.face === 'sunglasses') {
    const frame = mat(c.face === 'sunglasses' ? '#222222' : P.charcoal, { roughness: 0.3 });
    for (const side of [-1, 1]) {
      const ring = mesh(new THREE.TorusGeometry(r * 0.2, r * 0.025, 8, 20), frame, head, side * r * 0.36, r * 0.06, r * 0.97);
      ring.castShadow = false;
      if (c.face === 'sunglasses') mesh(new THREE.CircleGeometry(r * 0.2, 20), mat('#2a2f3a', { roughness: 0.1, metalness: 0.4 }), head, side * r * 0.36, r * 0.06, r * 0.975);
    }
    mesh(new THREE.BoxGeometry(r * 0.3, r * 0.03, r * 0.03), frame, head, 0, r * 0.1, r * 0.99);
  }
  if (c.beard === 'beard') {
    const bd = mesh(new THREE.SphereGeometry(r * 1.02, 24, 16, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.55, Math.PI * 0.35), hairM, head);
    bd.rotation.y = 0;
  }
  if (c.beard === 'beard' || c.beard === 'mustache') {
    for (const side of [-1, 1]) {
      const mu = mesh(new THREE.CapsuleGeometry(r * 0.06, r * 0.18, 4, 8), hairM, head, side * r * 0.13, -r * 0.2, r * 0.95);
      mu.rotation.z = side * 1.2;
    }
  }

  // ---- hair ----
  const hair = new THREE.Group();
  head.add(hair);
  const cap = (scale = 1.07, theta = 0.55) => {
    const m = mesh(new THREE.SphereGeometry(r * scale, 32, 18, 0, Math.PI * 2, 0, Math.PI * theta), hairM, hair);
    m.rotation.x = -0.42;
    return m;
  };
  // hair around the sides and back, open at the face
  const shell = (scale, theta) => {
    const m = mesh(new THREE.SphereGeometry(r * scale, 32, 18, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * theta), hairM, hair);
    m.rotation.x = -0.15;
    return m;
  };
  const strand = (x, y, z, len, rad, rx = 0, rz = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.set(rx, 0, rz);
    hair.add(g);
    segment(g, len, rad, hairM);
    return g;
  };
  const tie = (x, y, z) => mesh(new THREE.SphereGeometry(r * 0.12, 10, 8), extra, hair, x, y, z);

  switch (c.hair) {
    case 'buzz': cap(1.025, 0.5); break;
    case 'short': cap(1.08, 0.56); mesh(new THREE.SphereGeometry(r * 0.5, 16, 10), hairM, hair, r * 0.25, r * 0.75, r * 0.45).scale.set(1.3, 0.5, 0.8); break;
    case 'spiky':
      cap(1.06, 0.55);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const sp = mesh(new THREE.ConeGeometry(r * 0.18, r * 0.5, 8), hairM, hair, Math.cos(a) * r * 0.5, r * 0.95, Math.sin(a) * r * 0.45 - r * 0.1);
        sp.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
      }
      break;
    case 'curly':
      cap(1.05, 0.55);
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2, ring = i % 2;
        const y = ring ? r * 0.55 : r * 0.15, rr = ring ? r * 0.8 : r * 1.0;
        if (Math.sin(a) > 0.55 && !ring) continue; // keep the face clear
        mesh(new THREE.SphereGeometry(r * 0.26, 10, 8), hairM, hair, Math.cos(a) * rr, y, Math.sin(a) * rr - r * 0.05);
      }
      mesh(new THREE.SphereGeometry(r * 0.32, 10, 8), hairM, hair, 0, r * 0.95, 0);
      break;
    case 'bob': cap(1.08, 0.56); shell(1.1, 0.68); break;
    case 'long':
      cap(1.08, 0.56); shell(1.1, 0.7);
      mesh(new RoundedBoxGeometry(r * 1.9, r * 2.6, r * 0.5, 3, r * 0.2), hairM, hair, 0, -r * 1.0, -r * 0.62);
      break;
    case 'ponytail':
      cap(1.08, 0.58);
      tie(0, r * 0.55, -r * 0.95);
      strand(0, r * 0.5, -r * 1.05, r * 1.8, r * 0.22, -0.35);
      break;
    case 'pigtails':
      cap(1.08, 0.58);
      for (const side of [-1, 1]) {
        tie(side * r * 0.95, r * 0.3, -r * 0.2);
        strand(side * r * 1.05, r * 0.25, -r * 0.2, r * 1.4, r * 0.2, 0, side * 0.35);
      }
      break;
    case 'bun':
      cap(1.08, 0.58);
      mesh(new THREE.SphereGeometry(r * 0.42, 16, 12), hairM, hair, 0, r * 1.0, -r * 0.35);
      break;
  }

  // ---- hats ----
  if (c.hat === 'bow') {
    const bow = new THREE.Group();
    bow.position.set(r * 0.55, r * 0.85, r * 0.1);
    bow.rotation.z = -0.5;
    head.add(bow);
    for (const s of [-1, 1]) mesh(new THREE.ConeGeometry(r * 0.22, r * 0.4, 12), extra, bow, s * r * 0.2, 0, 0).rotation.z = s * Math.PI / 2;
    mesh(new THREE.SphereGeometry(r * 0.1, 10, 8), extra, bow);
  }
  if (c.hat === 'cap') {
    const capM = mesh(new THREE.SphereGeometry(r * 1.12, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), extra, head, 0, r * 0.08, 0);
    capM.rotation.x = -0.15;
    const brim = mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, r * 0.06, 24, 1, false, -Math.PI / 2, Math.PI), extra, head, 0, r * 0.25, r * 0.55);
    brim.rotation.y = Math.PI / 2; brim.scale.z = 1.3;
    mesh(new THREE.SphereGeometry(r * 0.09, 8, 6), extra, head, 0, r * 1.2, -r * 0.1);
  }
  if (c.hat === 'flowers') {
    const ring = mesh(new THREE.TorusGeometry(r * 0.95, r * 0.06, 8, 32), mat(P.leaf), head, 0, r * 0.55, -r * 0.05);
    ring.rotation.x = Math.PI / 2 - 0.3;
    const cols = [P.bubblegum, P.butter, P.white, P.lavender, P.coral, P.sky];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      mesh(new THREE.SphereGeometry(r * 0.13, 10, 8), mat(cols[i % cols.length]), head, Math.cos(a) * r * 0.95, r * 0.55 + Math.sin(a) * r * 0.28, Math.sin(a) * r * 0.92 - r * 0.05);
    }
  }
  if (c.hat === 'catears' || c.hat === 'bunny') {
    for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(side * r * 0.55, r * 0.8, -r * 0.05);
      ear.rotation.z = -side * 0.35;
      head.add(ear);
      if (c.hat === 'catears') {
        mesh(new THREE.ConeGeometry(r * 0.28, r * 0.5, 4), extra, ear, 0, r * 0.2, 0).rotation.y = Math.PI / 4;
        mesh(new THREE.ConeGeometry(r * 0.16, r * 0.32, 4), mat(P.blush), ear, 0, r * 0.18, r * 0.07).rotation.y = Math.PI / 4;
      } else {
        mesh(new THREE.CapsuleGeometry(r * 0.15, r * 0.8, 6, 10), extra, ear, 0, r * 0.55, 0).scale.z = 0.5;
        mesh(new THREE.CapsuleGeometry(r * 0.08, r * 0.6, 6, 10), mat(P.blush), ear, 0, r * 0.55, r * 0.06).scale.z = 0.4;
      }
    }
  }
  if (c.hat === 'crown') {
    const gold = mat(P.gold, { metalness: 0.7, roughness: 0.25, emissive: '#5a4210', emissiveIntensity: 0.3 });
    const band = mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.68, r * 0.3, 24, 1, true), new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.7, roughness: 0.25, side: THREE.DoubleSide }), head, 0, r * 0.95, 0);
    band.rotation.x = -0.1;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      mesh(new THREE.ConeGeometry(r * 0.1, r * 0.3, 6), gold, head, Math.cos(a) * r * 0.64, r * 1.22, Math.sin(a) * r * 0.64 - r * 0.03);
    }
    mesh(new THREE.SphereGeometry(r * 0.09, 10, 8), mat(P.bubblegum, { roughness: 0.2 }), head, 0, r * 0.98, r * 0.66);
  }

  // ---- back ----
  if (c.back === 'backpack') {
    mesh(new RoundedBoxGeometry(d.torsoW * 0.8, d.torsoH * 0.75, d.torsoD * 0.7, 3, 0.04), extra, torso, 0, d.torsoH * 0.5, -d.torsoD * 0.8);
    mesh(new RoundedBoxGeometry(d.torsoW * 0.55, d.torsoH * 0.3, d.torsoD * 0.3, 2, 0.03), extra, torso, 0, d.torsoH * 0.3, -d.torsoD * 1.2);
  }
  if (c.back === 'cape') {
    const cape = new THREE.Group();
    cape.position.set(0, d.torsoH - 0.02, -d.torsoD / 2 - 0.02);
    torso.add(cape);
    const len = d.torsoH + d.legH * 0.7;
    const cm = new THREE.MeshStandardMaterial({ color: c.extraColor, roughness: 0.7, side: THREE.DoubleSide });
    const sheet = mesh(new THREE.CylinderGeometry(d.torsoW * 0.45, d.torsoW * 0.75, len, 16, 1, true, Math.PI * 0.6, Math.PI * 0.8), cm, cape, 0, -len / 2, d.torsoD * 0.3);
    sheet.scale.z = 0.5;
    parts.cape = cape;
  }
  if (c.back === 'wings') {
    const wm = new THREE.MeshStandardMaterial({ color: c.extraColor, roughness: 0.3, transparent: true, opacity: 0.65, side: THREE.DoubleSide, emissive: c.extraColor, emissiveIntensity: 0.25 });
    for (const side of [-1, 1]) {
      const w = new THREE.Group();
      w.position.set(side * 0.03, d.torsoH * 0.65, -d.torsoD / 2 - 0.02);
      torso.add(w);
      const up = mesh(new THREE.SphereGeometry(d.torsoH * 0.38, 16, 10), wm, w, side * d.torsoH * 0.35, d.torsoH * 0.15, 0);
      up.scale.set(1, 1.2, 0.08); up.rotation.z = side * -0.5; up.castShadow = false;
      const lo = mesh(new THREE.SphereGeometry(d.torsoH * 0.26, 16, 10), wm, w, side * d.torsoH * 0.28, -d.torsoH * 0.25, 0);
      lo.scale.set(1, 1.1, 0.08); lo.rotation.z = side * 0.6; lo.castShadow = false;
      parts[side < 0 ? 'wingL' : 'wingR'] = w;
    }
  }

  const eyeHeight = d.legH + d.torsoH + d.neck + r * 1.0;
  root.userData = { eyeHeight, height: eyeHeight + r, radius: d.torsoW / 2 + 0.08 };
  // fewer pieces to draw: combine the still pieces inside each moving part (eyes stay separate so they can blink)
  for (const v of Object.values(parts)) if (v?.isMesh) v.userData.keep = true;
  const groups = [];
  root.traverse((o) => { if (!o.isMesh) groups.push(o); });
  for (const g of groups) mergeStatic(g);
  return { root, parts, eyeHeight, height: eyeHeight + r };
}

// Feelings on the face: 'happy' (big smile), 'mad' (frown + angry eyebrows), 'sad', or normal (null)
export function setMood(ch, mood) {
  const p = ch.parts;
  if (!p.mouth || p.mood === mood) return;
  p.mood = mood;
  const frown = mood === 'mad' || mood === 'sad', r = p.r;
  p.mouth.rotation.z = frown ? 0 : Math.PI;
  p.mouth.position.y = -r * 0.3 - (frown ? r * 0.17 : 0);
  p.mouth.scale.setScalar(mood === 'happy' ? 1.3 : 1);
  p.browL.visible = p.browR.visible = frown;
  p.browL.rotation.z = mood === 'mad' ? -0.5 : 0.4;
  p.browR.rotation.z = mood === 'mad' ? 0.5 : -0.4;
}

// Animate the character. speed: 0 = standing, 1 = walking, 2 = running.
export function animateCharacter(ch, t, speed, holding) {
  const p = ch.parts;
  const s = Math.min(speed, 2);
  const swing = Math.sin(t * (7 + s * 2.5)) * 0.55 * Math.min(1, s);
  p.legL.rotation.x = swing;
  p.legR.rotation.x = -swing;
  if (holding) {
    p.armL.rotation.x = p.armR.rotation.x = -1.25 + Math.sin(t * 3) * 0.05;
  } else {
    p.armL.rotation.x = -swing * 0.8;
    p.armR.rotation.x = swing * 0.8;
  }
  p.body.position.y = Math.abs(Math.sin(t * (7 + s * 2.5))) * 0.035 * Math.min(1, s);
  p.torso.scale.y = 1 + Math.sin(t * 2.2) * 0.012 * (1 - Math.min(1, s));
  p.head.rotation.y = Math.sin(t * 0.7) * 0.12 * (1 - Math.min(1, s));
  p.eyes.scale.y = (t % 3.7) < 0.12 ? 0.15 : 1; // blink
  if (p.cape) p.cape.rotation.x = 0.08 + Math.min(1, s) * 0.45 + Math.sin(t * 4) * 0.04;
  if (p.wingL) {
    const f = Math.sin(t * (s > 0.1 ? 14 : 3)) * (s > 0.1 ? 0.5 : 0.15);
    p.wingL.rotation.y = 0.3 + f;
    p.wingR.rotation.y = -0.3 - f;
  }
}
