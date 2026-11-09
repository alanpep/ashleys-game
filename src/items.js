// Every thing you can place in the house. Each one is built from simple shapes.
// Convention: an item stands on y=0, is centered on x/z, and its FRONT faces +z.
// Wall items (wall: true) are centered on y=0 with their back at z=0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { tex, scaleBoxUV } from './textures.js';
import { P } from './palette.js';

export { KID_COLORS, WALL_COLORS, FLOOR_COLORS } from './palette.js';

export const nextIn = (list, cur) => list[(list.indexOf(cur) + 1) % list.length];

const MAIN = 'MAIN';
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

class Builder {
  constructor(mainColor, mainOpts = {}) {
    this.group = new THREE.Group();
    this.mainMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.75, ...mainOpts });
  }
  mat(c, opts) {
    if (c === MAIN) return this.mainMat;
    if (c instanceof THREE.Material) return c;
    return new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...opts });
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
  { id: 'clock', name: 'Clock', emoji: '🕰️', cat: 'Wall Stuff', wall: true, color: '#34302f', build: (b) => {
    b.disc(0.22, 0.03, 0, 0, 0.015, MAIN);
    b.disc(0.195, 0.01, 0, 0, 0.035, WHITE);
    b.box(0.015, 0.14, 0.006, 0, 0, 0.05, BLACK);
    b.box(0.1, 0.015, 0.006, 0.05, -0.0075, 0.056, BLACK);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.box(0.012, 0.012, 0.006, Math.sin(a) * 0.17, Math.cos(a) * 0.17 - 0.006, 0.046, BLACK); }
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
      const leg = b.box(0.06, 2.0, 0.06, sx, 0, sz * 0.38, '#5c5248'); leg.rotation.x = sz * 0.22;
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
  };
  return g;
}

export function recolor(item, color) {
  item.userData.mainMat.color.set(color);
  item.userData.color = color;
}
