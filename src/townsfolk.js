// People who live in town: they walk their routes, step aside for you, and say hi when you click them.
// Where they are comes from the clock, so two players see them in (almost) the same places.
import * as THREE from 'three';
import { createCharacter, animateCharacter, DEFAULT_CHARACTER } from './character.js';
import { createItem } from './items.js';

export function bubble(text) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = "700 40px 'Baloo 2', sans-serif";
  ctx.font = font;
  const w = Math.min(1000, Math.ceil(ctx.measureText(text).width) + 56);
  c.width = w; c.height = 100;
  ctx.font = font;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(3, 3, w - 6, 72, 30); ctx.fill();
  ctx.beginPath(); ctx.moveTo(w / 2 - 14, 74); ctx.lineTo(w / 2, 96); ctx.lineTo(w / 2 + 14, 74); ctx.fill();
  ctx.fillStyle = '#3a2a4a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, 40, w - 40);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, fog: false }));
  s.scale.set(0.42 * w / 100, 0.42, 1);
  s.renderOrder = 11;
  return s;
}

export function setupTownsfolk(scene, people, sayings, hooks = {}) {
  const folks = people.map((def, i) => {
    const ch = createCharacter({ ...DEFAULT_CHARACTER, hat: 'none', face: 'none', back: 'none', beard: 'none', ...def.look, name: def.name });
    scene.add(ch.root);
    const pts = (def.path ?? [def.at]).map(([x, z]) => new THREE.Vector2(x, z));
    if (def.loop) pts.push(pts[0].clone());
    const lens = [];
    let L = 0;
    for (let k = 1; k < pts.length; k++) { const d = pts[k].distanceTo(pts[k - 1]); lens.push(d); L += d; }
    const f = { def, ch, root: ch.root, pts, lens, L, offset: def.together ?? i * 37.3, side: def.lane ?? 0, talkUntil: 0, bubble: null, dog: null, hold: 0, still: !def.path };
    if (def.job) addProp(f);
    ch.root.userData.folk = f;
    if (def.dog) {
      f.dog = createItem('dog', '#c69c6d');
      if (f.dog) { f.dog.scale.setScalar(0.85); scene.add(f.dog); }
    }
    return f;
  });

  const base = new THREE.Vector2(), dir = new THREE.Vector2();

  // ---------- jobs: what workers hold and how they move ----------
  function addProp(f) {
    const { ch, def } = f, arm = def.look?.age === 'kid' ? 0.36 : 0.6;
    const m = (geo, color, opts) => { const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...opts })); mesh.castShadow = true; return mesh; };
    f.hand = arm;
    if (def.job === 'stop') { // a stop sign on a pole
      const pole = m(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8), '#c9ccd1'); pole.position.y = -arm - 0.35;
      const sign = m(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 8), '#d9443a'); sign.rotation.x = Math.PI / 2; sign.position.y = -arm - 0.85;
      const rim = m(new THREE.CylinderGeometry(0.2, 0.2, 0.035, 8), '#fbfaf7'); rim.rotation.x = Math.PI / 2; rim.position.y = -arm - 0.85; rim.scale.set(0.85, 0.5, 0.85);
      ch.parts.armR.add(pole, sign, rim);
    } else if (def.job === 'spray') { // fire hose nozzle
      const nozzle = m(new THREE.CylinderGeometry(0.03, 0.05, 0.3, 10), '#3b3b42'); nozzle.position.set(0.1, -arm - 0.05, 0.1);
      ch.parts.armR.add(nozzle);
      f.drops = [];
    } else if (def.job === 'clipboard') {
      const board = m(new THREE.BoxGeometry(0.22, 0.3, 0.02), '#a0745a'); board.position.set(0, -arm, 0.08); board.rotation.x = -1.2;
      const paper = m(new THREE.BoxGeometry(0.18, 0.24, 0.005), '#fbfaf7'); paper.position.set(0, -arm, 0.095); paper.rotation.x = -1.2;
      ch.parts.armL.add(board, paper);
    } else if (def.job === 'toss') { // a pizza flying up and down
      f.pizza = new THREE.Group();
      f.pizza.add(m(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 20), '#e9c27a'));
      const sauce = m(new THREE.CylinderGeometry(0.19, 0.19, 0.035, 20), '#f2cf63'); f.pizza.add(sauce);
      for (let k = 0; k < 5; k++) { const pep = m(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 10), '#c8463c'); pep.position.set(Math.cos(k * 1.3) * 0.11, 0, Math.sin(k * 1.3) * 0.11); f.pizza.add(pep); }
      scene.add(f.pizza);
    } else if (def.job === 'read' || def.job === 'student') { // a book (or notebook)
      const book = m(new THREE.BoxGeometry(0.2, 0.03, 0.15), ['#ec7d72', '#93c9ea', '#f7da7e', '#aee0c5', '#bba6e6'][Math.floor(f.offset) % 5]);
      book.position.set(-0.08, -arm + 0.02, 0.08);
      if (def.job === 'read') ch.parts.armR.add(book);
    } else if (def.job === 'paint') { // a paint brush
      const brush = m(new THREE.CylinderGeometry(0.01, 0.01, 0.25, 6), '#a0745a'); brush.position.set(0, -arm - 0.1, 0.03);
      const tip = m(new THREE.SphereGeometry(0.02, 8, 6), ['#ef84ad', '#93c9ea', '#f7da7e'][Math.floor(f.offset) % 3]); tip.position.set(0, -arm - 0.23, 0.03);
      ch.parts.armR.add(brush, tip);
    } else if (def.job === 'mail') { // a mail bag on the hip
      const bag = m(new THREE.BoxGeometry(0.12, 0.28, 0.32), '#3f5f8f'); bag.position.set(0.27, ch.parts.legL.position.y + 0.12, 0);
      const env = m(new THREE.BoxGeometry(0.02, 0.1, 0.16), '#fbfaf7'); env.position.set(0.27, ch.parts.legL.position.y + 0.29, 0.04);
      ch.root.add(bag, env);
    }
  }
  const SEATED = new Set(['sittype', 'student', 'read']);
  const dropGeo = new THREE.SphereGeometry(0.035, 6, 4), dropMat = new THREE.MeshStandardMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.8 });
  const hand = new THREE.Vector3();
  function whistleEvery(f, t, secs) {
    const n = Math.floor((t + f.offset) / secs);
    if (f.lastWhistle !== undefined && n !== f.lastWhistle) hooks.sound?.('whistle', f.root.position);
    f.lastWhistle = n;
  }
  function workPose(f, t, dt) {
    const p = f.ch.parts, k = (t + f.offset) % 6;
    if (SEATED.has(f.def.job)) { // sitting on a chair, desk or bean bag
      p.legL.rotation.x = p.legR.rotation.x = -Math.PI / 2;
      f.root.position.y = (f.def.seatY ?? 0.53) - p.legL.position.y;
    }
    switch (f.def.job) {
      case 'type': case 'sittype':
        p.armL.rotation.x = -1.15 + Math.sin(t * 18) * 0.06; p.armR.rotation.x = -1.15 + Math.sin(t * 18 + 1.5) * 0.06;
        break;
      case 'student': // writing, and sometimes a hand goes up
        p.armL.rotation.x = -1.0; p.armR.rotation.x = -1.0 + Math.sin(t * 9) * 0.08;
        if ((t + f.offset * 3) % 9 < 1.6) { p.armR.rotation.x = -2.9; p.armR.rotation.z = -0.1; } else p.armR.rotation.z = 0;
        break;
      case 'read':
        p.armL.rotation.x = p.armR.rotation.x = -1.0; p.head.rotation.x = 0.3;
        break;
      case 'paint':
        p.armR.rotation.x = -1.5 + Math.sin(t * 4 + f.offset) * 0.3; p.armR.rotation.z = Math.sin(t * 3 + f.offset) * 0.3;
        break;
      case 'jump': {
        const up = Math.abs(Math.sin(t * 4 + f.offset));
        f.root.position.y = up * 0.4;
        p.armL.rotation.x = p.armR.rotation.x = -2.6 * up;
        p.legL.rotation.x = -0.4 * up; p.legR.rotation.x = 0.2 * up;
        break;
      }
      case 'wave':
        if (k < 1.6) { p.armR.rotation.x = -2.7; p.armR.rotation.z = -0.3 + Math.sin(t * 9) * 0.35; } else p.armR.rotation.z = 0;
        break;
      case 'stop': p.armR.rotation.x = -2.5; p.armR.rotation.z = -0.15; break;
      case 'point': if (k < 3) p.armR.rotation.x = -2.1; break;
      case 'clipboard': p.armL.rotation.x = -1.0; p.armR.rotation.x = -0.95 + Math.sin(t * 10) * 0.1; break;
      case 'whistle': whistleEvery(f, t, 6); if (k < 1) { p.armR.rotation.x = -2.6; p.armR.rotation.z = 0.5; } else p.armR.rotation.z = 0; break;
      case 'directing': whistleEvery(f, t, 9); p.armR.rotation.x = -1.57; p.armR.rotation.z = -0.9 + Math.sin(t * 2.2) * 0.8; break;
      case 'toss': {
        p.armL.rotation.x = p.armR.rotation.x = -2.0;
        const up = Math.abs(Math.sin(t * 2.4)) * 0.9;
        f.pizza.position.set(f.root.position.x + Math.sin(f.root.rotation.y) * 0.35, f.ch.height + 0.15 + up, f.root.position.z + Math.cos(f.root.rotation.y) * 0.35);
        f.pizza.rotation.y = t * 6;
        break;
      }
      case 'spray': {
        p.armL.rotation.x = p.armR.rotation.x = -1.35;
        p.armR.localToWorld(hand.set(0.1, -f.hand - 0.25, 0.1));
        const fx = Math.sin(f.root.rotation.y), fz = Math.cos(f.root.rotation.y);
        f.acc = (f.acc ?? 0) + dt * 35;
        while (f.acc > 1 && f.drops.length < 70) {
          f.acc--;
          const d = new THREE.Mesh(dropGeo, dropMat);
          d.position.copy(hand);
          d.userData.v = new THREE.Vector3(fx * (3.5 + Math.random()) + (Math.random() - 0.5) * 0.6, 1.2 + Math.random() * 0.8, fz * (3.5 + Math.random()) + (Math.random() - 0.5) * 0.6);
          scene.add(d); f.drops.push(d);
        }
        for (let n = f.drops.length - 1; n >= 0; n--) {
          const d = f.drops[n];
          d.userData.v.y -= 9 * dt;
          d.position.addScaledVector(d.userData.v, dt);
          if (d.position.y < 0) { scene.remove(d); f.drops.splice(n, 1); }
        }
        break;
      }
    }
  }
  function along(f, s) {
    for (let k = 0; k < f.lens.length; k++) {
      if (s <= f.lens[k] || k === f.lens.length - 1) {
        const a = f.pts[k], b = f.pts[k + 1];
        const u = f.lens[k] ? Math.min(1, s / f.lens[k]) : 0;
        base.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
        dir.set(b.x - a.x, b.y - a.y).normalize();
        return;
      }
      s -= f.lens[k];
    }
  }

  return {
    folks,
    meshes: folks.map((f) => f.root),
    find(obj) { while (obj) { if (obj.userData?.folk) return obj.userData.folk; obj = obj.parent; } return null; },
    talk(f, name, facing) {
      const lines = f.def.says ?? sayings;
      const line = lines[Math.floor(Math.random() * lines.length)].replace('{name}', name || 'friend');
      if (f.bubble) scene.remove(f.bubble);
      f.bubble = bubble(line);
      scene.add(f.bubble);
      f.talkUntil = performance.now() + 3500;
      f.lookAt = facing;
    },
    // avoid: list of {x, z} for players, so people step around them
    update(dt, t, avoid, camPos, view = 65) {
      const now = Date.now() / 1000;
      for (const f of folks) {
        // people far away aren't drawn or animated (keeps the game fast)
        const far = camPos && (f.root.position.x - camPos.x) ** 2 + (f.root.position.z - camPos.z) ** 2 > view * view;
        f.root.visible = !far;
        if (f.pizza) f.pizza.visible = !far;
        if (far && !f.dog) continue;
        const talking = performance.now() < f.talkUntil;
        if (f.still) { // workers stay at their posts
          const x = f.pts[0].x, z = f.pts[0].y;
          f.root.position.set(x, 0, z);
          const face = talking && f.lookAt ? Math.atan2(f.lookAt.x - x, f.lookAt.z - z) : THREE.MathUtils.degToRad(f.def.face ?? 0);
          f.root.rotation.y += Math.atan2(Math.sin(face - f.root.rotation.y), Math.cos(face - f.root.rotation.y)) * Math.min(1, dt * 6);
          animateCharacter(f.ch, t + f.offset, 0, false);
          f.ch.parts.head.rotation.x = 0;
          if (!talking) workPose(f, t, dt);
          else { if (SEATED.has(f.def.job)) workPose(f, t, dt); f.ch.parts.armR.rotation.x = -2.7; f.ch.parts.armR.rotation.z = -0.3 + Math.sin(t * 9) * 0.35; }
          if (f.bubble) {
            if (!talking) { scene.remove(f.bubble); f.bubble = null; }
            else f.bubble.position.set(x, f.root.position.y + f.ch.height + 0.55, z);
          }
          continue;
        }
        if (talking) f.offset -= dt * f.def.speed; // stand still while chatting
        const d = now * f.def.speed + f.offset;
        let s, back = false;
        if (f.def.loop) s = ((d % f.L) + f.L) % f.L;
        else { s = ((d % (2 * f.L)) + 2 * f.L) % (2 * f.L); if (s > f.L) { s = 2 * f.L - s; back = true; } }
        along(f, s);
        if (back) dir.negate();
        // step aside for players
        let want = f.def.lane ?? 0; // walking side by side with someone
        for (const p of avoid) {
          const dx = p.x - base.x, dz = p.z - base.y;
          if (dx * dx + dz * dz < 1.4 * 1.4) want = (dx * -dir.y + dz * dir.x) > 0 ? -0.8 : 0.8;
        }
        f.side += (want - f.side) * Math.min(1, dt * 4);
        const x = base.x - dir.y * f.side, z = base.y + dir.x * f.side;
        f.root.position.set(x, 0, z);
        const face = talking && f.lookAt ? Math.atan2(f.lookAt.x - x, f.lookAt.z - z) : Math.atan2(dir.x, dir.y);
        f.root.rotation.y += Math.atan2(Math.sin(face - f.root.rotation.y), Math.cos(face - f.root.rotation.y)) * Math.min(1, dt * 8);
        const speed = talking ? 0 : f.def.run ? 2 : 1;
        animateCharacter(f.ch, t + f.offset, speed, false);
        f.ch.parts.head.rotation.x = 0;
        if (f.def.job === 'mail' && !talking) f.ch.parts.armR.rotation.x = -0.4;
        if (talking) { // wave hello
          f.ch.parts.armR.rotation.x = -2.7;
          f.ch.parts.armR.rotation.z = -0.3 + Math.sin(t * 9) * 0.35;
        } else f.ch.parts.armR.rotation.z = 0;
        if (f.bubble) {
          if (!talking) { scene.remove(f.bubble); f.bubble = null; }
          else f.bubble.position.set(x, f.ch.height + 0.55, z);
        }
        if (f.dog) {
          const dx = x - dir.x * 1.1 + dir.y * 0.55, dz = z - dir.y * 1.1 - dir.x * 0.55;
          f.dog.position.set(dx, Math.abs(Math.sin(t * 9)) * 0.03 * (talking ? 0 : 1), dz);
          f.dog.rotation.y = f.root.rotation.y;
          f.dog.userData.anim?.(f.dog, t);
          f.barkIn = (f.barkIn ?? 8 + Math.random() * 20) - dt;
          if (f.barkIn <= 0) { f.barkIn = 15 + Math.random() * 30; hooks.sound?.('dog', f.dog.position); }
        }
      }
    },
  };
}
