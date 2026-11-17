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
function lamp(w, x, z) {
  w.cyl(0.05, 0.07, 3.0, PAL.tinte, x, 0, z, { seg: 6, solid: true });
  w.box(0.5, 0.04, 0.04, PAL.tinte, x + 0.22, 2.95, z);
  const sh = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 8, 1, true), toon(PAL.tinte, { side: THREE.DoubleSide })); sh.position.set(x + 0.42, 2.85, z); w.scene.add(sh);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), BULB);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), HALO); halo.position.copy(bulb.position); w.scene.add(halo); bulb.position.set(x + 0.42, 2.77, z); w.scene.add(bulb);
}
function church(w, x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; w.scene.add(g);
  w.box(4.2, 3.4, 7, PAL.schnee, 0, 0, 0, { parent: g, line: 0.015 });
  w.box(4.3, 0.4, 7.1, STEIN, 0, 0, 0, { parent: g });
  const rf = w.gable(5.0, 2.4, 7.5, ZIEGEL, 0, 3.4, 0, 0, g); rf.castShadow = true;
  for (const zz of [-2, 0, 2]) { w.box(0.06, 1.4, 0.5, PAL.tinte, 2.12, 1.2, zz, { parent: g, cast: false }); const a = new THREE.Mesh(new THREE.CircleGeometry(0.25, 10, 0, Math.PI), toon(PAL.tinte)); a.rotation.y = Math.PI / 2; a.position.set(2.13, 2.6, zz); g.add(a); }
  // Turm mit Spitzhelm, Uhr und Glocke
  w.box(1.8, 6.2, 1.8, PAL.schnee, 0, 0, 4.3, { parent: g, line: 0.015 });
  const helm = new THREE.Mesh(new THREE.ConeGeometry(1.35, 3.6, 4), toon(ZIEGEL2)); helm.rotation.y = Math.PI / 4; helm.position.set(0, 6.2 + 1.8, 4.3); helm.castShadow = true; g.add(helm); outline(helm, 0.02);
  w.box(0.05, 0.8, 0.05, PAL.ocker, 0, 9.8, 4.3, { parent: g }); w.box(0.4, 0.05, 0.05, PAL.ocker, 0, 10.3, 4.3, { parent: g });
  const cl = new THREE.Mesh(new THREE.CircleGeometry(0.42, 18), toon(PAL.papier)); cl.position.set(0, 5.0, 5.21); g.add(cl);
  w.box(0.04, 0.3, 0.02, PAL.tinte, 0, 5.05, 5.23, { parent: g, cast: false }); const hd = w.box(0.04, 0.22, 0.02, PAL.tinte, 0.06, 4.95, 5.23, { parent: g, cast: false }); hd.rotation.z = -1.2;
  for (const s of [-1, 1]) { const sl = w.box(0.04, 0.7, 0.4, PAL.tinte, s * 0.91, 3.9, 4.3, { parent: g, cast: false }); }
  w.box(0.9, 1.6, 0.06, PAL.nuss, 0, 0, 5.22, { parent: g });
  // Friedhofsmäuerchen mit Kreuzen
  for (let k = 0; k < 5; k++) { const cx = -3.4 + k * 0.6, cz = -1.5 + (k % 2) * 1.2; w.box(0.06, 0.6, 0.06, PAL.tinte, cx, 0, cz, { parent: g }); w.box(0.3, 0.06, 0.06, PAL.tinte, cx, 0.42, cz, { parent: g }); }
  w.box(0.3, 0.55, 5.2, STEIN, -4.1, 0, 0, { parent: g });
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
  const xs = [-22, -13, -4, 5, 14, 23], z = -13.5;
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
function benchTable(w, x, z, rot) {
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
  church(w, -18, -17, 0.25);
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
