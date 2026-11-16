// Das «Beamtli»: eigene Spielfigur von Duchy Games.
// Bohnenkörper aus einem Stück, Amtsmütze mit Schirm und goldenem Abzeichen,
// zwei Punktaugen, kein Mund, schmale Krawatte, Stummelarme und -beine.
// Die ganze Bewegung ist prozedural: Federn für Rumpf, Mütze und Arme, Watscheln beim Gehen.
import * as THREE from 'three';
import { PAL } from './palette.js';
import { toon, outline, inkFlat } from './toon.js';

const G = {
  body: new THREE.CapsuleGeometry(0.34, 0.42, 6, 14),
  arm: new THREE.CapsuleGeometry(0.075, 0.16, 4, 8),
  leg: new THREE.CapsuleGeometry(0.09, 0.07, 4, 8),
  eye: new THREE.SphereGeometry(0.042, 8, 6),
  crown: new THREE.CylinderGeometry(0.31, 0.27, 0.17, 18),
  brim: new THREE.CylinderGeometry(0.21, 0.21, 0.035, 16, 1, false, -Math.PI / 2, Math.PI),
  badge: new THREE.BoxGeometry(0.08, 0.065, 0.025),
  band: new THREE.CylinderGeometry(0.275, 0.275, 0.035, 18),
  tie: new THREE.BoxGeometry(0.055, 0.25, 0.03),
  knot: new THREE.BoxGeometry(0.075, 0.05, 0.035),
};
G.body.scale(1, 1, 0.9);

// gedämpfte Feder
class Spring {
  constructor(k = 90, c = 9) { this.k = k; this.c = c; this.x = 0; this.v = 0; this.t = 0; }
  step(dt) { this.v += (this.k * (this.t - this.x) - this.c * this.v) * dt; this.x += this.v * dt; return this.x; }
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Beamtli {
  constructor(color = PAL.rot, opts = {}) {
    this.color = color;
    const root = this.root = new THREE.Group();
    const body = toon(color);
    const hips = this.hips = new THREE.Group(); root.add(hips);
    const torso = this.torso = new THREE.Group(); torso.position.y = 0.2; hips.add(torso);

    const bm = new THREE.Mesh(G.body, body); bm.position.y = 0.67 - 0.2; bm.castShadow = true; torso.add(bm);
    outline(bm, 0.03);
    this.bodyMesh = bm;

    // Augen
    for (const s of [-1, 1]) { const e = new THREE.Mesh(G.eye, inkFlat); e.position.set(0.1 * s, 0.93 - 0.2, 0.29); e.scale.set(1, 1.25, 0.6); torso.add(e); }
    const cap = this.cap = new THREE.Group(); cap.position.set(0, 1.1 - 0.2, 0); torso.add(cap);
    if (opts.villager) this.hat(opts.hat, opts.hatColor);
    else {
    // Krawatte
    const tie = new THREE.Mesh(G.tie, toon(PAL.tinte)); tie.position.set(0, 0.6 - 0.2, 0.305); tie.rotation.x = -0.08; torso.add(tie);
    const knot = new THREE.Mesh(G.knot, toon(PAL.tinte)); knot.position.set(0, 0.75 - 0.2, 0.296); torso.add(knot);
    // Amtsmütze (eigene Feder zum Nicken)
    const ink = toon(PAL.tinte);
    const crown = new THREE.Mesh(G.crown, ink); crown.position.y = 0.1; crown.castShadow = true; cap.add(crown);
    const band = new THREE.Mesh(G.band, toon(PAL.tinte)); band.position.y = 0.035; cap.add(band);
    const brim = new THREE.Mesh(G.brim, ink); brim.position.set(0, 0.03, 0.2); brim.scale.set(0.95, 1, 0.62); brim.rotation.x = 0.14; cap.add(brim);
    const badge = new THREE.Mesh(G.badge, toon(PAL.ocker)); badge.position.set(0, 0.11, 0.285); badge.rotation.x = -0.12; cap.add(badge);
    cap.rotation.x = -0.06;
    }

    // Arme (Stummel), Gelenk an der Schulter
    this.arms = [-1, 1].map(s => {
      const p = new THREE.Group(); p.position.set(0.33 * s, 0.76 - 0.2, 0.02); torso.add(p);
      const m = new THREE.Mesh(G.arm, body); m.position.y = -0.13; m.castShadow = true; p.add(m); outline(m, 0.02);
      p.rotation.z = 0.25 * s;
      return p;
    });
    // Beine (Stummel)
    this.legs = [-1, 1].map(s => {
      const p = new THREE.Group(); p.position.set(0.13 * s, 0.25, 0); hips.add(p);
      const m = new THREE.Mesh(G.leg, body); m.position.y = -0.125; m.castShadow = true; p.add(m); outline(m, 0.02);
      return p;
    });

    // Handy (nur Dorfleute zücken es)
    if (opts.villager) {
      const ph = this.phone = new THREE.Group(); ph.position.set(0, -0.27, 0.06); this.arms[1].add(ph);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.025), toon(PAL.tinte)); ph.add(body);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.13), new THREE.MeshBasicMaterial({ color: PAL.lampe })); scr.position.z = -0.014; scr.rotation.y = Math.PI; ph.add(scr);
      ph.visible = false;
    }
    this.phoneUp = 0; this.lookUp = 0; this.flashT = 0;

    // Zustand der Animation
    this.yaw = 0;
    this.phase = Math.random() * 6;
    this.pitch = new Spring(110, 10);
    this.roll = new Spring(110, 10);
    this.nod = new Spring(160, 7);
    this.squash = new Spring(220, 11); this.squash.x = this.squash.t = 0;
    this.armS = [new Spring(140, 9), new Spring(140, 9)];
    this.armZ = [new Spring(120, 10), new Spring(120, 10)];
    this.prevV = new THREE.Vector3();
    this.walkAmt = 0;
    this.downT = -1; this.downDir = 1; this.downSide = 0;
    this.t = 0;
    this.air = false;
  }

  get down() { return this.downT >= 0; }

  // Kopfbedeckungen der Dorfleute
  hat(kind = 'filz', col = PAL.chalet) {
    const m = toon(col), c = this.cap;
    if (kind === 'filz') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 16), m); brim.position.y = 0.06; brim.castShadow = true; c.add(brim);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.2, 12), m); top.position.y = 0.17; top.castShadow = true; c.add(top);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.04, 12), toon(PAL.tinte)); band.position.y = 0.1; c.add(band);
    } else if (kind === 'tuch') {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m); t.position.y = -0.05; t.scale.set(1.08, 0.75, 1.08); c.add(t);
      const k = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 6), m); k.position.set(0, -0.08, -0.3); k.rotation.x = -2.2; c.add(k);
    } else if (kind === 'zipfel') {
      const z = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.42, 10), m); z.position.y = 0.18; z.rotation.z = 0.25; z.castShadow = true; c.add(z);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), toon(PAL.schnee)); b.position.set(-0.1, 0.38, 0); c.add(b);
    }
  }

  // Umkippen (z. B. Stolpern über eine Kante oder harte Landung)
  tumble() {
    if (this.down) return;
    this.downT = 0; this.downDir = 1; this.downSide = (Math.random() - 0.5) * 0.8;
    this.squash.v -= 3;
  }
  jumped() { this.squash.v += 4; this.nod.v -= 4; }
  landed(impact) { this.squash.v -= Math.min(7, impact * 1.1); this.nod.v += impact * 1.4; }

  // vel: Geschwindigkeit in Weltkoordinaten, grounded: steht auf dem Boden
  update(dt, vel, grounded) {
    this.t += dt;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const ax = (vel.x - this.prevV.x) / Math.max(dt, 1e-3), az = (vel.z - this.prevV.z) / Math.max(dt, 1e-3);
    this.prevV.copy(vel);
    const fwdAcc = clamp(ax * sy + az * cy, -40, 40), sideAcc = clamp(ax * cy - az * sy, -40, 40);
    const speed = Math.hypot(vel.x, vel.z);
    const fwdSpeed = vel.x * sy + vel.z * cy;

    this.walkAmt += ((grounded && !this.down ? clamp(speed / 3.2, 0, 1) : 0) - this.walkAmt) * Math.min(1, dt * 10);
    const w = this.walkAmt;
    this.phase += dt * (3 + speed * 2.6) * (w > 0.02 ? 1 : 0.3);
    const s = Math.sin(this.phase), c = Math.cos(this.phase);

    // Rumpf: lehnt in die Bewegung, schwingt beim Beschleunigen und Stoppen nach
    this.pitch.t = clamp(fwdSpeed * 0.045 - fwdAcc * 0.022, -0.45, 0.6);
    this.roll.t = clamp(sideAcc * 0.018, -0.4, 0.4);
    let pitch = this.pitch.step(dt), roll = this.roll.step(dt);

    // Watscheln
    let hipRoll = s * 0.14 * w, hipY = Math.abs(c) * 0.065 * w;
    // Atmen im Stand
    const breathe = Math.sin(this.t * 2.1) * 0.012 * (1 - w);

    // Arme pendeln gegengleich, mit Feder hinterher
    this.armS[0].t = s * 0.95 * w; this.armS[1].t = -s * 0.95 * w;
    const up = this.air && !this.down ? 1.1 : 0;
    this.armZ[0].t = -(0.25 + up + w * 0.1); this.armZ[1].t = 0.25 + up + w * 0.1;
    // Beine
    let legA = s * 0.75 * w;
    if (this.air) legA = 0.35;

    // Umkippen: nach vorne aufs Gesicht, liegen bleiben, wieder aufstehen
    let lift = 0;
    if (this.down) {
      this.downT += dt;
      const d = this.downT;
      let k;
      if (d < 0.32) k = (d / 0.32) ** 2;            // fallen
      else if (d < 1.15) k = 1 + Math.sin(d * 18) * 0.02 * Math.max(0, 0.7 - d); // liegen
      else if (d < 1.7) k = 1 - (d - 1.15) / 0.55;  // aufstehen
      else { k = 0; this.downT = -1; this.pitch.v -= 4; this.squash.v += 3; }
      pitch = pitch * (1 - k) + 1.42 * k; roll = roll * (1 - k) + this.downSide * k;
      this.pitch.x = pitch; this.roll.x = roll;
      lift = 0.16 * k; hipRoll *= 1 - k; hipY = 0;
      this.armZ[0].t = -1.3 * k - 0.25; this.armZ[1].t = 1.3 * k + 0.25;
      legA = -0.5 * k + Math.sin(this.t * 14) * 0.3 * (d > 0.4 && d < 1.0 ? 1 : 0);
    }

    // Mütze nickt nach
    this.nod.t = -0.06 - this.pitch.v * 0.03 - hipY * 1.5;
    const nod = this.nod.step(dt);
    const sq = this.squash.step(dt);

    this.root.rotation.y = this.yaw;
    this.hips.position.y = hipY + lift;
    this.hips.rotation.z = hipRoll;
    this.torso.rotation.set(pitch, 0, roll);
    this.torso.scale.set(1 - sq * 0.5, 1 + sq + breathe, 1 - sq * 0.5);
    this.cap.rotation.x = clamp(nod, -0.5, 0.4);
    if (this.phoneUp > 0.01) { const k = this.phoneUp; this.armS[1].t = this.armS[1].t * (1 - k) - 2.5 * k; this.armZ[1].t = this.armZ[1].t * (1 - k) + 0.15 * k; }
    for (let i = 0; i < 2; i++) {
      this.arms[i].rotation.x = this.armS[i].step(dt);
      this.arms[i].rotation.z = this.armZ[i].step(dt);
    }
    if (this.phone) {
      this.phone.visible = this.phoneUp > 0.3;
      if (this.flashT > 0) { this.flashT -= dt; this.phone.children[1].material.color.set(this.flashT > 0.06 ? PAL.schnee : PAL.lampe); }
    }
    if (this.lookUp) this.torso.rotation.x -= this.lookUp * 0.35;
    this.legs[0].rotation.x = legA; this.legs[1].rotation.x = this.air ? legA * 0.6 : -legA;
  }

  dispose() { this.root.removeFromParent(); }
}
