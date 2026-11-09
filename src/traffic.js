// Cars (and a school bus) that drive around the big road loop. They keep to the right,
// stop for people, wait their turn, go around parked cars, and honk (nicely) if you stand in the road.
import { createItem } from './items.js';
import { createCharacter, animateCharacter, randomCharacter } from './character.js';
import { makeLoop } from './roads.js';

const LANE = 1.45; // how far from the middle of the road each lane is

export function setupTraffic(scene, cfg) {
  const loop = makeLoop(cfg.loop);
  const kinds = [...cfg.cars.map((c) => ['car', c]), ...(cfg.buses ?? []).map((c) => ['schoolbus', c]), ...(cfg.others ?? [])];
  // mix them up so the same kinds aren't all bunched together
  for (let i = kinds.length - 1; i > 0; i--) { const j = (i * 7 + 3) % (i + 1); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  const n = kinds.length;
  const cars = kinds.map(([type, color], i) => {
    const mesh = createItem(type, color);
    scene.add(mesh);
    // someone is driving it (so you can tell it isn't yours to drive)
    const seat = mesh.userData.seat;
    let driver = null;
    if (seat) {
      driver = createCharacter(randomCharacter({ age: 'grownup', back: 'none' }));
      const k = 0.8; // a little smaller so they fit under the roof
      driver.root.scale.setScalar(k);
      driver.root.position.set(seat.x, seat.eye - driver.eyeHeight * k, seat.z);
      mesh.add(driver.root);
    }
    const big = mesh.userData.hz > 2.8;
    return {
      mesh, dir: i % 2 ? -1 : 1, s: (i / n) * loop.L, lat: LANE, latTarget: LANE,
      v: 3, vMax: big ? 4.5 : 5 + (i % 3) * 0.9, half: mesh.userData.hz + 0.05, r: Math.max(0.9, mesh.userData.hx),
      stuck: 0, honk: 0, x: 0, z: 0, heading: 0, fx: 1, fz: 0, driver,
    };
  });

  // where a car is, from how far along the loop it is and which side of the road
  function place(c, dLat = 0, dt = 1) {
    const p = loop.at(c.s);
    const fx = p.tx * c.dir, fz = p.tz * c.dir;      // forward
    const rx = -fz, rz = fx;                        // to the car's right
    c.x = p.x + rx * c.lat; c.z = p.z + rz * c.lat;
    c.fx = fx; c.fz = fz;
    if (c.v > 0.2 || dLat) c.heading = Math.atan2(fx * c.v + rx * dLat / dt, fz * c.v + rz * dLat / dt);
  }
  cars.forEach((c) => { c.heading = 0; place(c); c.heading = Math.atan2(c.fx, c.fz); });

  const bodyOf = (c) => {
    const out = [], k = c.half - c.r;
    for (const t of [-k, 0, k]) out.push({ x: c.x + Math.sin(c.heading) * t, z: c.z + Math.cos(c.heading) * t, r: c.r });
    return out;
  };
  let cached = [];
  function circles() { return cached; }
  function refreshCircles() {
    cached = [];
    for (const c of cars) for (const b of bodyOf(c)) cached.push({ ...b, traffic: c });
  }

  // nearest thing in a strip in front of (or beside) the car. side: 0 = my lane, -2*LANE = the other lane
  function scan(c, side, from, to, obstacles) {
    let best = null, bestGap = Infinity;
    const rx = -c.fz, rz = c.fx;
    const consider = (o) => {
      const dx = o.x - c.x, dz = o.z - c.z;
      const ahead = dx * c.fx + dz * c.fz, lat = dx * rx + dz * rz;
      if (ahead < from || ahead > to) return;
      // other cars only count if they're really in this lane (wide trucks passing each other used to see each other)
      const reach = o.kind === 'traffic' ? (o.oncoming ? 1.0 : LANE) : c.r + o.r + 0.2;
      if (Math.abs(lat - side) > reach) return;
      if (o.oncoming && c.stuck > 3) return; // nose to nose for a while: let each other squeeze by
      const gap = ahead - c.half - o.r;
      if (gap < bestGap) { bestGap = gap; best = o; }
    };
    for (const o of obstacles) consider(o);
    for (const o of cars) {
      if (o === c) continue;
      const oncoming = o.fx * c.fx + o.fz * c.fz < 0;
      for (const b of bodyOf(o)) consider({ ...b, kind: 'traffic', oncoming });
    }
    return { gap: bestGap, obs: best };
  }

  return {
    cars,
    loop,
    circles,
    // obstacles: [{x, z, r, kind: 'player' | 'static'}]
    update(dt, obstacles, onHonk) {
      const near = obstacles.filter((o) => loop.dist(o.x, o.z) < 5);
      refreshCircles();
      for (const c of cars) {
        const ahead = scan(c, 0, 0, 18, near);
        let want = c.vMax;
        if (ahead.gap < 8) want = Math.max(0, (ahead.gap - 0.8) * 1.1);
        c.v += Math.max(-9 * dt, Math.min(2.5 * dt, want - c.v));
        if (c.v < 0.3 && ahead.obs) c.stuck += dt; else c.stuck = 0;

        // go around something parked in the road
        const inLane = c.latTarget > 0;
        if (inLane && c.stuck > 1.0 && ahead.obs?.kind === 'static') {
          if (scan(c, -2 * LANE, -9, 30, near).gap > 25) c.latTarget = -LANE;
        }
        if (!inLane && !scan(c, 2 * LANE, -c.half - 3, c.half + 7, near).obs) c.latTarget = LANE;

        c.honk -= dt;
        if (ahead.obs?.kind === 'player' && c.stuck > 2.0 && c.honk <= 0) { c.honk = 5; onHonk?.(c.x, c.z); }

        const dLat = Math.max(-1.6 * dt, Math.min(1.6 * dt, c.latTarget - c.lat));
        c.lat += dLat;
        c.s += c.dir * c.v * dt;
        place(c, dLat, dt);
        c.mesh.position.set(c.x, 0, c.z);
        c.mesh.rotation.y = c.heading;
        if (c.driver) { // hands on the wheel, legs tucked in
          animateCharacter(c.driver, performance.now() / 1000 + c.s, 0, true);
          c.driver.parts.legL.rotation.x = c.driver.parts.legR.rotation.x = -Math.PI / 2;
        }
      }
    },
  };
}
