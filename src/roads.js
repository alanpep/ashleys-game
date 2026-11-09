// The big road loop: Kenwood Ave in front of the houses, then around the back of town.
// It's a rectangle with rounded corners. Positions along it are measured in meters ("s").

export function makeLoop({ x0, x1, z0, z1, R }, step = 0.5) {
  const pts = [];
  const seg = (ax, az, bx, bz) => {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let i = 0; i < n; i++) pts.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
  };
  const arc = (cx, cz, a0, a1) => {
    const n = Math.max(1, Math.ceil((Math.abs(a1 - a0) * R) / step));
    for (let i = 0; i < n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]); }
  };
  seg(x0 + R, z1, x1 - R, z1);            // Kenwood Ave (heading +x)
  arc(x1 - R, z1 - R, Math.PI / 2, 0);
  seg(x1, z1 - R, x1, z0 + R);            // east side
  arc(x1 - R, z0 + R, 0, -Math.PI / 2);
  seg(x1 - R, z0, x0 + R, z0);            // back street
  arc(x0 + R, z0 + R, -Math.PI / 2, -Math.PI);
  seg(x0, z0 + R, x0, z1 - R);            // west side
  arc(x0 + R, z1 - R, -Math.PI, -1.5 * Math.PI);

  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const L = cum[pts.length];

  // point and direction at distance s along the loop
  function at(s) {
    s = ((s % L) + L) % L;
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid - 1; }
    const a = pts[lo], b = pts[(lo + 1) % pts.length];
    const len = cum[lo + 1] - cum[lo] || 1, u = (s - cum[lo]) / len;
    const tx = (b[0] - a[0]) / len, tz = (b[1] - a[1]) / len;
    return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, tx, tz };
  }

  // how far a spot is from the middle of the road
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = (x1 - x0) / 2, hh = (z1 - z0) / 2;
  function dist(x, z) {
    const px = Math.abs(x - cx) - (hw - R), pz = Math.abs(z - cz) - (hh - R);
    return Math.abs(Math.hypot(Math.max(px, 0), Math.max(pz, 0)) + Math.min(Math.max(px, pz), 0) - R);
  }

  return { pts, L, at, dist };
}
