// Your very own pet from the Pet Shop: it has a name you pick, follows you around,
// and needs looking after (food, fun and baths). You can walk it on a leash and play fetch.
import * as THREE from 'three';
import { createItem } from './items.js';
import { bubble } from './townsfolk.js';

const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const KINDS = { dog: { emoji: '🐶', word: 'Woof!' }, cat: { emoji: '🐱', word: 'Meow!' }, bunny: { emoji: '🐰', word: 'Squeak!' } };
const COLORS = { dog: ['#c69c6d', '#2a2727', '#f4f1ea', '#e0b25a'], cat: ['#f2a25f', '#9a958c', '#2a2727', '#f4f1ea'], bunny: ['#f2efe9', '#c9a27c', '#9a8a7a', '#f4a3c4'] };

function nameTag(text) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = "800 40px 'Baloo 2', sans-serif";
  const w = Math.ceil(g.measureText(text).width) + 40;
  c.width = w; c.height = 60;
  g.font = "800 40px 'Baloo 2', sans-serif";
  g.fillStyle = 'rgba(255,240,247,0.92)'; g.beginPath(); g.roundRect(2, 4, w - 4, 52, 26); g.fill();
  g.fillStyle = '#d14d8c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 31);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, fog: false }));
  s.scale.set(0.24 * w / 60, 0.24, 1);
  return s;
}

export function setupPets(ctx) {
  const { scene, $, player, store } = ctx;
  let pet = null; // { data, mesh, tag, ... }
  const leashLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#d9443a' }));
  leashLine.visible = false; leashLine.frustumCulled = false;
  scene.add(leashLine);
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), new THREE.MeshStandardMaterial({ color: '#c8e04a', roughness: 0.6 }));
  ballMesh.visible = false; ballMesh.castShadow = true; scene.add(ballMesh);
  const bowl = new THREE.Group();
  bowl.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.08, 16), new THREE.MeshStandardMaterial({ color: '#d9443a' })));
  const kibble = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 16), new THREE.MeshStandardMaterial({ color: '#a0745a' })); kibble.position.y = 0.04; bowl.add(kibble);
  bowl.visible = false; scene.add(bowl);
  let bub = null, bubUntil = 0;

  function say(text, ms = 2200) {
    if (!pet) return;
    if (bub) scene.remove(bub);
    bub = bubble(text); scene.add(bub); bubUntil = performance.now() + ms;
  }
  function save() { if (pet) store.set('pet', pet.data); }

  function spawn(data) {
    if (pet) { scene.remove(pet.mesh, pet.tag); }
    const mesh = createItem(data.kind, data.color);
    mesh.traverse((o) => { if (o.isMesh) o.userData.myPet = true; });
    const tag = nameTag(`${KINDS[data.kind].emoji} ${data.name}`);
    scene.add(mesh, tag);
    pet = { data, mesh, tag, state: 'follow', t: 0, ball: null, eatUntil: 0, needSay: 20 };
    mesh.position.set(player.pos.x - 1, 0, player.pos.z - 1);
  }
  const saved = store.get('pet');
  if (saved?.kind && KINDS[saved.kind]) spawn(saved);

  // ---------- the adopt card ----------
  let pick = { kind: 'dog', color: COLORS.dog[0] };
  function drawAdopt() {
    $('adKinds').innerHTML = '';
    for (const k of Object.keys(KINDS)) {
      const b = document.createElement('button');
      b.className = 'qbtn small2' + (pick.kind === k ? ' right' : '');
      b.textContent = `${KINDS[k].emoji} ${k[0].toUpperCase() + k.slice(1)}`;
      b.onclick = () => { pick = { kind: k, color: COLORS[k][0] }; drawAdopt(); };
      $('adKinds').appendChild(b);
    }
    $('adColors').innerHTML = '';
    for (const c of COLORS[pick.kind]) {
      const b = document.createElement('button');
      b.className = 'swatch' + (pick.color === c ? ' on' : '');
      b.style.background = c;
      b.onclick = () => { pick.color = c; drawAdopt(); };
      $('adColors').appendChild(b);
    }
  }
  $('adGo').onclick = () => {
    const name = $('adName').value.trim().slice(0, 14) || { dog: 'Buddy', cat: 'Whiskers', bunny: 'Clover' }[pick.kind];
    spawn({ kind: pick.kind, color: pick.color, name, hunger: 80, fun: 80, clean: 90, born: Date.now() });
    save();
    ctx.close();
    ctx.toast(`Say hi to ${name}! ${KINDS[pick.kind].emoji}💖`, 3500);
    ctx.chime();
    say(`${KINDS[pick.kind].word} 💖`);
  };

  // ---------- the pet care card ----------
  function bar(v) { return `<div class="pbar"><div style="width:${Math.max(4, v)}%;background:${v > 50 ? '#7cc46a' : v > 25 ? '#f2cf63' : '#ec7d72'}"></div></div>`; }
  function drawPanel() {
    const d = pet.data;
    $('ppTitle').textContent = `${KINDS[d.kind].emoji} ${d.name}`;
    $('ppBars').innerHTML = `<div>🍖 Food ${bar(d.hunger)}</div><div>🎾 Fun ${bar(d.fun)}</div><div>🛁 Clean ${bar(d.clean)}</div>`;
    $('ppLeash').textContent = pet.state === 'leash' ? '🦮 Take off the leash' : '🦮 Put on the leash';
    $('ppStay').textContent = pet.state === 'stay' ? '🏃 Come here!' : '✋ Stay here';
  }
  const act = (fn) => () => { fn(); save(); drawPanel(); };
  $('ppFeed').onclick = act(() => {
    pet.data.hunger = 100; pet.eatUntil = performance.now() + 3000;
    bowl.position.set(pet.mesh.position.x + Math.sin(pet.mesh.rotation.y) * 0.4, 0.04, pet.mesh.position.z + Math.cos(pet.mesh.rotation.y) * 0.4); bowl.visible = true;
    ctx.sound('crunch', pet.mesh.position); say('Yum yum! 😋'); ctx.job('feedpet');
  });
  $('ppCuddle').onclick = act(() => { pet.data.fun = Math.min(100, pet.data.fun + 20); say('💖💖💖'); ctx.burst(pet.mesh.position.clone().setY(0.6)); ctx.sound(pet.data.kind, pet.mesh.position); });
  $('ppBath').onclick = act(() => { pet.data.clean = 100; say('Splish splash! 🫧'); for (let i = 0; i < 4; i++) setTimeout(() => ctx.burst(pet.mesh.position.clone().setY(0.4)), i * 200); ctx.sound('bath', pet.mesh.position); });
  $('ppLeash').onclick = act(() => { pet.state = pet.state === 'leash' ? 'follow' : 'leash'; say(pet.state === 'leash' ? 'Walkies! 🦮' : 'Free to roam! 🐾'); });
  $('ppStay').onclick = act(() => { pet.state = pet.state === 'stay' ? 'follow' : 'stay'; say(pet.state === 'stay' ? 'Okay, I will wait! 🐾' : 'Coming! 🐾'); });
  $('ppFetch').onclick = () => { ctx.close(); throwBall(); };
  $('ppTreat').onclick = act(() => {
    if (!ctx.spend(1)) { say('No coins for treats! Do a job 🪙'); return; }
    pet.data.hunger = Math.min(100, pet.data.hunger + 15); pet.data.fun = Math.min(100, pet.data.fun + 15);
    pet.trick = 1.2; say(pickOne(['A treat! Watch my trick! 🦴', 'Yummy! Spin spin! 🌀', 'Best treat ever! ⭐'])); ctx.sound(pet.data.kind, pet.mesh.position);
  });
  $('ppClose').onclick = () => ctx.close();

  // ---------- finding your pet a new home ----------
  let leaving = null; // { mesh, tag, t, dir } while the pet waves goodbye and trots off
  $('ppBye').onclick = () => {
    $('ppAskText').textContent = `Are you sure you want ${pet.data.name} to go to a new home? You can adopt a new pet at the Pet Shop.`;
    asking(true);
  };
  const asking = (on) => { $('ppAsk').classList.toggle('hidden', !on); for (const id of ['ppActs', 'ppFoot']) $(id).classList.toggle('hidden', on); };
  $('ppByeNo').onclick = () => { asking(false); say('Yay! I love you! 💖'); };
  $('ppByeYes').onclick = () => {
    const { mesh, tag, data } = pet;
    pet = null;
    store.set('pet', null);
    ballMesh.visible = false; bowl.visible = false; leashLine.visible = false;
    if (bub) { scene.remove(bub); bub = null; }
    mesh.traverse((o) => { if (o.isMesh) o.userData.myPet = false; });
    // trot away from you for a few seconds, then poof
    const dir = Math.atan2(mesh.position.x - player.pos.x, mesh.position.z - player.pos.z);
    bub = bubble(`Bye bye! I'll be happy! 💖`); scene.add(bub); bubUntil = performance.now() + 3500;
    leaving = { mesh, tag, t: 0, dir };
    ctx.close();
    ctx.toast(`${KINDS[data.kind].emoji} ${data.name} went to a happy new home! 🏡💖`, 3500);
    ctx.sound(data.kind, mesh.position);
  };
  function updateLeaving(dt, t) {
    const L = leaving, m = L.mesh;
    L.t += dt;
    if (L.t < 0.8) { m.position.y = Math.abs(Math.sin(t * 10)) * 0.12; } // a happy hop goodbye
    else {
      m.rotation.y += Math.atan2(Math.sin(L.dir - m.rotation.y), Math.cos(L.dir - m.rotation.y)) * Math.min(1, dt * 6);
      m.position.x += Math.sin(L.dir) * 2.5 * dt; m.position.z += Math.cos(L.dir) * 2.5 * dt;
      m.position.y = Math.abs(Math.sin(t * 14)) * 0.05;
    }
    L.tag.position.set(m.position.x, m.position.y + 0.85, m.position.z);
    if (bub) { bub.position.set(m.position.x, m.position.y + 1.25, m.position.z); if (performance.now() > bubUntil) { scene.remove(bub); bub = null; } }
    if (L.t > 3.5) {
      ctx.burst(m.position.clone().setY(0.4));
      scene.remove(m, L.tag);
      if (bub) { scene.remove(bub); bub = null; }
      leaving = null;
    }
  }

  // ---------- fetch ----------
  function throwBall() {
    const f = player.facing, from = new THREE.Vector3(player.pos.x, player.pos.y + 1.2, player.pos.z);
    const to = new THREE.Vector3(player.pos.x + Math.sin(f) * 9, 0.09, player.pos.z + Math.cos(f) * 9);
    pet.ball = { from, to, t: 0, phase: 'flying' };
    ballMesh.visible = true; ballMesh.position.copy(from);
    pet.state = pet.state === 'stay' ? 'follow' : pet.state;
    say('Ooh, a ball! 🎾');
  }

  const tmp = new THREE.Vector3();
  return {
    has: () => !!pet,
    name: () => pet?.data.name,
    meshes: () => (pet ? [pet.mesh] : []),
    isMine: (obj) => { while (obj) { if (obj.userData?.myPet) return true; obj = obj.parent; } return false; },
    openAdopt() { pick = { kind: 'dog', color: COLORS.dog[0] }; $('adName').value = ''; drawAdopt(); },
    openPanel() { asking(false); drawPanel(); },
    update(dt, t, walking) {
      if (leaving) updateLeaving(dt, t);
      if (!pet) { leashLine.visible = false; return; }
      const d = pet.data, m = pet.mesh;
      // needs slowly go down
      d.hunger = Math.max(0, d.hunger - dt / 30); d.fun = Math.max(0, d.fun - dt / 22); d.clean = Math.max(0, d.clean - dt / 45);
      pet.needSay -= dt;
      if (pet.needSay <= 0) {
        pet.needSay = 25;
        if (d.hunger < 25) say(`${KINDS[d.kind].emoji} I'm hungry! 🍖`); else if (d.fun < 25) say("Let's play! 🎾"); else if (d.clean < 25) say('I need a bath! 🛁');
        save();
      }
      // where to go
      let target = null, speed = 2.2;
      const b = pet.ball;
      if (b) {
        if (b.phase === 'flying') {
          b.t += dt / 0.9;
          const k = Math.min(1, b.t);
          ballMesh.position.lerpVectors(b.from, b.to, k); ballMesh.position.y = b.from.y * (1 - k) + 0.09 + Math.sin(k * Math.PI) * 2.2;
          if (k >= 1) b.phase = 'waiting';
        }
        if (b.phase !== 'back') { target = b.to; speed = 5; }
        if (b.phase !== 'flying' && m.position.distanceTo(tmp.set(b.to.x, 0, b.to.z)) < 0.5) { b.phase = 'back'; ctx.sound(d.kind, m.position); }
        if (b.phase === 'back') {
          ballMesh.position.set(m.position.x + Math.sin(m.rotation.y) * 0.4, 0.42, m.position.z + Math.cos(m.rotation.y) * 0.4);
          target = player.pos; speed = 4.5;
          if (m.position.distanceTo(tmp.set(player.pos.x, 0, player.pos.z)) < 1.2) {
            pet.ball = null; ballMesh.visible = false; d.fun = Math.min(100, d.fun + 25);
            say('Again! Again! 🎾'); ctx.job('fetch'); ctx.burst(m.position.clone().setY(0.6)); save();
          }
        }
      } else if (pet.state !== 'stay') {
        const behind = pet.state === 'leash' ? 1.1 : 1.8, side = pet.state === 'leash' ? 0.6 : 1.0;
        target = tmp.set(player.pos.x - Math.sin(player.facing) * behind + Math.cos(player.facing) * side, 0, player.pos.z - Math.cos(player.facing) * behind - Math.sin(player.facing) * side).clone();
      }
      // far away (you drove off)? catch up by magic
      if (pet.state !== 'stay' && m.position.distanceTo(tmp.set(player.pos.x, 0, player.pos.z)) > 30 && walking) m.position.set(player.pos.x - 1.5, 0, player.pos.z - 1.5);
      let moving = false;
      if (target && performance.now() > pet.eatUntil) {
        const dx = target.x - m.position.x, dz = target.z - m.position.z, l = Math.hypot(dx, dz);
        if (l > 0.35) {
          const sp = Math.min(l * 2, speed * (l > 5 ? 1.8 : 1));
          const before = m.position.clone();
          m.position.x += (dx / l) * sp * dt; m.position.z += (dz / l) * sp * dt;
          if (pet.state === 'leash' && walking) ctx.job('walk', before.distanceTo(m.position));
          m.rotation.y += Math.atan2(Math.sin(Math.atan2(dx, dz) - m.rotation.y), Math.cos(Math.atan2(dx, dz) - m.rotation.y)) * Math.min(1, dt * 8);
          moving = true;
        } else if (pet.state !== 'stay') {
          const want = Math.atan2(player.pos.x - m.position.x, player.pos.z - m.position.z);
          m.rotation.y += Math.atan2(Math.sin(want - m.rotation.y), Math.cos(want - m.rotation.y)) * Math.min(1, dt * 4);
        }
      }
      const eating = performance.now() < pet.eatUntil;
      m.position.y = moving ? Math.abs(Math.sin(t * (d.kind === 'bunny' ? 9 : 14))) * (d.kind === 'bunny' ? 0.15 : 0.04) : 0;
      m.rotation.x = eating ? 0.25 + Math.sin(t * 12) * 0.08 : 0;
      if (pet.trick > 0) { pet.trick -= dt; m.rotation.y += dt * 11; m.position.y += Math.sin((1.2 - pet.trick) / 1.2 * Math.PI) * 0.4; } // spin trick
      if (!eating) bowl.visible = false;
      m.updateMatrixWorld(true);
      pet.tag.position.set(m.position.x, m.position.y + 0.85, m.position.z);
      if (bub) { bub.position.set(m.position.x, m.position.y + 1.25, m.position.z); if (performance.now() > bubUntil) { scene.remove(bub); bub = null; } }
      // the leash goes from your hand to the collar
      leashLine.visible = pet.state === 'leash' && walking;
      if (leashLine.visible) {
        const p = leashLine.geometry.attributes.position;
        p.setXYZ(0, player.pos.x + Math.cos(player.facing) * -0.25, player.pos.y + 0.75, player.pos.z - Math.sin(player.facing) * -0.25);
        p.setXYZ(1, m.position.x + Math.sin(m.rotation.y) * 0.3, m.position.y + 0.35, m.position.z + Math.cos(m.rotation.y) * 0.3);
        p.needsUpdate = true;
      }
    },
  };
}
