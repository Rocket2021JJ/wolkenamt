// Alles, was man aufheben, werfen, schubsen oder umfahren kann. Eigene, einfache Kugelphysik.
import * as THREE from 'three';
import { toon, outline } from './toon.js';
import { C } from './world.js';
import { groundAt, pushOut, terrainY, SEA } from './solid.js';
import { rng } from './palette.js';

export const GRAV = 22;
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function part(g, col, parent, x = 0, y = 0, z = 0, o = {}) { const m = new THREE.Mesh(g, toon(col)); m.position.set(x, y, z); if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; if (o.ry) m.rotation.y = o.ry; m.castShadow = true; parent.add(m); if (o.ol !== 0) outline(m, o.ol || 0.025); return m; }

// Arten: Radius, Masse, Sprungkraft, rollt?, schwimmt?, über Kopf tragen?
export const KINDS = {
  kiste: { r: 0.42, m: 2, b: 0.25, make(g) { part(B(0.78, 0.78, 0.78), C.holzHell, g); for (const s of [-1, 1]) part(B(0.82, 0.1, 0.1), C.holz, g, 0, s * 0.34, 0.36, { ol: 0 }); part(B(0.1, 0.82, 0.82), C.holz, g, 0, 0, 0, { ol: 0 }).scale.set(1.05, 0.5, 1.01); } },
  ball: { r: 0.33, m: 0.5, b: 0.72, roll: 1, float: 1, make(g) { part(new THREE.IcosahedronGeometry(0.33, 2), C.weiss, g); for (const a of [0, 1.57]) part(new THREE.TorusGeometry(0.335, 0.03, 4, 18), C.rot, g, 0, 0, 0, { ry: a, ol: 0 }); } },
  melone: { r: 0.3, m: 1.2, b: 0.2, roll: 1, float: 1, burst: 12, make(g) { const m = part(new THREE.IcosahedronGeometry(0.3, 2), C.gruen, g); m.scale.set(1.15, 0.95, 0.95); for (let k = 0; k < 4; k++) part(new THREE.TorusGeometry(0.29, 0.02, 3, 16), '#2F5E2C', g, 0, 0, 0, { rx: Math.PI / 2, ry: k * 0.78, ol: 0 }).scale.set(1.15, 1, 0.95); } },
  zwerg: { r: 0.32, m: 1, b: 0.3, make(g) { part(new THREE.CylinderGeometry(0.2, 0.28, 0.4, 8), C.blau, g, 0, -0.1, 0); part(new THREE.SphereGeometry(0.17, 8, 6), '#F0C9A0', g, 0, 0.18, 0); part(new THREE.ConeGeometry(0.17, 0.4, 8), C.rot, g, 0, 0.45, 0); part(new THREE.ConeGeometry(0.12, 0.22, 6), C.weiss, g, 0, 0.08, 0.13, { rx: Math.PI }); } },
  pylon: { r: 0.28, m: 0.4, b: 0.35, make(g) { part(new THREE.ConeGeometry(0.22, 0.6, 10), '#EE7A2C', g, 0, 0.05, 0); part(new THREE.CylinderGeometry(0.15, 0.17, 0.08, 10), C.weiss, g, 0, 0.08, 0, { ol: 0 }); part(B(0.5, 0.06, 0.5), '#EE7A2C', g, 0, -0.25, 0); } },
  fass: { r: 0.44, m: 3, b: 0.2, roll: 1, float: 1, make(g) { part(new THREE.CylinderGeometry(0.4, 0.4, 0.85, 12), C.rot, g, 0, 0, 0, { rz: Math.PI / 2 }); for (const s of [-1, 0, 1]) part(new THREE.TorusGeometry(0.405, 0.03, 4, 14), C.tinte, g, s * 0.3, 0, 0, { ry: Math.PI / 2, ol: 0 }); } },
  heu: { r: 0.7, m: 4, b: 0.15, big: 1, float: 1, make(g) { part(new THREE.CylinderGeometry(0.7, 0.7, 1.2, 14), '#D8B65A', g, 0, 0, 0, { rz: Math.PI / 2 }); for (const s of [-0.3, 0.3]) part(new THREE.TorusGeometry(0.705, 0.025, 4, 16), '#9C7C3A', g, s, 0, 0, { ry: Math.PI / 2, ol: 0 }); } },
  kegel: { r: 0.17, m: 0.35, b: 0.3, pin: 1, make(g) { part(new THREE.CylinderGeometry(0.07, 0.13, 0.5, 10), C.weiss, g, 0, 0.05, 0); part(new THREE.SphereGeometry(0.1, 8, 6), C.weiss, g, 0, 0.37, 0); part(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 10), C.rot, g, 0, 0.2, 0, { ol: 0 }); } },
  kugel: { r: 0.28, m: 3, b: 0.1, roll: 1, make(g) { part(new THREE.IcosahedronGeometry(0.28, 2), C.tinte, g); } },
  huhn: { r: 0.25, m: 0.6, b: 0.3, alive: 'huhn', make(g) { part(new THREE.SphereGeometry(0.22, 10, 8), C.weiss, g).scale.set(0.9, 0.9, 1.15); part(new THREE.SphereGeometry(0.13, 8, 6), C.weiss, g, 0, 0.22, 0.16); part(B(0.04, 0.09, 0.12), C.rot, g, 0, 0.36, 0.15, { ol: 0 }); part(new THREE.ConeGeometry(0.04, 0.1, 4), C.gelb, g, 0, 0.21, 0.31, { rx: Math.PI / 2, ol: 0 }); part(new THREE.ConeGeometry(0.1, 0.2, 5), C.weiss, g, 0, 0.08, -0.25, { rx: -2.2 }); for (const s of [-1, 1]) part(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 4), C.gelb, g, s * 0.07, -0.25, 0, { ol: 0 }); for (const s of [-1, 1]) { const e = part(new THREE.SphereGeometry(0.02, 4, 3), C.tinte, g, s * 0.08, 0.25, 0.25, { ol: 0 }); } } },
  kuh: { r: 0.85, m: 25, b: 0.05, alive: 'kuh', heavy: 1, make(g) { part(B(0.9, 0.85, 1.7), C.weiss, g, 0, 0.1, 0); for (const [x, z] of [[0.25, 0.3], [-0.3, -0.4], [0.3, -0.5]]) part(B(0.05, 0.4, 0.45), C.tinte, g, x > 0 ? 0.46 : -0.46, 0.15, z, { ol: 0 }); part(B(0.55, 0.55, 0.6), C.weiss, g, 0, 0.35, 1.05); part(B(0.5, 0.25, 0.2), C.rosa, g, 0, 0.18, 1.38); for (const s of [-1, 1]) { part(B(0.12, 0.65, 0.12), C.weiss, g, s * 0.3, -0.55, 0.6); part(B(0.12, 0.65, 0.12), C.weiss, g, s * 0.3, -0.55, -0.6); part(new THREE.ConeGeometry(0.05, 0.2, 4), C.schnee, g, s * 0.2, 0.7, 1.1, { rz: -s * 0.6, ol: 0 }); } part(new THREE.SphereGeometry(0.1, 6, 4), C.ocker, g, 0, 0.0, 1.3); } },
};

export const bodies = [];
const byId = new Map();
let nextId = 1;
export function bodyById(id) { return byId.get(id); }
export function spawnProp(scene, kind, x, z, y, id) {
  const K = KINDS[kind], g = new THREE.Group(); K.make(g); scene.add(g);
  const b = { id: id || nextId++, kind, K, r: K.r, m: K.m, p: new THREE.Vector3(x, y ?? terrainY(x, z) + K.r + 0.05, z), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), mesh: g, held: null, sleep: 0, onG: false, home: new THREE.Vector3(x, 0, z), t: Math.random() * 10, fallen: false, ai: { tx: x, tz: z, wait: 0 }, last: 0, alive: true, lastBy: null };
  b.home.y = b.p.y; b.homeQ = b.q.clone();
  if (K.alive) b.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6.28);
  if (id && id >= nextId) nextId = id + 1;
  bodies.push(b); byId.set(b.id, b); g.position.copy(b.p);
  return b;
}

const up = new THREE.Vector3(0, 1, 0), tq = new THREE.Quaternion(), tv = new THREE.Vector3(), ax = new THREE.Vector3();
// Eine Physikrunde für alle Körper (nur auf dem Host bzw. im Einzelspiel)
export function stepBodies(dt, hooks) {
  for (const b of bodies) {
    if (!b.alive) continue;
    if (b.held) continue;
    if (b.K.alive && b.onG) living(b, dt, hooks);
    if (b.sleep > 1.2 && !b.K.alive) continue;
    const wasG = b.onG;
    b.v.y -= GRAV * dt;
    b.p.addScaledVector(b.v, dt);
    // Wasser
    const sub = SEA - (b.p.y - b.r);
    if (sub > 0) {
      if (!b.wet && b.v.y < -3) hooks.splash(b);
      b.wet = true;
      const k = Math.min(1, sub / (b.r * 2));
      if (b.K.float || b.K.alive) b.v.y += GRAV * 1.8 * k * dt; else b.v.y += GRAV * 0.6 * k * dt;
      b.v.multiplyScalar(1 - 1.8 * dt);
    } else b.wet = false;
    // Boden
    const [gy, o] = groundAt(b.p.x, b.p.y - b.r, b.p.z, 0.35);
    b.onG = false;
    if (b.p.y - b.r < gy) {
      b.p.y = gy + b.r;
      const imp = -b.v.y;
      if (o && o.bouncy && imp > 1) { b.v.y = Math.max(o.bouncy * 0.8, imp * 0.9); hooks.boing(b, o); }
      else if (imp > 2.2) { b.v.y = imp * b.K.b; hooks.impact(b, imp); }
      else { b.v.y = 0; b.onG = true; }
      const f = b.K.roll ? 0.6 : 5;
      b.v.x *= Math.max(0, 1 - f * dt); b.v.z *= Math.max(0, 1 - f * dt);
      if (b.K.roll && !o) { // Hangabtrieb
        const e = 0.6, hx = terrainY(b.p.x + e, b.p.z) - terrainY(b.p.x - e, b.p.z), hz = terrainY(b.p.x, b.p.z + e) - terrainY(b.p.x, b.p.z - e);
        b.v.x -= hx / (2 * e) * GRAV * 0.7 * dt; b.v.z -= hz / (2 * e) * GRAV * 0.7 * dt;
      }
    }
    // Wände
    const hit = pushOut(b.p, b.r, b.p.y - b.r, 0.2);
    if (hit) { const vn = b.v.x * hit.nx + b.v.z * hit.nz; if (vn < 0) { b.v.x -= (1 + b.K.b) * vn * hit.nx; b.v.z -= (1 + b.K.b) * vn * hit.nz; if (vn < -4) hooks.impact(b, -vn); } }
    // Drehung
    const sp = Math.hypot(b.v.x, b.v.z);
    if (b.onG || (wasG && b.p.y - b.r - gy < 0.05)) {
      if (b.K.roll) { b.w.set(b.v.z, 0, -b.v.x).divideScalar(b.r); }
      else if (b.K.pin) { if (!b.fallen && sp > 0.6) { b.fallen = true; hooks.pin(b); } b.w.multiplyScalar(0.8); }
      else b.w.multiplyScalar(Math.max(0, 1 - 8 * dt));
      if (!b.K.roll && sp < 1.5) settle(b, dt);
    }
    const wl = b.w.length(); if (wl > 1e-4) { tq.setFromAxisAngle(ax.copy(b.w).divideScalar(wl), wl * dt); b.q.premultiply(tq); }
    // Schlafen
    if (b.onG && sp < 0.08 && wl < 0.1) b.sleep += dt; else b.sleep = 0;
    if (b.p.y < -30) respawn(b);
  }
  // Körper untereinander
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i]; if (!a.alive || a.held) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      const c = bodies[j]; if (!c.alive || c.held) continue;
      if (a.sleep > 1.2 && c.sleep > 1.2) continue;
      tv.subVectors(c.p, a.p); const m = a.r + c.r; const d2 = tv.lengthSq(); if (d2 >= m * m || d2 < 1e-8) continue;
      const d = Math.sqrt(d2); tv.divideScalar(d); const pen = m - d, ia = 1 / a.m, ic = 1 / c.m, s = ia + ic;
      a.p.addScaledVector(tv, -pen * ia / s); c.p.addScaledVector(tv, pen * ic / s);
      const rv = (c.v.x - a.v.x) * tv.x + (c.v.y - a.v.y) * tv.y + (c.v.z - a.v.z) * tv.z;
      if (rv < 0) { const j2 = -(1 + 0.3) * rv / s; a.v.addScaledVector(tv, -j2 * ia); c.v.addScaledVector(tv, j2 * ic); if (-rv > 3) hooks.clack(a, c, -rv); }
      a.sleep = c.sleep = 0;
    }
  }
}
// Aufrichten: kantige Dinge legen sich flach hin, ohne zu wackeln
function settle(b, dt) {
  if (b.K.pin && b.fallen) { // Kegel liegen auf der Seite
    tv.set(0, 1, 0).applyQuaternion(b.q); tv.y = 0; if (tv.lengthSq() < 0.01) tv.set(1, 0, 0); tv.normalize();
    tq.setFromUnitVectors(up, tv).multiply(yawOnly(b.q)); b.q.slerp(tq, Math.min(1, dt * 6)); return;
  }
  tq.copy(yawOnly(b.q)); b.q.slerp(tq, Math.min(1, dt * 7));
}
const eul = new THREE.Euler();
function yawOnly(q) { eul.setFromQuaternion(q, 'YXZ'); return new THREE.Quaternion().setFromAxisAngle(up, eul.y); }

// Hühner und Kühe laufen herum
function living(b, dt, hooks) {
  const A = b.ai; b.t += dt;
  const flee = hooks.nearestChar(b.p, b.K.alive === 'huhn' ? 3.5 : 0);
  if (flee) { const dx = b.p.x - flee.x, dz = b.p.z - flee.z, d = Math.hypot(dx, dz) || 1; A.tx = b.p.x + dx / d * 5; A.tz = b.p.z + dz / d * 5; A.wait = 0; if (Math.random() < dt * 2) hooks.cluck(b); }
  if (A.wait > 0) { A.wait -= dt; return; }
  const dx = A.tx - b.p.x, dz = A.tz - b.p.z, d = Math.hypot(dx, dz);
  if (d < 0.5) { A.wait = 1 + Math.random() * (b.K.alive === 'kuh' ? 8 : 3); const R = b.K.alive === 'kuh' ? 9 : 5; A.tx = b.home.x + (Math.random() - 0.5) * R * 2; A.tz = b.home.z + (Math.random() - 0.5) * R * 2; if (Math.random() < 0.3) hooks.cluck(b); return; }
  const sp = b.K.alive === 'kuh' ? 0.9 : flee ? 4.5 : 1.6;
  b.v.x += (dx / d * sp - b.v.x) * Math.min(1, dt * 6); b.v.z += (dz / d * sp - b.v.z) * Math.min(1, dt * 6);
  if (b.K.alive === 'huhn' && Math.random() < dt * 3) b.v.y = 2.5; // hüpfen
  const yaw = Math.atan2(dx, dz); tq.setFromAxisAngle(up, yaw); b.q.slerp(tq, Math.min(1, dt * 6));
  b.sleep = 0;
}

export function respawn(b) { b.p.copy(b.home); b.v.set(0, 0, 0); b.w.set(0, 0, 0); b.q.copy(b.homeQ); b.fallen = false; b.held = null; b.alive = true; b.mesh.visible = true; b.sleep = 0; }

// Darstellung (auch auf Clients aus Netzdaten)
export function drawBodies(dt) {
  for (const b of bodies) {
    b.mesh.visible = b.alive;
    if (b.net) { b.p.lerp(b.net.p, Math.min(1, dt * 14)); b.q.slerp(b.net.q, Math.min(1, dt * 14)); }
    b.mesh.position.copy(b.p);
    if (b.K.pin) b.mesh.position.y -= 0.0;
    b.mesh.quaternion.copy(b.q);
    if (b.K.alive === 'huhn' && b.onG && !b.held) b.mesh.position.y += Math.abs(Math.sin(b.t * 14)) * 0.04;
  }
}

// Requisiten im Dorf verteilen
export function populate(scene, SPOTS) {
  const R = rng(9);
  const at = (kind, x, z, n = 1, spread = 1.5) => { for (let i = 0; i < n; i++) spawnProp(scene, kind, x + (R() - 0.5) * spread * 2, z + (R() - 0.5) * spread * 2); };
  at('kiste', 14, 4, 4, 1.2); at('kiste', -18, -18, 3); at('fass', -16, 16, 3); at('ball', 4, 10, 2, 3); at('ball', -26, 31, 2, 2);
  at('melone', 12.5, 9.2, 5, 0.8); at('zwerg', -8, 18, 3, 3); at('zwerg', 18, 18, 2, 2); at('pylon', 30, -8, 5, 3); at('pylon', 2, 34, 3, 2);
  at('heu', -86, 34, 6, 5); at('kiste', -90, 46, 4, 2); at('fass', -96, 30, 3, 2); at('melone', -84, 52, 6, 3);
  at('ball', 14, 112, 2, 4); at('fass', 22, 112, 2, 2); at('kiste', 86, -74, 3, 2); at('zwerg', 96, -84, 2, 2);
  at('huhn', -82, 54, 7, 4); at('huhn', -10, 12, 3, 4); at('huhn', 22, 30, 3, 3);
  at('kuh', -90, 60, 4, 5);
  // Kegel (Dreieck) am Ende der Kegelbahn
  const z = SPOTS.zones.find(q => q.kind === 'kegel');
  if (z) {
    const c = Math.cos(z.rot), s = Math.sin(z.rot); let k = 0;
    for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) { if (k++ >= 10) break; const lx = (i - row / 2) * 0.5, lz = -row * 0.45; spawnProp(scene, 'kegel', z.x + lx * c + lz * s, z.z - lx * s + lz * c, terrainY(z.x, z.z) + 0.25); }
    const [kx, kz] = SPOTS.kegelStart; for (let i = 0; i < 2; i++) spawnProp(scene, 'kugel', kx + i * 0.7 - 0.35, kz);
  }
}
