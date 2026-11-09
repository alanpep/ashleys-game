// The other players: their characters, name tags, and smooth movement between updates.
import * as THREE from 'three';
import { createCharacter, animateCharacter, DEFAULT_CHARACTER } from './character.js';

function nameTag(text) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = "800 44px 'Baloo 2', sans-serif";
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 48;
  c.width = w; c.height = 72;
  ctx.font = font;
  ctx.fillStyle = 'rgba(255,250,243,0.92)';
  ctx.beginPath(); ctx.roundRect(2, 4, w - 4, 62, 31); ctx.fill();
  ctx.fillStyle = '#3a2a4a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, 37);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, fog: false }));
  s.scale.set(0.32 * w / 72, 0.32, 1);
  s.renderOrder = 10;
  return s;
}

export function setupRemotes(scene) {
  const players = new Map(); // id -> remote

  function build(r) {
    if (r.avatar) { scene.remove(r.avatar.root); scene.remove(r.tag); }
    r.avatar = createCharacter({ ...DEFAULT_CHARACTER, ...r.character });
    r.tag = nameTag(r.character?.name || 'Friend');
    scene.add(r.avatar.root, r.tag);
  }

  return {
    players,
    add(id, character, pose) {
      let r = players.get(id);
      if (!r) {
        r = { id, character, pos: new THREE.Vector3(), target: new THREE.Vector3(), facing: 0, targetFacing: 0, speed: 0, hold: null, seen: false };
        players.set(id, r);
      }
      r.character = character;
      build(r);
      if (pose) this.pose(id, pose);
      return r;
    },
    setCharacter(id, character) { const r = players.get(id); if (r) { r.character = character; build(r); } },
    remove(id) {
      const r = players.get(id);
      if (!r) return null;
      scene.remove(r.avatar.root, r.tag);
      players.delete(id);
      return r;
    },
    pose(id, p) {
      const r = players.get(id);
      if (!r) return;
      r.target.set(p.x, p.y ?? 0, p.z);
      r.targetFacing = p.f;
      r.speed = p.s;
      r.hold = p.h ?? null;
      r.mode = p.m ?? null;
      if (!r.seen) { r.pos.copy(r.target); r.facing = p.f; r.seen = true; }
    },
    update(dt, t) {
      const k = 1 - Math.exp(-dt * 12);
      for (const r of players.values()) {
        r.avatar.root.visible = r.tag.visible = r.seen;
        if (!r.seen) continue;
        r.pos.lerp(r.target, k);
        r.facing += Math.atan2(Math.sin(r.targetFacing - r.facing), Math.cos(r.targetFacing - r.facing)) * k;
        r.avatar.root.position.copy(r.pos);
        r.avatar.root.rotation.y = r.facing;
        animateCharacter(r.avatar, t + r.id, r.speed, !!r.hold);
        r.avatar.root.rotation.order = 'YXZ';
        r.avatar.root.rotation.x = r.mode === 'lie' ? -Math.PI / 2 : 0;
        if (r.mode === 'sit') r.avatar.parts.legL.rotation.x = r.avatar.parts.legR.rotation.x = -Math.PI / 2;
        if (r.mode === 'lie') r.avatar.parts.legL.rotation.x = r.avatar.parts.legR.rotation.x = 0;
        if (r.mode === 'jump') {
          if (!r.hold) r.avatar.parts.armL.rotation.x = r.avatar.parts.armR.rotation.x = -2.7;
          r.avatar.parts.legL.rotation.x = -0.6; r.avatar.parts.legR.rotation.x = 0.25;
        }
        r.tag.position.set(r.pos.x, r.pos.y + r.avatar.height + 0.32, r.pos.z);
      }
    },
  };
}
