// ---------- Small shared helpers ----------
const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  dist: (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz),
  hash(x, y) {
    let h = (x | 0) * 374761393 + (y | 0) * 668265263;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  },
  noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const s = (t) => t * t * (3 - 2 * t);
    const a = U.hash(xi, yi), b = U.hash(xi + 1, yi), c = U.hash(xi, yi + 1), d = U.hash(xi + 1, yi + 1);
    const u = s(xf), v = s(yf);
    return U.lerp(U.lerp(a, b, u), U.lerp(c, d, u), v);
  },
  fbm(x, y, oct = 3) {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += U.noise(x * f, y * f) * amp; amp *= 0.5; f *= 2; }
    return v;
  },
  segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const L = dx * dx + dz * dz;
    let t = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0;
    t = U.clamp(t, 0, 1);
    return { d: Math.hypot(px - (ax + dx * t), pz - (az + dz * t)), t };
  },
  shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f >= 1) { r += (255 - r) * (f - 1); g += (255 - g) * (f - 1); b += (255 - b) * (f - 1); }
    else { r *= f; g *= f; b *= f; }
    const h = (v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return '#' + h(r) + h(g) + h(b);
  },
  angDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  },
};
if (typeof module !== 'undefined') module.exports = U;
