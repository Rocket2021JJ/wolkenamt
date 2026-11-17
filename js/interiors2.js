// HOCHDRUCK – weitere Innenräume: Bäckerei Gerber, Schulhaus (Klasse 3b), Kirche St. Niklaus.
// Liegen wie alle Räume weit weg (z = RZ) und werden nur gezeigt, wenn man drin ist.
import * as THREE from 'three';
import { PAL } from './palette.js';
import { toon, outline } from './toon.js';
import { t } from './i18n.js';
import { textPlane } from './office.js';
import { Beamtli } from './beamtli.js';
import { shell, window4, puff } from './interiors.js';
import { RZ } from './hall.js';

export const ROOMS2 = {
  bakery: { x: 64, z: RZ, w: 8, d: 6.5, h: 3.1 },
  school: { x: 82, z: RZ, w: 10, d: 8, h: 3.3 },
  church: { x: 102, z: RZ, w: 9, d: 12, h: 5.2 },
};
export const spot2 = id => { const H = ROOMS2[id]; return [H.x, 0, H.z + H.d / 2 - 1.0, Math.PI]; };

function bakery(w, o) {
  const S = shell(w, ROOMS2.bakery, '#F3E3C2', 0xB98A5A), { b, col, P } = S;
  // Theke mit Glasvitrine und Brot
  b(5, 1.0, 0.8, PAL.nuss, 0, 0, -1.2, { line: 0.012 }); b(4.8, 0.05, 0.7, '#E8DCC0', 0, 1.0, -1.2);
  b(4.6, 0.45, 0.04, PAL.himmel, 0, 1.0, -0.82, { cast: false });
  for (let k = 0; k < 9; k++) { const br = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), toon(k % 3 ? '#C98A45' : '#E2B46A')); br.scale.set(1.6, 0.8, 1); br.position.set(-2 + k * 0.5, 1.12, -1.25); S.g.add(br); }
  col(-2.6, -1.7, 2.6, -0.75, 1.1);
  // Regale mit Broten hinten
  for (let r = 0; r < 3; r++) { b(6, 0.05, 0.45, PAL.nuss, 0, 0.9 + r * 0.6, S.z0 + 0.3); for (let k = 0; k < 10; k++) { const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.25, 4, 8), toon(k % 2 ? '#B97A3A' : '#D9A35A')); l.rotation.z = Math.PI / 2; l.position.set(-2.6 + k * 0.58, 1.02 + r * 0.6, S.z0 + 0.3); S.g.add(l); } }
  // Ofen, Tischchen, Kasse, Schild
  b(1.6, 1.8, 0.9, '#8E8A82', 3.0, 0, S.z0 + 1.2, { line: 0.012 }); b(0.9, 0.5, 0.05, '#2A2420', 3.0, 0.7, S.z0 + 1.66, { cast: false });
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.3), new THREE.MeshBasicMaterial({ color: '#F2A23A' })); fire.position.set(3.0, 0.85, S.z0 + 1.69); S.g.add(fire);
  col(2.2, -3.25, 3.8, -1.9, 1.8);
  b(0.4, 0.25, 0.35, PAL.ocker, -2.0, 1.0, -1.2);
  const sg = textPlane(t('town.bakery'), 2.2, 0.36, '#7A4A2A', '#F6E9CF', 'serif'); sg.position.set(0, 2.6, S.z0 + 0.06); S.back.add(sg); o.roomSigns.push([sg, 'town.bakery']);
  b(1.0, 0.05, 1.0, PAL.nuss, -2.6, 0.75, 1.6); b(0.08, 0.75, 0.08, PAL.nuss, -2.6, 0, 1.6); col(-3.1, 1.1, -2.1, 2.1, 0.8);
  window4(S, -2.6, PAL.himmel); window4(S, 2.6, PAL.himmel);
  S.npc('#F2E6C8', 'tuch', PAL.rot, 0.6, -1.9, 0);   // Verkäuferin hinter der Theke
  w.addInteractable('bakecounter', P(0, -0.1), 1.0, t('use.bakecounter'));
  w.addInteractable('bakeback', P(3.0, -0.9), 0.9, t('use.bakeback'));
  w.addInteractable('rexit_bakery', P(0, S.z1 - 0.2), 0.9, t('use.rexit'));
  o.pupdates.push(dt => { if (S.update(dt)) fire.material.color.setHSL(0.08, 0.85, 0.55 + Math.sin(performance.now() / 120) * 0.06); });
  o.townDyn.push(S.g);
}

function school(w, o) {
  const S = shell(w, ROOMS2.school, '#EFE8D2', 0x9C7A55), { b, col, P } = S;
  // Wandtafel mit Wolke und «Wolkenamt», Pult der Lehrerin
  b(4.2, 1.5, 0.06, '#2E4A3E', 0, 1.0, S.z0 + 0.05, { parent: S.back, line: 0.01 }); b(4.3, 0.06, 0.12, PAL.nuss, 0, 0.95, S.z0 + 0.1, { parent: S.back });
  puff(S.back, -0.8, 1.8, S.z0 + 0.09, 0.9, '#F4F4F0');
  const chalk = textPlane('Das Wolkenamt', 1.6, 0.3, '#2E4A3E', '#F4F4F0', 'serif'); chalk.position.set(1.1, 1.6, S.z0 + 0.09); S.back.add(chalk);
  b(1.8, 0.75, 0.7, PAL.nuss, -3.0, 0, -2.4, { line: 0.01 }); col(-3.9, -2.75, -2.1, -2.05, 0.8);
  // Bänke in drei Reihen mit Kindern
  const kids = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const x = -2.4 + c * 2.4, z = -0.6 + r * 1.35;
    b(1.6, 0.06, 0.5, '#C9A77A', x, 0.62, z); b(1.6, 0.55, 0.04, PAL.nuss, x, 0.07, z + 0.24); b(1.6, 0.05, 0.35, PAL.nuss, x, 0.38, z + 0.55);
    col(x - 0.85, z - 0.3, x + 0.85, z + 0.75, 0.7);
    if ((r + c) % 2 === 0 || r === 1) { const k = new Beamtli([PAL.rot, PAL.blau, PAL.ocker, PAL.matte, PAL.lino][(r * 3 + c) % 5], { villager: true, hat: c % 2 ? 'zipfel' : 'none', hatColor: PAL.rot }); k.root.scale.setScalar(0.55); k.root.position.set(x + (c % 2 ? 0.35 : -0.35), 0.35, z + 0.55); k.yaw = Math.PI; S.g.add(k.root); kids.push(k); }
  }
  // Zeichnungen an der Seitenwand: Wolken in Hubers Form
  for (let k = 0; k < 4; k++) { const d = b(0.55, 0.42, 0.02, '#FBF7EA', -4.94, 1.55, -2.0 + k * 0.8, { cast: false }); d.rotation.y = Math.PI / 2; puff(S.g, -4.92, 1.55, -2.0 + k * 0.8, 0.18, k % 2 ? PAL.himmel : '#DADADA'); }
  window4(S, -3.6, PAL.himmel); window4(S, 3.6, PAL.himmel);
  w.addInteractable('schoolclass', P(-1.0, -2.4), 1.1, t('use.schoolclass'));
  w.addInteractable('schooldraw', P(-4.0, -0.8), 0.9, t('use.schooldraw'));
  w.addInteractable('rexit_school', P(0, S.z1 - 0.2), 0.9, t('use.rexit'));
  o.pupdates.push(dt => { if (S.update(dt)) { const tm = performance.now() / 1000; kids.forEach((k, i) => { k.root.position.y = 0.35 + Math.max(0, Math.sin(tm * 2 + i * 1.7)) * 0.04; k.update(dt, new THREE.Vector3(), true); }); } });
  o.townDyn.push(S.g);
}

function church(w, o) {
  const S = shell(w, ROOMS2.church, '#F4EFE4', 0x8A8478), { b, col, P } = S;
  // Chor mit Altar, Kreuz, buntem Rundfenster
  b(3.6, 0.3, 2.0, '#B9B09A', 0, 0, S.z0 + 1.1);
  b(1.8, 1.0, 0.8, '#E8E0CC', 0, 0.3, S.z0 + 1.0, { line: 0.012 }); b(1.9, 0.06, 0.9, PAL.rot, 0, 1.3, S.z0 + 1.0);
  for (const sx of [-0.6, 0.6]) w.cyl(0.04, 0.05, 0.35, '#F4EFE4', sx, 1.36, S.z0 + 1.0, { parent: S.g, seg: 8 });
  b(0.1, 1.2, 0.05, '#C9A23A', 0, 2.2, S.z0 + 0.06, { parent: S.back }); b(0.7, 0.1, 0.05, '#C9A23A', 0, 2.95, S.z0 + 0.06, { parent: S.back });
  const rose = new THREE.Mesh(new THREE.CircleGeometry(0.75, 16), new THREE.MeshBasicMaterial({ color: '#7FA9C9' })); rose.position.set(0, 4.1, S.z0 + 0.06); S.back.add(rose);
  for (let k = 0; k < 8; k++) { const seg = new THREE.Mesh(new THREE.CircleGeometry(0.72, 1, k * Math.PI / 4, Math.PI / 4), new THREE.MeshBasicMaterial({ color: ['#C8352B', '#F2C14E', '#4A6FA5', '#6E9A4A'][k % 4] })); seg.position.set(0, 4.1, S.z0 + 0.07); S.back.add(seg); }
  col(-1.8, -6, 1.8, -3.9, 1.4);
  // Kirchenbänke links und rechts, Mittelgang
  for (let r = 0; r < 6; r++) for (const sx of [-1, 1]) {
    const z = -2.6 + r * 1.2, x = sx * 2.2;
    b(2.8, 0.06, 0.45, PAL.nuss, x, 0.45, z); b(2.8, 0.6, 0.06, PAL.nuss, x, 0.45, z + 0.22); b(0.06, 0.9, 0.5, PAL.nuss, x - sx * 1.42, 0, z);
    col(x - 1.45, z - 0.3, x + 1.45, z + 0.3, 0.9);
  }
  // ein paar Leute in den Bänken
  for (const [x, z, c] of [[-2.8, -1.4, PAL.matte], [2.0, -0.2, PAL.ocker], [-1.6, 1.0, PAL.gletscher]]) { const n = S.npc(c, 'filz', PAL.tinte, x, z + 0.05, Math.PI, true); n.root.position.y = 0.05; }
  // Hohe Fenster an den Seiten, Kerzenständer, Glockenseil hinten beim Eingang
  for (const z of [-3, 0, 3]) b(0.05, 2.2, 0.8, '#7FA9C9', 4.45, 1.4, z, { cast: false });
  const flames = [];
  for (const sx of [-1.4, 1.4]) { w.cyl(0.05, 0.12, 1.3, '#C9A23A', sx, 0.3, S.z0 + 1.6, { parent: S.g, seg: 8 }); const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: '#FFD27A' })); f.position.set(sx, 1.72, S.z0 + 1.6); f.scale.y = 1.6; S.g.add(f); flames.push(f); }
  const rope = b(0.04, 3.4, 0.04, '#C9A77A', 3.6, 1.0, 4.6); b(0.12, 0.3, 0.12, PAL.rot, 3.6, 0.85, 4.6);
  // Pfarrer Imhof beim Altar
  S.npc(PAL.tinte, 'none', PAL.tinte, -1.6, -3.7, 0.4);
  w.addInteractable('pfarrer', P(-1.2, -2.6), 1.1, t('use.pfarrer'));
  w.addInteractable('kollekte', P(1.6, 4.6), 0.9, t('use.kollekte'));
  w.addInteractable('churchbell', P(3.6, 4.2), 0.9, t('use.churchbell'));
  w.addInteractable('rexit_church', P(0, S.z1 - 0.2), 0.9, t('use.rexit'));
  o.pupdates.push(dt => { if (S.update(dt)) { const tm = performance.now() / 1000; flames.forEach((f, i) => { f.scale.y = 1.5 + Math.sin(tm * 9 + i) * 0.25; }); rope.position.y = 1.0 + Math.max(0, w.bellT || 0) * Math.sin(tm * 4.2) * 0.04; } });
  o.townDyn.push(S.g);
}

// Eingänge an den Häusern im Dorf (Bäckerei und Schulhaus sind Häuser aus town.js, die Kirche aus village.js)
export function buildRooms2(w, o) {
  o.roomSigns = o.roomSigns || [];
  bakery(w, o); school(w, o); church(w, o);
  const door = (id, x, z, rot, dz) => { const pos = new THREE.Vector3(0, 0, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(new THREE.Vector3(x, 0, z)); o.entrance['r_' + id] = { pos, yaw: rot }; w.addInteractable('rdoor_' + id, pos, 1.0, t('use.rdoor_' + id)); };
  door('bakery', 46, 31, -Math.PI / 2, 3.5);
  door('school', 47, 6, -Math.PI / 2, 4.0);
  door('church', -18, -19, 0.25, 9.6);
}
