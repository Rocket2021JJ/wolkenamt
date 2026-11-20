// Die Insel «Feierabend»: sanfte Hügel, Dorf in der Mitte, Strand, Weiher, Wald, Strassen.
// Alles prozedural, aber von Hand platziert: Hügel, Strassen und Häuser stehen an festen Orten.
import * as THREE from 'three';
import { PAL, rng } from './palette.js';
import { toon, outline, inkLine } from './toon.js';
import { clamp, lerp, smooth, noise2, fbm, segDist, bake, tint, merge } from './geo.js';
import { setTerrain, terrainY, addBox, SEA } from './solid.js';

export const C = {
  gras: '#7DB04B', gras2: '#5E9A3E', gras3: '#9CC25A', wald: '#4E8237', sand: '#E8D39A', fels: '#9A9488', erde: '#8C6A45',
  strasse: '#6E6A66', weg: '#C9B48A', wasser: '#4DB6E0', holz: PAL.chalet, holzHell: '#B07A48', putz: '#EDE6D6', dach: '#7A4A32', dach2: '#5E5A58',
  rot: PAL.rot, blau: PAL.gletscher, gelb: '#E8B83A', tinte: PAL.tinte, schnee: PAL.schnee, ocker: PAL.ocker, gruen: '#3F7A3A', rosa: '#E58FA8', weiss: '#F6F3EA', lila: '#8C6BB0',
};

// Hügel: [x, z, Höhe, Radius]
const HILLS = [[88, -78, 21, 34], [60, -95, 9, 30], [-86, 18, 11, 30], [-70, 60, 6, 26], [30, 92, 5, 24], [105, 30, 7, 22], [-40, -100, 8, 26], [-110, -40, 6, 22]];
const POND = [-46, -62, 4.2, 13];
// Strassen als Linienzüge
export const ROADS = [
  { w: 3.4, pts: ringPts(0, 0, 33, 28) },
  { w: 3.2, pts: [[23, -24], [44, -40], [62, -58], [76, -70], [84, -76]] },
  { w: 3.2, pts: [[0, 33], [2, 55], [8, 78], [14, 98], [16, 112]] },
  { w: 3.2, pts: [[-33, 2], [-55, 6], [-78, 14], [-96, 26]] },
  { w: 3.0, pts: [[33, 4], [60, 8], [88, 18], [104, 40], [96, 66], [70, 86], [40, 98], [14, 98]] },
  { w: 2.6, pts: [[-24, -24], [-36, -44], [-44, -48]] },
];
function ringPts(cx, cz, r, n) { const a = []; for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2; a.push([cx + Math.cos(t) * r, cz + Math.sin(t) * r]); } return a; }
export function roadDist(x, z) {
  let best = 1e9, w = 3;
  for (const R of ROADS) for (let i = 0; i < R.pts.length - 1; i++) {
    const [ax, az] = R.pts[i], [bx, bz] = R.pts[i + 1];
    if (Math.abs(x - ax) > 30 && Math.abs(x - bx) > 30) continue;
    const [d] = segDist(x, z, ax, az, bx, bz); if (d < best) { best = d; w = R.w; }
  }
  return [best, w];
}

function islandD(x, z) { return Math.hypot(x * 0.95, z) + fbm(x * 0.011 + 3, z * 0.011, 3) * 30; }
function rawH(x, z) {
  const d = islandD(x, z);
  const land = smooth(150, 108, d);
  let h = -7 * (1 - land) + land * (2.3 + fbm(x * 0.018, z * 0.018, 3) * 2.2);
  for (const [hx, hz, hh, r] of HILLS) { const dx = x - hx; if (Math.abs(dx) > r * 3) continue; const q = (dx * dx + (z - hz) ** 2) / (r * r); h += hh * Math.exp(-q * 1.6) * land; }
  // Weiher
  { const q = ((x - POND[0]) ** 2 + (z - POND[1]) ** 2) / (POND[3] * POND[3]); h -= POND[2] * smooth(1.25, 0.3, q); }
  // Dorfplatz: eben
  const vd = Math.hypot(x, z); h = lerp(h, 2.4 + noise2(x * 0.05, z * 0.05) * 0.15, smooth(50, 36, vd));
  return h;
}
// Strasse: quer eben, sanft eingebettet
function finalH(x, z) {
  let h = rawH(x, z);
  let best = 9, bh = 0;
  for (const R of ROADS) for (let i = 0; i < R.pts.length - 1; i++) {
    const [ax, az] = R.pts[i], [bx, bz] = R.pts[i + 1];
    const [d, t] = segDist(x, z, ax, az, bx, bz);
    if (d < best) { best = d; bh = rawH(lerp(ax, bx, t), lerp(az, bz, t)); }
  }
  if (best < 9) h = lerp(h, Math.max(bh, 0.6) + 0.02, smooth(8.5, 3.2, best));
  return h;
}

// ----------------------------------------------------------------
const N = 201, STEP = 2, X0 = -200, Z0 = -200;
export function buildTerrain(scene) {
  const H = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = finalH(X0 + i * STEP, Z0 + j * STEP);
  setTerrain(N, STEP, X0, Z0, H);

  const pos = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3);
  const cG = new THREE.Color(C.gras), cG2 = new THREE.Color(C.gras2), cG3 = new THREE.Color(C.gras3), cW = new THREE.Color(C.wald), cS = new THREE.Color(C.sand), cF = new THREE.Color(C.fels), cE = new THREE.Color(C.erde), cU = new THREE.Color('#3E7FA0'), tmp = new THREE.Color();
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, x = X0 + i * STEP, z = Z0 + j * STEP, h = H[k];
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    const hl = H[j * N + Math.max(0, i - 1)], hr = H[j * N + Math.min(N - 1, i + 1)], hu = H[Math.max(0, j - 1) * N + i], hd = H[Math.min(N - 1, j + 1) * N + i];
    const slope = Math.hypot(hr - hl, hd - hu) / (2 * STEP);
    const p = fbm(x * 0.03, z * 0.03, 2);
    tmp.copy(cG).lerp(p > 0 ? cG3 : cG2, Math.abs(p) * 1.3);
    if (forestK(x, z) > 0.4) tmp.lerp(cW, 0.55);
    if (slope > 0.55) tmp.lerp(cF, smooth(0.55, 0.9, slope));
    const sandK = smooth(1.5, 0.7, h); if (sandK > 0) tmp.lerp(cS, sandK);
    if (h < -0.3) tmp.lerp(cU, smooth(-0.3, -3, h));
    const [rd] = roadDist(x, z); if (rd < 5.5 && h > 0.4) tmp.lerp(cE, smooth(5.5, 3.5, rd) * 0.35);
    col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
  }
  const idx = [];
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) { const a = j * N + i, b = a + 1, c = a + N, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, toon('#ffffff', { vertexColors: true })); m.receiveShadow = true; m.userData.keep = true;
  scene.add(m);

  // Wasser mit Schaumkante
  const wg = new THREE.PlaneGeometry(1400, 1400, 1, 1); wg.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wg, new THREE.MeshToonMaterial({ color: C.wasser, transparent: true, opacity: 0.86 }));
  water.position.y = SEA; water.receiveShadow = true; scene.add(water);
  return { mesh: m, water };
}

export function forestK(x, z) {
  const d = islandD(x, z); if (d > 132 || Math.hypot(x, z) < 52) return 0;
  return smooth(0.05, 0.35, fbm(x * 0.012 + 40, z * 0.012 - 7, 3)) * smooth(132, 118, d);
}

// ---------------- Strassenbänder ----------------
export function buildRoads(scene) {
  const parts = [];
  const mat = toon(C.strasse), line = toon(C.weiss), curb = toon('#B9B2A6');
  for (const R of ROADS) {
    const P = R.pts, verts = [], lines = [];
    // gleichmässig unterteilen
    const pts = [];
    for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5); for (let k = 0; k < n; k++) pts.push([lerp(ax, bx, k / n), lerp(az, bz, k / n)]); }
    pts.push(P[P.length - 1]);
    const pos = [], ind = [], lp = [], li = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const nx = -dz, nz = dx, [x, z] = pts[i];
      for (const s of [-1, 1]) { const px = x + nx * R.w * s, pz = z + nz * R.w * s; pos.push(px, terrainY(px, pz) + 0.06, pz); }
      for (const s of [-1, 1]) { const px = x + nx * 0.09 * s, pz = z + nz * 0.09 * s; lp.push(px, terrainY(px, pz) + 0.075, pz); }
      if (i > 0) { const q = (i - 1) * 2; ind.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); if (i % 3 !== 0) li.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ind); g.computeVertexNormals();
    const rm = new THREE.Mesh(g, mat); rm.receiveShadow = true; rm.userData.keep = true; scene.add(rm);
    if (R.w >= 3) { const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setIndex(li); lg.computeVertexNormals(); const lm = new THREE.Mesh(lg, line); lm.receiveShadow = true; scene.add(lm); }
  }
}

// ---------------- Bäume (instanziert) ----------------
function roundTree() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.18, 0.26, 1.6, 7); trunk.translate(0, 0.8, 0); parts.push(tint(trunk, C.holz));
  const blobs = [[0, 2.4, 0, 1.3], [0.7, 2.1, 0.2, 0.9], [-0.6, 2.2, -0.3, 0.95], [0.1, 3.1, 0.1, 0.9], [-0.2, 2.0, 0.7, 0.8]];
  for (const [x, y, z, r] of blobs) { const s = new THREE.IcosahedronGeometry(r, 1); s.translate(x, y, z); parts.push(tint(s, '#ffffff')); }
  return merge(parts);
}
function pineTree() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.15, 0.22, 1.2, 6); trunk.translate(0, 0.6, 0); parts.push(tint(trunk, C.holz));
  for (let k = 0; k < 3; k++) { const c = new THREE.ConeGeometry(1.5 - k * 0.38, 1.7, 8); c.translate(0, 1.6 + k * 1.05, 0); parts.push(tint(c, '#ffffff')); }
  return merge(parts);
}
// Holz bleibt braun, Laub wird pro Baum eingefärbt: Laubvertices sind weiss
function treeMesh(geo, list, cols) {
  const mat = toon('#ffffff', { vertexColors: true });
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n vColor = color.r > 0.9 ? instanceColor : color;\n#endif');
  };
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color();
  list.forEach((t, i) => { e.set(0, t.r, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(t.x, t.y, t.z), q, new THREE.Vector3(t.s, t.s * t.sy, t.s)); im.setMatrixAt(i, m4); im.setColorAt(i, cc.set(cols[i % cols.length]).offsetHSL(0, 0, (t.l || 0))); });
  im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true;
  return im;
}
export function buildTrees(scene, blocked) {
  const R = rng(77), round = [], pine = [];
  const tryPut = (x, z, kind, s) => {
    const y = terrainY(x, z); if (y < 1.2) return;
    if (roadDist(x, z)[0] < 6) return;
    if (blocked(x, z, 3)) return;
    const t = { x, y: y - 0.1, z, r: R() * 6.28, s, sy: 0.9 + R() * 0.25, l: (R() - 0.5) * 0.08 };
    (kind ? pine : round).push(t);
    addBox({ circle: true, x, z, r: 0.35 * s, y0: y - 1, y1: y + 4 * s });
  };
  for (let i = 0; i < 2600; i++) {
    const x = (R() - 0.5) * 300, z = (R() - 0.5) * 300, f = forestK(x, z);
    if (f > 0.3 && R() < f * 0.5) tryPut(x, z, terrainY(x, z) > 9 || R() < 0.35 ? 1 : 0, 0.9 + R() * 0.6);
    else if (f <= 0.3 && R() < 0.03 && Math.hypot(x, z) > 52 && islandD(x, z) < 125) tryPut(x, z, R() < 0.3 ? 1 : 0, 0.8 + R() * 0.5);
  }
  // Dorfbäume
  for (const [x, z] of [[-14, -14], [15, 15], [-18, 12], [20, -10], [-40, -20], [42, 26], [8, -40], [-8, 44]]) tryPut(x, z, 0, 1.15);
  scene.add(treeMesh(roundTree(), round, ['#6FAE45', '#5C9C3C', '#86BE52', '#79A944', '#D9A441']));
  scene.add(treeMesh(pineTree(), pine, ['#3F7A43', '#4A8648', '#376B3C']));
  return { round, pine };
}

// ---------------- Wolken, Himmel ----------------
export function buildSky(scene) {
  const g = new THREE.SphereGeometry(900, 24, 12); const c = [], top = new THREE.Color('#5FA6DA'), hor = new THREE.Color('#CBE6F2');
  for (let i = 0; i < g.attributes.position.count; i++) { const y = g.attributes.position.getY(i) / 900; const k = clamp(y * 2.2, 0, 1); const cc = hor.clone().lerp(top, k); c.push(cc.r, cc.g, cc.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  const sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); scene.add(sky);
  const clouds = new THREE.Group(); const R = rng(5), cm = toon('#ffffff');
  for (let i = 0; i < 22; i++) {
    const cl = new THREE.Group(); const n = 4 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + R() * 4, 1), cm); s.position.set((k - n / 2) * 5 + R() * 2, R() * 3, R() * 4); s.scale.y = 0.7; cl.add(s); }
    const a = R() * 6.28, r = 120 + R() * 260; cl.position.set(Math.cos(a) * r, 55 + R() * 35, Math.sin(a) * r); cl.userData.v = 0.6 + R() * 1.2;
    clouds.add(cl);
  }
  scene.add(clouds);
  return { sky, clouds };
}
