// Fahrzeuge: arcade-artig, folgen dem Gelände, springen über Rampen, schubsen alles weg.
import * as THREE from 'three';
import { toon, outline } from './toon.js';
import { C } from './world.js';
import { groundAt, pushOut, terrainY, addBox, SEA } from './solid.js';
import { GRAV } from './props.js';
import { clamp } from './geo.js';

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function part(g, geo, col, x, y, z, o = {}) { const m = new THREE.Mesh(geo, toon(col)); m.position.set(x, y, z); if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; m.castShadow = true; g.add(m); if (o.ol !== 0) outline(m, o.ol || 0.03); return m; }

// Art: Masse, Höchstgeschwindigkeit, Beschleunigung, Lenkung, Halbmasse, Sitze, Motorton
export const VKINDS = {
  auto: { name: 'Gemeindeauto', vmax: 23, acc: 15, turn: 2.3, hx: 0.95, hz: 1.9, seats: 2, tone: 42, grip: 4.5, build: carMesh },
  traktor: { name: 'Traktor', vmax: 11, acc: 9, turn: 1.9, hx: 1.0, hz: 1.6, seats: 1, tone: 28, grip: 8, build: tractorMesh },
  bus: { name: 'Dorfbus', vmax: 17, acc: 7, turn: 1.25, hx: 1.25, hz: 4.0, seats: 3, tone: 32, grip: 6, build: busMesh },
  maeher: { name: 'Rasenmäher', vmax: 7.5, acc: 10, turn: 2.8, hx: 0.6, hz: 0.8, seats: 1, tone: 70, grip: 9, build: mowerMesh },
  kiste: { name: 'Seifenkiste', vmax: 30, acc: 0, turn: 2.0, hx: 0.6, hz: 1.0, seats: 1, tone: 0, grip: 5, build: soapMesh },
};
function wheels(g, list, r, w, col = C.tinte) { const ws = []; for (const [x, z] of list) { const p = new THREE.Group(); p.position.set(x, r, z); g.add(p); const m = part(p, new THREE.CylinderGeometry(r, r, w, 14), col, 0, 0, 0, { rz: Math.PI / 2 }); part(p, new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.02, 8), C.weiss, 0, 0, 0, { rz: Math.PI / 2, ol: 0 }); ws.push(p); } return ws; }
function lights(g, z, y, xs, col = '#FFF4C8') { for (const x of xs) part(g, new THREE.SphereGeometry(0.11, 8, 6), col, x, y, z, { ol: 0 }); }
function carMesh(g) {
  part(g, B(1.8, 0.65, 3.7), C.blau, 0, 0.75, 0);
  part(g, B(1.6, 0.6, 1.9), C.blau, 0, 1.35, -0.25);
  part(g, B(1.62, 0.45, 1.7), '#2B3A45', 0, 1.38, -0.25, { ol: 0 }).scale.set(1, 1, 1.03);
  part(g, B(1.82, 0.12, 3.72), C.weiss, 0, 0.72, 0, { ol: 0 });
  lights(g, 1.86, 0.85, [-0.6, 0.6]); lights(g, -1.86, 0.85, [-0.6, 0.6], C.rot);
  part(g, B(1.4, 0.08, 0.5), C.ocker, 0, 1.68, -0.2);
  return wheels(g, [[-0.9, 1.2], [0.9, 1.2], [-0.9, -1.2], [0.9, -1.2]], 0.36, 0.3);
}
function tractorMesh(g) {
  part(g, B(1.0, 0.8, 1.9), C.rot, 0, 1.0, 0.45);
  part(g, B(1.3, 1.3, 1.1), C.rot, 0, 1.5, -0.6);
  part(g, B(1.32, 0.8, 1.12), '#2B3A45', 0, 1.75, -0.6, { ol: 0 });
  part(g, B(1.4, 0.1, 1.3), C.weiss, 0, 2.2, -0.6);
  part(g, new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6), C.tinte, 0.3, 1.8, 1.0);
  lights(g, 1.42, 1.1, [-0.3, 0.3]);
  const w = wheels(g, [[-0.62, 0.9], [0.62, 0.9]], 0.42, 0.3);
  return w.concat(wheels(g, [[-0.85, -0.65], [0.85, -0.65]], 0.75, 0.45));
}
function busMesh(g) {
  part(g, B(2.4, 2.2, 8), C.gelb, 0, 1.6, 0);
  part(g, B(2.42, 0.7, 7.2), '#2B3A45', 0, 2.05, -0.2, { ol: 0 });
  part(g, B(2.2, 0.8, 0.05), '#2B3A45', 0, 2.0, 4.01, { ol: 0 });
  part(g, B(2.44, 0.18, 8.02), C.weiss, 0, 1.2, 0, { ol: 0 });
  part(g, B(2.3, 0.2, 7.6), C.weiss, 0, 2.75, 0);
  lights(g, 4.02, 0.95, [-0.8, 0.8]); lights(g, -4.02, 0.95, [-0.8, 0.8], C.rot);
  return wheels(g, [[-1.15, 2.6], [1.15, 2.6], [-1.15, -2.6], [1.15, -2.6]], 0.5, 0.35);
}
function mowerMesh(g) {
  part(g, B(1.1, 0.4, 1.4), C.gruen, 0, 0.45, 0);
  part(g, B(0.6, 0.15, 0.5), C.tinte, 0, 0.85, -0.25);
  part(g, B(0.6, 0.5, 0.1), C.tinte, 0, 1.05, -0.5);
  part(g, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4), C.tinte, 0, 1.0, 0.35, { rx: -0.6 });
  part(g, new THREE.TorusGeometry(0.17, 0.03, 4, 10), C.tinte, 0, 1.2, 0.5, { rx: -1.0 });
  return wheels(g, [[-0.5, 0.45], [0.5, 0.45], [-0.55, -0.45], [0.55, -0.45]], 0.24, 0.18);
}
function soapMesh(g) {
  part(g, B(1.0, 0.5, 1.8), C.holzHell, 0, 0.55, 0);
  part(g, B(1.02, 0.08, 1.82), C.rot, 0, 0.82, 0, { ol: 0 });
  part(g, new THREE.TorusGeometry(0.2, 0.04, 4, 10), C.tinte, 0, 1.0, 0.55, { rx: -1.2 });
  part(g, B(0.3, 0.5, 0.3), C.rot, 0, 0.9, 0.95);
  return wheels(g, [[-0.6, 0.7], [0.6, 0.7], [-0.6, -0.7], [0.6, -0.7]], 0.28, 0.12);
}

export const vehicles = [];
let vid = 1;
export class Vehicle {
  constructor(scene, kind, x, z, yaw) {
    const K = this.K = VKINDS[kind]; this.kind = kind; this.id = vid++;
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body); scene.add(this.root);
    this.wheels = K.build(this.body);
    this.p = new THREE.Vector3(x, terrainY(x, z) + 0.3, z); this.yaw = yaw; this.v = new THREE.Vector3(); this.speed = 0; this.vy = 0;
    this.pitch = 0; this.roll = 0; this.steer = 0; this.driver = null; this.pass = []; this.onG = true; this.air = 0; this.spin = 0;
    this.home = [x, z, yaw]; this.lastG = this.p.y; this.horn = 0; this.wet = false;
    vehicles.push(this);
  }
  seatPos(i, out) { const s = Math.sin(this.yaw), c = Math.cos(this.yaw); const lx = i === 0 ? (this.kind === 'bus' ? -0.6 : 0) : (i === 1 ? 0.5 : -0.5), lz = i === 0 ? (this.kind === 'bus' ? 3.0 : this.kind === 'traktor' ? -0.6 : this.kind === 'auto' ? -0.1 : -0.15) : (this.kind === 'bus' ? 0.5 - i * 1.4 : -0.6), ly = this.kind === 'bus' ? 1.2 : this.kind === 'traktor' ? 1.2 : this.kind === 'auto' ? 0.65 : 0.55; return out.set(this.p.x + lx * c + lz * s, this.p.y + ly, this.p.z - lx * s + lz * c); }

  // Eingaben: t (Gas -1..1), s (Lenkung -1..1), hb (Handbremse)
  step(dt, t, s, hb, hooks) {
    const K = this.K, fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    this.steer += (s - this.steer) * Math.min(1, dt * 8);
    if (this.onG) {
      if (K.acc) {
        if (t > 0) this.speed += (this.speed < 0 ? K.acc * 2 : K.acc) * t * dt;
        else if (t < 0) this.speed += (this.speed > 0 ? K.acc * 2 : K.acc * 0.6) * t * dt;
        else this.speed *= Math.max(0, 1 - 0.8 * dt);
      } else this.speed *= Math.max(0, 1 - 0.15 * dt);
      // Hangabtrieb (Seifenkiste lebt davon)
      this.speed -= Math.sin(this.pitch) * GRAV * 0.55 * dt;
      if (hb) this.speed *= Math.max(0, 1 - 1.6 * dt);
      this.speed = clamp(this.speed, -K.vmax * 0.45, K.vmax * (this.wet ? 0.3 : 1));
      const turn = this.steer * K.turn * clamp(this.speed / 5, -1, 1) * (hb ? 1.5 : 1);
      this.yaw -= turn * dt;
      // Seitenhaftung: bei Handbremse rutschen
      const grip = hb ? 1.2 : K.grip;
      const tvx = fx * this.speed, tvz = fz * this.speed;
      this.v.x += (tvx - this.v.x) * Math.min(1, grip * dt); this.v.z += (tvz - this.v.z) * Math.min(1, grip * dt);
    }
    // Bewegung
    const px = this.p.x, pz = this.p.z;
    this.p.x += this.v.x * dt; this.p.z += this.v.z * dt;
    // Kollision mit Wänden: drei Kreise entlang der Länge
    let crash = 0;
    for (const k of [-1, 0, 1]) {
      const off = k * (K.hz - K.hx) , cx = this.p.x + fx * off, cz = this.p.z + fz * off;
      const q = { x: cx, y: this.p.y, z: cz };
      const h = pushOut(q, K.hx, this.p.y + 0.3, 0.6);
      if (h) { this.p.x += q.x - cx; this.p.z += q.z - cz; const vn = this.v.x * h.nx + this.v.z * h.nz; if (vn < 0) { crash = Math.max(crash, -vn); this.v.x -= 1.3 * vn * h.nx; this.v.z -= 1.3 * vn * h.nz; } }
    }
    if (crash > 2) { this.speed = (this.v.x * fx + this.v.z * fz) * 0.6; hooks.crash(this, crash); }
    // Gelände an vier Ecken
    const sx = Math.cos(this.yaw), sz = -Math.sin(this.yaw);
    const hgt = (lx, lz) => groundAt(this.p.x + sx * lx + fx * lz, this.p.y + 0.9, this.p.z + sz * lx + fz * lz, 0.9)[0];
    const fl = hgt(-K.hx, K.hz * 0.85), fr = hgt(K.hx, K.hz * 0.85), bl = hgt(-K.hx, -K.hz * 0.85), br = hgt(K.hx, -K.hz * 0.85);
    const g = Math.max((fl + fr + bl + br) / 4, (fl + fr) / 2 - 0.3, (bl + br) / 2 - 0.3);
    const tp = Math.atan2((fl + fr) / 2 - (bl + br) / 2, K.hz * 1.7), tr = Math.atan2((fl + bl) / 2 - (fr + br) / 2, K.hx * 2);
    if (this.onG) {
      if (g < this.p.y - 0.12 && this.vy > 1.0) { this.onG = false; } // abheben (Rampe)
      else if (g < this.p.y - 0.5) { this.onG = false; this.vy = Math.min(this.vy, 0); }
      else { const nvy = (g - this.p.y) / Math.max(dt, 1e-3); this.vy = this.vy * 0.5 + nvy * 0.5; this.p.y = g; }
    }
    if (!this.onG) {
      this.vy -= GRAV * dt; this.p.y += this.vy * dt; this.air += dt;
      this.pitch += (-0.08 - this.pitch) * dt * 0.8; this.spin *= 0.98;
      if (this.p.y <= g) { const imp = -this.vy; this.p.y = g; this.onG = true; this.vy = 0; hooks.land(this, imp, this.air); this.air = 0; }
    } else { this.pitch += (tp - this.pitch) * Math.min(1, dt * 10); this.roll += (tr - this.roll) * Math.min(1, dt * 10); }
    // Wasser
    if (this.p.y < SEA - 0.5) { if (!this.wet) hooks.splash(this); this.wet = true; this.p.y = SEA - 0.5; this.onG = true; this.vy = 0; this.speed *= 0.97; } else if (this.p.y > SEA) this.wet = false;
    if (this.p.y < -20) this.reset();
    // Räder drehen
    this.spinA = (this.spinA || 0) + this.speed * dt / 0.4;
  }
  reset() { const [x, z, y] = this.home; this.p.set(x, terrainY(x, z) + 0.3, z); this.yaw = y; this.v.set(0, 0, 0); this.speed = 0; this.vy = 0; this.onG = true; }
  draw(dt) {
    if (this.net) { this.p.lerp(this.net.p, Math.min(1, dt * 12)); let d = this.net.yaw - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 12); this.pitch += (this.net.pitch - this.pitch) * Math.min(1, dt * 12); this.roll += (this.net.roll - this.roll) * Math.min(1, dt * 12); this.speed = this.net.speed; }
    this.root.position.copy(this.p); this.root.rotation.set(0, this.yaw, 0);
    this.body.rotation.set(-this.pitch, 0, this.roll);
    if (this.horn > 0) { this.horn -= dt; this.body.scale.set(1 + this.horn * 0.15, 1 - this.horn * 0.1, 1 + this.horn * 0.15); } else this.body.scale.set(1, 1, 1);
    const a = this.spinA || (this.spinA = 0);
    this.wheels.forEach((w, i) => { w.rotation.x = a; if (i < 2 && this.kind !== 'bus' || (this.kind === 'bus' && i < 2)) w.rotation.y = -this.steer * 0.45; });
  }
}

// Holzrampen für Sprünge
export function buildRamps(scene) {
  const g = new THREE.Group();
  const list = [[0, 64, 0.1, 2.2], [70, 10, -1.35, 1.8], [-60, 6, 1.6, 2.4], [52, 90, -2.3, 2.0], [-15, -48, 0.7, 2.6], [38, -36, -2.4, 3.0]];
  for (const [x, z, rot, h] of list) {
    const y = terrainY(x, z), L = 5.5, W = 3.2;
    const shape = new THREE.Shape(); shape.moveTo(-L / 2, 0); shape.lineTo(L / 2, 0); shape.lineTo(L / 2, h); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false }); geo.translate(0, 0, -W / 2); geo.rotateY(-Math.PI / 2);
    const m = new THREE.Mesh(geo, toon(C.holzHell)); m.position.set(x, y - 0.05, z); m.rotation.y = rot; m.castShadow = m.receiveShadow = true; outline(m, 0.04); g.add(m);
    for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(B(W + 0.02, 0.03, 0.12), toon(C.holz)); const t = (k + 0.5) / 6; s.position.set(0, h * t + 0.02, -L / 2 + L * t); s.rotation.x = -Math.atan2(h, L); const w = new THREE.Group(); w.position.copy(m.position); w.rotation.y = rot; w.add(s); g.add(w); }
    addBox({ x, z, rot, hx: W / 2, hz: L / 2, y0: y - 0.05, y1: y + h, rise: 1 });
    // Stirnseite: Wand hinter der Rampe
    addBox({ x: x + Math.sin(rot) * (L / 2 - 0.1), z: z + Math.cos(rot) * (L / 2 - 0.1), rot, hx: W / 2, hz: 0.1, y0: y - 1, y1: y + h - 0.2 });
  }
  scene.add(g); return g;
}
