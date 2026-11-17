// HOCHDRUCK – Landschaft: Wolkenwil liegt auf einer Bergkuppe. Rundherum Wald, dann geht es steil hinunter
// ins Tal mit Feldern, Fluss, See und einem Nachbardorf. Dahinter stehen die grossen Berge.
// Unter dem Dorf ziehen Wolken durchs Tal – darum braucht es hier ein Wolkenamt.
import * as THREE from 'three';
import { PAL } from './palette.js';
import { toon, gradient } from './toon.js';

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
const PL = { cx: 0, cz: 1, hx: 31, hz: 42, r: 10 };
function plateauDist(x, z) {
  const qx = Math.abs(x - PL.cx) - (PL.hx - PL.r), qz = Math.abs(z - PL.cz) - (PL.hz - PL.r);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - PL.r;
}
export const VALLEY = -72;
const riverR = a => 178 + Math.sin(a * 3) * 14 + Math.sin(a * 7 + 1) * 5;
export function terrainH(x, z) {
  const d = plateauDist(x, z) + (fbm(x * 0.03, z * 0.03) - 0.5) * 10;
  if (d <= 0) return -0.03;
  // Kuppenrand: kurz wellig, dann steil hinunter ins Tal
  let h = (fbm(x * 0.08, z * 0.08) - 0.5) * 1.6 * sstep(0, 6, d) - 1.2 * sstep(0, 6, d);
  h -= (Math.abs(VALLEY) - 1.2) * sstep(5, 75, d) - (fbm(x * 0.02 + 7, z * 0.02) - 0.5) * 10 * sstep(15, 55, d) * (1 - sstep(65, 90, d));
  const r = Math.hypot(x, z), a = Math.atan2(z, x);
  // Talboden mit sanften Wellen, Flussrinne
  h += (fbm(x * 0.012, z * 0.012) - 0.5) * 6 * sstep(80, 120, d);
  const rd = Math.abs(r - riverR(a)); h -= 3.5 * (1 - sstep(2, 9, rd)) * sstep(90, 110, d);
  // Grosse Berge rundherum
  const rg = 1 - Math.abs(fbm(x * 0.011 + 3, z * 0.011 - 2, 5) * 2 - 1), ridge = rg * rg;
  h += sstep(320, 500, r) * (30 + ridge * 190) + sstep(480, 760, r) * 70;
  return h;
}

// ---------------- Farben ----------------
const C = s => new THREE.Color(s);
const GR = [C('#6F8F4E'), C('#7E9C55'), C('#62824A'), C('#86A25C')], WALD = C('#4C6B3C'), FELS = C('#868276'), FELS2 = C('#7C8E9C'),
  SCHNEE = C(PAL.schnee), WASSER = C(PAL.gletscher), ACKER = [C('#C9B26A'), C('#8DAA5E'), C('#9C7B4E'), C('#A9B963')], WEG = C('#B7A98A');
function colorAt(x, z, h, slope, d) {
  const n = fbm(x * 0.15, z * 0.15), n2 = vnoise(x * 0.6, z * 0.6);
  let c = GR[0].clone().lerp(GR[1], sstep(0.45, 0.7, n)).lerp(GR[2], sstep(0.55, 0.8, 1 - n) * 0.8);
  if (d <= 0) {
    // Wiese im Dorf: Flecken, etwas Klee, festgetretene Wege
    c.lerp(GR[3], sstep(0.6, 0.9, n2) * 0.6);
    const path = Math.min(Math.abs(x - 0) - 1.2, 99) < 0 && z > 4 && z < 6.5;
    if (path) c.lerp(WEG, 0.7);
  }
  if (d > 2 && d < 45) c.lerp(WALD, 0.55 * sstep(2, 8, d) * (1 - sstep(35, 45, d)));
  if (h < VALLEY + 14 && d > 52) {
    // Felder im Tal als Flickenteppich
    const fx = Math.floor((x + 1000) / 16), fz = Math.floor((z + 1000) / 11), k = Math.floor(hash(fx, fz) * 4);
    c = ACKER[k].clone().lerp(GR[1], 0.25 + n2 * 0.2);
    const r = Math.hypot(x, z), rd = Math.abs(r - riverR(Math.atan2(z, x)));
    if (rd < 4.5) c = WASSER.clone();
  }
  if (slope > 0.9) c.lerp(FELS, sstep(0.9, 1.6, slope));
  if (d > 150 && h > VALLEY + 14) {
    // Gegenhang: Wald unten, Fels in der Mitte, Schnee oben – klar getrennte Bänder
    const hn = h + (n - 0.5) * 24;
    c = WALD.clone().lerp(GR[2], n2 * 0.25);
    if (hn > 25) c = FELS2.clone().lerp(FELS, n2 * 0.3);
    if (hn > 95) c = SCHNEE.clone();
  }
  return c;
}

// ---------------- Gelände bauen ----------------
function terrainMesh(size, seg, cx, cz, hole) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const P = geo.attributes.position, col = new Float32Array(P.count * 3), e = size / seg;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) + cx, z = P.getZ(i) + cz, h = terrainH(x, z);
    // Wo das feine Stück liegt, das grobe weit absenken (sonst schaut es an Hangfüssen durch)
    const sink = hole && Math.abs(x - hole.x) < hole.s / 2 - 12 && Math.abs(z - hole.z) < hole.s / 2 - 12 ? 40 : 0;
    P.setXYZ(i, x, h - sink, z);
    const sl = Math.hypot(terrainH(x + e, z) - h, terrainH(x, z + e) - h) / e;
    const c = colorAt(x, z, h, sl, plateauDist(x, z)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const flat = geo.toNonIndexed(); flat.computeVertexNormals();
  return flat;
}
const terrainMat = () => new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: gradient });

// Tanne als ein Stück Geometrie mit Farben (für InstancedMesh)
function firGeo() {
  const parts = [], add = (g, color, y) => { g = g.toNonIndexed(); g.translate(0, y, 0); const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); parts.push(g); };
  add(new THREE.CylinderGeometry(0.1, 0.14, 0.5, 5), PAL.chalet, 0.25);
  add(new THREE.ConeGeometry(0.75, 1.3, 7), '#557A43', 1.0);
  add(new THREE.ConeGeometry(0.58, 1.1, 7), '#5E8449', 1.6);
  add(new THREE.ConeGeometry(0.4, 0.9, 7), '#6A9152', 2.15);
  const n = parts.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0; for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
function forest(w) {
  const geo = firGeo(), mat = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: gradient });
  const spots = [];
  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // dichter Wald am Kuppenrand und an den Hängen
  for (let tries = 0; tries < 26000 && spots.length < 1900; tries++) {
    const a = rnd() * Math.PI * 2, rr = 30 + rnd() * 110, x = Math.cos(a) * rr * 1.1, z = Math.sin(a) * rr * 1.25 - 1;
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
  // Wälder am Fuss der grossen Berge
  for (let tries = 0; tries < 12000 && spots.length < 2900; tries++) {
    const a = rnd() * Math.PI * 2, rr = 255 + rnd() * 90, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (fbm(x * 0.02, z * 0.02) < 0.48) continue;
    const h = terrainH(x, z); if (h > 45) continue;
    spots.push([x, h, z, 5 + rnd() * 3]);
  }
  const im = new THREE.InstancedMesh(geo, mat, spots.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, h, z, sc], i) => { q.setFromAxisAngle(up, (i * 2.399) % 6.28); s.set(sc, sc * (0.9 + (i % 5) * 0.06), sc); p.set(x, h - 0.1, z); m.compose(p, q, s); im.setMatrixAt(i, m); });
  im.castShadow = false; im.receiveShadow = true; w.scene.add(im);
  return im;
}
function grassTufts(w) {
  // Grasbüschel und Blümchen auf der Dorfwiese (nicht auf Platz, Wegen, Häusern)
  const tuft = new THREE.ConeGeometry(0.07, 0.28, 3); tuft.translate(0, 0.14, 0);
  const n = 900, im = new THREE.InstancedMesh(tuft, toon('#5A7A40'), n), fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 5, 4), toon(PAL.schnee), 260), fy = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 5, 4), toon('#E6C64A'), 200);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const free = (x, z) => !(Math.abs(x) < 9.6 && z > 5.3 && z < 19.6) && !(Math.abs(x) < 7 && z > -5.5 && z < 5.6) && !(x < -9.5 && x > -16.5 && z > 9 && z < 17) && !(w.houses || []).some(g => Math.hypot(g.position.x - x, g.position.z - z) < 3.2);
  let k = 0, kf = 0, ky = 0;
  for (let t = 0; t < 8000 && k < n; t++) {
    const x = (rnd() - 0.5) * 50, z = -14 + rnd() * 52;
    if (!free(x, z)) continue;
    const cl = fbm(x * 0.3, z * 0.3); if (rnd() > cl * 1.4) continue;
    for (let j = 0; j < 3 && k < n; j++) { q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.5, rnd() * 6, (rnd() - 0.5) * 0.5)); const sc = 0.7 + rnd() * 0.8; s.set(sc, sc, sc); p.set(x + (rnd() - 0.5) * 0.3, 0, z + (rnd() - 0.5) * 0.3); m.compose(p, q, s); im.setMatrixAt(k++, m); }
    if (rnd() < 0.3 && kf < 260) { p.set(x + 0.3, 0.12, z); s.set(1, 1, 1); q.identity(); m.compose(p, q, s); fl.setMatrixAt(kf++, m); }
    else if (rnd() < 0.25 && ky < 200) { p.set(x - 0.3, 0.1, z + 0.2); s.set(1, 1, 1); q.identity(); m.compose(p, q, s); fy.setMatrixAt(ky++, m); }
  }
  im.count = k; fl.count = kf; fy.count = ky;
  for (const o of [im, fl, fy]) { o.receiveShadow = true; w.scene.add(o); }
  return [im, fl, fy];
}
function mountainsFar(w) {
  // grosse Gipfel hinter dem Gelände-Rand (Silhouette), mit Schneekappen
  const peaks = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + Math.sin(i * 3.1) * 0.15, r = 720 + (i % 3) * 90; peaks.push([Math.cos(a) * r, Math.sin(a) * r, 300 + ((i * 37) % 5) * 55, 170 + (i % 4) * 30]); }
  for (const [x, z, h, r] of peaks) {
    const seg = 6 + (Math.abs(x + z) | 0) % 3;
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg, 1), toon(PAL.gletscher)); m.position.set(x, 60 + h / 2, z); m.rotation.y = x * 0.01; w.scene.add(m);
    const sh = 0.36, cap = new THREE.Mesh(new THREE.ConeGeometry(r * sh * 1.02, h * sh, seg, 1), toon(PAL.schnee)); cap.position.set(x, 60 + h - h * sh / 2 + 0.2, z); cap.rotation.y = m.rotation.y; w.scene.add(cap);
  }
}
function lake(w) {
  const geo = new THREE.CircleGeometry(1, 40); geo.rotateX(-Math.PI / 2);
  const P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const a = Math.atan2(P.getZ(i), P.getX(i)), r = Math.hypot(P.getX(i), P.getZ(i)) * (1 + Math.sin(a * 3) * 0.12 + Math.sin(a * 5) * 0.06); P.setXYZ(i, Math.cos(a) * r, 0, Math.sin(a) * r); }
  const m = new THREE.Mesh(geo, toon('#6F9BB8')); m.scale.set(46, 1, 26); m.position.set(15, VALLEY + 0.6, -150); w.scene.add(m);
  // Ufer leicht absenken optisch: dunkler Rand
  const rim = new THREE.Mesh(geo, toon('#5E86A8')); rim.scale.set(49, 1, 29); rim.position.set(15, VALLEY + 0.4, -150); w.scene.add(rim);
}
function valleyVillage(w, cx, cz, n = 14) {
  let seed = 77; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < n; i++) {
    const x = cx + (rnd() - 0.5) * 34, z = cz + (rnd() - 0.5) * 24, h = terrainH(x, z), s = 2.2;
    const g = new THREE.Group(); g.position.set(x, h, z); g.rotation.y = rnd() * 6; g.scale.setScalar(s); w.scene.add(g);
    w.box(3, 2.4, 2.6, rnd() < 0.5 ? PAL.schnee : PAL.chalet, 0, 0, 0, { parent: g, cast: false });
    w.gable(3.7, 1.6, 3.1, rnd() < 0.4 ? PAL.rot : PAL.tinte, 0, 2.4, 0, 0, g);
  }
  const ch = new THREE.Group(); ch.position.set(cx + 4, terrainH(cx + 4, cz), cz); ch.scale.setScalar(2.4); w.scene.add(ch);
  w.box(2.2, 6, 2.2, PAL.schnee, 0, 0, 0, { parent: ch, cast: false });
  const sp = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 4), toon('#7A3526')); sp.rotation.y = Math.PI / 4; sp.position.y = 8; ch.add(sp);
}
function valleyClouds(w) {
  // Wolken unter dem Dorf, die langsam ums Tal ziehen
  const mat = toon(PAL.schnee), list = [];
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group(), n = 5 + (i % 4);
    for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(4 + ((i + k) % 3) * 2.2, 9, 7), mat); s.position.set((k - n / 2) * 5.5, ((k * 7) % 3) - 1, ((k * 5) % 4) - 2); s.scale.y = 0.55; g.add(s); }
    const a = i / 14 * Math.PI * 2, r = 120 + (i % 4) * 22;
    g.userData = { a, r, y: -28 - (i % 3) * 9, sp: 0.004 + (i % 3) * 0.002 };
    g.position.set(Math.cos(a) * r, g.userData.y, Math.sin(a) * r); w.scene.add(g); list.push(g);
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

export function buildLandscape(w) {
  // Nahbereich fein, Fernbereich grob (das feine Stück liegt etwas höher und deckt das grobe ab)
  const near = new THREE.Mesh(terrainMesh(260, 220, 0, -5), terrainMat()); near.receiveShadow = true; w.scene.add(near);
  const farGeo = terrainMesh(1800, 180, 0, 0, { x: 0, z: -5, s: 260 });
  const far = new THREE.Mesh(farGeo, terrainMat()); far.position.y = -0.6; w.scene.add(far);
  w.terrain = { near, far };
  w.forest = forest(w);
  const tufts = grassTufts(w);
  w.landscape = [near, far, w.forest, ...tufts];
  mountainsFar(w);
  lake(w);
  valleyVillage(w, -95, -150);
  valleyVillage(w, 120, 150, 10);
  w.valleyClouds = valleyClouds(w);
  w.skyDome = skyDome(w);
}
export function stepLandscape(w, dt) {
  if (w.valleyClouds) for (const g of w.valleyClouds) { const u = g.userData; u.a += u.sp * dt; g.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(u.a * 3) * 1.5, Math.sin(u.a) * u.r); }
  if (w.skyDome) w.skyDome.position.copy(w.camera.position);
}
