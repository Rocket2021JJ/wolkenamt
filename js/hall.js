// HOCHDRUCK – Ratssaal im Gemeindehaus (begehbar).
// Der Saal steht abseits hinter dem Dorf und wird nur gezeigt, wenn das Beamtli drin ist.
// Vorderwand niedrig (Puppenhaus-Schnitt), Rückwand wird ausgeblendet, wenn die Kamera dahinter ist.
import * as THREE from 'three';
import { PAL } from './palette.js';
import { toon } from './toon.js';
import { t } from './i18n.js';
import { textPlane } from './office.js';

export const RZ = -640;
export const HALL = { x: 0, z: RZ, w: 10, d: 8, h: 3.4 };
export const HALL_SPOT = [HALL.x, 0, HALL.z + HALL.d / 2 - 1.0, Math.PI];

export function buildHall(w, o) {
  const H = HALL, g = new THREE.Group(); g.position.set(H.x, 0, H.z); w.scene.add(g);
  const back = new THREE.Group(); g.add(back);
  const x0 = -H.w / 2, x1 = H.w / 2, z0 = -H.d / 2, z1 = H.d / 2, T = 0.2;
  const b = (wd, ht, dp, col, x, y, z, opt = {}) => w.box(wd, ht, dp, col, x, y, z, { parent: opt.parent || g, cast: opt.cast, line: opt.line, rot: opt.rot });
  const col = (ax0, ay0, az0, ax1, ay1, az1) => w.addCollider(H.x + ax0, ay0, H.z + az0, H.x + ax1, ay1, H.z + az1);

  // Sockel, Boden (Fischgrat angedeutet durch Streifen), Teppich zum Rednerpult
  b(H.w + 0.8, 0.12, H.d + 0.8, PAL.gletscher, 0, -0.1, 0);
  b(H.w, 0.04, H.d, PAL.nuss, 0, 0, 0, { cast: false });
  for (let i = 0; i < 12; i++) b(0.02, 0.005, H.d, PAL.tinte, x0 + 0.4 + i * 0.8, 0.04, 0, { cast: false });
  b(1.4, 0.012, H.d - 1.2, PAL.rot, 0, 0.045, 0.4, { cast: false });

  // Wände: Rückwand hoch, Seiten mittel, vorne nur Brüstung mit Türe
  b(H.w + 2 * T, H.h, T, PAL.papier, 0, 0, z0 - T / 2, { parent: back });
  b(H.w + 2 * T, 0.9, 0.04, PAL.ocker, 0, 0, z0 + 0.02, { parent: back, cast: false });
  col(x0 - T, 0, z0 - T, x1 + T, H.h, z0);
  for (const sx of [x0 - T / 2, x1 + T / 2]) {
    b(T, 2.2, H.d, PAL.papier, sx, 0, 0);
    b(0.04, 0.9, H.d, PAL.ocker, sx + (sx < 0 ? T / 2 + 0.02 : -T / 2 - 0.02), 0, 0, { cast: false });
  }
  col(x0 - T, 0, z0, x0, 2.2, z1); col(x1, 0, z0, x1 + T, 2.2, z1);
  b(H.w / 2 - 0.8 + T, 0.7, T, PAL.chalet, (x0 - T + -0.8) / 2, 0, z1 + T / 2);
  b(H.w / 2 - 0.8 + T, 0.7, T, PAL.chalet, (0.8 + x1 + T) / 2, 0, z1 + T / 2);
  col(x0 - T, 0, z1, -0.8, 0.7, z1 + T); col(0.8, 0, z1, x1 + T, 0.7, z1 + T);
  w.addCollider(H.x - 0.8, 0, H.z + z1 + 0.5, H.x + 0.8, 2, H.z + z1 + 0.7); // durch die Türe nur mit E
  for (const sx of [-0.85, 0.85]) w.cyl(0.08, 0.1, 1.4, PAL.chalet, sx, 0, z1 + T / 2, { parent: g, seg: 8 });

  // Hohe Fenster in der Rückwand, Wappen und Schild «Gemeinderat»
  for (const fx of [-3.6, -2.2, 2.2, 3.6]) {
    b(0.9, 1.7, 0.05, PAL.himmel, fx, 1.2, z0 + 0.03, { parent: back, cast: false });
    b(0.06, 1.7, 0.06, PAL.chalet, fx, 1.2, z0 + 0.06, { parent: back, cast: false });
    b(0.9, 0.06, 0.06, PAL.chalet, fx, 2.05, z0 + 0.06, { parent: back, cast: false });
  }
  const shield = new THREE.Shape(); shield.moveTo(-0.45, 0.5); shield.lineTo(0.45, 0.5); shield.lineTo(0.45, -0.05); shield.quadraticCurveTo(0.4, -0.45, 0, -0.6); shield.quadraticCurveTo(-0.4, -0.45, -0.45, -0.05); shield.closePath();
  const sm = new THREE.Mesh(new THREE.ShapeGeometry(shield), toon(PAL.rot)); sm.position.set(0, 2.42, z0 + 0.04); back.add(sm);
  const cloud = new THREE.Group(); cloud.position.set(0, 2.37, z0 + 0.05); back.add(cloud);
  for (const [cx, cy, r] of [[-0.14, 0, 0.14], [0.02, 0.07, 0.18], [0.17, 0, 0.13]]) { const c = new THREE.Mesh(new THREE.CircleGeometry(r, 16), toon(PAL.schnee)); c.position.set(cx, cy, 0.001); cloud.add(c); }
  const sign = textPlane(t('hall.sign'), 2.6, 0.38, PAL.blau, PAL.schnee, 'serif'); sign.position.set(0, 3.12, z0 + 0.05); back.add(sign); o.hallSign = sign;

  // Ratstisch mit fünf Stühlen, Hubers Stuhl ist höher
  b(5.6, 0.08, 1.0, PAL.nuss, 0, 0.74, z0 + 1.3, { line: 0.01 });
  b(5.4, 0.7, 0.06, PAL.nuss, 0, 0.04, z0 + 1.75);
  col(-2.8, 0, z0 + 0.8, 2.8, 0.8, z0 + 1.8);
  for (let i = 0; i < 5; i++) {
    const cx = -2.2 + i * 1.1, big = i === 2;
    b(0.5, 0.06, 0.5, PAL.chalet, cx, 0.46, z0 + 0.62);
    b(0.5, big ? 1.5 : 0.8, 0.06, big ? PAL.rot : PAL.chalet, cx, 0.5, z0 + 0.36);
    b(0.12, 0.012, 0.16, PAL.papier, cx, 0.82, z0 + 1.15, { cast: false });
    w.cyl(0.03, 0.03, 0.12, PAL.blau, cx + 0.2, 0.82, z0 + 1.0, { parent: g, seg: 8 });
  }
  // Namensschild Huber
  const hs = textPlane('Huber', 0.6, 0.14, PAL.schnee, PAL.tinte, 'serif'); hs.position.set(0, 0.86, z0 + 1.81); g.add(hs);

  // Rednerpult
  const pd = new THREE.Group(); pd.position.set(0, 0, 0.3); g.add(pd);
  w.box(0.9, 1.05, 0.6, PAL.chalet, 0, 0, 0, { parent: pd, line: 0.01 });
  const top = w.box(1.0, 0.06, 0.7, PAL.nuss, 0, 1.05, 0, { parent: pd }); top.rotation.x = 0.18;
  w.cyl(0.015, 0.015, 0.4, PAL.tinte, 0.25, 1.1, -0.15, { parent: pd, seg: 6 });
  const mic = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), toon(PAL.tinte)); mic.position.set(0.25, 1.52, -0.15); pd.add(mic);
  col(-0.45, 0, -0.3 + 0.3, 0.45, 1.1, 0.3 + 0.3);

  // Wahlurne auf einem Tischchen (rechts)
  const ur = new THREE.Group(); ur.position.set(3.4, 0, 1.4); g.add(ur);
  w.box(0.8, 0.7, 0.6, PAL.nuss, 0, 0, 0, { parent: ur });
  w.box(0.5, 0.45, 0.4, PAL.blau, 0, 0.7, 0, { parent: ur, line: 0.01 });
  w.box(0.22, 0.02, 0.04, PAL.tinte, 0, 1.15, 0, { parent: ur, cast: false });
  const us = textPlane(t('hall.urn'), 0.44, 0.12, PAL.schnee, PAL.tinte, 'sans'); us.position.set(0, 0.95, 0.205); ur.add(us); o.urnSign = us;
  col(3.0, 0, 1.1, 3.8, 1.15, 1.7);

  // Zuschauerbänke (links)
  for (let r = 0; r < 2; r++) {
    const bz = 1.0 + r * 1.3;
    b(2.6, 0.08, 0.4, PAL.chalet, -3.1, 0.42, bz);
    b(2.6, 0.5, 0.06, PAL.chalet, -3.1, 0.5, bz + 0.2);
    for (const lx of [-4.2, -2.0]) b(0.08, 0.42, 0.36, PAL.chalet, lx, 0, bz);
    col(-4.4, 0, bz - 0.2, -1.8, 0.5, bz + 0.25);
  }

  // Hubers Büro: Ecke hinten rechts, Glastüre und Schreibtisch
  b(0.08, 2.2, 1.6, PAL.chalet, 2.9, 0, z0 + 0.8);
  col(2.85, 0, z0, 2.95, 2.2, z0 + 1.6);
  b(1.2, 0.06, 0.6, PAL.nuss, 4.1, 0.72, z0 + 0.7);
  b(1.1, 0.7, 0.06, PAL.nuss, 4.1, 0.02, z0 + 0.98);
  col(3.5, 0, z0 + 0.4, 4.7, 0.78, z0 + 1.0);
  for (let i = 0; i < 4; i++) b(0.24, 0.012, 0.32, i % 2 ? PAL.papier : PAL.ocker, 3.8 + i * 0.14, 0.78 + i * 0.012, z0 + 0.65, { cast: false });
  const gp = w.cyl(0.12, 0.09, 0.22, PAL.rot, 4.6, 0, z0 + 1.5, { parent: g, seg: 10 });
  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.32, 9, 7), toon(PAL.matte)); gl.position.set(4.6, 0.55, z0 + 1.5); gl.scale.y = 1.3; g.add(gl);

  // Leuchter
  for (const lx of [-2.5, 2.5]) {
    w.cyl(0.01, 0.01, 0.9, PAL.tinte, lx, 2.5, 0, { parent: g, seg: 4 });
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.26, 12, 1, true), toon(PAL.matte, { side: THREE.DoubleSide })); sh.position.set(lx, 2.45, 0); g.add(sh);
  }

  // Benutzbare Stellen
  const P = (x, z) => new THREE.Vector3(H.x + x, 0, H.z + z);
  w.addInteractable('podium', P(0, 1.05), 0.9, t('use.podium'));
  w.addInteractable('urn', P(3.4, 2.05), 0.8, t('use.urn'));
  w.addInteractable('huberdesk', P(4.1, z0 + 1.55), 0.8, t('use.huberdesk'));
  w.addInteractable('hallexit', P(0, z1 - 0.2), 0.9, t('use.hallexit'));

  o.hall = g;
  o.hallUpdate = () => {
    const p = w.player.pos;
    const inHall = Math.abs(p.x - H.x) < H.w && Math.abs(p.z - H.z) < H.d;
    g.visible = inHall;
    // Rückwand aus, wenn die Kamera hinter dem Saal steht
    back.visible = Math.cos(w.camYaw) > -0.35;
    return inHall;
  };
  return g;
}
