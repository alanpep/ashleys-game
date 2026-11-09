// Little hand-drawn textures (made with a canvas, so no image files needed).
import * as THREE from 'three';

let seed = 1;
function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

const cache = {};
const cached = (k, f) => (cache[k] ??= f());

export const tex = {
  // 1 texture tile = 1 meter. Use with world-sized UVs.
  brick: () => cached('brick', () => { seed = 7; return canvasTex(512, (g, s) => {
    g.fillStyle = '#cfc6ba'; g.fillRect(0, 0, s, s);
    const rows = 14, cols = 4, bh = s / rows, bw = s / cols, gap = 3;
    const colors = ['#a4553f', '#9a4a36', '#b0624a', '#8f4433', '#a85a40', '#b86b4f', '#94503c'];
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? -bw / 2 : 0;
      for (let c = 0; c <= cols; c++) {
        g.fillStyle = pick(colors);
        g.fillRect(off + c * bw + gap / 2, r * bh + gap / 2, bw - gap, bh - gap);
      }
    }
  }); }),

  // 1 tile = 2 meters. Grayscale so the room's floor color tints it.
  wood: () => cached('wood', () => { seed = 3; return canvasTex(512, (g, s) => {
    const planks = 11, pw = s / planks;
    for (let p = 0; p < planks; p++) {
      let y = -rand() * 300;
      while (y < s) {
        const len = 220 + rand() * 160, v = 205 + Math.floor(rand() * 45);
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(p * pw, y, pw, len);
        for (let k = 0; k < 6; k++) {
          const gv = v - 15 + Math.floor(rand() * 30);
          g.strokeStyle = `rgba(${gv},${gv},${gv},0.6)`;
          g.beginPath();
          const gx = p * pw + 4 + rand() * (pw - 8);
          g.moveTo(gx, y); g.lineTo(gx + (rand() - 0.5) * 6, y + len); g.stroke();
        }
        g.fillStyle = '#7a7a7a'; g.fillRect(p * pw, y, pw, 2);
        y += len;
      }
      g.fillStyle = '#8a8a8a'; g.fillRect(p * pw, 0, 2, s);
    }
  }, 0.5); }),

  carpet: () => cached('carpet', () => { seed = 5; return canvasTex(256, (g, s) => {
    g.fillStyle = '#ececec'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      const v = 205 + Math.floor(rand() * 50);
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rand() * s, rand() * s, 2, 2);
    }
  }); }),

  // 1 tile = 0.6 m, four 30cm tiles
  tile: () => cached('tile', () => canvasTex(256, (g, s) => {
    g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#b9b9b9';
    for (const p of [0, s / 2]) { g.fillRect(p, 0, 3, s); g.fillRect(0, p, s, 3); }
  }, 1 / 0.6)),

  // Soft painterly grass: big gentle patches + short blades. 1 tile = 4 m.
  grass: () => cached('grass', () => { seed = 11; return canvasTex(512, (g, s) => {
    g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      const v = 214 + Math.floor(rand() * 30), x = rand() * s, y = rand() * s, r = 30 + rand() * 70;
      for (const [dx, dy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
        const grd = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        grd.addColorStop(0, `rgba(${v},${v},${v},0.55)`); grd.addColorStop(1, `rgba(${v},${v},${v},0)`);
        g.fillStyle = grd; g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
    g.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {
      const v = 200 + Math.floor(rand() * 50), x = rand() * s, y = rand() * s, h = 4 + rand() * 6;
      g.strokeStyle = `rgba(${v},${v},${v},0.7)`; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rand() - 0.5) * 3, y - h); g.stroke();
    }
  }, 1 / 4); }),

  // Roof shingles. Rows run along the texture's U axis (that's how the roof's UVs are laid out).
  shingles: () => cached('shingles', () => { seed = 17; return canvasTex(256, (g, s) => {
    g.fillStyle = '#3c3836'; g.fillRect(0, 0, s, s);
    const rows = 8, rw = s / rows, tabs = 6, th = s / tabs;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * th / 2;
      for (let t = -1; t <= tabs; t++) {
        const v = 70 + Math.floor(rand() * 26);
        g.fillStyle = `rgb(${v},${v - 4},${v - 7})`;
        g.fillRect(r * rw + 2, off + t * th + 2, rw - 3, th - 3);
      }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(r * rw, 0, 3, s);
    }
  }, 1 / 1.2); }),

  // Cream lap siding for the gable ends. 1 tile = 1 m, 6 boards.
  siding: () => cached('siding', () => canvasTex(128, (g, s) => {
    g.fillStyle = '#ece5d1'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 6; i++) {
      const y = (i * s) / 6;
      const grd = g.createLinearGradient(0, y, 0, y + s / 6);
      grd.addColorStop(0, '#d9d1bb'); grd.addColorStop(0.25, '#efe8d6'); grd.addColorStop(1, '#e9e1cc');
      g.fillStyle = grd; g.fillRect(0, y, s, s / 6);
    }
  })),

  star: () => cached('star', () => { const t = canvasTex(64, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.fillStyle = '#ffffff'; g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? s * 0.2 : s * 0.47;
      g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r);
    }
    g.closePath(); g.fill();
  }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; }),

  // black leaves on cream, like the patio door curtains
  floral: () => cached('floral', () => { seed = 9; return canvasTex(256, (g, s) => {
    g.fillStyle = '#f2eee6'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#1f1f1f'; g.strokeStyle = '#1f1f1f'; g.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const x = rand() * s, y = rand() * s;
      for (let k = 0; k < 5; k++) {
        const a = rand() * Math.PI * 2, d = 10 + rand() * 8;
        g.beginPath();
        g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 8, 4, a, 0, Math.PI * 2);
        g.fill();
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); g.stroke();
      }
    }
  }, 2); }),

  landscape: () => cached('landscape', () => canvasTex(256, (g, s) => {
    const sky = g.createLinearGradient(0, 0, 0, s * 0.65);
    sky.addColorStop(0, '#5aa9e6'); sky.addColorStop(1, '#cfe8ff');
    g.fillStyle = sky; g.fillRect(0, 0, s, s);
    g.fillStyle = '#ffffff';
    for (const [x, y, r] of [[60, 50, 22], [85, 45, 28], [110, 52, 20], [190, 80, 18], [210, 74, 24]]) {
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#7fbf5a'; g.beginPath(); g.ellipse(70, s, 160, 110, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5ea548'; g.beginPath(); g.ellipse(220, s, 150, 90, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3f7d34'; g.beginPath(); g.arc(200, 150, 18, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6b4a2b'; g.fillRect(197, 160, 6, 22);
  })),

  globe: () => cached('globe', () => { seed = 13; return canvasTex(256, (g, s) => {
    g.fillStyle = '#3b82c4'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 14; i++) {
      g.fillStyle = pick(['#6dbb5a', '#8fcf6a', '#d9c27a']);
      g.beginPath(); g.ellipse(rand() * s, 30 + rand() * (s - 60), 10 + rand() * 30, 8 + rand() * 22, rand() * 3, 0, Math.PI * 2); g.fill();
    }
  }); }),
};

// Make a box's texture coordinates measured in meters (so textures don't stretch).
export function scaleBoxUV(geo, w, h, d) {
  const uv = geo.attributes.uv;
  const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * sizes[f][0], uv.getY(i) * sizes[f][1]);
    }
  }
  uv.needsUpdate = true;
}

// Texture coordinates from world position, so neighbouring pieces line up.
export function worldBoxUV(geo, ox, oy, oz) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ox, y = pos.getY(i) + oy, z = pos.getZ(i) + oz;
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    if (nx > 0.5) uv.setXY(i, z, y);
    else if (ny > 0.5) uv.setXY(i, x, z);
    else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true;
}
