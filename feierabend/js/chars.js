// Figuren: Spieler (eigene), entfernte Spieler, Dorfleute. Laufen, stolpern, fliegen, tragen.
import * as THREE from 'three';
import { Beamtli } from './beamtli.js';
import { groundAt, pushOut, ceilingAt, SEA } from './solid.js';
import { GRAV } from './props.js';
import { clamp } from './geo.js';

export const RAD = 0.38;
export const chars = [];

export class Char {
  constructor(scene, color, opts = {}) {
    this.b = new Beamtli(color, opts); scene.add(this.b.root);
    this.id = opts.id; this.kind = opts.kind || 'player'; this.name = opts.name || '';
    this.p = new THREE.Vector3(); this.v = new THREE.Vector3(); this.yaw = 0;
    this.grounded = true; this.tripCd = 0; this.fly = 0; this.down = 0; this.held = null; this.heldBy = null; this.air = 0; this.maxAir = 0;
    this.wet = false; this.inVeh = null; this.seat = 0; this.pending = null;
    this.ai = { tx: 0, tz: 0, wait: 0, talk: 0 };
    chars.push(this);
  }
  place(x, y, z) { this.p.set(x, y, z); this.v.set(0, 0, 0); }
  get busy() { return this.down > 0 || this.fly > 0 || !!this.heldBy; }

  // Umhauen: Geschwindigkeit setzen, Figur fliegt und kippt
  fling(vx, vy, vz) {
    if (this.inVeh) return;
    this.v.set(vx, vy, vz); this.fly = 0.35; this.grounded = false; this.down = 1.9; this.b.tumble();
    if (this.held) this.dropHeld && this.dropHeld();
  }
  stumble(hooks) { if (this.down > 0) return; this.down = 1.75; this.b.tumble(); hooks && hooks.tumble(this); }

  // wish: gewünschte Geschwindigkeit (x,z), jump: Sprung, sprint
  step(dt, wish, jump, hooks) {
    const b = this.b;
    this.tripCd = Math.max(0, this.tripCd - dt);
    if (this.heldBy) return;
    if (this.inVeh) return;
    const ctrl = this.down <= 0 && this.fly <= 0;
    if (this.down > 0) this.down -= dt;
    // Steuerung
    const acc = this.grounded ? (ctrl ? 34 : 6) : (ctrl ? 7 : 0.5);
    if (ctrl || !this.grounded) {
      const tx = ctrl ? wish.x : this.v.x * 0.98, tz = ctrl ? wish.z : this.v.z * 0.98;
      this.v.x += clamp(tx - this.v.x, -acc * dt, acc * dt); this.v.z += clamp(tz - this.v.z, -acc * dt, acc * dt);
    }
    if (!ctrl && this.grounded) { this.v.x *= Math.max(0, 1 - 5 * dt); this.v.z *= Math.max(0, 1 - 5 * dt); }
    if (jump && ctrl && this.grounded) { this.v.y = 7.6; this.grounded = false; b.jumped(); hooks.jump(this); }
    this.v.y -= GRAV * dt;
    const prevY = this.p.y;
    this.p.addScaledVector(this.v, dt);
    // Wasser: schwimmen
    const depth = SEA - this.p.y;
    if (depth > 0.2) {
      if (!this.wet && this.v.y < -2) hooks.splash(this);
      this.wet = true; this.v.y += (GRAV + 6 * depth) * dt; this.v.multiplyScalar(1 - 2.5 * dt);
      if (this.p.y < SEA - 1.0) this.p.y = SEA - 1.0;
      if (jump && ctrl && depth < 1.2) this.v.y = 5;
    } else if (depth < -0.3) this.wet = false;
    // Decke
    const ceil = ceilingAt(this.p.x, this.p.y + 1.25, this.p.z); if (ceil < Infinity && this.v.y > 0) { this.p.y = ceil - 1.3; this.v.y = 0; }
    // Boden
    const [gy, o] = groundAt(this.p.x, Math.max(this.p.y, prevY), this.p.z, 0.45);
    const wasG = this.grounded;
    if (this.p.y <= gy + (wasG && this.v.y <= 0.5 ? 0.25 : 0)) {
      const impact = -this.v.y;
      const stepUp = gy - prevY;
      this.p.y = gy;
      if (o && o.bouncy && impact > 1.5) { this.v.y = Math.max(o.bouncy, impact * 0.92); this.grounded = false; b.jumped(); hooks.boing(this, o); }
      else {
        if (this.v.y < 0) this.v.y = 0;
        this.grounded = true;
        if (!wasG) {
          b.landed(impact * 0.35);
          if (this.fly > 0) { this.fly = 0; this.down = Math.max(this.down, 1.3); b.downT = Math.min(b.downT, 0.5); hooks.thud(this, impact); }
          else if (impact > 13 || this.air > 1.3 && impact > 9) this.stumble(hooks);
          else if (impact > 3) hooks.land(this);
        }
        // Stolpern über Schwellen, Randsteine, Stufen
        const hs = Math.hypot(this.v.x, this.v.z);
        if (wasG && stepUp > 0.07 && o && o.trip && hs > 3.0 && this.tripCd <= 0 && this.down <= 0) { this.tripCd = 2.5; if (Math.random() < 0.6) { this.stumble(hooks); this.v.x *= 1.15; this.v.z *= 1.15; } }
      }
    } else this.grounded = false;
    if (this.fly > 0) { this.fly = Math.max(0.01, this.fly); b.downT = clamp(b.downT, 0.32, 0.6); if (this.grounded) this.fly = 0; }
    // Wände
    const hit = pushOut(this.p, RAD, this.p.y, 0.45);
    // in vollem Lauf gegen eine niedrige Kante (Brunnenrand, Zaun, Bank): drüberfallen
    if (hit && hit.o.trip && this.fly <= 0 && this.down <= 0 && this.tripCd <= 0 && Math.hypot(this.v.x, this.v.z) > 3.5 && hit.o.y1 - this.p.y < 1.1) {
      this.tripCd = 2.5; if (Math.random() < 0.6) { const sp = Math.hypot(this.v.x, this.v.z); this.v.x = -hit.nx * sp * 0.9; this.v.z = -hit.nz * sp * 0.9; this.v.y = 5.5; this.p.y += 0.5; this.fly = 0.3; this.down = 1.9; this.grounded = false; b.tumble(); hooks.tumble(this); }
    }
    if (hit && this.fly > 0 && Math.hypot(this.v.x, this.v.z) > 6) { const vn = this.v.x * hit.nx + this.v.z * hit.nz; this.v.x -= 1.4 * vn * hit.nx; this.v.z -= 1.4 * vn * hit.nz; hooks.thud(this, 6); }
    this.air = this.grounded ? 0 : this.air + dt;
    if (this.p.y < -25) hooks.fellOff(this);
  }

  // Blickrichtung und Animation
  animate(dt, vel, grounded, yawTarget) {
    const b = this.b;
    if (yawTarget !== undefined && this.down <= 0) { let d = yawTarget - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 12); }
    b.yaw = this.yaw;
    b.root.position.copy(this.p);
    if (this.wet && !this.inVeh) b.root.position.y += Math.sin(b.t * 3) * 0.05;
    b.air = !grounded;
    b.update(dt, vel, grounded);
    if (this.heldBy) b.downT = clamp(b.downT, 0.35, 0.7);
    if (this.held && this.down <= 0) { const big = this.heldBig; for (let i = 0; i < 2; i++) { b.arms[i].rotation.x = big ? -2.9 : -1.45; b.arms[i].rotation.z = (i ? 1 : -1) * (big ? 0.25 : 0.35); } }
    if (this.waveT > 0) { this.waveT -= dt; b.arms[1].rotation.x = -2.8; b.arms[1].rotation.z = 0.5 + Math.sin(this.waveT * 18) * 0.5; }
    if (this.inVeh) { b.legs[0].rotation.x = b.legs[1].rotation.x = -1.4; }
  }
  // Hand-Position zum Tragen (vor der Brust oder über dem Kopf)
  hand(big, out) {
    const f = big ? 0.15 : 0.62, s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    return out.set(this.p.x + s * f, this.p.y + (big ? 2.0 : 1.05), this.p.z + c * f);
  }
  dispose() { this.b.dispose(); const i = chars.indexOf(this); if (i >= 0) chars.splice(i, 1); }
}
