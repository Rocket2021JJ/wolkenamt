// HOCHDRUCK – das grössere Dorf: Kieswege, Dorfzaun, Parteigasse mit einem Haus pro Partei (begehbar),
// Schulhaus mit Spielplatz, Feuerwehr, Bäckerei, Dorfladen, Friedhof, Kuhweide, Bienenhaus, Aussichtspunkt
// mit Fernrohr und zwölf versteckte Zettel mit Wolkwilisch-Wörtern zum Finden.
import * as THREE from 'three';
import { PAL } from './palette.js';
import { toon, outline, gradient as GRADIENT } from './toon.js';
const GRAD = () => GRADIENT;
import { t } from './i18n.js';
import { textPlane } from './office.js';
import { Beamtli } from './beamtli.js';
import { shell, window4, puff } from './interiors.js';
import { RZ } from './hall.js';
import { PL, pineGeo, roundGeo } from './terrain.js';
import { PATHS, pathDist } from './paths.js';
import { lamp, benchTable } from './village.js';
import { WORDS } from './lingo.js';

const KIES = '#C9BC9F', KIESRAND = '#A99B7E', STEIN = '#9C9A92', HOLZ = '#B98A5A';

// ---------------- Wege ----------------
function ribbon(w, pts, width, color, y) {
  const pos = [], idx = []; let n = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l * width / 2, nz = (bx - ax) / l * width / 2;
    pos.push(ax + nx, y, az + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz);
    idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); n += 4;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, toon(color)); m.receiveShadow = true; w.scene.add(m);
  // runde Ecken an den Knicken
  for (const [x, z] of pts) { const c = new THREE.Mesh(new THREE.CircleGeometry(width / 2, 14), toon(color)); c.rotation.x = -Math.PI / 2; c.position.set(x, y, z); c.receiveShadow = true; w.scene.add(c); }
}
function buildPaths(w) {
  for (const P of PATHS) { ribbon(w, P, 2.1, KIESRAND, 0.018); ribbon(w, P, 1.6, KIES, 0.024); }
  // ein paar Trittsteine und Kiesel am Rand
  let sd = 3; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const peb = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.12, 0), toon('#8F887A'), 260), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(); let k = 0;
  for (const P of PATHS) for (let i = 1; i < P.length; i++) {
    const [ax, az] = P[i - 1], [bx, bz] = P[i], l = Math.hypot(bx - ax, bz - az);
    for (let d = 0; d < l && k < 260; d += 1.6 + r() * 2) {
      const u = d / l, sd2 = r() < 0.5 ? -1 : 1, off = 1.05 + r() * 0.25, nx = -(bz - az) / l, nz = (bx - ax) / l;
      p.set(ax + (bx - ax) * u + nx * off * sd2, 0.03, az + (bz - az) * u + nz * off * sd2); const sc = 0.6 + r() * 1.2; s.set(sc, sc * 0.6, sc); q.setFromEuler(new THREE.Euler(0, r() * 6, 0)); m.compose(p, q, s); peb.setMatrixAt(k++, m);
    }
  }
  peb.count = k; w.scene.add(peb); (w.landscape || []).push(peb);
}

// ---------------- Dorfzaun und Grenze ----------------
const IN = 2.6;
function rimPoint(u) {
  // Punkt auf dem abgerundeten Rechteck (u von 0 bis 1 einmal herum)
  const hx = PL.hx - IN, hz = PL.hz - IN, r = PL.r - IN, ax = hx - r, az = hz - r;
  const L = [2 * az, Math.PI * r / 2, 2 * ax, Math.PI * r / 2, 2 * az, Math.PI * r / 2, 2 * ax, Math.PI * r / 2], tot = L.reduce((a, b) => a + b);
  let d = u * tot, i = 0; while (d > L[i]) { d -= L[i]; i++; if (i > 7) { i = 7; break; } }
  const arc = (cx, cz, a0) => { const a = a0 + d / r; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; };
  let x, z;
  if (i === 0) [x, z] = [hx, -az + d]; else if (i === 1) [x, z] = arc(ax, az, 0);
  else if (i === 2) [x, z] = [ax - d, hz]; else if (i === 3) [x, z] = arc(-ax, az, Math.PI / 2);
  else if (i === 4) [x, z] = [-hx, az - d]; else if (i === 5) [x, z] = arc(-ax, -az, Math.PI);
  else if (i === 6) [x, z] = [-ax + d, -hz]; else [x, z] = arc(ax, -az, Math.PI * 1.5);
  return [x + PL.cx, z + PL.cz];
}
function buildFence(w) {
  const N = 210, posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), toon(PAL.nuss), N), rails = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.08, 0.06), toon(HOLZ), N * 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const [x, z] = rimPoint(i / N), [x2, z2] = rimPoint((i + 1) / N), l = Math.hypot(x2 - x, z2 - z), a = Math.atan2(-(z2 - z), x2 - x);
    q.setFromAxisAngle(up, (i * 0.37) % 0.1); s.set(1, 1, 1); p.set(x, 0.55, z); m.compose(p, q, s); posts.setMatrixAt(i, m);
    for (const [k, y] of [[0, 0.45], [1, 0.85]]) { q.setFromAxisAngle(up, a); s.set(l, 1, 1); p.set((x + x2) / 2, y, (z + z2) / 2); m.compose(p, q, s); rails.setMatrixAt(i * 2 + k, m); }
  }
  for (const o of [posts, rails]) { o.castShadow = true; o.receiveShadow = true; w.scene.add(o); (w.landscape || []).push(o); }
}
// Beamtli bleibt im Dorf (in den Räumen weit weg gilt die Grenze nicht)
export function clampToVillage(p) {
  if (p.z < RZ + 60) return;
  const hx = PL.hx - IN - 0.6, hz = PL.hz - IN - 0.6, r = PL.r - IN - 0.6, lx = p.x - PL.cx, lz = p.z - PL.cz;
  const qx = Math.abs(lx) - (hx - r), qz = Math.abs(lz) - (hz - r);
  if (qx > 0 && qz > 0) { const l = Math.hypot(qx, qz); if (l > r) { p.x = PL.cx + Math.sign(lx) * (hx - r + qx / l * r); p.z = PL.cz + Math.sign(lz) * (hz - r + qz / l * r); } return; }
  p.x = PL.cx + Math.max(-hx, Math.min(hx, lx)); p.z = PL.cz + Math.max(-hz, Math.min(hz, lz));
}

// ---------------- Kleinzeug ----------------
function sign(w, txt, x, z, rot, bg = PAL.schnee, fg = PAL.tinte) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; w.scene.add(g);
  w.box(0.1, 1.9, 0.1, PAL.chalet, 0, 0, 0, { parent: g });
  const tp = textPlane(txt, 1.3, 0.3, bg, fg, 'serif'); tp.position.set(0, 1.62, 0.06); g.add(tp);
  const back = w.box(1.34, 0.34, 0.04, PAL.chalet, 0, 1.45, 0.02, { parent: g, cast: false });
  w.addCollider(x - 0.15, 0, z - 0.15, x + 0.15, 2, z + 0.15);
  return tp;
}
function bench(w, x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; w.scene.add(g);
  w.box(1.6, 0.06, 0.42, HOLZ, 0, 0.42, 0, { parent: g }); w.box(1.6, 0.36, 0.06, HOLZ, 0, 0.5, -0.2, { parent: g });
  for (const s of [-0.7, 0.7]) w.box(0.07, 0.42, 0.4, PAL.nuss, s, 0, 0, { parent: g });
  w.addCollider(x - 0.85, 0, z - 0.85, x + 0.85, 0.5, z + 0.85, true);
}
function cow(w, x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; w.scene.add(g);
  const M = (geo, c, px, py, pz, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, toon(c)); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); outline(m, 0.015); return m; };
  M(new THREE.BoxGeometry(1.5, 0.75, 0.75), PAL.schnee, 0, 0.95, 0);
  M(new THREE.BoxGeometry(0.5, 0.4, 0.78), PAL.tinte, -0.25, 1.05, 0.0, 1, 1, 1.01);
  M(new THREE.BoxGeometry(0.45, 0.45, 0.45), PAL.schnee, 0.9, 1.15, 0);
  M(new THREE.BoxGeometry(0.2, 0.22, 0.4), '#E3A99B', 1.14, 1.02, 0);
  for (const s of [-0.24, 0.24]) M(new THREE.ConeGeometry(0.05, 0.18, 5), '#E8DCC0', 0.88, 1.45, s);
  for (const [lx, lz] of [[-0.55, -0.25], [-0.55, 0.25], [0.55, -0.25], [0.55, 0.25]]) M(new THREE.BoxGeometry(0.14, 0.6, 0.14), PAL.schnee, lx, 0.3, lz);
  M(new THREE.CylinderGeometry(0.1, 0.12, 0.15, 8), '#C9A23A', 1.0, 0.84, 0);
  w.addCollider(x - 0.9, 0, z - 0.9, x + 0.9, 1.4, z + 0.9);
  return g;
}

// ---------------- Parteigasse: ein Haus pro Partei ----------------
export const PHOUSES = { wvb: [-44, 2, Math.PI / 2], fww: [-44, 27, Math.PI / 2], pkh: [-32, 31, -Math.PI / 2], huber: [-32, -4, -Math.PI / 2] };
const POFF = { wvb: -48, fww: -32, pkh: 32, huber: 48 };
export const PSPOT = id => [POFF[id], 0, RZ + 3.25 - 1.0, Math.PI];
function partyHouse(w, o, id, pa) {
  const [x, z, rot] = PHOUSES[id], col = pa.color;
  const g = w.addHouse(x, z, rot, { w: 5.6, d: 4.6, h: 3.7, wood: id === 'fww' || id === 'pkh', wall: id === 'huber' ? '#EFE4C8' : undefined, roofCol: id === 'huber' ? PAL.rot : undefined, door: true, data: { party: id } });
  g.rotation.y = rot;
  const fz = 2.3;
  // Türe, Schild in Parteifarbe, Band unter dem Dach, Fahne
  w.box(0.95, 1.85, 0.08, PAL.nuss, 0, 0, fz + 0.03, { parent: g, line: 0.01 });
  w.box(5.62, 0.22, 0.04, col, 0, 3.15, fz + 0.025, { parent: g, cast: false });
  const sg = textPlane(pa.short + ' · ' + t('town.office'), 2.4, 0.42, col, PAL.schnee, 'serif'); sg.position.set(0, 2.35, fz + 0.07); g.add(sg);
  const front = new THREE.Vector3(0, 0, fz + 1.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(g.position);
  const fp = new THREE.Vector3(1.9, 0, fz + 1.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(g.position);
  w.cyl(0.05, 0.06, 5.0, PAL.schnee, fp.x, 0, fp.z, { seg: 6 });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75, 8, 1), new THREE.MeshToonMaterial({ color: col, side: THREE.DoubleSide }));
  flag.position.set(fp.x + Math.cos(-rot) * 0.6, 4.55, fp.z + Math.sin(-rot) * 0.6); flag.rotation.y = rot; w.scene.add(flag);
  const fl2 = textPlane(pa.short, 0.9, 0.3, col, PAL.schnee, 'serif'); fl2.material.side = THREE.DoubleSide; fl2.position.set(0, 0, 0.01); flag.add(fl2);
  o.pflags.push(flag); o.townDyn.push(flag);
  w.addCollider(fp.x - 0.1, 0, fp.z - 0.1, fp.x + 0.1, 5, fp.z + 0.1);
  // Plakatwand neben der Türe
  const pw = new THREE.Vector3(-1.7, 0, fz + 0.04).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(g.position);
  const pl = textPlane('«' + (pa.sloganText || pa.short) + '»', 1.2, 0.9, col, PAL.schnee, 'serif'); pl.position.set(-1.7, 1.2, fz + 0.05); g.add(pl);
  o.entrance['p_' + id] = { pos: front, yaw: rot };
  w.addInteractable('pdoor_' + id, front, 1.0, t('use.pdoor', { p: pa.short }));
  return sg;
}
function partyOffice(w, o, id, pa, mine) {
  const H = { x: POFF[id], z: RZ, w: 8, d: 6.5, h: 3.2 }, col = pa.color;
  const S = shell(w, H, id === 'huber' ? 0xE5D3A8 : PAL.papier, id === 'huber' ? 0x6B3F2A : PAL.lino), { b, col: cl, P } = S;
  // Rückwand: grosses Plakat, Parteiname, zwei Fenster
  b(2.6, 1.6, 0.05, col, 0, 0.9, S.z0 + 0.04, { parent: S.back, cast: false });
  const nm = textPlane(pa.short, 1.6, 0.5, col, PAL.schnee, 'serif'); nm.position.set(0, 2.15, S.z0 + 0.08); S.back.add(nm);
  puff(S.back, 0, 1.45, S.z0 + 0.12, 1.3, PAL.schnee);
  window4(S, -2.9); window4(S, 2.9);
  // Pult mit Akten, Telefon, Stuhl
  b(2.0, 0.07, 0.9, PAL.nuss, 0, 0.74, -0.6, { line: 0.01 }); b(1.9, 0.72, 0.06, PAL.nuss, 0, 0.02, -0.18);
  for (let k = 0; k < 4; k++) b(0.32, 0.03, 0.4, k % 2 ? PAL.papier : PAL.ocker, -0.6 + k * 0.05, 0.81 + k * 0.03, -0.65, { cast: false });
  b(0.24, 0.09, 0.17, PAL.tinte, 0.65, 0.81, -0.75);
  b(0.55, 0.5, 0.55, col, 0, 0, -1.45); b(0.55, 0.6, 0.1, col, 0, 0.5, -1.72);
  cl(-1.0, -1.1, 1.0, -0.1, 0.85);
  // Aktenschrank, Plakatstapel, Kaffeemaschine, Pflanze
  b(0.9, 1.8, 0.5, 0x6E7468, -3.4, 0, -2.6, { line: 0.012 }); for (let k = 0; k < 4; k++) b(0.8, 0.02, 0.02, PAL.tinte, -3.4, 0.35 + k * 0.42, -2.34, { cast: false });
  cl(-3.85, -2.85, -2.95, -2.35, 1.9);
  b(0.8, 0.35, 0.6, col, 3.2, 0, 2.2, { cast: false }); b(0.75, 0.3, 0.55, PAL.schnee, 3.25, 0.35, 2.2, { cast: false });
  b(0.45, 0.8, 0.45, PAL.nuss, 3.4, 0, -2.6); b(0.25, 0.32, 0.22, PAL.tinte, 3.4, 0.8, -2.6);
  w.cyl(0.22, 0.18, 0.4, PAL.ocker, -3.4, 0, 2.3, { parent: S.g, seg: 10 }); const pf = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), toon(PAL.matte)); pf.position.set(-3.4, 0.85, 2.3); S.g.add(pf);
  cl(2.8, 1.9, 3.7, 2.5, 0.7);
  // in fremden Büros sitzt manchmal jemand am Telefon (nur Huber hat eine Sekretärin)
  if (id === 'huber') S.npc(PAL.ocker, 'tuch', PAL.rot, 2.4, -1.6, -0.6, false);
  o.partyDesk[id] = P(0, 0.2);
  w.addInteractable('pdesk_' + id, o.partyDesk[id], 0.9, t('use.pdesk', { p: pa.short }));
  w.addInteractable('pexit_' + id, P(0, S.z1 - 0.2), 0.9, t('use.pexit'));
  o.pupdates.push(S.update); o.townDyn.push(S.g);
}

// ---------------- Weitere Gebäude ----------------
function school(w, o) {
  const g = w.addHouse(47, 6, -Math.PI / 2, { w: 9, d: 6, h: 4.3, wood: false, wall: '#F3E7C9', roofCol: PAL.rot, door: true });
  g.rotation.y = -Math.PI / 2;
  const tp = textPlane(t('town.school'), 2.6, 0.45, '#F3E7C9', PAL.tinte, 'serif'); tp.position.set(0, 3.45, 3.07); g.add(tp); o.townSigns.push([tp, 'town.school']);
  // Glockentürmchen auf dem Dach
  w.box(0.9, 1.2, 0.9, PAL.schnee, 0, 6.2, 0, { parent: g }); const sp = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.1, 4), toon(PAL.rot)); sp.position.set(0, 7.95, 0); sp.rotation.y = Math.PI / 4; g.add(sp);
  w.box(5, 0.04, 9, '#B9B09A', 42, 0, 6, { cast: false });
  // Spielplatz: Schaukel, Rutsche, Sandkasten, zwei Kinder
  const sx = 47, sz = 21;
  for (const s of [-1.2, 1.2]) { const a = w.box(0.1, 2.3, 0.1, PAL.rot, sx + s, 0, sz - 0.6, { tilt: s * 0.12 }); const c = w.box(0.1, 2.3, 0.1, PAL.rot, sx + s, 0, sz + 0.6, { tilt: s * 0.12 }); }
  w.box(2.7, 0.1, 0.1, PAL.rot, sx, 2.25, sz); for (const s of [-0.5, 0.5]) { w.box(0.02, 1.5, 0.02, PAL.tinte, sx + s, 0.75, sz); w.box(0.5, 0.05, 0.25, PAL.ocker, sx + s, 0.72, sz); }
  w.addCollider(sx - 1.4, 0, sz - 0.7, sx + 1.4, 2.4, sz + 0.7);
  const sl = w.box(0.7, 0.06, 3, PAL.gletscher, sx - 4, 0.8, sz + 0.2); sl.rotation.x = 0.5; w.box(0.8, 1.6, 0.8, PAL.ocker, sx - 4, 0, sz - 1.4);
  w.addCollider(sx - 4.4, 0, sz - 1.8, sx - 3.6, 1.6, sz - 1.0);
  w.box(2.4, 0.2, 2.4, HOLZ, sx + 3.5, 0, sz + 3, { cast: false }); w.box(2.1, 0.22, 2.1, '#E2D3A0', sx + 3.5, 0, sz + 3, { cast: false });
  for (const [kx, kz, c] of [[sx + 3.2, sz + 3.2, PAL.lino], [sx - 0.5, sz + 1.6, PAL.ocker]]) { const k = new Beamtli(c, { villager: true, hat: 'zipfel', hatColor: PAL.rot }); k.root.position.set(kx, 0, kz); k.root.scale.setScalar(0.6); k.yaw = 2; w.scene.add(k.root); o.kids.push(k); o.townDyn.push(k.root); }
}
function fireStation(w, o) {
  const g = new THREE.Group(); g.position.set(31, 0, -12); w.scene.add(g);
  w.box(7, 4, 6, PAL.schnee, 0, 0, 0, { parent: g, line: 0.012 });
  const rf = w.gable(7.8, 1.6, 6.8, PAL.tinte, 0, 4, 0, Math.PI / 2, g);
  for (const s of [-1.7, 1.7]) { w.box(2.6, 2.9, 0.08, PAL.rot, s, 0, 3.03, { parent: g, line: 0.01 }); for (let k = 0; k < 5; k++) w.box(2.5, 0.03, 0.03, '#8E2820', s, 0.5 + k * 0.5, 3.08, { parent: g, cast: false }); }
  const tp = textPlane(t('town.fire'), 3.2, 0.45, PAL.rot, PAL.schnee, 'sans'); tp.position.set(0, 3.4, 3.06); g.add(tp); o.townSigns.push([tp, 'town.fire']);
  w.box(1.6, 8.5, 1.6, PAL.schnee, -4.3, 0, -1.5, { parent: g, line: 0.012 }); w.box(1.9, 0.3, 1.9, PAL.tinte, -4.3, 8.5, -1.5, { parent: g });
  w.addCollider(31 - 5.2, 0, -12 - 3, 31 + 3.5, 8.8, -12 + 3);
  // Hydrant und Schlauchrolle
  w.cyl(0.18, 0.2, 0.75, PAL.rot, 36.2, 0, -7.8, { seg: 8, solid: true }); w.cyl(0.24, 0.24, 0.1, PAL.rot, 36.2, 0.75, -7.8, { seg: 8 });
}
function bakery(w, o) {
  const g = w.addHouse(46, 31, -Math.PI / 2, { w: 6, d: 5, h: 3.4, wood: false, wall: '#F6E9CF', door: true }); g.rotation.y = -Math.PI / 2;
  const tp = textPlane(t('town.bakery'), 2.6, 0.42, '#7A4A2A', '#F6E9CF', 'serif'); tp.position.set(0, 2.55, 2.57); g.add(tp); o.townSigns.push([tp, 'town.bakery']);
  // Markise mit Streifen und Brotauslage
  for (let k = 0; k < 6; k++) { const m = w.box(0.5, 0.05, 1.1, k % 2 ? PAL.schnee : PAL.rot, -1.25 + k * 0.5, 2.05, 3.05, { parent: g, cast: true }); m.rotation.x = 0.35; }
  w.box(2.2, 0.8, 0.6, PAL.nuss, 0.9, 0, 2.95, { parent: g });
  for (let k = 0; k < 5; k++) { const br = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), toon('#C98A45')); br.scale.set(1.6, 0.8, 1); br.position.set(0.1 + k * 0.4, 0.88, 2.95); g.add(br); }
  bench(w, 41.5, 35, Math.PI / 2);
}
function shop(w, o) {
  const g = w.addHouse(-24, 53, Math.PI, { w: 6.2, d: 4.6, h: 3.4, wood: true, door: true }); g.rotation.y = Math.PI;
  const tp = textPlane(t('town.shop'), 2.6, 0.42, PAL.matte, PAL.schnee, 'serif'); tp.position.set(0, 2.55, 2.37); g.add(tp); o.townSigns.push([tp, 'town.shop']);
  for (let k = 0; k < 3; k++) w.box(0.5, 0.4, 0.4, [PAL.ocker, PAL.rot, PAL.matte][k], -2 + k * 0.6, 0, 2.6, { parent: g });
}
function cemetery(w) {
  const cx = -29, cz = -26, W = 9, D = 7;
  for (const [x0, z0, x1, z1] of [[cx - W / 2, cz - D / 2, cx + W / 2, cz - D / 2], [cx - W / 2, cz + D / 2, cx - 1, cz + D / 2], [cx + 1, cz + D / 2, cx + W / 2, cz + D / 2], [cx - W / 2, cz - D / 2, cx - W / 2, cz + D / 2], [cx + W / 2, cz - D / 2, cx + W / 2, cz + D / 2]]) {
    const l = Math.hypot(x1 - x0, z1 - z0), horiz = z0 === z1;
    w.box(horiz ? l : 0.35, 0.8, horiz ? 0.35 : l, STEIN, (x0 + x1) / 2, 0, (z0 + z1) / 2, { line: 0.01, solid: true });
  }
  let k = 0; for (let x = cx - 3; x <= cx + 3; x += 2) for (let z = cz - 2; z <= cz + 1.5; z += 2.2) {
    k++; if (k % 3 === 0) { const a = w.box(0.08, 1.0, 0.08, PAL.tinte, x, 0, z); w.box(0.5, 0.08, 0.08, PAL.tinte, x, 0.72, z); }
    else { w.box(0.6, 0.75, 0.15, k % 2 ? STEIN : '#7E7B72', x, 0, z, { line: 0.008 }); w.box(0.6, 0.06, 1.0, PAL.matte, x, 0, z + 0.6, { cast: false }); }
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), toon(k % 2 ? PAL.rot : PAL.ocker)); f.position.set(x + 0.15, 0.1, z + 0.5); w.scene.add(f);
  }
}
function pasture(w, o) {
  const x0 = 14, x1 = 30, z0 = -47, z1 = -35;
  const post = (x, z) => w.box(0.12, 1.1, 0.12, PAL.nuss, x, 0, z);
  for (let x = x0; x <= x1; x += 2) { post(x, z0); if (x < 17 || x > 20) post(x, z1); }
  for (let z = z0; z <= z1; z += 2) { post(x0, z); post(x1, z); }
  for (const y of [0.45, 0.85]) { w.box(x1 - x0, 0.06, 0.05, HOLZ, (x0 + x1) / 2, y, z0); w.box(x0 + 3 - x0, 0.06, 0.05, HOLZ, x0 + 1.5, y, z1); w.box(x1 - (x0 + 6), 0.06, 0.05, HOLZ, (x0 + 6 + x1) / 2, y, z1); w.box(0.05, 0.06, z1 - z0, HOLZ, x0, y, (z0 + z1) / 2); w.box(0.05, 0.06, z1 - z0, HOLZ, x1, y, (z0 + z1) / 2); }
  w.addCollider(x0 - 0.1, 0, z0 - 0.1, x1 + 0.1, 1.1, z0 + 0.1); w.addCollider(x0 - 0.1, 0, z0, x0 + 0.1, 1.1, z1); w.addCollider(x1 - 0.1, 0, z0, x1 + 0.1, 1.1, z1);
  w.addCollider(x0, 0, z1 - 0.1, x0 + 3, 1.1, z1 + 0.1); w.addCollider(x0 + 6, 0, z1 - 0.1, x1, 1.1, z1 + 0.1);
  o.cows = [cow(w, 19, -42, 0.4), cow(w, 25, -44, 2.2), cow(w, 23, -39, -1.0), cow(w, 27.5, -39.5, 3.0)]; o.townDyn.push(...o.cows);
  w.box(2.4, 0.5, 0.7, '#8A9197', 16.5, 0, -45.5, { line: 0.01, solid: true }); w.box(2.2, 0.05, 0.5, PAL.himmel, 16.5, 0.46, -45.5, { cast: false });
}
function beeHouse(w) {
  const x = -45, z = -38;
  w.box(3, 2, 1.6, PAL.chalet, x, 0, z, { line: 0.012, solid: true }); const rf = w.box(3.4, 0.1, 2.1, PAL.tinte, x, 2.05, z + 0.1); rf.rotation.x = -0.15;
  for (let k = 0; k < 5; k++) w.box(0.45, 0.4, 0.06, [PAL.ocker, PAL.rot, PAL.himmel, PAL.matte, PAL.schnee][k], x - 1.15 + k * 0.57, 0.9, z + 0.83, { cast: false });
  for (let k = 0; k < 3; k++) { w.box(0.6, 0.7, 0.6, '#E2C46A', x + 3 + k * 1.1, 0, z + 1.5, { line: 0.01, solid: true }); w.box(0.7, 0.08, 0.7, PAL.tinte, x + 3 + k * 1.1, 0.7, z + 1.5); }
}
function viewpoint(w, o) {
  const x = 0, z = -53.5;
  w.box(6, 0.2, 3.4, HOLZ, x, 0, z + 0.5, { cast: false });
  for (let k = 0; k < 13; k++) w.box(0.45, 0.02, 3.4, k % 2 ? HOLZ : '#A87A4D', x - 2.75 + k * 0.46, 0.2, z + 0.5, { cast: false });
  bench(w, x - 1.6, z + 1.6, Math.PI); bench(w, x + 1.6, z + 1.6, Math.PI);
  // Fernrohr auf Stativ
  const g = new THREE.Group(); g.position.set(x, 0.2, z - 0.4); w.scene.add(g);
  for (let k = 0; k < 3; k++) { const l = w.box(0.05, 1.3, 0.05, PAL.tinte, Math.cos(k * 2.1) * 0.25, 0, Math.sin(k * 2.1) * 0.25, { parent: g, tilt: Math.cos(k * 2.1) * 0.2 }); l.rotation.x = -Math.sin(k * 2.1) * 0.2; }
  const tube = w.cyl(0.09, 0.13, 0.9, 0xC9A23A, 0, 1.2, 0, { parent: g, seg: 10 }); tube.rotation.x = Math.PI / 2 + 0.2; tube.position.set(0, 1.35, -0.1);
  w.addCollider(x - 0.35, 0, z - 0.75, x + 0.35, 1.6, z - 0.05);
  const tp = sign(w, t('town.view'), x + 3.6, z + 2.2, 0.2); o.townSigns.push([tp, 'town.view']);
  w.addInteractable('fernrohr', new THREE.Vector3(x, 0, z + 0.4), 1.1, t('use.fernrohr'));
}
// ---------------- Zettel mit Wolkwilisch-Wörtern ----------------
export const NOTES = [
  [-38.8, 41.5], [-24, -30.5], [2.2, -51.8], [20, -33.5], [44.5, 22.5], [-43, -36], [35.5, -8.6], [43, 33], [-12, 51], [18.8, -16], [-18.6, 11.8], [45.5, 48.5],
];
function notes(w, o) {
  const words = Object.keys(WORDS);
  NOTES.forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = i * 1.3; w.scene.add(g);
    w.box(0.09, 1.25, 0.09, PAL.nuss, 0, 0, 0, { parent: g });
    const pap = w.box(0.32, 0.4, 0.02, '#F6F0DC', 0, 0.85, 0.06, { parent: g, cast: false }); pap.rotation.z = 0.08;
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), toon(PAL.rot)); pin.position.set(0, 1.2, 0.08); g.add(pin);
    o.noteObjs.push(pap);
    w.addInteractable('note_' + i, new THREE.Vector3(x, 0, z), 1.0, t('use.note'));
  });
  o.noteWords = NOTES.map((_, i) => words[(i * 7 + 3) % words.length]);
}

// ---------------- Bäume, Gärten, Kleinkram zwischen den Häusern ----------------
function villageTrees(w, pathDist) {
  let sd = 19; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const spots = [], free = (x, z, m) => pathDist(x, z) > 2.4 && !(w.houses || []).some(g => Math.hypot(g.position.x - x, g.position.z - z) < m)
    && !(Math.abs(x) < 11 && z > -7 && z < 22) && !(x > 12 && x < 32 && z > -48 && z < -33) && !(x > -35 && x < -22 && z > -31 && z < -21) && !(x > 40 && x < 52 && z > 14 && z < 27) && !(Math.abs(x) < 4 && z < -48) && !(x > 25 && x < 38 && z > -16 && z < -6);
  for (let t = 0; t < 4000 && spots.length < 95; t++) {
    const x = (r() - 0.5) * 100, z = -48 + r() * 108;
    if (!free(x, z, 5.2) || spots.some(s => Math.hypot(s[0] - x, s[1] - z) < 4.5)) continue;
    spots.push([x, z, 0.8 + r() * 0.7, r() < 0.55]);
  }
  // gleiche weiche Bäume wie draussen im Wald, im Dorf etwas grösser und einzeln
  const deci = spots.filter(s => s[3]), firs = spots.filter(s => !s[3]);
  const mat = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: GRAD() });
  const mk = (geo, list) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); im.castShadow = true; im.receiveShadow = true; w.scene.add(im); (w.landscape || []).push(im); return im; };
  const R = mk(roundGeo(), deci), F = mk(pineGeo(), firs), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  const put = (im, list, k0) => list.forEach(([x, z, sc], i) => { q.setFromAxisAngle(up, i * 1.7); const k = sc * k0; s.set(k, k * (0.95 + (i % 4) * 0.05), k); p.set(x, 0, z); m.compose(p, q, s); im.setMatrixAt(i, m); const v = 0.9 + ((i * 37) % 10) / 40; col.setRGB(v, v, v * 0.96); im.setColorAt(i, col); w.addCollider(x - 0.3, 0, z - 0.3, x + 0.3, 2.5, z + 0.3); });
  put(R, deci, 1.6); put(F, firs, 1.5);
}
function gardens(w) {
  // kleine Gemüsegärten hinter einigen Häusern, mit Staketenzaun und Beeten
  const H = (w.houses || []).filter((g, i) => i % 3 === 1 && Math.hypot(g.position.x, g.position.z - 12) > 16);
  for (const g of H) {
    const { w: W, d: D } = g.userData, gx = 0, gz = -D / 2 - 2.6, gw = Math.min(4.5, W + 0.5), gd = 3.2;
    const G = new THREE.Group(); G.position.copy(g.position); G.rotation.y = g.rotation.y; w.scene.add(G);
    for (let x = -gw / 2; x <= gw / 2 + 0.01; x += 0.3) { w.box(0.06, 0.6, 0.04, PAL.schnee, gx + x, 0, gz - gd / 2, { parent: G, cast: false }); }
    for (let z = -gd / 2; z <= gd / 2; z += 0.3) for (const sx of [-1, 1]) w.box(0.04, 0.6, 0.06, PAL.schnee, gx + sx * gw / 2, 0, gz + z, { parent: G, cast: false });
    for (let k = 0; k < 3; k++) {
      const bz = gz - gd / 2 + 0.55 + k * 1.0; w.box(gw - 0.6, 0.1, 0.6, '#6B4A2E', gx, 0, bz, { parent: G, cast: false });
      for (let x = -gw / 2 + 0.6; x < gw / 2 - 0.4; x += 0.4) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), toon(k === 1 ? '#7FAE55' : k ? '#5E8A3E' : '#8DBA5E')); v.position.set(gx + x, 0.2, bz); v.scale.y = k === 2 ? 1.6 : 0.8; G.add(v); }
    }
    const wp = new THREE.Vector3(gx, 0, gz).applyAxisAngle(up0, g.rotation.y).add(g.position), c = Math.abs(Math.cos(g.rotation.y)), s = Math.abs(Math.sin(g.rotation.y));
    const hx = (gw * c + gd * s) / 2, hz = (gw * s + gd * c) / 2; w.addCollider(wp.x - hx, 0, wp.z - hz, wp.x + hx, 0.6, wp.z + hz);
  }
}
const up0 = new THREE.Vector3(0, 1, 0);
function laundry(w, x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; w.scene.add(g);
  for (const s of [-1.6, 1.6]) w.box(0.07, 1.8, 0.07, PAL.nuss, s, 0, 0, { parent: g });
  w.box(3.2, 0.02, 0.02, PAL.papier, 0, 1.72, 0, { parent: g, cast: false });
  [PAL.schnee, PAL.rot, PAL.himmel, PAL.ocker, PAL.schnee].forEach((c, k) => w.box(0.4, 0.5 - (k % 2) * 0.15, 0.02, c, -1.1 + k * 0.55, 1.2 + (k % 2) * 0.15, 0, { parent: g, cast: true }));
  w.addCollider(x - 0.2, 0, z - 0.2, x + 0.2, 1.8, z + 0.2);
}
function hayBales(w, list) { for (const [x, z] of list) { const b = w.cyl(0.6, 0.6, 1.0, '#D8BE6A', x, 0.6, z, { seg: 12 }); b.rotation.z = Math.PI / 2; b.position.y = 0.6; w.addCollider(x - 0.5, 0, z - 0.6, x + 0.5, 1.2, z + 0.6); } }

// ---------------- Alles zusammen ----------------
export function buildTown(w, o, PARTIES) {
  o.pflags = []; o.pupdates = []; o.townDyn = []; o.kids = []; o.townSigns = []; o.noteObjs = []; o.partyDesk = o.partyDesk || {}; o.entrance = o.entrance || {};
  buildPaths(w); buildFence(w);
  o.townDyn = o.townDyn || [];
  // Wiese unter den Innenräumen (die liegen weit weg vom Dorf), damit man nicht ins Leere schaut
  { const isl = new THREE.Mesh(new THREE.CircleGeometry(1, 40), toon('#6F8F4E')); isl.rotation.x = -Math.PI / 2; isl.scale.set(150, 46, 1); isl.position.set(0, -0.2, RZ); isl.receiveShadow = true; w.scene.add(isl);
    let sd = 41; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const fir = new THREE.ConeGeometry(1.6, 5, 7); fir.translate(0, 2.5, 0); const im = new THREE.InstancedMesh(fir, toon('#557A43'), 90), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let k = 0; k < 90; k++) { const a = r() * 6.28, rr = 0.75 + r() * 0.2; p.set(Math.cos(a) * 150 * rr, -0.2, RZ + Math.sin(a) * 46 * rr); s.setScalar(0.8 + r() * 0.8); m.compose(p, q, s); im.setMatrixAt(k, m); }
    w.scene.add(im); (w.landscape || []).push(im); o.island = [isl, im]; o.townDyn.push(isl); }
  for (const id of Object.keys(PHOUSES)) { const pa = PARTIES[id]; partyHouse(w, o, id, { ...pa, sloganText: Array.isArray(pa.slogan) ? pa.slogan[0] : pa.slogan }); partyOffice(w, o, id, pa); }
  school(w, o); fireStation(w, o); bakery(w, o); shop(w, o); cemetery(w); pasture(w, o); beeHouse(w); viewpoint(w, o); notes(w, o);
  // weitere Wohnhäuser rundherum
  for (const [x, z, r] of [[-46, -20, Math.PI / 2], [46, -24, -Math.PI / 2], [24, 44, Math.PI], [-12, 55, Math.PI], [12, 55, Math.PI], [30, 55, Math.PI], [-44, 46, Math.PI / 2], [-30, 8, -Math.PI / 2], [22, 22, -Math.PI / 2], [-22, 40, 0.15], [32, -26, 0.1]]) w.addHouse(x, z, r);
  // Laternen und Bänkli an den Wegen, Wegweiser an Kreuzungen
  for (const [x, z] of [[-24, 15.3], [-38.9, 0], [-37.1, 28], [26, -3.8], [41.2, 8], [38.8, 28], [1.2, -14], [-1.2, -30], [1.2, -44], [-1.2, 38], [-20, 49.2], [20, 46.6]]) lamp(w, x, z);
  villageTrees(w, pathDist); gardens(w);
  laundry(w, -26, 34, 0.3); laundry(w, 27, 50, -0.2); laundry(w, -48, 10, 1.5); laundry(w, 36, -36, 0.8);
  hayBales(w, [[-48, -46], [-45.5, -47.5], [44, -44], [8, -46]]);
  for (const [x, z, r] of [[-36, 18, -Math.PI / 2], [42, -12, Math.PI / 2], [-2.2, -40, Math.PI / 2], [-10, 46, 0]]) bench(w, x, z, r);
  benchTable(w, -41, 15.5, 0);
  for (const [k, x, z, r] of [['town.signParty', -35.5, 15.6, -0.6], ['town.signSchool', 38.2, -0.3, 0.5], ['town.signView', 1.6, -22, -0.3], ['town.signSouth', 1.7, 30.5, 0.4]]) o.townSigns.push([sign(w, t(k), x, z, r, '#F2E8CF'), k]);
}
export function stepTown(w, o, dt, tm) {
  if (o.island) { const vis = w.player.pos.z < RZ + 60; o.island.forEach(m => { m.visible = vis; }); }
  for (const f of o.pflags || []) { const P = f.geometry.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i) + 0.6; P.setZ(i, Math.sin(tm * 4.5 - x * 5) * 0.08 * x); } P.needsUpdate = true; }
  for (const u of o.pupdates || []) u(dt);
  if (w.churchBell) { w.bellT = Math.max(0, (w.bellT || 0) - dt); w.churchBell.rotation.z = Math.sin(tm * 4.2) * 0.45 * Math.min(1, w.bellT); }
  if (w.churchRooster) w.churchRooster.rotation.y = Math.sin(tm * 0.13) * 1.2;
  (o.kids || []).forEach((k, i) => { k.root.position.y = Math.abs(Math.sin(tm * 3 + i * 2)) * 0.25; k.update(dt, new THREE.Vector3(), true); });
  (o.cows || []).forEach((c, i) => { c.rotation.y += Math.sin(tm * 0.2 + i) * 0.0015; });
}
export function relabelTown(o) { for (const [tp, k] of o.townSigns || []) tp.redraw(t(k)); }
