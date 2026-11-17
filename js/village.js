// HOCHDRUCK – Dorf mit mehr Leben: jedes Haus bekommt Kleinkram, das Dorf bekommt Kirche, Maibaum,
// Wegkreuz, Laternen, Strommasten, Misthaufen, Traktor, Hühner, Gärten. Alles leicht schief, alles etwas zu viel.
import * as THREE from 'three';
import { PAL } from './palette.js';
import { toon, outline } from './toon.js';
import { ROOM } from './world3d.js';

const STEIN = '#9C9A92', ZIEGEL = '#9A4A33', ZIEGEL2 = '#7A3526', BLECH = '#8A9197', GERANIE = '#D94A5A', HOLZHELL = '#B98A5A';

function rnd(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------------- Häuser ausschmücken ----------------
function decorateHouse(w, g, i) {
  const { w: W, d: D, h: H, wood } = g.userData, r = rnd(1000 + i * 77);
  const B = (wd, ht, dp, col, x, y, z, o = {}) => w.box(wd, ht, dp, col, x, y, z, { parent: g, cast: o.cast, tilt: o.tilt, line: o.line });
  const fz = D / 2, bz = -D / 2;
  // Sockel aus Stein, leicht vorstehend
  B(W + 0.12, 0.35, D + 0.12, STEIN, 0, 0, 0);
  // Ecklisenen / Eckbalken
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(0.12, H - 0.35, 0.12, wood ? PAL.nuss : PAL.papier, sx * (W / 2 + 0.01), 0.35, sz * (D / 2 + 0.01), { cast: false });
  // Holzhaus: waagrechte Balkenfugen
  if (wood) for (let y = 0.6; y < H; y += 0.28) { B(W + 0.02, 0.02, 0.02, PAL.nuss, 0, y, fz + 0.005, { cast: false }); B(0.02, 0.02, D + 0.02, PAL.nuss, W / 2 + 0.005, y, 0, { cast: false }); B(0.02, 0.02, D + 0.02, PAL.nuss, -W / 2 - 0.005, y, 0, { cast: false }); }
  // Fensterrahmen, Sprossen und Blumenkisten vorne
  const nw = Math.max(1, Math.floor(W / 1.3));
  for (let k = 0; k < nw; k++) {
    const fx = -W / 2 + (k + 0.5) * W / nw;
    for (const fy of H > 3.3 ? [1.4, H - 0.5] : [1.4]) {
      B(0.66, 0.06, 0.08, wood ? PAL.schnee : PAL.chalet, fx, fy - 0.36, fz + 0.04, { cast: false });
      B(0.66, 0.05, 0.08, wood ? PAL.schnee : PAL.chalet, fx, fy + 0.34, fz + 0.04, { cast: false });
      B(0.03, 0.66, 0.06, PAL.schnee, fx, fy - 0.33, fz + 0.05, { cast: false });
      B(0.6, 0.03, 0.06, PAL.schnee, fx, fy - 0.02, fz + 0.05, { cast: false });
      winGlow(g, fx, fy - 0.01, fz + 0.025, r());
      if (r() < 0.6) {
        B(0.7, 0.16, 0.2, PAL.chalet, fx, fy - 0.52, fz + 0.12);
        for (let f = 0; f < 5; f++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06 + r() * 0.025, 6, 5), toon(f % 2 ? GERANIE : PAL.rot)); m.position.set(fx - 0.28 + f * 0.14, fy - 0.3 + r() * 0.05, fz + 0.14 + r() * 0.04); g.add(m); }
        for (let f = 0; f < 3; f++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), toon(PAL.matte)); m.scale.y = 0.6; m.position.set(fx - 0.22 + f * 0.22, fy - 0.37, fz + 0.2); g.add(m); }
      }
    }
  }
  // Rückseite: Fenster mit Rahmen und Läden (vom Dorfplatz aus sieht man oft die Rückseiten)
  { const shc = [PAL.matte, PAL.rot, '#3E5A3A', PAL.tinte][i % 4];
    for (let k = 0; k < nw; k++) {
      const fx = -W / 2 + (k + 0.5) * W / nw;
      for (const fy of H > 3.3 ? [1.35, H - 0.55] : [1.35]) {
        if (r() < 0.2) continue;
        B(0.5, 0.58, 0.04, PAL.tinte, fx, fy - 0.3, bz - 0.02, { cast: false });
        B(0.6, 0.05, 0.07, PAL.schnee, fx, fy - 0.36, bz - 0.04, { cast: false }); B(0.6, 0.05, 0.07, PAL.schnee, fx, fy + 0.29, bz - 0.04, { cast: false });
        B(0.03, 0.58, 0.05, PAL.schnee, fx, fy - 0.3, bz - 0.045, { cast: false });
        for (const sd of [-1, 1]) { B(0.2, 0.62, 0.04, shc, fx + sd * 0.37, fy - 0.32, bz - 0.03, { cast: false }); B(0.16, 0.02, 0.02, PAL.schnee, fx + sd * 0.37, fy - 0.05, bz - 0.06, { cast: false }); }
      }
    }
    // Holzbeige an der Rückwand
    if (r() < 0.6) for (let y = 0; y < 0.9; y += 0.18) B(W * 0.5, 0.17, 0.35, y % 0.36 < 0.18 ? HOLZHELL : PAL.nuss, (r() - 0.5) * W * 0.3, y, bz - 0.2, { cast: false });
  }
  // Seitenfenster
  for (const sx of [-1, 1]) if (r() < 0.7) { B(0.06, 0.6, 0.55, PAL.tinte, sx * (W / 2 + 0.02), 1.1, w.jit(D * 0.2), { cast: false }); B(0.08, 0.05, 0.65, PAL.schnee, sx * (W / 2 + 0.04), 1.05, 0, { cast: false }); }
  // Holzbalkon im oberen Stock
  if (H > 3.2 && r() < 0.55) {
    const by = H - 1.15;
    B(W * 0.75, 0.08, 0.7, HOLZHELL, 0, by, fz + 0.35);
    for (let x = -W * 0.37; x <= W * 0.37; x += 0.16) B(0.05, 0.55, 0.04, HOLZHELL, x, by + 0.08, fz + 0.68, { cast: false });
    B(W * 0.77, 0.07, 0.08, PAL.nuss, 0, by + 0.62, fz + 0.68);
    for (const s of [-1, 1]) { const k = B(0.07, 0.5, 0.07, PAL.nuss, s * W * 0.33, by - 0.45, fz + 0.3, { tilt: s * 0.6 }); k.rotation.x = 0.6; }
    // Wäsche auf dem Balkon
    if (r() < 0.6) for (let k = 0; k < 4; k++) B(0.22, 0.3 + r() * 0.15, 0.02, [PAL.schnee, PAL.himmel, PAL.rot, PAL.ocker][k], -0.5 + k * 0.32, by + 0.3, fz + 0.72, { cast: false });
  }
  // Kamin (schief) und manchmal Antenne oder Schüssel
  const roofH = g.userData.roofH || 1.5;
  const cx = (r() - 0.5) * W * 0.5;
  const ch = B(0.36, roofH * 0.8 + 0.6, 0.36, r() < 0.5 ? PAL.papier : STEIN, cx, H + roofH * 0.25, (r() - 0.5) * D * 0.4, { tilt: w.jit(0.06), line: 0.01 });
  B(0.48, 0.06, 0.48, PAL.tinte, cx, H + roofH * 1.05 + 0.6, ch.position.z);
  (w.chimneys ||= []).push({ g, x: cx, y: H + roofH * 1.05 + 0.7, z: ch.position.z, ph: r() * 10, on: r() < 0.75 });
  if (r() < 0.45) {
    const ax = -cx * 0.6, ay = H + roofH * 0.7;
    B(0.03, 1.0, 0.03, BLECH, ax, ay, 0, { cast: false });
    for (let k = 0; k < 4; k++) B(0.6 - k * 0.12, 0.025, 0.025, BLECH, ax, ay + 0.6 + k * 0.12, 0, { cast: false });
  } else if (r() < 0.5) {
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.35), toon(PAL.schnee, { side: THREE.DoubleSide }));
    dish.position.set(W / 2 - 0.1, H - 0.4, fz + 0.15); dish.rotation.x = -1.2; g.add(dish);
  }
  // Dachkanten-Brett und Ziegelreihen auf den Dachflächen
  const rw = W + 0.9, ang = Math.atan2(roofH, rw / 2), slope = Math.hypot(rw / 2, roofH);
  for (const s of [-1, 1]) for (let k = 1; k < 4; k++) {
    const t = k / 4, m = B(0.04, 0.04, D + 0.72, g.userData.roofCol === PAL.rot ? ZIEGEL2 : PAL.tinte, s * (rw / 2) * (1 - t), H + roofH * t + 0.02, 0, { cast: false });
    m.rotation.z = -s * ang; m.position.x += s * 0.0;
  }
  for (const s of [-1, 1]) { const bb = B(slope + 0.05, 0.06, 0.06, HOLZHELL, s * rw / 4, H + roofH / 2 - 0.03, D / 2 + 0.36, { cast: false }); bb.rotation.z = -s * ang; }
  // Zierbrett mit Laubsäge-Zacken unter den Dachkanten vorne (typisch Chalet)
  const zcol = wood ? PAL.schnee : HOLZHELL;
  const tri = new THREE.Shape(); tri.moveTo(-0.07, 0); tri.lineTo(0.07, 0); tri.lineTo(0, -0.13); tri.closePath();
  const triGeo = new THREE.ShapeGeometry(tri);
  for (const fs of [1, -1]) for (const sd of [-1, 1]) {
    const nz = Math.floor(slope / 0.17), zf = fs * (D / 2 + 0.38);
    for (let k = 1; k < nz; k++) {
      const u = k / nz, x = sd * (rw / 2) * (1 - u), y = H + roofH * u - 0.1;
      const m = new THREE.Mesh(triGeo, toon(zcol)); m.position.set(x, y, zf); m.rotation.z = -sd * ang; if (fs < 0) m.rotation.y = Math.PI; g.add(m);
    }
  }
  // Pfettenköpfe: Balkenenden, die unter dem Dach vorne herausschauen
  for (const [x, y] of [[0, H + roofH - 0.28], [-rw / 4 - 0.05, H + roofH / 2 - 0.22], [rw / 4 + 0.05, H + roofH / 2 - 0.22], [-W / 2 - 0.05, H - 0.02], [W / 2 + 0.05, H - 0.02]]) {
    for (const fs of [1, -1]) B(0.17, 0.17, 0.5, PAL.nuss, x, y - 0.085, fs * (D / 2 + 0.12), { cast: false });
  }
  // Firstbrett und Schneefang
  B(0.2, 0.1, D + 0.78, PAL.tinte, 0, H + roofH - 0.04, 0, { cast: false });
  for (const sd of [-1, 1]) { const sf = B(0.05, 0.05, D + 0.6, BLECH, sd * rw * 0.36, H + roofH * 0.28 + 0.07, 0, { cast: false }); sf.rotation.z = -sd * ang; }
  if (!wood) {
    // Gemauerte Häuser: gemalte Eckquader und ein Sgraffito-Fries mit Rauten unter dem Holzstock
    const QC = '#B9B2A2';
    for (const sx of [-1, 1]) for (let y = 0.4, k = 0; y < H - 1.1; y += 0.3, k++) {
      const wq = k % 2 ? 0.22 : 0.38;
      B(wq, 0.24, 0.02, QC, sx * (W / 2 - wq / 2 + 0.005), y, D / 2 + 0.012, { cast: false });
      B(0.02, 0.24, wq, QC, sx * (W / 2 + 0.012), y, D / 2 - wq / 2 + 0.005, { cast: false });
    }
    const fy = H - 1.05;
    B(W - 0.1, 0.03, 0.015, '#5E5A52', 0, fy + 0.2, D / 2 + 0.012, { cast: false }); B(W - 0.1, 0.03, 0.015, '#5E5A52', 0, fy - 0.08, D / 2 + 0.012, { cast: false });
    for (let x = -W / 2 + 0.25; x < W / 2 - 0.15; x += 0.26) { const d = B(0.09, 0.09, 0.015, '#5E5A52', x, fy + 0.02, D / 2 + 0.013, { cast: false }); d.rotation.z = Math.PI / 4; }
  } else {
    // Holzhäuser: Bundbalken zwischen den Stockwerken mit Inschrift-Brett
    if (H > 3.2) { B(W + 0.06, 0.12, 0.05, PAL.nuss, 0, 2.55, D / 2 + 0.02, { cast: false }); B(W * 0.5, 0.16, 0.02, '#D9C9A3', 0, 2.72, D / 2 + 0.03, { cast: false }); }
  }
  // Vordach über der Türe auf zwei Bügen
  if (g.userData.doorX != null) { const dx = g.userData.doorX, vy = 1.95; const vd = B(1.2, 0.06, 0.62, PAL.nuss, dx, vy, D / 2 + 0.31); vd.rotation.x = 0.22;
    for (const sd of [-1, 1]) { const bg = B(0.05, 0.4, 0.05, PAL.nuss, dx + sd * 0.5, vy - 0.4, D / 2 + 0.18, { cast: false }); bg.rotation.x = -0.6; } }
  // Haustür-Details: Treppe, Nummer, Briefkasten
  B(1.0, 0.12, 0.45, STEIN, 0.15, 0, fz + 0.22);
  const mb = B(0.24, 0.3, 0.14, [PAL.ocker, PAL.rot, PAL.gletscher][i % 3], W / 2 - 0.35, 0.9, fz + 0.08, { line: 0.008 });
  B(0.16, 0.1, 0.012, PAL.blau, -W / 2 + 0.35, H - 0.6, fz + 0.03, { cast: false });
  // Kleinkram ums Haus (je nach Zufall): Holzbeige, Velo, Gartenzwerg, Regentonne, Bank
  const side = r() < 0.5 ? -1 : 1, sxp = side * (W / 2 + 0.35);
  if (r() < 0.7) {
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) {
      const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 7), toon(k % 2 ? HOLZHELL : PAL.chalet)); lg.rotation.x = Math.PI / 2;
      lg.position.set(sxp + (row % 2) * 0.05, 0.1 + row * 0.19, -D * 0.3 + k * 0.21); lg.castShadow = true; g.add(lg);
    }
    B(0.5, 0.05, D * 0.5, PAL.tinte, sxp, 0.66, -D * 0.3 + 0.3);
  }
  if (r() < 0.5) {
    const zx = side * -(W / 2 - 0.3), zz = fz + 0.65;
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 7), toon(PAL.blau)); body.position.set(zx, 0.11, zz); g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 6), toon('#E8C9A8')); head.position.set(zx, 0.27, zz); g.add(head);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 7), toon(PAL.rot)); hat.position.set(zx, 0.4, zz); hat.rotation.z = 0.25; g.add(hat);
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 6), toon(PAL.schnee)); beard.rotation.x = Math.PI; beard.position.set(zx, 0.2, zz + 0.04); g.add(beard);
  }
  if (r() < 0.45) {
    w.cyl(0.24, 0.22, 0.6, PAL.gletscher, -sxp, 0, D * 0.3, { parent: g, seg: 10 });
    B(0.04, H - 0.5, 0.04, BLECH, -side * (W / 2 + 0.05), 0.6, D * 0.3, { cast: false });
  }
  if (r() < 0.35) {
    const bk = new THREE.Group(); bk.position.set(sxp * 0.9, 0, fz - 0.4); bk.rotation.y = Math.PI / 2 + w.jit(0.2); bk.rotation.z = 0.12; g.add(bk);
    for (const s of [-0.35, 0.35]) { const wh = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 4, 14), toon(PAL.tinte)); wh.position.set(s, 0.24, 0); bk.add(wh); }
    w.box(0.7, 0.035, 0.03, PAL.rot, 0, 0.42, 0, { parent: bk }); w.box(0.03, 0.3, 0.03, PAL.rot, 0.1, 0.24, 0, { parent: bk }); w.box(0.18, 0.03, 0.06, PAL.tinte, 0.12, 0.56, 0, { parent: bk });
  }
}

// ---------------- Abendlicht und Kaminrauch ----------------
// Fenster leuchten am Abend warm auf (zufällig, nicht alle), Laternen glühen, Kamine rauchen.
const GLOW = [0, 1, 2].map(k => new THREE.MeshBasicMaterial({ color: ['#FFD27A', '#FFC266', '#FFE3A3'][k], transparent: true, opacity: 0, depthWrite: false }));
const BULB = new THREE.MeshBasicMaterial({ color: '#E8D49A' });
const HALO = new THREE.MeshBasicMaterial({ color: '#FFD98A', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
function winGlow(g, x, y, z, rr) {
  if (rr < 0.3) return;   // manche Leute sind nicht zuhause
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.62), GLOW[Math.floor(rr * 10) % 3]); m.position.set(x, y, z); m.renderOrder = 2; g.add(m);
}
let duskK = 0;
export function setDusk(w, k) {
  duskK = k; const lit = Math.max(0, Math.min(1, (k - 0.45) / 0.4));
  GLOW.forEach((m, i) => { m.opacity = lit * (0.92 - i * 0.06); });
  BULB.color.set(lit > 0.2 ? '#FFE9A8' : '#E8D49A'); HALO.opacity = lit * 0.35;
}
export function buildSmoke(w) {
  const list = (w.chimneys || []).filter(c => c.on); w.scene.updateMatrixWorld(true);
  const N = 7, geo = new THREE.IcosahedronGeometry(0.22, 0);
  const mat = new THREE.MeshBasicMaterial({ color: '#EDEAE2', transparent: true, opacity: 0.55, depthWrite: false });
  const im = new THREE.InstancedMesh(geo, mat, list.length * N); im.frustumCulled = false;
  const v = new THREE.Vector3();
  w.smoke = { im, N, src: list.map(c => { c.g.updateMatrixWorld(true); v.set(c.x, c.y, c.z); c.g.localToWorld(v); return { p: v.clone(), ph: c.ph }; }), m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), t: new THREE.Vector3() };
  w.scene.add(im); return im;
}
export function stepSmoke(w, t) {
  const S = w.smoke; if (!S) return;
  const wind = 0.35;
  S.src.forEach((c, i) => {
    for (let k = 0; k < S.N; k++) {
      const a = ((t * 0.18 + k / S.N + c.ph) % 1), h = a * 3.2;
      S.t.set(c.p.x + h * wind + Math.sin(t * 0.9 + k + c.ph) * 0.12 * a, c.p.y + h, c.p.z - h * 0.15);
      const sc = (0.35 + a * 1.6) * (a < 0.08 ? a / 0.08 : 1) * (1 - Math.pow(a, 3));
      S.s.setScalar(sc * (0.85 + duskK * 0.15)); S.q.setFromEuler(new THREE.Euler(k, t * 0.2 + k, 0));
      S.m.compose(S.t, S.q, S.s); S.im.setMatrixAt(i * S.N + k, S.m);
    }
  });
  S.im.instanceMatrix.needsUpdate = true;
}

// ---------------- Dorfumgebung ----------------
export function lamp(w, x, z) {
  w.cyl(0.05, 0.07, 3.0, PAL.tinte, x, 0, z, { seg: 6, solid: true });
  w.box(0.5, 0.04, 0.04, PAL.tinte, x + 0.22, 2.95, z);
  const sh = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 8, 1, true), toon(PAL.tinte, { side: THREE.DoubleSide })); sh.position.set(x + 0.42, 2.85, z); w.scene.add(sh);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), BULB);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), HALO); halo.position.copy(bulb.position); w.scene.add(halo); bulb.position.set(x + 0.42, 2.77, z); w.scene.add(bulb);
}
// Kirche St. Niklaus: Schiff mit Strebepfeilern und hohen Bogenfenstern, Chor mit Apsis hinten,
// hoher Turm vorne mit Uhren, Glockenstube, Spitzhelm mit vier Giebeln, Kreuz und goldenem Güggel, Vorzeichen.
function church(w, x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; w.scene.add(g);
  const B = (wd, ht, dp, col, px, py, pz, o = {}) => w.box(wd, ht, dp, col, px, py, pz, { parent: g, cast: o.cast, line: o.line, tilt: o.tilt });
  const WEISS = '#F4EFE4', QUAD = '#C9C1AE', DACH = '#7C3A2A', GLAS = '#7FA9C9', GOLD = '#D9A93A';
  const NW = 5.6, ND = 9, NH = 4.6;
  // Sockel und Schiff
  B(NW + 0.3, 0.5, ND + 0.3, STEIN, 0, 0, 0);
  B(NW, NH, ND, WEISS, 0, 0, 0, { line: 0.012 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let y = 0.5, k = 0; y < NH - 0.3; y += 0.4, k++) B(k % 2 ? 0.28 : 0.45, 0.32, 0.03, QUAD, sx * (NW / 2 - (k % 2 ? 0.14 : 0.22)), y, sz * (ND / 2 + 0.01), { cast: false });
  // Strebepfeiler und hohe Bogenfenster an beiden Seiten
  for (const sx of [-1, 1]) {
    for (const zz of [-4.2, -1.4, 1.4, 4.2]) { const sp = B(0.45, NH - 0.6, 0.55, WEISS, sx * (NW / 2 + 0.2), 0, zz, { line: 0.01 }); B(0.5, 0.25, 0.6, QUAD, sx * (NW / 2 + 0.22), NH - 0.6, zz); }
    for (const zz of [-2.8, 0, 2.8]) {
      B(0.06, 2.0, 0.9, GLAS, sx * (NW / 2 + 0.02), 1.4, zz, { cast: false });
      const arc = new THREE.Mesh(new THREE.CircleGeometry(0.45, 14, 0, Math.PI), toon(GLAS)); arc.rotation.y = sx * Math.PI / 2; arc.position.set(sx * (NW / 2 + 0.03), 3.4, zz); g.add(arc);
      B(0.08, 0.1, 1.1, QUAD, sx * (NW / 2 + 0.04), 1.3, zz, { cast: false });
      B(0.07, 2.1, 0.05, PAL.tinte, sx * (NW / 2 + 0.05), 1.4, zz, { cast: false }); B(0.07, 0.05, 0.9, PAL.tinte, sx * (NW / 2 + 0.05), 2.5, zz, { cast: false });
    }
  }
  // Dach mit Überstand, First und Ziegelreihen
  const rf = w.gable(NW + 1.2, 3.4, ND + 0.8, DACH, 0, NH, 0, 0, g); rf.castShadow = true;
  B(0.25, 0.14, ND + 0.9, '#5E2A1E', 0, NH + 3.35, 0, { cast: false });
  const ang = Math.atan2(3.4, (NW + 1.2) / 2);
  for (const sd of [-1, 1]) for (let k = 1; k < 5; k++) { const t = k / 5, m = B(0.05, 0.05, ND + 0.82, '#5E2A1E', sd * (NW + 1.2) / 2 * (1 - t), NH + 3.4 * t + 0.02, 0, { cast: false }); m.rotation.z = -sd * ang; }
  // Chor mit Apsis hinten, Rundfenster im Giebel
  const ap = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, NH - 0.6, 16, 1, false, Math.PI / 2, Math.PI), toon(WEISS)); ap.position.set(0, (NH - 0.6) / 2, -ND / 2); ap.castShadow = true; g.add(ap); outline(ap, 0.012);
  const apr = new THREE.Mesh(new THREE.ConeGeometry(2.45, 2.2, 16, 1, false, Math.PI / 2, Math.PI), toon(DACH)); apr.position.set(0, NH - 0.6 + 1.1, -ND / 2); apr.castShadow = true; g.add(apr);
  const rose = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), toon(GLAS)); rose.position.set(0, NH + 1.1, -ND / 2 - 0.03); rose.rotation.y = Math.PI; g.add(rose);
  const rr = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.07, 6, 18), toon(QUAD)); rr.position.copy(rose.position); g.add(rr);
  // Turm vorne
  const TZ = ND / 2 + 1.2, TW = 2.6, TH = 10.5;
  B(TW + 0.3, 0.6, TW + 0.3, STEIN, 0, 0, TZ);
  B(TW, TH, TW, WEISS, 0, 0, TZ, { line: 0.014 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let y = 0.6, k = 0; y < TH - 0.3; y += 0.45, k++) B(0.06, 0.36, k % 2 ? 0.3 : 0.5, QUAD, sx * (TW / 2 + 0.01), y, TZ + sz * (TW / 2 - (k % 2 ? 0.15 : 0.25)), { cast: false });
  B(TW + 0.12, 0.18, TW + 0.12, QUAD, 0, TH - 2.9, TZ); B(TW + 0.16, 0.2, TW + 0.16, QUAD, 0, TH, TZ);
  // Glockenstube: Schallöffnungen auf allen Seiten, Glocke sichtbar
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, ox = Math.sin(a) * (TW / 2 + 0.01), oz = Math.cos(a) * (TW / 2 + 0.01);
    const op = B(0.8, 1.3, 0.05, '#3A3530', ox, TH - 2.4, TZ + oz, { cast: false }); op.rotation.y = a;
    const oa = new THREE.Mesh(new THREE.CircleGeometry(0.4, 12, 0, Math.PI), toon('#3A3530')); oa.position.set(ox * 1.001, TH - 1.1, TZ + oz * 1.001); oa.rotation.y = a; g.add(oa);
    for (let j = 0; j < 3; j++) { const lv = B(0.82, 0.05, 0.08, PAL.nuss, ox * 1.02, TH - 2.2 + j * 0.38, TZ + oz * 1.02, { cast: false }); lv.rotation.y = a; }
    // Uhr mit Zeigern
    const cf = new THREE.Mesh(new THREE.CircleGeometry(0.62, 22), toon(PAL.tinte)); cf.position.set(ox * 1.012, TH - 4.3, TZ + oz * 1.012); cf.rotation.y = a; g.add(cf);
    const cw = new THREE.Mesh(new THREE.CircleGeometry(0.54, 22), toon('#F1E6C2')); cw.position.set(ox * 1.02, TH - 4.3, TZ + oz * 1.02); cw.rotation.y = a; g.add(cw);
    for (const [len, rz] of [[0.42, 0.3], [0.3, -1.9]]) { const hand = new THREE.Mesh(new THREE.BoxGeometry(0.05, len, 0.01), toon(PAL.tinte)); hand.geometry.translate(0, len / 2, 0); hand.position.set(ox * 1.03, TH - 4.3, TZ + oz * 1.03); hand.rotation.set(0, a, rz); g.add(hand); }
  }
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.48, 0.65, 12, 1, true), toon(GOLD, { side: THREE.DoubleSide })); bell.position.set(0, TH - 1.6, TZ); g.add(bell); w.churchBell = bell;
  // Spitzhelm mit vier Giebeln (Wimperge), Kugel, Kreuz, Güggel
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, gs = new THREE.Shape(); gs.moveTo(-TW / 2, 0); gs.lineTo(TW / 2, 0); gs.lineTo(0, 1.4); gs.closePath();
    const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(gs, { depth: 0.12, bevelEnabled: false }), toon(WEISS)); gm.position.set(Math.sin(a) * (TW / 2 - 0.06), TH + 0.2, TZ + Math.cos(a) * (TW / 2 - 0.06)); gm.rotation.y = a; g.add(gm); outline(gm, 0.012);
  }
  const helm = new THREE.Mesh(new THREE.ConeGeometry(TW * 0.74, 7.2, 8), toon(DACH)); helm.position.set(0, TH + 0.2 + 3.6, TZ); helm.rotation.y = Math.PI / 8; helm.castShadow = true; g.add(helm); outline(helm, 0.02);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon(GOLD)); ball.position.set(0, TH + 7.55, TZ); g.add(ball);
  B(0.07, 1.0, 0.07, GOLD, 0, TH + 7.6, TZ); B(0.5, 0.07, 0.07, GOLD, 0, TH + 8.25, TZ);
  const rooster = new THREE.Group(); rooster.position.set(0, TH + 8.75, TZ); g.add(rooster); w.churchRooster = rooster;
  const rb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), toon(GOLD)); rb.scale.set(1.5, 1, 0.5); rooster.add(rb);
  const rt = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 6), toon(GOLD)); rt.position.set(-0.25, 0.12, 0); rt.rotation.z = 0.9; rooster.add(rt);
  const rh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), toon(GOLD)); rh.position.set(0.22, 0.15, 0); rooster.add(rh);
  // Vorzeichen (Vordach) vor dem Eingang, Doppeltüre mit Bogen
  const VZ = TZ + TW / 2 + 0.9;
  for (const sx of [-0.85, 0.85]) w.cyl(0.08, 0.1, 2.3, PAL.nuss, sx, 0, VZ + 0.6, { parent: g, seg: 8 });
  const vd = w.gable(2.4, 0.9, 1.9, DACH, 0, 2.3, VZ, 0, g);
  B(1.3, 2.1, 0.08, PAL.nuss, 0, 0, TZ + TW / 2 + 0.03, { line: 0.01 });
  const da = new THREE.Mesh(new THREE.CircleGeometry(0.65, 14, 0, Math.PI), toon(PAL.nuss)); da.position.set(0, 2.1, TZ + TW / 2 + 0.04); g.add(da);
  B(0.03, 2.1, 0.02, PAL.tinte, 0, 0, TZ + TW / 2 + 0.08, { cast: false });
  B(2.0, 0.15, 1.6, STEIN, 0, 0, VZ + 0.2, { cast: false });
  // Kollision: Schiff, Turm, Apsis
  const C = (lx0, lz0, lx1, lz1, h) => {
    const pts = [[lx0, lz0], [lx1, lz0], [lx0, lz1], [lx1, lz1]].map(([a, b]) => [x + a * Math.cos(rot) + b * Math.sin(rot), z - a * Math.sin(rot) + b * Math.cos(rot)]);
    w.addCollider(Math.min(...pts.map(p => p[0])), 0, Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), h, Math.max(...pts.map(p => p[1])));
  };
  C(-NW / 2 - 0.4, -ND / 2 - 2.2, NW / 2 + 0.4, ND / 2, 8); C(-TW / 2, ND / 2, TW / 2, ND / 2 + TW + 0.4, 20);
  const door = new THREE.Vector3(Math.sin(rot) * (VZ + 1.4), 0, Math.cos(rot) * (VZ + 1.4)).add(g.position);
  w.addInteractable('churchbell', door, 1.2, 'Glocke');
  return g;
}
function maibaum(w, x, z) {
  const h = 9;
  w.cyl(0.08, 0.13, h, PAL.schnee, x, 0, z, { seg: 8, solid: true });
  for (let k = 0; k < 14; k++) { const s = w.cyl(0.135 - k * 0.003, 0.135 - k * 0.003, 0.25, k % 2 ? PAL.gletscher : PAL.schnee, x, 0.4 + k * 0.6, z, { seg: 8, cast: false }); s.rotation.z = 0.25; }
  const wr = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 5, 14), toon(PAL.matte)); wr.rotation.x = Math.PI / 2; wr.position.set(x, h - 1.4, z); w.scene.add(wr);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const rb = w.box(0.05, 1.2, 0.02, [PAL.rot, PAL.schnee, PAL.ocker][k % 3], x + Math.cos(a) * 0.72, h - 2.6, z + Math.sin(a) * 0.72, { cast: false }); rb.rotation.z = w.jit(0.2); }
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 7), toon(PAL.matte)); top.position.set(x, h + 0.55, z); w.scene.add(top);
  // Zunftschilder an Ästen
  [[0, 5.2, '#C99A3B'], [Math.PI * 0.66, 4.3, '#8B5A35'], [Math.PI * 1.33, 3.4, '#5E86A8']].forEach(([a, y, c]) => {
    const ax = x + Math.cos(a) * 0.55, az = z + Math.sin(a) * 0.55;
    const arm = w.box(0.7, 0.04, 0.04, PAL.tinte, ax, y, az, { cast: false }); arm.rotation.y = -a;
    const s = w.box(0.42, 0.42, 0.04, c, x + Math.cos(a) * 0.9, y - 0.45, z + Math.sin(a) * 0.9, { line: 0.01 }); s.rotation.y = -a + Math.PI / 2;
  });
}
function wegkreuz(w, x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; w.scene.add(g);
  w.box(0.5, 0.25, 0.5, STEIN, 0, 0, 0, { parent: g });
  w.box(0.1, 2.0, 0.1, PAL.nuss, 0, 0.25, 0, { parent: g }); w.box(0.9, 0.1, 0.1, PAL.nuss, 0, 1.75, 0, { parent: g });
  const roof = w.gable(1.1, 0.35, 0.4, PAL.tinte, 0, 2.25, 0, 0, g);
  for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), toon(k % 2 ? PAL.rot : PAL.ocker)); f.position.set(-0.12 + k * 0.12, 0.33, 0.2); g.add(f); }
  w.cyl(0.05, 0.05, 0.12, PAL.rot, 0.15, 0.25, 0.18, { parent: g, seg: 6 });
  w.addCollider(x - 0.3, 0, z - 0.3, x + 0.3, 2, z + 0.3);
}
function hen(w, x, z, rot, c = PAL.schnee) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; w.scene.add(g);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), toon(c)); b.scale.set(1, 0.85, 1.2); b.position.y = 0.2; g.add(b); outline(b, 0.012);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), toon(c)); hd.position.set(0, 0.36, 0.14); g.add(hd);
  const cm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.07), toon(PAL.rot)); cm.position.set(0, 0.44, 0.14); g.add(cm);
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), toon(PAL.ocker)); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.35, 0.22); g.add(bk);
  const tl = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 5), toon(c)); tl.rotation.x = -0.9; tl.position.set(0, 0.32, -0.18); g.add(tl);
  for (const s of [-0.05, 0.05]) w.box(0.02, 0.1, 0.02, PAL.ocker, s, 0, 0, { parent: g, cast: false });
  return g;
}
function tractor(w, x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; w.scene.add(g);
  w.box(0.9, 0.55, 1.6, PAL.rot, 0, 0.45, 0.1, { parent: g, line: 0.012 });
  w.box(0.9, 0.9, 0.7, PAL.rot, 0, 0.45, -0.6, { parent: g, line: 0.012 });
  w.box(0.8, 0.05, 0.75, PAL.tinte, 0, 1.4, -0.6, { parent: g });
  for (const s of [-0.38, 0.38]) w.box(0.04, 0.5, 0.04, PAL.tinte, s, 0.9, -0.95, { parent: g });
  w.cyl(0.05, 0.05, 0.6, PAL.tinte, 0.25, 0.95, 0.6, { parent: g, seg: 6 });
  for (const [s, zz, r] of [[-0.55, -0.6, 0.55], [0.55, -0.6, 0.55], [-0.5, 0.75, 0.33], [0.5, 0.75, 0.33]]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.28, 14), toon(PAL.tinte)); wh.rotation.z = Math.PI / 2; wh.position.set(s, r, zz); wh.castShadow = true; g.add(wh);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.3, 10), toon(PAL.ocker)); hub.rotation.z = Math.PI / 2; hub.position.copy(wh.position); g.add(hub);
  }
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
  w.addCollider(x - (0.7 * c + 1.2 * s), 0, z - (0.7 * s + 1.2 * c), x + (0.7 * c + 1.2 * s), 1.5, z + (0.7 * s + 1.2 * c));
}
function mist(w, x, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1.0, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon('#6B5537')); m.scale.set(1.3, 0.55, 1); m.position.set(x, 0, z); m.castShadow = true; w.scene.add(m);
  for (let k = 0; k < 5; k++) w.box(0.5, 0.04, 0.06, '#C9B26A', x - 0.8 + k * 0.4, 0.4 + (k % 2) * 0.1, z + w.jit(0.6), { cast: false }).rotation.y = w.jit(1);
  w.box(0.04, 1.3, 0.04, PAL.nuss, x + 1.0, 0, z + 0.4, { tilt: 0.5 }); w.box(0.3, 0.04, 0.1, BLECH, x + 1.35, 1.1, z + 0.4, { cast: false });
  w.addCollider(x - 1.2, 0, z - 0.9, x + 1.2, 0.6, z + 0.9);
}
function garden(w, x, z, wd, dp) {
  w.box(wd, 0.12, dp, '#5C4632', x, 0, z, { cast: false });
  for (let i = 0; i < Math.floor(wd / 0.45); i++) for (let j = 0; j < Math.floor(dp / 0.5); j++) {
    const kind = (i + j) % 3, px = x - wd / 2 + 0.25 + i * 0.45, pz = z - dp / 2 + 0.25 + j * 0.5;
    const m = new THREE.Mesh(kind === 0 ? new THREE.SphereGeometry(0.16, 7, 5) : new THREE.ConeGeometry(0.1, 0.3, 5), toon(kind === 2 ? PAL.matte : kind === 1 ? '#7FA05A' : '#8DB06A')); m.position.set(px, 0.2, pz); m.castShadow = true; w.scene.add(m);
  }
  // Staketenzaun
  const n = Math.round((wd + dp) * 2 / 0.25);
  const pts = [[x - wd / 2 - 0.1, z - dp / 2 - 0.1], [x + wd / 2 + 0.1, z - dp / 2 - 0.1], [x + wd / 2 + 0.1, z + dp / 2 + 0.1], [x - wd / 2 - 0.1, z + dp / 2 + 0.1]];
  for (let s = 0; s < 4; s++) {
    const [ax, az] = pts[s], [bx, bz] = pts[(s + 1) % 4], len = Math.hypot(bx - ax, bz - az), m = Math.round(len / 0.22);
    if (s === 3) continue; // vorne offen
    for (let k = 0; k <= m; k++) w.box(0.05, 0.55 + w.jit(0.05), 0.03, HOLZHELL, ax + (bx - ax) * k / m, 0, az + (bz - az) * k / m, { tilt: w.jit(0.06), cast: false });
  }
  // Vogelscheuche
  w.box(0.06, 1.6, 0.06, PAL.nuss, x, 0, z); w.box(1.0, 0.06, 0.06, PAL.nuss, x, 1.25, z);
  w.box(0.5, 0.6, 0.12, PAL.rot, x, 0.75, z, { line: 0.01 });
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), toon('#C9B26A')); hd.position.set(x, 1.6, z); w.scene.add(hd);
  const ht = w.cyl(0.28, 0.28, 0.04, PAL.chalet, x, 1.72, z, { seg: 10 }); ht.rotation.z = 0.2;
  w.addCollider(x - wd / 2 - 0.15, 0, z - dp / 2 - 0.15, x + wd / 2 + 0.15, 0.6, z + dp / 2 - 0.2);
}
function poles(w) {
  // Holzmasten mit durchhängenden Leitungen hinter dem Nordzaun
  const xs = [-7, 3, 13, 23], z = -13.5;
  xs.forEach(x => { w.box(0.14, 5.5, 0.14, PAL.nuss, x, 0, z, { tilt: w.jit(0.04) }); w.box(1.2, 0.08, 0.08, PAL.nuss, x, 5.2, z); for (const s of [-0.5, 0, 0.5]) w.box(0.06, 0.12, 0.06, PAL.schnee, x + s, 5.28, z, { cast: false }); });
  for (let i = 0; i < xs.length - 1; i++) for (const s of [-0.5, 0, 0.5]) {
    const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new THREE.Vector3(xs[i] + s + (xs[i + 1] - xs[i]) * t, 5.36 - Math.sin(t * Math.PI) * 0.55, z)); }
    const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.015, 3), toon(PAL.tinte)); wire.castShadow = false; w.scene.add(wire);
  }
}
function haystack(w, x, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 12), toon('#D7BE6E')); m.rotation.z = Math.PI / 2; m.rotation.y = w.jit(1); m.position.set(x, 0.55, z); m.castShadow = true; w.scene.add(m);
  const c = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 4, 14), toon('#B89E52')); c.rotation.copy(m.rotation); c.rotation.y += Math.PI / 2; c.position.copy(m.position); w.scene.add(c);
}
function stadel(w, x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; w.scene.add(g);
  w.box(3.2, 2.4, 2.6, PAL.chalet, 0, 0.3, 0, { parent: g, line: 0.012 });
  for (const s of [-1.3, 1.3]) for (const t of [-1.0, 1.0]) w.box(0.3, 0.3, 0.3, STEIN, s, 0, t, { parent: g });
  for (let y = 0.6; y < 2.6; y += 0.25) w.box(3.22, 0.02, 2.62, PAL.nuss, 0, y, 0, { parent: g, cast: false });
  const rf = w.gable(3.8, 1.3, 3.0, PAL.tinte, 0, 2.7, 0, 0, g);
  w.box(1.0, 1.4, 0.05, PAL.nuss, 0.4, 0.4, 1.31, { parent: g });
}
function puddles(w) {
  for (const [x, z, s] of [[3.2, 9.4, 0.9], [-6.5, 14.6, 0.6], [7.5, 18.2, 0.7], [-2.2, 6.8, 0.5]]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(s, 14), toon(PAL.gletscher)); m.rotation.x = -Math.PI / 2; m.scale.y = 0.6; m.position.set(x, 0.045, z); m.receiveShadow = true; w.scene.add(m);
  }
}
function cobbles(w) {
  // Pflastersteine am Rand des Platzes und entlang des Wegs
  const r = rnd(4242);
  for (let k = 0; k < 130; k++) {
    const edge = r() < 0.5, x = edge ? (r() < 0.5 ? -9 : 9) + (r() - 0.5) * 1.2 : (r() - 0.5) * 18, z = edge ? 6 + r() * 13 : (r() < 0.5 ? 6.2 : 18.9) + (r() - 0.5) * 0.7;
    const s = w.box(0.28 + r() * 0.12, 0.03, 0.22 + r() * 0.1, r() < 0.5 ? '#DCD8CC' : '#CFCABB', x, 0.03, z, { cast: false }); s.rotation.y = r() * 0.4;
  }
}
export function benchTable(w, x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; w.scene.add(g);
  w.box(1.8, 0.05, 0.6, HOLZHELL, 0, 0.72, 0, { parent: g });
  for (const s of [-0.75, 0.75]) { const a = w.box(0.05, 0.75, 0.6, PAL.nuss, s, 0, 0, { parent: g }); }
  for (const zz of [-0.55, 0.55]) { w.box(1.8, 0.05, 0.25, HOLZHELL, 0, 0.44, zz, { parent: g }); for (const s of [-0.75, 0.75]) w.box(0.05, 0.44, 0.22, PAL.nuss, s, 0, zz, { parent: g }); }
  w.cyl(0.06, 0.05, 0.18, '#E8C46A', 0.3, 0.77, 0.05, { parent: g, seg: 8 });
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
  w.addCollider(x - (0.95 * c + 0.7 * s), 0, z - (0.95 * s + 0.7 * c), x + (0.95 * c + 0.7 * s), 0.8, z + (0.95 * s + 0.7 * c), true);
}

export function detailVillage(w) {
  w.houses.forEach((g, i) => decorateHouse(w, g, i));
  for (const [x, z] of [[-8.6, 6.6], [8.6, 6.6], [-8.6, 19.3], [8.6, 19.3]]) lamp(w, x, z);
  church(w, -18, -19, 0.25);
  maibaum(w, 7.6, 10.4);
  wegkreuz(w, -7.6, -0.6, 0.4);
  tractor(w, 16.5, 7.8, 0.6);
  mist(w, 19.5, 9.8);
  garden(w, -16.4, 10.2, 2.6, 2.2);
  poles(w);
  for (const [x, z] of [[-9, -16], [-6.5, -17.2], [7, -15.5], [10, -17], [12.5, -15]]) haystack(w, x, z);
  stadel(w, 16, -18, -0.3);
  puddles(w);
  cobbles(w);
  benchTable(w, -6.8, 8.2, 0.1);
  buildSmoke(w);
  const henCols = [PAL.schnee, PAL.chalet, PAL.schnee, PAL.ocker, PAL.schnee];
  w.hens = [[15.2, 10.3], [14.6, 11.4], [16.1, 11.1], [17.0, 10.0], [15.6, 12.2]].map(([x, z], i) => hen(w, x, z, i * 1.3, henCols[i]));
}
// Hühner picken (nicht zusammengefasst, damit sie sich bewegen)
export function stepHens(w, t) {
  if (!w.hens) return;
  w.hens.forEach((g, i) => { const k = Math.max(0, Math.sin(t * 3 + i * 1.7)); g.rotation.x = k > 0.8 ? 0.5 : 0; g.position.y = 0; g.rotation.y += Math.sin(t * 0.5 + i) * 0.003; });
}

// ---------------- Wahlplakate der führenden Partei ----------------
// Hängen an Hauswänden rund um den Platz und wechseln, wenn eine andere Partei vorne liegt.
let posterCv = null, posterTex = null, posterLead = null;
export function partyPosters(w) {
  posterCv = document.createElement('canvas'); posterCv.width = 256; posterCv.height = 340;
  posterTex = new THREE.CanvasTexture(posterCv); posterTex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: posterTex });
  const spots = [[0, -0.5], [5, -0.6], [6, 0.7], [7, -0.5], [10, 0.6], [11, -0.6]];
  w.partyPosters = [];
  for (const [i, dx] of spots) {
    const g = w.houses[i]; if (!g) continue;
    const { w: W, d: D } = g.userData;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.96), mat);
    m.position.set(dx * (W / 2 - 0.55) / 0.6, 1.25, D / 2 + 0.035); m.rotation.z = (i % 3 - 1) * 0.04; g.add(m);
    w.partyPosters.push(m);
  }
  // zwei Plakate an der Front des Amtshauses (gut sichtbar vom Platz)
  for (const x of [-4.7, 4.9]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.06), mat); m.position.set(x, 1.35, ROOM.z1 + ROOM.wall + 0.04); m.rotation.z = x < 0 ? 0.03 : -0.05; w.scene.add(m); w.partyPosters.push(m); }
  return w.partyPosters;
}
export function updatePosters(lead, P) {
  if (!posterCv || lead === posterLead) return;
  posterLead = lead;
  const c = posterCv.getContext('2d'), p = P[lead], L = (a) => a[0];
  c.fillStyle = p.color; c.fillRect(0, 0, 256, 340);
  c.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 6; i++) c.fillRect(0, 40 + i * 52, 256, 18);
  c.fillStyle = PAL.schnee; c.font = 'bold 74px Georgia, serif'; c.textAlign = 'center'; c.fillText(p.short, 128, 110);
  // kleine Wolke als Logo
  for (const [x, y, r] of [[100, 170, 26], [128, 158, 34], [158, 172, 24]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  c.font = 'italic 22px Georgia, serif'; const words = L(p.slogan).split(' '); let line = '', y = 238;
  for (const wd of words) { if (c.measureText(line + wd).width > 220) { c.fillText(line.trim(), 128, y); y += 28; line = ''; } line += wd + ' '; }
  c.fillText(line.trim(), 128, y);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, 322, 256, 18);
  posterTex.needsUpdate = true;
}
