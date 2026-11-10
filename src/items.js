// Every thing you can place in the house. Each one is built from simple shapes.
// Convention: an item stands on y=0, is centered on x/z, and its FRONT faces +z.
// Wall items (wall: true) are centered on y=0 with their back at z=0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { tex, scaleBoxUV, signTexture, stripes } from './textures.js';
import { P } from './palette.js';
import { mergeStatic } from './merge.js';

export { KID_COLORS, WALL_COLORS, FLOOR_COLORS } from './palette.js';

export const nextIn = (list, cur) => list[(list.indexOf(cur) + 1) % list.length];

const MAIN = 'MAIN';
const GLASS = { transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false };
const WOOD = P.woodMid, LIGHT_WOOD = P.woodLight, DARK_WOOD = P.woodDark, WHITE = P.white,
  BLACK = '#2a2727', METAL = P.metal, GREEN = P.leaf, LEAF = P.leafDark;

// Soft, slightly rounded boxes give everything the same cozy "toy" look.
// Geometries are shared between items of the same size.
const geoCache = new Map();
function softBox(w, h, d) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  let g = geoCache.get(key);
  if (!g) {
    const r = Math.min(0.035, Math.min(w, h, d) * 0.3);
    g = r < 0.004 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, r);
    geoCache.set(key, g);
  }
  return g;
}

let brickMat;
const shared = {
  brick: () => (brickMat ??= new THREE.MeshStandardMaterial({ map: tex.brick(), roughness: 0.95 })),
  landscape: () => new THREE.MeshBasicMaterial({ map: tex.landscape() }),
  landscapeStd: () => new THREE.MeshStandardMaterial({ map: tex.landscape(), roughness: 0.8 }),
  globe: () => new THREE.MeshStandardMaterial({ map: tex.globe(), roughness: 0.5 }),
};

const sharedMats = new Map();

class Builder {
  constructor(mainColor, mainOpts = {}) {
    this.group = new THREE.Group();
    this.mainMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.75, ...mainOpts });
  }
  mat(c, opts) {
    if (c === MAIN) return this.mainMat;
    if (c instanceof THREE.Material) return c;
    const key = c + JSON.stringify(opts ?? {});
    if (!sharedMats.has(key)) sharedMats.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...opts }));
    return sharedMats.get(key); // detail colors are shared between items (only the main color changes)
  }
  add(geo, c, x, y, z, opts) {
    const m = new THREE.Mesh(geo, this.mat(c, opts));
    m.position.set(x, y, z);
    this.group.add(m);
    return m;
  }
  // y = bottom of the box
  box(w, h, d, x, y, z, c, opts) {
    let geo;
    if (c instanceof THREE.Material && c.map) {
      geo = new THREE.BoxGeometry(w, h, d); // textured boxes keep crisp edges so the texture fits
      if (c.map.wrapS === THREE.RepeatWrapping) scaleBoxUV(geo, w, h, d);
    } else geo = softBox(w, h, d);
    return this.add(geo, c, x, y + h / 2, z, opts);
  }
  // y = bottom of the cylinder
  cyl(rTop, rBot, h, x, y, z, c, opts, seg = 24) {
    return this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg), c, x, y + h / 2, z, opts);
  }
  // y = center of the ball
  ball(r, x, y, z, c, opts) {
    return this.add(new THREE.SphereGeometry(r, 28, 18), c, x, y, z, opts);
  }
  // A child group (for parts that move). Shares this item's main color.
  sub(name, x = 0, y = 0, z = 0) {
    const s = Object.create(this);
    s.group = new THREE.Group();
    s.group.name = name;
    s.group.position.set(x, y, z);
    this.group.add(s.group);
    return s;
  }
  cone(r, h, x, y, z, c, opts, seg = 16) {
    return this.add(new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z, opts);
  }
  legs(w, d, h, t, c, y = 0) {
    const x = w / 2 - t / 2, z = d / 2 - t / 2;
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) this.box(t, h, t, sx * x, y, sz * z, c);
  }
  // a disc facing +z (for clocks etc.)
  disc(r, thick, x, y, z, c, opts) {
    const m = this.add(new THREE.CylinderGeometry(r, r, thick, 40), c, x, y, z, opts);
    m.rotation.x = Math.PI / 2;
    return m;
  }
}

// ---------- reusable shapes ----------
function sofa(w) {
  return (b) => {
    b.box(w, 0.42, 0.9, 0, 0, 0, MAIN);
    b.box(w, 0.52, 0.22, 0, 0.42, -0.34, MAIN);
    b.box(0.2, 0.24, 0.9, -w / 2 + 0.1, 0.42, 0, MAIN);
    b.box(0.2, 0.24, 0.9, w / 2 - 0.1, 0.42, 0, MAIN);
    const seats = Math.max(1, Math.round((w - 0.4) / 0.6));
    const sw = (w - 0.4) / seats;
    for (let i = 0; i < seats; i++) b.box(sw - 0.03, 0.08, 0.66, -w / 2 + 0.2 + sw * (i + 0.5), 0.42, 0.1, MAIN);
  };
}
function bedShape(width, pillows) {
  return (b) => {
    b.box(width + 0.1, 0.3, 2.1, 0, 0, 0, WOOD);
    b.box(width, 0.2, 2.0, 0, 0.3, 0, WHITE);
    b.box(width + 0.04, 0.08, 1.45, 0, 0.48, 0.3, MAIN);
    const pw = width / pillows;
    for (let i = 0; i < pillows; i++) b.box(pw - 0.12, 0.12, 0.35, -width / 2 + pw * (i + 0.5), 0.5, -0.72, WHITE);
    b.box(width + 0.1, 0.95, 0.08, 0, 0, -1.03, WOOD);
  };
}
function table(w, d, h, top = MAIN, legs = MAIN) {
  return (b) => { b.box(w, 0.05, d, 0, h - 0.05, 0, top); b.legs(w - 0.06, d - 0.06, h - 0.05, 0.06, legs); };
}


// ---------- vehicle parts ----------
function wheels(b, r, w, x, zs) {
  for (const sx of [-1, 1]) for (const z of zs) {
    b.add(new THREE.CylinderGeometry(r, r, w, 24), BLACK, sx * x, r, z).rotation.z = Math.PI / 2;
    b.add(new THREE.CylinderGeometry(r * 0.45, r * 0.45, w + 0.02, 16), METAL, sx * x, r, z).rotation.z = Math.PI / 2;
  }
}
// see-through windows with a roof and corner posts. y = bottom of the windows, z = middle
function cabin(b, w, h, d, y, z) {
  b.box(w - 0.06, h, d - 0.06, 0, y, z, '#cfe6f2', GLASS);
  b.box(w + 0.04, 0.07, d + 0.04, 0, y + h, z, MAIN);
  for (const x of [-w / 2, w / 2]) for (const dz of [-d / 2 + 0.03, d / 2 - 0.03]) b.box(0.07, h, 0.07, x, y, z + dz, MAIN);
}
// seat backs: the first row has two seats, the rest are benches
function seats(b, y, sx, ...rows) {
  rows.forEach((z, i) => {
    if (i === 0) for (const x of [-sx, sx]) b.box(0.5, 0.26, 0.1, x, y, z - 0.25, '#5a4a45');
    else b.box(sx * 2 + 0.5, 0.24, 0.1, 0, y, z, '#5a4a45');
  });
  if (rows.length) b.box(b.w ?? 1.5, 0.12, 0.25, 0, y - 0.02, rows[0] + 0.35, '#3b3b42');
}


// ---------- a store shelf full of things to buy ----------
const STOCK_COLORS = ['#ec7d72', '#f7da7e', '#93c9ea', '#aee0c5', '#ef84ad', '#bba6e6', '#f2a25f', '#5fb3a8', '#fbfaf7', '#d9443a', '#4f86c6'];
function stockedShelf(kind) {
  return (b) => {
    b.box(1.6, 1.5, 0.04, 0, 0, -0.2, MAIN);
    for (const x of [-0.78, 0.78]) b.box(0.04, 1.5, 0.44, x, 0, 0, MAIN);
    for (const y of [0, 0.5, 1.0, 1.46]) b.box(1.56, 0.04, 0.44, 0, y, 0, MAIN);
    b.box(1.56, 0.06, 0.012, 0, 0.0, 0.222, '#f7da7e'); // price strip
    let n = 0;
    const col = () => STOCK_COLORS[(n++ * 7 + kind.length) % STOCK_COLORS.length];
    for (const y of [0.04, 0.54, 1.04]) for (const z of [-0.09, 0.08]) {
      if (kind === 'cereal') for (let x = -0.66; x <= 0.67; x += 0.19) { const c = col(); b.box(0.16, 0.32, 0.08, x, y, z, c); if (z > 0) b.box(0.1, 0.1, 0.005, x, y + 0.15, z + 0.042, '#fbfaf7'); }
      if (kind === 'cans') for (let x = -0.7; x <= 0.71; x += 0.1) { const c = col(); b.cyl(0.04, 0.04, 0.11, x, y, z, c, undefined, 12); if (y < 1) b.cyl(0.04, 0.04, 0.11, x, y + 0.11, z, c, undefined, 12); }
      if (kind === 'snacks') for (let x = -0.68; x <= 0.69; x += 0.15) { const c = col(); b.box(0.13, 0.2, 0.07, x, y, z, c); if (z > 0) b.box(0.08, 0.06, 0.005, x, y + 0.1, z + 0.037, '#fbfaf7'); }
      if (kind === 'drinks') for (let x = -0.7; x <= 0.71; x += 0.1) { const c = col(); b.cyl(0.035, 0.035, 0.22, x, y, z, c, undefined, 10); b.cyl(0.015, 0.02, 0.06, x, y + 0.22, z, c, undefined, 8); b.cyl(0.016, 0.016, 0.02, x, y + 0.28, z, '#fbfaf7', undefined, 8); }
      if (kind === 'bread') for (let x = -0.62; x <= 0.63; x += 0.25) { b.box(0.22, 0.12, 0.13, x, y, z, '#d9a45a'); b.box(0.2, 0.05, 0.12, x, y + 0.11, z, '#e9c27a'); }
    }
  };
}


// ---------- the X-ray picture (a friendly skeleton) ----------
function xrayPicture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 180;
  const g = c.getContext('2d');
  g.fillStyle = '#16304a'; g.fillRect(0, 0, 256, 180);
  g.strokeStyle = '#e9f6ff'; g.fillStyle = '#e9f6ff'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.arc(128, 34, 18, 0, 7); g.fill();                     // skull
  g.fillStyle = '#16304a'; g.beginPath(); g.arc(121, 31, 4, 0, 7); g.arc(135, 31, 4, 0, 7); g.fill(); g.fillStyle = '#e9f6ff';
  g.beginPath(); g.moveTo(128, 54); g.lineTo(128, 120); g.stroke();       // spine
  for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(128, 70 + i * 11, 24 - i * 2, 4, 0, 0, Math.PI); g.stroke(); } // ribs
  g.beginPath(); g.moveTo(128, 62); g.lineTo(94, 92); g.lineTo(82, 124); g.moveTo(128, 62); g.lineTo(162, 92); g.lineTo(174, 124); g.stroke(); // arms
  g.beginPath(); g.moveTo(128, 120); g.lineTo(108, 172); g.moveTo(128, 120); g.lineTo(148, 172); g.stroke(); // legs
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- clocks ----------
function clockFace() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#34302f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = "bold 34px 'Baloo 2', sans-serif";
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillText(String(i), 128 + Math.sin(a) * 96, 132 - Math.cos(a) * 96); }
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, r1 = i % 5 ? 118 : 112; g.fillRect(128 + Math.sin(a) * r1 - 1.5, 128 - Math.cos(a) * r1 - 1.5, 3, 3); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// a glowing screen that shows the real time (it redraws itself when the minute changes)
function digitalScreen() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: t });
  let shown = '';
  m.userData.draw = () => {
    const d = new Date();
    let h = d.getHours() % 12; if (!h) h = 12;
    const text = `${h}:${String(d.getMinutes()).padStart(2, '0')}`, colon = d.getSeconds() % 2 === 0;
    const key = text + colon;
    if (key === shown) return;
    shown = key;
    g.fillStyle = '#101418'; g.fillRect(0, 0, 256, 96);
    g.fillStyle = '#ff5a4d'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = "bold 70px 'Courier New', monospace";
    g.fillText(colon ? text : text.replace(':', ' '), 118, 52);
    g.font = "bold 22px sans-serif"; g.fillText(d.getHours() < 12 ? 'AM' : 'PM', 228, 76);
    t.needsUpdate = true;
  };
  m.userData.draw();
  return m;
}

// ---------- the catalog ----------
export const CATALOG = [
  // ---- Furniture ----
  { id: 'couch', name: 'Couch', emoji: '🛋️', cat: 'Furniture', color: '#34302f', mainOpts: { roughness: 0.45 }, build: sofa(2.1) },
  { id: 'loveseat', name: 'Loveseat', emoji: '🛋️', cat: 'Furniture', color: '#34302f', mainOpts: { roughness: 0.45 }, build: sofa(1.5) },
  { id: 'armchair', name: 'Comfy Chair', emoji: '💺', cat: 'Furniture', color: '#bba6e6', build: sofa(0.95) },
  { id: 'bed', name: 'Bed', emoji: '🛏️', cat: 'Furniture', color: '#ef84ad', build: bedShape(1.0, 1) },
  { id: 'bigbed', name: 'Big Bed', emoji: '🛏️', cat: 'Furniture', color: '#d9d9d9', build: bedShape(1.6, 2) },
  { id: 'coffeetable', name: 'Coffee Table', emoji: '🪵', cat: 'Furniture', color: WOOD, build: table(1.2, 0.6, 0.42) },
  { id: 'diningtable', name: 'Dining Table', emoji: '🍽️', cat: 'Furniture', color: '#34302f', build: table(1.8, 0.95, 0.76) },
  { id: 'chair', name: 'Chair', emoji: '🪑', cat: 'Furniture', color: LIGHT_WOOD, build: (b) => {
    b.legs(0.42, 0.42, 0.45, 0.04, MAIN);
    b.box(0.45, 0.05, 0.45, 0, 0.45, 0, MAIN);
    for (const x of [-0.2, -0.1, 0, 0.1, 0.2]) b.box(0.03, 0.45, 0.03, x, 0.5, -0.2, MAIN);
    b.box(0.45, 0.1, 0.04, 0, 0.9, -0.2, MAIN);
  } },
  { id: 'desk', name: 'Desk', emoji: '🖊️', cat: 'Furniture', color: '#fbfaf7', build: (b) => {
    table(1.2, 0.6, 0.75)(b);
    b.box(0.4, 0.3, 0.55, 0.38, 0.4, 0, MAIN);
    b.ball(0.02, 0.38, 0.55, 0.28, METAL);
  } },
  { id: 'bookshelf', name: 'Bookshelf', emoji: '📚', cat: 'Furniture', color: '#fbfaf7', build: (b) => {
    b.box(0.9, 1.8, 0.03, 0, 0, -0.135, MAIN);
    b.box(0.03, 1.8, 0.3, -0.435, 0, 0, MAIN);
    b.box(0.03, 1.8, 0.3, 0.435, 0, 0, MAIN);
    const shelves = [0, 0.45, 0.9, 1.35, 1.77];
    for (const y of shelves) b.box(0.87, 0.03, 0.3, 0, y, 0, MAIN);
    const bookColors = ['#ec7d72', '#93c9ea', '#f7da7e', '#aee0c5', '#bba6e6', '#f2a25f', '#ef84ad', '#5fb3a8'];
    for (let s = 0; s < 4; s++) {
      let x = -0.4, i = s * 3;
      while (x < 0.3) {
        const w = 0.05 + ((i * 7) % 4) * 0.01, h = 0.25 + ((i * 5) % 4) * 0.03;
        b.box(w, h, 0.22, x + w / 2, shelves[s] + 0.03, 0.02, bookColors[i % bookColors.length]);
        x += w + 0.008; i++;
      }
    }
  } },
  { id: 'cubeshelf', name: 'Cube Shelf', emoji: '🧺', cat: 'Furniture', color: '#fbfaf7', build: (b) => {
    const W = 1.1, D = 0.33, c = W / 3;
    b.box(W, W, 0.02, 0, 0, -D / 2 + 0.01, MAIN);
    for (let i = 0; i <= 3; i++) b.box(0.03, W, D, -W / 2 + Math.min(Math.max(i * c, 0.015), W - 0.015), 0, 0, MAIN);
    for (let j = 0; j <= 3; j++) b.box(W, 0.03, D, 0, Math.min(j * c, W - 0.03), 0, MAIN);
    const bins = ['#555b61', '#d8cdb8', BLACK, '#555b61', null, BLACK, null, '#d8cdb8', '#555b61'];
    bins.forEach((col, k) => {
      const cx = -W / 2 + c * (k % 3 + 0.5), cy = c * Math.floor(k / 3) + 0.03;
      if (col) { b.box(c - 0.05, c - 0.06, D - 0.04, cx, cy, 0.01, col); b.disc(0.02, 0.01, cx, cy + c * 0.62, D / 2, METAL); }
      else for (let n = 0; n < 5; n++) b.box(0.04, 0.24, 0.22, cx - 0.12 + n * 0.055, cy, 0, ['#ec7d72', '#93c9ea', '#f7da7e', '#aee0c5', '#bba6e6'][n]);
    });
  } },
  { id: 'dresser', name: 'Dresser', emoji: '🗄️', cat: 'Furniture', color: DARK_WOOD, build: (b) => {
    b.box(1.2, 0.85, 0.5, 0, 0, 0, MAIN);
    for (let i = 0; i < 3; i++) {
      b.box(1.1, 0.22, 0.02, 0, 0.07 + i * 0.26, 0.25, MAIN);
      for (const x of [-0.3, 0.3]) b.ball(0.025, x, 0.18 + i * 0.26, 0.27, '#d1a640');
    }
  } },
  { id: 'nightstand', name: 'Nightstand', emoji: '🗃️', cat: 'Furniture', color: DARK_WOOD, build: (b) => {
    b.box(0.45, 0.55, 0.4, 0, 0, 0, MAIN);
    b.box(0.38, 0.15, 0.02, 0, 0.32, 0.2, MAIN);
    b.ball(0.02, 0, 0.4, 0.22, '#d1a640');
  } },
  { id: 'drawers', name: 'Drawer Cart', emoji: '🗂️', cat: 'Furniture', color: '#fbfaf7', build: (b) => {
    b.box(0.4, 0.95, 0.4, 0, 0.05, 0, MAIN);
    for (let i = 0; i < 5; i++) b.box(0.34, 0.15, 0.012, 0, 0.1 + i * 0.18, 0.207, '#dcdcdc');
    for (const [x, z] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) b.ball(0.025, x, 0.025, z, BLACK);
  } },
  { id: 'tv', name: 'TV', emoji: '📺', cat: 'Furniture', color: BLACK, build: (b) => {
    b.box(1.6, 0.5, 0.42, 0, 0, 0, MAIN);
    b.box(0.1, 0.06, 0.1, 0, 0.5, 0, BLACK);
    b.box(1.3, 0.75, 0.05, 0, 0.56, 0, BLACK);
    b.box(1.24, 0.69, 0.01, 0, 0.59, 0.026, shared.landscape());
  } },

  // ---- Kitchen & Bath ----
  { id: 'counter', name: 'Counter', emoji: '🧱', cat: 'Kitchen & Bath', color: '#34503f', build: (b) => {
    b.box(1.0, 0.88, 0.6, 0, 0, 0, MAIN);
    b.box(1.02, 0.04, 0.62, 0, 0.88, 0, '#e8e2d8', { roughness: 0.4 });
    for (const x of [-0.25, 0.25]) b.box(0.46, 0.7, 0.01, x, 0.08, 0.3, MAIN);
    for (const x of [-0.05, 0.05]) b.box(0.015, 0.12, 0.02, x, 0.6, 0.31, '#d1a640');
  } },
  { id: 'stove', name: 'Stove', emoji: '🔥', cat: 'Kitchen & Bath', color: '#c8ccd0', mainOpts: { metalness: 0.4, roughness: 0.4 }, build: (b) => {
    b.box(0.75, 0.9, 0.65, 0, 0, 0, MAIN);
    b.box(0.75, 0.02, 0.65, 0, 0.9, 0, BLACK);
    for (const [x, z] of [[-0.18, -0.15], [0.18, -0.15], [-0.18, 0.15], [0.18, 0.15]]) b.cyl(0.09, 0.09, 0.015, x, 0.92, z, '#444');
    b.box(0.55, 0.32, 0.01, 0, 0.3, 0.326, BLACK);
    b.box(0.5, 0.03, 0.04, 0, 0.7, 0.34, METAL);
  } },
  { id: 'fridge', name: 'Fridge', emoji: '🧊', cat: 'Kitchen & Bath', color: '#2e2b2b', mainOpts: { metalness: 0.3, roughness: 0.35 }, build: (b) => {
    b.box(0.85, 1.8, 0.72, 0, 0, 0, MAIN);
    b.box(0.012, 1.2, 0.012, 0, 0.6, 0.366, '#111');
    b.box(0.85, 0.012, 0.012, 0, 0.6, 0.366, '#111');
    for (const x of [-0.05, 0.05]) b.box(0.03, 0.55, 0.04, x, 1.0, 0.38, METAL);
    b.box(0.25, 0.3, 0.012, -0.22, 1.1, 0.368, '#111');
    for (const [x, y, c] of [[0.2, 1.4, '#ec7d72'], [0.3, 1.25, '#f7da7e'], [-0.3, 0.9, '#93c9ea'], [0.25, 0.8, '#aee0c5']])
      b.box(0.08, 0.08, 0.012, x, y, 0.372, c);
  } },
  { id: 'pot', name: 'Cooking Pot', emoji: '🍲', cat: 'Kitchen & Bath', color: '#c0392b', mainOpts: { roughness: 0.3 }, build: (b) => {
    b.cyl(0.16, 0.15, 0.17, 0, 0, 0, MAIN);
    b.cyl(0.165, 0.165, 0.03, 0, 0.17, 0, MAIN);
    b.ball(0.025, 0, 0.215, 0, BLACK);
    for (const x of [-0.19, 0.19]) b.box(0.06, 0.03, 0.06, x, 0.12, 0, MAIN);
  } },
  { id: 'fruitbowl', name: 'Fruit Bowl', emoji: '🍎', cat: 'Kitchen & Bath', color: '#fbfaf7', build: (b) => {
    b.cyl(0.18, 0.1, 0.08, 0, 0, 0, MAIN);
    for (const [x, z, c] of [[-0.06, 0, '#e05a52'], [0.06, 0.03, '#f2a25f'], [0, -0.07, '#f7cf6a'], [0.03, 0.07, '#e05a52'], [-0.04, 0.08, '#9cc75a']])
      b.ball(0.055, x, 0.11, z, c);
  } },
  { id: 'cupcake', name: 'Cupcake', emoji: '🧁', cat: 'Kitchen & Bath', color: '#ef84ad', build: (b) => {
    b.cyl(0.06, 0.045, 0.06, 0, 0, 0, '#d6a878');
    b.ball(0.065, 0, 0.08, 0, MAIN);
    b.ball(0.016, 0, 0.145, 0, '#e05a52');
  } },
  { id: 'cake', name: 'Birthday Cake', emoji: '🎂', cat: 'Kitchen & Bath', color: '#fbfaf7', build: (b) => {
    b.cyl(0.2, 0.2, 0.015, 0, 0, 0, '#dddddd');
    b.cyl(0.16, 0.16, 0.14, 0, 0.015, 0, MAIN);
    b.cyl(0.165, 0.165, 0.025, 0, 0.12, 0, '#ef84ad');
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, x = Math.cos(a) * 0.09, z = Math.sin(a) * 0.09;
      b.cyl(0.008, 0.008, 0.07, x, 0.155, z, ['#93c9ea', '#f7da7e', '#bba6e6', '#aee0c5', '#ec7d72'][i]);
      b.ball(0.012, x, 0.235, z, '#f7cf6a', { emissive: '#ffb703', emissiveIntensity: 1 });
    }
  } },
  { id: 'toilet', name: 'Toilet', emoji: '🚽', cat: 'Kitchen & Bath', color: '#fbfaf7', build: (b) => {
    b.cyl(0.17, 0.2, 0.38, 0, 0, 0.08, WHITE);
    b.cyl(0.21, 0.21, 0.04, 0, 0.38, 0.08, MAIN);
    b.box(0.3, 0.38, 0.15, 0, 0, -0.2, WHITE);
    b.box(0.42, 0.38, 0.18, 0, 0.38, -0.2, WHITE);
    b.box(0.06, 0.02, 0.03, -0.12, 0.7, -0.1, METAL);
  } },
  { id: 'bathtub', name: 'Bathtub', emoji: '🛁', cat: 'Kitchen & Bath', color: '#fbfaf7', build: (b) => {
    b.box(0.8, 0.1, 1.7, 0, 0, 0, MAIN);
    for (const x of [-0.36, 0.36]) b.box(0.08, 0.55, 1.7, x, 0, 0, MAIN);
    for (const z of [-0.81, 0.81]) b.box(0.64, 0.55, 0.08, 0, 0, z, MAIN);
    b.box(0.63, 0.3, 1.53, 0, 0.1, 0, '#8fd3ff', { transparent: true, opacity: 0.75 });
    for (const [x, z] of [[-0.1, 0.3], [0.12, 0.4], [0, 0.55], [-0.15, -0.2], [0.1, 0.1]]) b.ball(0.07, x, 0.42, z, WHITE);
    b.cyl(0.02, 0.02, 0.2, 0, 0.55, -0.78, METAL);
  } },
  { id: 'bathsink', name: 'Sink', emoji: '🚰', cat: 'Kitchen & Bath', color: '#fbfaf7', build: (b) => {
    b.box(0.8, 0.8, 0.5, 0, 0, 0, MAIN);
    b.box(0.82, 0.05, 0.52, 0, 0.8, 0, WHITE);
    b.cyl(0.18, 0.15, 0.01, 0, 0.85, 0.02, '#cfe8ff');
    b.cyl(0.02, 0.02, 0.15, 0, 0.85, -0.18, METAL);
    b.box(0.03, 0.03, 0.12, 0, 0.98, -0.13, METAL);
  } },

  // ---- Decorations ----
  { id: 'rug', name: 'Rug', emoji: '🟪', cat: 'Decorations', color: '#e0d3f5', build: (b) => {
    b.box(2.0, 0.012, 1.4, 0, 0, 0, MAIN);
    b.box(1.7, 0.022, 1.1, 0, 0, 0, '#fbfaf7', { transparent: true, opacity: 0.35 });
  } },
  { id: 'bigrug', name: 'Big Rug', emoji: '🟫', cat: 'Decorations', color: '#d8cfc0', build: (b) => {
    b.box(3.0, 0.012, 2.1, 0, 0, 0, MAIN);
    for (let i = 0; i < 6; i++) b.box(2.8, 0.022, 0.04, 0, 0, -0.9 + i * 0.36, '#bfb4a2');
  } },
  { id: 'roundrug', name: 'Round Rug', emoji: '⭕', cat: 'Decorations', color: '#f6b3c6', build: (b) => {
    b.cyl(0.9, 0.9, 0.012, 0, 0, 0, MAIN, undefined, 48);
    b.cyl(0.6, 0.6, 0.022, 0, 0, 0, '#fbfaf7', { transparent: true, opacity: 0.4 }, 48);
  } },
  { id: 'floorlamp', name: 'Floor Lamp', emoji: '💡', cat: 'Decorations', color: '#f3e7c9', mainOpts: { emissive: '#ffe2a8', emissiveIntensity: 0.6 }, build: (b) => {
    b.cyl(0.18, 0.2, 0.04, 0, 0, 0, BLACK);
    b.cyl(0.015, 0.015, 1.4, 0, 0.04, 0, BLACK);
    b.cyl(0.15, 0.24, 0.3, 0, 1.35, 0, MAIN);
  } },
  { id: 'tablelamp', name: 'Table Lamp', emoji: '🪔', cat: 'Decorations', color: '#f3e7c9', mainOpts: { emissive: '#ffe2a8', emissiveIntensity: 0.6 }, build: (b) => {
    b.cyl(0.07, 0.09, 0.04, 0, 0, 0, '#d1a640');
    b.cyl(0.015, 0.015, 0.25, 0, 0.04, 0, '#d1a640');
    b.cyl(0.09, 0.15, 0.18, 0, 0.25, 0, MAIN);
  } },
  { id: 'plant', name: 'Big Plant', emoji: '🪴', cat: 'Decorations', color: '#f1eee8', build: (b) => {
    b.cyl(0.18, 0.14, 0.3, 0, 0, 0, MAIN);
    b.cyl(0.165, 0.165, 0.02, 0, 0.29, 0, '#5a3d2b');
    for (const [x, y, z, r] of [[0, 0.55, 0, 0.18], [0.12, 0.48, 0.05, 0.13], [-0.1, 0.5, -0.06, 0.14], [0.03, 0.72, -0.04, 0.12], [-0.06, 0.45, 0.1, 0.11]])
      b.ball(r, x, y, z, LEAF);
  } },
  { id: 'smallplant', name: 'Little Plant', emoji: '🌱', cat: 'Decorations', color: '#c96f4a', build: (b) => {
    b.cyl(0.08, 0.06, 0.12, 0, 0, 0, MAIN);
    for (const [x, z, h] of [[0, 0, 0.22], [0.04, 0.02, 0.17], [-0.04, -0.01, 0.18], [0.01, -0.04, 0.15], [-0.02, 0.04, 0.16]])
      b.cone(0.025, h, x, 0.1, z, GREEN);
  } },
  { id: 'flowers', name: 'Flowers', emoji: '💐', cat: 'Decorations', color: '#93c9ea', build: (b) => {
    b.cyl(0.07, 0.09, 0.25, 0, 0, 0, MAIN);
    const fl = [[0, 0.45, 0, '#ef84ad'], [0.07, 0.4, 0.03, '#f7da7e'], [-0.06, 0.42, -0.02, '#bba6e6'], [0.02, 0.38, -0.07, '#ec7d72'], [-0.03, 0.39, 0.07, '#fbfaf7']];
    for (const [x, y, z, c] of fl) { b.cyl(0.006, 0.006, y - 0.2, x * 0.6, 0.2, z * 0.6, GREEN); b.ball(0.04, x, y, z, c); }
  } },
  { id: 'globe', name: 'Globe', emoji: '🌍', cat: 'Decorations', color: '#d1a640', build: (b) => {
    b.cyl(0.08, 0.1, 0.03, 0, 0, 0, MAIN);
    b.cyl(0.012, 0.012, 0.1, 0, 0.03, 0, MAIN);
    b.ball(0.15, 0, 0.27, 0, shared.globe()).rotation.z = 0.4;
    const ring = b.add(new THREE.TorusGeometry(0.165, 0.008, 8, 40), MAIN, 0, 0.27, 0);
    ring.rotation.y = Math.PI / 2; ring.rotation.x = 0.4;
  } },
  { id: 'books', name: 'Books', emoji: '📖', cat: 'Decorations', color: '#ec7d72', build: (b) => {
    b.box(0.25, 0.05, 0.18, 0, 0, 0, '#93c9ea');
    b.box(0.23, 0.04, 0.17, 0.01, 0.05, 0, '#f7da7e').rotation.y = 0.2;
    b.box(0.24, 0.05, 0.18, -0.01, 0.09, 0, MAIN).rotation.y = -0.15;
  } },
  { id: 'pillow', name: 'Pillow', emoji: '🟦', cat: 'Decorations', color: '#93c9ea', build: (b) => { b.box(0.45, 0.14, 0.45, 0, 0, 0, MAIN); } },
  { id: 'doormat', name: 'Doormat', emoji: '🟫', cat: 'Decorations', color: '#6b5843', build: (b) => { b.box(0.9, 0.015, 0.55, 0, 0, 0, MAIN); } },
  { id: 'fireplace', name: 'Fireplace', emoji: '🔥', cat: 'Decorations', color: '#fbfaf7', fixed: true, hidden: true, build: (b) => {
    b.box(1.7, 2.6, 0.5, 0, 0, 0, shared.brick());
    b.box(1.9, 0.15, 0.45, 0, 0, 0.47, shared.brick());
    b.box(1.0, 0.75, 0.02, 0, 0.25, 0.26, '#262323');
    b.box(1.9, 0.08, 0.32, 0, 1.25, 0.38, MAIN);
    b.box(1.75, 0.12, 0.06, 0, 1.13, 0.28, MAIN);
    const fire = new THREE.Group(); fire.name = 'fire';
    const flame = (r, h, x, c) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), new THREE.MeshBasicMaterial({ color: c }));
      m.position.set(x, 0.27 + h / 2, 0.33); fire.add(m);
    };
    flame(0.07, 0.3, -0.12, '#ff7b00'); flame(0.09, 0.38, 0.02, '#ff9e00'); flame(0.06, 0.26, 0.15, '#ff7b00'); flame(0.04, 0.2, -0.03, '#ffd60a');
    b.group.add(fire);
    const light = new THREE.PointLight('#ff9a3c', 1.5, 4, 2); light.position.set(0, 0.5, 0.7); light.name = 'firelight';
    b.group.add(light);
    for (const x of [-0.1, 0.1]) b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 10), '#5a3d2b', x, 0.3, 0.33).rotation.z = Math.PI / 2 + x;
  } },

  // ---- Wall Stuff ----
  { id: 'picture', name: 'Picture', emoji: '🖼️', cat: 'Wall Stuff', wall: true, color: '#34302f', build: (b) => {
    b.box(0.6, 0.45, 0.03, 0, -0.225, 0.015, MAIN);
    b.box(0.52, 0.37, 0.01, 0, -0.185, 0.035, shared.landscapeStd());
  } },
  { id: 'painting', name: 'Big Painting', emoji: '🏞️', cat: 'Wall Stuff', wall: true, color: '#b08d57', build: (b) => {
    b.box(1.1, 0.7, 0.04, 0, -0.35, 0.02, MAIN);
    b.box(1.0, 0.6, 0.01, 0, -0.3, 0.045, shared.landscapeStd());
  } },
  { id: 'gallery', name: 'Photo Wall', emoji: '🖼️', cat: 'Wall Stuff', wall: true, color: '#2a2727', build: (b) => {
    const photos = ['#f4d6e0', '#cfe8ff', '#fff3c4', '#dcf5e3', '#e9dcff', '#ffd9c2'];
    const frames = [[-0.45, 0.3, 0.22, 0.18], [-0.15, 0.32, 0.3, 0.22], [0.2, 0.3, 0.24, 0.2], [0.48, 0.32, 0.2, 0.16],
      [-0.42, 0.02, 0.26, 0.2], [-0.1, 0.0, 0.22, 0.28], [0.2, 0.02, 0.3, 0.22], [0.48, -0.02, 0.18, 0.24],
      [-0.4, -0.28, 0.22, 0.18], [-0.1, -0.3, 0.26, 0.2], [0.22, -0.28, 0.22, 0.18], [0.48, -0.3, 0.2, 0.16]];
    frames.forEach(([x, y, w, h], i) => {
      b.box(w, h, 0.02, x, y - h / 2, 0.01, MAIN);
      b.box(w - 0.04, h - 0.04, 0.006, x, y - h / 2 + 0.02, 0.03, photos[i % photos.length]);
      b.ball(0.025, x, y - 0.01, 0.034, '#c08a6a').scale.z = 0.2;
    });
  } },
  // a clock with numbers that shows the real time
  { id: 'clock', name: 'Clock', emoji: '🕰️', cat: 'Wall Stuff', wall: true, color: '#34302f', animate: (g) => {
    const d = new Date(), h = (d.getHours() % 12) + d.getMinutes() / 60, m = d.getMinutes() + d.getSeconds() / 60;
    const hh = g.getObjectByName('hour'), mm = g.getObjectByName('minute'), ss = g.getObjectByName('second');
    if (hh) hh.rotation.z = -(h / 12) * Math.PI * 2;
    if (mm) mm.rotation.z = -(m / 60) * Math.PI * 2;
    if (ss) ss.rotation.z = -(d.getSeconds() / 60) * Math.PI * 2;
  }, build: (b) => {
    b.disc(0.22, 0.03, 0, 0, 0.015, MAIN);
    b.add(new THREE.CircleGeometry(0.197, 40), new THREE.MeshStandardMaterial({ map: clockFace(), roughness: 0.6 }), 0, 0, 0.037).name = 'face';
    const hour = b.sub('hour', 0, 0, 0.042); hour.box(0.016, 0.095, 0.005, 0, -0.012, 0, BLACK);
    const minute = b.sub('minute', 0, 0, 0.048); minute.box(0.011, 0.145, 0.005, 0, -0.015, 0, BLACK);
    const second = b.sub('second', 0, 0, 0.054); second.box(0.004, 0.16, 0.004, 0, -0.03, 0, '#d9443a');
    b.ball(0.012, 0, 0, 0.058, BLACK);
  } },
  { id: 'digitalclock', name: 'Digital Clock', emoji: '⏰', cat: 'Wall Stuff', wall: true, color: '#2a2727', animate: (g) => {
    const s = g.getObjectByName('screen');
    if (s) s.userData.draw?.();
  }, build: (b) => {
    b.box(0.6, 0.26, 0.05, 0, -0.13, 0.025, MAIN);
    const screen = b.add(new THREE.PlaneGeometry(0.54, 0.2), digitalScreen(), 0, 0, 0.057);
    screen.name = 'screen';
    screen.userData.draw = screen.material.userData.draw;
  } },

  { id: 'poster', name: 'Poster', emoji: '⭐', cat: 'Wall Stuff', wall: true, color: '#bba6e6', build: (b) => {
    b.box(0.5, 0.7, 0.01, 0, -0.35, 0.005, MAIN);
    b.ball(0.12, 0, 0.06, 0.012, '#f7da7e').scale.z = 0.05;
    b.ball(0.06, -0.12, -0.18, 0.012, '#ef84ad').scale.z = 0.05;
    b.ball(0.05, 0.13, -0.2, 0.012, '#93c9ea').scale.z = 0.05;
  } },
  { id: 'mirror', name: 'Mirror', emoji: '🪞', cat: 'Wall Stuff', wall: true, color: '#2a2727', build: (b) => {
    b.box(0.6, 0.85, 0.03, 0, -0.425, 0.015, MAIN);
    b.box(0.52, 0.77, 0.01, 0, -0.385, 0.035, '#dfeef7', { metalness: 0.4, roughness: 0.05 });
  } },
  { id: 'walltv', name: 'Wall TV', emoji: '📺', cat: 'Wall Stuff', wall: true, color: '#262323', build: (b) => {
    b.box(1.6, 0.92, 0.05, 0, -0.46, 0.025, MAIN);
    b.box(1.54, 0.86, 0.006, 0, -0.43, 0.058, '#0e1116', { roughness: 0.2 });
  } },
  { id: 'uppercab', name: 'Wall Cabinet', emoji: '🚪', cat: 'Wall Stuff', wall: true, color: '#34503f', build: (b) => {
    b.box(0.95, 0.7, 0.35, 0, -0.35, 0.175, MAIN);
    b.box(0.012, 0.66, 0.008, 0, -0.33, 0.356, '#1e3326');
    for (const x of [-0.05, 0.05]) b.box(0.015, 0.12, 0.02, x, -0.3, 0.36, '#d1a640');
  } },
  { id: 'wallshelf', name: 'Wall Shelf', emoji: '➖', cat: 'Wall Stuff', wall: true, color: '#fbfaf7', build: (b) => { b.box(0.8, 0.04, 0.22, 0, -0.02, 0.11, MAIN); } },
  { id: 'lights', name: 'Twinkle Lights', emoji: '✨', cat: 'Wall Stuff', wall: true, color: '#2f6b3a', build: (b) => {
    const cols = ['#ec7d72', '#f7da7e', '#93c9ea', '#aee0c5', '#ef84ad', '#bba6e6'];
    for (let i = 0; i < 13; i++) {
      const x = -0.6 + i * 0.1, y = -0.06 * Math.sin((i / 12) * Math.PI);
      b.box(0.1, 0.006, 0.006, x + 0.05, y - 0.003, 0.02, MAIN);
      b.ball(0.022, x, y - 0.02, 0.03, cols[i % cols.length], { emissive: cols[i % cols.length], emissiveIntensity: 0.9 });
    }
  } },

  // ---- Toys & Pets ----
  { id: 'teddy', name: 'Teddy Bear', emoji: '🧸', cat: 'Toys & Pets', color: '#b07f55', build: (b) => {
    b.ball(0.13, 0, 0.13, 0, MAIN);
    b.ball(0.09, 0, 0.32, 0, MAIN);
    for (const x of [-0.07, 0.07]) { b.ball(0.035, x, 0.4, 0, MAIN); b.ball(0.045, x * 1.9, 0.18, 0.03, MAIN); b.ball(0.05, x, 0.05, 0.07, MAIN); }
    b.ball(0.035, 0, 0.31, 0.08, '#f1e3d3');
    for (const x of [-0.03, 0.03]) b.ball(0.012, x, 0.35, 0.08, BLACK);
  } },
  { id: 'dog', name: 'Doggy', emoji: '🐕', cat: 'Toys & Pets', color: '#2a2727', build: (b) => {
    b.box(0.28, 0.25, 0.6, 0, 0.22, 0, MAIN);
    for (const [x, z] of [[-0.09, -0.22], [0.09, -0.22], [-0.09, 0.22], [0.09, 0.22]]) {
      b.box(0.07, 0.24, 0.07, x, 0, z, MAIN);
      b.box(0.075, 0.04, 0.085, x, 0, z + 0.005, WHITE);
    }
    b.box(0.2, 0.2, 0.22, 0, 0.4, 0.36, MAIN);
    b.box(0.11, 0.09, 0.12, 0, 0.41, 0.51, MAIN);
    b.box(0.12, 0.1, 0.012, 0, 0.28, 0.306, WHITE);
    b.ball(0.022, 0, 0.47, 0.57, BLACK);
    for (const x of [-0.11, 0.11]) { b.box(0.04, 0.13, 0.09, x, 0.36, 0.33, MAIN); b.ball(0.018, x * 0.5, 0.53, 0.47, '#d9a441'); }
    b.cyl(0.02, 0.025, 0.28, 0, 0.3, -0.38, MAIN).rotation.x = -0.9;
  } },
  { id: 'cat', name: 'Kitty', emoji: '🐈', cat: 'Toys & Pets', color: '#f2a25f', build: (b) => {
    b.box(0.18, 0.16, 0.36, 0, 0.08, 0, MAIN);
    for (const [x, z] of [[-0.06, -0.13], [0.06, -0.13], [-0.06, 0.13], [0.06, 0.13]]) b.box(0.04, 0.08, 0.04, x, 0, z, MAIN);
    b.box(0.16, 0.14, 0.14, 0, 0.2, 0.22, MAIN);
    for (const x of [-0.05, 0.05]) { b.cone(0.035, 0.07, x, 0.33, 0.22, MAIN, undefined, 4); b.ball(0.015, x * 0.8, 0.29, 0.29, '#3fbf3f'); }
    b.cyl(0.02, 0.02, 0.25, 0, 0.12, -0.25, MAIN).rotation.x = -0.6;
  } },
  { id: 'ball', name: 'Ball', emoji: '⚽', cat: 'Toys & Pets', color: '#ec7d72', build: (b) => { b.ball(0.12, 0, 0.12, 0, MAIN); b.cyl(0.121, 0.121, 0.03, 0, 0.105, 0, '#fbfaf7'); } },
  { id: 'toybox', name: 'Toy Box', emoji: '🧰', cat: 'Toys & Pets', color: '#93c9ea', build: (b) => {
    b.box(0.8, 0.45, 0.45, 0, 0, 0, MAIN);
    b.box(0.82, 0.05, 0.47, 0, 0.45, 0, '#f7da7e');
    b.ball(0.06, 0, 0.25, 0.226, '#ef84ad').scale.z = 0.1;
  } },
  { id: 'beanbag', name: 'Bean Bag', emoji: '🫘', cat: 'Toys & Pets', color: '#93c9ea', build: (b) => { b.ball(0.45, 0, 0.3, 0, MAIN).scale.set(1, 0.66, 1); } },
  { id: 'activitytable', name: 'Play Table', emoji: '🧩', cat: 'Toys & Pets', color: LIGHT_WOOD, build: (b) => {
    b.box(1.4, 0.05, 0.8, 0, 0.55, 0, MAIN);
    b.legs(1.4, 0.8, 0.55, 0.07, MAIN);
    b.box(1.3, 0.03, 0.7, 0, 0.1, 0, MAIN);
    for (const x of [-0.33, 0.33]) b.box(0.6, 0.25, 0.62, x, 0.13, 0, WHITE);
  } },
  { id: 'kidchair', name: 'Little Chair', emoji: '🪑', cat: 'Toys & Pets', color: LIGHT_WOOD, build: (b) => {
    b.legs(0.3, 0.3, 0.3, 0.03, MAIN);
    b.box(0.32, 0.03, 0.32, 0, 0.3, 0, MAIN);
    b.box(0.32, 0.25, 0.03, 0, 0.33, -0.145, MAIN);
  } },
  { id: 'toykitchen', name: 'Toy Kitchen', emoji: '🍳', cat: 'Toys & Pets', color: '#f4a3c4', build: (b) => {
    b.box(0.8, 0.65, 0.35, 0, 0, 0, MAIN);
    b.box(0.82, 0.04, 0.37, 0, 0.65, 0, '#9aa5b1');
    b.box(0.8, 0.45, 0.05, 0, 0.69, -0.15, '#fbfaf7');
    b.box(0.3, 0.25, 0.01, -0.18, 0.15, 0.176, '#888888');
    b.box(0.22, 0.15, 0.008, -0.18, 0.2, 0.188, '#333333');
    for (const x of [0.1, 0.25]) b.cyl(0.05, 0.05, 0.01, x, 0.69, 0.02, '#555');
    b.cyl(0.012, 0.012, 0.15, -0.2, 0.69, -0.08, METAL);
  } },
  { id: 'toycar', name: 'Pink Ride-On Car', emoji: '🏎️', cat: 'Toys & Pets', color: '#ef84ad', build: (b) => {
    b.box(0.5, 0.25, 0.8, 0, 0.1, 0, MAIN);
    b.box(0.4, 0.2, 0.3, 0, 0.35, -0.2, MAIN);
    b.box(0.36, 0.05, 0.25, 0, 0.35, 0.05, '#34302f');
    for (const [x, z] of [[-0.27, -0.25], [0.27, -0.25], [-0.27, 0.25], [0.27, 0.25]]) b.cyl(0.1, 0.1, 0.06, x, 0.0, z, '#333').rotation.z = Math.PI / 2;
    b.add(new THREE.TorusGeometry(0.08, 0.015, 8, 20), '#93c9ea', 0, 0.48, 0.2).rotation.x = -1;
  } },

  // ---- Outside ----
  { id: 'toytruck', name: 'Ride-On Truck', emoji: '🛻', cat: 'Outside', color: '#fbfaf7', build: (b) => {
    b.box(0.65, 0.32, 1.2, 0, 0.12, 0, MAIN);
    b.box(0.6, 0.26, 0.45, 0, 0.44, -0.05, MAIN);
    b.box(0.55, 0.2, 0.02, 0, 0.47, 0.18, '#222');
    for (const [x, z] of [[-0.33, -0.38], [0.33, -0.38], [-0.33, 0.38], [0.33, 0.38]]) {
      const w = b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20), '#222', x, 0.16, z); w.rotation.z = Math.PI / 2;
    }
    b.box(0.55, 0.03, 0.01, 0, 0.38, 0.601, '#fbfaf7', { emissive: '#fbfaf7', emissiveIntensity: 1 });
  } },
  { id: 'swing', name: 'Porch Swing', emoji: '🪢', cat: 'Outside', color: '#6b5d52', build: (b) => {
    for (const sx of [-1.05, 1.05]) for (const sz of [-1, 1]) {
      const leg = b.box(0.06, 2.0, 0.06, sx, 0, sz * 0.25, '#5c5248'); leg.rotation.x = -sz * 0.25;
    }
    b.box(2.2, 0.07, 0.07, 0, 1.92, 0, '#5c5248');
    b.box(1.5, 0.06, 0.55, 0, 0.5, 0, MAIN);
    b.box(1.5, 0.5, 0.06, 0, 0.53, -0.26, MAIN);
    for (const x of [-0.72, 0.72]) b.cyl(0.008, 0.008, 1.36, x, 0.56, 0, '#888');
    b.box(2.1, 0.03, 0.95, 0, 2.0, 0, MAIN);
  } },
  { id: 'patiochair', name: 'Patio Chair', emoji: '🪑', cat: 'Outside', color: '#5a4636', build: (b) => {
    b.box(0.75, 0.4, 0.75, 0, 0, 0, MAIN);
    b.box(0.75, 0.5, 0.15, 0, 0.4, -0.3, MAIN);
    for (const x of [-0.33, 0.33]) b.box(0.1, 0.22, 0.65, x, 0.4, 0.05, MAIN);
    b.box(0.55, 0.08, 0.58, 0, 0.4, 0.06, '#d9d2c3');
  } },
  { id: 'firepit', name: 'Fire Pit', emoji: '🔥', cat: 'Outside', color: '#8d8a85', build: (b) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.box(0.24, 0.25, 0.14, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, MAIN).rotation.y = -a + Math.PI / 2;
    }
    b.cyl(0.45, 0.45, 0.02, 0, 0, 0, '#2a2522');
    for (const r of [0.4, -0.5]) b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), '#5a3d2b', 0, 0.06, 0).rotation.set(Math.PI / 2, 0, r);
  } },
  { id: 'tree', name: 'Little Tree', emoji: '🌳', cat: 'Outside', color: '#5a9a4e', build: (b) => {
    b.cyl(0.07, 0.09, 0.9, 0, 0, 0, '#6b4a2b');
    b.ball(0.5, 0, 1.25, 0, MAIN);
    b.ball(0.35, 0.25, 1.05, 0.1, MAIN);
  } },
  // ---- More toys ----
  { id: 'dino', name: 'Dino Toy', emoji: '🦕', cat: 'Toys & Pets', color: '#7cc57a', build: (b) => {
    b.ball(0.14, 0, 0.16, 0, MAIN).scale.set(0.8, 0.8, 1.2);
    b.cyl(0.05, 0.07, 0.25, 0, 0.18, 0.15, MAIN).rotation.x = 0.5;
    b.ball(0.08, 0, 0.42, 0.26, MAIN).scale.z = 1.3;
    b.cyl(0.02, 0.07, 0.3, 0, 0.1, -0.25, MAIN).rotation.x = -1.2;
    for (const [x, z] of [[-0.07, -0.08], [0.07, -0.08], [-0.07, 0.08], [0.07, 0.08]]) b.cyl(0.035, 0.035, 0.08, x, 0, z, MAIN);
    for (let i = 0; i < 4; i++) b.cone(0.025, 0.06, 0, 0.27 - i * 0.02, 0.05 - i * 0.08, P.butter, undefined, 4);
    for (const x of [-0.04, 0.04]) b.ball(0.014, x, 0.46, 0.34, BLACK);
  } },
  { id: 'robot', name: 'Robot Toy', emoji: '🤖', cat: 'Toys & Pets', color: '#a9b4c2', mainOpts: { metalness: 0.3, roughness: 0.4 }, build: (b) => {
    for (const x of [-0.05, 0.05]) b.box(0.06, 0.1, 0.08, x, 0, 0, MAIN);
    b.box(0.2, 0.18, 0.13, 0, 0.1, 0, MAIN);
    b.box(0.1, 0.06, 0.012, 0, 0.17, 0.068, P.sky, { emissive: P.sky, emissiveIntensity: 0.6 });
    for (const x of [-0.13, 0.13]) b.box(0.05, 0.14, 0.05, x, 0.12, 0, MAIN);
    b.box(0.16, 0.12, 0.12, 0, 0.29, 0, MAIN);
    for (const x of [-0.04, 0.04]) b.ball(0.018, x, 0.36, 0.06, P.butter, { emissive: P.butter, emissiveIntensity: 0.8 });
    b.cyl(0.006, 0.006, 0.06, 0, 0.41, 0, BLACK);
    b.ball(0.018, 0, 0.48, 0, P.coral, { emissive: P.coral, emissiveIntensity: 0.6 });
  } },
  { id: 'unicorn', name: 'Unicorn Plush', emoji: '🦄', cat: 'Toys & Pets', color: '#fbfaf7', build: (b) => {
    b.ball(0.12, 0, 0.17, 0, MAIN).scale.set(0.85, 0.8, 1.25);
    for (const [x, z] of [[-0.06, -0.09], [0.06, -0.09], [-0.06, 0.09], [0.06, 0.09]]) b.cyl(0.03, 0.03, 0.12, x, 0, z, MAIN);
    b.ball(0.08, 0, 0.32, 0.14, MAIN).scale.z = 1.25;
    b.cone(0.018, 0.1, 0, 0.38, 0.17, P.gold, { metalness: 0.4, roughness: 0.3 });
    for (let i = 0; i < 4; i++) b.ball(0.035, 0, 0.36 - i * 0.04, 0.09 - i * 0.04, [P.bubblegum, P.lavender, P.sky, P.mint][i]);
    b.ball(0.05, 0, 0.2, -0.17, P.lavender).scale.y = 1.5;
    for (const x of [-0.035, 0.035]) b.ball(0.012, x, 0.34, 0.23, BLACK);
  } },
  { id: 'balloons', name: 'Balloons', emoji: '🎈', cat: 'Decorations', color: '#ef84ad', animate: (g, t) => { const s = g.getObjectByName('sway'); if (s) s.rotation.z = Math.sin(t * 1.3 + g.position.x) * 0.06; }, build: (b) => {
    b.cyl(0.05, 0.06, 0.06, 0, 0, 0, P.charcoal);
    const s = b.sub('sway', 0, 0.06, 0);
    const cols = [MAIN, P.sky, P.butter];
    [[-0.12, 1.25, 0], [0.1, 1.35, 0.05], [0, 1.5, -0.08]].forEach(([x, y, z], i) => {
      s.ball(0.15, x, y, z, cols[i]).scale.y = 1.2;
      s.cyl(0.003, 0.003, y - 0.15, x / 2, 0, z / 2, '#dddddd').rotation.z = -x * 0.15;
    });
  } },
  { id: 'icecream', name: 'Ice Cream Cone', emoji: '🍦', cat: 'Kitchen & Bath', color: '#f6b3c6', build: (b) => {
    b.add(new THREE.ConeGeometry(0.045, 0.16, 16), '#d6a878', 0, 0.08, 0).rotation.x = Math.PI;
    b.ball(0.052, 0, 0.18, 0, P.cream);
    b.ball(0.048, 0, 0.25, 0, MAIN);
    b.ball(0.014, 0, 0.305, 0, P.coral);
  } },
  { id: 'cafetable', name: 'Cafe Table', emoji: '🍨', cat: 'Furniture', color: '#fbfaf7', build: (b) => {
    b.cyl(0.25, 0.28, 0.03, 0, 0, 0, P.charcoal);
    b.cyl(0.03, 0.03, 0.7, 0, 0.03, 0, P.charcoal);
    b.cyl(0.42, 0.42, 0.04, 0, 0.72, 0, MAIN, undefined, 32);
  } },
  { id: 'stool', name: 'Stool', emoji: '🪑', cat: 'Furniture', color: '#ef84ad', build: (b) => {
    b.cyl(0.18, 0.2, 0.03, 0, 0, 0, P.metal);
    b.cyl(0.025, 0.025, 0.55, 0, 0.03, 0, P.metal);
    b.cyl(0.2, 0.19, 0.08, 0, 0.56, 0, MAIN, undefined, 28);
  } },
  { id: 'storeshelf', name: 'Store Shelf', emoji: '🗄️', cat: 'Furniture', color: '#93c9ea', build: (b) => {
    b.box(1.6, 1.5, 0.04, 0, 0, -0.2, MAIN);
    for (const x of [-0.78, 0.78]) b.box(0.04, 1.5, 0.44, x, 0, 0, MAIN);
    for (const y of [0, 0.5, 1.0, 1.46]) b.box(1.56, 0.04, 0.44, 0, y, 0, MAIN);
  } },
  { id: 'icecreamcounter', name: 'Ice Cream Counter', emoji: '🍨', cat: 'Kitchen & Bath', color: '#f6b3c6', fixed: true, hidden: true, action: 'icecream', build: (b) => {
    b.box(2.4, 1.0, 0.7, 0, 0, 0, MAIN);
    b.box(2.44, 0.05, 0.74, 0, 1.0, 0, P.white);
    b.box(2.2, 0.4, 0.5, 0, 1.05, 0.05, '#cfeaff', { transparent: true, opacity: 0.35, roughness: 0.05 });
    const flavors = [P.bubblegum, P.cream, '#8a5a3c', P.mint, P.butter, P.lavender];
    flavors.forEach((c, i) => { b.cyl(0.13, 0.13, 0.08, -0.9 + i * 0.36, 1.05, 0.05, P.metal); b.ball(0.12, -0.9 + i * 0.36, 1.14, 0.05, c).scale.y = 0.6; });
    b.add(new THREE.ConeGeometry(0.15, 0.5, 16), '#d6a878', -1.0, 1.35, -0.25).rotation.x = Math.PI;
    b.ball(0.17, -1.0, 1.66, -0.25, P.bubblegum);
    for (let i = 0; i < 6; i++) b.box(0.32, 0.9, 0.014, -1.0 + i * 0.4, 0.05, 0.357, i % 2 ? P.white : MAIN);
  } },
  { id: 'register', name: 'Toy Counter', emoji: '🎁', cat: 'Toys & Pets', color: '#93c9ea', fixed: true, hidden: true, action: 'toy', build: (b) => {
    b.box(1.6, 0.95, 0.6, 0, 0, 0, MAIN);
    b.box(1.64, 0.05, 0.64, 0, 0.95, 0, P.white);
    b.box(0.35, 0.18, 0.3, 0.45, 1.0, 0, P.charcoal);
    b.box(0.25, 0.12, 0.02, 0.45, 1.06, 0.16, P.mint, { emissive: P.mint, emissiveIntensity: 0.4 });
    b.cyl(0.1, 0.12, 0.2, -0.4, 1.0, 0, P.coral);
    b.ball(0.18, -0.4, 1.36, 0, '#e8f6ff', { transparent: true, opacity: 0.35 });
    for (let i = 0; i < 14; i++) b.ball(0.035, -0.4 + Math.sin(i * 2.4) * 0.09, 1.27 + (i % 4) * 0.04, Math.cos(i * 2.4) * 0.09, [P.butter, P.bubblegum, P.sky, P.mint, P.lavender][i % 5]);
    b.ball(0.05, -0.4, 1.56, 0, P.coral);
    b.box(0.6, 0.3, 0.014, 0, 0.35, 0.307, P.butter);
  } },

  // ---- Playground & Park ----
  { id: 'slide', name: 'Slide', emoji: '🛝', cat: 'Outside', color: '#ec7d72', build: (b) => {
    for (const x of [-0.35, 0.35]) for (const z of [-1.0, -0.4]) b.box(0.07, 1.5, 0.07, x, 0, z, P.butter);
    b.box(0.8, 0.06, 0.7, 0, 1.2, -0.7, P.butter);
    for (let i = 1; i < 6; i++) b.box(0.6, 0.04, 0.08, 0, i * 0.2, -1.05, P.sky);
    b.box(0.6, 0.05, 2.0, 0, 0.6, 0.45, MAIN).rotation.x = 0.62;
    for (const x of [-0.31, 0.31]) b.box(0.04, 0.15, 2.0, x, 0.62, 0.45, MAIN).rotation.x = 0.62;
  } },
  { id: 'swingset', name: 'Swing Set', emoji: '🪢', cat: 'Outside', color: '#93c9ea', animate: (g, t) => {
    for (let i = 0; i < 2; i++) { const s = g.getObjectByName('swing' + i); if (s) s.rotation.x = g.userData.swingA?.[i] ?? Math.sin(t * 1.6 + i * 1.7) * 0.35; }
  }, build: (b) => {
    for (const x of [-1.2, 1.2]) for (const z of [-1, 1]) b.box(0.07, 2.2, 0.07, x, 0, z * 0.3, MAIN).rotation.x = -z * 0.276; // A-frame legs that meet at the top bar
    b.box(2.6, 0.08, 0.08, 0, 2.1, 0, MAIN);
    [-0.55, 0.55].forEach((x, i) => {
      const s = b.sub('swing' + i, x, 2.1, 0);
      for (const dx of [-0.2, 0.2]) s.box(0.015, 1.65, 0.015, dx, -1.65, 0, '#9a9a9a');
      s.box(0.5, 0.04, 0.2, 0, -1.7, 0, [P.coral, P.butter][i]);
    });
  } },
  { id: 'sandbox', name: 'Sandbox', emoji: '🏖️', cat: 'Outside', color: '#b07f55', build: (b) => {
    for (const s of [-1, 1]) { b.box(2.0, 0.25, 0.1, 0, 0, s * 0.95, MAIN); b.box(0.1, 0.25, 2.0, s * 0.95, 0, 0, MAIN); }
    b.box(1.8, 0.18, 1.8, 0, 0, 0, '#f2dfa7');
    b.cyl(0.1, 0.08, 0.16, 0.4, 0.18, 0.3, P.coral);
    b.box(0.08, 0.02, 0.3, -0.4, 0.18, -0.2, P.sky);
    b.ball(0.18, -0.3, 0.2, 0.35, '#f2dfa7').scale.y = 0.6;
  } },
  { id: 'merrygoround', name: 'Merry-Go-Round', emoji: '🎠', cat: 'Outside', color: '#bba6e6', animate: (g, t) => {
    const s = g.getObjectByName('spin'), u = g.userData;
    const dt = u.lastT === undefined ? 0 : Math.min(0.1, t - u.lastT);
    u.lastT = t;
    u.spinA = (u.spinA ?? 0) + dt * (u.spinFast ? 2.4 : 0.6);
    if (s) s.rotation.y = u.spinA;
  }, build: (b) => {
    b.cyl(0.15, 0.2, 0.15, 0, 0, 0, P.charcoal);
    const s = b.sub('spin');
    s.cyl(1.0, 1.0, 0.08, 0, 0.15, 0, MAIN, undefined, 40);
    s.cyl(0.05, 0.05, 0.9, 0, 0.23, 0, P.butter);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      s.box(0.05, 0.05, 0.85, Math.cos(a) * 0.45, 0.95, Math.sin(a) * 0.45, P.butter).rotation.y = -a + Math.PI / 2;
      s.box(0.04, 0.7, 0.04, Math.cos(a) * 0.85, 0.23, Math.sin(a) * 0.85, P.butter);
      s.box(0.3, 0.012, 0.3, Math.cos(a + 0.8) * 0.6, 0.23, Math.sin(a + 0.8) * 0.6, [P.bubblegum, P.sky, P.mint, P.butter][i]);
    }
  } },
  { id: 'trampoline', name: 'Trampoline', emoji: '🤸', cat: 'Outside', color: '#93c9ea', build: (b) => {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.cyl(0.03, 0.03, 0.55, Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2, P.charcoal); }
    b.cyl(1.2, 1.2, 0.03, 0, 0.53, 0, '#2c2c34', undefined, 40);
    b.add(new THREE.TorusGeometry(1.25, 0.09, 10, 48), MAIN, 0, 0.56, 0).rotation.x = Math.PI / 2;
  } },
  { id: 'bench', name: 'Park Bench', emoji: '🪑', cat: 'Outside', color: '#b07f55', build: (b) => {
    for (const z of [-0.12, 0, 0.12]) b.box(1.5, 0.04, 0.1, 0, 0.42, z, MAIN);
    for (const y of [0.55, 0.7]) b.box(1.5, 0.09, 0.03, 0, y, -0.2, MAIN);
    for (const x of [-0.65, 0.65]) { b.box(0.05, 0.42, 0.4, x, 0, 0, P.charcoal); b.box(0.05, 0.4, 0.04, x, 0.42, -0.21, P.charcoal); }
  } },
  { id: 'picnictable', name: 'Picnic Table', emoji: '🧺', cat: 'Outside', color: '#b07f55', build: (b) => {
    b.box(1.8, 0.05, 0.75, 0, 0.72, 0, MAIN);
    for (const z of [-0.6, 0.6]) b.box(1.8, 0.05, 0.28, 0, 0.42, z, MAIN);
    for (const x of [-0.7, 0.7]) { b.box(0.07, 0.72, 0.07, x, 0, 0, MAIN); b.box(0.07, 0.06, 1.5, x, 0.36, 0, MAIN); }
    b.box(0.8, 0.012, 0.6, 0, 0.77, 0, P.coral);
  } },
  { id: 'flowerbed', name: 'Flower Bed', emoji: '🌷', cat: 'Outside', color: '#b07f55', build: (b) => {
    b.box(1.2, 0.25, 0.6, 0, 0, 0, MAIN);
    b.box(1.1, 0.02, 0.5, 0, 0.24, 0, '#5a3d2b');
    const cols = [P.bubblegum, P.butter, P.lavender, P.coral, P.white, P.sky];
    for (let i = 0; i < 10; i++) {
      const x = -0.45 + (i % 5) * 0.22, z = i < 5 ? -0.12 : 0.12;
      b.cyl(0.008, 0.008, 0.15, x, 0.25, z, P.leaf);
      b.ball(0.045, x, 0.42, z, cols[i % cols.length]);
    }
  } },
  { id: 'fence', name: 'Fence', emoji: '🚧', cat: 'Outside', color: '#fbfaf7', build: (b) => {
    for (const y of [0.3, 0.7]) b.box(2.0, 0.07, 0.04, 0, y, -0.03, MAIN);
    for (let i = 0; i < 11; i++) { b.box(0.09, 0.9, 0.025, -0.95 + i * 0.19, 0, 0, MAIN); b.cone(0.064, 0.08, -0.95 + i * 0.19, 0.9, 0, MAIN, undefined, 4); }
  } },
  { id: 'streetlamp', name: 'Street Lamp', emoji: '🏮', cat: 'Outside', color: '#34503f', build: (b) => {
    b.cyl(0.14, 0.16, 0.3, 0, 0, 0, MAIN);
    b.cyl(0.05, 0.05, 3.0, 0, 0.3, 0, MAIN);
    b.box(0.3, 0.38, 0.3, 0, 3.25, 0, P.white, { emissive: P.lampGlow, emissiveIntensity: 1.3 });
    b.cone(0.26, 0.22, 0, 3.63, 0, MAIN, undefined, 4).rotation.y = Math.PI / 4;
  } },
  { id: 'mailbox', name: 'Mailbox', emoji: '📫', cat: 'Outside', color: '#93c9ea', build: (b) => {
    b.box(0.08, 1.0, 0.08, 0, 0, 0, WOOD);
    b.box(0.24, 0.2, 0.45, 0, 1.0, 0.05, MAIN);
    b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 20, 1, false, 0, Math.PI), MAIN, 0, 1.2, 0.05).rotation.set(Math.PI / 2, 0, Math.PI / 2);
    b.box(0.02, 0.18, 0.06, 0.13, 1.1, 0.12, P.coral);
  } },
  { id: 'hydrant', name: 'Fire Hydrant', emoji: '🚒', cat: 'Outside', color: '#ec7d72', build: (b) => {
    b.cyl(0.15, 0.17, 0.06, 0, 0, 0, MAIN);
    b.cyl(0.12, 0.13, 0.5, 0, 0.06, 0, MAIN);
    b.ball(0.12, 0, 0.56, 0, MAIN);
    b.cyl(0.03, 0.03, 0.06, 0, 0.66, 0, MAIN);
    for (const x of [-0.15, 0.15]) b.cyl(0.05, 0.05, 0.08, x, 0.34, 0, P.metal).rotation.z = Math.PI / 2;
  } },
  { id: 'car', name: 'Car', emoji: '🚗', cat: 'Outside', color: '#93c9ea', action: 'drive', seat: { x: 0.36, z: -0.12, eye: 1.08 }, mainOpts: { roughness: 0.35, metalness: 0.15 }, build: (b) => {
    b.box(1.8, 0.55, 4.0, 0, 0.3, 0, MAIN);
    b.box(1.56, 0.45, 1.9, 0, 0.85, -0.25, '#cfe6f2', GLASS);
    b.box(1.64, 0.07, 2.02, 0, 1.3, -0.25, MAIN);
    for (const x of [-0.77, 0.77]) for (const z of [0.68, -1.18]) b.box(0.07, 0.46, 0.07, x, 0.85, z, MAIN);
    for (const x of [-0.36, 0.36]) b.box(0.5, 0.26, 0.1, x, 0.85, -0.42, '#5a4a45');
    b.box(1.45, 0.24, 0.1, 0, 0.85, -1.05, '#5a4a45');
    b.box(1.5, 0.14, 0.26, 0, 0.85, 0.52, '#3b3b42');
    b.cyl(0.13, 0.13, 0.025, 0.36, 0.98, 0.4, BLACK).rotation.x = 1.1;
    for (const x of [-0.85, 0.85]) for (const z of [-1.3, 1.3]) {
      b.add(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 24), BLACK, x, 0.33, z).rotation.z = Math.PI / 2;
      b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 16), P.metal, x, 0.33, z).rotation.z = Math.PI / 2;
    }
    for (const x of [-0.6, 0.6]) {
      b.ball(0.1, x, 0.62, 1.98, P.white, { emissive: '#fff6d8', emissiveIntensity: 0.8 }).scale.z = 0.3;
      b.box(0.3, 0.1, 0.03, x, 0.58, -2.01, P.coral, { emissive: P.coral, emissiveIntensity: 0.3 });
    }
    b.box(1.82, 0.12, 0.08, 0, 0.25, 2.0, P.metal);
    b.box(1.82, 0.12, 0.08, 0, 0.25, -2.0, P.metal);
  } },
  { id: 'fountain', name: 'Fountain', emoji: '⛲', cat: 'Outside', color: '#cfc8bd', animate: (g, t) => {
    const s = g.getObjectByName('spray'); if (s) { s.scale.y = 1 + Math.sin(t * 6) * 0.06; s.rotation.y = t; }
  }, build: (b) => {
    b.cyl(1.4, 1.5, 0.45, 0, 0, 0, MAIN, undefined, 40);
    b.cyl(1.25, 1.25, 0.02, 0, 0.45, 0, '#7cc4e4', { roughness: 0.1 }, 40);
    b.cyl(0.15, 0.2, 1.1, 0, 0.45, 0, MAIN);
    b.cyl(0.6, 0.25, 0.2, 0, 1.4, 0, MAIN, undefined, 32);
    b.cyl(0.55, 0.55, 0.02, 0, 1.6, 0, '#7cc4e4', { roughness: 0.1 }, 32);
    const s = b.sub('spray', 0, 1.6, 0);
    s.add(new THREE.ConeGeometry(0.12, 0.7, 12, 1, true), '#d6f0ff', 0, 0.35, 0, { transparent: true, opacity: 0.6, roughness: 0.1 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; s.ball(0.04, Math.cos(a) * 0.35, 0.1, Math.sin(a) * 0.35, '#d6f0ff', { transparent: true, opacity: 0.7 }); }
  } },
  { id: 'duck', name: 'Ducky', emoji: '🦆', cat: 'Toys & Pets', color: '#f7da7e', action: 'quack', animate: (g, t) => {
    const s = g.getObjectByName('bob'); if (!s) return;
    const ph = g.position.x * 1.7 + g.position.z;
    s.position.y = Math.sin(t * 2.5 + ph) * 0.015;
    s.rotation.y = Math.sin(t * 0.5 + ph) * 0.7;
  }, build: (b) => {
    const s = b.sub('bob');
    s.ball(0.13, 0, 0.1, 0, MAIN).scale.set(0.9, 0.7, 1.2);
    s.ball(0.08, 0, 0.25, 0.1, MAIN);
    s.cone(0.03, 0.08, 0, 0.21, 0.2, P.ginger).rotation.x = Math.PI / 2;
    for (const x of [-0.04, 0.04]) s.ball(0.013, x, 0.28, 0.16, BLACK);
    s.cone(0.05, 0.08, 0, 0.12, -0.15, MAIN).rotation.x = -1.2;
  } },

  // ---- School ----
  { id: 'schooldesk', name: 'School Desk', emoji: '✏️', cat: 'Furniture', color: '#ec7d72', build: (b) => {
    b.box(0.62, 0.035, 0.46, 0, 0.62, 0.08, LIGHT_WOOD);
    b.box(0.56, 0.1, 0.4, 0, 0.52, 0.08, MAIN);
    for (const x of [-0.27, 0.27]) for (const z of [-0.1, 0.26]) b.box(0.03, 0.52, 0.03, x, 0, z, METAL);
    b.box(0.4, 0.035, 0.36, 0, 0.38, -0.42, MAIN);
    b.box(0.4, 0.3, 0.03, 0, 0.46, -0.62, MAIN);
    for (const x of [-0.17, 0.17]) for (const z of [-0.27, -0.57]) b.box(0.025, 0.38, 0.025, x, 0, z, METAL);
    b.box(0.2, 0.02, 0.15, -0.1, 0.655, 0.12, '#93c9ea');
    b.box(0.12, 0.012, 0.012, 0.13, 0.66, 0.12, '#f7da7e');
  } },
  { id: 'teacherdesk', name: "Teacher's Desk", emoji: '🍎', cat: 'Furniture', color: '#a0745a', build: (b) => {
    b.box(1.4, 0.04, 0.7, 0, 0.72, 0, MAIN);
    b.box(1.36, 0.7, 0.04, 0, 0.02, 0.31, MAIN);
    for (const x of [-0.67, 0.67]) b.box(0.04, 0.72, 0.66, x, 0, 0, MAIN);
    b.box(0.4, 0.5, 0.6, 0.45, 0.2, 0, MAIN);
    b.ball(0.06, -0.4, 0.82, 0.12, '#d9443a');
    b.box(0.01, 0.03, 0.01, -0.4, 0.87, 0.12, DARK_WOOD);
    b.box(0.3, 0.05, 0.22, 0.1, 0.76, -0.1, '#f4f1ea');
  } },
  { id: 'chalkboard', name: 'Chalkboard', emoji: '🧑‍🏫', cat: 'Wall Stuff', wall: true, color: '#8a6a3a', build: (b) => {
    b.box(2.4, 1.2, 0.04, 0, -0.6, 0.02, MAIN);
    const m = new THREE.MeshStandardMaterial({ map: signTexture('A B C   1 2 3', '#2f5d46', '#f4f1ea'), roughness: 0.95 });
    b.box(2.26, 1.06, 0.012, 0, -0.53, 0.045, m);
    b.box(2.3, 0.04, 0.09, 0, -0.62, 0.06, MAIN);
    for (const [x, c] of [[-0.6, '#fbfaf7'], [-0.5, '#ef84ad'], [-0.42, '#f7da7e']]) b.box(0.07, 0.015, 0.015, x, -0.58, 0.07, c);
  } },
  { id: 'alphabet', name: 'Alphabet Banner', emoji: '🔤', cat: 'Wall Stuff', wall: true, color: '#f7da7e', build: (b) => {
    const m = new THREE.MeshStandardMaterial({ map: signTexture('A B C D E F G', '#fbfaf7', '#ec7d72'), roughness: 0.9 });
    b.box(2.6, 0.34, 0.012, 0, -0.17, 0.006, m);
    b.box(2.7, 0.05, 0.016, 0, 0.0, 0.008, MAIN);
    b.box(2.7, 0.05, 0.016, 0, -0.39, 0.008, MAIN);
  } },
  { id: 'easel', name: 'Paint Easel', emoji: '🎨', cat: 'Toys & Pets', color: '#ef84ad', build: (b) => {
    for (const x of [-0.25, 0.25]) b.box(0.04, 1.4, 0.04, x, 0, 0, LIGHT_WOOD).rotation.x = -0.12;
    b.box(0.04, 1.3, 0.04, 0, 0, -0.32, LIGHT_WOOD).rotation.x = 0.25;
    b.box(0.62, 0.04, 0.08, 0, 0.62, 0.08, LIGHT_WOOD);
    b.box(0.58, 0.48, 0.02, 0, 0.66, 0.06, shared.landscapeStd()).rotation.x = -0.12;
    for (const [x, c] of [[-0.2, MAIN], [-0.07, '#93c9ea'], [0.06, '#f7da7e'], [0.19, '#aee0c5']]) b.cyl(0.035, 0.03, 0.06, x, 0.64, 0.1, c);
  } },
  { id: 'lockers', name: 'Lockers', emoji: '🔐', cat: 'Furniture', color: '#5b8fd9', build: (b) => {
    b.box(1.2, 1.8, 0.4, 0, 0, 0, MAIN);
    for (const x of [-0.2, 0.2]) b.box(0.012, 1.72, 0.01, x, 0.04, 0.2, '#3b4a5a');
    for (const x of [-0.4, 0, 0.4]) {
      for (let i = 0; i < 4; i++) b.box(0.22, 0.015, 0.01, x, 1.45 + i * 0.05, 0.2, '#3b4a5a');
      b.box(0.03, 0.12, 0.02, x + 0.13, 0.95, 0.21, METAL);
    }
  } },
  { id: 'flagpole', name: 'Flagpole', emoji: '🏳️', cat: 'Outside', color: '#c8463c', fixed: true, animate: (g, t) => {
    const f = g.getObjectByName('flag'); if (f) f.rotation.y = Math.sin(t * 1.7) * 0.25;
  }, build: (b) => {
    b.cyl(0.3, 0.35, 0.2, 0, 0, 0, '#c3bdb2');
    b.cyl(0.04, 0.05, 6.0, 0, 0.2, 0, METAL);
    b.ball(0.08, 0, 6.25, 0, P.gold, { metalness: 0.6, roughness: 0.3 });
    const f = b.sub('flag', 0, 5.4, 0);
    const m = new THREE.MeshStandardMaterial({ map: stripes('#c8463c', '#fbfaf7'), roughness: 0.8, side: THREE.DoubleSide });
    m.map.rotation = Math.PI / 2; m.map.repeat.set(1, 3.5);
    f.add(new THREE.BoxGeometry(1.2, 0.75, 0.01), m, 0.62, 0.38, 0);
    f.box(0.5, 0.38, 0.016, 0.27, 0.37, 0, '#3f5f8f');
  } },
  { id: 'schoolbus', name: 'School Bus', emoji: '🚌', cat: 'Outside', color: '#f2b705', action: 'drive', seat: { x: 0.7, z: 3.0, eye: 1.95 }, mainOpts: { roughness: 0.45 }, build: (b) => {
    b.box(2.4, 1.05, 8.0, 0, 0.35, 0, MAIN);
    b.box(2.34, 0.75, 7.86, 0, 1.4, 0, '#cfe6f2', GLASS);
    for (let z = -3.6; z <= 3.61; z += 0.9) for (const x of [-1.18, 1.18]) b.box(0.06, 0.75, 0.12, x, 1.4, z, MAIN);
    for (const x of [-1.1, 1.1]) b.box(0.12, 0.75, 0.08, x, 1.4, 3.96, MAIN);
    b.box(0.06, 0.75, 0.08, 0, 1.4, 3.96, MAIN);
    b.box(2.4, 0.26, 8.0, 0, 2.15, 0, MAIN);
    for (const y of [0.72, 1.12]) b.box(2.44, 0.06, 8.02, 0, y, 0, BLACK);
    const sign = new THREE.MeshStandardMaterial({ map: signTexture('SCHOOL BUS', '#f2b705', '#2a2727'), roughness: 0.6 });
    b.box(1.5, 0.22, 0.02, 0, 2.17, 4.01, sign);
    b.box(1.5, 0.22, 0.02, 0, 2.17, -4.01, sign);
    for (let z = -3.2; z <= 2.0; z += 0.9) for (const x of [-0.62, 0.62]) b.box(0.85, 0.36, 0.1, x, 1.4, z, '#3f7a52');
    b.box(0.5, 0.4, 0.1, 0.7, 1.4, 2.7, '#3b3b42');
    b.cyl(0.18, 0.18, 0.03, 0.7, 1.62, 3.4, BLACK).rotation.x = 1.0;
    for (const x of [-1.1, 1.1]) for (const z of [-2.7, 2.7]) {
      b.add(new THREE.CylinderGeometry(0.46, 0.46, 0.3, 24), BLACK, x, 0.46, z).rotation.z = Math.PI / 2;
      b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.33, 16), METAL, x, 0.46, z).rotation.z = Math.PI / 2;
    }
    for (const x of [-0.85, 0.85]) {
      b.ball(0.12, x, 0.75, 4.0, WHITE, { emissive: '#fff6d8', emissiveIntensity: 0.8 }).scale.z = 0.3;
      b.ball(0.1, x, 2.2, 4.01, '#f2a25f', { emissive: '#f2a25f', emissiveIntensity: 0.4 }).scale.z = 0.3;
      b.box(0.3, 0.14, 0.03, x, 0.7, -4.01, P.coral, { emissive: P.coral, emissiveIntensity: 0.3 });
    }
    b.box(2.44, 0.2, 0.12, 0, 0.3, 4.02, BLACK);
    b.box(2.44, 0.2, 0.12, 0, 0.3, -4.02, BLACK);
    b.cyl(0.24, 0.24, 0.03, 1.26, 1.25, 2.4, '#d9443a', undefined, 8).rotation.z = Math.PI / 2;
  } },
  { id: 'hoop', name: 'Basketball Hoop', emoji: '🏀', cat: 'Outside', color: '#ec7d72', build: (b) => {
    b.cyl(0.25, 0.3, 0.1, 0, 0, -0.55, METAL);
    b.cyl(0.05, 0.05, 2.8, 0, 0.1, -0.55, METAL);
    b.box(0.08, 0.08, 0.5, 0, 2.6, -0.3, METAL);
    b.box(1.0, 0.7, 0.04, 0, 2.35, -0.05, WHITE);
    b.box(0.4, 0.3, 0.012, 0, 2.5, -0.024, MAIN);
    b.add(new THREE.TorusGeometry(0.2, 0.015, 8, 28), '#f2a25f', 0, 2.55, 0.2).rotation.x = Math.PI / 2;
    b.cyl(0.2, 0.13, 0.32, 0, 2.23, 0.2, WHITE, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }, 12);
  } },
  { id: 'hopscotch', name: 'Hopscotch', emoji: '1️⃣', cat: 'Outside', color: '#f7da7e', build: (b) => {
    const cols = [MAIN, '#ef84ad', '#93c9ea', '#aee0c5', '#bba6e6'];
    const rows = [[0], [0], [-1, 1], [0], [-1, 1], [0], [-1, 1]];
    rows.forEach((r, i) => r.forEach((x, j) => b.box(0.48, 0.008, 0.48, x * 0.26, 0, -1.5 + i * 0.5, cols[(i + j) % cols.length])));
  } },

  // ---- Garage ----
  { id: 'workbench', name: 'Workbench', emoji: '🔨', cat: 'Furniture', color: '#c9a77c', build: (b) => {
    b.box(1.6, 0.06, 0.6, 0, 0.84, 0, MAIN);
    b.legs(1.56, 0.56, 0.84, 0.06, DARK_WOOD);
    b.box(1.5, 0.03, 0.5, 0, 0.25, 0, DARK_WOOD);
    b.box(0.45, 0.22, 0.25, -0.45, 0.9, 0, '#d9443a');
    b.box(0.1, 0.04, 0.04, -0.45, 1.13, 0, BLACK);
    b.box(0.2, 0.12, 0.12, 0.6, 0.9, 0.22, METAL);
    for (let i = 0; i < 3; i++) b.cyl(0.1, 0.1, 0.12, 0.1 + i * 0.25, 0.25 + 0.03, 0, ['#93c9ea', '#f7da7e', '#aee0c5'][i]);
  } },
  { id: 'pegboard', name: 'Tool Wall', emoji: '🔧', cat: 'Wall Stuff', wall: true, color: '#c9a77c', build: (b) => {
    b.box(1.4, 0.9, 0.02, 0, -0.45, 0.01, MAIN);
    b.box(0.05, 0.3, 0.03, -0.5, -0.4, 0.04, DARK_WOOD); b.box(0.16, 0.06, 0.04, -0.5, -0.13, 0.04, METAL);
    b.box(0.04, 0.3, 0.02, -0.25, -0.45, 0.04, METAL);
    b.box(0.3, 0.16, 0.01, 0.05, -0.35, 0.04, METAL); b.box(0.06, 0.12, 0.03, -0.12, -0.33, 0.04, '#d9443a');
    b.box(0.05, 0.22, 0.03, 0.32, -0.42, 0.04, '#f7da7e'); b.box(0.03, 0.12, 0.02, 0.32, -0.6, 0.04, METAL);
    b.disc(0.1, 0.03, 0.52, -0.3, 0.04, '#ec7d72');
  } },
  { id: 'bike', name: 'Bike', emoji: '🚲', cat: 'Toys & Pets', color: '#ef84ad', build: (b) => {
    for (const z of [-0.42, 0.42]) {
      b.add(new THREE.TorusGeometry(0.26, 0.035, 8, 24), BLACK, 0, 0.3, z).rotation.y = Math.PI / 2;
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), METAL, 0, 0.3, z).rotation.z = Math.PI / 2;
    }
    b.box(0.04, 0.04, 0.72, 0, 0.5, 0, MAIN).rotation.x = 0.15;
    b.box(0.04, 0.35, 0.04, 0, 0.3, -0.1, MAIN).rotation.x = -0.35;
    b.box(0.04, 0.4, 0.04, 0, 0.3, 0.38, MAIN).rotation.x = -0.25;
    b.box(0.12, 0.04, 0.22, 0, 0.66, -0.16, BLACK);
    b.box(0.46, 0.035, 0.035, 0, 0.72, 0.36, METAL);
    for (const x of [-0.23, 0.23]) b.box(0.05, 0.05, 0.1, x, 0.71, 0.36, '#f7da7e');
    b.box(0.22, 0.12, 0.16, 0, 0.6, 0.5, WHITE);
  } },
  { id: 'piano', name: 'Piano', emoji: '🎹', cat: 'Furniture', color: '#3a2f2a', build: (b) => {
    b.box(1.4, 1.15, 0.5, 0, 0, -0.08, MAIN);
    b.box(1.4, 0.08, 0.3, 0, 0.72, 0.3, MAIN);
    b.box(1.3, 0.03, 0.18, 0, 0.8, 0.28, WHITE);
    for (let i = 0; i < 18; i++) if (i % 7 !== 2 && i % 7 !== 6) b.box(0.035, 0.03, 0.1, -0.6 + i * 0.07, 0.82, 0.24, BLACK);
    b.box(0.06, 0.72, 0.3, -0.67, 0, 0.3, MAIN); b.box(0.06, 0.72, 0.3, 0.67, 0, 0.3, MAIN);
    b.box(0.8, 0.05, 0.35, 0, 0.45, 0.85, MAIN);
    b.legs(0.76, 0.32, 0.45, 0.05, MAIN);
    b.box(0.3, 0.22, 0.02, 0.2, 1.0, 0.18, '#f4f1ea').rotation.x = -0.2;
  } },

  // ---- More vehicles (all drivable) ----
  { id: 'pickup', name: 'Pickup Truck', emoji: '🛻', cat: 'Outside', color: '#f4f4f1', action: 'drive', seat: { x: 0.42, z: 0.55, eye: 1.55 }, mainOpts: { roughness: 0.3, metalness: 0.15 }, build: (b) => {
    b.box(2.0, 0.75, 5.8, 0, 0.42, 0, MAIN);
    cabin(b, 1.9, 0.62, 2.1, 1.17, 0.35);
    seats(b, 1.17, 0.42, 0.15, -0.4);
    for (const x of [-0.95, 0.95]) b.box(0.08, 0.42, 2.6, x, 1.17, -1.55, MAIN);
    b.box(1.9, 0.42, 0.08, 0, 1.17, -2.82, MAIN);
    b.box(1.82, 0.02, 2.6, 0, 1.18, -1.55, '#3b3b42');
    b.box(1.8, 0.05, 0.03, 0, 1.08, 2.91, WHITE, { emissive: '#e8f4ff', emissiveIntensity: 1.2 }); // light bar across the front
    b.box(1.5, 0.28, 0.03, 0, 0.68, 2.91, '#2f3238');
    b.box(2.04, 0.16, 0.12, 0, 0.3, 2.9, '#3b3b42');
    b.box(2.04, 0.16, 0.12, 0, 0.3, -2.9, '#3b3b42');
    for (const x of [-0.8, 0.8]) {
      b.box(0.3, 0.06, 0.03, x, 1.0, 2.92, WHITE, { emissive: '#fff6d8', emissiveIntensity: 0.9 });
      b.box(0.08, 0.4, 0.03, x * 1.18, 0.85, -2.92, '#d9443a', { emissive: '#d9443a', emissiveIntensity: 0.5 });
    }
    wheels(b, 0.43, 0.32, 1.0, [-1.85, 1.85]);
  } },
  { id: 'suv', name: 'SUV', emoji: '🚙', cat: 'Outside', color: '#f4f4f1', action: 'drive', seat: { x: 0.42, z: 0.3, eye: 1.5 }, mainOpts: { roughness: 0.3, metalness: 0.15 }, build: (b) => {
    b.box(2.0, 0.75, 5.0, 0, 0.4, 0, MAIN);
    cabin(b, 1.88, 0.6, 3.4, 1.15, -0.55);
    seats(b, 1.15, 0.42, -0.1, -0.9, -1.75);
    for (const x of [-0.7, 0.7]) b.box(0.05, 0.05, 3.0, x, 1.83, -0.55, BLACK); // roof rails
    b.box(1.5, 0.3, 0.03, 0, 0.7, 2.51, '#2f3238');
    for (const x of [-0.72, 0.72]) {
      b.box(0.38, 0.08, 0.03, x, 1.0, 2.51, WHITE, { emissive: '#fff6d8', emissiveIntensity: 0.9 });
      b.box(0.36, 0.1, 0.03, x, 1.0, -2.51, '#d9443a', { emissive: '#d9443a', emissiveIntensity: 0.5 });
    }
    b.box(2.04, 0.16, 0.12, 0, 0.3, 2.5, '#3b3b42');
    b.box(2.04, 0.16, 0.12, 0, 0.3, -2.5, '#3b3b42');
    wheels(b, 0.4, 0.3, 1.0, [-1.6, 1.6]);
  } },
  { id: 'minivan', name: 'Minivan', emoji: '🚐', cat: 'Outside', color: '#93c9ea', action: 'drive', seat: { x: 0.42, z: 0.55, eye: 1.45 }, mainOpts: { roughness: 0.35, metalness: 0.1 }, build: (b) => {
    b.box(1.95, 0.7, 5.0, 0, 0.35, 0, MAIN);
    cabin(b, 1.85, 0.75, 4.0, 1.05, -0.4);
    seats(b, 1.05, 0.42, 0.1, -0.8, -1.7);
    for (const x of [-0.99, 0.99]) b.box(0.02, 0.5, 0.02, x, 0.5, -0.3, '#3b4a5a'); // sliding door line
    b.box(1.4, 0.25, 0.03, 0, 0.6, 2.51, '#2f3238');
    for (const x of [-0.7, 0.7]) b.box(0.32, 0.1, 0.03, x, 0.85, 2.51, WHITE, { emissive: '#fff6d8', emissiveIntensity: 0.9 });
    wheels(b, 0.36, 0.28, 0.97, [-1.6, 1.6]);
  } },
  { id: 'icecreamtruck', name: 'Ice Cream Truck', emoji: '🍦', cat: 'Outside', color: '#fbfaf7', action: 'drive', seat: { x: 0.45, z: 2.0, eye: 1.6 }, build: (b) => {
    b.box(2.1, 0.7, 6.0, 0, 0.4, 0, MAIN);
    cabin(b, 2.0, 0.75, 1.2, 1.1, 2.3);
    seats(b, 1.1, 0.45, 2.0);
    b.box(2.1, 1.6, 4.3, 0, 1.1, -0.85, MAIN);                       // the ice cream box
    const stripe = new THREE.MeshStandardMaterial({ map: stripes('#ef84ad', '#fbfaf7'), roughness: 0.8 });
    stripe.map.repeat.set(12, 1);
    b.box(2.12, 0.25, 4.32, 0, 2.4, -0.85, stripe);
    for (const x of [-1.066, 1.066]) b.box(0.02, 0.7, 1.8, x, 1.45, -0.6, '#cfe6f2', GLASS); // serving windows
    b.box(0.6, 0.06, 2.2, 1.35, 2.2, -0.6, '#ef84ad').rotation.z = -0.35; // awning
    b.cone(0.3, 0.8, 0, 2.7, -0.9, '#e0b25a').rotation.x = Math.PI;      // giant cone on the roof
    b.ball(0.36, 0, 3.6, -0.9, '#ef84ad');
    b.ball(0.08, 0, 4.0, -0.9, '#d9443a');
    b.box(1.6, 0.25, 0.03, 0, 0.6, 3.01, '#2f3238');
    for (const x of [-0.75, 0.75]) b.ball(0.11, x, 0.85, 3.0, WHITE, { emissive: '#fff6d8', emissiveIntensity: 0.8 }).scale.z = 0.3;
    wheels(b, 0.42, 0.32, 1.05, [-2.1, 2.0]);
  } },
  { id: 'firetruck', name: 'Fire Truck', emoji: '🚒', cat: 'Outside', color: '#d9443a', action: 'drive', seat: { x: 0.55, z: 2.5, eye: 1.85 }, mainOpts: { roughness: 0.35, metalness: 0.1 }, build: (b) => {
    b.box(2.3, 0.9, 7.2, 0, 0.45, 0, MAIN);
    cabin(b, 2.2, 0.8, 1.6, 1.35, 2.6);
    seats(b, 1.35, 0.55, 2.4);
    b.box(2.3, 0.9, 5.0, 0, 1.35, -1.1, MAIN);
    b.box(2.34, 0.12, 7.22, 0, 0.95, 0, WHITE);                          // white stripe
    for (let i = 0; i < 4; i++) b.box(0.5, 0.6, 0.02, -0.75 + i * 0.5, 1.45, -1.1 + 2.51, '#c9c9c9');
    for (const x of [-0.4, 0.4]) b.box(0.08, 0.08, 5.6, x, 2.45, -1.3, '#e8e8e8'); // ladder rails
    for (let i = 0; i < 12; i++) b.box(0.8, 0.05, 0.05, 0, 2.45, -3.9 + i * 0.47, '#e8e8e8');
    b.box(1.6, 0.14, 0.3, 0, 2.15, 2.6, '#d9443a', { emissive: '#ff3b2f', emissiveIntensity: 0.8 }); // light bar
    b.box(1.8, 0.3, 0.03, 0, 0.7, 3.61, '#c9c9c9');
    for (const x of [-0.85, 0.85]) b.ball(0.12, x, 0.95, 3.6, WHITE, { emissive: '#fff6d8', emissiveIntensity: 0.8 }).scale.z = 0.3;
    for (const x of [-1.16, 1.16]) for (let i = 0; i < 3; i++) b.box(0.02, 0.6, 1.2, x, 1.5, -2.8 + i * 1.4, '#b8b8b8');
    wheels(b, 0.48, 0.36, 1.15, [-2.6, -1.5, 2.4]);
  } },

  // ---- Around town: fire station, police, grocery, office, pizza, pet shop, pool ----
  { id: 'policecar', name: 'Police Car', emoji: '🚓', cat: 'Outside', color: '#fbfaf7', action: 'drive', seat: { x: 0.36, z: -0.12, eye: 1.08 }, mainOpts: { roughness: 0.35, metalness: 0.15 }, build: (b) => {
    b.box(1.8, 0.55, 4.0, 0, 0.3, 0, MAIN);
    for (const z of [-1.56, 1.56]) b.box(1.82, 0.57, 0.92, 0, 0.3, z, '#2a2727');
    cabin(b, 1.6, 0.45, 1.9, 0.85, -0.25);
    seats(b, 0.85, 0.36, -0.17, -1.05);
    b.box(0.5, 0.1, 0.2, -0.3, 1.37, -0.25, '#d9443a', { emissive: '#ff3b2f', emissiveIntensity: 1 });
    b.box(0.5, 0.1, 0.2, 0.3, 1.37, -0.25, '#2e6fb5', { emissive: '#3b7bff', emissiveIntensity: 1 });
    for (const x of [-0.6, 0.6]) b.ball(0.1, x, 0.62, 1.98, WHITE, { emissive: '#fff6d8', emissiveIntensity: 0.8 }).scale.z = 0.3;
    wheels(b, 0.33, 0.22, 0.86, [-1.3, 1.3]);
  } },
  { id: 'firepole', name: 'Fire Pole', emoji: '🧯', cat: 'Furniture', color: '#d1a640', fixed: true, build: (b) => {
    b.cyl(0.3, 0.3, 0.06, 0, 0, 0, '#3b3b42');
    b.cyl(0.04, 0.04, 3.6, 0, 0.06, 0, MAIN, { metalness: 0.6, roughness: 0.25 });
  } },
  { id: 'alarmbell', name: 'Fire Alarm Bell', emoji: '🔔', cat: 'Wall Stuff', wall: true, color: '#d9443a', build: (b) => {
    b.disc(0.18, 0.04, 0, 0, 0.03, '#3b3b42');
    b.ball(0.15, 0, 0, 0.06, MAIN, { metalness: 0.3, roughness: 0.3 }).scale.z = 0.5;
    b.ball(0.03, 0, 0, 0.14, '#3b3b42');
  } },
  { id: 'pizzaoven', name: 'Pizza Oven', emoji: '🍕', cat: 'Kitchen & Bath', color: '#c8463c', fixed: true, hidden: true, action: 'give', gives: ['pizza'], giveMsg: 'A fresh hot pizza! 🍕', giveLabel: 'get a pizza', build: (b) => {
    b.box(1.6, 0.9, 1.2, 0, 0, 0, shared.brick());
    b.add(new THREE.SphereGeometry(0.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), shared.brick(), 0, 0.9, 0);
    b.box(0.6, 0.4, 0.02, 0, 0.95, 0.66, '#2a2727');
    b.box(0.5, 0.25, 0.02, 0, 0.97, 0.672, '#ff8a3c', { emissive: '#ff6a00', emissiveIntensity: 1.2 });
    b.cyl(0.12, 0.14, 0.6, 0.35, 1.3, -0.3, '#8d8a85');
  } },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', cat: 'Kitchen & Bath', color: '#f2cf63', build: (b) => {
    b.cyl(0.25, 0.25, 0.03, 0, 0, 0, '#d9a45a');
    b.cyl(0.22, 0.22, 0.012, 0, 0.03, 0, MAIN);
    for (let i = 0; i < 7; i++) { const a = i * 0.9, r = i ? 0.13 : 0; b.cyl(0.035, 0.035, 0.008, Math.cos(a) * r, 0.042, Math.sin(a) * r, '#c8463c'); }
  } },
  { id: 'checkout', name: 'Checkout', emoji: '🛒', cat: 'Furniture', color: '#5fb3a8', fixed: true, hidden: true, action: 'give', gives: ['cupcake', 'icecream', 'pizza', 'bread', 'milk', 'cereal', 'banana', 'watermelon', 'cheese', 'cookies', 'juice', 'donut'], giveMsg: 'Thanks for shopping! 🛒', giveLabel: 'buy a snack', build: (b) => {
    b.box(0.8, 0.9, 2.0, 0, 0, 0, MAIN);
    b.box(0.6, 0.03, 1.4, 0, 0.9, 0.2, '#2a2727');
    b.box(0.4, 0.3, 0.3, 0, 0.9, -0.75, '#3b3b42');
    b.box(0.3, 0.2, 0.02, 0, 1.12, -0.6, '#aee0c5', { emissive: '#aee0c5', emissiveIntensity: 0.5 });
  } },
  { id: 'cart', name: 'Shopping Cart', emoji: '🛒', cat: 'Toys & Pets', color: '#c9ccd1', mainOpts: { metalness: 0.5, roughness: 0.35 }, build: (b) => {
    b.box(0.55, 0.03, 0.8, 0, 0.45, 0, MAIN);
    for (const x of [-0.27, 0.27]) b.box(0.02, 0.4, 0.8, x, 0.47, 0, MAIN);
    b.box(0.55, 0.4, 0.02, 0, 0.47, 0.4, MAIN);
    b.box(0.55, 0.4, 0.02, 0, 0.47, -0.4, MAIN);
    b.box(0.55, 0.04, 0.04, 0, 1.0, -0.5, '#d9443a');
    for (const x of [-0.25, 0.25]) for (const z of [-0.35, 0.35]) { b.box(0.02, 0.4, 0.02, x, 0.07, z, MAIN); b.ball(0.06, x, 0.06, z, BLACK); }
  } },
  { id: 'produce', name: 'Fruit Stand', emoji: '🍎', cat: 'Kitchen & Bath', color: '#a0745a', build: (b) => {
    b.box(1.6, 0.7, 0.8, 0, 0, 0, MAIN);
    const fruit = ['#d9443a', '#f2a25f', '#f7da7e', '#7cc46a', '#bba6e6'];
    for (let i = 0; i < 5; i++) {
      b.box(0.3, 0.12, 0.7, -0.64 + i * 0.32, 0.7, 0, LIGHT_WOOD);
      for (let k = 0; k < 6; k++) b.ball(0.06, -0.69 + i * 0.32 + (k % 2) * 0.1, 0.86, -0.25 + Math.floor(k / 2) * 0.25, fruit[i]);
    }
  } },
  { id: 'freezer', name: 'Freezer', emoji: '🧊', cat: 'Kitchen & Bath', color: '#fbfaf7', build: (b) => {
    b.box(1.8, 0.85, 0.9, 0, 0, 0, MAIN);
    b.box(1.7, 0.02, 0.8, 0, 0.85, 0, '#cfe6f2', GLASS);
    const cols = ['#ef84ad', '#93c9ea', '#f7da7e', '#aee0c5'];
    for (let i = 0; i < 8; i++) b.box(0.3, 0.15, 0.2, -0.7 + (i % 4) * 0.45, 0.65, -0.2 + Math.floor(i / 4) * 0.4, cols[i % 4]);
  } },
  { id: 'computer', name: 'Computer Desk', emoji: '💻', cat: 'Furniture', color: '#fbfaf7', build: (b) => {
    table(1.4, 0.7, 0.75)(b);
    b.box(0.6, 0.38, 0.04, 0, 0.92, -0.15, '#2a2727');
    b.box(0.55, 0.32, 0.01, 0, 0.95, -0.125, '#7ec8f2', { emissive: '#7ec8f2', emissiveIntensity: 0.6 });
    b.box(0.06, 0.18, 0.04, 0, 0.75, -0.17, '#2a2727');
    b.box(0.45, 0.02, 0.15, 0, 0.75, 0.12, '#3b3b42');
    b.box(0.07, 0.02, 0.1, 0.33, 0.75, 0.12, '#3b3b42');
    b.cyl(0.04, 0.035, 0.1, -0.5, 0.75, 0.1, '#ef84ad');
  } },
  { id: 'officechair', name: 'Office Chair', emoji: '💺', cat: 'Furniture', color: '#3b3b42', build: (b) => {
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; b.box(0.04, 0.04, 0.3, Math.sin(a) * 0.15, 0.03, Math.cos(a) * 0.15, METAL).rotation.y = a; }
    b.cyl(0.03, 0.03, 0.4, 0, 0.05, 0, METAL);
    b.box(0.5, 0.08, 0.48, 0, 0.45, 0, MAIN);
    b.box(0.46, 0.5, 0.06, 0, 0.55, -0.22, MAIN);
  } },
  { id: 'watercooler', name: 'Water Cooler', emoji: '💧', cat: 'Kitchen & Bath', color: '#fbfaf7', build: (b) => {
    b.box(0.35, 0.95, 0.35, 0, 0, 0, MAIN);
    b.cyl(0.15, 0.15, 0.42, 0, 0.98, 0, '#8fd3ff', { transparent: true, opacity: 0.55 });
    b.cyl(0.06, 0.15, 0.06, 0, 0.95, 0, '#8fd3ff', { transparent: true, opacity: 0.55 });
    for (const [x, c] of [[-0.07, '#4f86c6'], [0.07, '#d9443a']]) b.box(0.04, 0.05, 0.04, x, 0.7, 0.18, c);
  } },
  { id: 'elevator', name: 'Elevator', emoji: '🛗', cat: 'Wall Stuff', wall: true, color: '#c9ccd1', build: (b) => {
    b.box(1.5, 2.3, 0.05, 0, -1.15, 0.025, '#8d8a85');
    for (const x of [-0.3, 0.3]) b.box(0.58, 2.1, 0.02, x, -1.12, 0.06, MAIN, { metalness: 0.6, roughness: 0.25 });
    b.box(0.12, 0.25, 0.02, 0.88, -0.25, 0.04, '#3b3b42');
    b.ball(0.025, 0.88, -0.1, 0.055, '#f7da7e', { emissive: '#f7da7e', emissiveIntensity: 0.8 });
    b.box(0.4, 0.15, 0.02, 0, 1.0, 0.06, '#2a2727');
    b.box(0.3, 0.08, 0.01, 0, 1.03, 0.072, '#ff8a3c', { emissive: '#ff6a00', emissiveIntensity: 0.9 });
  } },
  { id: 'fishtank', name: 'Fish Tank', emoji: '🐠', cat: 'Toys & Pets', color: '#3b3b42', animate: (g, t) => {
    const f = g.getObjectByName('fish'); if (f) f.rotation.y = t * 0.8;
  }, build: (b) => {
    b.box(1.2, 0.75, 0.5, 0, 0, 0, MAIN);
    b.box(1.1, 0.6, 0.4, 0, 0.75, 0, '#8fd3ff', { transparent: true, opacity: 0.35 });
    b.box(1.1, 0.06, 0.4, 0, 0.75, 0, '#e9d39a');
    b.box(1.14, 0.03, 0.44, 0, 1.35, 0, MAIN);
    for (const x of [-0.4, 0.35]) b.cone(0.05, 0.25, x, 0.81, 0.05, '#4f8a46', undefined, 6);
    const f = b.sub('fish', 0, 1.05, 0);
    [['#f2a25f', 0.3], ['#ef84ad', -0.25], ['#f7da7e', 0.12]].forEach(([c, r], i) => {
      const fish = f.ball(0.05, Math.cos(i * 2.1) * Math.abs(r) * 1.2, (i - 1) * 0.1, Math.sin(i * 2.1) * 0.12, c);
      fish.scale.set(0.6, 0.8, 1.4);
    });
  } },
  { id: 'birdcage', name: 'Bird Cage', emoji: '🐦', cat: 'Toys & Pets', color: '#d1a640', animate: (g, t) => {
    const s = g.getObjectByName('bird'); if (s) { s.position.y = 1.15 + Math.abs(Math.sin(t * 3)) * 0.05; s.rotation.y = Math.sin(t * 0.7) * 1.2; }
  }, build: (b) => {
    b.cyl(0.2, 0.25, 0.04, 0, 0, 0, MAIN);
    b.cyl(0.025, 0.025, 1.0, 0, 0.04, 0, MAIN);
    b.cyl(0.25, 0.25, 0.02, 0, 1.02, 0, MAIN);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.cyl(0.006, 0.006, 0.55, Math.cos(a) * 0.24, 1.04, Math.sin(a) * 0.24, MAIN, undefined, 4); }
    b.add(new THREE.SphereGeometry(0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAIN, 0, 1.58, 0, { wireframe: true });
    b.box(0.4, 0.015, 0.015, 0, 1.12, 0, '#8a6a3a');
    const s = b.sub('bird', 0, 1.15, 0);
    s.ball(0.05, 0, 0.04, 0, '#7cc46a').scale.set(0.9, 1, 1.3);
    s.ball(0.035, 0, 0.1, 0.04, '#f7da7e');
    s.cone(0.012, 0.03, 0, 0.09, 0.08, '#f2a25f', undefined, 6).rotation.x = Math.PI / 2;
  } },
  { id: 'bunny', name: 'Bunny', emoji: '🐰', cat: 'Toys & Pets', color: '#f2efe9', build: (b) => {
    b.ball(0.13, 0, 0.12, 0, MAIN).scale.set(1, 0.85, 1.25);
    b.ball(0.085, 0, 0.22, 0.13, MAIN);
    for (const s of [-1, 1]) {
      b.box(0.04, 0.14, 0.025, s * 0.035, 0.28, 0.1, MAIN).rotation.z = s * 0.15;
      b.ball(0.012, s * 0.045, 0.24, 0.2, BLACK);
    }
    b.ball(0.045, 0, 0.15, -0.16, WHITE);
    b.ball(0.015, 0, 0.21, 0.215, '#f4a3c4');
  } },
  { id: 'petcounter', name: 'Pet Shop Counter', emoji: '🐾', cat: 'Toys & Pets', color: '#aee0c5', fixed: true, hidden: true, action: 'give', gives: ['dog', 'cat', 'bunny', 'duck'], giveMsg: 'A new pet friend! 🐾', giveLabel: 'adopt a pet', build: (b) => {
    b.box(2.0, 0.95, 0.6, 0, 0, 0, MAIN);
    b.box(2.04, 0.05, 0.64, 0, 0.95, 0, WHITE);
    b.box(0.35, 0.18, 0.3, 0.6, 1.0, 0, '#3b3b42');
    b.ball(0.08, -0.5, 1.08, 0, '#c69c6d').scale.set(1.6, 0.6, 1);
    for (const x of [-0.7, -0.3]) b.ball(0.04, x, 1.04, 0.1, '#a0745a');
    b.box(0.8, 0.3, 0.014, 0, 0.35, 0.307, '#ef84ad');
  } },
  { id: 'divingboard', name: 'Diving Board', emoji: '🏊', cat: 'Outside', color: '#fbfaf7', fixed: true, build: (b) => {
    b.box(0.6, 0.5, 0.6, 0, 0, 0, '#8d8a85');
    b.box(0.5, 0.06, 2.4, 0, 0.5, 0.9, MAIN);
    for (const x of [-0.3, 0.3]) b.box(0.04, 0.6, 0.04, x, 0.5, -0.2, METAL);
  } },
  { id: 'loungechair', name: 'Pool Chair', emoji: '🏖️', cat: 'Outside', color: '#93c9ea', build: (b) => {
    b.box(0.65, 0.06, 1.3, 0, 0.3, 0.1, MAIN);
    b.box(0.65, 0.06, 0.7, 0, 0.45, -0.75, MAIN).rotation.x = 0.7;
    b.legs(0.6, 1.4, 0.3, 0.04, WHITE);
  } },
  { id: 'umbrella', name: 'Beach Umbrella', emoji: '⛱️', cat: 'Outside', color: '#ef84ad', build: (b) => {
    b.cyl(0.2, 0.22, 0.08, 0, 0, 0, '#8d8a85');
    b.cyl(0.025, 0.025, 2.2, 0, 0.08, 0, WHITE);
    const m = new THREE.MeshStandardMaterial({ map: stripes('#ef84ad', '#fbfaf7'), roughness: 0.8, side: THREE.DoubleSide });
    m.map.repeat.set(8, 1);
    b.add(new THREE.ConeGeometry(1.2, 0.5, 16, 1, true), m, 0, 2.2, 0);
  } },

  // ---- Groceries ----
  { id: 'shelf_cereal', name: 'Cereal Shelf', emoji: '🥣', cat: 'Furniture', color: '#fbfaf7', build: stockedShelf('cereal') },
  { id: 'shelf_snacks', name: 'Snack Shelf', emoji: '🍿', cat: 'Furniture', color: '#fbfaf7', build: stockedShelf('snacks') },
  { id: 'shelf_cans', name: 'Canned Food Shelf', emoji: '🥫', cat: 'Furniture', color: '#fbfaf7', build: stockedShelf('cans') },
  { id: 'shelf_drinks', name: 'Drinks Shelf', emoji: '🧃', cat: 'Furniture', color: '#fbfaf7', build: stockedShelf('drinks') },
  { id: 'shelf_bread', name: 'Bread Shelf', emoji: '🍞', cat: 'Furniture', color: '#d9c3a0', build: stockedShelf('bread') },
  { id: 'bakerycase', name: 'Bakery Case', emoji: '🍩', cat: 'Kitchen & Bath', color: '#fbfaf7', action: 'give', gives: ['donut', 'cookies', 'bread', 'cupcake'], giveMsg: 'Fresh from the bakery! 🥐', giveLabel: 'get a treat', build: (b) => {
    b.box(1.6, 0.8, 0.7, 0, 0, 0, MAIN);
    b.box(1.56, 0.5, 0.66, 0, 0.8, 0, '#cfe6f2', GLASS);
    b.box(1.62, 0.04, 0.72, 0, 1.3, 0, MAIN);
    for (let i = 0; i < 6; i++) {
      const x = -0.6 + i * 0.24;
      b.add(new THREE.TorusGeometry(0.06, 0.03, 8, 16), ['#ef84ad', '#d9a45a', '#bba6e6'][i % 3], x, 0.86, 0.12).rotation.x = Math.PI / 2;
      b.box(0.18, 0.08, 0.1, x, 0.82, -0.15, '#d9a45a');
    }
  } },
  { id: 'bread', name: 'Bread', emoji: '🍞', cat: 'Kitchen & Bath', color: '#d9a45a', build: (b) => { b.box(0.28, 0.12, 0.14, 0, 0, 0, MAIN); b.box(0.26, 0.06, 0.13, 0, 0.1, 0, '#e9c27a'); } },
  { id: 'milk', name: 'Milk', emoji: '🥛', cat: 'Kitchen & Bath', color: '#fbfaf7', build: (b) => {
    b.box(0.1, 0.2, 0.1, 0, 0, 0, MAIN);
    b.box(0.1, 0.05, 0.07, 0, 0.2, 0, MAIN).rotation.x = 0.4;
    b.box(0.101, 0.08, 0.101, 0, 0.06, 0, '#93c9ea');
  } },
  { id: 'cereal', name: 'Cereal', emoji: '🥣', cat: 'Kitchen & Bath', color: '#f2a25f', build: (b) => { b.box(0.2, 0.3, 0.08, 0, 0, 0, MAIN); b.box(0.12, 0.12, 0.005, 0, 0.14, 0.042, '#fbfaf7'); b.ball(0.035, 0, 0.2, 0.045, '#f7da7e'); } },
  { id: 'banana', name: 'Bananas', emoji: '🍌', cat: 'Kitchen & Bath', color: '#f7da7e', build: (b) => {
    for (let i = 0; i < 4; i++) { const m = b.add(new THREE.TorusGeometry(0.1, 0.025, 8, 16, Math.PI * 0.8), MAIN, -0.03 + i * 0.02, 0.1, i * 0.03 - 0.045); m.rotation.z = Math.PI * 1.1; }
  } },
  { id: 'watermelon', name: 'Watermelon', emoji: '🍉', cat: 'Kitchen & Bath', color: '#4f8a46', build: (b) => { b.ball(0.2, 0, 0.17, 0, MAIN).scale.set(1, 0.85, 1.3); } },
  { id: 'cheese', name: 'Cheese', emoji: '🧀', cat: 'Kitchen & Bath', color: '#f7da7e', build: (b) => { b.box(0.2, 0.1, 0.14, 0, 0, 0, MAIN); for (const [x, z] of [[-0.05, 0.071], [0.04, 0.071]]) b.ball(0.015, x, 0.05, z, '#e0b25a'); } },
  { id: 'cookies', name: 'Cookies', emoji: '🍪', cat: 'Kitchen & Bath', color: '#fbfaf7', build: (b) => {
    b.cyl(0.16, 0.14, 0.02, 0, 0, 0, MAIN);
    for (let i = 0; i < 5; i++) { const a = i * 1.26; b.cyl(0.045, 0.045, 0.018, Math.cos(a) * 0.08, 0.02 + (i % 2) * 0.015, Math.sin(a) * 0.08, '#d9a45a'); }
  } },
  { id: 'juice', name: 'Juice', emoji: '🧃', cat: 'Kitchen & Bath', color: '#f2a25f', build: (b) => { b.box(0.08, 0.14, 0.05, 0, 0, 0, MAIN); b.cyl(0.005, 0.005, 0.06, 0.02, 0.14, 0, '#fbfaf7'); b.ball(0.02, 0, 0.08, 0.026, '#7cc46a').scale.z = 0.2; } },
  { id: 'donut', name: 'Donut', emoji: '🍩', cat: 'Kitchen & Bath', color: '#ef84ad', build: (b) => {
    b.add(new THREE.TorusGeometry(0.06, 0.03, 10, 20), '#d9a45a', 0, 0.03, 0).rotation.x = Math.PI / 2;
    b.add(new THREE.TorusGeometry(0.06, 0.026, 10, 20, Math.PI * 2), MAIN, 0, 0.042, 0).rotation.x = Math.PI / 2;
  } },

  // ---- The woods ----
  { id: 'treehouse', name: 'Treehouse', emoji: '🌳', cat: 'Outside', color: '#a0745a', fixed: true, build: (b) => {
    b.cyl(0.4, 0.55, 7, 0, 0, 0, '#5a3d2b', undefined, 10);
    b.box(3.2, 0.15, 3.2, 0, 3.0, 0, MAIN);
    b.box(2.2, 1.7, 2.0, 0, 3.15, -0.4, MAIN);
    b.cone(1.75, 1.0, 0, 4.85, -0.4, '#c8563c', undefined, 4).rotation.y = Math.PI / 4;
    b.box(0.6, 1.1, 0.02, -0.4, 3.15, 0.61, '#3b2a20');
    b.box(0.5, 0.5, 0.02, 0.55, 3.75, 0.61, '#cfe6f2', { emissive: '#fff2c4', emissiveIntensity: 0.3 });
    for (const x of [-1.55, 1.55]) b.box(0.08, 0.6, 3.2, x, 3.15, 0, MAIN);
    b.box(3.2, 0.6, 0.08, 0.95, 3.15, 1.55, MAIN);
    for (const x of [-0.85, -0.45]) b.box(0.06, 3.1, 0.06, x, 0, 1.75, '#8a6a3a');
    for (let i = 1; i < 10; i++) b.box(0.46, 0.05, 0.05, -0.65, i * 0.31, 1.75, '#8a6a3a');
    for (const [x, y, z, r] of [[0, 6.6, 0, 2.2], [1.5, 6, 0.8, 1.6], [-1.6, 6.2, -0.6, 1.7], [0.3, 7.6, -0.5, 1.5]]) b.ball(r, x, y, z, '#4f8a46');
  } },
  { id: 'tent', name: 'Tent', emoji: '⛺', cat: 'Outside', color: '#f2a25f', build: (b) => {
    b.add(new THREE.ConeGeometry(1.4, 1.6, 4), MAIN, 0, 0.8, 0).rotation.y = Math.PI / 4;
    b.box(0.7, 0.9, 0.02, 0, 0, 0.71, '#5a3d2b').rotation.x = -0.42;
    b.cyl(0.02, 0.02, 1.9, 0, 0, 0, '#8d8a85');
  } },
  { id: 'log', name: 'Log', emoji: '🪵', cat: 'Outside', color: '#7a5a3a', build: (b) => {
    b.add(new THREE.CylinderGeometry(0.24, 0.26, 1.8, 12), MAIN, 0, 0.25, 0).rotation.z = Math.PI / 2;
    for (const x of [-0.905, 0.905]) b.disc(0.22, 0.01, x, 0.25, 0, '#d9b98a').rotation.set(0, Math.PI / 2, 0);
  } },
  { id: 'stump', name: 'Tree Stump', emoji: '🪵', cat: 'Outside', color: '#7a5a3a', build: (b) => {
    b.cyl(0.36, 0.42, 0.45, 0, 0, 0, MAIN, undefined, 12);
    b.cyl(0.33, 0.33, 0.01, 0, 0.45, 0, '#d9b98a', undefined, 12);
  } },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄', cat: 'Outside', color: '#d9443a', build: (b) => {
    b.cyl(0.06, 0.08, 0.28, 0, 0, 0, '#f4efe4');
    b.add(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAIN, 0, 0.26, 0).scale.y = 0.8;
    for (let i = 0; i < 6; i++) { const a = i * 1.05; b.ball(0.03, Math.cos(a) * 0.13, 0.36, Math.sin(a) * 0.13, '#fbfaf7').scale.y = 0.5; }
    b.ball(0.035, 0, 0.44, 0, '#fbfaf7').scale.y = 0.5;
  } },
  { id: 'fairyhouse', name: 'Fairy House', emoji: '🧚', cat: 'Outside', color: '#d9443a', fixed: true, build: (b) => {
    b.cyl(0.45, 0.55, 0.8, 0, 0, 0, '#7a5a3a', undefined, 14);
    b.add(new THREE.SphereGeometry(0.75, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAIN, 0, 0.78, 0).scale.y = 0.75;
    for (let i = 0; i < 8; i++) { const a = i * 0.8; b.ball(0.07, Math.cos(a) * 0.45, 1.05, Math.sin(a) * 0.45, '#fbfaf7').scale.y = 0.5; }
    b.box(0.2, 0.32, 0.02, 0, 0.02, 0.5, '#f7da7e');
    b.ball(0.02, 0.06, 0.18, 0.52, '#d1a640');
    b.disc(0.08, 0.02, 0.28, 0.5, 0.44, '#fff2a8', { emissive: '#ffd84d', emissiveIntensity: 1.0 }).rotation.y = 0.5;
    for (const [x, z] of [[-0.6, 0.3], [0.65, 0.1], [-0.3, -0.6]]) b.ball(0.05, x, 0.05, z, ['#f4a3c4', '#f7da7e', '#bba6e6'][Math.abs(Math.round(x * 10)) % 3]);
  } },
  { id: 'treasurechest', name: 'Treasure Chest', emoji: '💎', cat: 'Outside', color: '#8a5a3a', fixed: true, action: 'give', gives: ['teddy', 'unicorn', 'robot', 'dino', 'balloons', 'cake', 'ball'], giveMsg: 'You found buried treasure! 💎', giveLabel: 'open the treasure chest', build: (b) => {
    b.box(0.9, 0.5, 0.55, 0, 0, 0, MAIN);
    b.add(new THREE.CylinderGeometry(0.275, 0.275, 0.9, 14, 1, false, 0, Math.PI), MAIN, 0, 0.5, 0).rotation.z = Math.PI / 2;
    for (const x of [-0.35, 0.35]) { b.box(0.06, 0.52, 0.57, x, 0, 0, '#d1a640', { metalness: 0.6, roughness: 0.3 }); b.add(new THREE.CylinderGeometry(0.285, 0.285, 0.06, 14, 1, false, 0, Math.PI), '#d1a640', x, 0.5, 0, { metalness: 0.6, roughness: 0.3 }).rotation.z = Math.PI / 2; }
    b.box(0.12, 0.14, 0.03, 0, 0.36, 0.28, '#d1a640', { metalness: 0.6, roughness: 0.3 });
    for (let i = 0; i < 5; i++) b.cyl(0.04, 0.04, 0.012, -0.5 + i * 0.12, 0, 0.42 + (i % 2) * 0.05, '#f2cf63', { metalness: 0.7, roughness: 0.25 });
  } },
  { id: 'berrybush', name: 'Berry Bush', emoji: '🫐', cat: 'Outside', color: '#d9443a', action: 'give', gives: ['berries'], giveMsg: 'Yummy berries! 🫐', giveLabel: 'pick berries', build: (b) => {
    for (const [x, y, z, r] of [[0, 0.35, 0, 0.45], [0.3, 0.3, 0.2, 0.32], [-0.3, 0.3, -0.15, 0.34], [0.05, 0.6, -0.1, 0.3]]) b.ball(r, x, y, z, '#3f7a3a');
    for (let i = 0; i < 16; i++) { const a = i * 2.4, y = 0.25 + (i % 4) * 0.12; b.ball(0.04, Math.cos(a) * 0.42, y, Math.sin(a) * 0.38, MAIN); }
  } },
  { id: 'cerealdisplay', name: 'Cereal Display', emoji: '🥣', cat: 'Furniture', color: '#f2a25f', action: 'give', gives: ['cereal', 'cerealbowl'], giveMsg: 'Breakfast time! 🥣', giveLabel: 'grab some cereal', build: (b) => {
    b.box(1.5, 0.5, 0.7, 0, 0, 0, '#fbfaf7');
    const cols = ['#f2a25f', '#ef84ad', '#f7da7e', '#93c9ea', '#aee0c5', '#d9443a'];
    let n = 0;
    for (const [row, y, count] of [[0, 0.5, 5], [1, 0.82, 4], [2, 1.14, 3]]) for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 0.27;
      b.box(0.24, 0.32, 0.12, x, y, 0.1 - row * 0.05, cols[n++ % cols.length]);
      b.box(0.14, 0.12, 0.005, x, y + 0.15, 0.163 - row * 0.05, '#fbfaf7');
      b.ball(0.035, x, y + 0.21, 0.165 - row * 0.05, '#f7da7e').scale.z = 0.3;
    }
    const sign = new THREE.MeshStandardMaterial({ map: signTexture('CEREAL', '#f2a25f', '#ffffff'), roughness: 0.6 });
    b.box(0.04, 0.9, 0.04, -0.7, 0.5, -0.3, '#c9ccd1'); b.box(0.04, 0.9, 0.04, 0.7, 0.5, -0.3, '#c9ccd1');
    b.box(1.4, 0.32, 0.03, 0, 1.5, -0.3, sign);
    for (const x of [-0.45, 0.45]) { b.cyl(0.11, 0.08, 0.07, x, 0.5, 0.25, '#fbfaf7'); b.cyl(0.1, 0.1, 0.005, x, 0.565, 0.25, '#fbfaf7'); for (let k = 0; k < 6; k++) b.ball(0.018, x + Math.cos(k) * 0.05, 0.575, 0.25 + Math.sin(k) * 0.05, cols[k]); }
  } },
  { id: 'cerealbowl', name: 'Bowl of Cereal', emoji: '🥣', cat: 'Kitchen & Bath', color: '#93c9ea', build: (b) => {
    b.cyl(0.12, 0.08, 0.08, 0, 0, 0, MAIN);
    b.cyl(0.108, 0.108, 0.005, 0, 0.07, 0, '#fbfaf7');
    const cols = ['#f2a25f', '#ef84ad', '#f7da7e', '#aee0c5', '#bba6e6'];
    for (let k = 0; k < 10; k++) b.add(new THREE.TorusGeometry(0.014, 0.007, 6, 10), cols[k % 5], Math.cos(k * 2.4) * (0.02 + (k % 3) * 0.025), 0.078, Math.sin(k * 2.4) * (0.02 + (k % 3) * 0.025)).rotation.x = Math.PI / 2;
    b.box(0.015, 0.008, 0.13, 0.05, 0.085, 0.02, '#c9ccd1').rotation.y = 0.4;
  } },
  { id: 'berries', name: 'Berries', emoji: '🫐', cat: 'Kitchen & Bath', color: '#4f86c6', build: (b) => {
    b.cyl(0.12, 0.09, 0.08, 0, 0, 0, '#c9a77c');
    for (let i = 0; i < 9; i++) { const a = i * 2.2, r = (i % 3) * 0.04; b.ball(0.03, Math.cos(a) * r, 0.09 + (i % 2) * 0.02, Math.sin(a) * r, i % 4 ? MAIN : '#d9443a'); }
  } },
  { id: 'birdhouse', name: 'Birdhouse', emoji: '🐦', cat: 'Outside', color: '#ef84ad', build: (b) => {
    b.box(0.06, 1.5, 0.06, 0, 0, 0, '#8a6a3a');
    b.box(0.3, 0.32, 0.28, 0, 1.5, 0, MAIN);
    b.box(0.36, 0.03, 0.36, 0, 1.82, 0, '#fbfaf7').rotation.z = 0.0;
    b.disc(0.05, 0.01, 0, 1.7, 0.145, '#2a2727');
    b.box(0.02, 0.02, 0.08, 0, 1.6, 0.17, '#8a6a3a');
  } },

  // ---- Hospital ----
  { id: 'exambed', name: 'Exam Bed', emoji: '🩺', cat: 'Furniture', color: '#93c9ea', build: (b) => {
    b.box(0.8, 0.6, 1.9, 0, 0, 0, '#e8e8ee');
    b.box(0.82, 0.12, 1.92, 0, 0.6, 0, MAIN);
    b.box(0.82, 0.12, 0.6, 0, 0.72, -0.62, MAIN).rotation.x = -0.35;
    b.box(0.76, 0.01, 1.4, 0, 0.73, 0.2, WHITE);
  } },
  { id: 'hospitalbed', name: 'Hospital Bed', emoji: '🛏️', cat: 'Furniture', color: '#aee0c5', build: (b) => {
    b.box(1.0, 0.08, 2.0, 0, 0.45, 0, '#c9ccd1');
    b.legs(0.9, 1.9, 0.45, 0.05, '#c9ccd1');
    b.box(0.95, 0.15, 1.95, 0, 0.53, 0, WHITE);
    b.box(0.98, 0.06, 1.3, 0, 0.68, 0.3, MAIN);
    b.box(0.6, 0.12, 0.35, 0, 0.68, -0.72, WHITE);
    b.box(1.0, 0.5, 0.05, 0, 0.5, -1.0, '#c9ccd1'); b.box(1.0, 0.35, 0.05, 0, 0.5, 1.0, '#c9ccd1');
    for (const x of [-0.52, 0.52]) b.box(0.03, 0.2, 0.9, x, 0.68, -0.3, '#c9ccd1');
    b.cyl(0.015, 0.015, 1.7, 0.7, 0, -0.9, METAL); b.box(0.12, 0.18, 0.04, 0.7, 1.55, -0.9, '#cfe6f2', GLASS);
  } },
  { id: 'xray', name: 'X-Ray Lightbox', emoji: '🦴', cat: 'Wall Stuff', wall: true, color: '#fbfaf7', build: (b) => {
    b.box(1.3, 0.95, 0.05, 0, -0.475, 0.025, MAIN);
    const m = new THREE.MeshBasicMaterial({ map: xrayPicture() });
    b.add(new THREE.PlaneGeometry(1.18, 0.83), m, 0, 0, 0.056).name = 'film';
  } },
  { id: 'wheelchair', name: 'Wheelchair', emoji: '♿', cat: 'Furniture', color: '#4f86c6', build: (b) => {
    b.box(0.5, 0.06, 0.48, 0, 0.48, 0, MAIN);
    b.box(0.5, 0.5, 0.05, 0, 0.5, -0.24, MAIN);
    for (const x of [-0.3, 0.3]) {
      b.add(new THREE.TorusGeometry(0.28, 0.025, 8, 24), BLACK, x, 0.3, -0.05).rotation.y = Math.PI / 2;
      b.box(0.03, 0.3, 0.03, x * 0.9, 0.48, 0.2, METAL);
      b.box(0.03, 0.03, 0.4, x * 0.9, 0.7, -0.05, METAL);
    }
    b.box(0.4, 0.03, 0.15, 0, 0.12, 0.33, METAL);
  } },
  { id: 'ambulance', name: 'Ambulance', emoji: '🚑', cat: 'Outside', color: '#fbfaf7', action: 'drive', seat: { x: 0.45, z: 2.0, eye: 1.6 }, mainOpts: { roughness: 0.35 }, build: (b) => {
    b.box(2.1, 0.75, 5.8, 0, 0.4, 0, MAIN);
    cabin(b, 2.0, 0.75, 1.3, 1.15, 2.2);
    seats(b, 1.15, 0.45, 1.9);
    b.box(2.12, 1.55, 3.9, 0, 1.15, -0.9, MAIN);
    b.box(2.14, 0.16, 5.82, 0, 0.95, 0, '#d9443a');
    for (const x of [-1.075, 1.075]) { b.box(0.012, 0.5, 0.15, x, 1.6, -0.9, '#d9443a'); b.box(0.012, 0.15, 0.5, x, 1.775, -0.9, '#d9443a'); }
    b.box(1.6, 0.14, 0.3, 0, 2.7, 0.9, '#d9443a', { emissive: '#ff3b2f', emissiveIntensity: 0.8 });
    b.box(1.6, 0.25, 0.03, 0, 0.6, 2.91, '#2f3238');
    for (const x of [-0.75, 0.75]) b.ball(0.11, x, 0.85, 2.9, WHITE, { emissive: '#fff6d8', emissiveIntensity: 0.8 }).scale.z = 0.3;
    wheels(b, 0.42, 0.32, 1.05, [-1.9, 1.9]);
  } },

  // ---- Library ----
  { id: 'storybook', name: 'Storybook', emoji: '📖', cat: 'Toys & Pets', color: '#8a5a3a', build: (b) => {
    b.box(0.05, 0.9, 0.05, 0, 0, 0, '#8a6a3a');
    b.box(0.4, 0.04, 0.3, 0, 0.9, 0, '#8a6a3a').rotation.x = -0.4;
    for (const s of [-1, 1]) {
      b.box(0.3, 0.03, 0.38, s * 0.16, 0.98, 0.02, MAIN).rotation.set(-0.4, 0, -s * 0.12);
      b.box(0.27, 0.015, 0.34, s * 0.15, 1.0, 0.02, '#fbfaf7').rotation.set(-0.4, 0, -s * 0.12);
    }
  } },

  // ---- Movie theater ----
  { id: 'theaterseat', name: 'Theater Seat', emoji: '🎬', cat: 'Furniture', color: '#c8463c', build: (b) => {
    b.box(0.6, 0.42, 0.55, 0, 0, 0, '#2a2727');
    b.box(0.56, 0.12, 0.5, 0, 0.36, 0.02, MAIN);
    b.box(0.56, 0.6, 0.12, 0, 0.42, -0.22, MAIN);
    for (const x of [-0.3, 0.3]) b.box(0.06, 0.25, 0.5, x, 0.42, 0, '#2a2727');
  } },
  { id: 'moviescreen', name: 'Movie Screen', emoji: '🎞️', cat: 'Wall Stuff', wall: true, color: '#2a2727', build: (b) => {
    b.box(6.3, 3.5, 0.08, 0, -1.75, 0.04, MAIN);
    b.box(6.0, 3.25, 0.01, 0, -1.625, 0.085, '#0e1116');
    for (const x of [-3.4, 3.4]) b.box(0.5, 3.8, 0.1, x, -1.9, 0.1, '#7a1f2a');
  } },
  { id: 'popcornmachine', name: 'Popcorn Machine', emoji: '🍿', cat: 'Kitchen & Bath', color: '#d9443a', fixed: true, action: 'give', gives: ['popcorn'], giveMsg: 'Fresh popcorn! 🍿', giveLabel: 'get some popcorn', build: (b) => {
    b.box(0.8, 0.8, 0.6, 0, 0, 0, MAIN);
    b.box(0.76, 0.75, 0.56, 0, 0.8, 0, '#cfe6f2', GLASS);
    for (let i = 0; i < 40; i++) b.ball(0.035, (Math.random() - 0.5) * 0.66, 0.84 + Math.random() * 0.22, (Math.random() - 0.5) * 0.46, '#fff4c4');
    b.box(0.82, 0.12, 0.62, 0, 1.55, 0, MAIN);
    b.cone(0.3, 0.2, 0, 1.67, 0, '#f7da7e', undefined, 16);
  } },
  { id: 'popcorn', name: 'Popcorn', emoji: '🍿', cat: 'Kitchen & Bath', color: '#d9443a', build: (b) => {
    const m = new THREE.MeshStandardMaterial({ map: stripes('#d9443a', '#fbfaf7'), roughness: 0.7 });
    m.map.repeat.set(5, 1);
    b.add(new THREE.CylinderGeometry(0.1, 0.075, 0.2, 16, 1, true), m, 0, 0.1, 0);
    for (let i = 0; i < 14; i++) b.ball(0.03, Math.cos(i * 2.3) * (0.03 + (i % 3) * 0.025), 0.2 + (i % 4) * 0.015, Math.sin(i * 2.3) * (0.03 + (i % 3) * 0.025), '#fff4c4');
  } },

  // ---- Farm ----
  { id: 'haybale', name: 'Hay Bale', emoji: '🌾', cat: 'Outside', color: '#e0c06a', build: (b) => {
    b.box(1.0, 0.5, 0.6, 0, 0, 0, MAIN);
    for (const x of [-0.25, 0.25]) b.box(0.03, 0.52, 0.62, x, 0, 0, '#8a6a3a');
  } },
  { id: 'tractor', name: 'Tractor', emoji: '🚜', cat: 'Outside', color: '#4f8a46', action: 'drive', seat: { x: 0, z: -0.4, eye: 1.95 }, build: (b) => {
    b.box(1.0, 0.7, 2.2, 0, 0.55, 0.2, MAIN);
    b.box(0.9, 0.12, 0.8, 0, 1.25, -0.45, MAIN);
    b.box(0.5, 0.45, 0.1, 0, 1.37, -0.8, '#2a2727');
    b.cyl(0.06, 0.06, 0.7, 0.3, 1.25, 0.9, '#2a2727');
    b.cyl(0.14, 0.14, 0.03, 0, 1.65, -0.15, BLACK).rotation.x = 1.0;
    for (const x of [-0.75, 0.75]) {
      b.add(new THREE.CylinderGeometry(0.7, 0.7, 0.4, 24), BLACK, x, 0.7, -0.5).rotation.z = Math.PI / 2;
      b.add(new THREE.CylinderGeometry(0.35, 0.35, 0.42, 16), '#f2cf63', x, 0.7, -0.5).rotation.z = Math.PI / 2;
      b.add(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 18), BLACK, x * 0.85, 0.38, 1.0).rotation.z = Math.PI / 2;
      b.add(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 12), '#f2cf63', x * 0.85, 0.38, 1.0).rotation.z = Math.PI / 2;
    }
    b.ball(0.08, 0.3, 1.0, 1.31, WHITE, { emissive: '#fff6d8', emissiveIntensity: 0.6 }).scale.z = 0.4;
    b.ball(0.08, -0.3, 1.0, 1.31, WHITE, { emissive: '#fff6d8', emissiveIntensity: 0.6 }).scale.z = 0.4;
  } },
  { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', cat: 'Outside', color: '#f2a25f', build: (b) => {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.ball(0.16, Math.cos(a) * 0.08, 0.17, Math.sin(a) * 0.08, MAIN).scale.set(0.75, 1, 0.75); }
    b.cyl(0.025, 0.035, 0.12, 0, 0.3, 0, '#5a7a3a');
  } },

  // ---- Beach ----
  { id: 'sandcastle', name: 'Sandcastle', emoji: '🏰', cat: 'Outside', color: '#e9d39a', build: (b) => {
    b.box(0.9, 0.25, 0.9, 0, 0, 0, MAIN);
    for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) { b.cyl(0.12, 0.14, 0.4, x, 0.25, z, MAIN, undefined, 10); b.cone(0.13, 0.15, x, 0.65, z, MAIN, undefined, 10); }
    b.cyl(0.18, 0.2, 0.55, 0, 0.25, 0, MAIN, undefined, 12);
    b.cone(0.2, 0.2, 0, 0.8, 0, MAIN, undefined, 12);
    b.box(0.01, 0.2, 0.01, 0, 1.0, 0, '#8a6a3a'); b.box(0.12, 0.07, 0.005, 0.06, 1.13, 0, '#ef84ad');
  } },

  // ---- Fun Park stands ----
  { id: 'cottoncandystand', name: 'Cotton Candy Stand', emoji: '🍭', cat: 'Kitchen & Bath', color: '#ef84ad', fixed: true, action: 'give', gives: ['cottoncandy'], giveMsg: 'Fluffy cotton candy! 🍭', giveLabel: 'get cotton candy', build: (b) => {
    b.box(1.8, 1.0, 0.9, 0, 0, 0, MAIN);
    for (const x of [-0.85, 0.85]) b.box(0.08, 1.4, 0.08, x, 1.0, 0.4, WHITE);
    const m = new THREE.MeshStandardMaterial({ map: stripes('#ef84ad', '#fbfaf7'), roughness: 0.7 });
    m.map.repeat.set(6, 1);
    b.box(2.0, 0.12, 1.1, 0, 2.4, 0.1, m);
    for (let i = 0; i < 5; i++) { b.cyl(0.01, 0.01, 0.3, -0.6 + i * 0.3, 1.0, -0.2, WHITE); b.ball(0.12, -0.6 + i * 0.3, 1.38, -0.2, i % 2 ? '#93c9ea' : '#f4a3c4'); }
  } },
  { id: 'hotdogstand', name: 'Hot Dog Stand', emoji: '🌭', cat: 'Kitchen & Bath', color: '#f2cf63', fixed: true, action: 'give', gives: ['hotdog'], giveMsg: 'A yummy hot dog! 🌭', giveLabel: 'get a hot dog', build: (b) => {
    b.box(1.8, 1.0, 0.9, 0, 0, 0, MAIN);
    b.box(1.6, 0.1, 0.7, 0, 1.0, 0, '#c9ccd1');
    for (const x of [-0.85, 0.85]) b.box(0.08, 1.4, 0.08, x, 1.0, 0.4, WHITE);
    const m = new THREE.MeshStandardMaterial({ map: stripes('#d9443a', '#f2cf63'), roughness: 0.7 });
    m.map.repeat.set(6, 1);
    b.box(2.0, 0.12, 1.1, 0, 2.4, 0.1, m);
    for (let i = 0; i < 4; i++) b.add(new THREE.CapsuleGeometry(0.04, 0.22, 4, 8), '#c8563c', -0.45 + i * 0.3, 1.14, 0).rotation.z = Math.PI / 2;
  } },
  { id: 'gamebooth', name: 'Ring Toss Game', emoji: '🎯', cat: 'Toys & Pets', color: '#d9443a', fixed: true, action: 'give', gives: ['teddy', 'unicorn', 'dino', 'balloons', 'ball'], giveMsg: 'You won a prize! 🏆', giveLabel: 'play ring toss', build: (b) => {
    b.box(2.2, 0.9, 0.5, 0, 0, 0.6, MAIN);
    for (const x of [-1.05, 1.05]) b.box(0.1, 2.6, 0.1, x, 0, 0.8, WHITE);
    const m = new THREE.MeshStandardMaterial({ map: stripes('#d9443a', '#fbfaf7'), roughness: 0.7 });
    m.map.repeat.set(6, 1);
    b.box(2.4, 0.15, 1.8, 0, 2.6, 0, m);
    b.box(2.2, 1.6, 0.1, 0, 0.9, -0.8, '#fbfaf7');
    for (let i = 0; i < 9; i++) b.cyl(0.04, 0.05, 0.25, -0.6 + (i % 3) * 0.6, 0.9, 0.2 - Math.floor(i / 3) * 0.3, ['#f7da7e', '#93c9ea', '#aee0c5'][i % 3]);
    for (let i = 0; i < 3; i++) b.ball(0.16, -0.6 + i * 0.6, 1.25, -0.6, ['#c69c6d', '#f4f1ea', '#7cc46a'][i]);
  } },
  { id: 'cottoncandy', name: 'Cotton Candy', emoji: '🍭', cat: 'Kitchen & Bath', color: '#f4a3c4', build: (b) => { b.cyl(0.012, 0.012, 0.32, 0, 0, 0, WHITE); b.ball(0.13, 0, 0.36, 0, MAIN).scale.set(1, 1.15, 1); } },
  { id: 'hotdog', name: 'Hot Dog', emoji: '🌭', cat: 'Kitchen & Bath', color: '#e9c27a', build: (b) => {
    b.add(new THREE.CapsuleGeometry(0.045, 0.2, 4, 8), MAIN, 0, 0.05, 0).rotation.z = Math.PI / 2;
    b.add(new THREE.CapsuleGeometry(0.03, 0.24, 4, 8), '#c8563c', 0, 0.09, 0).rotation.z = Math.PI / 2;
    b.box(0.2, 0.01, 0.015, 0, 0.12, 0, '#f2cf63');
  } },
];

export const BY_ID = Object.fromEntries(CATALOG.map((d) => [d.id, d]));
export const CATEGORIES = [...new Set(CATALOG.filter((d) => !d.hidden).map((d) => d.cat))];

export function createItem(type, color) {
  const def = BY_ID[type];
  if (!def) { console.warn('Unknown item', type); return null; }
  const c = color ?? def.color;
  const b = new Builder(c, def.mainOpts);
  def.build(b);
  const g = b.group;
  mergeStatic(g); // fewer pieces = faster drawing (moving parts live in sub-groups and stay separate)
  g.traverse((m) => {
    if (!m.isMesh) return;
    const transparent = m.material.transparent || m.material.isMeshBasicMaterial;
    m.castShadow = !transparent;
    m.receiveShadow = true;
  });
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g);
  g.userData = {
    isItem: true, type, name: def.name, wall: !!def.wall, fixed: !!def.fixed,
    color: c, mainMat: b.mainMat,
    baseY: -box.min.y,
    hx: Math.max(Math.abs(box.min.x), Math.abs(box.max.x)),
    hz: Math.max(Math.abs(box.min.z), Math.abs(box.max.z)),
    rotY: 0, onWall: false,
    action: def.action ?? (def.id === 'fireplace' ? 'toggle' : null),
    seat: def.seat ?? null,
    gives: def.gives ?? null, giveMsg: def.giveMsg ?? '', giveLabel: def.giveLabel ?? 'get one!',
    anim: def.animate ?? null,
  };
  return g;
}

export function recolor(item, color) {
  item.userData.mainMat.color.set(color);
  item.userData.color = color;
}
