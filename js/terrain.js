// HOCHDRUCK – Landschaft: Wolkenwil liegt auf einer Bergkuppe. Rundherum Wald, dann geht es steil hinunter
// ins Tal mit Feldern, Fluss, See und einem Nachbardorf. Dahinter stehen die grossen Berge.
// Unter dem Dorf ziehen Wolken durchs Tal – darum braucht es hier ein Wolkenamt.
import * as THREE from 'three';
import { PAL } from './palette.js';
import { toon, gradient } from './toon.js';
import { pathDist } from './paths.js';

// ---------------- Rauschen ----------------
function hash(x, z) { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; } return s; }
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Abstand ausserhalb der flachen Kuppe (abgerundetes Rechteck um das Dorf)
export const PL = { cx: 0, cz: 6, hx: 56, hz: 62, r: 14 };
export function plateauDist(x, z) {
  const qx = Math.abs(x - PL.cx) - (PL.hx - PL.r), qz = Math.abs(z - PL.cz) - (PL.hz - PL.r);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - PL.r;
}
// Das Tal läuft von Süden (hinten, Talschluss) nach Norden (vorne, talauswärts). Der Fluss fliesst nach Norden.
export const VALLEY = -72;
export const floorY = z => -52 + z * 0.016;
export const riverX = z => 140 + Math.sin(z * 0.011) * 13 + Math.sin(z * 0.027 + 1) * 5;
export const roadX = z => -122 + Math.sin(z * 0.009 + 2) * 10;
export const railX = z => -150 + Math.sin(z * 0.007) * 6;
// Hügel links und rechts vom Tal: von Hand gesetzte, runde Kuppen (keine Felswände)
const HILLS = (() => {
  const L = []; let sd = 7; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (const side of [-1, 1]) {
    for (let z = -1050; z < 450; z += 95 + r() * 40) L.push([side * (205 + r() * 60), z, 70 + r() * 35, 38 + r() * 42]);
    for (let z = -1100; z < 500; z += 130 + r() * 60) L.push([side * (330 + r() * 90), z, 110 + r() * 50, 70 + r() * 70]);
    for (let z = -1150; z < 550; z += 170 + r() * 80) L.push([side * (560 + r() * 160), z, 170 + r() * 80, 110 + r() * 90]);
  }
  for (let x = -500; x <= 500; x += 120 + r() * 50) L.push([x, 330 + r() * 120, 120 + r() * 40, 80 + r() * 70]);
  return L;
})();
function baseH(x, z) {
  let h = floorY(z) + (fbm(x * 0.012, z * 0.012) - 0.5) * 4;
  // Flussrinne
  const rd = Math.abs(x - riverX(z)); h -= 3.2 * (1 - sstep(3, 10, rd));
  // Hügel
  for (const [hx, hz, r, ht] of HILLS) { const dx = x - hx; if (dx > r * 2.45 || dx < -r * 2.45) continue; const dz = z - hz, d2 = (dx * dx + dz * dz) / (r * r); if (d2 < 6) h += ht * Math.exp(-d2 * 1.35); }
  // sanfter Anstieg zu den Talflanken und zum Talschluss, kleine Wellen
  const ax = Math.abs(x);
  h += sstep(160, 700, ax) * 55 + sstep(260, 650, z) * 60 + (fbm(x * 0.02 + 5, z * 0.02) - 0.5) * 14 * sstep(150, 260, ax);
  return h;
}
export function terrainH(x, z) {
  const d = plateauDist(x, z) + (fbm(x * 0.03, z * 0.03) - 0.5) * 10;
  if (d <= 0) return -0.03;
  const base = baseH(x, z);
  // Kuppe: kurz wellig, dann steil hinunter bis auf den Talboden
  let prof = (fbm(x * 0.08, z * 0.08) - 0.5) * 1.6 * sstep(0, 6, d) - 1.2 * sstep(0, 6, d);
  prof += (base - prof) * sstep(5, 72, d) + (fbm(x * 0.02 + 7, z * 0.02) - 0.5) * 9 * sstep(12, 45, d) * (1 - sstep(55, 75, d));
  return Math.max(prof, base);
}

// ---------------- Farben ----------------
const C = s => new THREE.Color(s);
const GR = [C('#6F8F4E'), C('#7E9C55'), C('#62824A'), C('#86A25C')], WALD = C('#4C6B3C'), ALP = C('#8AA45E'), FELS = C('#868276'), FELS2 = C('#7C8E9C'),
  SCHNEE = C(PAL.schnee), WASSER = C('#6F9BB8'), ACKER = [C('#C9B26A'), C('#8DAA5E'), C('#9C7B4E'), C('#A9B963'), C('#7E9C55')], WEG = C('#B7A98A'), STRASSE = C('#8B8A84'), SCHOTTER = C('#7A6A58'), FELS3 = C('#5E6870'), GEROELL = C('#A8A598'), ROCK_L = C('#A39C8E'), ROCK_M = C('#878A86'), ROCK_D = C('#5C6670'), LEDGE = C('#6E8A4C');
// Farben im Stil von hellen, saftigen Spielwelten: weiche Übergänge, kräftiges Grün, klares Wasser
const LUSH = [C('#7DBA4C'), C('#8FC95A'), C('#6AA944')], FOREST = C('#4E8B3A'), ROCK = C('#A7A59C'), SAND = C('#E3D29A'), LUSH_HIGH = C('#A9CF78'), ROAD = C('#8E8C86'), RAILB = C('#8A7A66');
function colorAt(x, z, h, slope, d) {
  const n = fbm(x * 0.02, z * 0.02), n2 = fbm(x * 0.08 + 3, z * 0.08, 3);
  const c = LUSH[0].clone().lerp(LUSH[1], sstep(0.35, 0.65, n)).lerp(LUSH[2], sstep(0.55, 0.8, n2) * 0.35);
  if (d <= 0) return c;
  const fy = floorY(z);
  if (h < fy + 5) {
    const rd = Math.abs(x - riverX(z));
    if (rd < 7.5) return SAND.clone().lerp(c, sstep(5.5, 7.5, rd));
    if (Math.abs(x - roadX(z)) < 2.6) return ROAD.clone();
    if (Math.abs(x - railX(z)) < 2.3) return RAILB.clone();
    return c;
  }
  if (d < 75 && Math.abs(x) < 190) {
    c.lerp(FOREST, 0.5 * sstep(4, 10, d) * sstep(0.45, 0.62, n2));
    if (slope > 1.1) c.lerp(ROCK, sstep(1.1, 1.8, slope) * 0.6);
    return c;
  }
  if (patchCell(x, z).forest) c.lerp(FOREST, 0.7);
  if (slope > 1.3) c.lerp(ROCK, sstep(1.3, 2.0, slope) * 0.6);
  if (h > fy + 200) c.lerp(LUSH_HIGH, 0.4);
  return c;
}
// Wiesenstücke als unregelmässige Zellen (Voronoi), jede Zelle eine Farbe; manche sind Wald
const MEADOW = [C('#7FA055'), C('#8DAA5E'), C('#6F9450'), C('#98B266'), C('#87A35A'), C('#B9B46A')], HECKE = C('#46653A'), WALD2 = C('#3F5F36');
export function patchCell(x, z) {
  const S = 46, gx = Math.floor(x / S), gz = Math.floor(z / S); let b1 = 1e9, b2 = 1e9, id = 0, cx = 0, cz = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const px = (gx + i + 0.15 + hash(gx + i, gz + j) * 0.7) * S, pz = (gz + j + 0.15 + hash(gz + j + 71, gx + i - 13) * 0.7) * S, d = Math.hypot(x - px, z - pz);
    if (d < b1) { b2 = b1; b1 = d; id = (gx + i) * 7919 + (gz + j); cx = px; cz = pz; } else if (d < b2) b2 = d;
  }
  const hv = hash(id, 3), fr = fbm(cx * 0.006 + 3, cz * 0.006, 3);
  const forest = (Math.abs(cx) > 150 || cz > 240) && (hv < 0.18 + sstep(0.45, 0.7, fr) * 0.55);
  return { id, edge: b2 - b1, forest, tone: Math.floor(hash(id, 9) * MEADOW.length), stripes: hash(id, 5) < 0.45, ang: hash(id, 11) * 3.14 };
}
let edgeW = 2.2;
function patchColor(x, z, h, slope) {
  const P = patchCell(x, z);
  if (P.forest) return WALD2.clone().lerp(WALD, hash(P.id, 2) * 0.6);
  if (P.edge < edgeW && edgeW < 4) return HECKE.clone();
  let c = MEADOW[P.tone === 5 && hash(P.id, 4) > 0.5 ? 0 : P.tone].clone();
  if (P.stripes && edgeW < 4 && Math.floor((x * Math.cos(P.ang) + z * Math.sin(P.ang)) / 3.2) % 2) c.lerp(C('#A9C070'), 0.25);
  if (slope > 1.3) c.lerp(FELS, sstep(1.3, 2.0, slope) * 0.45);
  if (h > floorY(z) + 230) c.lerp(ALP, 0.5);
  return c;
}

// ---------------- Gelände bauen ----------------
function terrainMesh(size, seg, cx, cz, hole) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const P = geo.attributes.position, col = new Float32Array(P.count * 3), e = size / seg, row = seg + 1, H = new Float32Array(P.count);
  // zuerst alle Höhen, dann die Neigung aus den Nachbarpunkten (spart zwei Drittel der Höhenberechnungen)
  for (let i = 0; i < P.count; i++) H[i] = terrainH(P.getX(i) + cx, P.getZ(i) + cz);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) + cx, z = P.getZ(i) + cz, h = H[i];
    // Wo das feine Stück liegt, das grobe weit absenken (sonst schaut es an Hangfüssen durch)
    const sink = hole && Math.abs(x - hole.x) < hole.s / 2 - 12 && Math.abs(z - hole.z) < hole.s / 2 - 12 ? 40 : 0;
    P.setXYZ(i, x, h - sink, z);
    const cxI = i % row, nx = cxI < seg ? H[i + 1] - h : h - H[i - 1], nz = i + row < P.count ? H[i + row] - h : h - H[i - row];
    const sl = Math.hypot(nx, nz) / e;
    const c = colorAt(x, z, h, sl, plateauDist(x, z)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}
const terrainMat = () => new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: gradient });

// Bäume als ein Stück Geometrie mit Farben (für InstancedMesh): runde Tanne und Kugelbaum, weich schattiert
function merged(parts) {
  const n = parts.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0; for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
function part(g, color, y, sy = 1) { g = g.toNonIndexed(); g.scale(1, sy, 1); g.translate(0, y, 0); const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
export function pineGeo() {
  return merged([part(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 7), '#8A5A36', 0.3),
    part(new THREE.ConeGeometry(0.85, 1.3, 12), '#3F8A3E', 1.05), part(new THREE.ConeGeometry(0.68, 1.15, 12), '#4A9A45', 1.7), part(new THREE.ConeGeometry(0.48, 1.0, 12), '#58AA4E', 2.3)]);
}
export function roundGeo() {
  return merged([part(new THREE.CylinderGeometry(0.13, 0.19, 1.3, 7), '#8A5A36', 0.65),
    part(new THREE.SphereGeometry(0.95, 12, 9), '#5FA845', 2.05, 0.92), part(new THREE.SphereGeometry(0.6, 10, 8).translate(0.45, 0.35, 0.25), '#72B851', 2.15)]);
}
function forest(w) {
  const mat = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: gradient });
  const spots = [];
  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // dichter Wald am Kuppenrand und an den Hängen
  for (let tries = 0; tries < 26000 && spots.length < 1900; tries++) {
    const a = rnd() * Math.PI * 2, rr = 50 + rnd() * 120, x = Math.cos(a) * rr * 1.1, z = Math.sin(a) * rr * 1.25 + 6;
    const d = plateauDist(x, z);
    if (d < 3 || d > 70) continue;
    // Richtung Norden (Blickrichtung) lichter, damit man ins Tal sieht
    const north = Math.exp(-Math.pow(Math.atan2(x, -z) / 0.55, 2));
    if (north > 0.4 && d < 18) continue;
    const dens = (1 - sstep(45, 70, d)) * sstep(3, 12, d) * (0.45 + fbm(x * 0.05, z * 0.05) * 0.9) * (1 - north * 0.7);
    if (rnd() > dens) continue;
    const h = terrainH(x, z), sl = Math.abs(terrainH(x + 2, z) - h) + Math.abs(terrainH(x, z + 2) - h);
    if (sl > 5.5) continue;
    spots.push([x, h, z, 1.7 + rnd() * 1.5 + d * 0.06]);
  }
  // Waldstücke auf den Hügeln (dicht, nur in Waldzellen) und einzelne Bäume an Hecken
  for (let tries = 0; tries < 110000 && spots.length < 7400; tries++) {
    const south = rnd() < 0.18, x = south ? (rnd() - 0.5) * 900 : (rnd() < 0.5 ? -1 : 1) * (160 + rnd() * 560), z = south ? 250 + rnd() * 380 : -1000 + rnd() * 1450;
    if (plateauDist(x, z) < 70) continue;
    const P = patchCell(x, z), h = terrainH(x, z);
    if (P.forest) { if (P.edge < 1.5) continue; spots.push([x, h, z, 5 + rnd() * 3.5]); continue; }
    if (P.edge < 3 && rnd() < 0.08) spots.push([x, h, z, 4 + rnd() * 2.5]);
  }
  for (let k = 0; k < 220; k++) { const z = -700 + rnd() * 900, x = riverX(z) + (rnd() < 0.5 ? -1 : 1) * (9 + rnd() * 5); spots.push([x, terrainH(x, z), z, 3 + rnd() * 2]); }
  // gemischt: Tannen und runde Laubbäume, jeder Baum leicht andere Farbe
  const isRound = spots.map(([x, , z], i) => hash(Math.floor(x * 3), Math.floor(z * 3)) < (plateauDist(x, z) < 70 ? 0.3 : 0.45));
  const mkI = (geo, list) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); im.castShadow = false; im.receiveShadow = true; w.scene.add(im); return im; };
  const P = spots.filter((_, i) => !isRound[i]), R = spots.filter((_, i) => isRound[i]);
  const ip = mkI(pineGeo(), P), ir = mkI(roundGeo(), R), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  const put = (im, list, round) => list.forEach(([x, h, z, sc], i) => {
    q.setFromAxisAngle(up, (i * 2.399) % 6.28); const k = round ? sc * 0.85 : sc; s.set(k, k * (0.9 + (i % 5) * 0.06), k); p.set(x, h - 0.1, z); m.compose(p, q, s); im.setMatrixAt(i, m);
    col.setHSL(0, 0, 1).offsetHSL(0, 0, 0); const v = 0.86 + hash(i, round ? 7 : 3) * 0.28; col.setRGB(v, v * (0.97 + hash(i, 9) * 0.06), v * 0.95); im.setColorAt(i, col);
  });
  put(ip, P, false); put(ir, R, true);
  return [ip, ir];
}
function grassTufts(w) {
  // Grasbüschel und Blümchen auf der Dorfwiese (nicht auf Platz, Wegen, Häusern)
  const tuft = new THREE.ConeGeometry(0.07, 0.28, 3); tuft.translate(0, 0.14, 0);
  const n = 2600, im = new THREE.InstancedMesh(tuft, toon('#5E9A3E'), n), fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 5, 4), toon(PAL.schnee), 700), fy = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 5, 4), toon('#E6C64A'), 500);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const free = (x, z) => !(Math.abs(x) < 9.6 && z > 5.3 && z < 19.6) && !(Math.abs(x) < 7 && z > -5.5 && z < 5.6) && !(x < -9.5 && x > -16.5 && z > 9 && z < 17) && !(w.houses || []).some(g => Math.hypot(g.position.x - x, g.position.z - z) < 3.2) && pathDist(x, z) > 1.3 && plateauDist(x, z) < -3;
  let k = 0, kf = 0, ky = 0;
  for (let t = 0; t < 26000 && k < n; t++) {
    const x = (rnd() - 0.5) * 108, z = -52 + rnd() * 118;
    if (!free(x, z)) continue;
    const cl = fbm(x * 0.3, z * 0.3); if (rnd() > cl * 1.4) continue;
    for (let j = 0; j < 3 && k < n; j++) { q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.5, rnd() * 6, (rnd() - 0.5) * 0.5)); const sc = 0.7 + rnd() * 0.8; s.set(sc, sc, sc); p.set(x + (rnd() - 0.5) * 0.3, 0, z + (rnd() - 0.5) * 0.3); m.compose(p, q, s); im.setMatrixAt(k++, m); }
    if (rnd() < 0.3 && kf < 700) { p.set(x + 0.3, 0.12, z); s.set(1, 1, 1); q.identity(); m.compose(p, q, s); fl.setMatrixAt(kf++, m); }
    else if (rnd() < 0.25 && ky < 500) { p.set(x - 0.3, 0.1, z + 0.2); s.set(1, 1, 1); q.identity(); m.compose(p, q, s); fy.setMatrixAt(ky++, m); }
  }
  im.count = k; fl.count = kf; fy.count = ky;
  for (const o of [im, fl, fy]) { o.receiveShadow = true; w.scene.add(o); }
  return [im, fl, fy];
}
function mountainsFar(w) {
  // Ganz hinten ein Ring aus Bergketten mit gezackten Gipfeln, Schnee oben, im Dunst bläulich.
  // Richtung Norden (Talausgang) niedriger, damit man weit hinaus sieht.
  const CZ = -300, N = 420, rows = [[1500, 0, -60], [1700, 0.55, 0], [1850, 1, 0], [2000, 0.75, 0], [2200, 0.3, 0]];
  const pos = [], col = [], idx = [];
  const rock = C('#8E9DAB'), rock2 = C('#7D8C9B'), snow = C('#EEF2F4'), lowc = C('#7F9384');
  const hAt = (a) => {
    const nx = Math.cos(a) * 3, nz = Math.sin(a) * 3;
    const r1 = 1 - Math.abs(fbm(nx + 11, nz + 4, 5) * 2 - 1), r2 = fbm(nx * 4 + 2, nz * 4 - 7, 3);
    const north = Math.exp(-Math.pow(Math.atan2(Math.cos(a), -Math.sin(a)) / 0.5, 2));   // a zeigt nach -z
    return (150 + r1 * r1 * 380 + r2 * 80) * (1 - north * 0.55);
  };
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2, ph = hAt(a);
    rows.forEach(([r, k, y0], j) => {
      const jag = j === 2 ? (fbm(i * 0.9, 3.3, 2) - 0.5) * 90 : (fbm(i * 0.5, j * 5.1, 2) - 0.5) * 40;
      const y = y0 + (k ? ph * k + jag * k : -120);
      pos.push(Math.cos(a) * r, y, CZ + Math.sin(a) * r);
      const c = (y > 300 + (fbm(i * 0.4, j) - 0.5) * 100 ? snow : (j % 2 ? rock : rock2)).clone();
      if (k < 0.5) c.lerp(lowc, 0.5);
      col.push(c.r, c.g, c.b);
    });
  }
  const R = rows.length;
  for (let i = 0; i < N; i++) for (let j = 0; j < R - 1; j++) { const a = i * R + j, b = a + R; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  let geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
  geo = geo.toNonIndexed(); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: gradient, side: THREE.DoubleSide }));
  w.scene.add(m); return m;
}
// Alphütten auf den Weiden an den Bergflanken
function alpHuts(w) {
  let seed = 77; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const spots = [];
  for (let t = 0; t < 12000 && spots.length < 46; t++) {
    const side = rnd() < 0.5 ? -1 : 1, x = side * (185 + rnd() * 420), z = -950 + rnd() * 1300, h = terrainH(x, z);
    const sl = (Math.abs(terrainH(x + 6, z) - h) + Math.abs(terrainH(x, z + 6) - h)) / 6;
    if (sl > 0.35 || h < floorY(z) + 10 || patchCell(x, z).forest) continue;
    if (spots.some(p => Math.hypot(p[0] - x, p[2] - z) < 70)) continue;
    spots.push([x, h, z, rnd() * 6.28, 1.2 + rnd() * 0.7]);
  }
  const body = new THREE.BoxGeometry(6, 3.2, 4.6); body.translate(0, 1.6, 0);
  const shape = new THREE.Shape(); shape.moveTo(-3.9, 0); shape.lineTo(3.9, 0); shape.lineTo(0, 2.4); shape.closePath();
  const roof = new THREE.ExtrudeGeometry(shape, { depth: 6.2, bevelEnabled: false }); roof.scale(1.15, 1.25, 1); roof.translate(0, 3.1, -3.1);
  const mk = (g, c) => { const im = new THREE.InstancedMesh(g, toon(c), spots.length); w.scene.add(im); return im; };
  const A = mk(body, '#E6DDC6'), B = mk(roof, '#8A4E2E'), m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  spots.forEach(([x, h, z, r, k], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r); sc.setScalar(k); p.set(x, h - 0.4, z); m.compose(p, q, sc); A.setMatrixAt(i, m); B.setMatrixAt(i, m); });
  return [A, B];
}
// Felsbrocken am Rand der Kuppe und auf den Weiden
function boulders(w) {
  let seed = 31; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const geo = new THREE.SphereGeometry(1, 9, 7), im = new THREE.InstancedMesh(geo, toon('#A3A39B'), 140);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(); let k = 0;
  for (let t = 0; t < 6000 && k < 140; t++) {
    const a = rnd() * 6.28, rr = 50 + rnd() * 70, x = Math.cos(a) * rr * 1.1, z = Math.sin(a) * rr * 1.25 + 6;
    const d = plateauDist(x, z); if (d < 1 || d > 40) continue;
    const h = terrainH(x, z), sc = 0.4 + rnd() * rnd() * 2.6;
    q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)); s.set(sc * (1 + rnd() * 0.5), sc * 0.7, sc); p.set(x, h + sc * 0.2, z); m.compose(p, q, s); im.setMatrixAt(k++, m);
  }
  im.count = k; im.receiveShadow = true; w.scene.add(im); return im;
}
// Band entlang einer Kurve x = f(z) (Fluss, Strasse), leicht über dem Gelände
function ribbon(w, fx, z0, z1, width, color, lift, step = 6) {
  const pos = [], idx = []; let n = 0;
  for (let z = z0; z <= z1; z += step) {
    const x = fx(z), y = terrainH(x, z) + lift;
    pos.push(x - width / 2, terrainH(x - width / 2, z) + lift, z, x + width / 2, terrainH(x + width / 2, z) + lift, z);
    if (n) idx.push(2 * n - 2, 2 * n, 2 * n - 1, 2 * n - 1, 2 * n, 2 * n + 1);
    n++;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, toon(color)); m.receiveShadow = true; w.scene.add(m); return m;
}
function riverAndRoads(w) {
  // Fluss: Wasserband und helle Schaumstreifen
  w.river = ribbon(w, riverX, -1000, 230, 9.5, '#4DB6E0', 0.5, 5);
  ribbon(w, z => riverX(z) - 2.5, -1000, 230, 0.5, '#C9EEF8', 0.56, 9);
  ribbon(w, z => riverX(z) + 2.2, -1000, 230, 0.4, '#B9D3E2', 0.56, 11);
  ribbon(w, roadX, -1000, 230, 4.2, '#8B8A84', 0.25, 6);
  ribbon(w, z => roadX(z), -1000, 230, 0.18, '#E8E3D2', 0.3, 6);
  // Bahn: Schotterbett, Schwellen als Linien, zwei Schienen
  ribbon(w, railX, -1000, 230, 3.6, '#7A6A58', 0.2, 6);
  for (const o of [-0.7, 0.7]) ribbon(w, z => railX(z) + o, -1000, 230, 0.14, '#4A4E52', 0.42, 6);
  // Fahrleitungsmasten
  for (let z = -900; z < 230; z += 40) { const x = railX(z) - 2.4, y = terrainH(x, z); w.box(0.25, 6, 0.25, '#4A4E52', x, y, z, { cast: false }); w.box(2.6, 0.18, 0.18, '#4A4E52', x + 1.2, y + 5.6, z, { cast: false }); }
  // Seitenstrasse mit Brücke zum Dorf am Osthang
  const bz = -150, bx = riverX(bz), by = floorY(bz);
  const side = new THREE.Mesh(new THREE.BoxGeometry(195 - roadX(bz) + 0, 0.3, 4), toon('#8B8A84'));
  side.position.set((roadX(bz) + 195) / 2, by + 0.2, bz); w.scene.add(side);
  const br = new THREE.Group(); br.position.set(bx, by, bz); w.scene.add(br);
  w.box(16, 0.6, 5, PAL.papier, 0, 2.2, 0, { parent: br, line: 0.02 });
  for (const s of [-1, 1]) { w.box(16, 0.8, 0.3, PAL.papier, 0, 2.8, s * 2.4, { parent: br }); w.box(1.2, 2.4, 4.6, PAL.papier, s * 7.4, 0, 0, { parent: br }); }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.6, 6, 16, Math.PI), toon(PAL.papier)); arch.position.set(0, -2, 0); arch.scale.y = 0.85; br.add(arch);
}
function lake(w) {
  const z0 = -470, x0 = riverX(z0) - 30, y = floorY(z0) - 1.2;
  const geo = new THREE.CircleGeometry(1, 40); geo.rotateX(-Math.PI / 2);
  const P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const a = Math.atan2(P.getZ(i), P.getX(i)), r = Math.hypot(P.getX(i), P.getZ(i)) * (1 + Math.sin(a * 3) * 0.12 + Math.sin(a * 5) * 0.06); P.setXYZ(i, Math.cos(a) * r, 0, Math.sin(a) * r); }
  const m = new THREE.Mesh(geo, toon('#4DB6E0')); m.scale.set(70, 1, 110); m.position.set(x0, y + 1.6, z0); w.scene.add(m);
  const rim = new THREE.Mesh(geo, toon('#E3D29A')); rim.scale.set(73, 1, 113); rim.position.set(x0, y + 1.5, z0); w.scene.add(rim);
  // Bootssteg und zwei Ruderboote
  w.box(3, 0.3, 14, PAL.chalet, x0 + 66, y + 1.9, z0 + 8, { cast: false });
  for (const [dx, dz] of [[-20, 30], [12, -40]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon(PAL.rot)); b.rotation.x = Math.PI; b.scale.set(0.8, 0.5, 1.8); b.position.set(x0 + dx, y + 2.2, z0 + dz); w.scene.add(b); }
}
function valleyVillage(w, cx, cz, n = 14, seed0 = 77) {
  let seed = seed0; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < n; i++) {
    const x = cx + (rnd() - 0.5) * 40, z = cz + (rnd() - 0.5) * 30, h = terrainH(x, z), s = 2.3;
    const g = new THREE.Group(); g.position.set(x, h - 0.4, z); g.rotation.y = Math.round(rnd() * 4) * Math.PI / 2 + (rnd() - 0.5) * 0.3; g.scale.setScalar(s); w.scene.add(g);
    w.box(3, 2.4, 2.6, rnd() < 0.5 ? PAL.schnee : PAL.chalet, 0, 0, 0, { parent: g, cast: false });
    w.gable(3.7, 1.6, 3.1, rnd() < 0.4 ? PAL.rot : PAL.tinte, 0, 2.4, 0, 0, g);
    w.box(0.5, 0.6, 0.06, PAL.tinte, 0.6, 1.0, 1.31, { parent: g, cast: false });
  }
  const ch = new THREE.Group(); ch.position.set(cx + 6, terrainH(cx + 6, cz - 4) - 0.4, cz - 4); ch.scale.setScalar(2.5); w.scene.add(ch);
  w.box(2.2, 6, 2.2, PAL.schnee, 0, 0, 0, { parent: ch, cast: false });
  const sp = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 4), toon('#7A3526')); sp.rotation.y = Math.PI / 4; sp.position.y = 8; ch.add(sp);
}
function waterfall(w) {
  // Wasserfall am Osthang, der in den Fluss mündet
  const z = -60, xb = riverX(z) + 6, xt = 255, yb = floorY(z), yt = terrainH(xt, z);
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#CFE2EC'; c.fillRect(0, 0, 32, 128); c.fillStyle = '#FFFFFF'; for (let i = 0; i < 40; i++) c.fillRect((i * 13) % 32, (i * 29) % 128, 2 + (i % 3), 10 + (i % 5) * 6);
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1);
  // Band, das dem Hang folgt (von unten nach oben), leicht über dem Boden
  const pos = [], uv = [], idx = [], N = 40;
  for (let k = 0; k <= N; k++) {
    const x = xb + (xt - xb) * k / N, y = Math.max(terrainH(x, z - 2.5), terrainH(x, z + 2.5), terrainH(x, z)) + 1.0;
    pos.push(x, y, z - 2.5, x, y, z + 2.5); uv.push(0, k / 4, 1, k / 4);
    if (k) idx.push(2 * k - 2, 2 * k - 1, 2 * k, 2 * k - 1, 2 * k + 1, 2 * k);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })); w.scene.add(m);
  for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(1.4 + (k % 3) * 0.5, 8, 6), toon(PAL.schnee)); f.position.set(xb + 1 + (k % 3), yb + 0.6, z - 3 + k); w.scene.add(f); }
  w.waterfallTex = tex;
}
function cableCar(w) {
  // Seilbahn vom Talboden hinauf zur Kuppe (Bergstation östlich vom Dorf, ausserhalb des Zauns)
  const top = new THREE.Vector3(49.5, 0, 47), bot = new THREE.Vector3(132, floorY(80), 80);
  w.addCollider(47.2, 0, 44.7, 51.8, 3.4, 49.3);
  bot.y = terrainH(bot.x, bot.z);
  for (const [p, rot] of [[top, -1.2], [bot, -1.2]]) {
    const g = new THREE.Group(); g.position.copy(p); g.rotation.y = rot; w.scene.add(g);
    w.box(5, 3.2, 4, PAL.papier, 0, 0, 0, { parent: g, line: 0.02 });
    w.box(5.6, 0.3, 4.6, PAL.rot, 0, 3.2, 0, { parent: g });
    w.box(0.4, 5.5, 0.4, PAL.tinte, 0, 0, 0, { parent: g });
  }
  const a = top.clone().add(new THREE.Vector3(0, 5.2, 0)), b = bot.clone().add(new THREE.Vector3(0, 5.2, 0));
  const pts = []; for (let k = 0; k <= 30; k++) { const t = k / 30, p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * 6; pts.push(p); }
  const curve = new THREE.CatmullRomCurve3(pts);
  w.scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.06, 4), toon(PAL.tinte)));
  const cab = new THREE.Group(); w.scene.add(cab);
  w.box(0.08, 1.4, 0.08, PAL.tinte, 0, -1.4, 0, { parent: cab });
  w.box(2.0, 1.5, 1.4, PAL.rot, 0, -2.9, 0, { parent: cab, line: 0.015 });
  w.box(1.6, 0.6, 1.45, PAL.himmel, 0, -2.2, 0, { parent: cab, cast: false });
  w.cable = { curve, cab };
}
function train(w) {
  const g = new THREE.Group(); w.scene.add(g);
  w.box(3.2, 3.2, 12, PAL.rot, 0, 0.9, 0, { parent: g, line: 0.03 });
  w.box(3.25, 0.9, 11, PAL.himmel, 0, 2.3, 0, { parent: g, cast: false });
  w.box(1.4, 1.4, 0.3, PAL.tinte, 0, 3.5, 3, { parent: g });
  for (let k = 1; k <= 3; k++) { w.box(3.2, 3.0, 13, k % 2 ? PAL.rot : '#B33A2E', 0, 0.9, -k * 13.6, { parent: g, line: 0.03 }); w.box(3.25, 0.9, 12, PAL.himmel, 0, 2.2, -k * 13.6, { parent: g, cast: false }); }
  const bus = new THREE.Group(); w.scene.add(bus);
  w.box(2.4, 2.6, 8, '#E6C64A', 0, 0.4, 0, { parent: bus, line: 0.03 }); w.box(2.45, 0.8, 7, PAL.himmel, 0, 1.8, 0, { parent: bus, cast: false });
  w.trains = { g, bus, t: 0, tb: 0.4 };
}
function valleyClouds(w) {
  // Wolken unter dem Dorf, die langsam das Tal hinausziehen
  const mat = toon(PAL.schnee), list = [];
  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group(), n = 5 + (i % 4);
    for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(5 + ((i + k) % 3) * 2.5, 9, 7), mat); s.position.set((k - n / 2) * 6.5, ((k * 7) % 3) - 1, ((k * 5) % 4) - 2); s.scale.y = 0.55; g.add(s); }
    const x = -160 + ((i * 97) % 320), z = 300 - i * 62;
    g.userData = { y: -38 - (i % 3) * 8 + (i % 2) * 6, sp: 1.2 + (i % 3) * 0.6 };
    g.position.set(x, g.userData.y, z); w.scene.add(g); list.push(g);
  }
  return list;
}
function skyDome(w) {
  const geo = new THREE.SphereGeometry(2200, 24, 12), P = geo.attributes.position, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const y = P.getY(i) / 2200, k = Math.max(0, y); const v = 1.12 - k * 0.32; col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = Math.min(1.1, v + k * 0.05); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10; w.scene.add(m); return m;
}

// Felder im Tal als eigene Flächen mit Reihen (Weizen, Mais, Acker, Wiese), sauber abgegrenzt
function cropTex(base, line, gap) {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 32, 32); g.fillStyle = line; for (let x = 0; x < 32; x += gap) g.fillRect(x, 0, Math.max(1, gap / 2.5), 32);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t;
}
function valleyFields(w) {
  const kinds = [['#E2C25A', '#CFA944', 8], ['#7BB04A', '#5E9A3A', 8], ['#A5774E', '#8E6440', 6], ['#9FCB62', '#8CBB52', 16], ['#D8B65C', '#C7A14A', 8], ['#6FA846', '#5A9238', 6]];
  const mats = kinds.map(([a, b, gp]) => { const t = cropTex(a, b, gp); return new THREE.MeshToonMaterial({ map: t, gradientMap: gradient }); });
  const avoid = [[-80, -300, 30], [95, -170, 26], [-95, 190, 22]];
  let sd = 13; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const out = [];
  for (let z0 = -960; z0 < 200; z0 += 46) {
    const rx = riverX(z0 + 20), rdx = roadX(z0 + 20);
    const bands = [[-178, rdx - 6], [rdx + 7, rx - 10], [rx + 10, 178]];
    for (const [xa, xb] of bands) {
      for (let x0 = xa; x0 < xb - 14; ) {
        const fw = Math.min(xb - x0, 22 + r() * 22), fl = 38 + r() * 6, cx = x0 + fw / 2, cz = z0 + fl / 2;
        x0 += fw + 3;
        if (fw < 12 || r() < 0.18) continue;
        if (avoid.some(([ax, az, ar]) => Math.hypot(ax - cx, az - cz) < ar + 22)) continue;
        if (Math.abs(cz + 470) < 130 && cx > riverX(-470) - 115 && cx < riverX(-470) + 50) continue;
        const ok = [[x0 - fw - 3, z0], [x0 - 3, z0], [x0 - fw - 3, z0 + fl], [x0 - 3, z0 + fl]].every(([x, z]) => terrainH(x, z) < floorY(z) + 4);
        if (!ok) continue;
        const geo = new THREE.PlaneGeometry(fw, fl, 6, 8); geo.rotateX(-Math.PI / 2);
        const P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i) + cx, z = P.getZ(i) + cz; P.setXYZ(i, x, terrainH(x, z) + 0.35, z); }
        geo.computeVertexNormals();
        const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * fw / 4, uv.getY(i) * fl / 4);
        const k = Math.floor(r() * kinds.length), m = new THREE.Mesh(geo, mats[k]); m.receiveShadow = true;
        if (r() < 0.5) { m.geometry.rotateY(0); }
        w.scene.add(m); out.push(m);
      }
    }
  }
  return out;
}
export function buildLandscape(w) {
  // Nahbereich fein, Fernbereich grob (das feine Stück liegt etwas höher und deckt das grobe ab)
  const near = new THREE.Mesh(terrainMesh(300, 230, 0, -20), terrainMat()); near.receiveShadow = true; w.scene.add(near);
  const farGeo = terrainMesh(2600, 300, 0, -300, { x: 0, z: -20, s: 300 });
  const far = new THREE.Mesh(farGeo, terrainMat()); far.position.y = -0.6; w.scene.add(far);
  w.terrain = { near, far };
  w.forest = forest(w);
  const tufts = grassTufts(w);
  w.landscape = [near, far, ...w.forest, ...tufts];
  w.landscape.push(mountainsFar(w), ...alpHuts(w), boulders(w));
  valleyFields(w);
  lake(w);
  riverAndRoads(w);
  valleyVillage(w, -80, -300, 16);
  valleyVillage(w, 95, -170, 10, 91);
  valleyVillage(w, -95, 190, 8, 33);
  cableCar(w);
  train(w);
  // bewegliche Dinge nicht zusammenfassen (sonst bleibt eine Kopie am Nullpunkt stehen)
  w.landscape.push(w.trains.g, w.trains.bus, w.cable.cab);
  w.valleyClouds = valleyClouds(w);
  w.skyDome = skyDome(w);
}
export function stepLandscape(w, dt) {
  if (w.valleyClouds) for (const g of w.valleyClouds) { g.position.z -= g.userData.sp * dt; if (g.position.z < -900) g.position.z = 240; }
  if (w.waterfallTex) w.waterfallTex.offset.y += dt * 0.9;
  if (w.cable) { const c = w.cable; c.t = ((c.t || 0) + dt / 70) % 2; const k = c.t < 1 ? c.t : 2 - c.t, e = k * k * (3 - 2 * k); c.cab.position.copy(c.curve.getPointAt(e)); }
  if (w.trains) {
    const T = w.trains; T.t = (T.t + dt / 95) % 1; T.tb = (T.tb + dt / 140) % 1;
    const z = 230 - T.t * 1230; T.g.position.set(railX(z), terrainH(railX(z), z) + 0.4, z); T.g.rotation.y = Math.atan2(railX(z - 2) - railX(z), -2) + Math.PI;
    const zb = -1000 + T.tb * 1230; T.bus.position.set(roadX(zb) + 1.1, terrainH(roadX(zb), zb) + 0.3, zb); T.bus.rotation.y = Math.atan2(roadX(zb + 2) - roadX(zb), 2);
  }
  if (w.skyDome) w.skyDome.position.copy(w.camera.position);
}
