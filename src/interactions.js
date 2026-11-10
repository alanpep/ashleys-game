// Right-click fun! Every thing in the world can do something when you right-click it:
// balls bounce, dogs bark, the hydrant squirts, TVs and lamps turn on and off,
// and you can sit on chairs, nap in beds, go down slides, swing, and jump on the trampoline.
import * as THREE from 'three';
import { bubble } from './townsfolk.js';
import { tone, noise, melody } from './sound.js';

// Things that stay on or off (saved, and shared with the other player). value = starts on?
const TOGGLES = { tv: false, walltv: false, floorlamp: true, tablelamp: true, lights: true, streetlamp: true, stove: false, firepit: false, computer: true, moviescreen: true };
export const isToggle = (type) => type in TOGGLES;

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- sounds ----------
const S = {
  boing: () => tone(180, 0.25, 'sine', 0.12, 3),
  woof: () => { tone(190, 0.12, 'sawtooth', 0.1, 0.6); tone(170, 0.15, 'sawtooth', 0.1, 0.6, 0.2); },
  meow: () => { tone(520, 0.16, 'triangle', 0.1, 1.5); tone(780, 0.3, 'triangle', 0.1, 0.6, 0.15); },
  roar: () => { noise(0.7, 0.14, 500, 0, 150); tone(95, 0.7, 'sawtooth', 0.07, 0.7); },
  beepboop: () => [880, 660, 990, 520].forEach((f, i) => tone(f, 0.09, 'square', 0.04, 1, i * 0.13)),
  quack: () => { tone(520, 0.12, 'sawtooth', 0.08, 0.6); tone(480, 0.14, 'sawtooth', 0.08, 0.6, 0.16); },
  flush: () => { noise(1.4, 0.13, 2500, 0, 200); tone(300, 0.6, 'sine', 0.04, 0.4, 0.5); },
  water: (d = 2.5) => noise(d, 0.05, 3500),
  splash: () => noise(0.5, 0.1, 2000, 0, 400),
  bell: () => { tone(1700, 0.35, 'sine', 0.07, 1); tone(1700, 0.35, 'sine', 0.07, 1, 0.22); },
  cuckoo: () => { for (const w of [0, 0.6]) { tone(780, 0.18, 'sine', 0.1, 1, w); tone(620, 0.25, 'sine', 0.1, 1, w + 0.22); } },
  whee: () => tone(420, 0.9, 'sine', 0.09, 2.2),
  vroom: () => tone(90, 0.6, 'sawtooth', 0.06, 1.8),
  munch: () => { for (let i = 0; i < 3; i++) noise(0.07, 0.12, 3000, i * 0.16); },
  creak: () => tone(260, 0.3, 'sawtooth', 0.03, 1.5),
  clank: () => { tone(320, 0.08, 'square', 0.06, 0.5); noise(0.1, 0.06, 4000); },
  hammer: () => { for (let i = 0; i < 3; i++) { tone(220, 0.06, 'square', 0.08, 0.5, i * 0.28); noise(0.05, 0.08, 5000, i * 0.28); } },
  swish: () => noise(0.35, 0.08, 6000, 0, 2000),
  sizzle: () => noise(1.2, 0.05, 7000),
  click: () => tone(520, 0.05, 'square', 0.04, 1),
  pop: () => tone(700, 0.08, 'sine', 0.1, 0.4),
  sparkle: () => [1320, 1568, 1760, 2093].forEach((f, i) => tone(f, 0.2, 'triangle', 0.06, 1.01, i * 0.07)),
  yay: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.08, 1.01, i * 0.09)),
};
const TUNES = [
  ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', '-', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4'], // twinkle twinkle
  ['E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'E4', '-', 'D4', 'D4', 'D4', '-', 'E4', 'G4', 'G4'],  // mary had a little lamb
  ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'], // up and down
];
const BIRTHDAY = ['C4', 'C4', 'D4', 'C4', 'F4', 'E4', '-', 'C4', 'C4', 'D4', 'C4', 'G4', 'F4'];

export function setupInteractions(ctx) {
  const { scene, look, player } = ctx;
  const effects = [];
  const live = new Set(); // things that animate while they're on (TVs, fire pits)

  function effect(dur, step, done) { effects.push({ t: 0, dur, step, done }); }
  const top = (it) => new THREE.Box3().setFromObject(it).max.y;
  const at = (it, x, y, z) => V(x, y, z).applyMatrix4(it.matrixWorld);
  const alive = (it) => !!it.parent;

  // ---------- particles ----------
  const pGeo = new THREE.SphereGeometry(1, 8, 6);
  const pMats = new Map();
  const pMat = (color, opacity) => {
    const k = color + opacity;
    if (!pMats.has(k)) pMats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.3, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
    return pMats.get(k);
  };
  const parts = [];
  function particle(pos, vel, { color = '#8fd3ff', size = 0.04, life = 1.2, gravity = 9, opacity = 0.85, grow = 0 } = {}) {
    if (parts.length > 500) return;
    const m = new THREE.Mesh(pGeo, pMat(color, opacity));
    m.position.copy(pos); m.scale.setScalar(size);
    scene.add(m);
    parts.push({ m, v: vel, life, age: 0, gravity, size, grow });
  }
  // a stream of particles for a while. make(i) returns [position, velocity, options]
  function emitter(dur, perSecond, make) {
    let acc = 0;
    effect(dur, (k, dt) => { acc += dt * perSecond; while (acc >= 1) { acc--; particle(...make()); } });
  }

  // ---------- words and floating emoji ----------
  function say(it, text, dur = 2.4) {
    const b = bubble(text);
    const base = it.isObject3D ? V(it.position.x, top(it) + 0.45, it.position.z) : it.clone();
    b.position.copy(base);
    scene.add(b);
    effect(dur, (k) => { b.position.y = base.y + k * 0.25; b.material.opacity = k > 0.8 ? (1 - k) * 5 : 1; }, () => scene.remove(b));
  }
  function floater(text, pos, dur = 1.6) {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const g = c.getContext('2d');
    g.font = '64px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 48, 52);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; // without this, emoji come out dark and murky
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false }));
    s.scale.setScalar(0.35);
    const p0 = pos.clone(), dx = rand(-0.3, 0.3);
    scene.add(s);
    effect(dur, (k) => { s.position.set(p0.x + dx * k + Math.sin(k * 9) * 0.05, p0.y + k * 0.9, p0.z); s.material.opacity = 1 - k * k; }, () => { scene.remove(s); tex.dispose(); });
  }
  function floaters(list, it, n = 5, spacing = 0.25) {
    const p = V(it.position.x, top(it) + 0.1, it.position.z);
    for (let i = 0; i < n; i++) effect(i * spacing, () => {}, () => floater(pick(list), p));
  }

  // ---------- moving things for a moment (always put back exactly) ----------
  function lockedMove(it, dur, step) {
    const ud = it.userData;
    if (ud.moving) return;
    ud.moving = true;
    const p0 = it.position.clone(), r0 = it.rotation.clone(), s0 = it.scale.clone();
    effect(dur, (k, dt, t) => {
      if (!alive(it) || it === ctx.held()) return;
      it.position.copy(p0); it.rotation.copy(r0); it.scale.copy(s0);
      step(k, t, p0);
      it.updateMatrixWorld(true);
    }, () => {
      ud.moving = false;
      if (!alive(it) || it === ctx.held()) return;
      it.position.copy(p0); it.rotation.copy(r0); it.scale.copy(s0);
      it.updateMatrixWorld(true);
    });
  }
  const hop = (it, h = 0.25, n = 1, dur = 0.5) => lockedMove(it, dur * n, (k) => { it.position.y += Math.abs(Math.sin(k * Math.PI * n)) * h * (1 - k * 0.5); });
  const wiggle = (it) => lockedMove(it, 0.6, (k) => { it.rotation.z += Math.sin(k * Math.PI * 6) * 0.12 * (1 - k); });
  const spin = (it, turns = 2, dur = 1.4) => lockedMove(it, dur, (k) => { it.rotation.y += (1 - (1 - k) ** 3) * turns * Math.PI * 2; });
  const growBounce = (it) => lockedMove(it, 0.8, (k) => { it.scale.multiplyScalar(1 + Math.sin(k * Math.PI) * 0.15); });
  function bounce(it) {
    lockedMove(it, 2.2, (k) => {
      const n = 4, seg = Math.floor(k * n), u = k * n - seg;
      it.position.y += Math.sin(u * Math.PI) * 1.4 * 0.5 ** seg;
      it.rotation.x += k * 9;
    });
    for (let i = 0; i < 4; i++) effect(i * 0.55, () => {}, () => { if (!ctx.sfx('bounce', it.position, { vol: 0.75 ** i })) tone(200 + i * 30, 0.2, 'sine', 0.1 * 0.7 ** i, 2.6); });
  }

  // ---------- on / off things ----------
  // a shared cartoon for every TV that's on
  const tvCanvas = document.createElement('canvas');
  tvCanvas.width = 256; tvCanvas.height = 144;
  const tvTex = new THREE.CanvasTexture(tvCanvas);
  tvTex.colorSpace = THREE.SRGBColorSpace;
  const tvOn = new THREE.MeshBasicMaterial({ map: tvTex });
  const tvOff = new THREE.MeshStandardMaterial({ color: '#0e1116', roughness: 0.15 });
  let tvTimer = 0;
  function drawTV(t) {
    const g = tvCanvas.getContext('2d'), W = 256, H = 144;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#7ec8f2'); sky.addColorStop(1, '#d9f1ff');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(210, 30, 16 + Math.sin(t * 3) * 2, 0, 7); g.fill();
    g.fillStyle = '#86c06c'; g.beginPath(); g.ellipse(70, 150, 140, 50, 0, 0, 7); g.fill();
    g.fillStyle = '#6fae5a'; g.beginPath(); g.ellipse(220, 155, 120, 45, 0, 0, 7); g.fill();
    const x = ((t * 50) % (W + 60)) - 30, y = 92 - Math.abs(Math.sin(t * 5)) * 30; // a bouncing bunny friend
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill();
    g.fillRect(x - 8, y - 30, 5, 18); g.fillRect(x + 3, y - 30, 5, 18);
    g.fillStyle = '#ef84ad'; g.beginPath(); g.arc(x + 9, y - 2, 3, 0, 7); g.fill();
    g.fillStyle = '#3a2a4a'; g.beginPath(); g.arc(x + 4, y - 4, 2, 0, 7); g.fill();
    for (let i = 0; i < 3; i++) { g.fillStyle = ['#ef84ad', '#bba6e6', '#f7da7e'][i]; g.beginPath(); g.arc(40 + i * 60 + Math.sin(t * 2 + i) * 10, 40 + Math.cos(t * 1.5 + i) * 8, 8, 0, 7); g.fill(); }
    tvTex.needsUpdate = true;
  }
  const SCREENS = { tv: { w: 1.24, h: 0.69, x: 0, y: 0.935, z: 0.038 }, walltv: { w: 1.54, h: 0.86, x: 0, y: 0, z: 0.068 }, moviescreen: { w: 5.95, h: 3.2, x: 0, y: 0, z: 0.1 } };

  function glow(it, on) {
    const ud = it.userData;
    if (!ud.glowMats) {
      ud.glowMats = [];
      it.traverse((m) => {
        if (!m.isMesh || m.material.emissiveIntensity === undefined || m.material.emissiveIntensity <= 0) return;
        if (m.material.emissive.getHex() === 0) return;
        if (m.material !== ud.mainMat) m.material = m.material.clone();
        ud.glowMats.push({ mat: m.material, base: m.material.emissiveIntensity });
      });
    }
    for (const g of ud.glowMats) g.mat.emissiveIntensity = on ? g.base : 0.02;
  }

  function setOn(it, on, silent) {
    const ud = it.userData, type = ud.type;
    ud.on = on;
    if (SCREENS[type]) {
      let sc = it.getObjectByName('screen');
      if (!sc) {
        const s = SCREENS[type];
        sc = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), tvOff);
        sc.name = 'screen'; sc.position.set(s.x, s.y, s.z);
        it.add(sc);
      }
      sc.material = on ? tvOn : tvOff;
      if (on) live.add(it); else live.delete(it);
      if (!silent) on ? tone(1200, 0.06, 'sine', 0.05, 1) : tone(300, 0.12, 'sine', 0.05, 0.5);
    } else if (type === 'stove') {
      let b = it.getObjectByName('burners');
      if (!b) {
        b = new THREE.Group(); b.name = 'burners';
        const mat = new THREE.MeshBasicMaterial({ color: '#ff5a2a' });
        for (const [x, z] of [[-0.18, -0.15], [0.18, -0.15], [-0.18, 0.15], [0.18, 0.15]]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 20), mat);
          ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.94, z); b.add(ring);
        }
        it.add(b);
      }
      b.visible = on;
      if (on) live.add(it); else live.delete(it);
      if (!silent) { S.click(); if (on) S.sizzle(); }
    } else if (type === 'firepit') {
      let f = it.getObjectByName('flames');
      if (!f) {
        f = new THREE.Group(); f.name = 'flames';
        for (const [r, h, x, z, c] of [[0.12, 0.45, 0, 0, '#ff9e00'], [0.09, 0.35, 0.12, 0.08, '#ff7b00'], [0.08, 0.3, -0.12, -0.05, '#ff7b00'], [0.06, 0.25, 0.02, -0.12, '#ffd60a']]) {
          const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), new THREE.MeshBasicMaterial({ color: c }));
          m.position.set(x, 0.05 + h / 2, z); f.add(m);
        }
        it.add(f);
      }
      f.visible = on;
      if (on) live.add(it); else live.delete(it);
      if (!silent) on ? noise(0.6, 0.08, 1200) : noise(0.3, 0.05, 600);
    } else {
      glow(it, on);
      if (!silent) S.click();
    }
  }

  // ---------- sitting, napping and rides (these move YOU) ----------
  let active = null;
  const legH = () => ctx.avatar().parts.legL.position.y;
  function standAt(p) {
    if (p && !ctx.blocked(p.x, p.z)) player.pos.set(p.x, 0, p.z);
    else player.pos.y = 0;
  }
  function finish() {
    if (!active) return;
    const a = active;
    active = null;
    a.end?.();
    standAt(a.exit?.());
  }
  const SEATS = {
    couch: { y: 0.5, z: 0.08, w: 1.5 }, loveseat: { y: 0.5, z: 0.08, w: 0.9 }, armchair: { y: 0.5, z: 0.08 },
    chair: { y: 0.5, z: 0.02 }, kidchair: { y: 0.33, z: 0.02 }, stool: { y: 0.64, z: 0 }, bench: { y: 0.46, z: 0, w: 1.1 },
    beanbag: { y: 0.42, z: 0.05 }, patiochair: { y: 0.48, z: 0.08 }, swing: { y: 0.56, z: 0.05, w: 1.1, sway: true },
    schooldesk: { y: 0.415, z: -0.42 }, picnictable: { y: 0.47, z: 0.6, w: 1.4, face: Math.PI },
    officechair: { y: 0.53, z: 0 }, loungechair: { y: 0.36, z: 0.1 },
    log: { y: 0.5, z: 0, w: 1.3 }, stump: { y: 0.46, z: 0 },
    theaterseat: { y: 0.48, z: 0.02 }, wheelchair: { y: 0.51, z: 0 }, haybale: { y: 0.5, z: 0, w: 0.6 },
  };
  function sit(it) {
    const s = SEATS[it.userData.type];
    const local = it.worldToLocal(player.pos.clone());
    const x = s.w ? THREE.MathUtils.clamp(local.x, -s.w / 2, s.w / 2) : 0;
    const p0 = it.position.clone(), back = player.pos.clone();
    active = {
      kind: 'sit', mode: 'sit', it,
      update(dt, t) {
        if (!alive(it) || it.position.distanceTo(p0) > 0.01 || ctx.moving()) return false;
        const sway = s.sway ? Math.sin(t * 2) * 0.08 : 0;
        const p = at(it, x, s.y - legH() + 0.02, s.z + sway);
        player.pos.copy(p);
        player.facing = it.rotation.y + (s.face ?? 0);
        player.speed = 0;
        return true;
      },
      exit: () => (alive(it) ? at(it, x, 0, s.z + (s.face ? -1 : 1) * 0.9) : back),
    };
    S.creak();
  }
  function nap(it, quiet, local = [0, 0.66, 0.72]) {
    const p0 = it.position.clone();
    let z = 0;
    active = {
      kind: 'lie', mode: 'lie', it,
      update(dt) {
        if (!alive(it) || it.position.distanceTo(p0) > 0.01 || ctx.moving()) return false;
        player.pos.copy(at(it, ...local));
        player.facing = it.rotation.y;
        player.speed = 0;
        z -= dt;
        if (z <= 0) { z = 1.3; floater(pick(['💤', 'Z', 'z']), V(player.pos.x, player.pos.y + 0.5, player.pos.z), 1.8); }
        return true;
      },
      exit: () => (alive(it) ? at(it, (it.userData.hx + 0.5), 0, 0.3) : null),
    };
    if (!quiet) say(V(it.position.x, top(it) + 0.6, it.position.z), 'Nap time... 😴', 2);
    active.update(0);
  }
  // a ride: path(k) gives local position + mode for k from 0 to 1
  function ride(it, dur, step, exitLocal, end) {
    let t = 0;
    const p0 = it.position.clone();
    active = {
      kind: 'ride', mode: null, it,
      update(dt) {
        t += dt;
        if (!alive(it) || it.position.distanceTo(p0) > 0.01 || t >= dur) return false;
        const r = step(t / dur, t, dt);
        this.mode = r.mode ?? null;
        player.pos.copy(r.world ?? at(it, r.x, r.y, r.z));
        player.facing = r.facing ?? it.rotation.y;
        player.speed = r.speed ?? 0;
        return true;
      },
      exit: () => (alive(it) ? at(it, ...exitLocal) : null),
      end,
    };
  }
  // sit down at a computer and type (the screen turns on, the keys click)
  function typeAt(it) {
    setOn(it, true, true); ctx.save();
    const p0 = it.position.clone();
    let click = 0;
    active = {
      kind: 'type', mode: 'type', it,
      update(dt) {
        if (!alive(it) || it.position.distanceTo(p0) > 0.01 || ctx.moving()) return false;
        player.pos.copy(at(it, 0, 0.53 - legH() + 0.02, 0.74));
        player.facing = it.rotation.y + Math.PI;
        player.speed = 0;
        click -= dt;
        if (click <= 0) { click = 0.07 + Math.random() * 0.16; tone(1700 + Math.random() * 900, 0.02, 'square', 0.02, 1); }
        return true;
      },
      exit: () => (alive(it) ? at(it, 0.9, 0, 1.0) : null),
    };
  }

  // climb the ladder, then stay up on the treehouse deck until you walk off
  function climbUp(it) {
    S.creak();
    const p0 = it.position.clone();
    let t = 0;
    active = {
      kind: 'perch', mode: null, it,
      update(dt) {
        t += dt;
        if (!alive(it) || it.position.distanceTo(p0) > 0.01) return false;
        if (t < 2.2) { const u = t / 2.2; player.pos.copy(at(it, -0.65, u * 3.15, 1.95 - Math.max(0, u - 0.85) * 4)); player.facing = it.rotation.y + Math.PI; player.speed = 0.6; return true; }
        if (t < 2.4) say(V(player.pos.x, player.pos.y + ctx.avatar().height + 0.4, player.pos.z), 'What a view! 🌲', 2);
        if (ctx.moving() && t > 2.6) return false;
        player.pos.copy(at(it, 0.2, 3.15, 0.5)); player.speed = 0;
        return true;
      },
      exit: () => (alive(it) ? at(it, -0.65, 0, 2.6) : null),
    };
  }
  function slide(it) {
    S.whee();
    say(it, 'Wheee! 🛝');
    ride(it, 2.6, (k) => {
      if (k < 0.3) { const u = k / 0.3; return { x: 0, y: u * 1.26, z: -1.25 + u * 0.55, speed: 1 }; }
      const u = Math.min(1, (k - 0.3) / 0.55), e = u * u;
      if (k < 0.85) return { x: 0, y: 1.26 - e * 1.18 - legH() + 0.05, z: -0.45 + e * 1.85, mode: 'sit' };
      const v = (k - 0.85) / 0.15;
      return { x: 0, y: 0.08 - legH() + 0.05 + v * (legH() - 0.13), z: 1.4 + v * 0.5, mode: v < 0.5 ? 'sit' : null };
    }, [0, 0, 2.2]);
  }
  function swingRide(it) {
    const local = it.worldToLocal(player.pos.clone());
    const i = local.x < 0 ? 0 : 1, sx = i === 0 ? -0.55 : 0.55;
    const ud = it.userData;
    ud.swingA ??= [];
    S.whee();
    ride(it, 6, (k, t) => {
      const a = Math.sin(t * 2.4) * Math.min(0.7, 0.15 + k * 1.2) * (k > 0.85 ? (1 - k) / 0.15 : 1);
      ud.swingA[i] = a;
      return { x: sx, y: 2.1 - Math.cos(a) * 1.68 - legH() + 0.04, z: -Math.sin(a) * 1.68, mode: 'sit' };
    }, [sx, 0, 1.0], () => { ud.swingA[i] = undefined; });
  }
  function merryRide(it) {
    const sp = it.getObjectByName('spin');
    it.userData.spinFast = true;
    S.yay();
    ride(it, 6, () => {
      const w = sp.localToWorld(V(0.65, 0.23 - legH() + 0.05, 0));
      const t = sp.localToWorld(V(0.65, 0, 0.3));
      return { world: w, facing: Math.atan2(t.x - w.x, t.z - w.z), mode: 'sit' };
    }, [1.6, 0, 0], () => { it.userData.spinFast = false; });
  }
  function trampoline(it) {
    let last = -1;
    ride(it, 4.2, (k) => {
      const n = 5, seg = Math.floor(k * n), u = k * n - seg;
      if (seg !== last) { last = seg; S.boing(); }
      return { x: 0, y: 0.56 + Math.sin(u * Math.PI) * (1.2 + seg * 0.25), z: 0, facing: player.facing };
    }, [1.7, 0, 0]);
  }
  function hopscotch(it) {
    let last = -1;
    ride(it, 3.6, (k) => {
      const n = 7, seg = Math.min(n - 1, Math.floor(k * n)), u = k * n - seg;
      if (seg !== last) { last = seg; tone(500 + seg * 60, 0.1, 'triangle', 0.08, 1.2); }
      return { x: 0, y: Math.sin(u * Math.PI) * 0.35, z: -1.5 + (seg + u) * 0.5, speed: 0.5 };
    }, [0, 0, 2.2]);
  }
  function shoot(it, from) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: '#f2a25f', roughness: 0.6 }));
    const a = from ?? V(player.pos.x, player.pos.y + 1.2, player.pos.z);
    const rim = at(it, 0, 2.62, 0.2), below = at(it, 0, 0.12, 0.6);
    scene.add(ball);
    effect(1.6, (k) => {
      if (k < 0.65) { const u = k / 0.65; ball.position.lerpVectors(a, rim, u); ball.position.y += Math.sin(u * Math.PI) * 1.3; }
      else { const u = (k - 0.65) / 0.35; ball.position.lerpVectors(rim, below, u); }
    }, () => scene.remove(ball));
    effect(0.2, () => {}, () => ctx.sfx('bounce', V(player.pos.x, 0, player.pos.z), { vol: 0.6 }));
    effect(1.05, () => {}, () => { S.swish(); look.burst(rim.clone(), 20); say(rim, 'SWISH! 🏀'); });
  }

  // ---------- what each thing does ----------
  const SNACKS = ['cupcake', 'icecream', 'fruitbowl'];
  const TOYS = ['teddy', 'ball', 'dino', 'robot', 'unicorn', 'duck', 'toycar', 'balloons'];
  const FINDS = ['Found a sock! 🧦', 'Found a crayon! 🖍️', 'Found a shiny coin! 🪙', 'Found a button! 🔘', 'Nothing in here!', 'Found a marble! 🔮', 'Found a secret note! 📝'];
  const BOOKS = ['📖 "The Very Brave Dino"', '📖 "Goodnight, Kenwood Ave"', '📖 "Unicorns Love Ice Cream"', '📖 "The Duck Who Could Fly"', '📖 "Ashley\'s Big Adventure"'];
  const water = (it) => {
    const p = V(it.position.x, top(it) + 0.6, it.position.z);
    emitter(1.2, 40, () => [p.clone().add(V(rand(-0.25, 0.25), 0, rand(-0.25, 0.25))), V(0, -1, 0), { size: 0.025, life: 0.6, gravity: 6 }]);
    S.water(1.2);
    effect(0.9, () => {}, () => { growBounce(it); look.burst(V(it.position.x, top(it), it.position.z), 10); });
    say(it, '💧 Thanks for the water!');
  };
  const steam = (it, dur = 3) => {
    const p = V(it.position.x, top(it), it.position.z);
    emitter(dur, 10, () => [p.clone().add(V(rand(-0.15, 0.15), 0, rand(-0.15, 0.15))), V(rand(-0.1, 0.1), 0.5, rand(-0.1, 0.1)), { color: '#ffffff', size: 0.05, life: 1.6, gravity: -0.2, opacity: 0.45, grow: 0.12 }]);
  };
  const found = (it) => { S.creak(); say(it, pick(FINDS)); };
  // food flies up to your mouth and disappears in three bites (or three gulps for drinks)
  let eating = false;
  const eat = (it, _mine, drink = false) => {
    const ud = it.userData;
    if (ud.eating || eating) return;
    ud.eating = eating = true;
    const start = it.position.clone(), s0 = it.scale.clone(), crumb = ud.color ?? '#d9a45a';
    let bites = 0;
    const mouth = () => {
      const f = player.facing;
      return V(player.pos.x + Math.sin(f) * 0.24, player.pos.y + ctx.avatar().eyeHeight - 0.17, player.pos.z + Math.cos(f) * 0.24);
    };
    effect(2.2, (k) => {
      if (!alive(it)) return;
      const m = mouth(), fly = Math.min(1, k / 0.25);
      it.position.lerpVectors(start, m, fly * fly * (3 - 2 * fly));
      if (drink) it.rotation.x = Math.min(1, Math.max(0, (k - 0.25) * 3)) * 1.2;
      const want = Math.min(3, Math.max(0, Math.floor((k - 0.3) / 0.22) + 1));
      while (bites < want) {
        bites++;
        it.scale.copy(s0).multiplyScalar(1 - bites / 3.2);
        if (drink) for (let i = 0; i < 2; i++) tone(320, 0.1, 'sine', 0.08, 1.6, i * 0.12);
        else { noise(0.08, 0.12, 3000); for (let i = 0; i < 6; i++) particle(m.clone(), V(rand(-0.6, 0.6), rand(0, 0.8), rand(-0.6, 0.6)), { color: crumb, size: 0.015, life: 0.8, opacity: 1 }); }
      }
      it.updateMatrixWorld(true);
    }, () => {
      eating = false;
      say(V(player.pos.x, player.pos.y + ctx.avatar().height + 0.3, player.pos.z), drink ? pick(['Gulp gulp! 🥛', 'Ahhh! So good! 😋']) : pick(['Yum! 😋', 'Delicious! 😋', 'Mmmm! 💖']));
      if (alive(it)) ctx.remove(it);
    });
  };

  // mine = I clicked it (false = replaying what the other player did)
  const DEFS = {
    ball: { label: 'bounce it!', fn: (it) => bounce(it) },
    dog: { label: 'pet the doggy', fn: (it) => { if (!ctx.sfx('dog', it.position)) S.woof(); hop(it, 0.15, 2, 0.35); say(it, pick(['Woof! 🐶', 'Woof woof! 🐾', 'Arf! 💕'])); } },
    cat: { label: 'pet the kitty', fn: (it) => { if (!ctx.sfx('cat', it.position)) S.meow(); hop(it, 0.1, 1); say(it, pick(['Meow! 🐱', 'Purrr... 💕', 'Mew! 🐾'])); } },
    duck: { label: 'quack!', fn: (it) => { if (!ctx.sfx('quack', it.position)) S.quack(); hop(it, 0.15, 2, 0.3); say(it, 'Quack! 🦆'); } },
    dino: { label: 'roar!', fn: (it) => { S.roar(); hop(it, 0.2, 2, 0.3); say(it, 'RAWR! 🦖'); } },
    robot: { label: 'beep boop', fn: (it) => { S.beepboop(); spin(it, 1, 1); say(it, 'Beep boop! 🤖'); } },
    unicorn: { label: 'make magic', fn: (it) => { S.sparkle(); for (let i = 0; i < 4; i++) effect(i * 0.15, () => {}, () => look.burst(V(it.position.x, top(it) + 0.2, it.position.z), 18)); say(it, '✨ Magic! 🦄'); } },
    teddy: { label: 'give a hug', fn: (it) => { growBounce(it); floaters(['💖', '💕', '💗'], it); say(it, 'I love you! 💖'); tone(660, 0.3, 'sine', 0.08, 1.2); } },
    balloons: { label: 'whee!', fn: (it) => { S.pop(); lockedMove(it, 1.6, (k) => { it.position.y += Math.sin(k * Math.PI) * 0.6; }); floaters(['🎈', '🎉'], it, 3); } },
    toycar: { label: 'zoom!', mine: true, fn: (it) => roll(it) },
    toytruck: { label: 'zoom!', mine: true, fn: (it) => roll(it) },
    toybox: { label: 'find a toy', mine: true, fn: (it) => { S.creak(); ctx.give(pick(TOYS), 'You found a toy! 🧸'); } },
    fridge: { label: 'grab a snack', mine: true, fn: () => { S.creak(); ctx.give(pick(SNACKS), 'A yummy snack! 😋'); } },
    cupcake: { label: 'eat it!', mine: true, fn: eat },
    icecream: { label: 'eat it!', mine: true, fn: eat },
    fruitbowl: { label: 'eat an apple', fn: (it) => { S.munch(); say(it, 'Crunch! 🍎'); } },
    cake: { label: 'birthday song!', fn: (it) => { melody(BIRTHDAY, 0.3); floaters(['🎉', '🎂', '🎈', '✨'], it, 8, 0.4); say(it, 'Happy Birthday! 🎂', 4); } },
    piano: { label: 'play a song', fn: (it) => { if (!ctx.sfx('piano', it.position)) melody(pick(TUNES), 0.3); floaters(['🎵', '🎶', '♪'], it, 10, 0.4); } },
    clock: { label: 'cuckoo!', fn: (it) => { S.cuckoo(); wiggle(it); say(it, 'Cuckoo! 🐦'); } },
    globe: { label: 'spin it', fn: (it) => { spin(it, 3, 2); tone(300, 1.5, 'sine', 0.04, 2); } },
    books: { label: 'read a story', fn: (it) => { S.creak(); say(it, pick(BOOKS), 3); } },
    bookshelf: { label: 'read a story', fn: (it) => { S.creak(); say(it, pick(BOOKS), 3); } },
    cubeshelf: { label: 'look inside', fn: found },
    dresser: { label: 'look inside', fn: found }, nightstand: { label: 'look inside', fn: found }, drawers: { label: 'look inside', fn: found },
    uppercab: { label: 'look inside', fn: found }, desk: { label: 'look inside', fn: found },
    lockers: { label: 'open a locker', fn: (it) => { S.clank(); say(it, pick(FINDS)); } },
    teacherdesk: { label: 'ring the bell', fn: (it) => { if (!ctx.sfx('schoolbell', it.position)) S.bell(); say(it, 'Class is starting! 🍎'); } },
    chalkboard: { label: 'write on it', fn: (it) => { noise(0.4, 0.04, 6000); say(it, pick(['2 + 2 = 4 ✏️', 'A is for Apple 🍎', 'I ❤️ school', 'Great job! ⭐'])); } },
    alphabet: { label: 'sing the ABCs', fn: (it) => { melody(['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', '-', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'D4', 'D4', 'C4'], 0.26); say(it, 'A B C D E F G... 🎶', 4); } },
    easel: { label: 'paint a picture', fn: (it) => { for (let i = 0; i < 3; i++) effect(i * 0.2, () => {}, () => look.burst(V(it.position.x, top(it) - 0.3, it.position.z), 16)); S.sparkle(); say(it, '🎨 A masterpiece!'); } },
    activitytable: { label: 'color a picture', fn: (it) => { noise(0.6, 0.04, 5000); say(it, '🖍️ Coloring time!'); } },
    workbench: { label: 'build something', fn: (it) => { S.hammer(); say(it, 'Bang bang! 🔨'); } },
    pegboard: { label: 'grab a tool', fn: (it) => { S.clank(); wiggle(it); say(it, '🔧 Fix-it time!'); } },
    bike: { label: 'ring the bell', fn: (it) => { S.bell(); say(it, 'Ring ring! 🔔'); } },
    mailbox: { label: 'check the mail', fn: (it) => { S.creak(); floaters(['💖', '💕', '⭐'], it, 3); say(it, "You've got mail! 💌"); } },
    doormat: { label: 'wipe your feet', fn: (it) => { noise(0.5, 0.05, 1500); say(it, 'Welcome home! 🏠'); } },
    mirror: { label: 'look in the mirror', fn: (it) => { S.sparkle(); look.burst(V(it.position.x, it.position.y, it.position.z), 14); say(it, `Looking good, ${ctx.name()}! ✨`); } },
    picture: { label: 'look closer', fn: (it) => say(it, pick(['So pretty! 🖼️', 'What a nice picture! 💖'])) },
    painting: { label: 'look closer', fn: (it) => say(it, pick(['A beautiful painting! 🎨', 'Ooh, pretty! ✨'])) },
    gallery: { label: 'look at the photos', fn: (it) => say(it, pick(['What a fun family! 📷', 'Great memories! 💖'])) },
    poster: { label: 'look closer', fn: (it) => say(it, pick(['Reach for the stars! ⭐', 'You can do it! 💪'])) },
    plant: { label: 'water it', fn: water }, smallplant: { label: 'water it', fn: water }, flowers: { label: 'water them', fn: water },
    flowerbed: { label: 'water them', fn: water }, tree: { label: 'water it', fn: water },
    pillow: { label: 'pillow fight!', fn: (it) => { S.pop(); hop(it, 0.3); const p = V(it.position.x, top(it), it.position.z); emitter(0.3, 60, () => [p.clone(), V(rand(-1, 1), rand(0.5, 2), rand(-1, 1)), { color: '#ffffff', size: 0.03, life: 2, gravity: 1 }]); } },
    pot: { label: 'stir the soup', fn: (it) => { steam(it); noise(1, 0.04, 800); say(it, '🍲 Yummy soup!'); } },
    toykitchen: { label: 'cook!', fn: (it) => { steam(it, 2); S.sizzle(); say(it, pick(['🥞 Pretend pancakes!', '🍪 Pretend cookies!', '🍕 Pretend pizza!'])); } },
    toilet: { label: 'flush!', fn: (it) => {
      if (!ctx.sfx('flush', it.position)) S.flush(); say(it, 'Flush! 🚽');
      const c = at(it, 0, 0.42, 0.08);
      let a = 0;
      emitter(1.2, 40, () => { a += 0.6; return [c.clone().add(V(Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13)), V(-Math.sin(a) * 0.5, -0.2, Math.cos(a) * 0.5), { size: 0.025, life: 0.5, gravity: 0 }]; });
    } },
    bathsink: { label: 'wash your hands', fn: (it) => { S.water(2); const p = V(it.position.x, top(it) + 0.05, it.position.z); emitter(2, 40, () => [p.clone().add(V(rand(-0.02, 0.02), 0, rand(-0.02, 0.02))), V(0, -0.5, 0), { size: 0.02, life: 0.4 }]); say(it, '🧼 Squeaky clean!'); } },
    bathtub: { label: 'make bubbles', fn: (it) => {
      S.water(1.5); say(it, '🫧 Bubble bath!');
      emitter(4, 14, () => [at(it, rand(-0.25, 0.25), 0.45, rand(-0.6, 0.6)), V(rand(-0.1, 0.1), rand(0.2, 0.5), rand(-0.1, 0.1)), { color: pick(['#ffffff', '#ffd6e8', '#cfe9ff', '#e6dcff']), size: rand(0.03, 0.07), life: 3, gravity: -0.05, opacity: 0.5 }]);
    } },
    hydrant: { label: 'squirt water!', fn: (it) => {
      if (!ctx.sfx('hose', it.position)) S.water(3);
      emitter(3, 110, () => [at(it, 0.2, 0.38, 0), at(it, rand(2.2, 3.4), rand(1.5, 2.8), rand(-0.5, 0.5)).sub(at(it, 0, 0, 0)), { size: rand(0.035, 0.06), life: 1.5 }]);
      say(it, 'Splash! 💦');
    } },
    fountain: { label: 'make a splash', fn: (it) => {
      if (!ctx.sfx('splash', it.position)) { S.splash(); S.water(2.5); }
      const p = at(it, 0, 1.95, 0);
      emitter(2.5, 90, () => [p.clone(), V(rand(-1.2, 1.2), rand(3, 5), rand(-1.2, 1.2)), { size: rand(0.03, 0.05), life: 1.4 }]);
    } },
    sandbox: { label: 'dig!', fn: (it) => {
      noise(0.8, 0.06, 900); say(it, 'Dig dig! 🏖️');
      const p = at(it, 0, 0.2, 0);
      emitter(1, 50, () => [p.clone(), V(rand(-1, 1), rand(1.5, 3), rand(-1, 1)), { color: '#e9d39a', size: 0.03, life: 1, opacity: 1 }]);
    } },
    picnictable: { label: 'sit down', mine: true, fn: sit },
    flagpole: { label: 'cheer!', fn: (it) => { S.yay(); look.burst(at(it, 0, 5.6, 0), 30); say(V(it.position.x, 2.6, it.position.z), 'Hooray! 🎉'); } },
    hoop: { label: 'shoot a basket!', fn: (it, mine) => shoot(it, mine ? null : at(it, 0, 1.2, 4)) },
    slide: { label: 'go down the slide!', mine: true, fn: slide },
    swingset: { label: 'swing!', mine: true, fn: swingRide },
    merrygoround: { label: 'go for a spin!', mine: true, fn: merryRide },
    trampoline: { label: 'jump!', mine: true, fn: trampoline },
    hopscotch: { label: 'hop!', mine: true, fn: hopscotch },
    bed: { label: 'take a nap', mine: true, fn: nap },
    bigbed: { label: 'take a nap', mine: true, fn: nap },
    car: { label: 'get in and drive', mine: true, fn: (it) => ctx.drive(it) },
    schoolbus: { label: 'get in and drive', mine: true, fn: (it) => ctx.drive(it) },
    icecreamcounter: { label: 'get an ice cream', mine: true, fn: (it) => ctx.action(it) },
    register: { label: 'get a surprise toy', mine: true, fn: (it) => ctx.action(it) },
    fireplace: { label: 'light / put out the fire', mine: true, fn: (it) => ctx.action(it) },
    pizza: { label: 'eat a slice!', mine: true, fn: eat },
    bread: { label: 'eat a slice', mine: true, fn: eat }, cereal: { label: 'eat a bowl', mine: true, fn: eat },
    banana: { label: 'eat a banana', mine: true, fn: eat }, watermelon: { label: 'eat a slice', mine: true, fn: eat },
    cheese: { label: 'have a nibble', mine: true, fn: eat }, cookies: { label: 'eat a cookie', mine: true, fn: eat },
    donut: { label: 'eat it!', mine: true, fn: eat },
    milk: { label: 'drink it', mine: true, fn: (it) => eat(it, true, true) },
    juice: { label: 'drink it', mine: true, fn: (it) => eat(it, true, true) },
    cerealbowl: { label: 'eat it!', mine: true, fn: (it) => eat(it) },
    shelf_cereal: { label: 'grab a cereal box', mine: true, fn: () => ctx.give('cereal', 'Breakfast time! 🥣') },
    shelf_snacks: { label: 'grab a snack', mine: true, fn: () => ctx.give(pick(['cookies', 'donut', 'cheese']), 'A tasty snack! 🍪') },
    shelf_cans: { label: 'grab some food', mine: true, fn: () => ctx.give(pick(['cheese', 'bread', 'banana']), 'Into the cart! 🛒') },
    shelf_drinks: { label: 'grab a drink', mine: true, fn: () => ctx.give(pick(['milk', 'juice']), 'Something to drink! 🧃') },
    shelf_bread: { label: 'grab some bread', mine: true, fn: () => ctx.give('bread', 'Fresh bread! 🍞') },
    cart: { label: 'push the cart', mine: true, fn: (it) => roll(it) },
    produce: { label: 'eat an apple', fn: (it) => { S.munch(); say(it, pick(['Crunch! 🍎', 'Juicy! 🍊', 'Yum, a banana! 🍌'])); } },
    freezer: { label: 'open the freezer', fn: (it) => { noise(0.8, 0.04, 400); steam(it, 1.5); say(it, 'Brrr! So cold! 🥶'); } },
    watercooler: { label: 'get a drink', fn: (it) => { for (let i = 0; i < 4; i++) tone(300 + i * 40, 0.12, 'sine', 0.08, 1.8, i * 0.2); const p = at(it, 0, 1.0, 0); emitter(1, 15, () => [p.clone().add(V(rand(-0.08, 0.08), 0, rand(-0.08, 0.08))), V(0, 0.4, 0), { color: '#ffffff', size: 0.025, life: 1, gravity: 0, opacity: 0.6 }]); say(it, 'Glug glug! 💧'); } },
    elevator: { label: 'ride the elevator', fn: (it) => { tone(1320, 0.4, 'sine', 0.08, 1); say(it, pick(['Going up! ⬆️', 'Ding! Floor 3! 🛗', 'Going down! ⬇️'])); } },
    fishtank: { label: 'feed the fish', fn: (it) => { const p = V(it.position.x, top(it) + 0.05, it.position.z); emitter(0.6, 30, () => [p.clone().add(V(rand(-0.3, 0.3), 0, rand(-0.12, 0.12))), V(0, -0.15, 0), { color: '#c69c6d', size: 0.012, life: 3, gravity: 0, opacity: 1 }]); say(it, 'Blub blub! 🐠'); } },
    birdcage: { label: 'say hi to the bird', fn: (it) => { for (let i = 0; i < 5; i++) tone(2000 + Math.random() * 800, 0.07, 'sine', 0.06, 1.3, i * 0.12); say(it, pick(['Tweet tweet! 🐦', 'Pretty bird! 🦜', 'Chirp! 🎶'])); } },
    bunny: { label: 'pet the bunny', fn: (it) => { hop(it, 0.25, 3, 0.3); tone(900, 0.08, 'sine', 0.06, 1.5); say(it, pick(['Hop hop! 🐰', 'Twitch twitch! 🐇', '💕'])); } },
    alarmbell: { label: 'ring the alarm!', fn: (it) => { for (let i = 0; i < 8; i++) tone(1400, 0.08, 'square', 0.05, 1, i * 0.1); if (!ctx.sfx('siren', it.position)) for (let i = 0; i < 2; i++) { tone(650, 0.45, 'sawtooth', 0.04, 1.5, 0.9 + i * 0.9); tone(975, 0.45, 'sawtooth', 0.04, 0.67, 1.35 + i * 0.9); } wiggle(it); say(it, '🚨 Fire! Everyone to the truck! 🚒'); } },
    firepole: { label: 'slide down the pole!', mine: true, fn: (it) => {
      S.whee(); say(V(it.position.x, 3.4, it.position.z), 'Whoooosh! 🚒');
      ride(it, 1.6, (k) => ({ x: 0, y: (1 - k * k) * 2.4, z: 0.12, facing: player.facing, mode: null }), [0.7, 0, 0]);
    } },
    divingboard: { label: 'dive in!', mine: true, fn: (it) => {
      S.whee();
      ride(it, 2.4, (k) => {
        if (k < 0.45) { const u = k / 0.45; return { x: 0, y: 0.56 + Math.abs(Math.sin(u * Math.PI * 2)) * 0.15, z: -0.1 + u * 2.0, speed: 1 }; }
        const u = (k - 0.45) / 0.55;
        return { x: 0, y: 0.56 + Math.sin(u * Math.PI) * 1.4 - u * 1.1, z: 1.9 + u * 1.4 };
      }, [0, 0, 3.4], () => { if (!ctx.sfx('splash', at(it, 0, 0, 3.4))) S.splash(); look.burst(at(it, 0, 0.1, 3.4), 20); say(at(it, 0, 1.2, 3.4), 'SPLASH! 💦'); });
    } },
    umbrella: { label: 'spin it', fn: (it) => spin(it, 2, 1.5) },
    exambed: { label: 'get a checkup', mine: true, fn: (it) => {
      nap(it, true, [0, 0.8, 0.45]);
      for (let i = 0; i < 4; i++) { tone(70, 0.12, 'sine', 0.2, 0.8, i * 0.8); tone(65, 0.1, 'sine', 0.16, 0.8, i * 0.8 + 0.18); }
      say(V(it.position.x, top(it) + 0.8, it.position.z), pick(['Say ahhh! 👅', 'Your heart sounds great! 🩺', 'Deep breath in... 🫁', 'You are super healthy! 💪']), 3);
    } },
    hospitalbed: { label: 'rest in bed', mine: true, fn: (it) => nap(it, false, [0, 0.72, 0.6]) },
    xray: { label: 'look at the x-ray', fn: (it) => { S.sparkle(); say(it, pick(['Look at all those bones! 🦴', 'That is a skeleton! 💀', 'You have 206 bones! 🦴'])); } },
    storybook: { label: 'read a story', mine: true, fn: () => ctx.openStory() },
    popcorn: { label: 'eat some popcorn', mine: true, fn: eat },
    cottoncandy: { label: 'eat it!', mine: true, fn: eat }, hotdog: { label: 'eat it!', mine: true, fn: eat },
    pumpkin: { label: 'knock on it', fn: (it) => { tone(160, 0.12, 'sine', 0.14, 0.6); hop(it, 0.1); say(it, pick(['Thunk! 🎃', 'A big pumpkin! 🎃', 'Pie time? 🥧'])); } },
    sandcastle: { label: 'build it bigger', fn: (it) => {
      noise(0.6, 0.06, 900); growBounce(it); say(it, pick(['A sandcastle! 🏰', 'Royal beach castle! 👑', 'Add a moat! 🌊']));
      const p = V(it.position.x, 0.4, it.position.z);
      emitter(0.6, 40, () => [p.clone(), V(rand(-1, 1), rand(1, 2.5), rand(-1, 1)), { color: '#e9d39a', size: 0.03, life: 0.8, opacity: 1 }]);
    } },
    treehouse: { label: 'climb up!', mine: true, fn: (it) => climbUp(it) },
    tent: { label: 'crawl inside', mine: true, fn: (it) => nap(it, false, [0, 0.12, 0.35]) },
    mushroom: { label: 'boop the mushroom', fn: (it) => { hop(it, 0.3, 2, 0.35); tone(300, 0.25, 'sine', 0.1, 2.5); say(it, pick(['Boing! 🍄', 'Squish! 🍄', 'A magic mushroom! ✨'])); } },
    fairyhouse: { label: 'knock on the tiny door', fn: (it) => { for (let i = 0; i < 3; i++) tone(900, 0.05, 'triangle', 0.08, 1, i * 0.15); S.sparkle(); for (let i = 0; i < 4; i++) effect(i * 0.2, () => {}, () => look.burst(V(it.position.x, 0.9, it.position.z), 14)); say(it, pick(['A fairy lives here! 🧚', 'Tiny footprints... 👣', 'Shhh, the fairies are sleeping 💤', 'You hear tiny giggles! ✨'])); } },
    birdhouse: { label: 'peek inside', fn: (it) => { for (let i = 0; i < 6; i++) tone(2200 + Math.random() * 900, 0.06, 'sine', 0.06, 1.3, i * 0.11); floaters(['🐦', '🪺', '🎶'], it, 3); say(it, pick(['Baby birds! 🐣', 'Tweet tweet! 🐦', 'A cozy nest! 🪺'])); } },
    berries: { label: 'eat them', mine: true, fn: eat },
    rug: { label: 'wiggle your toes', fn: (it) => { noise(0.4, 0.04, 1200); say(it, 'So soft! ☁️'); } },
  };
  DEFS.theaterseat = { label: 'sit down and watch the movie! 🍿', mine: true, fn: (it) => { sit(it); setTimeout(() => ctx.openMovie(), 600); } };
  for (const k of Object.keys(SEATS)) if (!DEFS[k]) DEFS[k] = { label: 'sit down', mine: true, fn: sit };
  for (const k of Object.keys(TOGGLES)) DEFS[k] = { label: (it) => (it.userData.on ? 'turn off' : 'turn on'), mine: true, toggle: true, fn: (it) => { setOn(it, !it.userData.on); ctx.save(); } };
  DEFS.stove.label = (it) => (it.userData.on ? 'turn off the stove' : 'turn on the stove');
  DEFS.computer = { label: 'type on the computer', mine: true, fn: (it) => typeAt(it) };
  DEFS.firepit.label = (it) => (it.userData.on ? 'put out the fire' : 'light a fire');

  function roll(it) {
    S.vroom();
    const ud = it.userData;
    if (ud.moving) return;
    const d = V(Math.sin(it.rotation.y), 0, Math.cos(it.rotation.y));
    let dist = 1.6;
    for (; dist > 0.2; dist -= 0.2) { const p = it.position.clone().addScaledVector(d, dist); if (!ctx.blocked(p.x, p.z)) break; }
    const p0 = it.position.clone();
    ud.moving = true;
    effect(0.9, (k) => { if (alive(it) && it !== ctx.held()) { it.position.copy(p0).addScaledVector(d, dist * (1 - (1 - k) ** 2)); it.updateMatrixWorld(true); } },
      () => { ud.moving = false; ctx.save(); });
  }
  const fallback = { label: 'boop!', fn: (it) => { (it.userData.onWall ? wiggle : hop)(it, 0.15); tone(rand(500, 900), 0.12, 'triangle', 0.07, 1.4); look.burst(V(it.position.x, top(it), it.position.z), 6); } };
  const driveDef = { label: 'get in and drive', mine: true, fn: (it) => ctx.drive(it) };
  const giveDef = { label: (it) => it.userData.giveLabel, mine: true, fn: (it) => ctx.action(it) };
  const defFor = (it) => DEFS[it.userData.type] ?? (it.userData.action === 'drive' ? driveDef : it.userData.action === 'give' ? giveDef : fallback);

  return {
    isToggle,
    setOn,
    initItem(it) {
      const t = it.userData.type;
      if (isToggle(t)) setOn(it, it.userData.on ?? TOGGLES[t], true);
    },
    label(it) { const d = defFor(it); return typeof d.label === 'function' ? d.label(it) : d.label; },
    run(it) {
      const d = defFor(it);
      d.fn(it, true);
      if (!d.mine) ctx.share(it); // the other player sees and hears it too
    },
    replay(it) { const d = defFor(it); if (!d.mine) d.fn(it, false); },
    busy: () => !!active,
    mode: () => active?.mode ?? null,
    activeKind: () => active?.kind ?? null,
    activeItem: () => active?.it ?? null,
    standUp: () => finish(),
    napOn: (it) => nap(it, true),
    updatePlayer(dt, t) { if (active && !active.update(dt, t)) finish(); },
    // after the normal walk animation: bend legs to sit, or lie down
    poseAvatar(ch, mode = active?.mode) {
      ch.root.rotation.order = 'YXZ';
      ch.root.rotation.x = mode === 'lie' ? -Math.PI / 2 : 0;
      const p = ch.parts;
      if (mode === 'sit' || mode === 'lie' || mode === 'type') { p.legL.rotation.x = p.legR.rotation.x = mode === 'lie' ? 0 : -Math.PI / 2; }
      if (mode === 'type') { // tap tap tap on the keyboard
        const t = performance.now() / 1000;
        p.armL.rotation.x = -1.15 + Math.sin(t * 18) * 0.07; p.armR.rotation.x = -1.15 + Math.sin(t * 18 + 1.7) * 0.07;
      }
      if (eating && ch === ctx.avatar()) p.armR.rotation.x = -2.3; // hand up to your mouth
    },
    isEating: () => eating,
    update(dt, t) {
      for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        e.t += dt;
        const k = Math.min(1, e.dur ? e.t / e.dur : 1);
        e.step(k, dt, e.t);
        if (k >= 1) { effects.splice(i, 1); e.done?.(); }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        p.v.y -= p.gravity * dt;
        p.m.position.addScaledVector(p.v, dt);
        if (p.grow) p.m.scale.setScalar(p.size + p.grow * p.age);
        if (p.age >= p.life || p.m.position.y < -0.05) { scene.remove(p.m); parts.splice(i, 1); }
      }
      let anyTV = false;
      for (const it of live) {
        if (!alive(it)) { live.delete(it); continue; }
        const ty = it.userData.type;
        if (SCREENS[ty]) anyTV = true;
        if (ty === 'firepit') { const f = it.getObjectByName('flames'); f.scale.y = 1 + Math.sin(t * 13) * 0.12; f.rotation.y = t; }
      }
      tvTimer -= dt;
      if (anyTV && tvTimer <= 0) { tvTimer = 0.08; drawTV(t); }
    },
  };
}
