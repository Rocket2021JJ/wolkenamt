// HOCHDRUCK – begehbare Häuser im Dorf (Gasthaus Rössli, Parteienhaus) und die Wolkenwerkstatt auf dem Dach.
// Die Innenräume stehen abseits hinter dem Dorf und werden nur gezeigt, wenn das Beamtli drin ist.
import * as THREE from 'three';
import { PAL } from './palette.js';
import { toon, outline } from './toon.js';
import { t } from './i18n.js';
import { textPlane } from './office.js';
import { Beamtli } from './beamtli.js';
import { ROOM } from './world3d.js';

// Kleine Wolke aus Kugeln
function puff(parent, x, y, z, s = 1, col = PAL.schnee) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  for (const [bx, by, bz, r] of [[-0.16, 0, 0, 0.14], [0, 0.06, 0.02, 0.18], [0.17, 0, -0.02, 0.13], [0.05, -0.04, 0.1, 0.12]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), toon(col)); m.position.set(bx, by, bz); m.castShadow = true; g.add(m); outline(m, 0.012);
  }
  return g;
}

// ---------------- Wolkenwerkstatt auf dem Dach ----------------
export function decorateRoof(w, o) {
  const roof = w.groups.roof, Y = ROOM.roof;
  const b = (wd, ht, dp, col, x, y, z, opt = {}) => w.box(wd, ht, dp, col, x, Y + y, z, { parent: roof, ...opt });
  const col = (x0, z0, x1, z1, h = 1.2) => w.addCollider(x0, Y, z0, x1, Y + h, z1);

  // Wäscheleine mit Wolken zum Trocknen
  const L0 = [-5.5, 3.3], L1 = [-1.4, 3.3];
  for (const [x, z] of [L0, L1]) { b(0.08, 1.75, 0.08, PAL.chalet, x, 0, z, { tilt: w.jit(0.05) }); b(0.5, 0.06, 0.06, PAL.chalet, x, 1.7, z); col(x - 0.1, z - 0.1, x + 0.1, z + 0.1, 1.8); }
  const n = 14, pts = [];
  for (let i = 0; i <= n; i++) { const k = i / n; pts.push(new THREE.Vector3(L0[0] + (L1[0] - L0[0]) * k, Y + 1.72 - Math.sin(k * Math.PI) * 0.28, L0[1])); }
  const line = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.012, 4), toon(PAL.papier)); roof.add(line);
  o.laundry = [];
  [0.15, 0.32, 0.5, 0.68, 0.85].forEach((k, i) => {
    const p = pts[Math.round(k * n)];
    const peg = w.box(0.03, 0.09, 0.05, i % 2 ? PAL.rot : PAL.ocker, p.x, p.y - 0.06, p.z, { parent: roof, cast: false });
    const c = puff(roof, p.x, p.y - 0.28, p.z, 0.75 + (i % 3) * 0.18); c.userData.base = c.position.y; c.userData.ph = i * 1.3;
    o.laundry.push(c);
  });

  // Wolkenlager: offene Kisten mit Schablonenschrift
  [['CUMULUS', 1.0], ['STRATUS', 2.15], ['NEBEL', 3.3]].forEach(([lab, x], i) => {
    const z = 4.0;
    b(1.0, 0.55, 0.62, PAL.nuss, x, 0, z, { line: 0.01 });
    for (const yy of [0.18, 0.38]) b(1.02, 0.03, 0.64, PAL.chalet, x, yy, z, { cast: false });
    const tp = textPlane(lab, 0.8, 0.16, PAL.nuss, PAL.schnee, 'sans'); tp.position.set(x, Y + 0.3, z - 0.315); tp.rotation.y = Math.PI; roof.add(tp);
    for (let k = 0; k < 3; k++) puff(roof, x - 0.25 + k * 0.25, Y + 0.58 + (k % 2) * 0.06, z + w.jit(0.08), i === 2 ? 0.8 : 0.9, i === 2 ? PAL.gletscher : PAL.schnee);
    col(x - 0.5, z - 0.31, x + 0.5, z + 0.31, 0.9);
  });

  // Geräteschopf mit Pultdach, Rechen und Leiter
  const sx = 3.5, sz = 1.85;
  b(1.5, 1.7, 1.2, PAL.chalet, sx, 0, sz, { line: 0.012 });
  for (let k = 0; k < 5; k++) b(0.02, 1.68, 0.02, PAL.tinte, sx - 0.6 + k * 0.3, 0.01, sz - 0.61, { cast: false });
  const sr = b(1.8, 0.08, 1.55, PAL.tinte, sx, 1.78, sz); sr.rotation.x = -0.18;
  b(0.6, 1.3, 0.04, PAL.nuss, sx - 0.2, 0, sz - 0.62, { cast: false });
  b(0.05, 0.05, 0.05, PAL.ocker, sx + 0.02, 0.65, sz - 0.65, { cast: false });
  const sign = textPlane(t('roof.shed'), 0.7, 0.16, PAL.schnee, PAL.tinte, 'sans'); sign.position.set(sx - 0.2, Y + 1.42, sz - 0.65); sign.rotation.y = Math.PI; roof.add(sign); o.shedSign = sign;
  col(sx - 0.75, sz - 0.6, sx + 0.75, sz + 0.6, 1.9);
  const lad = new THREE.Group(); lad.position.set(sx + 0.95, Y, sz - 0.2); lad.rotation.z = 0.22; roof.add(lad);
  for (const s of [-0.2, 0.2]) w.box(0.05, 2.0, 0.05, PAL.chalet, 0, 0, s, { parent: lad });
  for (let k = 0; k < 6; k++) w.box(0.04, 0.04, 0.42, PAL.chalet, 0, 0.25 + k * 0.3, 0, { parent: lad });
  const rake = new THREE.Group(); rake.position.set(sx - 0.95, Y, sz - 0.5); rake.rotation.z = -0.25; roof.add(rake);
  w.box(0.035, 1.5, 0.035, PAL.nuss, 0, 0, 0, { parent: rake }); w.box(0.06, 0.05, 0.4, PAL.tinte, 0, 1.45, 0, { parent: rake });

  // Bank und Tischchen mit Thermoskanne (Westseite)
  b(0.45, 0.06, 1.5, PAL.chalet, -5.6, 0.42, 0.6); b(0.06, 0.45, 1.5, PAL.chalet, -5.85, 0.45, 0.6);
  for (const z of [0.0, 1.2]) b(0.4, 0.42, 0.06, PAL.chalet, -5.6, 0, z);
  col(-5.9, -0.15, -5.35, 1.35, 0.6);
  b(0.5, 0.05, 0.5, PAL.nuss, -4.85, 0.6, 1.9); b(0.06, 0.6, 0.06, PAL.nuss, -4.85, 0, 1.9);
  col(-5.1, 1.65, -4.6, 2.15, 0.7);
  w.cyl(0.06, 0.06, 0.28, PAL.lino, -4.95, Y + 0.65, 1.85, { parent: roof, seg: 10 });
  w.cyl(0.05, 0.04, 0.08, PAL.schnee, -4.72, Y + 0.65, 1.98, { parent: roof, seg: 10 });

  // Wandtafel mit Kreidestrichen (Westgeländer)
  const tb = new THREE.Group(); tb.position.set(-5.95, Y, -1.1); tb.rotation.y = Math.PI / 2; roof.add(tb);
  w.box(1.3, 0.9, 0.05, 0x2F3B36, 0, 0.55, 0, { parent: tb, line: 0.01 });
  for (const s of [-0.6, 0.6]) w.box(0.06, 1.5, 0.06, PAL.chalet, s, 0, -0.03, { parent: tb });
  const chalk = document.createElement('canvas'); chalk.width = 260; chalk.height = 180; const cc = chalk.getContext('2d');
  cc.strokeStyle = 'rgba(240,238,228,.85)'; cc.fillStyle = 'rgba(240,238,228,.85)'; cc.lineWidth = 2.5; cc.font = '22px "Courier Prime",monospace';
  cc.fillText(t('roof.board'), 14, 30);
  for (let i = 0; i < 4; i++) { cc.beginPath(); cc.moveTo(18, 58 + i * 30); for (let x = 18; x < 200 - i * 25; x += 12) cc.lineTo(x, 58 + i * 30 + Math.sin(x * 0.3 + i) * 2); cc.stroke(); cc.strokeRect(214, 46 + i * 30, 14, 14); if (i < 2) { cc.beginPath(); cc.moveTo(216, 54 + i * 30); cc.lineTo(221, 60 + i * 30); cc.lineTo(232, 42 + i * 30); cc.stroke(); } }
  const tex = new THREE.CanvasTexture(chalk); tex.colorSpace = THREE.SRGBColorSpace;
  const cm = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); cm.position.set(0, 1.0, 0.03); tb.add(cm);
  col(-6.05, -1.8, -5.85, -0.4, 1.5);

  // Fernrohr auf Dreibein (Südostecke), schaut aufs Dorf
  const tel = new THREE.Group(); tel.position.set(5.3, Y, 3.7); roof.add(tel);
  for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; const leg = w.box(0.035, 1.25, 0.035, PAL.tinte, Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18, { parent: tel }); leg.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18); }
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.8, 12), toon(PAL.ocker)); tube.position.set(0, 1.3, 0.12); tube.rotation.x = 1.25; tube.castShadow = true; tel.add(tube); outline(tube, 0.012);
  col(5.05, 3.45, 5.55, 3.95, 1.4);

  // Windsack am Westgeländer
  const ws = new THREE.Group(); ws.position.set(-5.95, Y, -3.6); roof.add(ws);
  w.box(0.05, 2.4, 0.05, PAL.papier, 0, 0, 0, { parent: ws });
  const sock = new THREE.Group(); sock.position.y = 2.3; ws.add(sock);
  for (let k = 0; k < 4; k++) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.13 - k * 0.022, 0.11 - k * 0.022, 0.2, 10, 1, true), toon(k % 2 ? PAL.schnee : PAL.rot, { side: THREE.DoubleSide })); ring.rotation.z = Math.PI / 2; ring.position.x = 0.12 + k * 0.2; sock.add(ring); }
  o.windsock = sock;

  // Blumenkisten mit Geranien auf dem Südgeländer
  for (const x of [-4.6, -0.6]) {
    b(1.0, 0.18, 0.22, PAL.chalet, x, 0.98, 4.95 - 0.1);
    for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), toon(k % 3 ? PAL.rot : PAL.matte)); f.position.set(x - 0.4 + k * 0.16, Y + 1.2 + w.jit(0.03), 4.85 + w.jit(0.04)); roof.add(f); }
  }

  o.roofUpdate = (dt, tm) => {
    for (const c of o.laundry) { c.rotation.z = Math.sin(tm * 1.4 + c.userData.ph) * 0.12; c.position.y = c.userData.base + Math.sin(tm * 2 + c.userData.ph) * 0.015; }
    if (o.windsock) { o.windsock.rotation.y = 0.4 + Math.sin(tm * 0.5) * 0.35; o.windsock.rotation.z = -0.15 + Math.sin(tm * 2.3) * 0.06; }
  };
}

// ---------------- Raumschale für Innenräume ----------------
function shell(w, H, wallCol, floorCol) {
  const g = new THREE.Group(); g.position.set(H.x, 0, H.z); w.scene.add(g);
  const back = new THREE.Group(); g.add(back);
  const x0 = -H.w / 2, x1 = H.w / 2, z0 = -H.d / 2, z1 = H.d / 2, T = 0.2;
  const b = (wd, ht, dp, col, x, y, z, opt = {}) => w.box(wd, ht, dp, col, x, y, z, { parent: opt.parent || g, cast: opt.cast, line: opt.line, tilt: opt.tilt });
  const col = (ax0, az0, ax1, az1, h = 1.2) => w.addCollider(H.x + ax0, 0, H.z + az0, H.x + ax1, h, H.z + az1);
  b(H.w + 0.8, 0.12, H.d + 0.8, PAL.gletscher, 0, -0.1, 0);
  b(H.w, 0.04, H.d, floorCol, 0, 0, 0, { cast: false });
  for (let i = 0; i < Math.floor(H.w / 0.5); i++) b(0.015, 0.005, H.d, PAL.tinte, x0 + 0.25 + i * 0.5, 0.04, 0, { cast: false });
  b(H.w + 2 * T, H.h, T, wallCol, 0, 0, z0 - T / 2, { parent: back });
  b(H.w + 2 * T, 1.0, 0.04, PAL.chalet, 0, 0, z0 + 0.02, { parent: back, cast: false });
  col(x0 - T, z0 - T, x1 + T, z0, H.h);
  for (const sx of [x0 - T / 2, x1 + T / 2]) { b(T, 2.2, H.d, wallCol, sx, 0, 0); b(0.04, 1.0, H.d, PAL.chalet, sx + (sx < 0 ? T / 2 + 0.02 : -T / 2 - 0.02), 0, 0, { cast: false }); }
  col(x0 - T, z0, x0, z1, 2.2); col(x1, z0, x1 + T, z1, 2.2);
  b(H.w / 2 - 0.8 + T, 0.7, T, PAL.chalet, (x0 - T - 0.8) / 2, 0, z1 + T / 2);
  b(H.w / 2 - 0.8 + T, 0.7, T, PAL.chalet, (0.8 + x1 + T) / 2, 0, z1 + T / 2);
  col(x0 - T, z1, -0.8, z1 + T, 0.7); col(0.8, z1, x1 + T, z1 + T, 0.7);
  w.addCollider(H.x - 0.8, 0, H.z + z1 + 0.5, H.x + 0.8, 2, H.z + z1 + 0.7);
  for (const sx of [-0.85, 0.85]) w.cyl(0.08, 0.1, 1.4, PAL.chalet, sx, 0, z1 + T / 2, { parent: g, seg: 8 });
  const P = (x, z) => new THREE.Vector3(H.x + x, 0, H.z + z);
  const npcs = [];
  const npc = (color, hat, hatColor, x, z, yaw, sit = false) => {
    const bt = new Beamtli(color, { villager: true, hat, hatColor }); bt.root.position.set(x, sit ? 0.08 : 0, z); bt.yaw = yaw; bt.root.scale.setScalar(0.9); g.add(bt.root); npcs.push(bt); return bt;
  };
  const update = (dt) => {
    const p = w.player.pos, inside = Math.abs(p.x - H.x) < H.w && Math.abs(p.z - H.z) < H.d;
    g.visible = inside; back.visible = Math.cos(w.camYaw) > -0.35;
    if (inside) for (const n of npcs) n.update(dt, new THREE.Vector3(), true);
    return inside;
  };
  return { g, back, b, col, P, npc, update, x0, x1, z0, z1 };
}
const window4 = (S, x, col = PAL.himmel) => {
  S.b(0.9, 1.3, 0.05, col, x, 1.0, S.z0 + 0.03, { parent: S.back, cast: false });
  S.b(0.05, 1.3, 0.06, PAL.chalet, x, 1.0, S.z0 + 0.06, { parent: S.back, cast: false });
  S.b(0.9, 0.05, 0.06, PAL.chalet, x, 1.63, S.z0 + 0.06, { parent: S.back, cast: false });
  for (const s of [-1, 1]) S.b(0.3, 1.36, 0.05, PAL.matte, x + s * 0.62, 0.97, S.z0 + 0.06, { parent: S.back, cast: false });
};

// ---------------- Gasthaus Rössli ----------------
export const ROESSLI = { x: -14, z: -34, w: 10, d: 8, h: 3.2 };
export const ROESSLI_SPOT = [ROESSLI.x, 0, ROESSLI.z + ROESSLI.d / 2 - 1.0, Math.PI];
export function buildRoessli(w, o) {
  const S = shell(w, ROESSLI, 0xD9C9A3, PAL.nuss), { b, col, P } = S;
  // Täfer bis Brust, Fenster mit Läden, Wirtshausschild
  for (const x of [-3.2, -1.2, 2.6]) window4(S, x);
  const sign = textPlane(t('roessli.sign'), 2.2, 0.36, PAL.tinte, '#E8D9A8', 'serif'); sign.position.set(0.7, 2.55, S.z0 + 0.05); S.back.add(sign); o.roessliSign = sign;
  // Theke rechts mit Zapfhahn und Flaschenregal
  b(0.7, 1.05, 3.2, PAL.chalet, 4.2, 0, -1.4, { line: 0.01 }); b(0.8, 0.06, 3.3, PAL.nuss, 4.2, 1.05, -1.4);
  col(3.85, -3.05, 4.55, 0.25, 1.1);
  for (let k = 0; k < 3; k++) w.cyl(0.03, 0.03, 0.3, 0x8A9197, 4.05, 1.1, -2.2 + k * 0.25, { parent: S.g, seg: 6 });
  b(0.3, 1.2, 2.4, PAL.nuss, 4.85, 1.0, -2.6);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) {
    const bc = [PAL.lino, PAL.tinte, PAL.ocker, PAL.rot][(r + k) % 4];
    w.cyl(0.04, 0.045, 0.24, bc, 4.85, 1.12 + r * 0.38, -3.6 + k * 0.3, { parent: S.g, seg: 6 });
  }
  S.npc(PAL.chalet, 'filz', PAL.tinte, 4.85 - 0.25, -0.9, -Math.PI / 2); // Wirt hinter der Theke? steht davor zur Theke
  // Stammtisch (rund) mit Schild und drei Gästen
  w.cyl(0.95, 0.95, 0.06, PAL.nuss, -2.6, 0.74, -1.2, { parent: S.g, seg: 18 }); w.cyl(0.12, 0.2, 0.74, PAL.nuss, -2.6, 0, -1.2, { parent: S.g });
  col(-3.6, -2.2, -1.6, -0.2, 0.8);
  const st = textPlane(t('roessli.stamm'), 0.62, 0.17, PAL.tinte, PAL.ocker, 'serif'); st.position.set(-2.6, 1.12, -1.2); S.g.add(st); o.stammSign = st;
  w.box(0.04, 0.3, 0.04, PAL.tinte, -2.6, 0.8, -1.2, { parent: S.g });
  [[-3.7, -1.2, Math.PI / 2, PAL.matte, 'tuch', PAL.rot], [-2.6, -2.35, 0, PAL.lino, 'filz', PAL.chalet], [-1.55, -1.5, -Math.PI / 2 - 0.3, PAL.ocker, 'zipfel', PAL.matte]].forEach(([x, z, yaw, c, h, hc]) => {
    S.npc(c, h, hc, x, z, yaw, true);
    for (let k = 0; k < 1; k++) w.cyl(0.05, 0.045, 0.16, 0xE8C46A, -2.6 + (x + 2.6) * 0.5, 0.8, -1.2 + (z + 1.2) * 0.5, { parent: S.g, seg: 8 });
  });
  // Kleiner Tisch: Imboden mit Notizblock
  b(0.9, 0.05, 0.7, PAL.nuss, 0.9, 0.72, 1.4); b(0.1, 0.72, 0.1, PAL.nuss, 0.9, 0, 1.4);
  col(0.45, 1.05, 1.35, 1.75, 0.8);
  S.npc(PAL.blau, 'none', PAL.tinte, 0.9, 0.7, 0.1, true);
  b(0.2, 0.01, 0.26, PAL.schnee, 0.95, 0.77, 1.35, { cast: false });
  // weitere Tische und Bänke
  for (const [x, z] of [[-3.0, 2.0], [2.6, -2.2]]) { b(1.4, 0.05, 0.7, PAL.nuss, x, 0.72, z); b(0.12, 0.72, 0.5, PAL.nuss, x, 0, z); b(1.4, 0.05, 0.3, PAL.chalet, x, 0.42, z + 0.6); b(1.4, 0.05, 0.3, PAL.chalet, x, 0.42, z - 0.6); col(x - 0.7, z - 0.75, x + 0.7, z + 0.75, 0.8); }
  // Kachelofen in der Ecke
  b(1.0, 1.5, 1.0, 0x5D7A6A, -4.4, 0, -3.4, { line: 0.012 }); b(1.1, 0.12, 1.1, PAL.papier, -4.4, 1.5, -3.4);
  b(1.4, 0.06, 0.3, PAL.chalet, -4.4, 0.45, -2.75);
  col(-4.95, -4.0, -3.85, -2.85, 1.6);
  // Hirschgeweih-freie Wand: Vereinswimpel und Uhr
  ['#C8352B', '#2F4E8C', '#4F6B57'].forEach((c, i) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.4, 0); s.lineTo(0.2, -0.45); s.closePath(); const m = new THREE.Mesh(new THREE.ShapeGeometry(s), toon(new THREE.Color(c).getHex())); m.position.set(-1.6 + i * 0.5, 2.6, S.z0 + 0.06); S.back.add(m); });
  const it = (id, x, z, r = 0.9) => w.addInteractable(id, P(x, z), r, t('use.' + id));
  it('stammtisch', -2.6, 0.1, 1.0); it('wirt', 3.45, -1.0, 0.9); it('imboden', 0.9, 0.0, 0.8); it('roessliexit', 0, S.z1 - 0.2, 0.9);
  o.roessli = S.g; o.roessliUpdate = S.update;
}

// ---------------- Parteienhaus: vier Parteibüros in einem Haus ----------------
export const PARTEI = { x: 14, z: -34, w: 11, d: 8, h: 3.2 };
export const PARTEI_SPOT = [PARTEI.x, 0, PARTEI.z + PARTEI.d / 2 - 1.0, Math.PI];
export const PARTEI_ORDER = ['wvb', 'fww', 'pkh', 'huber'];
export function buildParteienhaus(w, o, PARTIES) {
  const S = shell(w, PARTEI, PAL.papier, PAL.lino), { b, col, P } = S;
  const sign = textPlane(t('partei.sign'), 3.2, 0.34, PAL.blau, PAL.schnee, 'serif'); sign.position.set(0, 2.75, S.z0 + 0.05); S.back.add(sign); o.parteiSign = sign;
  const bw = PARTEI.w / 4;
  o.partyDesk = {};
  PARTEI_ORDER.forEach((id, i) => {
    const cx = S.x0 + bw * (i + 0.5), pc = PARTIES[id].color;
    // Trennwand mit Glas oben
    if (i > 0) { const px = S.x0 + bw * i; b(0.08, 1.1, 3.6, PAL.chalet, px, 0, S.z0 + 1.8); b(0.04, 0.9, 3.6, PAL.himmel, px, 1.1, S.z0 + 1.8, { cast: false }); col(px - 0.06, S.z0, px + 0.06, S.z0 + 3.6, 2.0); }
    // Parteiplakat an der Rückwand
    b(1.1, 1.4, 0.04, pc, cx, 0.95, S.z0 + 0.04, { parent: S.back, cast: false });
    const sl = textPlane(PARTIES[id].short, 0.9, 0.3, pc, PAL.schnee, 'serif'); sl.position.set(cx, 1.95, S.z0 + 0.07); S.back.add(sl);
    puff(S.back, cx, 1.35, S.z0 + 0.12, 0.9, PAL.schnee);
    // Pult mit Akten und Telefon
    b(1.6, 0.06, 0.75, PAL.nuss, cx, 0.74, S.z0 + 1.6, { line: 0.01 }); b(1.5, 0.72, 0.06, PAL.nuss, cx, 0.02, S.z0 + 1.95);
    col(cx - 0.8, S.z0 + 1.2, cx + 0.8, S.z0 + 2.0, 0.8);
    for (let k = 0; k < 3; k++) b(0.3, 0.02 + k * 0.012, 0.36, k % 2 ? PAL.papier : PAL.ocker, cx - 0.45 + k * 0.08, 0.8 + k * 0.02, S.z0 + 1.55, { cast: false });
    b(0.22, 0.08, 0.16, PAL.tinte, cx + 0.5, 0.8, S.z0 + 1.5);
    // Stapel Plakate in der Ecke, Leimkübel
    b(0.7, 0.3, 0.5, pc, cx + 0.3, 0, S.z0 + 3.0, { cast: false });
    w.cyl(0.14, 0.12, 0.3, 0x8A9197, cx - 0.5, 0, S.z0 + 3.1, { parent: S.g, seg: 10 });
    col(cx - 0.65, S.z0 + 2.7, cx + 0.7, S.z0 + 3.3, 0.4);
    o.partyDesk[id] = P(cx, S.z0 + 2.45);
    w.addInteractable('pdesk_' + id, o.partyDesk[id], 0.8, t('use.pdesk', { p: PARTIES[id].short }));
  });
  // Huber-Sekretärin im eigenen Abteil, sonst nur Plakate
  S.npc(PAL.ocker, 'tuch', PAL.rot, S.x0 + bw * 3.5 - 0.3, S.z0 + 0.95, 0, false);
  // Kopierer und Garderobe im Gang
  b(0.8, 0.95, 0.6, PAL.papier, -4.6, 0, 3.0, { line: 0.012 }); b(0.82, 0.06, 0.62, PAL.tinte, -4.6, 0.95, 3.0);
  col(-5.0, 2.7, -4.2, 3.3, 1.0);
  w.addInteractable('parteiexit', P(0, S.z1 - 0.2), 0.9, t('use.parteiexit'));
  o.partei = S.g; o.parteiUpdate = S.update;
}

// ---------------- Eingänge im Dorf: Türe, Schild, Laterne ----------------
// Rössli = Haus 3 (hinter dem Platz, Mitte), Parteienhaus = Haus 2 (hinten links). Türen zeigen zur Kamera (Süden).
export const ENTRANCES = [{ house: 3, id: 'roessli', key: 'roessli.sign', bg: '#E8D9A8', fg: PAL.tinte }, { house: 2, id: 'partei', key: 'partei.signShort', bg: PAL.blau, fg: PAL.schnee }];
export function markEntrances(w, o) {
  o.entrance = {};
  for (const E of ENTRANCES) {
    const g = w.houses[E.house], { w: hw, d, h } = g.userData;
    const fz = d / 2;
    w.box(0.9, 1.75, 0.08, PAL.nuss, 0, 0, fz + 0.03, { parent: g, line: 0.01 });
    w.box(0.05, 0.05, 0.05, PAL.ocker, 0.3, 0.85, fz + 0.09, { parent: g, cast: false });
    w.box(1.15, 0.1, 0.12, PAL.chalet, 0, 1.75, fz + 0.06, { parent: g });
    w.box(1.3, 0.12, 0.7, PAL.gletscher, 0, -0.04, fz + 0.4, { parent: g, cast: false });
    const sg = textPlane(t(E.key), 1.5, 0.34, E.bg, E.fg, 'serif'); sg.position.set(0, Math.min(h - 0.35, 2.25), fz + 0.07); g.add(sg); o[E.id + 'Door'] = sg;
    // Laterne neben der Türe
    w.box(0.06, 0.4, 0.06, PAL.tinte, 0.62, 1.6, fz + 0.1, { parent: g, cast: false });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), toon('#F1D98A')); lamp.position.set(0.62, 1.55, fz + 0.16); g.add(lamp); outline(lamp, 0.012);
    const front = new THREE.Vector3(0, 0, fz + 0.9).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y).add(g.position);
    o.entrance[E.id] = { pos: front, yaw: g.rotation.y };
    w.addInteractable(E.id + 'door', front, 0.9, t('use.' + E.id + 'door'));
  }
}

export function signpost(w) {
  const g = new THREE.Group(); g.position.set(-3.2, 0, 18.6); g.rotation.y = 0.15; w.scene.add(g);
  w.box(0.1, 2.0, 0.1, PAL.chalet, 0, 0, 0, { parent: g });
  [[t('roessli.sign'), 0.25, 1.65, 0.4], [t('partei.signShort'), -0.2, 1.3, -0.3]].forEach(([txt, dx, y, rot]) => {
    const a = new THREE.Group(); a.position.set(dx, y, 0.06); a.rotation.y = rot; g.add(a);
    const shape = new THREE.Shape(); shape.moveTo(-0.55, -0.12); shape.lineTo(0.45, -0.12); shape.lineTo(0.62, 0); shape.lineTo(0.45, 0.12); shape.lineTo(-0.55, 0.12); shape.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false }), toon(PAL.schnee)); m.castShadow = true; a.add(m); outline(m, 0.01);
    const tp = textPlane(txt, 0.9, 0.2, PAL.schnee, PAL.tinte, 'sans'); tp.position.set(0.0, 0, 0.045); a.add(tp);
  });
  w.addCollider(-3.3, 0, 18.5, -3.1, 2, 18.7);
}
