// Dorf, Bauernhof, Strand, Aussichtspunkt: Häuser mit Stolperschwellen, begehbaren Dächern und Spassplätzen.
import * as THREE from 'three';
import { PAL, rng } from './palette.js';
import { toon, outline } from './toon.js';
import { C } from './world.js';
import { bake } from './geo.js';
import { terrainY, addBox } from './solid.js';

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function mesh(g, col, parent, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(g, typeof col === 'string' ? toon(col) : col); m.position.set(x, y, z);
  if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.shadow !== false; m.receiveShadow = true; parent.add(m);
  if (o.ol) outline(m, o.ol);
  return m;
}
// Gruppe an Weltposition, mit lokaler->Welt-Umrechnung für Kollisionen
function place(root, x, z, rot, y) { const g = new THREE.Group(); g.position.set(x, y ?? terrainY(x, z), z); g.rotation.y = rot; root.add(g); return g; }
const w2 = (g, lx, lz) => { const c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y); return [g.position.x + lx * c + lz * s, g.position.z - lx * s + lz * c]; };
// Kollision in lokalen Koordinaten der Gruppe
function box(g, lx, lz, hx, hz, y0, y1, o = {}) { const [x, z] = w2(g, lx, lz); return addBox(Object.assign({ x, z, rot: g.rotation.y + (o.r || 0), hx, hz, y0: g.position.y + y0, y1: g.position.y + y1 }, o, { r: undefined })); }
function ramp(g, lx, lz, hx, hz, y0, y1, r = 0, o = {}) { const [x, z] = w2(g, lx, lz); return addBox(Object.assign({ x, z, rot: g.rotation.y + r, hx, hz, y0: g.position.y + y0, y1: g.position.y + y1, rise: 1 }, o)); }

export const SPOTS = { doors: [], trampolines: [], cannons: [], bells: [], stamps: [], spawns: [], parking: [], zones: [] };

// ---------------- Chalet ----------------
export function chalet(root, x, z, rot, o = {}) {
  const w = o.w || 7, d = o.d || 8, h = o.h || 5.2, wood = o.wood !== false;
  const g = place(root, x, z, rot, (o.y ?? terrainY(x, z)) + 0.05);
  const wall = wood ? C.holz : C.putz;
  mesh(B(w + 0.3, 0.9, d + 0.3), C.fels, g, 0, 0.2, 0);                       // Sockel
  mesh(B(w, h - 0.6, d), wall, g, 0, 0.6 + (h - 0.6) / 2, 0, { ol: 0.04 });
  if (wood) for (let y = 1.2; y < h; y += 0.55) mesh(B(w + 0.04, 0.05, d + 0.04), '#6E4528', g, 0, y, 0, { shadow: false });
  // Dach: zwei Hälften mit Überstand
  const rh = o.roofH || 2.6, over = 0.8, half = w / 2 + over, slope = Math.atan2(rh, w / 2), len = Math.hypot(half, rh * half / (w / 2));
  const roofCol = o.roof || C.dach;
  for (const s of [-1, 1]) {
    const r = mesh(B(len, 0.22, d + over * 2), roofCol, g, s * half / 2, h + rh / 2 - 0.15, 0, { rz: -s * slope, ol: 0.04 });
    // begehbar: Dachhälfte als Rampe (steigt von aussen nach innen)
    ramp(g, s * half / 2, 0, (d + over * 2) / 2, half / 2, h + rh - rh * half / (w / 2) + 0.12, h + rh + 0.12, s > 0 ? -Math.PI / 2 : Math.PI / 2);
  }
  mesh(B(0.3, 0.3, d + over * 2 + 0.1), '#4A2E1E', g, 0, h + rh, 0);           // First
  // Giebeldreieck vorne/hinten
  const tri = new THREE.Shape(); tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rh); tri.closePath();
  const tg = new THREE.ShapeGeometry(tri);
  for (const s of [-1, 1]) { const m = mesh(tg, wood ? C.holzHell : C.putz, g, 0, h, s * (d / 2 + 0.01), { ry: s < 0 ? Math.PI : 0 }); m.material = toon(wood ? C.holzHell : C.putz, { side: THREE.DoubleSide }); }
  // Fenster mit Läden und Blumenkisten
  const shutter = o.shutter || C.rot, flowers = [C.rot, C.rosa, '#F2C230', C.lila];
  const winRows = h > 6 ? [1.9, 4.2] : [2.1, 4.1];
  for (const side of [1, -1]) for (const wy of winRows) for (const wx of [-w / 4, w / 4]) {
    if (side === 1 && wy === winRows[0] && Math.abs(wx - (o.doorX || 0)) < 1.5) continue;
    mesh(B(1.0, 1.1, 0.08), '#2B3A45', g, wx, wy, side * (d / 2 + 0.03), { shadow: false });
    mesh(B(1.18, 0.1, 0.14), C.weiss, g, wx, wy - 0.6, side * (d / 2 + 0.06));
    for (const sx of [-1, 1]) mesh(B(0.42, 1.12, 0.06), shutter, g, wx + sx * 0.74, wy, side * (d / 2 + 0.07), { shadow: false });
    if (wy === winRows[0]) { mesh(B(1.1, 0.25, 0.3), C.holz, g, wx, wy - 0.78, side * (d / 2 + 0.18)); for (let k = -2; k <= 2; k++) mesh(new THREE.IcosahedronGeometry(0.11, 0), flowers[(k + 5 + Math.round(x)) % 4], g, wx + k * 0.2, wy - 0.58, side * (d / 2 + 0.2), { shadow: false }); }
  }
  // Balkon
  if (o.balcony !== false && h > 5) {
    mesh(B(w * 0.8, 0.12, 1.2), C.holzHell, g, 0, winRows[1] - 0.9, -(d / 2 + 0.6));
    for (let k = 0; k <= 10; k++) mesh(B(0.08, 0.8, 0.08), C.holzHell, g, -w * 0.4 + k * w * 0.08, winRows[1] - 0.45, -(d / 2 + 1.15), { shadow: false });
    mesh(B(w * 0.8, 0.1, 0.1), C.holzHell, g, 0, winRows[1] - 0.05, -(d / 2 + 1.15));
    box(g, 0, -(d / 2 + 0.6), w * 0.4, 0.6, winRows[1] - 0.96, winRows[1] - 0.84);
  }
  // Tür, Vordach, Schwelle (Stolperfalle!) und Treppenstufe
  const dx = o.doorX || 0;
  mesh(B(1.2, 2.1, 0.1), o.doorCol || '#5A3A24', g, dx, 1.65, d / 2 + 0.04);
  mesh(new THREE.SphereGeometry(0.06, 6, 4), C.ocker, g, dx + 0.4, 1.6, d / 2 + 0.12, { shadow: false });
  mesh(B(1.8, 0.12, 1.1), roofCol, g, dx, 2.95, d / 2 + 0.5, { rx: 0.25 });
  mesh(B(1.6, 0.22, 0.9), C.fels, g, dx, 0.18, d / 2 + 0.5);
  box(g, dx, d / 2 + 0.5, 0.8, 0.45, -1, 0.29, { trip: true });
  // Wände als Kollision (bis unter das Dach)
  box(g, 0, 0, w / 2, d / 2, -1, h);
  SPOTS.doors.push({ x: w2(g, dx, d / 2 + 1.2)[0], z: w2(g, dx, d / 2 + 1.2)[1] });
  // Kamin
  mesh(B(0.7, 1.6, 0.7), C.fels, g, w / 4, h + rh * 0.7, d / 4, { ol: 0.03 });
  return g;
}

// ---------------- Kleinzeug ----------------
function fence(root, pts, col = C.holzHell) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 1.6), a = Math.atan2(bx - ax, bz - az);
    for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n, y = terrainY(x, z); mesh(B(0.14, 1, 0.14), col, root, x, y + 0.5, z); }
    for (const hy of [0.45, 0.85]) { const mx = (ax + bx) / 2, mz = (az + bz) / 2; const m = mesh(B(0.07, 0.1, L), col, root, mx, (terrainY(ax, az) + terrainY(bx, bz)) / 2 + hy, mz, { ry: a }); }
    addBox({ x: (ax + bx) / 2, z: (az + bz) / 2, rot: a, hx: 0.1, hz: L / 2, y0: terrainY((ax + bx) / 2, (az + bz) / 2) - 1, y1: terrainY((ax + bx) / 2, (az + bz) / 2) + 1, trip: true });
  }
}
function lamp(root, x, z) { const y = terrainY(x, z); mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.4, 6), C.tinte, root, x, y + 1.7, z); mesh(B(0.45, 0.5, 0.45), C.tinte, root, x, y + 3.5, z); mesh(B(0.32, 0.36, 0.32), toon(PAL.lampe, { emissive: PAL.lampe, emissiveIntensity: 0.4 }), root, x, y + 3.5, z, { shadow: false }); addBox({ circle: true, x, z, r: 0.15, y0: y - 1, y1: y + 3.6 }); }
function bench(root, x, z, rot) { const g = place(root, x, z, rot); mesh(B(1.8, 0.1, 0.5), C.holzHell, g, 0, 0.5, 0); mesh(B(1.8, 0.4, 0.08), C.holzHell, g, 0, 0.85, -0.22); for (const s of [-0.75, 0.75]) mesh(B(0.08, 0.5, 0.45), C.tinte, g, s, 0.25, 0); box(g, 0, 0, 0.9, 0.25, -0.5, 0.55, { trip: true }); }
function flowers(root, x, z, n, R) { for (let i = 0; i < n; i++) { const a = R() * 6.28, r = R() * 2.2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; mesh(new THREE.IcosahedronGeometry(0.12, 0), [C.rot, C.rosa, '#F2C230', C.weiss, C.lila][i % 5], root, px, terrainY(px, pz) + 0.25, pz, { shadow: false }); } }
function rock(root, x, z, s, trip) { const y = terrainY(x, z); const m = mesh(new THREE.DodecahedronGeometry(s, 0), C.fels, root, x, y + s * 0.35, z, { ol: 0.04 }); m.scale.y = 0.6; m.rotation.y = x; addBox({ circle: true, x, z, r: s * 0.85, y0: y - 1, y1: y + s * 0.7, trip: !!trip }); }
function sign(root, x, z, rot, txt) {
  const g = place(root, x, z, rot); mesh(B(0.12, 2.2, 0.12), C.holz, g, 0, 1.1, 0);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = C.weiss; c.fillRect(0, 0, 256, 64); c.strokeStyle = C.tinte; c.lineWidth = 6; c.strokeRect(3, 3, 250, 58); c.fillStyle = C.tinte; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 128, 34);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: t })); p.position.set(0, 1.9, 0.07); p.userData.keep = true; g.add(p);
  const p2 = p.clone(); p2.userData = { keep: true }; p2.rotation.y = Math.PI; p2.position.z = -0.07; g.add(p2);
  box(g, 0, 0, 0.08, 0.08, -1, 2.2);
}

// ---------------- Spassplätze ----------------
function trampoline(root, x, z, r = 1.6) {
  const y = terrainY(x, z), g = place(root, x, z, 0, y);
  mesh(new THREE.TorusGeometry(r, 0.12, 6, 20), C.blau, g, 0, 0.7, 0, { rx: Math.PI / 2 });
  const mat = mesh(new THREE.CylinderGeometry(r - 0.05, r - 0.05, 0.05, 20), C.tinte, g, 0, 0.68, 0); mat.userData.keep = true;
  for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; mesh(B(0.08, 0.7, 0.08), C.tinte, g, Math.cos(a) * r, 0.35, Math.sin(a) * r); }
  const o = addBox({ circle: true, x, z, r, y0: y - 1, y1: y + 0.7, bouncy: 15 });
  SPOTS.trampolines.push({ x, z, y: y + 0.7, r, mesh: mat, k: 0, box: o });
}
function cannon(root, x, z, rot, power, pitch) {
  const g = place(root, x, z, rot);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.15, 12), C.holz, g, s * 0.65, 0.6, 0, { rz: Math.PI / 2, ol: 0.03 });
  const barrel = new THREE.Group(); barrel.position.y = 1.0; barrel.rotation.x = -pitch; g.add(barrel);
  mesh(new THREE.CylinderGeometry(0.42, 0.55, 2.6, 14), C.tinte, barrel, 0, 0, 0.9, { rx: Math.PI / 2, ol: 0.04 });
  mesh(new THREE.TorusGeometry(0.44, 0.08, 6, 14), C.ocker, barrel, 0, 0, 2.2);
  box(g, 0, 0, 0.8, 0.8, -1, 0.9);
  const dir = new THREE.Vector3(Math.sin(rot) * Math.cos(pitch), Math.sin(pitch), Math.cos(rot) * Math.cos(pitch));
  const mouth = new THREE.Vector3(x, g.position.y + 1, z).addScaledVector(dir, 2.5);
  SPOTS.cannons.push({ x, z, y: g.position.y, dir, mouth, power, barrel });
}
function kegelbahn(root, x, z, rot) {
  const g = place(root, x, z, rot, terrainY(x, z) + 0.02);
  mesh(B(2.6, 0.12, 20), C.holzHell, g, 0, 0.05, 0);
  for (const s of [-1, 1]) { mesh(B(0.3, 0.35, 20), C.holz, g, s * 1.45, 0.17, 0); box(g, s * 1.45, 0, 0.15, 10, -1, 0.35); }
  mesh(B(3.2, 1.6, 0.3), C.holz, g, 0, 0.8, -10.5); box(g, 0, -10.5, 1.6, 0.15, -1, 1.6);
  box(g, 0, 0, 1.3, 10, -1, 0.11);
  const [px, pz] = w2(g, 0, -7.5);
  SPOTS.zones.push({ kind: 'kegel', x: px, z: pz, rot, r: 2.5 });
  sign(root, ...w2(g, 2.4, 9), rot, 'KEGELBAHN');
  return w2(g, 0, 8);
}

// ---------------- Kirche, Brunnen, Steg, Turm ----------------
function church(root, x, z, rot) {
  const g = place(root, x, z, rot, terrainY(x, z) + 0.05);
  mesh(B(7, 6, 11), C.putz, g, 0, 3, 0, { ol: 0.05 }); box(g, 0, 0, 3.5, 5.5, -1, 5.8);
  for (const s of [-1, 1]) { mesh(B(5.2, 0.25, 12.2), C.dach2, g, s * 2.1, 7.3, 0, { rz: -s * 0.72, ol: 0.04 }); ramp(g, s * 2.1, 0, 6.1, 2.1, 5.8, 9.0, s > 0 ? -Math.PI / 2 : Math.PI / 2); }
  const tri = new THREE.Shape(); tri.moveTo(-3.5, 0); tri.lineTo(3.5, 0); tri.lineTo(0, 3.1); tri.closePath();
  for (const s of [-1, 1]) mesh(new THREE.ShapeGeometry(tri), toon(C.putz, { side: THREE.DoubleSide }), g, 0, 6, s * 5.51);
  // Turm
  mesh(B(3.2, 13, 3.2), C.putz, g, 0, 6.5, 6.6, { ol: 0.05 }); box(g, 0, 6.6, 1.6, 1.6, -1, 13);
  mesh(new THREE.ConeGeometry(2.5, 5.5, 4), C.dach2, g, 0, 15.7, 6.6, { ry: Math.PI / 4, ol: 0.05 });
  for (const s of [0, 1, 2, 3]) { const a = s * Math.PI / 2; mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 14), C.weiss, g, Math.sin(a) * 1.64, 10.6, 6.6 + Math.cos(a) * 1.64, { rx: Math.PI / 2, ry: a, shadow: false }); }
  mesh(B(3.26, 1.6, 1.4), '#2B3A45', g, 0, 11.9, 6.6, { shadow: false }); mesh(B(1.4, 1.6, 3.26), '#2B3A45', g, 0, 11.9, 6.6, { shadow: false });
  const bell = mesh(new THREE.CylinderGeometry(0.35, 0.7, 0.9, 12, 1, true), toon(C.ocker, { side: THREE.DoubleSide }), g, 0, 11.6, 6.6); bell.userData.keep = true;
  mesh(B(1.4, 2.4, 0.1), '#5A3A24', g, 0, 1.2, 8.25);
  box(g, 0, 8.5, 1, 0.4, -1, 0.25, { trip: true }); mesh(B(2, 0.25, 0.8), C.fels, g, 0, 0.12, 8.5);
  for (let k = -2; k <= 2; k++) for (const s of [-1, 1]) { mesh(B(0.1, 2, 0.9), '#2B3A45', g, s * 3.52, 3.4, k * 2, { shadow: false }); }
  // Glockenseil: E zum Läuten
  const [bx, bz] = w2(g, 1.2, 8.6); SPOTS.bells.push({ x: bx, z: bz, bell, t: 0 });
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 4), C.holzHell, root, bx, terrainY(bx, bz) + 1.6, bz);
  mesh(new THREE.SphereGeometry(0.1, 6, 4), C.rot, root, bx, terrainY(bx, bz) + 0.45, bz);
  return g;
}
function fountain(root, x, z) {
  const y = terrainY(x, z), g = place(root, x, z, 0, y);
  mesh(new THREE.CylinderGeometry(2.6, 2.7, 0.7, 20, 1, true), toon(C.fels, { side: THREE.DoubleSide }), g, 0, 0.35, 0, { ol: 0.04 });
  mesh(new THREE.TorusGeometry(2.6, 0.18, 6, 24), C.fels, g, 0, 0.7, 0, { rx: Math.PI / 2 });
  const wa = mesh(new THREE.CircleGeometry(2.5, 20), toon(C.wasser), g, 0, 0.5, 0, { rx: -Math.PI / 2, shadow: false });
  mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.2, 10), C.fels, g, 0, 1.1, 0, { ol: 0.03 });
  mesh(new THREE.SphereGeometry(0.5, 10, 6), C.fels, g, 0, 2.3, 0);
  // Rand als Ring aus Stolperkanten
  for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; addBox({ x: x + Math.cos(a) * 2.6, z: z + Math.sin(a) * 2.6, rot: -a, hx: 0.2, hz: 0.75, y0: y - 1, y1: y + 0.75, trip: true }); }
  addBox({ circle: true, x, z, r: 0.45, y0: y - 1, y1: y + 2.6 });
  addBox({ circle: true, x, z, r: 2.4, y0: y - 1, y1: y + 0.15 });
  SPOTS.zones.push({ kind: 'brunnen', x, z, r: 2.4, y: y + 0.5 });
}
function pier(root, x, z, rot, len) {
  const g = place(root, x, z, rot, 0.9);
  mesh(B(2.6, 0.2, len), C.holzHell, g, 0, 0, len / 2);
  for (let k = 0; k <= len; k += 3) for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.14, 0.14, 4, 6), C.holz, g, s * 1.2, -1.8, k);
  box(g, 0, len / 2, 1.3, len / 2, -0.3, 0.1);
  for (let k = 0.5; k < len; k += 0.7) mesh(B(2.62, 0.02, 0.05), '#8B6440', g, 0, 0.11, k, { shadow: false });
  // Sprungbrett
  mesh(B(0.7, 0.1, 3), C.weiss, g, 0, 0.6, len + 1); mesh(B(0.8, 0.6, 0.5), C.blau, g, 0, 0.3, len - 0.2);
  ramp(g, 0, len + 1, 0.35, 1.5, 0.45, 0.75, Math.PI, { bouncy: 9 });
  return g;
}
function tower(root, x, z) {
  const y = terrainY(x, z), g = place(root, x, z, 0.3, y);
  const H = 7;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(B(0.3, H, 0.3), C.holz, g, sx * 1.6, H / 2, sz * 1.6);
  mesh(B(4, 0.25, 4), C.holzHell, g, 0, H, 0); box(g, 0, 0, 2, 2, H - 0.2, H + 0.12);
  for (const s of [-1, 1]) { if (s > 0) { mesh(B(4, 0.9, 0.1), C.holzHell, g, 0, H + 0.6, s * 2); box(g, 0, s * 2, 2, 0.06, H, H + 1.05); } else for (const q of [-1, 1]) { mesh(B(1.3, 0.9, 0.1), C.holzHell, g, q * 1.35, H + 0.6, -2); box(g, q * 1.35, -2, 0.65, 0.06, H, H + 1.05); } mesh(B(0.1, 0.9, 4), C.holzHell, g, s * 2, H + 0.6, 0); box(g, s * 2, 0, 0.06, 2, H, H + 1.05); }
  mesh(new THREE.ConeGeometry(3.2, 1.6, 4), C.rot, g, 0, H + 2.8, 0, { ry: Math.PI / 4, ol: 0.04 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(B(0.15, 2, 0.15), C.holz, g, sx * 1.9, H + 1.1, sz * 1.9);
  // Treppe als Rampe mit Stufen-Optik, führt von -z auf die Plattform; unten auf dem Hang aufgesetzt
  const [bx0, bz0] = w2(g, 0, -10.4), yb = terrainY(bx0, bz0) - y, steps = 16;
  for (let k = 0; k < steps; k++) { const t = (k + 1) / steps, sy = yb + (H - yb) * t; mesh(B(1.2, 0.12, 8.4 / steps + 0.05), C.holzHell, g, 0, sy - 0.06, -10.4 + (k + 0.5) * 8.4 / steps); mesh(B(0.12, Math.max(0.1, sy - yb * (1 - 0) - 0.06 + 0.5), 0.12), C.holz, g, 0.55, (sy + yb) / 2 - 0.2, -10.4 + (k + 0.5) * 8.4 / steps, { shadow: false }); }
  for (const s of [-1, 1]) mesh(B(0.12, 0.12, Math.hypot(8.4, H - yb)), C.holz, g, s * 0.65, (H + yb) / 2 + 0.9, -6.2, { rx: -Math.atan2(H - yb, 8.4) });
  ramp(g, 0, -6.2, 0.6, 4.2, yb, H, 0);
}
function barn(root, x, z, rot) {
  const g = chalet(root, x, z, rot, { w: 10, d: 12, h: 5, roofH: 3.2, balcony: false, doorCol: C.rot, shutter: C.weiss });
  // Heuballen davor kommen als Requisiten
  return g;
}
function busstop(root, x, z, rot) {
  const g = place(root, x, z, rot);
  mesh(B(3, 0.12, 1.4), C.ocker, g, 0, 2.4, 0, { ol: 0.03 }); for (const s of [-1, 1]) mesh(B(0.1, 2.4, 0.1), C.tinte, g, s * 1.4, 1.2, -0.6);
  mesh(B(3, 1.6, 0.06), toon('#BFD8E6', { transparent: true, opacity: 0.5 }), g, 0, 1.4, -0.65, { shadow: false });
  box(g, 0, -0.65, 1.5, 0.05, -1, 2.4);
  mesh(B(2.2, 0.08, 0.45), C.holzHell, g, 0, 0.5, -0.35); box(g, 0, -0.35, 1.1, 0.22, -1, 0.54, { trip: true });
  sign(root, ...w2(g, 1.9, 0.4), rot, 'HALTESTELLE');
  SPOTS.zones.push({ kind: 'bus', x: w2(g, 0, 2.5)[0], z: w2(g, 0, 2.5)[1], r: 4 });
}
function kiosk(root, x, z, rot) {
  const g = place(root, x, z, rot);
  mesh(B(4, 2.6, 3), C.blau, g, 0, 1.3, 0, { ol: 0.04 }); box(g, 0, 0, 2, 1.5, -1, 2.6);
  for (let k = -3; k <= 3; k++) mesh(B(0.6, 0.12, 1.2), k % 2 ? C.weiss : C.rot, g, k * 0.6, 2.9, 1.7, { rx: 0.35 });
  mesh(B(4.2, 0.12, 1), C.holzHell, g, 0, 1.0, 1.9); box(g, 0, 1.9, 2.1, 0.5, -1, 1.06);
}

// ---------------- Aufbau ----------------
export function buildVillage(scene) {
  const root = new THREE.Group(), R = rng(31);
  // Dorfplatz-Pflaster
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(15, 40), toon('#C9BFA9')); plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, terrainY(0, 0) + 0.05, 0); plaza.receiveShadow = true; root.add(plaza);
  for (let i = 0; i < 90; i++) { const a = R() * 6.28, r = 2.8 + R() * 11.5; const m = mesh(B(0.5, 0.02, 0.35), '#B5AA93', root, Math.cos(a) * r, terrainY(0, 0) + 0.07, Math.sin(a) * r, { ry: R() * 3, shadow: false }); }
  fountain(root, 0, 0);
  // Häuserring um den Platz (Türen zum Platz)
  const H = [[-22, -6, 0, {}], [-20, 12, 0, { wood: false, shutter: C.gruen }], [-8, 22, 0, {}], [10, 22, 0, { wood: false, h: 6.6, shutter: C.blau }], [22, 10, 0, {}], [22, -9, 0, { wood: false, shutter: C.rot, h: 6.6 }], [8, -24, 0, {}], [-46, -12, 0, {}], [-44, 18, 0, { wood: false }], [44, -16, 0, {}], [46, 14, 0, { wood: false, shutter: C.gruen }], [-14, 46, 0, {}], [24, 46, 0, {}], [30, -44, 0, { wood: false }]];
  for (const [x, z, , o] of H) { const rot = Math.atan2(-x, -z); chalet(root, x, z, rot, o); }
  church(root, -10, -26, Math.atan2(10, 26) + Math.PI);
  kiosk(root, 12, 7, Math.atan2(-12, -7));
  busstop(root, 3, 38, 0);
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28 + 0.3; lamp(root, Math.cos(a) * 16, Math.sin(a) * 16); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + 0.6; bench(root, Math.cos(a) * 12.5, Math.sin(a) * 12.5, -a - Math.PI / 2); }
  for (let i = 0; i < 14; i++) { const a = R() * 6.28, r = 17 + R() * 12; flowers(root, Math.cos(a) * r, Math.sin(a) * r, 8, R); }
  // Spielplatz mit Trampolinen
  trampoline(root, -26, 30, 1.8); trampoline(root, -31, 27, 1.5); trampoline(root, -24, 35.5, 1.3);
  sign(root, -20, 28, 0.6, 'SPIELPLATZ');
  // Kegelbahn
  const kegelStart = kegelbahn(root, 40, -2, Math.PI / 2 + 0.05);
  // Bauernhof im Westen
  barn(root, -92, 40, 0.4); chalet(root, -104, 18, 1.2, {});
  fence(root, [[-80, 46], [-74, 60], [-90, 70], [-104, 60], [-100, 48]]);
  // Strand im Süden mit Steg
  pier(root, 18, 116, 0.15, 18);
  sign(root, 12, 108, 0.2, 'BADESTRAND');
  // Aussichtsturm mit Kanone auf dem grossen Hügel
  tower(root, 90, -80);
  cannon(root, 84, -72, Math.atan2(-84, 72), 46, 0.62);   // Richtung Dorf
  cannon(root, 20, 104, 0.1, 24, 0.75);                              // am Strand: aufs Meer
  sign(root, 80, -68, 0.8, 'KANONE');
  // Wegweiser
  sign(root, 30, -22, -0.6, 'AUSSICHT');
  sign(root, -30, 4, 1.6, 'BAUERNHOF');
  sign(root, 4, 30, 0, 'STRAND');
  // Felsen, einige als Stolpersteine auf Wegen
  for (let i = 0; i < 40; i++) { const a = R() * 6.28, r = 55 + R() * 70, x = Math.cos(a) * r, z = Math.sin(a) * r; if (terrainY(x, z) > 1.5) rock(root, x, z, 0.4 + R() * 1.3); }
  for (const [x, z] of [[2, 50], [-50, 7], [60, -55], [0, -33.5], [-28, 22]]) rock(root, x, z, 0.28, true);
  // Startpunkte
  SPOTS.spawns.push([0, 6], [-3, 7], [3, 7]);
  SPOTS.kegelStart = kegelStart;
  const baked = bake(root);
  scene.add(baked);
  return baked;
}
