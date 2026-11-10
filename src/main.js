import * as THREE from 'three';
import { HOUSE } from './house.js';
import { buildWorld } from './world.js';
import { CATALOG, CATEGORIES, createItem, recolor, KID_COLORS, WALL_COLORS, FLOOR_COLORS, nextIn } from './items.js';
import { setupLook, makeThumbnail, startQuality } from './look.js';
import { createCharacter, animateCharacter, DEFAULT_CHARACTER } from './character.js';
import { setupCreator } from './creator.js';
import { P } from './palette.js';
import { setupRemotes } from './remotes.js';
import { tone, noise, melody } from './sound.js';
import { setupInteractions, isToggle } from './interactions.js';
import { setupTownsfolk } from './townsfolk.js';
import { setupTraffic } from './traffic.js';
import { setupAnimals } from './animals.js';
import { setupAudio } from './audio.js';
import { setupGamepad, BTN, PAD_HINTS } from './gamepad.js';
import { setupQuiz } from './quiz.js';
import { setupStory } from './story.js';
import { PEOPLE, SAYINGS, TRAFFIC, groceryShelf } from './neighborhood.js';

const WALK = 2.6, RUN = 5;
const REACH = 6;
const GAME_NAME = 'PepCity';
const SAVE_KEY = "house-save:Ashley's House"; // keep the old save name so the house isn't lost
const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// ---------- renderer / scene ----------
// on Low graphics, skip smoothing the edges (it costs a lot on laptops)
const renderer = new THREE.WebGLRenderer({ antialias: startQuality() !== 'low', preserveDrawingBuffer: params.has('shot'), powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);
camera.rotation.order = 'YXZ';

const world = buildWorld();
scene.add(world.group);
const look = setupLook({ renderer, scene, camera, center: new THREE.Vector3(8, 0, -6) });
if (params.has('fast')) look.setQuality('fast');

// A few room lights that follow you around (so every building can be lit without slowing down)
let lightTimer = 0;
const allRoomLights = Array.from({ length: 8 }, () => new THREE.PointLight('#fff1dc', 0, 0, 2));
let roomLights = [];
function setLightCount(n) {
  for (const l of allRoomLights) scene.remove(l);
  roomLights = allRoomLights.slice(0, n);
  for (const l of roomLights) scene.add(l);
  lightTimer = 0;
}
let viewDist = 150; // things farther than this aren't drawn
look.onQuality = (Q) => { setLightCount(Q.lights); viewDist = Q.view; };
look.onQuality(look.settings);
function updateRoomLights(dt) {
  lightTimer -= dt;
  if (lightTimer > 0) return;
  lightTimer = 0.25;
  const p = player.pos;
  const near = world.lightSpots.filter((s) => !s.room?.lightsOff)
    .map((s) => ({ s, d: (s.x - p.x) ** 2 + (s.z - p.z) ** 2 }))
    .sort((a, b) => a.d - b.d);
  roomLights.forEach((l, i) => {
    const n = near[i];
    if (!n || n.d > 45 * 45) { l.intensity = 0; return; }
    l.position.set(n.s.x, n.s.y, n.s.z);
    l.intensity = n.s.intensity;
  });
}

// ---------- real sounds (sounds/ folder) ----------
const audio = setupAudio();
// play a sound at a spot: too far away = silent; in a different building (or you're inside and it's outside) = muffled
const sfx = (name, pos, opts = {}) => {
  if (pos) {
    const d = Math.hypot(pos.x - player.pos.x, pos.z - player.pos.z);
    if (d > (opts.maxDist ?? 30)) return audio.has(name); // too far to hear (and don't play a made-up sound instead)
    const here = roomAt(player.pos.x, player.pos.z)?.building, there = roomAt(pos.x, pos.z)?.building;
    if (here !== there) opts = { ...opts, vol: (opts.vol ?? 1) * 0.35 };
  }
  return audio.play(name, pos, opts);
};
const near = (pos, d = 30) => !pos || Math.hypot(pos.x - player.pos.x, pos.z - player.pos.z) < d;
let bg = null; // the background loops, made once sound is allowed
audio.onStart = () => {
  bg = {
    outside: audio.loop('ambience', { flat: true, vol: 0.45 }),
    parkBirds: audio.loop('birds', { x: 38, z: -30, vol: 0.9, ref: 8, max: 40 }),
    play1: audio.loop('playground', { x: 30.5, z: -24, vol: 0.55, ref: 4, max: 28 }),
    play2: audio.loop('playground', { x: 14, z: -42, vol: 0.55, ref: 4, max: 28 }),
    office: audio.loop('office', { x: -55, z: -54, vol: 0.8, ref: 4, max: 18 }),
    fire: audio.loop('fire', { vol: 0.8, ref: 1.5, max: 12 }),
    hose: audio.loop('hose', { x: 84.8, z: -43.5, vol: 0.35, ref: 2.5, max: 20 }),
    fountain: audio.loop('fountain', { x: 37.5, z: -24, vol: 0.6, ref: 2.5, max: 16 }),
    classroom: audio.loop('classroom', { x: -12, z: -42, vol: 0.5, ref: 4, max: 18 }),
    street: audio.loop('street', { vol: 0.3, ref: 4, max: 30 }),
    engine: audio.loop('engine', { vol: 0.55, ref: 3, max: 30 }),
    icecream: audio.loop('icecreamsong', { vol: 0.45, ref: 4, max: 30 }),
    woodsBirds: audio.loop('birds', { x: 5, z: 52, vol: 0.9, ref: 14, max: 45 }),
    pond: audio.loop('fountain', { x: 25, z: 50, vol: 0.35, ref: 3, max: 16 }),
    popcorn: audio.loop('popcorn', { x: -48.8, z: -3, vol: 0.35, ref: 1.5, max: 10 }),
    carousel: audio.loop('piano', { x: 95, z: 116, vol: 0.5, ref: 4, max: 28 }),
  };
};
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => audio.start(), { once: false, passive: true });
let bgTimer = 0, schoolBellIn = 40, waveIn = 2;
function updateSounds(dt) {
  audio.update(camera);
  // engine: follows the car you're driving, revs up as you go faster
  if (bg) {
    bg.engine.level(driving ? 1 : 0);
    if (driving) { bg.engine.at(driving.position.x, driving.position.z); bg.engine.rate(0.85 + Math.min(1, Math.abs(drive.v) / 10) * 0.7); }
  }
  if (!bg || (bgTimer -= dt) > 0) return;
  bgTimer = 0.3;
  const room = roomAt(player.pos.x, player.pos.z), inside = !!room;
  bg.outside.level(inside ? 0.25 : 1);
  for (const l of [bg.parkBirds, bg.play1, bg.play2, bg.hose]) l.level(inside ? 0.25 : 1);
  bg.office.level(room?.building === 'office' ? 1 : 0.3);
  // crackling fire: the nearest fireplace or fire pit that's lit
  let best = null, bd = 20;
  for (const it of items) {
    const t = it.userData.type;
    const lit = (t === 'fireplace' && !it.userData.off) || (t === 'firepit' && it.userData.on);
    if (!lit) continue;
    const d = Math.hypot(it.position.x - player.pos.x, it.position.z - player.pos.z);
    if (d < bd) { bd = d; best = it; }
  }
  if (best) bg.fire.at(best.position.x, best.position.z);
  bg.fire.level(best ? 1 : 0);
  bg.fountain.level(inside ? 0.2 : 1);
  bg.woodsBirds.level(inside ? 0.2 : 1);
  bg.carousel.level(inside ? 0 : 1);
  bg.popcorn.level(room?.building === 'cinema' ? (mode === 'movie' ? 0.1 : 1) : 0);
  bg.pond.level(inside ? 0.2 : 1);
  bg.classroom.level(room?.building === 'school' ? 1 : 0.15);
  // doing math with Ms. Lopez: the classroom goes very quiet so you can hear her
  if (mode === 'quiz' || mode === 'movie') {
    bg.classroom.level(0.03);
    for (const l of [bg.outside, bg.street, bg.parkBirds, bg.play1, bg.play2, bg.woodsBirds, bg.icecream]) l.level(0.05);
  }
  // street sounds come from the closest bit of road
  let rp = null, rd = Infinity;
  for (let i = 0; i < world.loop.pts.length; i += 6) {
    const [x, z] = world.loop.pts[i], d = (x - player.pos.x) ** 2 + (z - player.pos.z) ** 2;
    if (d < rd) { rd = d; rp = [x, z]; }
  }
  if (rp) bg.street.at(rp[0], rp[1]);
  bg.street.level(inside ? 0.2 : 1);
  // the ice cream truck plays its song as it drives around
  const truck = traffic.cars.find((c) => c.mesh.userData.type === 'icecreamtruck');
  if (truck) bg.icecream.at(truck.x, truck.z);
  bg.icecream.level(truck ? (inside ? 0.3 : 1) : 0);
  // waves rolling in at the beach
  waveIn -= 0.3;
  if (waveIn <= 0) {
    waveIn = 3.5 + Math.random() * 2.5;
    const d = Math.abs(player.pos.x - 113);
    if (d < 25 && !inside) noise(2.8, 0.09 * (1 - d / 25), 1200, 0, 300);
  }
  // the school bell rings now and then
  schoolBellIn -= 0.3;
  if (schoolBellIn <= 0 && mode !== 'quiz') { schoolBellIn = 150; if (Math.hypot(player.pos.x + 6.5, player.pos.z + 40) < 35) sfx('schoolbell', { x: -6.5, z: -40 }, { maxDist: 40 }); }
}

for (const r of world.rooms) if (r.dark) r.lightsOff = true; // the movie theater is dark

// ---------- the player ----------
const spawn = HOUSE.spawn;
const player = {
  pos: new THREE.Vector3(spawn.x, 0, spawn.z),
  yaw: THREE.MathUtils.degToRad(spawn.facing ?? 0) + Math.PI,
  pitch: -0.12,
  facing: THREE.MathUtils.degToRad(spawn.facing ?? 0),
  speed: 0,
  firstPerson: false,
  vy: 0, air: false, // jumping
  swimming: false,
};
const camArg = params.get('cam')?.split(',').map(Number);
if (camArg?.length >= 2) {
  player.pos.set(camArg[0], 0, camArg[1]);
  if (camArg[2] !== undefined) { player.yaw = THREE.MathUtils.degToRad(camArg[2]) + Math.PI; player.facing = player.yaw + Math.PI; }
  if (camArg[3] !== undefined) player.pitch = THREE.MathUtils.degToRad(camArg[3]);
  if (camArg[4]) player.firstPerson = true;
}

let character = { ...DEFAULT_CHARACTER, ...(store.get('character') ?? {}) };
if (params.get('char')) try { character = { ...character, ...JSON.parse(params.get('char')) }; } catch { /* test helper */ }
const hasCharacter = !!store.get('character');
let avatar = createCharacter(character);
scene.add(avatar.root);
function setCharacter(c) {
  character = c;
  store.set('character', c);
  scene.remove(avatar.root);
  avatar = createCharacter(c);
  scene.add(avatar.root);
  $('who').textContent = c.name;
  net?.send('mp:char', { character: c });
}

// ---------- items ----------
const items = [];
const byId = new Map(); // every item has an id so both players agree which one is which
const animItems = new Set();
let held = null, hovered = null, hoverSurface = null, hoverDoor = null, hoverFolk = null, hoverFan = null;
let driving = null; // the car (or bus) you're driving
let riding = null;  // the car a friend is driving, with you in it
let parkRide = null, hoverRide = null; // a Fun Park ride you're on / looking at
const drive = { v: 0, steer: 0, lastMouse: 0 };
const padIn = { lx: 0, ly: 0, lt: 0, rt: 0 }; // the game controller's sticks and triggers
const newId = () => Math.random().toString(36).slice(2, 10);

function addItem(it, id) {
  it.userData.uid = id ?? it.userData.uid ?? newId();
  scene.add(it); items.push(it); it.updateMatrixWorld(true);
  byId.set(it.userData.uid, it);
  if (it.userData.anim) animItems.add(it);
  inter.initItem(it);
}
function removeItem(it) {
  scene.remove(it);
  items.splice(items.indexOf(it), 1);
  byId.delete(it.userData.uid);
  animItems.delete(it);
  if (held === it) held = null;
  if (hovered === it) hovered = null;
}

const statics = [...world.walls, ...world.floors, ...world.surfaces, ...world.solids, world.ground];
const downStatics = [...world.floors, ...world.surfaces, ...world.solids, world.ground];
const placeTargets = () => [...statics, ...items.filter((i) => i !== held)];
const findItem = (obj) => { while (obj) { if (obj.userData?.isItem) return obj; obj = obj.parent; } return null; };
const worldNormal = (hit) => hit.face.normal.clone().transformDirection(hit.object.matrixWorld);

const downRay = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, -1, 0);
function surfaceBelow(x, fromY, z, exclude) {
  downRay.set(new THREE.Vector3(x, fromY, z), DOWN);
  downRay.far = 20;
  const targets = [...downStatics, ...items.filter((i) => i !== exclude && i !== held)];
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
    for (const c of world.colliders) {
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
const CENTER = new THREE.Vector2(0, 0);
let camDist = 0;

// Where should the held item go, given where the player is looking?
function computePlacement(item) {
  centerRay.setFromCamera(CENTER, camera);
  centerRay.far = REACH + camDist;
  const hit = centerRay.intersectObjects(placeTargets(), true).find((h) => h.face);
  const u = item.userData;
  const rotY = u.rotY;

  if (hit) {
    const n = worldNormal(hit);
    if (u.wall && hit.object.userData.isWall && Math.abs(n.y) < 0.3) {
      const p = hit.point.clone().addScaledVector(n, 0.005);
      p.y = THREE.MathUtils.clamp(p.y, 0.5, (hit.object.userData.room?.H ?? 2.7) - 0.3);
      return { pos: p, rotY: Math.atan2(n.x, n.z), onWall: true };
    }
  }

  let px, pz, startY;
  if (!hit) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const p = camera.position.clone().addScaledVector(dir, 2.5 + camDist);
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
  const list = items.filter((i) => i !== held && i !== driving && !i.userData.onWall && !remoteHeld.has(i.userData.uid)).sort((a, b) => a.position.y - b.position.y);
  for (const it of list) {
    const bottom = it.position.y - it.userData.baseY;
    const y = surfaceBelow(it.position.x, bottom + 0.05, it.position.z, it);
    if (Math.abs(y - bottom) > 0.002) { it.position.y = y + it.userData.baseY; it.updateMatrixWorld(true); }
  }
}

// ---------- save / load ----------
const ALL_AREAS = [...world.buildings, ...world.areas];
const r3 = (v) => Math.round(v * 1000) / 1000;
let saveTimer = null;
// pets wander around, but what's saved is the spot they were put (so wandering doesn't change the house)
const spotOf = (i) => i.userData.roam?.home ?? i.position;
const recordOf = (i) => ({ id: i.userData.uid, t: i.userData.type, x: r3(spotOf(i).x), y: r3(spotOf(i).y), z: r3(spotOf(i).z), r: r3(i.rotation.y), c: i.userData.color, w: i.userData.onWall ? 1 : 0, off: i.userData.off ? 1 : 0,
  ...(isToggle(i.userData.type) ? { s: i.userData.on ? 1 : 0 } : {}) });
const roomsNow = () => Object.fromEntries(world.rooms.map((r) => [r.name, { wall: r.wallColor, floor: r.floorColor }]));
function snapshot() {
  return { v: 3, areas: ALL_AREAS.map((a) => a.id), items: items.map(recordOf), rooms: roomsNow() };
}
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    store.set(SAVE_KEY, snapshot());
    pushChanges();
  }, 120);
}

// ---------- playing together ----------
// What the other players already know about, so only the differences get sent.
const sent = { items: new Map(), rooms: new Map() };
function markSent(snap) {
  sent.items = new Map(snap.items.map((r) => [r.id, JSON.stringify(r)]));
  sent.rooms = new Map(Object.entries(snap.rooms).map(([k, v]) => [k, JSON.stringify(v)]));
}
function pushChanges() {
  if (!net?.ready) return;
  const out = { items: [], del: [], rooms: {} };
  const seen = new Set();
  for (const it of items) {
    const rec = recordOf(it), s = JSON.stringify(rec);
    seen.add(rec.id);
    if (remoteHeld.has(rec.id)) continue; // a friend is carrying it; they'll say where it ends up
    if (sent.items.get(rec.id) !== s) { out.items.push(rec); sent.items.set(rec.id, s); }
  }
  for (const id of sent.items.keys()) if (!seen.has(id)) { out.del.push(id); sent.items.delete(id); }
  for (const [name, v] of Object.entries(roomsNow())) {
    const s = JSON.stringify(v);
    if (sent.rooms.get(name) !== s) { out.rooms[name] = v; sent.rooms.set(name, s); }
  }
  if (out.items.length || out.del.length || Object.keys(out.rooms).length) {
    out.areas = ALL_AREAS.map((a) => a.id);
    net.send('mp:changes', out);
  }
}

// Put an item exactly where another player says it is (making it if we don't have it yet).
function applyRecord(rec) {
  let it = byId.get(rec.id);
  if (it && it.userData.type !== rec.t) { removeItem(it); it = null; }
  if (!it) {
    it = createItem(rec.t, rec.c);
    if (!it) return null;
    addItem(it, rec.id);
  }
  if (it === held) return it; // I'm holding it, my hands win
  if (rec.c && rec.c !== it.userData.color) recolor(it, rec.c);
  if (!!rec.off !== !!it.userData.off) toggleItem(it, true);
  if (rec.s !== undefined && !!rec.s !== !!it.userData.on) inter.setOn(it, !!rec.s, Math.hypot(it.position.x - player.pos.x, it.position.z - player.pos.z) > 15);
  it.position.set(rec.x, rec.y, rec.z);
  it.rotation.y = rec.r; it.userData.rotY = rec.r;
  it.userData.onWall = !!rec.w;
  it.updateMatrixWorld(true);
  return it;
}
function applyChanges(d) {
  for (const rec of d.items ?? []) { if (applyRecord(rec)) sent.items.set(rec.id, JSON.stringify(rec)); }
  for (const id of d.del ?? []) {
    const it = byId.get(id);
    if (it) { removeItem(it); if (hovered === it) hovered = null; }
    sent.items.delete(id);
  }
  for (const [name, v] of Object.entries(d.rooms ?? {})) {
    for (const r of world.rooms) if (r.name === name) setRoomColors(r, v.wall, v.floor);
    sent.rooms.set(name, JSON.stringify(v));
  }
  store.set(SAVE_KEY, snapshot());
}

const remotes = setupRemotes(scene);
const remoteHeld = new Map(); // item id -> the player holding it
function holderOf(it) {
  const pid = it && remoteHeld.get(it.userData.uid);
  return pid ? remotes.players.get(pid) : null;
}
function updatePlayersHud() {
  const n = remotes.players.size + 1;
  $('players').textContent = n > 1 ? `👫 ${n}` : '';
}

const net = import.meta.hot && !params.has('solo') ? {
  ready: false,
  send: (ev, data) => import.meta.hot.send(ev, data),
} : null;

function startNet() {
  if (!net) return;
  const hot = import.meta.hot;
  hot.on('mp:welcome', (d) => {
    net.ready = true;
    net.id = d.id;
    if (d.world) {
      // Somebody's game already has the neighborhood: use theirs.
      loadSave({ ...d.world, items: Object.values(d.world.items ?? {}) });
      markSent({ items: Object.values(d.world.items ?? {}), rooms: d.world.rooms ?? {} });
      store.set(SAVE_KEY, snapshot());
      clearRoad();
      pushChanges(); // places added since (new furniture for new buildings)
      if (!player.moved) spawnInBed();
    }
    for (const [id, open] of Object.entries(d.world?.doors ?? {})) { const door = doorById.get(id); if (door) door.open = open; else setSwitch(id, open, true); }
    for (const p of d.players) remotes.add(p.id, p.character, p.pose);
    if (d.players.length) toast(`Playing with ${d.players.map((p) => p.character?.name || 'a friend').join(' and ')}! 👫`, 3000);
    showJoinInfo(d.urls);
    updatePlayersHud();
  });
  hot.on('mp:full', () => toast('The game is full right now', 4000));
  hot.on('mp:join', (p) => {
    remotes.add(p.id, p.character, p.pose);
    updatePlayersHud();
    chime([660, 880]);
    toast(`${p.character?.name || 'A friend'} is here! 👋`, 3000);
  });
  hot.on('mp:leave', ({ id }) => {
    const r = remotes.remove(id);
    // Anything they were still carrying falls to the floor (or vanishes if it was brand new).
    for (const [iid, pid] of remoteHeld) {
      if (pid !== id) continue;
      remoteHeld.delete(iid);
      const it = byId.get(iid);
      if (it && !sent.items.has(iid)) removeItem(it);
    }
    settleAll(); save();
    updatePlayersHud();
    if (r) toast(`${r.character?.name || 'Your friend'} went home 👋`, 3000);
  });
  hot.on('mp:char', ({ id, character }) => remotes.setCharacter(id, character));
  hot.on('mp:pose', (p) => {
    remotes.pose(p.id, p);
    for (const [iid, pid] of remoteHeld) if (pid === p.id && iid !== p.h?.id) remoteHeld.delete(iid);
    if (p.h) {
      // things friends carry or drive glide smoothly to where they are
      let it = byId.get(p.h.id);
      if (!it || it.userData.type !== p.h.t || remoteHeld.get(p.h.id) !== p.id) it = applyRecord(p.h);
      else { if (p.h.c !== it.userData.color) recolor(it, p.h.c); it.userData.netTarget = p.h; }
      if (it && it !== held && it !== driving) {
        remoteHeld.set(p.h.id, p.id);
        if (hovered === it) hovered = null;
      }
    }
  });
  hot.on('mp:changes', applyChanges);
  hot.on('mp:door', ({ id, open }) => { const door = doorById.get(id); if (door) setDoor(door, open, true); else setSwitch(id, open, true); });
  hot.on('mp:fx', (f) => {
    const near = Math.hypot(f.x - player.pos.x, f.z - player.pos.z) < 18;
    if (f.kind === 'burst') look.burst(new THREE.Vector3(f.x, f.y, f.z), f.n);
    if (f.kind === 'quack' && near) quack(f);
    if (f.kind === 'chime' && near) chime();
    if (f.kind === 'honk' && near) honkSound(f.t, f);
    if (f.kind === 'act' && Math.hypot(f.x - player.pos.x, f.z - player.pos.z) < 30) { const it = byId.get(f.id); if (it) inter.replay(it); }
  });
  const snap = snapshot();
  markSent(snap);
  net.send('mp:hello', { character, world: { areas: snap.areas, rooms: snap.rooms, items: Object.fromEntries(snap.items.map((r) => [r.id, r])) } });
}

function glideRemoteThings(dt) {
  const k = 1 - Math.exp(-dt * 12);
  for (const iid of remoteHeld.keys()) {
    const it = byId.get(iid), tg = it?.userData.netTarget;
    if (!tg) continue;
    it.position.x += (tg.x - it.position.x) * k;
    it.position.y += (tg.y - it.position.y) * k;
    it.position.z += (tg.z - it.position.z) * k;
    it.rotation.y += wrapAngle(tg.r - it.rotation.y) * k;
    it.userData.rotY = it.rotation.y;
    it.userData.onWall = !!tg.w;
    it.updateMatrixWorld(true);
  }
}

function fx(kind, pos, n, extra) { net?.send('mp:fx', { kind, x: r3(pos.x), y: r3(pos.y), z: r3(pos.z), n, ...extra }); }

let poseTimer = 0, lastPose = '';
function sendPose(dt) {
  if (!net?.ready) return;
  poseTimer += dt;
  if (poseTimer < 0.08) return;
  poseTimer = 0;
  const thing = driving ?? held;
  const p = { x: r3(player.pos.x), y: r3(player.pos.y), z: r3(player.pos.z), f: r3(player.facing), s: r3(player.speed), h: thing ? recordOf(thing) : null, d: driving ? 1 : 0, m: player.air ? 'jump' : riding || parkRide ? 'sit' : inter.mode() };
  const s = JSON.stringify(p);
  if (s === lastPose) return;
  lastPose = s;
  net.send('mp:pose', p);
}

function showJoinInfo(urls) {
  const html = urls?.length ? `👫 <b>Play together!</b> On another computer on the same Wi-Fi, open:<br>${urls.map((u) => `<code>${u}</code>`).join('<br>')}` : '';
  for (const el of document.querySelectorAll('.join')) el.innerHTML = html;
}

function setRoomColors(room, wall, floor) {
  if (wall) room.wallColor = wall;
  if (floor) room.floorColor = floor;
  tintRoom(room);
}
// a room with its lights off looks darker
function tintRoom(room) {
  const k = room.lightsOff ? 0.5 : 1;
  room.wallMat.color.set(room.wallColor).multiplyScalar(k);
  room.floorMat.color.set(room.floorColor).multiplyScalar(k);
}

// You start the game tucked in bed: boys in the Kids' Room, girls in Ashley's Room, grown-ups in the Big Bedroom.
function spawnInBed() {
  if (camArg?.length >= 2) return;
  const name = character.age === 'grownup' ? 'Big Bedroom' : character.body === 'boy' ? "Kids' Room" : "Ashley's Room";
  const room = world.rooms.find((r) => r.name === name && r.building === 'home');
  if (!room) return;
  const inRoom = (p) => p.x > room.x && p.x < room.x + room.w && p.z > room.z && p.z < room.z + room.d;
  const bed = items.find((i) => (i.userData.type === 'bed' || i.userData.type === 'bigbed') && inRoom(i.position));
  inter.standUp();
  const cx = room.x + room.w / 2, cz = room.z + room.d / 2;
  if (!bed) { player.pos.set(cx, 0, cz); return; }
  inter.napOn(bed);
  // look at the bed from the middle of the room
  player.yaw = Math.atan2(-(bed.position.x - cx), -(bed.position.z - cz));
  player.pitch = -0.5;
}

// Cars or buses left parked on the road would block traffic, so they're cleared away when the world loads.
function clearRoad() {
  let n = 0;
  for (const it of [...items]) {
    if (it.userData.action === 'drive' && world.loop.dist(it.position.x, it.position.z) < 3.8) { removeItem(it); n++; }
  }
  if (n) save();
}

function clearItems() { while (items.length) removeItem(items[0]); held = null; }

function placeDefaults(area) {
  if (area.clearSpots) for (const f of area.furniture ?? []) {
    for (const it of [...items]) if (it.userData.action === 'drive' && Math.hypot(it.position.x - f.x, it.position.z - f.z) < 3) removeItem(it);
  }
  for (const f of area.furniture ?? []) {
    const it = createItem(f.item, f.color);
    if (!it) continue;
    const rot = THREE.MathUtils.degToRad(f.rot ?? 0);
    it.rotation.y = rot; it.userData.rotY = rot;
    if (it.userData.wall && f.y !== undefined) {
      it.position.set(f.x, f.y, f.z);
      it.userData.onWall = true;
    } else {
      it.position.set(f.x, surfaceBelow(f.x, f.y ?? 3.2, f.z, it) + it.userData.baseY, f.z);
    }
    addItem(it);
  }
}

function loadDefaults() {
  clearItems();
  for (const r of world.rooms) setRoomColors(r, r.defWall, r.defFloor);
  for (const a of ALL_AREAS) placeDefaults(a);
}

function loadSave(data = store.get(SAVE_KEY)) {
  if (!data?.items) return false;
  clearItems();
  for (const r of world.rooms) {
    const s = data.rooms?.[r.name];
    setRoomColors(r, s?.wall ?? r.defWall, s?.floor ?? r.defFloor);
  }
  for (const s of data.items) {
    // plain shelves in the grocery store become stocked shelves
    if (s.t === 'storeshelf' && s.x > -58 && s.x < -42 && s.z > -34 && s.z < -22) { s.t = groceryShelf(s.x, s.z); s.c = undefined; }
    const it = createItem(s.t, s.c);
    if (!it) continue;
    it.position.set(s.x, s.y, s.z);
    it.rotation.y = s.r; it.userData.rotY = s.r;
    it.userData.onWall = !!s.w;
    if (s.off) toggleItem(it, true);
    if (s.s !== undefined) it.userData.on = !!s.s;
    addItem(it, s.id);
  }
  // New places since this save was made get their starting furniture
  const seeded = new Set(data.areas ?? ['home']);
  for (const a of ALL_AREAS) if (!seeded.has(a.id)) placeDefaults(a);
  return true;
}

// ---------- sounds ----------
const beep = (f, d, type, v) => tone(f, d, type, v);
const quack = (pos) => { if (sfx('quack', pos)) return; tone(520, 0.12, 'sawtooth', 0.08, 0.6); tone(480, 0.14, 'sawtooth', 0.08, 0.6, 0.16); };
const chime = (notes = [660, 830, 990, 1320]) => notes.forEach((n, i) => tone(n, 0.25, 'triangle', 0.12, 1.01, i * 0.09));

// ---------- actions ----------
const TOYS = ['teddy', 'ball', 'dino', 'robot', 'unicorn', 'duck', 'toycar', 'balloons', 'cupcake'];
const FLAVORS = [P.bubblegum, '#8a5a3c', P.mint, P.butter, P.lavender, P.cream, P.coral];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function toggleItem(it, silent) {
  const fire = it.getObjectByName('fire'), light = it.getObjectByName('firelight');
  if (!fire) return false;
  it.userData.off = fire.visible;
  fire.visible = !fire.visible;
  if (light) light.visible = fire.visible;
  if (!silent) beep(fire.visible ? 500 : 300, 0.15, 'triangle');
  return true;
}

function giveItem(type, color, msg) {
  spawnHeld(type, color);
  chime([700, 880, 1050]);
  toast(msg);
}

function pickUp(it) {
  const friend = holderOf(it);
  if (friend && it.userData.action === 'drive') { rideAlong(it, friend); return; }
  if (friend) { toast(`${friend.character?.name || 'Your friend'} is holding that!`); return; }
  const a = it.userData.action;
  if (a === 'toggle') { toggleItem(it); save(); return; }
  if (a === 'icecream' || a === 'toy' || a === 'give') sfx('register', it.position);
  if (a === 'icecream') { giveItem('icecream', pick(FLAVORS), 'Here is your ice cream! 🍦'); return; }
  if (a === 'toy') { const t = pick(TOYS); giveItem(t, undefined, 'A surprise toy! 🎁'); return; }
  if (a === 'quack') { quack(it.position); fx('quack', it.position); }
  if (a === 'drive') { enterCar(it); return; }
  if (a === 'give') { if (it.userData.type === 'popcornmachine') sfx('popcorn', it.position); giveItem(pick(it.userData.gives), undefined, it.userData.giveMsg); return; }
  if (it.userData.fixed) { toast("That one's stuck!"); return; }
  delete it.userData.roam; // stop wandering while you carry it
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
  const at = new THREE.Vector3(it.position.x, top.max.y + 0.05, it.position.z);
  look.burst(at);
  fx('burst', at);
  beep(380, 0.08, 'triangle');
  save();
}

function jump() {
  if (inter.busy()) { inter.standUp(); return; }
  if (player.air) return;
  player.air = true;
  player.vy = 6.6; // about a meter high
  tone(300, 0.15, 'sine', 0.08, 2);
}

function primaryAction() {
  if (parkRide) { leaveParkRide(); return; }
  if (inter.busy()) { inter.standUp(); return; }
  if (riding) { getOutOfRide(); return; }
  if (driving) exitCar();
  else if (held) putDown();
  else if (hovered) pickUp(hovered);
  else if (hoverDoor) { if (!hoverDoor.auto) setDoor(hoverDoor, !hoverDoor.open); }
  else if (hoverFolk) { folks.talk(hoverFolk, character.name, player.pos); tone(760, 0.1, 'sine', 0.1, 1.3); tone(950, 0.12, 'sine', 0.1, 1.2, 0.1); }
}

// ---------- right-click: interact with things ----------
const inter = setupInteractions({
  scene, look, player,
  avatar: () => avatar,
  held: () => held,
  blocked: (x, z) => blocked(x, z),
  moving: () => ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some((k) => keys[k]) || Math.hypot(padIn.lx, padIn.ly) > 0.5,
  give: (type, msg) => giveItem(type, undefined, msg),
  remove: (it) => { removeItem(it); settleAll(); save(); },
  drive: (it) => enterCar(it),
  action: (it) => pickUp(it),
  save: () => save(),
  name: () => character.name,
  share: (it) => fx('act', it.position, undefined, { id: it.userData.uid }),
  sfx: (name, pos) => sfx(name, pos),
  openStory: () => openStory(),
  openMovie: () => openMovie(),
});
function interact() {
  if (parkRide) { leaveParkRide(); return; }
  if (hoverRide) { startParkRide(hoverRide); return; }
  if (driving) { honk(); return; }
  if (riding) { getOutOfRide(); return; }
  if (inter.busy()) { inter.standUp(); return; }
  if (held) return;
  if (hovered) {
    const friend = holderOf(hovered);
    if (friend && hovered.userData.action === 'drive') { rideAlong(hovered, friend); return; }
    if (friend) { toast(`${friend.character?.name || 'Your friend'} is using that!`); return; }
    inter.run(hovered);
  } else if (hoverDoor) { if (!hoverDoor.auto) setDoor(hoverDoor, !hoverDoor.open); }
  else if (hoverFolk) primaryAction();
  else if (hoverFan) setSwitch(hoverFan.userData.id, !hoverFan.userData.off);
  else if (hoverSurface) setSwitch('light:' + hoverSurface.room.name, !hoverSurface.room.lightsOff);
}

// ---------- switches: ceiling fans and room lights (shared with the other player) ----------
function setSwitch(id, off, fromNet) {
  if (id.startsWith('fan:')) {
    const f = world.fans.find((x) => x.userData.id === id);
    if (!f || !!f.userData.off === !!off) return;
    f.userData.off = !!off;
    if (!fromNet) tone(off ? 400 : 600, 0.06, 'square', 0.04, 1);
  } else if (id.startsWith('light:')) {
    const name = id.slice(6);
    let changed = false;
    for (const r of world.rooms) if (r.name === name && !!r.lightsOff !== !!off) { r.lightsOff = !!off; tintRoom(r); changed = true; }
    if (!changed) return;
    lightTimer = 0;
    if (!fromNet) tone(off ? 380 : 620, 0.05, 'square', 0.05, 1);
  } else return;
  if (!fromNet) net?.send('mp:door', { id, open: !!off });
}

// ---------- doors ----------
const doorById = new Map(world.doors.map((d) => [d.id, d]));
function setDoor(d, open, fromNet) {
  if (d.open === open) return;
  d.open = open;
  if (!fromNet) net?.send('mp:door', { id: d.id, open });
  const near = Math.hypot(d.x - player.pos.x, d.z - player.pos.z) < 15;
  if (!near) return;
  const outsideIt = roomAt(player.pos.x, player.pos.z)?.building !== d.building;
  if (d.kind === 'garage') { if (!sfx('garage', d)) { tone(140, 0.6, 'sawtooth', 0.04, 1.3); tone(150, 0.6, 'sawtooth', 0.04, 1.2, 0.6); tone(160, 0.5, 'sawtooth', 0.04, 0.9, 1.2); } }
  else if (open && d.exterior && !d.auto && outsideIt && ['home', 'dream', 'blue', 'yellow'].includes(d.building) && !fromNet) sfx('doorbell', d); // ding dong!
  else if (!d.auto) open ? tone(420, 0.08, 'triangle', 0.08, 1.5) : tone(260, 0.1, 'square', 0.05, 0.7);
}
const nearAny = (x, z, r) => {
  const r2 = r * r, close = (p) => (p.x - x) ** 2 + (p.z - z) ** 2 < r2;
  if (close(player.pos)) return true;
  for (const o of remotes.players.values()) if (close(o.pos)) return true;
  for (const f of folks.folks) if (close(f.root.position)) return true;
  return false;
};
function updateDoors(dt) {
  for (const d of world.doors) {
    if (d.auto) {
      const was = d.open;
      d.open = nearAny(d.x, d.z, 2.4);
      if (d.open && !was && Math.hypot(d.x - player.pos.x, d.z - player.pos.z) < 3) sfx('chime', d); // shop door chime
    }
    const target = d.open ? 1 : 0;
    if (d.t === target) continue;
    const sp = d.kind === 'garage' ? 0.45 : d.kind === 'slide' ? 1.8 : 2.4;
    d.t = target > d.t ? Math.min(1, d.t + dt * sp) : Math.max(0, d.t - dt * sp);
    d.apply(d.t);
  }
}
const doorOpen = (d) => d.t > (d.kind === 'garage' ? 0.85 : 0.45);

// ---------- driving ----------
// circles that cover a long thing like a car (x, z, heading can be "what if" values)
function bodyCircles(it, x = it.position.x, z = it.position.z, h = it.rotation.y) {
  const ud = it.userData, r = Math.min(ud.hx, ud.hz) * 0.95, long = Math.max(ud.hx, ud.hz);
  const alongZ = ud.hz >= ud.hx;
  const n = Math.max(1, Math.ceil((2 * (long - r)) / (1.1 * r)) + 1);
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : -(long - r) + (2 * (long - r) * i) / (n - 1);
    const lx = alongZ ? 0 : k, lz = alongZ ? k : 0;
    out.push({ x: x + lx * Math.cos(h) + lz * Math.sin(h), z: z - lx * Math.sin(h) + lz * Math.cos(h), r });
  }
  return out;
}
function circleHits(c, ignore) {
  for (const b of nearColliders(c.x, c.z)) {
    if (b.door && doorOpen(b.door)) continue;
    const nx = Math.max(b.minX, Math.min(c.x, b.maxX)), nz = Math.max(b.minZ, Math.min(c.z, b.maxZ));
    if ((c.x - nx) ** 2 + (c.z - nz) ** 2 < c.r * c.r) return true;
  }
  for (const o of world.circles) if ((c.x - o.x) ** 2 + (c.z - o.z) ** 2 < (c.r + o.r) ** 2) return true;
  if (world.forest.blocked(c.x, c.z, c.r)) return true;
  if (world.places.blocked(c.x, c.z, c.r)) return true;
  if (world.funpark.blocked(c.x, c.z, c.r)) return true;
  for (const o of traffic.circles()) if ((c.x - o.x) ** 2 + (c.z - o.z) ** 2 < (c.r + o.r) ** 2) return true;
  for (const it of items) {
    if (it === ignore || it.userData.action !== 'drive') continue;
    for (const o of bodyCircles(it)) if ((c.x - o.x) ** 2 + (c.z - o.z) ** 2 < (c.r + o.r) ** 2) return true;
  }
  const b = world.bounds;
  return c.x < b.minX || c.x > b.maxX || c.z < b.minZ || c.z > b.maxZ;
}
function seatOf(car) {
  const s = car.userData.seat, h = car.rotation.y;
  return { x: car.position.x + s.x * Math.cos(h) + s.z * Math.sin(h), z: car.position.z - s.x * Math.sin(h) + s.z * Math.cos(h), y: car.position.y - car.userData.baseY + s.eye - avatar.eyeHeight };
}
function enterCar(it) {
  driving = it;
  hovered = null;
  drive.v = 0; drive.steer = 0;
  player.yaw = it.rotation.y + Math.PI; player.pitch = -0.12;
  look.setOutline(null, false);
  tone(90, 0.5, 'sawtooth', 0.06, 1.8); // vroom
  toast(it.userData.type === 'schoolbus' ? 'All aboard! 🚌' : 'Vroom vroom! 🚗');
}
function exitCar() {
  const car = driving, ud = car.userData, h = car.rotation.y, s = ud.seat;
  const spots = [[ud.hx + 0.6, s.z], [-(ud.hx + 0.6), s.z], [0, ud.hz + 0.7], [0, -(ud.hz + 0.7)]];
  let spot = null;
  for (const [lx, lz] of spots) {
    const x = car.position.x + lx * Math.cos(h) + lz * Math.sin(h), z = car.position.z - lx * Math.sin(h) + lz * Math.cos(h);
    if (!blocked(x, z)) { spot = [x, z]; break; }
  }
  if (!spot) { toast("There's no room to get out here!"); return; }
  driving = null;
  drive.v = 0;
  player.pos.set(spot[0], 0, spot[1]);
  player.facing = h;
  beep(330, 0.1, 'triangle');
  save();
}
// riding along: you sit next to the driver (on the other side of the car)
function passengerSeat(car) {
  const s = car.userData.seat, h = car.rotation.y, x = -s.x, z = s.z;
  return { x: car.position.x + x * Math.cos(h) + z * Math.sin(h), z: car.position.z - x * Math.sin(h) + z * Math.cos(h), y: car.position.y - car.userData.baseY + s.eye - avatar.eyeHeight };
}
function rideAlong(car, friend) {
  riding = car;
  hovered = null;
  player.yaw = car.rotation.y + Math.PI;
  toast(`Riding with ${friend.character?.name || 'your friend'}! 🚗`);
  tone(500, 0.1, 'triangle', 0.08, 1.3);
}
function getOutOfRide() {
  const car = riding;
  riding = null;
  const ud = car.userData, h = car.rotation.y, s = ud.seat;
  for (const [lx, lz] of [[-(ud.hx + 0.6), s.z], [ud.hx + 0.6, s.z], [0, ud.hz + 0.7], [0, -(ud.hz + 0.7)]]) {
    const x = car.position.x + lx * Math.cos(h) + lz * Math.sin(h), z = car.position.z - lx * Math.sin(h) + lz * Math.cos(h);
    if (!blocked(x, z)) { player.pos.set(x, 0, z); break; }
  }
  player.pos.y = 0;
  beep(330, 0.1, 'triangle');
}
function updateRide() {
  if (!riding.parent || !remoteHeld.has(riding.userData.uid)) { getOutOfRide(); toast('The ride is over! 👋'); return; } // the driver got out
  const seat = passengerSeat(riding);
  player.pos.set(seat.x, seat.y, seat.z);
  player.facing = riding.rotation.y;
  player.speed = 0;
  if (performance.now() - drive.lastMouse > 1500) player.yaw += wrapAngle(riding.rotation.y + Math.PI - player.yaw) * 0.03;
}

// hidden test shortcut (F8): jump to the Fun Park gate
function teleportToFunPark() {
  if (parkRide) leaveParkRide(true);
  if (driving) exitCar();
  if (riding) getOutOfRide();
  inter.standUp();
  player.pos.set(80, 0, 102); player.yaw = Math.PI; player.pitch = -0.05; player.facing = 0;
  toast('🎢 Welcome to PepCity Fun Park!');
}

// ---------- riding the Fun Park rides ----------
let bumpAt = 0;
const rideQ = new THREE.Quaternion(), rideP = new THREE.Vector3(), rideUp = new THREE.Vector3(), rideFwd = new THREE.Vector3();
function startParkRide(ride) {
  if (held) { toast('Put down what you are holding first!'); return; }
  const session = ride.board(player.pos.clone(), () => ({
    f: THREE.MathUtils.clamp((keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - padIn.ly + padIn.rt - padIn.lt, -1, 1),
    s: THREE.MathUtils.clamp((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + padIn.lx, -1, 1),
  }));
  parkRide = { ride, session, q: new THREE.Quaternion(), time: 0, rumble: 0, wasFast: false };
  player.firstPerson = false;
  chime([660, 880, 1100]);
  toast(`All aboard the ${ride.name}! 🎉`);
}
function leaveParkRide(force) {
  if (!parkRide) return;
  if (!force && !parkRide.session.canLeave) { toast('Hold on tight until the ride stops! 🎢'); return; }
  const { session } = parkRide;
  session.end?.();
  parkRide = null;
  player.pos.copy(session.exit); player.pos.y = 0;
  beep(440, 0.1, 'triangle');
}
function updateParkRide(dt) {
  const pr = parkRide, s = pr.session;
  s.tick?.(dt);
  pr.time += dt;
  const a = s.anchor;
  a.updateWorldMatrix(true, false);
  a.getWorldPosition(rideP); a.getWorldQuaternion(rideQ);
  rideUp.set(0, 1, 0).applyQuaternion(rideQ);
  rideFwd.set(0, 0, 1).applyQuaternion(rideQ);
  const legH = avatar.parts.legL.position.y;
  player.pos.copy(rideP).addScaledVector(rideUp, -legH + 0.02);
  player.facing = Math.atan2(rideFwd.x, rideFwd.z);
  player.speed = 0;
  pr.q.copy(rideQ);
  if ((pr.ride.follow || s.follow) && performance.now() - drive.lastMouse > 1500) player.yaw += wrapAngle(player.facing + Math.PI - player.yaw) * Math.min(1, dt * 2);
  // coaster sounds: rumbling wheels, and a "wheee!" on the big drops
  const v = s.speed?.() ?? 0;
  if (pr.ride.coaster) {
    pr.rumble -= dt;
    if (pr.rumble <= 0 && v > 3) { pr.rumble = 0.35; noise(0.4, Math.min(0.08, v * 0.004), 300 + v * 30); }
    const fast = v > 14;
    if (fast && !pr.wasFast) { tone(500, 1.0, 'sine', 0.1, 2); toast('Wheeeee! 🎢', 1200); }
    pr.wasFast = fast;
  }
  if (s.drop?.() && !pr.dropped) { pr.dropped = true; tone(700, 1.2, 'sine', 0.1, 0.4); toast('AAAAAH! 😱', 1200); }
  if (s.done()) { leaveParkRide(true); toast('What a ride! 🎉'); }
}

function honkSound(type, pos) {
  if (type === 'icecreamtruck' && sfx('icecreamsong', pos)) return;
  if ((type === 'policecar' || type === 'ambulance') && sfx('siren2', pos, { maxDist: 45 })) return;
  if (type === 'firetruck' && sfx('siren', pos, { maxDist: 45 })) return;
  if (type !== 'icecreamtruck' && type !== 'policecar' && type !== 'firetruck' && sfx('honk', pos)) return;
  if (type === 'icecreamtruck') { melody(['E5', 'G5', 'E5', 'C5', 'D5', 'E5', 'D5', 'C5', 'G4'], 0.18, 'square', 0.05); return; }
  if (type === 'policecar') { for (let i = 0; i < 4; i++) tone(i % 2 ? 700 : 950, 0.3, 'square', 0.04, 1, i * 0.3); return; }
  if (type === 'firetruck') { for (let i = 0; i < 3; i++) { tone(650, 0.45, 'sawtooth', 0.05, 1.5, i * 0.9); tone(975, 0.45, 'sawtooth', 0.05, 0.67, i * 0.9 + 0.45); } return; }
  tone(420, 0.18, 'square', 0.06, 1.0); tone(420, 0.22, 'square', 0.06, 1.0, 0.25);
}
function honk() {
  const type = driving?.userData.type;
  const p = driving?.position ?? player.pos;
  honkSound(type, p);
  fx('honk', p, undefined, { t: type });
}
// arms up and knees tucked while in the air
function jumpPose(ch, holding) {
  if (!holding) ch.parts.armL.rotation.x = ch.parts.armR.rotation.x = -2.7;
  ch.parts.legL.rotation.x = -0.6; ch.parts.legR.rotation.x = 0.25;
}

function updateDriving(dt) {
  const car = driving, ud = car.userData;
  const f = THREE.MathUtils.clamp((keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + padIn.rt - padIn.lt - padIn.ly, -1, 1);
  const st = THREE.MathUtils.clamp((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + padIn.lx, -1, 1);
  const max = (keys.ShiftLeft || keys.ShiftRight ? 12 : 8) * (ud.type === 'schoolbus' ? 0.8 : 1);
  if (f > 0) drive.v += (drive.v < 0 ? 10 : 4) * dt;
  else if (f < 0) drive.v -= (drive.v > 0 ? 10 : 3) * dt;
  else { drive.v *= Math.exp(-dt * 1.5); if (Math.abs(drive.v) < 0.05) drive.v = 0; }
  drive.v = Math.max(-3.5, Math.min(max, drive.v));
  drive.steer += (st * 0.55 - drive.steer) * Math.min(1, dt * 6);
  const L = ud.hz * 1.3;
  const h = car.rotation.y - (drive.v / L) * Math.tan(drive.steer) * dt;
  const nx = car.position.x + Math.sin(h) * drive.v * dt, nz = car.position.z + Math.cos(h) * drive.v * dt;
  const wedged = bodyCircles(car).some((c) => circleHits(c, car)); // already bumped into something: let it drive free
  if (!wedged && bodyCircles(car, nx, nz, h).some((c) => circleHits(c, car))) {
    if (Math.abs(drive.v) > 2.5) { tone(110, 0.15, 'square', 0.07, 0.6); look.burst(new THREE.Vector3(nx + Math.sin(h) * ud.hz * Math.sign(drive.v), 0.6, nz + Math.cos(h) * ud.hz * Math.sign(drive.v)), 10); }
    drive.v = -drive.v * 0.2;
  } else {
    car.position.x = nx; car.position.z = nz;
    car.rotation.y = h; ud.rotY = h;
  }
  car.updateMatrixWorld(true);
  const seat = seatOf(car);
  player.pos.set(seat.x, seat.y, seat.z);
  player.facing = car.rotation.y;
  player.speed = 0;
  // the camera swings back behind the car when you're not using the mouse
  if (performance.now() - drive.lastMouse > 1500 && Math.abs(drive.v) > 0.5) {
    const want = car.rotation.y + (drive.v < 0 ? 0 : Math.PI);
    player.yaw += wrapAngle(want - player.yaw) * Math.min(1, dt * 2.5);
    player.pitch += (-0.18 - player.pitch) * Math.min(1, dt * 2);
  }
}

// ---------- townsfolk and traffic ----------
const folks = setupTownsfolk(scene, PEOPLE, SAYINGS, { sound: (name, pos) => { if (near(pos, 35)) sfx(name, pos); }, speak: (text, f) => speak(text, f) });

// ---------- talking out loud (the browser's built-in voices) ----------
let voices = [];
const loadVoices = () => { voices = (window.speechSynthesis?.getVoices() ?? []).filter((v) => /^en/i.test(v.lang)); };
loadVoices();
window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices);
const FEMALE = /female|zira|aria|jenny|samantha|susan|hazel|libby|sonia|michelle|ana\b|emma|ava|sara|natasha|clara|catherine|karen|moira|tessa|fiona|victoria|allison|joanna|salli|kimberly|ivy/i;
function speak(text, f) {
  const synth = window.speechSynthesis;
  if (!synth || audio.muted()) return;
  const words = text.replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, '').replace(/\s+/g, ' ').trim();
  if (!words) return;
  const d = Math.hypot(f.root.position.x - player.pos.x, f.root.position.z - player.pos.z);
  if (d > 25) return;
  const look = f.def.look ?? {}, kid = look.age === 'kid', girl = look.body === 'girl';
  // each person always gets the same voice and pitch (picked from their name)
  let h = 0; for (const ch of f.def.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const matching = voices.filter((v) => FEMALE.test(v.name) === girl);
  const pool = matching.length ? matching : voices;
  const u = new SpeechSynthesisUtterance(words);
  if (pool.length) u.voice = pool[h % pool.length];
  u.pitch = kid ? 1.5 + (h % 5) * 0.08 : girl ? 1.05 + (h % 4) * 0.08 : 0.75 + (h % 4) * 0.08;
  u.rate = kid ? 1.1 : 0.95 + (h % 3) * 0.05;
  u.volume = Math.max(0.15, 1 - d / 25);
  synth.cancel(); // one person at a time
  synth.speak(u);
}

// ---------- people who notice what you do (and how they feel about it) ----------
const rules = { asked: false, mad: false, seconds: 0, quietAt: 0, poolAt: 0, quizDone: false, quizWait: 0 };

// ---------- math time in the classroom ----------
const quiz = setupQuiz({
  $,
  teacher: (text, mood) => {
    const t = folks.byName('Ms. Lopez');
    if (t) folks.talk(t, character.name, player.pos, text, mood ?? null);
  },
  chime: () => chime([660, 880, 1100]),
  buzz: () => tone(200, 0.25, 'triangle', 0.08, 0.7),
  celebrate: () => {
    chime([523, 659, 784, 1047, 1319]);
    for (let i = 0; i < 6; i++) setTimeout(() => look.burst(player.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 1.4, (Math.random() - 0.5) * 2)), 24), i * 200);
  },
  onClose: () => closeQuiz(),
});
// ---------- the movie at PepCity Cinema (plays when you sit in a theater seat) ----------
const MOVIE = 'https://www.youtube.com/embed/2z3r2FucYEQ?autoplay=1&rel=0&modestbranding=1&playsinline=1';
function openMovie() {
  mode = 'movie';
  show('movie');
  if (document.pointerLockElement) document.exitPointerLock();
  window.speechSynthesis?.cancel();
  $('movieFrame').src = MOVIE;
}
function closeMovie() {
  $('movieFrame').src = 'about:blank'; // stops the video
  inter.standUp();
  play();
}
$('movieLeave').onclick = closeMovie;

// ---------- storybooks at the library ----------
const story = setupStory({
  $,
  name: () => character.name,
  read: (text) => {
    const synth = window.speechSynthesis;
    if (!synth || audio.muted()) return;
    const u = new SpeechSynthesisUtterance(text.replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, ''));
    const v = voices.find((x) => FEMALE.test(x.name)) ?? voices[0];
    if (v) u.voice = v;
    u.pitch = 1.1; u.rate = 0.92;
    synth.cancel(); synth.speak(u);
  },
  onClose: () => { window.speechSynthesis?.cancel(); play(); },
});
function openStory() {
  mode = 'story';
  show('story');
  if (document.pointerLockElement) document.exitPointerLock();
  story.open();
}
function openQuiz() {
  mode = 'quiz';
  show('quiz');
  if (document.pointerLockElement) document.exitPointerLock();
  quiz.start();
}
function closeQuiz() {
  window.speechSynthesis?.cancel();
  play();
}
function checkRules(dt) {
  const room = roomAt(player.pos.x, player.pos.z), now = performance.now();
  // In class, Ms. Lopez wants you to sit down in a chair
  const teacher = folks.byName('Ms. Lopez');
  if (teacher && room?.name === 'Classroom') {
    const seated = inter.mode() === 'sit';
    if (!seated) {
      rules.seconds += dt;
      if (!rules.asked && rules.seconds > 1.5) { rules.asked = true; folks.talk(teacher, character.name, player.pos, 'Please sit down in your chair, {name}! 🪑', null); }
      else if (rules.asked && !rules.mad && rules.seconds > 11) { rules.mad = true; folks.talk(teacher, character.name, player.pos, 'I said SIT DOWN in your chair, {name}! 😠', 'mad'); }
      else if (rules.mad && teacher.mood !== 'mad') { teacher.mood = 'mad'; teacher.moodUntil = now + 3000; } // still waiting...
    } else if (rules.asked) {
      folks.talk(teacher, character.name, player.pos, rules.mad ? 'Thank you for listening, {name}. ⭐' : 'Great job sitting down, {name}! ⭐', 'happy');
      rules.asked = rules.mad = false; rules.seconds = -999; // only once per visit
    }
  } else { rules.asked = rules.mad = false; rules.seconds = 0; }
  // Sit at a desk in the classroom and Ms. Lopez starts a math lesson
  if (room?.name === 'Classroom' && inter.mode() === 'sit' && inter.activeItem()?.userData.type === 'schooldesk') {
    if (!rules.quizDone && (rules.quizWait += dt) > 2.5) { rules.quizDone = true; openQuiz(); }
  } else if (inter.mode() !== 'sit') { rules.quizDone = false; rules.quizWait = 0; }
  // No jumping in the library!
  const librarian = folks.byName('Mrs. Page');
  if (librarian && room?.name === 'School Library' && player.air && now > rules.quietAt) {
    rules.quietAt = now + 8000;
    folks.talk(librarian, character.name, player.pos, 'Shhh! No jumping in the library, {name}! 😠', 'mad');
  }
  // No running by the pool!
  const lifeguard = folks.byName('Lifeguard Lucy');
  if (lifeguard && !room && player.speed > 1.5 && now > rules.poolAt && player.pos.x > 23 && player.pos.x < 43 && player.pos.z > -65 && player.pos.z < -49) {
    rules.poolAt = now + 8000;
    folks.talk(lifeguard, character.name, player.pos, 'Tweet! No running by the pool, {name}! 😠', 'mad');
    sfx('whistle', lifeguard.root.position);
  }
}
const traffic = setupTraffic(scene, TRAFFIC);
function trafficObstacles() {
  const out = [];
  const road = (o) => world.loop.dist(o.x, o.z) < 6;
  if (!driving && road(player.pos)) out.push({ x: player.pos.x, z: player.pos.z, r: 0.4, kind: 'player' });
  for (const r of remotes.players.values()) if (road(r.pos) && !r.hold) out.push({ x: r.pos.x, z: r.pos.z, r: 0.4, kind: 'player' });
  for (const f of folks.folks) if (road(f.root.position)) out.push({ x: f.root.position.x, z: f.root.position.z, r: 0.4, kind: 'player' });
  for (const it of items) {
    if (!road(it.position) || it.userData.onWall) continue;
    const moving = it === driving || remoteHeld.has(it.userData.uid) || it === held;
    if (it.userData.action === 'drive') for (const c of bodyCircles(it)) out.push({ ...c, kind: moving ? 'player' : 'static' });
    else out.push({ x: it.position.x, z: it.position.z, r: Math.max(it.userData.hx, it.userData.hz), kind: moving ? 'player' : 'static' });
  }
  return out;
}
// is there a big piece of furniture here? (pets walk around beds and couches, not over them)
const FLAT = new Set(['rug', 'bigrug', 'roundrug', 'doormat', 'hopscotch']);
let furniture = [], furnitureTimer = 0;
function onFurniture(x, z) {
  if (time - furnitureTimer > 1) { // refresh the list once a second
    furnitureTimer = time;
    furniture = [];
    for (const it of items) {
      const u = it.userData;
      if (u.onWall || u.roam || u.action === 'drive' || FLAT.has(u.type) || Math.max(u.hx, u.hz) < 0.25 || it.position.y - u.baseY > 0.2) continue;
      furniture.push([it.position.x, it.position.z, Math.max(u.hx, u.hz) * 0.85 + 0.1]);
    }
  }
  for (const [fx, fz, r] of furniture) if ((fx - x) ** 2 + (fz - z) ** 2 < r * r) return true;
  return false;
}
const animals = setupAnimals(scene, {
  items: () => items,
  held: () => held,
  carried: (it) => it === driving || remoteHeld.has(it.userData.uid),
  blocked: (x, z) => blocked(x, z) || onFurniture(x, z),
  roomAt: (x, z) => roomAt(x, z),
  people: () => [player.pos, ...[...remotes.players.values()].map((r) => r.pos)],
  sound: (name, pos) => { if (near(pos, 30)) sfx(name, pos); },
  flutter: (x, z) => { if (Math.hypot(x - player.pos.x, z - player.pos.z) < 12) for (let i = 0; i < 5; i++) noise(0.08, 0.05, 3000, i * 0.07); },
});
// farm animal sounds
function farmSound(kind, pos) {
  if (!near(pos, 28)) return;
  if (sfx(kind, pos, { maxDist: 28 })) return; // real moo, oink, baa, cluck
  if (kind === 'cow') tone(140, 0.9, 'sawtooth', 0.05, 0.8);
  if (kind === 'pig') for (let i = 0; i < 2; i++) tone(320, 0.12, 'square', 0.04, 0.7, i * 0.18);
  if (kind === 'sheep') { tone(420, 0.6, 'triangle', 0.06, 0.95); tone(430, 0.5, 'triangle', 0.03, 1.05, 0.05); }
  if (kind === 'chicken') for (let i = 0; i < 4; i++) tone(900 + i * 60, 0.06, 'square', 0.03, 1.3, i * 0.11);
  if (kind === 'horse') tone(700, 0.8, 'sawtooth', 0.04, 0.5);
}
// little made-up sounds for the woods animals
function woodsSound(name, pos) {
  if (!near(pos, 22)) return;
  if (name === 'owl') { tone(420, 0.28, 'sine', 0.08, 0.92); tone(400, 0.45, 'sine', 0.08, 0.9, 0.38); }
  if (name === 'frog') { tone(210, 0.07, 'square', 0.04, 1.5); tone(200, 0.09, 'square', 0.04, 1.4, 0.12); }
  if (name === 'squirrel') for (let i = 0; i < 5; i++) tone(2400 + Math.random() * 600, 0.04, 'square', 0.025, 1.2, i * 0.06);
}
let obstacleTimer = 0, obstacleCache = [];
function onHonk(x, z) { if (Math.hypot(x - player.pos.x, z - player.pos.z) < 40) honkSound('car', { x, z }); }

function rotate(dir, step = Math.PI / 4) {
  const it = held ?? hovered;
  if (!it || it.userData.fixed || (it.userData.onWall && !held) || holderOf(it)) return;
  it.userData.rotY = it.rotation.y + dir * step;
  if (!held) { it.rotation.y = it.userData.rotY; it.updateMatrixWorld(true); save(); }
  beep(700, 0.05);
}

function changeColor() {
  const it = held ?? hovered;
  if (it) {
    if (it.userData.fixed || holderOf(it)) return;
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
  if (!it || it.userData.fixed || holderOf(it)) return;
  removeItem(it);
  settleAll();
  beep(250, 0.15, 'sawtooth', 0.06);
  toast(`Put away the ${it.userData.name}`);
  save();
}

function spawnHeld(type, color) {
  const it = createItem(type, color);
  if (!it) return;
  if (held) removeItem(held);
  it.userData.rotY = player.yaw; // face the player
  addItem(it);
  held = it;
  save(); // so friends know about the new thing
}

// ---------- golden stars ----------
const found = new Set(store.get('stars-found') ?? []);
const TOTAL_STARS = world.stars.length;
const allStars = () => found.size >= TOTAL_STARS;
for (const s of world.stars) if (found.has(s.userData.id)) s.visible = false;
function updateStarHud() { $('stars').textContent = `⭐ ${found.size} / ${TOTAL_STARS}`; }
function checkStars() {
  for (const s of world.stars) {
    if (!s.visible) continue;
    const dx = s.position.x - player.pos.x, dz = s.position.z - player.pos.z;
    if (dx * dx + dz * dz > 1.2 * 1.2 || s.position.y > player.pos.y + avatar.height + 1.4) continue;
    s.visible = false;
    found.add(s.userData.id);
    store.set('stars-found', [...found]);
    look.burst(s.position.clone(), 28);
    fx('burst', s.position, 28);
    chime();
    updateStarHud();
    if (allStars()) {
      setTimeout(() => {
        chime([523, 659, 784, 1047, 1319]);
        for (let i = 0; i < 6; i++) setTimeout(() => look.burst(player.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, avatar.height + 0.4, (Math.random() - 0.5) * 2)), 24), i * 200);
        toast('You found ALL the stars! 👑 The Golden Crown is unlocked!', 5000);
      }, 400);
    } else {
      toast(`You found a golden star! ⭐ ${found.size} of ${TOTAL_STARS}`);
    }
  }
}

// ---------- moving + camera ----------
const keys = {};
// walls and things you bump into, sorted into a grid so only nearby ones are checked
const COL_CELL = 6, colGrid = new Map();
for (const c of world.colliders) {
  for (let i = Math.floor(c.minX / COL_CELL); i <= Math.floor(c.maxX / COL_CELL); i++) {
    for (let j = Math.floor(c.minZ / COL_CELL); j <= Math.floor(c.maxZ / COL_CELL); j++) {
      const k = i * 100000 + j;
      if (!colGrid.has(k)) colGrid.set(k, []);
      colGrid.get(k).push(c);
    }
  }
}
const nearColliders = (x, z) => colGrid.get(Math.floor(x / COL_CELL) * 100000 + Math.floor(z / COL_CELL)) ?? [];
function blocked(x, z) {
  const R = avatar.root.userData.radius;
  for (const c of nearColliders(x, z)) {
    if (c.door && doorOpen(c.door)) continue;
    if (x + R > c.minX && x - R < c.maxX && z + R > c.minZ && z - R < c.maxZ) return c;
  }
  for (const c of world.circles) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + R) ** 2) return true;
  if (world.forest.blocked(x, z, R)) return true;
  if (world.places.blocked(x, z, R)) return true;
  if (world.funpark.blocked(x, z, R)) return true;
  for (const c of traffic.circles()) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + R) ** 2) return true;
  const b = world.bounds;
  return x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ;
}

// walking into a closed door opens it (but not the garage door: click that one)
function bumpDoor(c) { if (c?.door && !c.door.open && c.door.kind !== 'garage' && !c.door.auto) setDoor(c.door, true); }
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3();
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function updateMovement(dt) {
  const f = THREE.MathUtils.clamp((keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - padIn.ly, -1, 1);
  const s = THREE.MathUtils.clamp((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + padIn.lx, -1, 1);
  const stick = Math.min(1, Math.hypot(padIn.lx, padIn.ly));
  const running = keys.ShiftLeft || keys.ShiftRight || stick > 0.95; // push the stick all the way to run
  let target = 0;
  if (f || s) {
    fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    right.set(-fwd.z, 0, fwd.x);
    move.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, s).normalize();
    const analog = stick > 0 && !(keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD) ? Math.max(0.35, stick) : 1; // tip the stick to tiptoe
    const step = (running ? RUN : WALK) * analog * (character.age === 'kid' ? 0.95 : 1.05) * (player.swimming ? 0.6 : 1) * dt;
    const p = player.pos;
    const ox = p.x, oz = p.z;
    // if something ended up on top of you (like a car), you can always walk out of it
    const stuck = !!blocked(p.x, p.z);
    const bx = !stuck && blocked(p.x + move.x * step, p.z);
    if (!bx) p.x += move.x * step; else bumpDoor(bx);
    const bz = !stuck && blocked(p.x, p.z + move.z * step);
    if (!bz) p.z += move.z * step; else bumpDoor(bz);
    const moved = Math.hypot(p.x - ox, p.z - oz);
    if (moved > 0.0005) {
      player.moved = true;
      target = running ? 2 : 1;
      const want = Math.atan2(move.x, move.z);
      player.facing += wrapAngle(want - player.facing) * Math.min(1, dt * 12);
    }
  } else if (held && !player.firstPerson) {
    const want = Math.atan2(held.position.x - player.pos.x, held.position.z - player.pos.z);
    player.facing += wrapAngle(want - player.facing) * Math.min(1, dt * 6);
  }
  player.speed += (target - player.speed) * Math.min(1, dt * 10);
  // in the pool you sink in up to your chest
  const inPool = world.pools.some((p) => player.pos.x > p.x0 && player.pos.x < p.x1 && player.pos.z > p.z0 && player.pos.z < p.z1);
  const lakeDepth = world.places.waterDepth(player.pos.x, player.pos.z);
  const inWater = inPool || lakeDepth > 0.05;
  if (inWater !== player.swimming) {
    player.swimming = inWater;
    if (!sfx('splash', player.pos, { vol: 0.6 })) noise(0.5, 0.1, 2000, 0, 400); // splash!
    if (inWater) look.burst(new THREE.Vector3(player.pos.x, 0.1, player.pos.z), 14);
  }
  const ground = inPool ? -avatar.height * 0.55 : -avatar.height * 0.6 * lakeDepth; // deeper the farther out you wade
  // jumping: up, then gravity brings you back down
  if (player.air) {
    player.vy -= 22 * dt;
    player.pos.y += player.vy * dt;
    if (player.pos.y <= ground) { player.pos.y = ground; player.vy = 0; player.air = false; tone(160, 0.06, 'sine', 0.06, 0.8); }
  } else player.pos.y += (ground - player.pos.y) * Math.min(1, dt * 5);
}

const camRay = new THREE.Raycaster();
const camBlockers = [...world.walls, ...world.solids, ...world.glass];
function roomAt(x, z) { return world.rooms.find((r) => x > r.x && x < r.x + r.w && z > r.z && z < r.z + r.d); }
function updateCamera() {
  camera.rotation.set(player.pitch, player.yaw, 0);
  const eye = avatar.eyeHeight;
  if (player.firstPerson) {
    camera.position.set(player.pos.x, eye + player.pos.y, player.pos.z);
    camDist = 0;
    avatar.root.visible = false;
    return;
  }
  const dir = new THREE.Vector3(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch));
  const vehicle = driving ?? riding;
  const head = vehicle
    ? new THREE.Vector3(vehicle.position.x, vehicle.position.y + vehicle.userData.seat.eye + 0.4, vehicle.position.z)
    : inter.mode() === 'lie' // lying down: look at where your head really is
      ? new THREE.Vector3(player.pos.x, player.pos.y + 0.5, player.pos.z)
      : new THREE.Vector3(player.pos.x, player.pos.y + eye + 0.12, player.pos.z);
  // Over-the-shoulder: the camera sits a little up and to the right, so the aiming dot isn't on your head
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const indoors = !!roomAt(player.pos.x, player.pos.z);
  const onRide = !!parkRide;
  const full = vehicle ? vehicle.userData.hz * 2 + 3 : onRide ? 6 : (character.age === 'kid' ? 2.4 : 2.9) * (indoors ? 0.8 : 1);
  const want = head.clone().addScaledVector(dir, -full).addScaledVector(right, vehicle || onRide ? 0 : 0.5).add(new THREE.Vector3(0, vehicle ? 0.5 : onRide ? 2.2 : 0.25, 0));
  const toCam = want.clone().sub(head);
  const wantLen = toCam.length();
  toCam.normalize();
  // three rays (middle, a bit left, a bit right) so the camera can't slip past a corner or out a window
  refreshNearby();
  const blockers = [...camBlockers, ...nearby.big.filter((i) => i !== held && i !== driving && i !== riding)];
  const side = new THREE.Vector3(-toCam.z, 0, toCam.x).normalize().multiplyScalar(0.22);
  let len = wantLen;
  for (const k of [0, 1, -1]) {
    camRay.set(head.clone().addScaledVector(side, k * 0.5), toCam.clone().addScaledVector(side, k / Math.max(1, wantLen)).normalize());
    camRay.far = wantLen + 0.3;
    const hit = camRay.intersectObjects(blockers, true)[0];
    if (hit) len = Math.min(len, Math.max(0.2, hit.distance - 0.35));
  }
  const pos = head.clone().addScaledVector(toCam, len);
  const dist = (len / wantLen) * full;
  const room = roomAt(player.pos.x, player.pos.z);
  if (room) pos.y = Math.min(pos.y, room.H - 0.15);
  pos.y = Math.max(pos.y, 0.25);
  camera.position.copy(pos);
  camDist = dist;
  avatar.root.visible = vehicle ? true : dist > 0.55;
}

// ---------- looking at things ----------
// things close enough to look at or bump the camera into (refreshed a few times a second)
const nearby = { items: [], folks: [], big: [], rides: [], t: -1 };
function refreshNearby() {
  if (time - nearby.t < 0.25) return;
  nearby.t = time;
  const p = player.pos, r = REACH + camDist + 4;
  nearby.items = items.filter((i) => Math.abs(i.position.x - p.x) < r && Math.abs(i.position.z - p.z) < r);
  nearby.big = nearby.items.filter((i) => i.userData.baseY + i.userData.hx > 0.6);
  nearby.folks = folks.meshes.filter((m) => Math.abs(m.position.x - p.x) < r && Math.abs(m.position.z - p.z) < r);
  nearby.rides = p.z > 80 ? world.funpark.clickables : [];
}
function updateInteraction() {
  refreshNearby();
  hoverDoor = hoverFolk = hoverFan = hoverRide = null;
  if (parkRide) {
    hovered = null;
    look.setOutline(null, false);
    $('crosshair').classList.remove('active');
    setHint(parkRide.session.canLeave ? `Riding the <b>${parkRide.ride.name}</b>! 🎉 · <kbd>E</kbd> get off` : `Hold on tight! 🎢`);
    return;
  }
  if (inter.busy()) {
    hovered = null;
    look.setOutline(null, false);
    $('crosshair').classList.remove('active');
    const kind = inter.activeKind();
    setHint(kind === 'ride' ? 'Wheee! 🎉' : kind === 'perch' ? 'Look around! · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>Right-click</kbd> to climb down' : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>Right-click</kbd> to get up');
    return;
  }
  if (riding) {
    hovered = null;
    look.setOutline(null, false);
    $('crosshair').classList.remove('active');
    setHint('Riding along! 🚗 · <kbd>E</kbd> get out');
    return;
  }
  if (driving) {
    hovered = null;
    look.setOutline(null, false);
    $('crosshair').classList.remove('active');
    setHint(`Driving the <b>${driving.userData.name}</b> — <kbd>W</kbd> go · <kbd>S</kbd> brake / back up · <kbd>A</kbd><kbd>D</kbd> steer · <kbd>Right-click</kbd> honk · <kbd>E</kbd> get out`);
    return;
  }
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
  centerRay.far = REACH + camDist;
  const hit = centerRay.intersectObjects([...statics, ...nearby.items, ...world.doorParts, ...world.fanParts, ...nearby.folks, ...nearby.rides], true).find((h) => h.face);
  hovered = hit ? findItem(hit.object) : null;
  if (hit?.object.userData.door) {
    hoverDoor = hit.object.userData.door;
    look.setOutline(null, false);
    $('crosshair').classList.toggle('active', !hoverDoor.auto);
    setHint(hoverDoor.auto ? 'This door opens all by itself! ✨' : `<b>${hoverDoor.name}</b> — <kbd>Right-click</kbd> ${hoverDoor.open ? 'close' : 'open'}`);
    return;
  }
  hoverRide = hit?.object.userData.ride ?? null;
  if (hoverRide) {
    look.setOutline(null, false);
    $('crosshair').classList.add('active');
    setHint(`<b>${hoverRide.name}</b> — <kbd>Right-click</kbd> ${hoverRide.label}`);
    return;
  }
  hoverFan = hit?.object.userData.fan ?? null;
  if (hoverFan) {
    look.setOutline(null, false);
    $('crosshair').classList.add('active');
    setHint(`<b>Ceiling Fan</b> — <kbd>Right-click</kbd> turn ${hoverFan.userData.off ? 'on' : 'off'}`);
    return;
  }
  hoverFolk = hit ? folks.find(hit.object) : null;
  if (hoverFolk) {
    look.setOutline(null, false);
    $('crosshair').classList.add('active');
    setHint(`<b>${hoverFolk.def.name}</b> — <kbd>Right-click</kbd> say hi! 👋`);
    return;
  }
  hoverSurface = null;
  look.setOutline(hovered, false);
  $('crosshair').classList.toggle('active', !!hovered);
  const friend = holderOf(hovered);
  if (friend) { setHint(`${friend.character?.name || 'Your friend'} is ${hovered.userData.action === 'drive' ? 'driving' : 'holding'} the <b>${hovered.userData.name}</b>`); return; }
  if (hovered) {
    const n = `<b>${hovered.userData.name}</b>`;
    const a = hovered.userData.action, fixed = hovered.userData.fixed;
    const right = `<kbd>Right-click</kbd> ${inter.label(hovered)}`;
    if (a === 'icecream' || a === 'toy' || a === 'toggle' || a === 'drive') setHint(`${n} — ${right}${a === 'drive' ? ' · <kbd>C</kbd> color · <kbd>X</kbd> put away' : ''}`);
    else if (fixed) setHint(`${n} — ${right}`);
    else setHint(`${n} — ${right} · <kbd>Click</kbd> pick up · <kbd>C</kbd> color · <kbd>X</kbd> put away`);
    return;
  }
  const ud = hit?.object.userData;
  if (ud?.isWall) hoverSurface = { kind: 'wall', room: ud.room };
  else if (ud?.isFloor) hoverSurface = { kind: 'floor', room: ud.room };
  if (hoverSurface) setHint(`<kbd>Right-click</kbd> lights ${hoverSurface.room.lightsOff ? 'on' : 'off'} · <kbd>C</kbd> paint the ${hoverSurface.kind === 'wall' ? 'walls' : 'floor'} of the ${hoverSurface.room.name}`);
  else setHint('<kbd>B</kbd> get new things · <kbd>V</kbd> change view · <kbd>Esc</kbd> menu');
}

// ---------- UI ----------
let lastHint = '';
function setHint(html) {
  if (usingPad) for (const [k, v] of PAD_HINTS) html = html.split(k).join(v); if (html !== lastHint) { $('hint').innerHTML = html; lastHint = html; } }
let toastTimer;
function toast(msg, ms = 2000) {
  $('toast').textContent = msg;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), ms);
}

let mode = 'start';
let usingPad = false; // true while playing with a game controller
function show(id) {
  for (const el of ['start', 'pause', 'catalog', 'creator', 'quiz', 'story', 'movie']) $(el).classList.toggle('hidden', el !== id);
  $('hud').classList.toggle('hidden', id !== null);
}

function enterPlay() { mode = 'play'; show(null); }
function play() {
  if (usingPad) { enterPlay(); return; } // controllers don't need the mouse captured
  try {
    const r = document.body.requestPointerLock();
    if (r?.catch) r.catch(() => {});
  } catch { /* the browser says not yet */ }
}
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) { mode = 'play'; show(null); return; }
  for (const k in keys) keys[k] = false;
  if (mode === 'catalog' || mode === 'creator' || mode === 'quiz' || mode === 'story' || mode === 'movie') return;
  mode = 'pause';
  show('pause');
});
document.addEventListener('mousemove', (e) => {
  if (mode !== 'play' || !document.pointerLockElement) return;
  player.yaw -= e.movementX * 0.0023;
  if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) drive.lastMouse = performance.now();
  player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0023, -1.25, 1.1);
});

// character creator
const creator = setupCreator({
  isUnlocked: (v) => v !== 'crown' || allStars(),
  onDone: (c) => { setCharacter(c); if (!player.moved) spawnInBed(); toast(`Hi ${c.name}! 👋`); play(); },
});
function openCreator() {
  mode = 'creator';
  show('creator');
  if (document.pointerLockElement) document.exitPointerLock();
  creator.open(character);
}
addEventListener('resize', () => creator.resize());

$('title').textContent = GAME_NAME;
document.title = GAME_NAME;
$('who').textContent = character.name;
$('startBtn').onclick = () => (hasCharacter ? play() : openCreator());
$('startBtn').textContent = hasCharacter ? "Let's Play!" : 'Make My Character!';
$('startCreator').classList.toggle('hidden', !hasCharacter);
$('startCreator').onclick = openCreator;
$('resumeBtn').onclick = play;
$('charBtn').onclick = openCreator;
$('resetBtn').onclick = () => {
  if (confirm('Put EVERYTHING in the whole neighborhood back the way it started?')) { loadDefaults(); save(); toast('All back to the start!'); play(); }
};
const qLabel = () => { $('qualityBtn').textContent = { pretty: '✨ Graphics: Pretty', fast: '⚡ Graphics: Fast', low: '🐢 Graphics: Low (smoothest)' }[look.quality]; };
qLabel();
$('qualityBtn').onclick = () => {
  const order = ['pretty', 'fast', 'low'];
  look.setQuality(order[(order.indexOf(look.quality) + 1) % 3]);
  try { localStorage.setItem('qualityPicked', '1'); } catch { /* no storage */ } // you chose it, so don't change it by itself
  qLabel();
};
const sLabel = () => { $('soundBtn').textContent = audio.muted() ? '🔇 Sound: Off' : '🔊 Sound: On'; };
try { if (localStorage.getItem('muted') === '1') audio.setMuted(true); } catch { /* no storage */ }
sLabel();
$('soundBtn').onclick = () => { audio.setMuted(!audio.muted()); try { localStorage.setItem('muted', audio.muted() ? '1' : '0'); } catch { /* no storage */ } sLabel(); };
$('starsBtn').onclick = () => {
  if (!confirm('Hide all the golden stars again so you can find them all over?')) return;
  found.clear();
  store.set('stars-found', []);
  for (const s of world.stars) s.visible = true;
  updateStarHud();
  toast('The stars are hidden again! ⭐ Go find them!', 3000);
  play();
};
$('emptyBtn').onclick = () => {
  const room = roomAt(player.pos.x, player.pos.z);
  if (!room) { toast('Go inside a building first!'); return; }
  const name = world.buildings.find((b) => b.id === room.building)?.title ?? 'this building';
  if (!confirm(`Take everything out of ${name}?`)) return;
  const inside = world.rooms.filter((r) => r.building === room.building);
  for (const it of [...items]) {
    if (it.userData.fixed) continue;
    if (inside.some((r) => it.position.x > r.x && it.position.x < r.x + r.w && it.position.z > r.z && it.position.z < r.z + r.d)) removeItem(it);
  }
  save(); toast(`${name} is empty!`); play();
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
    b.onclick = () => { spawnHeld(d.id); beep(600); play(); };
    $('grid').appendChild(b);
  }
}
function openCatalog() {
  mode = 'catalog';
  renderCatalog();
  show('catalog');
  document.exitPointerLock();
}
$('closeCatalog').onclick = play;

// ---------- input ----------
document.addEventListener('keydown', (e) => {
  if (mode === 'catalog' && (e.code === 'KeyB' || e.code === 'Escape')) { play(); return; }
  if (mode === 'movie' && e.code === 'Escape') { closeMovie(); return; }
  if (mode !== 'play') return;
  if (e.code === 'F8') { teleportToFunPark(); e.preventDefault(); return; } // hidden: for testing
  keys[e.code] = true;
  if (riding) { if (e.code === 'KeyE' || e.code === 'Space') { getOutOfRide(); e.preventDefault(); } return; }
  if (parkRide) { if (e.code === 'KeyE' || e.code === 'Space') { leaveParkRide(); e.preventDefault(); } if (parkRide?.ride.name !== 'Bumper Cars') return; }
  if (driving) {
    if (e.code === 'KeyE') exitCar();
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyH') honk();
    if (e.code === 'KeyC') { recolor(driving, nextIn(KID_COLORS, driving.userData.color)); beep(880, 0.07); save(); }
    if (e.code === 'KeyV') { player.firstPerson = !player.firstPerson; }
    return;
  }
  switch (e.code) {
    case 'KeyH': honk(); break;
    case 'KeyF': interact(); break;
    case 'KeyE': primaryAction(); break;
    case 'Space': jump(); e.preventDefault(); break;
    case 'KeyR': rotate(1); break;
    case 'KeyQ': rotate(-1); break;
    case 'KeyC': changeColor(); break;
    case 'KeyP': paint(); break;
    case 'KeyX': case 'Delete': case 'Backspace': trash(); break;
    case 'KeyB': case 'Tab': openCatalog(); e.preventDefault(); break;
    case 'KeyV': player.firstPerson = !player.firstPerson; toast(player.firstPerson ? '👀 Seeing through your eyes' : `🧍 Seeing ${character.name}`); break;
  }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
document.addEventListener('mousedown', (e) => {
  if (mode === 'play' && !document.pointerLockElement) { usingPad = false; play(); return; } // back to the mouse after a controller
  if (mode !== 'play' || !document.pointerLockElement) return;
  if (e.button === 0) primaryAction();
  if (e.button === 2) interact();
});
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('wheel', (e) => {
  if (mode === 'play' && held) rotate(Math.sign(e.deltaY), Math.PI / 12);
}, { passive: true });

// ---------- where am I? ----------
const ROOM_ICONS = [['hospital', '🏥'], ['exam', '🩺'], ['patient', '🛏️'], ['x-ray', '🦴'], ['kenwood library', '📚'], ['cinema', '🍿'], ['movie', '🎬'], ['barn', '🐄'],
  ['garage', '🚗'], ['classroom', '✏️'], ['art', '🎨'], ['library', '📚'], ['office', '📎'], ['school', '🏫'],
  ['ice cream', '🍦'], ['toy', '🧸'], ['dream', '✨'], ['bath', '🛁'], ['kitchen', '🍳'], ['dining', '🍽️'],
  ['living', '🛋️'], ['hall', '🚪'], ['room', '🛏️']];
const roomIcon = (name) => (ROOM_ICONS.find(([k]) => name.toLowerCase().includes(k)) ?? [0, '🏠'])[1];
let currentPlace = null;
function updatePlace() {
  const p = player.pos;
  const room = roomAt(p.x, p.z);
  const zone = !room && world.zones.find((z) => p.x > z.x && p.x < z.x + z.w && p.z > z.z && p.z < z.z + z.d);
  const name = room ? room.name : zone ? zone.name : 'Outside';
  if (name === currentPlace) return;
  currentPlace = name;
  const icon = room ? roomIcon(name) : zone ? zone.icon : '🌳';
  $('room').textContent = `${icon} ${name}`;
  $('banner').textContent = `${icon} ${name}`;
  $('banner').classList.remove('show');
  void $('banner').offsetWidth; // restart the animation
  $('banner').classList.add('show');
}

// If the computer is struggling, switch to Fast graphics automatically (once).
// If the computer is struggling, step the graphics down a level (Pretty -> Fast -> Low), checking every few seconds.
const perf = { frames: 0, start: 0, settle: 0 };
function watchSpeed() {
  if (mode !== 'play' || look.quality === 'low') return;
  try { if (localStorage.getItem('qualityPicked') === '1') return; } catch { /* no storage */ }
  const now = performance.now();
  if (!perf.start) { perf.start = now; perf.frames = 0; return; }
  perf.frames++;
  const secs = (now - perf.start) / 1000;
  if (secs < 3) return;
  const fps = perf.frames / secs;
  perf.start = now; perf.frames = 0;
  if (now < perf.settle) return; // give the last change a moment to kick in
  if (fps < 30) {
    look.setQuality(look.quality === 'pretty' ? 'fast' : 'low');
    perf.settle = now + 4000;
    qLabel();
    toast(look.quality === 'low' ? 'Switched to Low graphics so it runs smoothly 🐢' : 'Switched to Fast graphics ⚡');
  }
}

// ---------- go! ----------
scene.updateMatrixWorld(true);
if (!loadSave()) loadDefaults();
clearRoad();
// get everything ready to draw now, so the game doesn't hitch the first time you see something new
try { renderer.compile(scene, camera); } catch { /* not important */ }
spawnInBed();
settleAll();
updateStarHud();
startNet();
if (params.has('shot')) window.__test = { fun: world.funpark, startParkRide, rules, look, animals, audio, inter, interact, items, byId, setSwitch, player, hover: (it) => { hovered = it; }, play: () => { mode = 'play'; }, enterCar: (type) => enterCar(items.find((i) => i.userData.type === type)), keys, doors: world.doors, setDoor, folks, traffic, spawnHeld, putDown, paint: (name) => { hoverSurface = { kind: 'wall', room: world.rooms.find((r) => r.name === name) }; paint(); }, player };

if (params.has('shot')) show(null);
else if (params.has('creator')) openCreator();
else show('start');

// ---------- game controller ----------
const pad = setupGamepad();
let padFocus = null, navWait = 0;
for (const ev of ['keydown', 'mousedown']) addEventListener(ev, () => { usingPad = false; });
addEventListener('gamepadconnected', () => toast('🎮 Controller connected!', 2500));
function updatePad(dt) {
  const g = pad.poll();
  padIn.lx = padIn.ly = padIn.lt = padIn.rt = 0;
  if (!g) return;
  if (g.active && !usingPad) { usingPad = true; audio.start(); lastHint = ''; }
  if (!usingPad) return;
  if (mode === 'play') {
    padIn.lx = g.lx; padIn.ly = g.ly; padIn.lt = g.lt; padIn.rt = g.rt;
    // right stick looks around
    if (g.rx || g.ry) {
      player.yaw -= g.rx * 2.6 * dt;
      player.pitch = THREE.MathUtils.clamp(player.pitch - g.ry * 1.8 * dt, -1.25, 1.1);
      drive.lastMouse = performance.now();
    }
    if (parkRide) { if (g.pressed(BTN.B)) leaveParkRide(); }
    else if (riding) { if (g.pressed(BTN.B) || g.pressed(BTN.A)) getOutOfRide(); }
    else if (driving) {
      if (g.pressed(BTN.A)) honk();
      if (g.pressed(BTN.B)) exitCar();
      if (g.pressed(BTN.Y)) { recolor(driving, nextIn(KID_COLORS, driving.userData.color)); beep(880, 0.07); save(); }
    } else {
      if (g.pressed(BTN.A)) jump();
      if (g.pressed(BTN.B)) interact();
      if (g.pressed(BTN.X)) primaryAction();
      if (g.pressed(BTN.Y)) changeColor();
      if (g.pressed(BTN.LB)) rotate(-1);
      if (g.pressed(BTN.RB)) rotate(1);
      if (g.pressed(BTN.DOWN)) trash();
      if (g.pressed(BTN.BACK)) openCatalog();
    }
    if (g.pressed(BTN.UP) || g.pressed(BTN.R3)) player.firstPerson = !player.firstPerson;
    if (g.pressed(BTN.START)) { if (document.pointerLockElement) document.exitPointerLock(); else { mode = 'pause'; show('pause'); } }
    return;
  }
  // ---- menus: move between buttons with the D-pad or stick, Ⓐ to press, Ⓑ to go back ----
  const root = $(mode);
  if (!root) return;
  const els = [...root.querySelectorAll('button, .thing')].filter((e) => e.offsetParent && !e.disabled);
  if (!els.length) return;
  const focus = (el) => { padFocus?.classList.remove('padfocus'); padFocus = el; el.classList.add('padfocus'); el.scrollIntoView({ block: 'nearest' }); };
  if (!padFocus || !els.includes(padFocus)) focus(els[0]);
  navWait -= dt;
  let dir = g.pressed(BTN.UP) ? [0, -1] : g.pressed(BTN.DOWN) ? [0, 1] : g.pressed(BTN.LEFT) ? [-1, 0] : g.pressed(BTN.RIGHT) ? [1, 0] : null;
  if (!dir && navWait <= 0 && Math.hypot(g.lx, g.ly) > 0.6) dir = Math.abs(g.lx) > Math.abs(g.ly) ? [Math.sign(g.lx), 0] : [0, Math.sign(g.ly)];
  if (dir) {
    navWait = 0.25;
    const a = padFocus.getBoundingClientRect(), ax = a.x + a.width / 2, ay = a.y + a.height / 2;
    let best = null, bd = Infinity;
    for (const el of els) {
      if (el === padFocus) continue;
      const r = el.getBoundingClientRect(), dx = r.x + r.width / 2 - ax, dy = r.y + r.height / 2 - ay;
      const along = dx * dir[0] + dy * dir[1];
      if (along <= 4) continue;
      const score = along + Math.abs(dx * dir[1] - dy * dir[0]) * 2;
      if (score < bd) { bd = score; best = el; }
    }
    if (best) focus(best);
  }
  if (g.pressed(BTN.A)) padFocus.click();
  if (g.pressed(BTN.B) || g.pressed(BTN.START)) {
    if (mode === 'pause' || mode === 'catalog') play();
    else if (mode === 'movie') closeMovie();
    else if (mode === 'start') $('startBtn').click();
  }
}

// Hide things that are too far away to matter (how far depends on the graphics level)
let cullTimer = 0;
function cullFar() {
  const c = camera.position, d2 = viewDist * viewDist, near2 = (viewDist * 0.6) ** 2;
  for (const it of items) {
    if (it === held || it === driving) { it.visible = true; continue; }
    const d = (it.position.x - c.x) ** 2 + (it.position.z - c.z) ** 2;
    const big = it.userData.hx > 1 || it.userData.action === 'drive';
    it.visible = d < (big ? d2 : near2); // little things disappear a bit sooner
  }
  for (const car of traffic.cars) car.mesh.visible = (car.x - c.x) ** 2 + (car.z - c.z) ** 2 < d2;
  world.forest.cull(c, viewDist);
}

const clock = new THREE.Clock();
let time = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;
  updatePad(dt);
  for (const f of world.fans) { const u = f.userData; u.speed += ((u.off ? 0 : 3) - u.speed) * Math.min(1, dt * 1.2); f.rotation.y += dt * u.speed; }
  for (const it of animItems) if (it.visible) it.userData.anim(it, time);
  world.update(dt, time);
  world.funpark.update(dt, time, camera.position, () => { if (time - bumpAt > 0.3) { bumpAt = time; tone(120, 0.12, 'square', 0.08, 0.6); noise(0.1, 0.08, 1500); } });
  if (mode === 'play') {
    if (parkRide) updateParkRide(dt);
    else if (inter.busy()) inter.updatePlayer(dt, time);
    else if (riding) updateRide();
    else if (driving) updateDriving(dt); else updateMovement(dt);
    checkRules(dt);
    checkStars();
    watchSpeed(dt);
  }
  avatar.root.position.copy(player.pos);
  avatar.root.rotation.y = player.facing;
  animateCharacter(avatar, time, player.speed, !!held || !!driving);
  if (riding) avatar.parts.legL.rotation.x = avatar.parts.legR.rotation.x = -Math.PI / 2;
  if (parkRide) { // sit in the seat, tipping and turning with the ride (even upside down!)
    avatar.root.quaternion.copy(parkRide.q);
    avatar.parts.legL.rotation.x = avatar.parts.legR.rotation.x = -Math.PI / 2;
    if (parkRide.ride.coaster && parkRide.session.speed?.() > 12) avatar.parts.armL.rotation.x = avatar.parts.armR.rotation.x = -2.9; // hands up!
  }
  inter.poseAvatar(avatar);
  if (player.air) jumpPose(avatar, !!held);
  else if (player.swimming && !held && !inter.busy()) { // paddle paddle
    avatar.parts.armL.rotation.x = -1.6 + Math.sin(time * 5) * 0.8;
    avatar.parts.armR.rotation.x = -1.6 - Math.sin(time * 5) * 0.8;
  }
  inter.update(dt, time);
  remotes.update(dt, time);
  glideRemoteThings(dt);
  folks.update(dt, time, [player.pos, ...[...remotes.players.values()].map((r) => r.pos)], camera.position, Math.min(65, viewDist * 0.7));
  if ((cullTimer -= dt) <= 0) { cullTimer = 0.3; cullFar(); }
  if ((obstacleTimer -= dt) <= 0) { obstacleTimer = 0.15; obstacleCache = trafficObstacles(); }
  traffic.update(dt, obstacleCache, onHonk);
  animals.update(dt, time);
  world.places.update(dt, time, camera.position, [player.pos], farmSound);
  world.forest.update(dt, time, [player.pos, ...[...remotes.players.values()].map((r) => r.pos)], camera.position, woodsSound);
  updateDoors(dt);
  sendPose(dt);
  updateCamera();
  if (mode === 'play') {
    updateInteraction();
    updatePlace();
  }
  updateRoomLights(dt);
  updateSounds(dt);
  look.update(dt, player.pos);
  look.render();
});
