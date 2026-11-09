import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { HOUSE } from './house.js';
import { buildHouse } from './buildHouse.js';
import { CATALOG, CATEGORIES, createItem, recolor, KID_COLORS, WALL_COLORS, FLOOR_COLORS, nextIn } from './items.js';
import { setupLook, makeThumbnail } from './look.js';

const EYE = 1.3;          // kid-height eyes
const WALK = 2.6, RUN = 5;
const RADIUS = 0.22;
const REACH = 6;
const SAVE_KEY = 'house-save:' + HOUSE.title;
const params = new URLSearchParams(location.search);

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: params.has('shot') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 400);
camera.rotation.order = 'YXZ';

const house = buildHouse(HOUSE);
scene.add(house.group);
const H = house.H;

const bounds = new THREE.Box3();
for (const f of house.floors) bounds.expandByObject(f);
const look = setupLook({ renderer, scene, camera, center: bounds.getCenter(new THREE.Vector3()) });

// ---------- items ----------
const items = [];
let held = null, hovered = null, hoverSurface = null;

function addItem(it) { scene.add(it); items.push(it); it.updateMatrixWorld(true); }
function removeItem(it) {
  scene.remove(it);
  items.splice(items.indexOf(it), 1);
  if (held === it) held = null;
  if (hovered === it) hovered = null;
}

const placeTargets = () => [...house.walls, ...house.floors, ...house.surfaces, ...house.solids, house.ground, ...items.filter((i) => i !== held)];
const findItem = (obj) => { while (obj) { if (obj.userData?.isItem) return obj; obj = obj.parent; } return null; };
const worldNormal = (hit) => hit.face.normal.clone().transformDirection(hit.object.matrixWorld);

const downRay = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, -1, 0);
function surfaceBelow(x, fromY, z, exclude) {
  downRay.set(new THREE.Vector3(x, fromY, z), DOWN);
  downRay.far = 20;
  const targets = [...house.floors, ...house.surfaces, ...house.solids, house.ground, ...items.filter((i) => i !== exclude && i !== held)];
  for (const h of downRay.intersectObjects(targets, true)) {
    if (h.face && worldNormal(h).y > 0.5) return h.point.y;
  }
  return 0;
}

function extents(item, rotY) {
  const { hx, hz } = item.userData;
  const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY));
  return { ex: c * hx + s * hz, ez: s * hx + c * hz };
}

function pushOutOfWalls(pos, ex, ez) {
  for (let k = 0; k < 4; k++) {
    let moved = false;
    for (const c of house.colliders) {
      const ox = Math.min(pos.x + ex, c.maxX) - Math.max(pos.x - ex, c.minX);
      const oz = Math.min(pos.z + ez, c.maxZ) - Math.max(pos.z - ez, c.minZ);
      if (ox > 0 && oz > 0) {
        if (ox < oz) pos.x += pos.x < (c.minX + c.maxX) / 2 ? -ox : ox;
        else pos.z += pos.z < (c.minZ + c.maxZ) / 2 ? -oz : oz;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

const centerRay = new THREE.Raycaster();
centerRay.far = REACH;
const CENTER = new THREE.Vector2(0, 0);

// Where should the held item go, given where the player is looking?
function computePlacement(item) {
  centerRay.setFromCamera(CENTER, camera);
  const hit = centerRay.intersectObjects(placeTargets(), true).find((h) => h.face);
  const u = item.userData;
  const rotY = u.rotY;

  if (hit) {
    const n = worldNormal(hit);
    if (u.wall && hit.object.userData.isWall && Math.abs(n.y) < 0.3) {
      const p = hit.point.clone().addScaledVector(n, 0.005);
      p.y = THREE.MathUtils.clamp(p.y, 0.5, H - 0.3);
      return { pos: p, rotY: Math.atan2(n.x, n.z), onWall: true };
    }
  }

  let px, pz, startY;
  if (!hit) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const p = camera.position.clone().addScaledVector(dir, 2.5);
    px = p.x; pz = p.z; startY = Math.min(p.y, camera.position.y);
  } else {
    const n = worldNormal(hit);
    if (n.y > 0.6) {
      px = hit.point.x; pz = hit.point.z; startY = hit.point.y + 0.01;
    } else {
      const nh = new THREE.Vector3(n.x, 0, n.z).normalize();
      const { ex, ez } = extents(item, rotY);
      const back = Math.abs(nh.x) * ex + Math.abs(nh.z) * ez + 0.02;
      px = hit.point.x + nh.x * back; pz = hit.point.z + nh.z * back; startY = hit.point.y + 0.01;
    }
  }
  const pos = new THREE.Vector3(px, 0, pz);
  const { ex, ez } = extents(item, rotY);
  pushOutOfWalls(pos, ex * 0.98, ez * 0.98);
  pos.y = surfaceBelow(pos.x, Math.max(startY, 0.05), pos.z, item) + u.baseY;
  return { pos, rotY, onWall: false };
}

// Let things that lost what they were sitting on fall down.
function settleAll() {
  const list = items.filter((i) => i !== held && !i.userData.onWall).sort((a, b) => a.position.y - b.position.y);
  for (const it of list) {
    const bottom = it.position.y - it.userData.baseY;
    const y = surfaceBelow(it.position.x, bottom + 0.05, it.position.z, it);
    if (Math.abs(y - bottom) > 0.002) { it.position.y = y + it.userData.baseY; it.updateMatrixWorld(true); }
  }
}

// ---------- save / load ----------
const r3 = (v) => Math.round(v * 1000) / 1000;
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data = {
      v: 1,
      items: items.map((i) => ({ t: i.userData.type, x: r3(i.position.x), y: r3(i.position.y), z: r3(i.position.z), r: r3(i.rotation.y), c: i.userData.color, w: i.userData.onWall ? 1 : 0, off: i.userData.off ? 1 : 0 })),
      rooms: Object.fromEntries(house.rooms.map((r) => [r.name, { wall: r.wallColor, floor: r.floorColor }])),
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
  }, 300);
}

function setRoomColors(room, wall, floor) {
  if (wall) { room.wallColor = wall; room.wallMat.color.set(wall); }
  if (floor) { room.floorColor = floor; room.floorMat.color.set(floor); }
}

function clearItems() { while (items.length) removeItem(items[0]); held = null; }

function loadDefaults() {
  clearItems();
  for (const r of house.rooms) {
    const def = HOUSE.rooms.find((x) => x.name === r.name);
    setRoomColors(r, def.wall, def.floor);
  }
  for (const f of HOUSE.furniture) {
    const it = createItem(f.item, f.color);
    if (!it) continue;
    const rot = THREE.MathUtils.degToRad(f.rot ?? 0);
    it.rotation.y = rot; it.userData.rotY = rot;
    if (it.userData.wall && f.y !== undefined) {
      it.position.set(f.x, f.y, f.z);
      it.userData.onWall = true;
    } else {
      it.position.set(f.x, surfaceBelow(f.x, f.y ?? H - 0.2, f.z, it) + it.userData.baseY, f.z);
    }
    addItem(it);
  }
}

function loadSave() {
  let data;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { data = null; }
  if (!data?.items) return false;
  clearItems();
  for (const r of house.rooms) {
    const s = data.rooms?.[r.name];
    const def = HOUSE.rooms.find((x) => x.name === r.name);
    setRoomColors(r, s?.wall ?? def.wall, s?.floor ?? def.floor);
  }
  for (const s of data.items) {
    const it = createItem(s.t, s.c);
    if (!it) continue;
    it.position.set(s.x, s.y, s.z);
    it.rotation.y = s.r; it.userData.rotY = s.r;
    it.userData.onWall = !!s.w;
    if (s.off) toggleItem(it, true);
    addItem(it);
  }
  return true;
}

// ---------- actions ----------
let actx;
function beep(freq = 600, dur = 0.09, type = 'sine', vol = 0.12) {
  try {
    actx ??= new AudioContext();
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 1.6, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + dur);
  } catch { /* no audio */ }
}

function toggleItem(it, silent) {
  const fire = it.getObjectByName('fire'), light = it.getObjectByName('firelight');
  if (!fire) return false;
  it.userData.off = fire.visible;
  fire.visible = !fire.visible;
  if (light) light.visible = fire.visible;
  if (!silent) beep(fire.visible ? 500 : 300, 0.15, 'triangle');
  return true;
}

function pickUp(it) {
  if (it.userData.fixed) {
    if (toggleItem(it)) { save(); return; }
    toast("That one's stuck to the house!");
    return;
  }
  held = it;
  it.userData.rotY = it.rotation.y;
  hovered = null;
  settleAll();
  beep(520);
}

function putDown() {
  const it = held;
  held = null;
  it.updateMatrixWorld(true);
  settleAll();
  const top = new THREE.Box3().setFromObject(it);
  look.burst(new THREE.Vector3(it.position.x, top.max.y + 0.05, it.position.z));
  beep(380, 0.08, 'triangle');
  save();
}

function primaryAction() {
  if (held) putDown();
  else if (hovered) pickUp(hovered);
}

function rotate(dir, step = Math.PI / 4) {
  const it = held ?? hovered;
  if (!it || it.userData.fixed || (it.userData.onWall && !held)) return;
  it.userData.rotY = it.rotation.y + dir * step;
  if (!held) { it.rotation.y = it.userData.rotY; it.updateMatrixWorld(true); save(); }
  beep(700, 0.05);
}

function changeColor() {
  const it = held ?? hovered;
  if (it) {
    if (it.userData.fixed) return;
    recolor(it, nextIn(KID_COLORS, it.userData.color));
    beep(880, 0.07); save();
    return;
  }
  paint();
}

function paint() {
  if (!hoverSurface) return;
  const { kind, room } = hoverSurface;
  if (kind === 'wall') setRoomColors(room, nextIn(WALL_COLORS, room.wallColor));
  else setRoomColors(room, null, nextIn(FLOOR_COLORS, room.floorColor));
  beep(660, 0.12, 'triangle');
  save();
}

function trash() {
  const it = held ?? hovered;
  if (!it || it.userData.fixed) return;
  removeItem(it);
  settleAll();
  beep(250, 0.15, 'sawtooth', 0.06);
  toast(`Put away the ${it.userData.name}`);
  save();
}

function spawn(type) {
  const it = createItem(type);
  if (!it) return;
  if (held) { removeItem(held); }
  it.userData.rotY = camera.rotation.y; // face the player
  addItem(it);
  held = it;
}

// ---------- movement ----------
const controls = new PointerLockControls(camera, document.body);
const keys = {};
const spawnAt = () => {
  const s = HOUSE.spawn;
  const cam = params.get('cam')?.split(',').map(Number);
  const [x, z, f] = cam?.length >= 2 ? cam : [s.x, s.z, s.facing ?? 0];
  camera.position.set(x, EYE, z);
  camera.rotation.set(cam?.[3] ? THREE.MathUtils.degToRad(cam[3]) : 0, THREE.MathUtils.degToRad(f ?? 0) + Math.PI, 0);
};

function blocked(x, z) {
  for (const c of house.colliders) {
    if (x + RADIUS > c.minX && x - RADIUS < c.maxX && z + RADIUS > c.minZ && z - RADIUS < c.maxZ) return true;
  }
  return Math.abs(x) > 70 || Math.abs(z) > 70;
}

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3();
function updateMovement(dt) {
  const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (!f && !s) return;
  camera.getWorldDirection(fwd);
  fwd.y = 0; fwd.normalize();
  right.set(-fwd.z, 0, fwd.x);
  move.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, s).normalize()
    .multiplyScalar((keys.ShiftLeft || keys.ShiftRight ? RUN : WALK) * dt);
  const p = camera.position;
  if (!blocked(p.x + move.x, p.z)) p.x += move.x;
  if (!blocked(p.x, p.z + move.z)) p.z += move.z;
}

// ---------- looking at things ----------
function updateInteraction() {
  if (held) {
    const p = computePlacement(held);
    held.position.copy(p.pos);
    if (!p.onWall) held.position.y += 0.04 + Math.sin(performance.now() / 180) * 0.02; // gentle float
    held.rotation.y = p.rotY;
    held.userData.onWall = p.onWall;
    held.updateMatrixWorld(true);
    look.setOutline(held, true);
    hoverSurface = null;
    $('crosshair').classList.add('active');
    setHint(`Holding <b>${held.userData.name}</b> — <kbd>Click</kbd> put down · <kbd>R</kbd> turn · <kbd>C</kbd> color · <kbd>X</kbd> put away`);
    return;
  }
  centerRay.setFromCamera(CENTER, camera);
  const hit = centerRay.intersectObjects([...house.walls, ...house.floors, ...house.surfaces, ...house.solids, house.ground, ...items], true).find((h) => h.face);
  hovered = hit ? findItem(hit.object) : null;
  hoverSurface = null;
  look.setOutline(hovered, false);
  $('crosshair').classList.toggle('active', !!hovered);
  if (hovered) {
    if (hovered.userData.fixed) setHint(`<b>${hovered.userData.name}</b> — <kbd>Click</kbd> turn on / off`);
    else setHint(`<b>${hovered.userData.name}</b> — <kbd>Click</kbd> pick up · <kbd>R</kbd> turn · <kbd>C</kbd> color · <kbd>X</kbd> put away`);
    return;
  }
  const ud = hit?.object.userData;
  if (ud?.isWall) hoverSurface = { kind: 'wall', room: ud.room };
  else if (ud?.isFloor) hoverSurface = { kind: 'floor', room: ud.room };
  if (hoverSurface) setHint(`<kbd>C</kbd> paint the ${hoverSurface.kind === 'wall' ? 'walls' : 'floor'} of the ${hoverSurface.room.name} · <kbd>B</kbd> get new things`);
  else setHint('<kbd>B</kbd> get new things · <kbd>Esc</kbd> menu');
}

// ---------- UI ----------
const $ = (id) => document.getElementById(id);
let lastHint = '';
function setHint(html) { if (html !== lastHint) { $('hint').innerHTML = html; lastHint = html; } }
let toastTimer;
function toast(msg) {
  $('toast').textContent = msg;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 1800);
}

let mode = 'start';
function show(id) {
  for (const el of ['start', 'pause', 'catalog']) $(el).classList.toggle('hidden', el !== id);
  $('hud').classList.toggle('hidden', id !== null);
}

function play() {
  controls.lock();
}
controls.addEventListener('lock', () => { mode = 'play'; show(null); });
controls.addEventListener('unlock', () => {
  for (const k in keys) keys[k] = false;
  if (mode === 'catalog') return;
  mode = 'pause';
  show('pause');
});

$('title').textContent = HOUSE.title;
document.title = HOUSE.title;
$('startBtn').onclick = play;
$('resumeBtn').onclick = play;
$('resetBtn').onclick = () => {
  if (confirm('Put everything back the way it started?')) { loadDefaults(); save(); toast('All back to the start!'); play(); }
};
const qLabel = () => { $('qualityBtn').textContent = look.quality === 'pretty' ? '✨ Graphics: Pretty' : '⚡ Graphics: Fast'; };
qLabel();
$('qualityBtn').onclick = () => { look.setQuality(look.quality === 'pretty' ? 'fast' : 'pretty'); qLabel(); };
$('emptyBtn').onclick = () => {
  if (confirm('Take EVERYTHING out of the house?')) { clearItems(); save(); toast('The house is empty!'); play(); }
};

// Catalog
const thumbs = {};
function thumbFor(d) {
  if (!thumbs[d.id]) {
    const it = createItem(d.id);
    it.rotation.y = d.wall ? 0 : -0.35;
    try { thumbs[d.id] = makeThumbnail(it, d.wall); } catch { thumbs[d.id] = ''; }
  }
  return thumbs[d.id];
}
const TAB_ICONS = { Furniture: '🛋️', 'Kitchen & Bath': '🍳', Decorations: '🌸', 'Wall Stuff': '🖼️', 'Toys & Pets': '🧸', Outside: '🌳' };
let catTab = CATEGORIES[0];
function renderCatalog() {
  $('tabs').innerHTML = '';
  for (const c of CATEGORIES) {
    const b = document.createElement('button');
    b.textContent = `${TAB_ICONS[c] ?? ''} ${c}`;
    b.className = c === catTab ? 'tab on' : 'tab';
    b.onclick = () => { catTab = c; renderCatalog(); };
    $('tabs').appendChild(b);
  }
  $('grid').innerHTML = '';
  for (const d of CATALOG.filter((x) => x.cat === catTab && !x.hidden)) {
    const b = document.createElement('button');
    b.className = 'thing';
    b.innerHTML = `<img alt="" src="${thumbFor(d)}"><span>${d.name}</span>`;
    b.onclick = () => { spawn(d.id); beep(600); play(); };
    $('grid').appendChild(b);
  }
}
function openCatalog() {
  mode = 'catalog';
  renderCatalog();
  show('catalog');
  controls.unlock();
}
$('closeCatalog').onclick = play;

// ---------- input ----------
document.addEventListener('keydown', (e) => {
  if (mode === 'catalog' && (e.code === 'KeyB' || e.code === 'Escape')) { play(); return; }
  if (mode !== 'play') return;
  keys[e.code] = true;
  switch (e.code) {
    case 'KeyE': case 'Space': primaryAction(); e.preventDefault(); break;
    case 'KeyR': rotate(1); break;
    case 'KeyQ': rotate(-1); break;
    case 'KeyC': changeColor(); break;
    case 'KeyP': paint(); break;
    case 'KeyX': case 'Delete': case 'Backspace': trash(); break;
    case 'KeyB': case 'Tab': openCatalog(); e.preventDefault(); break;
  }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
document.addEventListener('mousedown', (e) => {
  if (mode !== 'play' || !controls.isLocked) return;
  if (e.button === 0) primaryAction();
  if (e.button === 2) rotate(1);
});
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('wheel', (e) => {
  if (mode === 'play' && held) rotate(Math.sign(e.deltaY), Math.PI / 12);
}, { passive: true });



// ---------- go! ----------
spawnAt();
scene.updateMatrixWorld(true);
if (!loadSave()) loadDefaults();
settleAll();

if (params.has('shot')) { show(null); $('hud').classList.add('hidden'); }
else show('start');

const ROOM_ICONS = [['bath', '🛁'], ['kitchen', '🍳'], ['dining', '🍽️'], ['living', '🛋️'], ['hall', '🚪'], ['room', '🛏️'], ['bedroom', '🛏️']];
const roomIcon = (name) => (ROOM_ICONS.find(([k]) => name.toLowerCase().includes(k)) ?? [0, '🏠'])[1];
let currentRoom = null;
function updateRoom() {
  const p = camera.position;
  const room = house.rooms.find((r) => p.x > r.x && p.x < r.x + r.w && p.z > r.z && p.z < r.z + r.d);
  const name = room ? room.name : 'Outside';
  if (name === currentRoom) return;
  currentRoom = name;
  const icon = room ? roomIcon(name) : '🌳';
  $('room').textContent = `${icon} ${name}`;
  $('banner').textContent = `${icon} ${name}`;
  $('banner').classList.remove('show');
  void $('banner').offsetWidth; // restart the animation
  $('banner').classList.add('show');
}

// If the computer is struggling, switch to Fast graphics automatically (once).
let perf = { frames: 0, time: 0, checked: false };
function watchSpeed(dt) {
  if (perf.checked || look.quality !== 'pretty' || mode !== 'play') return;
  perf.frames++; perf.time += dt;
  if (perf.time > 4) {
    perf.checked = true;
    if (perf.frames / perf.time < 28) { look.setQuality('fast'); qLabel(); toast('Switched to Fast graphics ⚡'); }
  }
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  for (const f of house.fans) f.rotation.y += dt * 3;
  if (mode === 'play') {
    updateMovement(dt);
    updateInteraction();
    updateRoom();
    watchSpeed(dt);
  }
  look.update(dt);
  look.render();
});
