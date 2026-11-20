// Feste Welt für die eigene Physik: Höhenfeld + Kisten/Rampen/Säulen in einem Raster.
// Kisten sind gedrehte Quader; Rampen sind Quader mit schräger Oberseite (steigt entlang lokal +z).
export const SEA = 0;
export const T = { N: 0, S: 0, X0: 0, Z0: 0, H: null };   // Höhenfeld
export const solids = [];
const CELL = 8, grid = new Map();
const key = (i, j) => i * 4096 + j;

export function setTerrain(n, step, x0, z0, heights) { T.N = n; T.S = step; T.X0 = x0; T.Z0 = z0; T.H = heights; }

// Höhe des Geländes, gleiche Dreiecksaufteilung wie das Gelände-Mesh
export function terrainY(x, z) {
  const { N, S, X0, Z0, H } = T;
  let fx = (x - X0) / S, fz = (z - Z0) / S;
  if (fx < 0 || fz < 0 || fx >= N - 1 || fz >= N - 1) return -8;
  const i = Math.floor(fx), j = Math.floor(fz); fx -= i; fz -= j;
  const a = H[j * N + i], b = H[j * N + i + 1], c = H[(j + 1) * N + i], d = H[(j + 1) * N + i + 1];
  if (fx + fz <= 1) return a + (b - a) * fx + (c - a) * fz;
  return d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}

// Kiste: { x, z, rot, hx, hz, y0, y1, rise (Rampe), kind, bounce }
export function addBox(o) {
  o.c = Math.cos(o.rot || 0); o.s = Math.sin(o.rot || 0); o.rise = o.rise || 0;
  if (o.circle) { o.hx = o.hz = o.r; }
  const R = Math.hypot(o.hx, o.hz);
  for (let i = Math.floor((o.x - R) / CELL); i <= Math.floor((o.x + R) / CELL); i++)
    for (let j = Math.floor((o.z - R) / CELL); j <= Math.floor((o.z + R) / CELL); j++) {
      const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(o);
    }
  solids.push(o); return o;
}
export function near(x, z) { return grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || []; }
// in lokale Koordinaten
function loc(o, x, z) { const dx = x - o.x, dz = z - o.z; return [dx * o.c - dz * o.s, dx * o.s + dz * o.c]; }
export function topAt(o, lz) { return o.rise ? o.y0 + (o.y1 - o.y0) * ((lz / o.hz + 1) / 2) : o.y1; }

// Boden unter einem Punkt: Gelände oder Oberseite einer Kiste, auf die man (von oben) passt
export function groundAt(x, y, z, step = 0.45) {
  let g = terrainY(x, z), hit = null;
  for (const o of near(x, z)) {
    let top;
    if (o.circle) { if (Math.hypot(x - o.x, z - o.z) > o.r) continue; top = o.y1; }
    else { const [lx, lz] = loc(o, x, z); if (Math.abs(lx) > o.hx || Math.abs(lz) > o.hz) continue; top = topAt(o, lz); }
    if (top <= y + step && top > g) { g = top; hit = o; }
  }
  return [g, hit];
}

// Seitlich aus Kisten herausschieben. p: {x,y,z}, r: Radius, foot: Unterkante. Gibt Normale der stärksten Kollision zurück.
export function pushOut(p, r, foot, step = 0.45) {
  let nx = 0, nz = 0, hit = null;
  for (const o of near(p.x, p.z)) {
    if (foot > o.y1 - 0.01 && !o.rise) continue;
    if (o.circle) {
      if (foot + step > o.y1) continue;
      const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = o.r + r;
      if (d < m && d > 1e-5) { const k = (m - d) / d; p.x += dx * k; p.z += dz * k; nx = dx / d; nz = dz / d; hit = o; }
      continue;
    }
    const [lx, lz] = loc(o, p.x, p.z);
    if (foot < o.y0 - 0.3) continue;
    if (foot + step > topAt(o, Math.max(-o.hz, Math.min(o.hz, lz)))) continue;
    const cx = Math.max(-o.hx, Math.min(o.hx, lx)), cz = Math.max(-o.hz, Math.min(o.hz, lz));
    let dx = lx - cx, dz = lz - cz, d = Math.hypot(dx, dz);
    let px, pz;
    if (d > 1e-5) { if (d >= r) continue; px = dx / d * (r - d); pz = dz / d * (r - d); dx /= d; dz /= d; }
    else { // Mittelpunkt drin: kürzester Weg hinaus
      const ex = o.hx - Math.abs(lx), ez = o.hz - Math.abs(lz);
      if (ex < ez) { dx = Math.sign(lx) || 1; dz = 0; px = dx * (ex + r); pz = 0; } else { dz = Math.sign(lz) || 1; dx = 0; pz = dz * (ez + r); px = 0; }
    }
    // zurück in Weltkoordinaten (Inverse der Drehung)
    const wx = px * o.c + pz * o.s, wz = -px * o.s + pz * o.c;
    p.x += wx; p.z += wz; nx = dx * o.c + dz * o.s; nz = -dx * o.s + dz * o.c; hit = o;
  }
  return hit ? { nx, nz, o: hit } : null;
}

// Decke: stösst man von unten an eine Kiste?
export function ceilingAt(x, y, z) {
  for (const o of near(x, z)) {
    if (o.circle || o.rise) continue;
    const [lx, lz] = loc(o, x, z); if (Math.abs(lx) > o.hx || Math.abs(lz) > o.hz) continue;
    if (y < o.y0 && y > o.y0 - 0.6) return o.y0;
  }
  return Infinity;
}
