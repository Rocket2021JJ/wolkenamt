// Einrichtung des Amtsbüros (um 1930, nie renoviert), Wolkenplattform auf dem Dach,
// Plakate an den Wänden im Büro und im Dorf.
import * as THREE from 'three';
import { PAL, rng } from './palette.js';
import { toon, outline, inkFlat } from './toon.js';
import { drawPoster, pickPosters, PW, PH } from './posters.js';
import { ROOM } from './world3d.js';
import { t } from './i18n.js';

export function furnish(w) {
  const R = ROOM, J = a => w.jit(a);
  const o = { posters: [], clock: null, lamp: null };

  // ---------- Pult ----------
  const D = w.deskPos;
  const desk = new THREE.Group(); desk.position.copy(D); desk.rotation.y = 0.015; w.scene.add(desk);
  const top = w.box(2.5, 0.1, 1.15, PAL.nuss, 0, 0.74, 0, { parent: desk, line: 0.012 });
  // Unterbauten mit Schubladen
  for (const sx of [-0.88, 0.88]) {
    w.box(0.66, 0.74, 1.05, PAL.nuss, sx, 0, 0, { parent: desk });
    for (let i = 0; i < 3; i++) {
      w.box(0.58, 0.012, 0.02, PAL.tinte, sx, 0.2 + i * 0.22, 0.53, { parent: desk, cast: false });
      w.box(0.1, 0.03, 0.04, PAL.ocker, sx, 0.11 + i * 0.22, 0.54, { parent: desk, cast: false });
    }
  }
  w.box(1.1, 0.5, 0.04, PAL.nuss, 0, 0.24, -0.45, { parent: desk });
  w.addCollider(D.x - 1.28, 0, D.z - 0.6, D.x + 1.28, 0.85, D.z + 0.6);
  const Y = 0.84;
  // Schreibmaschine
  const tw = new THREE.Group(); tw.position.set(-0.55, Y, 0.05); tw.rotation.y = 0.12; desk.add(tw);
  w.box(0.5, 0.16, 0.4, PAL.tinte, 0, 0, 0, { parent: tw });
  w.box(0.44, 0.06, 0.16, PAL.tinte, 0, 0.12, -0.12, { parent: tw });
  for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6), toon(PAL.papier)); c.position.set(-0.17 + k * 0.057 + r * 0.01, 0.17 + r * 0.02, 0.12 - r * 0.055); tw.add(c); }
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.56, 10), toon(PAL.tinte)); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.2, -0.15); tw.add(roll);
  w.box(0.3, 0.26, 0.01, PAL.papier, 0, 0.2, -0.17, { parent: tw }).rotation.x = -0.15;
  // Stempelkarussell
  const sc = new THREE.Group(); sc.position.set(0.25, Y, -0.25); desk.add(sc);
  w.cyl(0.16, 0.18, 0.04, PAL.nuss, 0, 0, 0, { parent: sc });
  w.cyl(0.02, 0.02, 0.24, PAL.tinte, 0, 0.04, 0, { parent: sc });
  w.cyl(0.15, 0.15, 0.02, PAL.nuss, 0, 0.2, 0, { parent: sc });
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, s = new THREE.Group(); s.position.set(Math.cos(a) * 0.12, 0.05, Math.sin(a) * 0.12); sc.add(s);
    w.cyl(0.018, 0.018, 0.13, PAL.nuss, 0, 0, 0, { parent: s, seg: 6 });
    w.cyl(0.03, 0.025, 0.04, i % 3 === 0 ? PAL.rot : PAL.tinte, 0, 0.13, 0, { parent: s, seg: 8 });
  }
  o.carousel = sc;
  // Tintenkissen
  w.box(0.24, 0.025, 0.16, PAL.tinte, 0.62, Y, 0.18, { parent: desk });
  w.box(0.2, 0.01, 0.12, PAL.blau, 0.62, Y + 0.025, 0.18, { parent: desk, cast: false });
  // grosser Stempel daneben
  w.cyl(0.035, 0.05, 0.05, PAL.tinte, 0.3, Y, 0.28, { parent: desk, seg: 8 });
  w.cyl(0.02, 0.02, 0.09, PAL.nuss, 0.3, Y + 0.05, 0.28, { parent: desk, seg: 6 });
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), toon(PAL.rot)); knob.position.set(0.3, Y + 0.16, 0.28); desk.add(knob);
  // Wählscheibentelefon
  const ph = new THREE.Group(); ph.position.set(0.95, Y, -0.25); ph.rotation.y = -0.4; desk.add(ph);
  w.box(0.22, 0.09, 0.24, PAL.tinte, 0, 0, 0, { parent: ph });
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 14), toon(PAL.papier)); dial.position.set(0, 0.1, 0.05); dial.rotation.x = 0.35; ph.add(dial);
  const hs = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.2, 4, 8), toon(PAL.tinte)); hs.rotation.z = Math.PI / 2; hs.position.set(0, 0.14, -0.05); ph.add(hs);
  o.handset = hs;
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), toon(PAL.tinte)); e.position.set(s * 0.12, 0.14, -0.05); e.scale.y = 0.7; ph.add(e); }
  // Stapel Anträge
  for (let i = 0; i < 9; i++) w.box(0.3, 0.012, 0.4, i % 4 === 3 ? PAL.lino : PAL.papier, 0.0 + J(0.03), Y + i * 0.013, 0.2 + J(0.02), { parent: desk, rot: J(0.12), cast: i === 8 });
  // Stuhl
  const ch = new THREE.Group(); ch.position.set(D.x + 0.1, 0, D.z + 1.05); ch.rotation.y = Math.PI + 0.25; w.scene.add(ch);
  w.box(0.5, 0.06, 0.48, PAL.nuss, 0, 0.45, 0, { parent: ch });
  w.box(0.5, 0.5, 0.05, PAL.nuss, 0, 0.5, -0.22, { parent: ch });
  for (const [x, z] of [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.2], [0.21, 0.2]]) w.box(0.05, 0.45, 0.05, PAL.nuss, x, 0, z, { parent: ch });

  // ---------- Pendellampe über dem Pult ----------
  const lampY = 2.15, LZ = D.z - 0.75;
  w.box(0.015, R.h - lampY - 0.3, 0.015, PAL.tinte, D.x, lampY + 0.3, LZ, { cast: false });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.42, 0.3, 14, 1, true), toon(PAL.lino, { side: THREE.DoubleSide }));
  shade.position.set(D.x, lampY + 0.15, LZ); shade.castShadow = true; w.scene.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: PAL.lampe }));
  bulb.position.set(D.x, lampY + 0.04, LZ); w.scene.add(bulb);
  const pl = new THREE.PointLight(PAL.lampe, 2.2, 6, 1.6); pl.position.set(D.x, lampY - 0.05, LZ); w.scene.add(pl);
  o.lamp = { shade, bulb, pl };

  // ---------- Wanduhr über dem Pult ----------
  const clock = new THREE.Group(); clock.position.set(-0.9, 2.35, R.z0 + 0.06); w.groups.n.add(clock);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 24), [toon(PAL.tinte), toon(PAL.papier), toon(PAL.tinte)]);
  face.rotation.x = Math.PI / 2; clock.add(face);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const m = new THREE.Mesh(new THREE.BoxGeometry(0.018, i % 3 ? 0.04 : 0.07, 0.01), inkFlat); m.position.set(Math.sin(a) * 0.24, Math.cos(a) * 0.24, 0.03); m.rotation.z = -a; clock.add(m); }
  const hand = (l, wd) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(wd, l, 0.01), inkFlat); m.position.y = l / 2 - 0.02; g.add(m); g.position.z = 0.04; clock.add(g); return g; };
  o.clock = { h: hand(0.15, 0.03), m: hand(0.22, 0.02), s: hand(0.23, 0.006) };
  o.clock.s.children[0].material = toon(PAL.rot);

  // ---------- Fenster (Rahmen mit Sprossen) ----------
  const W = w.win, wz = R.z0 - R.wall / 2;
  const fr = (x, y, ww, hh) => w.box(ww, hh, R.wall + 0.06, PAL.nuss, x, y, wz, { cast: false, parent: w.groups.n });
  fr((W.x0 + W.x1) / 2, W.y0 - 0.06, W.x1 - W.x0 + 0.2, 0.08); fr((W.x0 + W.x1) / 2, W.y1 - 0.02, W.x1 - W.x0 + 0.2, 0.08);
  fr(W.x0 - 0.04, W.y0, 0.08, W.y1 - W.y0); fr(W.x1 + 0.04, W.y0, 0.08, W.y1 - W.y0);
  fr((W.x0 + W.x1) / 2, W.y0, 0.05, W.y1 - W.y0); w.box(W.x1 - W.x0, 0.05, 0.05, PAL.nuss, (W.x0 + W.x1) / 2, (W.y0 + W.y1) / 2, wz, { cast: false, parent: w.groups.n });
  // Fensterbank mit Geranie
  w.box(W.x1 - W.x0 + 0.3, 0.05, 0.3, PAL.nuss, (W.x0 + W.x1) / 2, W.y0 - 0.06, R.z0 + 0.12);
  w.box(0.4, 0.14, 0.14, PAL.chalet, W.x0 + 0.4, W.y0, R.z0 + 0.13);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), toon(i % 2 ? PAL.rot : PAL.matte)); b.position.set(W.x0 + 0.28 + i * 0.05, W.y0 + 0.2 + (i % 3) * 0.04, R.z0 + 0.13 + J(0.03)); w.scene.add(b); }

  // ---------- Heizkörper unter dem Fenster ----------
  const hx = (W.x0 + W.x1) / 2;
  for (let i = 0; i < 14; i++) w.box(0.06, 0.62, 0.16, PAL.papier, hx - 0.65 + i * 0.1, 0.12, R.z0 + 0.2, { line: 0 });
  w.box(1.45, 0.04, 0.04, PAL.tinte, hx, 0.14, R.z0 + 0.2, { cast: false }); w.box(1.45, 0.04, 0.04, PAL.tinte, hx, 0.7, R.z0 + 0.2, { cast: false });
  w.box(0.04, 0.12, 0.04, PAL.tinte, hx - 0.7, 0, R.z0 + 0.2); w.box(0.04, 0.12, 0.04, PAL.tinte, hx + 0.68, 0, R.z0 + 0.2);
  w.addCollider(hx - 0.75, 0, R.z0, hx + 0.75, 0.75, R.z0 + 0.3);

  // ---------- Aktenschränke (Linoleumgrün) an der Westwand ----------
  for (let i = 0; i < 3; i++) {
    const z = -2.7 + i * 0.95 + J(0.02), h = 1.75 + J(0.06) + (i === 1 ? 0.12 : 0);
    w.box(0.62, h, 0.88, PAL.lino, R.x0 + 0.36, 0, z, { solid: true, rot: J(0.015), line: 0.01 });
    for (let k = 0; k < 4; k++) {
      const y = 0.15 + k * (h - 0.2) / 4;
      w.box(0.02, 0.012, 0.8, PAL.tinte, R.x0 + 0.675, y + (h - 0.2) / 4 - 0.03, z, { cast: false });
      w.box(0.03, 0.04, 0.16, PAL.ocker, R.x0 + 0.68, y + 0.2, z, { cast: false });
      w.box(0.015, 0.06, 0.12, PAL.papier, R.x0 + 0.678, y + 0.27, z, { cast: false });
    }
  }
  // Akten obendrauf
  for (let i = 0; i < 5; i++) w.box(0.3, 0.05, 0.4, i % 2 ? PAL.papier : PAL.ocker, R.x0 + 0.38 + J(0.04), 1.87 + i * 0.05 + 0.12, -1.75 + J(0.05), { rot: J(0.2), cast: false });

  // ---------- Regale mit Ordnern (Nordwand rechts) ----------
  const sx0 = 1.0, sx1 = 3.9;
  for (const x of [sx0, (sx0 + sx1) / 2, sx1]) w.box(0.05, 2.2, 0.38, PAL.nuss, x, 0, R.z0 + 0.22);
  for (let k = 0; k < 5; k++) {
    const y = 0.08 + k * 0.5;
    w.box(sx1 - sx0 + 0.05, 0.035, 0.38, PAL.nuss, (sx0 + sx1) / 2, y, R.z0 + 0.22);
    if (k === 4) continue;
    let x = sx0 + 0.06;
    while (x < sx1 - 0.08) {
      if (Math.abs(x - (sx0 + sx1) / 2) < 0.06) { x += 0.08; continue; }
      if (w.r() < 0.08) { x += 0.12 + w.r() * 0.2; continue; }
      const wd = 0.06 + w.r() * 0.025, hh = 0.34 + w.r() * 0.06, col = w.r() < 0.78 ? PAL.ocker : w.r() < 0.5 ? PAL.lino : PAL.blau;
      const lean = w.r() < 0.1 ? 0.25 : J(0.03);
      const b = w.box(wd, hh, 0.3, col, x + wd / 2, y + 0.035, R.z0 + 0.24, { cast: false }); b.rotation.z = lean; if (lean) b.position.x += lean * 0.1;
      w.box(wd * 0.8, 0.07, 0.01, PAL.papier, x + wd / 2, y + 0.035 + hh * 0.55, R.z0 + 0.395, { cast: false }).rotation.z = lean;
      x += wd + 0.008;
    }
  }
  w.addCollider(sx0 - 0.05, 0, R.z0, sx1 + 0.05, 2.2, R.z0 + 0.42);

  // ---------- Garderobe mit Amtsmützen (neben der Tür) ----------
  const gx = -2.3, gz = R.z1 - 0.45;
  w.cyl(0.04, 0.05, 1.85, PAL.nuss, gx, 0, gz, { seg: 8 });
  w.cyl(0.25, 0.28, 0.05, PAL.nuss, gx, 0, gz, { seg: 10 });
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + 0.3;
    const hook = w.box(0.03, 0.03, 0.22, PAL.tinte, gx + Math.sin(a) * 0.09, 1.72, gz + Math.cos(a) * 0.09, { cast: false }); hook.rotation.y = a; hook.rotation.x = -0.4;
    if (i < 3) { // Amtsmütze
      const cap = new THREE.Group(); cap.position.set(gx + Math.sin(a) * 0.24, 1.66 - (i === 1 ? 0.05 : 0), gz + Math.cos(a) * 0.24); cap.rotation.set(0.5, a, 0.2); w.scene.add(cap);
      const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.1, 14), toon(PAL.tinte)); cr.castShadow = true; cap.add(cr);
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12, 1, false, -Math.PI / 2, Math.PI), toon(PAL.tinte)); br.position.set(0, -0.04, 0.11); br.scale.z = 0.6; cap.add(br);
      const bd = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.015), toon(PAL.ocker)); bd.position.set(0, 0.01, 0.16); cap.add(bd);
    }
  }
  // Mantel
  const coat = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.6, 4, 8), toon(PAL.lino)); coat.position.set(gx - 0.12, 1.15, gz + 0.1); coat.rotation.z = 0.12; coat.castShadow = true; w.scene.add(coat);
  w.addCollider(gx - 0.25, 0, gz - 0.25, gx + 0.25, 1.9, gz + 0.25);

  // ---------- Kaffeemaschine auf Anrichte (Westwand vorne) ----------
  const kx = R.x0 + 0.4, kz = 2.6;
  w.box(0.6, 0.85, 1.2, PAL.nuss, kx, 0, kz, { solid: true, line: 0.01 });
  w.box(0.02, 0.01, 1.1, PAL.tinte, kx + 0.305, 0.45, kz, { cast: false });
  const km = new THREE.Group(); km.position.set(kx, 0.85, kz - 0.15); w.scene.add(km);
  w.box(0.3, 0.12, 0.3, PAL.tinte, 0, 0, 0, { parent: km });
  w.cyl(0.12, 0.13, 0.42, PAL.rot, 0, 0.12, 0, { parent: km, seg: 12 });
  w.cyl(0.1, 0.12, 0.08, PAL.tinte, 0, 0.54, 0, { parent: km, seg: 12 });
  w.box(0.12, 0.03, 0.03, PAL.tinte, 0.12, 0.3, 0, { parent: km });
  for (let i = 0; i < 3; i++) { const c = w.cyl(0.04, 0.035, 0.07, PAL.papier, J(0.03), 0.85, kz + 0.2 + i * 0.13, { seg: 10 }); }
  o.coffee = new THREE.Vector3(kx, 1.4, kz - 0.15);

  // ---------- Wappen von Wolkenwil (Westwand oben) ----------
  const crest = makeCrest(w); crest.position.set(R.x0 + 0.04, 2.25, 0.4); crest.rotation.y = Math.PI / 2; w.groups.w.add(crest);

  // ---------- Schild über der Tür (aussen) ----------
  const sign = textPlane(t('sign.amt'), 1.9, 0.42, PAL.blau, PAL.schnee, 'serif');
  sign.position.set(0, 2.72, R.z1 + R.wall + 0.03); w.groups.cutaway.add(sign); o.sign = sign;

  // ---------- Wolkenplattform auf dem Dach ----------
  const P = new THREE.Group(); P.position.set(-1.8, R.roof, -2.4); w.groups.roof.add(P);
  // Holzpodest
  w.box(3.2, 0.12, 2.4, PAL.nuss, 0, 0, 0, { parent: P, line: 0.01 });
  w.addCollider(P.position.x - 1.6, R.roof, P.position.z - 1.2, P.position.x + 1.6, R.roof + 0.12, P.position.z + 1.2, true);
  for (let i = 0; i < 7; i++) w.box(0.012, 0.005, 2.38, PAL.tinte, -1.4 + i * 0.45, 0.12, 0, { parent: P, cast: false });
  // Kurbelwinde
  const crank = new THREE.Group(); crank.position.set(-0.6, 0.12, -0.3); P.add(crank);
  for (const s of [-0.45, 0.45]) w.box(0.1, 0.95, 0.5, PAL.chalet, s, 0, 0, { parent: crank });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.8, 14), toon(PAL.nuss)); drum.rotation.z = Math.PI / 2; drum.position.y = 0.7; drum.castShadow = true; crank.add(drum);
  for (let i = 0; i < 6; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.018, 4, 16), toon(PAL.papier)); ring.rotation.y = Math.PI / 2; ring.position.set(-0.3 + i * 0.12, 0.7, 0); crank.add(ring); }
  const handle = new THREE.Group(); handle.position.set(0.52, 0.7, 0); crank.add(handle);
  w.box(0.04, 0.4, 0.06, PAL.tinte, 0.02, -0.04, 0, { parent: handle }).position.set(0.02, 0.16, 0);
  const grip = w.cyl(0.04, 0.04, 0.2, PAL.ocker, 0, 0, 0, { parent: handle }); grip.rotation.z = Math.PI / 2; grip.position.set(0.12, 0.34, 0);
  o.crank = handle;
  // Seil zur Wolke nach oben
  const rope = w.box(0.02, 4, 0.02, PAL.papier, 0, 0.7, 0, { parent: crank, cast: false }); rope.rotation.z = -0.25; rope.position.set(-0.5, 0.7 + 2, 0);
  // grosse Schere auf Ständer
  const sci = new THREE.Group(); sci.position.set(0.9, 0.12, 0.2); sci.rotation.y = -0.5; P.add(sci);
  w.box(0.08, 1.1, 0.08, PAL.chalet, 0, 0, 0, { parent: sci });
  const bl = new THREE.Group(); bl.position.y = 1.15; sci.add(bl);
  for (const s of [-1, 1]) {
    const blade = new THREE.Group(); blade.rotation.z = s * 0.28; bl.add(blade);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.025), toon(PAL.gletscher)); m.position.x = 0.35; m.castShadow = true; blade.add(m);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 4), toon(PAL.gletscher)); tip.rotation.z = -Math.PI / 2; tip.position.x = 0.88; blade.add(tip);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 14), toon(PAL.rot)); ring.position.x = -0.2; ring.castShadow = true; blade.add(ring);
  }
  o.scissors = bl;
  // kleinere Scheren im Korb
  w.box(0.4, 0.3, 0.3, PAL.chalet, 1.25, 0.12, -0.75, { parent: P });
  // Fahnenmast mit Wolkenwil-Fahne
  w.cyl(0.04, 0.05, 3.2, PAL.schnee, 1.4, 0.12, 0.95, { parent: P, seg: 8 });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6, 8, 1), toon(PAL.rot, { side: THREE.DoubleSide }));
  flag.position.set(1.85, 3.0, 0.95); flag.castShadow = true; P.add(flag); o.flag = flag;
  const fc = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), toon(PAL.schnee, { side: THREE.DoubleSide })); fc.scale.y = 0.6; fc.position.z = 0.005; flag.add(fc);
  o.platform = P.position.clone().add(new THREE.Vector3(-0.6, 0, 0.6));

  // ---------- Plakate ----------
  const r = rng((Date.now() / 1000) | 0);
  const officeSpots = [
    { p: [-4.9, 1.75, R.z0 + 0.03], ry: 0 },             // Nordwand links vom Fenster
    { p: [0.42, 1.8, R.z0 + 0.03], ry: 0, tilt: 0.02 }, // Nordwand Mitte
    { p: [R.x0 + 0.03, 1.7, -1.6], ry: Math.PI / 2, tilt: -0.02 },
    { p: [R.x0 + 0.03, 1.75, 1.6], ry: Math.PI / 2 },
    { p: [R.x1 - 0.03, 2.2, 3.6], ry: -Math.PI / 2, tilt: 0.03 },
  ];
  const villageSpots = [
    { p: [-1.9, 1.5, R.z1 + R.wall + 0.03], ry: 0, out: true },
    { p: [3.2, 1.45, R.z1 + R.wall + 0.03], ry: 0, out: true, tilt: -0.03 },
  ];
  // Plakatwand auf dem Dorfplatz
  const bw = new THREE.Group(); bw.position.set(6.2, 0, 11); bw.rotation.y = -0.55; w.scene.add(bw);
  w.box(2.2, 1.7, 0.1, PAL.chalet, 0, 0.5, 0, { parent: bw, line: 0.01 });
  w.box(2.4, 0.08, 0.2, PAL.chalet, 0, 2.2, 0, { parent: bw });
  for (const s of [-0.95, 0.95]) w.box(0.1, 0.5, 0.1, PAL.chalet, s, 0, 0, { parent: bw });
  w.addCollider(6.2 - 1.0, 0, 11 - 0.7, 6.2 + 1.0, 2.2, 11 + 0.7);
  const nO = 3 + (r() < 0.5 ? 1 : 0), nV = 2 + (r() < 0.5 ? 1 : 0);
  const ids = pickPosters(8, r);
  const oSpots = shuffle(officeSpots, r).slice(0, nO);
  oSpots.forEach((s, i) => o.posters.push(placePoster(w, ids[i], s, i)));
  const vSpots = [...villageSpots, { group: bw, p: [-0.5, 1.35, 0.06], ry: 0 }, { group: bw, p: [0.5, 1.35, 0.06], ry: 0, tilt: 0.04 }];
  shuffle(vSpots, r).slice(0, nV).forEach((s, i) => o.posters.push(placePoster(w, ids[nO + i], s, 10 + i)));

  // ---------- Aktenvernichter neben dem Pult ----------
  const sh = new THREE.Group(); sh.position.set(D.x - 1.75, 0, D.z + 0.35); w.scene.add(sh);
  w.box(0.42, 0.55, 0.32, PAL.chalet, 0, 0, 0, { parent: sh, line: 0.01 });
  w.box(0.46, 0.14, 0.36, PAL.tinte, 0, 0.55, 0, { parent: sh });
  w.box(0.3, 0.012, 0.03, PAL.papier, 0, 0.69, 0, { parent: sh, cast: false });
  for (let i = 0; i < 6; i++) w.box(0.012, 0.18, 0.008, PAL.papier, -0.1 + i * 0.04, 0.42 + (i % 2) * 0.05, 0.165, { parent: sh, cast: false });
  w.addCollider(sh.position.x - 0.25, 0, sh.position.z - 0.2, sh.position.x + 0.25, 0.7, sh.position.z + 0.2);

  // ---------- Benutzbare Stellen ----------
  w.addInteractable('archive', new THREE.Vector3(R.x0 + 1.35, 0, -1.75), 1.0, t('use.archive'));
  w.addInteractable('shredder', new THREE.Vector3(sh.position.x, 0, sh.position.z + 0.7), 0.75, t('use.shredder'));
  o.phoneIt = w.addInteractable('phone', new THREE.Vector3(D.x + 0.95, 0, D.z + 0.95), 0.9, t('use.phone'));
  o.phoneIt.enabled = false;
  w.addInteractable('desk', new THREE.Vector3(D.x, 0, D.z + 1.0), 1.35, t('use.desk'));
  w.addInteractable('platform', new THREE.Vector3(o.platform.x, 0, o.platform.z), 1.6, t('use.platform'), R.roof + 0.12);

  // Schnittkante innen: Plakate an der Südwand gibt es nicht, Rest bleibt
  o.update = (dt, time) => {
    const d = new Date();
    const s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    o.clock.s.rotation.z = -s / 60 * Math.PI * 2; o.clock.m.rotation.z = -m / 60 * Math.PI * 2; o.clock.h.rotation.z = -h / 12 * Math.PI * 2;
    o.lamp.shade.rotation.z = Math.sin(time * 0.9) * 0.025; o.lamp.shade.position.x = D.x + Math.sin(time * 0.9) * 0.02;
    // Fahne flattert (Wellen über die Vertices)
    const pos = o.flag.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + 0.45; pos.setZ(i, Math.sin(time * 5 - x * 6) * 0.06 * x); }
    pos.needsUpdate = true;
  };
  o.relabel = () => {
    o.posters.forEach(p => p.redraw());
    const it = w.interactables; it.find(i => i.id === 'desk').label = t('use.desk'); it.find(i => i.id === 'platform').label = t('use.platform');
    it.find(i => i.id === 'archive').label = t('use.archive'); it.find(i => i.id === 'shredder').label = t('use.shredder'); it.find(i => i.id === 'phone').label = t('use.phone');
    o.sign.redraw(t('sign.amt'));
  };
  return o;
}

function shuffle(a, r) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

function placePoster(w, id, s, seed) {
  const c = drawPoster(id, seed + 7);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const ph = 0.95, pw = ph * PW / PH;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshToonMaterial({ map: tex, transparent: true, alphaTest: 0.5 }));
  m.position.set(...s.p); m.rotation.y = s.ry; m.rotation.z = s.tilt || 0; m.receiveShadow = true;
  if (s.out) w.groups.cutaway.add(m); else if (s.group) s.group.add(m); else w.groups[s.ry === 0 ? 'n' : s.ry > 0 ? 'w' : 'e'].add(m);
  return { mesh: m, id, redraw() { drawPoster(id, seed + 7, c); tex.needsUpdate = true; } };
}

// Schild mit Text (Canvas-Textur)
export function textPlane(txt, wdt, hgt, bg, fg, font = 'serif') {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * hgt / wdt);
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const draw = s => {
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(12, 12, c.width - 24, c.height - 24);
    g.fillStyle = fg; let size = c.height * 0.56;
    const f = font === 'serif' ? '"Young Serif", Georgia, serif' : '"Schibsted Grotesk", Arial, sans-serif';
    do { g.font = `${size}px ${f}`; size -= 2; } while (g.measureText(s).width > c.width - 70);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, c.width / 2, c.height / 2 + 3);
    tex.needsUpdate = true;
  };
  draw(txt);
  const m = new THREE.Mesh(new THREE.BoxGeometry(wdt, hgt, 0.04), [toon(bg), toon(bg), toon(bg), toon(bg), new THREE.MeshToonMaterial({ map: tex }), toon(bg)]);
  m.castShadow = true; m.redraw = draw;
  return m;
}

// Gemeindewappen: rotes Schild, weisse Wolke
function makeCrest(w) {
  const g = new THREE.Group();
  const s = new THREE.Shape(); s.moveTo(-0.4, 0.45); s.lineTo(0.4, 0.45); s.lineTo(0.4, 0.0); s.quadraticCurveTo(0.4, -0.38, 0, -0.55); s.quadraticCurveTo(-0.4, -0.38, -0.4, 0.0); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false });
  const sh = new THREE.Mesh(geo, toon(PAL.rot)); sh.castShadow = true; g.add(sh); outline(sh, 0.025);
  const c = new THREE.Shape(); c.moveTo(-0.26, -0.08);
  c.absarc(-0.17, 0.0, 0.1, Math.PI * 1.1, Math.PI * 0.35, true); c.absarc(0.0, 0.07, 0.13, Math.PI * 0.95, Math.PI * 0.1, true); c.absarc(0.17, 0.0, 0.1, Math.PI * 0.7, -Math.PI * 0.2, true); c.lineTo(0.26, -0.08); c.closePath();
  const cm = new THREE.Mesh(new THREE.ShapeGeometry(c), toon(PAL.schnee)); cm.position.z = 0.055; g.add(cm);
  return g;
}
