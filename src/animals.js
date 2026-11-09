// Animals that move around so the world feels alive:
//  - pets (dogs, cats, ducks) wander near where they were put, and dogs come say hi
//  - wild bunnies hop around the yards and the park, and run off if you chase them
//  - little birds peck at the ground and fly away when you get close
// Pets only wiggle around their saved spot, so moving around never changes the saved house.
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
const ROAM = {
  dog: { r: 3.5, speed: 1.3, bob: 0.04, follow: true },
  cat: { r: 2.5, speed: 0.7, bob: 0.02 },
  duck: { r: 1.6, speed: 0.4, bob: 0, waddle: true, free: true },
  bunny: { r: 2.0, speed: 0.9, bob: 0.12 }, // ducks paddle in the pond, so walls don't matter
};
const BUNNY_SPOTS = [[8, 12], [11, 14], [32, -34], [36, -40], [58, 22], [-12, -31], [30, 12], [-8, 13], [46, -16.5],
  [-6, 58], [-2, 63], [14, 36], [42, 44], [-46, 46], [-25, 44], [30, 62], [-80, 30], [100, 0], [0, -95]];
const BIRD_SPOTS = [[35, -35], [5, -4], [14, -41], [56, 20], [-14, 10], [26, -2], [-4, 64], [-50, 44], [44, 36], [20, 40]];

function mat(c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }); }

function makeBunny(color) {
  const g = new THREE.Group(), m = mat(color), pink = mat('#f4a3c4'), dark = mat('#2a2727');
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), m); body.scale.set(1, 0.85, 1.25); body.position.y = 0.12; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), m); head.position.set(0, 0.22, 0.13); g.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.11, 4, 8), m); ear.position.set(s * 0.035, 0.33, 0.1); ear.rotation.z = s * 0.15; g.add(ear);
    const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.08, 4, 6), pink); inner.position.set(s * 0.035, 0.33, 0.12); inner.rotation.z = s * 0.15; g.add(inner);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), dark); eye.position.set(s * 0.045, 0.24, 0.2); g.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat('#ffffff')); tail.position.set(0, 0.15, -0.16); g.add(tail);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function makeBird(color) {
  const g = new THREE.Group(), m = mat(color);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), m); body.scale.set(0.9, 0.9, 1.4); body.position.y = 0.07; g.add(body);
  const head = new THREE.Group(); head.position.set(0, 0.12, 0.07); g.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), m));
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 6), mat('#f2a25f')); beak.rotation.x = Math.PI / 2; beak.position.z = 0.05; head.add(beak);
  const wings = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(s * 0.04, 0.09, 0); g.add(p);
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.08), m); w.position.x = s * 0.05; p.add(w);
    wings.push(p);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, head, wings };
}

export function setupAnimals(scene, ctx) {
  // ---------- wild bunnies ----------
  const bunnies = BUNNY_SPOTS.map(([x, z], i) => {
    const g = makeBunny(['#f2efe9', '#c9a27c', '#9a8a7a', '#f2efe9'][i % 4]);
    g.position.set(x, 0, z);
    scene.add(g);
    return { g, home: new THREE.Vector2(x, z), from: new THREE.Vector2(x, z), to: null, t: 0, wait: rand(0, 3), hops: 0 };
  });

  // ---------- birds ----------
  const flocks = BIRD_SPOTS.map(([x, z], i) => ({
    spot: new THREE.Vector2(x, z),
    birds: Array.from({ length: 3 + (i % 2) }, (_, k) => {
      const b = makeBird(['#7a8fa6', '#a0745a', '#d9443a', '#5b8fd9'][(i + k) % 4]);
      const ox = rand(-0.8, 0.8), oz = rand(-0.8, 0.8);
      b.g.position.set(x + ox, 0, z + oz);
      b.g.rotation.y = rand(0, 6);
      scene.add(b.g);
      return { ...b, off: new THREE.Vector2(ox, oz), ph: rand(0, 6) };
    }),
    state: 'ground', t: 0, from: new THREE.Vector2(x, z), to: new THREE.Vector2(x, z),
  }));

  const people = () => ctx.people(); // [{x, z}] players nearby

  function nearestPerson(x, z) {
    let best = null, bd = Infinity;
    for (const p of people()) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
    return { p: best, d: bd };
  }

  return {
    update(dt, t) {
      // ---- pets ---- (the list of pets is refreshed now and then, not every frame)
      if (!this._pets || (this._petTimer -= dt) <= 0) { this._petTimer = 1; this._pets = ctx.items().filter((i) => ROAM[i.userData.type]); }
      for (const it of this._pets) {
        if (!it.parent) continue;
        const ud = it.userData, cfg = ROAM[ud.type];
        if (!cfg || ud.onWall || ud.moving || it === ctx.held() || ctx.carried(it)) continue;
        let r = ud.roam;
        if (!r || Math.abs(it.position.x - r.x) > 0.01 || Math.abs(it.position.z - r.z) > 0.01) {
          r = ud.roam = { home: it.position.clone(), x: it.position.x, z: it.position.z, wait: rand(1, 4), target: null, room: ctx.roomAt(it.position.x, it.position.z) };
        }
        if (r.home.y - ud.baseY > 0.15) continue; // up on a couch or a shelf: stay put
        // dogs come over to say hi
        const near = cfg.follow ? nearestPerson(r.home.x, r.home.z) : null;
        if (near?.p && near.d < 6 && ctx.roomAt(near.p.x, near.p.z) === r.room) {
          const dx = it.position.x - near.p.x, dz = it.position.z - near.p.z, l = Math.hypot(dx, dz) || 1;
          r.target = l > 1.2 ? new THREE.Vector3(near.p.x + (dx / l) * 1.0, 0, near.p.z + (dz / l) * 1.0) : null;
          r.wait = 0.5;
          r.face = Math.atan2(near.p.x - it.position.x, near.p.z - it.position.z);
        } else r.face = null;
        if (!r.target) {
          r.wait -= dt;
          if (r.wait <= 0) {
            const a = rand(0, Math.PI * 2), d = rand(0.5, cfg.r);
            const x = r.home.x + Math.cos(a) * d, z = r.home.z + Math.sin(a) * d;
            if ((cfg.free || !ctx.blocked(x, z)) && ctx.roomAt(x, z) === r.room) r.target = new THREE.Vector3(x, 0, z);
            r.wait = rand(2, 6);
          }
        }
        let moving = false;
        if (r.target) {
          const dx = r.target.x - it.position.x, dz = r.target.z - it.position.z, l = Math.hypot(dx, dz);
          if (l < 0.08) r.target = null;
          else {
            const step = Math.min(l, cfg.speed * dt), nx = it.position.x + (dx / l) * step, nz = it.position.z + (dz / l) * step;
            if (!cfg.free && ctx.blocked(nx, nz)) r.target = null;
            else { it.position.x = nx; it.position.z = nz; moving = true; r.face = Math.atan2(dx, dz); }
          }
        }
        if (r.face != null) it.rotation.y += Math.atan2(Math.sin(r.face - it.rotation.y), Math.cos(r.face - it.rotation.y)) * Math.min(1, dt * 6);
        it.position.y = r.home.y + (moving ? Math.abs(Math.sin(t * 12)) * cfg.bob : 0);
        if (ud.type === 'dog' || ud.type === 'cat') {
          r.noiseIn = (r.noiseIn ?? 10 + Math.random() * 30) - dt;
          if (r.noiseIn <= 0) { r.noiseIn = 20 + Math.random() * 40; ctx.sound?.(ud.type, it.position); }
        }
        it.rotation.z = cfg.waddle && moving ? Math.sin(t * 8) * 0.15 : 0;
        r.x = it.position.x; r.z = it.position.z;
        it.updateMatrixWorld(true);
      }

      // ---- bunnies: hop, hop, pause, nibble; run away from people ----
      for (const b of bunnies) {
        const { p, d } = nearestPerson(b.g.position.x, b.g.position.z);
        if (!b.to) {
          b.wait -= dt;
          const scared = p && d < 2.5;
          if (b.wait <= 0 || scared) {
            let dir = rand(0, Math.PI * 2);
            if (scared) dir = Math.atan2(b.g.position.x - p.x, b.g.position.z - p.z) + rand(-0.5, 0.5);
            else { // drift back home if it wandered far
              const hx = b.home.x - b.g.position.x, hz = b.home.y - b.g.position.z;
              if (Math.hypot(hx, hz) > 4) dir = Math.atan2(hx, hz) + rand(-0.6, 0.6);
            }
            const len = scared ? 1.0 : 0.5;
            const nx = b.g.position.x + Math.sin(dir) * len, nz = b.g.position.z + Math.cos(dir) * len;
            if (!ctx.blocked(nx, nz) && !ctx.roomAt(nx, nz)) {
              b.from.set(b.g.position.x, b.g.position.z); b.to = new THREE.Vector2(nx, nz); b.t = 0;
              b.g.rotation.y = dir;
              b.hops = scared ? 4 : b.hops > 0 ? b.hops - 1 : Math.floor(rand(1, 4));
            }
            b.wait = b.hops > 0 ? 0.05 : rand(1.5, 5);
          } else b.g.children[1].position.y = 0.22 + Math.sin(t * 14) * 0.006; // nibble nibble
        } else {
          b.t += dt / 0.32;
          const k = Math.min(1, b.t);
          b.g.position.x = b.from.x + (b.to.x - b.from.x) * k;
          b.g.position.z = b.from.y + (b.to.y - b.from.y) * k;
          b.g.position.y = Math.sin(k * Math.PI) * 0.18;
          if (k >= 1) { b.to = null; b.g.position.y = 0; }
        }
      }

      // ---- birds: peck, then flutter away when someone comes close, and land somewhere else ----
      for (const f of flocks) {
        const { d } = nearestPerson(f.to.x, f.to.y);
        if (f.state === 'ground') {
          for (const b of f.birds) {
            b.head.rotation.x = Math.sin(t * 6 + b.ph) > 0.6 ? 0.9 : 0; // peck
            for (const w of b.wings) w.rotation.z = 0;
          }
          if (d < 3.2) {
            f.state = 'fly'; f.t = 0;
            f.from.copy(f.to);
            const a = rand(0, Math.PI * 2);
            const cand = new THREE.Vector2(f.spot.x + Math.cos(a) * rand(3, 7), f.spot.y + Math.sin(a) * rand(3, 7));
            f.to.copy(ctx.roomAt(cand.x, cand.y) ? f.spot : cand);
            ctx.flutter?.(f.from.x, f.from.y);
          }
        } else {
          f.t += dt / 2.2;
          const k = Math.min(1, f.t);
          for (const b of f.birds) {
            const x = f.from.x + (f.to.x - f.from.x) * k + b.off.x, z = f.from.y + (f.to.y - f.from.y) * k + b.off.y;
            b.g.position.set(x, Math.sin(k * Math.PI) * (2.5 + b.ph * 0.2), z);
            b.g.rotation.y = Math.atan2(f.to.x - f.from.x, f.to.y - f.from.y);
            const flap = Math.sin(t * 30 + b.ph) * 0.9;
            b.wings[0].rotation.z = flap; b.wings[1].rotation.z = -flap;
          }
          if (k >= 1) f.state = 'ground';
        }
      }
    },
  };
}
