// 3D-Welt: Amtshaus von Wolkenwil, Dachplattform, Dorfplatz.
// Alles aus Grundformen, leicht unregelmässig, damit es handgemacht wirkt.
import { buildLandscape } from './terrain.js';
import * as THREE from 'three';
import { PAL, rng } from './palette.js';
import { toon, outline, inkFlat } from './toon.js';
import { Beamtli } from './beamtli.js';

// ---------------- Masse ----------------
export const ROOM = { x0: -6, x1: 6, z0: -4.5, z1: 4.5, h: 3.2, roof: 3.4, wall: 0.3 };
const DOOR = { x0: -0.85, x1: 0.85, h: 2.35 };
const STAIR = { x0: 4.55, x1: 5.85, zBottom: 3.0, steps: 14, rise: ROOM.roof / 14, run: 0.42 };
const HOLE = { x0: 4.45, x1: 5.85, z0: -3.25, z1: 0.6 };
const PLAYER = { r: 0.34, h: 1.28, step: 0.38, speed: 3.7, accel: 24, air: 7, jump: 5.7, grav: 16 };

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;

    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(PAL.himmel);

    this.camera = new THREE.PerspectiveCamera(42, 1.5, 0.1, 2600);
    this.camera.position.set(0, 6, 12);

    // Licht: eine warme Hauptlichtquelle (mit Schatten), ein kühles Umgebungslicht
    this.amb = new THREE.HemisphereLight(PAL.himmel, PAL.matte, 1.15);
    scene.add(this.amb);
    const sun = this.sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
    sun.position.set(7, 16, 11);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60;
    sun.shadow.bias = -0.0012; sun.shadow.normalBias = 0.06; sun.shadow.radius = 3;
    scene.add(sun); scene.add(sun.target);

    this.colliders = [];
    this.interactables = [];
    this.groups = { cutaway: new THREE.Group(), roof: new THREE.Group(), n: new THREE.Group(), w: new THREE.Group(), e: new THREE.Group() };
    scene.add(this.groups.cutaway, this.groups.roof, this.groups.n, this.groups.w, this.groups.e);
    this.r = rng(1931);
    this.t = 0;
    this.camYaw = 0.28; this.camYawT = 0.28;
    this.camMode = 'follow';
    this.camAnim = null;
    this.keys = new Set();
    this.joy = { x: 0, y: 0 };
    this.enabled = true;
    this.inside = true;
    this.onUse = null;
    this.remotes = new Map();

    this.build();
    this.player = this.makePlayer(PAL.rot);
    this.player.pos.set(-1.5, 0, 1.5);
    this.player.b.yaw = Math.PI;
    this.syncSky();
    this.input();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  // ---------------- Bauhilfen ----------------
  jit(a) { return (this.r() - 0.5) * 2 * a; }
  box(w, h, d, color, x, y, z, o = {}) {
    const mat = Array.isArray(color) ? color.map(c => toon(c)) : toon(color);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    if (o.rot) m.rotation.y = o.rot;
    if (o.tilt) m.rotation.z = o.tilt;
    m.castShadow = o.cast !== false; m.receiveShadow = true;
    (o.parent || this.scene).add(m);
    if (o.collide !== false && o.collide !== undefined || o.solid) this.addCollider(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, o.trip);
    if (o.line) outline(m, o.line);
    return m;
  }
  cyl(rt, rb, h, color, x, y, z, o = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 12), toon(color));
    m.position.set(x, y + h / 2, z);
    m.castShadow = o.cast !== false; m.receiveShadow = true;
    (o.parent || this.scene).add(m);
    if (o.solid) { const r = Math.max(rt, rb); this.addCollider(x - r, y, z - r, x + r, y + h, z + r, o.trip); }
    return m;
  }
  addCollider(x0, y0, z0, x1, y1, z1, trip) { const c = { min: new THREE.Vector3(x0, y0, z0), max: new THREE.Vector3(x1, y1, z1), trip: !!trip }; this.colliders.push(c); return c; }
  // Satteldach als dreiseitiges Prisma
  // Ein Haus im Dorfstil (zufällig, ausser was o vorgibt). Wird später von village.js ausgeschmückt.
  addHouse(x, z, rot, o = {}) {
    const r = this.r;
      const w = o.w ?? 3.4 + r() * 1.8, d = o.d ?? 3 + r() * 1.4, h = o.h ?? 2.6 + r() * 1.6;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot + this.jit(0.08); this.scene.add(g);
    const wood = o.wood ?? r() < 0.55;
    this.box(w, h, d, o.wall ?? (wood ? PAL.chalet : PAL.schnee), 0, 0, 0, { parent: g, line: 0 });
    if (!wood) this.box(w + 0.04, 0.9, d + 0.04, PAL.chalet, 0, h - 0.9, 0, { parent: g });
    const roofC = o.roofCol ?? (r() < 0.25 ? PAL.rot : PAL.chalet);
    const rh = 1.3 + r() * 0.8;
    const rf = this.gable(w + 0.9, rh, d + 0.7, roofC === PAL.chalet && wood ? PAL.tinte : roofC, 0, h, 0, 0, g);
    rf.rotation.z = this.jit(0.02);
    // Fenster: verschieden gross, mit Läden in Matte
    const nw = Math.max(1, Math.floor(w / 1.3));
    for (let k = 0; k < nw; k++) {
      const fx = -w / 2 + (k + 0.5) * w / nw + this.jit(0.12), fy = 1.1 + r() * 0.5, fw = 0.45 + r() * 0.25;
      this.box(fw, 0.6 + r() * 0.2, 0.05, PAL.tinte, fx, fy, d / 2 + 0.02, { parent: g, cast: false });
      if (r() < 0.7) for (const s of [-1, 1]) this.box(0.18, 0.66, 0.04, PAL.matte, fx + s * (fw / 2 + 0.11), fy - 0.03, d / 2 + 0.03, { parent: g, cast: false });
      if (h > 3.3 && r() < 0.8) this.box(fw * 0.8, 0.5, 0.05, PAL.tinte, fx, h - 0.75, d / 2 + 0.02, { parent: g, cast: false });
    }
    // Tür
    let doorX = null; if (o.door !== false && (o.door || r() < 0.8)) { doorX = o.door ? 0 : w * (r() - 0.5) * 0.5; this.box(0.75, 1.55, 0.06, PAL.tinte, doorX, 0, d / 2 + 0.02, { parent: g, cast: false }); }
    // Kollision als achsenparallele Box (grob)
    const c = Math.abs(Math.cos(g.rotation.y)), s = Math.abs(Math.sin(g.rotation.y));
    const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
    this.addCollider(x - hw, 0, z - hd, x + hw, h + 1.5, z + hd);
    g.userData = { w, d, h, wood, roofH: rh, roofCol: roofC, doorX, ...(o.data || {}) }; this.houses.push(g); return g;
  }
  gable(w, h, d, color, x, y, z, rot = 0, parent) {
    const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, h); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }); geo.translate(0, 0, -d / 2);
    const m = new THREE.Mesh(geo, toon(color)); m.position.set(x, y, z); m.rotation.y = rot;
    m.castShadow = true; m.receiveShadow = true; (parent || this.scene).add(m); return m;
  }

  // ---------------- Welt bauen ----------------
  build() {
    const R = ROOM, T = R.wall;
    // Wiese rundherum
    // (Gelände kommt aus terrain.js, siehe buildMountains)

    // ---------- Amtshaus: Boden ----------
    // Holzdielen in Streifen, leicht unterschiedlich lang
    const floor = new THREE.Group(); this.scene.add(floor);
    for (let i = 0, x = R.x0; x < R.x1 - 0.01; i++) {
      const w = Math.min(0.42 + this.jit(0.04), R.x1 - x);
      const b = this.box(w - 0.012, 0.04, R.z1 - R.z0, PAL.nuss, x + w / 2, 0, 0, { parent: floor, cast: false });
      b.position.y = 0.02 + (i % 3) * 0.002;
      x += w;
    }
    // Fugen
    this.box(R.x1 - R.x0, 0.035, R.z1 - R.z0, PAL.tinte, 0, 0, 0, { parent: floor, cast: false });
    // grüner Linoleum-Läufer von der Tür zum Pult
    this.box(1.5, 0.012, 7.4, PAL.lino, -0.15, 0.04, 0.6, { parent: floor, cast: false, rot: 0.012 });

    // ---------- Wände ----------
    // Aussen Schnee-weiss verputzt, innen papierhell mit Holztäfer unten
    const wallMat = side => { // [px, nx, py, ny, pz, nz]
      const out = PAL.schnee, inn = PAL.papier;
      return { n: [out, out, out, out, out, inn], s: [out, out, out, out, inn, out], w: [inn, out, out, out, out, out], e: [out, inn, out, out, out, out] }[side];
    };
    const W = R.x1 - R.x0 + T * 2;
    // Nordwand mit Fenster (Brüstung, Sturz, zwei Seitenteile)
    const win = { x0: -3.9, x1: -1.5, y0: 1.0, y1: 2.45 };
    this.wallPart(R.x0 - T, win.x0, 0, R.h, 'n', wallMat('n'));
    this.wallPart(win.x1, R.x1 + T, 0, R.h, 'n', wallMat('n'));
    this.wallPart(win.x0, win.x1, 0, win.y0, 'n', wallMat('n'));
    this.wallPart(win.x0, win.x1, win.y1, R.h, 'n', wallMat('n'));
    this.win = win;
    // Westwand / Ostwand
    this.box(T, R.h, R.z1 - R.z0 + T * 2, wallMat('w'), R.x0 - T / 2, 0, 0, { solid: true, parent: this.groups.w });
    this.box(T, R.h, R.z1 - R.z0 + T * 2, wallMat('e'), R.x1 + T / 2, 0, 0, { solid: true, parent: this.groups.e });
    // Südwand mit Tür (wird von innen weggeblendet, nur der Sockel bleibt)
    const sw = this.groups.cutaway;
    const sl = (DOOR.x0 - (R.x0 - T)), sr = (R.x1 + T - DOOR.x1);
    this.box(sl, R.h, T, wallMat('s'), R.x0 - T + sl / 2, 0, R.z1 + T / 2, { parent: sw });
    this.box(sr, R.h, T, wallMat('s'), DOOR.x1 + sr / 2, 0, R.z1 + T / 2, { parent: sw });
    this.box(DOOR.x1 - DOOR.x0, R.h - DOOR.h, T, wallMat('s'), 0, DOOR.h, R.z1 + T / 2, { parent: sw });
    this.addCollider(R.x0 - T, 0, R.z1, DOOR.x0, R.h, R.z1 + T);
    this.addCollider(DOOR.x1, 0, R.z1, R.x1 + T, R.h, R.z1 + T);
    // Sockel bleibt immer sichtbar, damit man die Kante sieht
    this.sockel = new THREE.Group(); this.scene.add(this.sockel);
    this.box(sl, 0.32, T + 0.03, PAL.nuss, R.x0 - T + sl / 2, 0, R.z1 + T / 2, { parent: this.sockel });
    this.box(sr, 0.32, T + 0.03, PAL.nuss, DOOR.x1 + sr / 2, 0, R.z1 + T / 2, { parent: this.sockel });
    // Türschwelle: kleine Kante zum Stolpern
    this.box(DOOR.x1 - DOOR.x0, 0.13, T + 0.1, PAL.nuss, 0, 0, R.z1 + T / 2, { solid: true, trip: true });
    // offene Tür
    const leaf = this.box(0.07, DOOR.h - 0.05, 1.6, PAL.nuss, 0, 0, 0, { parent: sw, cast: true });
    leaf.position.set(DOOR.x0 + 0.04, (DOOR.h - 0.05) / 2, R.z1 + T + 0.78); leaf.rotation.y = 0.12;
    this.box(0.05, 0.05, 0.12, PAL.ocker, 0, 0, 0, { parent: leaf }).position.set(0.06, 0, 0.62);

    // Holztäfer innen (unten), Leiste in Tinte
    const tH = 1.05;
    const G = this.groups;
    this.box(R.x1 - R.x0, tH, 0.05, PAL.nuss, 0, 0, R.z0 + 0.025, { cast: false, parent: G.n });
    this.box(0.05, tH, R.z1 - R.z0, PAL.nuss, R.x0 + 0.025, 0, 0, { cast: false, parent: G.w });
    this.box(0.05, tH, R.z1 - R.z0, PAL.nuss, R.x1 - 0.025, 0, 0, { cast: false, parent: G.e });
    this.box(R.x1 - R.x0, 0.05, 0.07, PAL.tinte, 0, tH, R.z0 + 0.035, { cast: false, parent: G.n });
    this.box(0.07, 0.05, R.z1 - R.z0, PAL.tinte, R.x0 + 0.035, tH, 0, { cast: false, parent: G.w });
    this.box(0.07, 0.05, R.z1 - R.z0, PAL.tinte, R.x1 - 0.035, tH, 0, { cast: false, parent: G.e });
    // Täfer-Fugen
    for (let x = R.x0 + 0.6; x < R.x1; x += 0.6 + this.jit(0.05)) this.box(0.02, tH - 0.06, 0.06, PAL.tinte, x, 0.03, R.z0 + 0.03, { cast: false, parent: G.n });
    for (let z = R.z0 + 0.6; z < R.z1; z += 0.6 + this.jit(0.05)) { this.box(0.06, tH - 0.06, 0.02, PAL.tinte, R.x0 + 0.03, 0.03, z, { cast: false, parent: G.w }); this.box(0.06, tH - 0.06, 0.02, PAL.tinte, R.x1 - 0.03, 0.03, z, { cast: false, parent: G.e }); }

    // ---------- Dach = Wolkenplattform ----------
    const roof = this.groups.roof;
    const rt = 0.2, ry = R.h, X0 = R.x0 - T, X1 = R.x1 + T, Z0 = R.z0 - T, Z1 = R.z1 + T;
    const roofPart = (x0, x1, z0, z1) => { this.box(x1 - x0, rt, z1 - z0, PAL.chalet, (x0 + x1) / 2, ry, (z0 + z1) / 2, { parent: roof, solid: true }); };
    roofPart(X0, HOLE.x0, Z0, Z1);
    roofPart(HOLE.x1, X1, Z0, Z1);
    roofPart(HOLE.x0, HOLE.x1, Z0, HOLE.z0);
    roofPart(HOLE.x0, HOLE.x1, HOLE.z1, Z1);
    // Dachkante als dunkle Linie
    this.box(X1 - X0 + 0.06, 0.06, 0.06, PAL.tinte, 0, ry + rt, Z1, { parent: roof, cast: false });
    // Bretterboden auf der Terrasse (Fugen)
    for (let z = Z0 + 0.32; z < Z1; z += 0.32 + this.jit(0.02)) {
      if (z > HOLE.z0 - 0.05 && z < HOLE.z1 + 0.05) { this.box(HOLE.x0 - X0 - 0.2, 0.012, 0.025, PAL.nuss, (X0 + HOLE.x0) / 2, ry + rt, z, { parent: roof, cast: false }); this.box(X1 - HOLE.x1 - 0.2, 0.012, 0.025, PAL.nuss, (HOLE.x1 + X1) / 2, ry + rt, z, { parent: roof, cast: false }); }
      else this.box(X1 - X0 - 0.2, 0.012, 0.025, PAL.nuss, 0, ry + rt, z, { parent: roof, cast: false });
    }
    // Ziegel-Vordach rundherum: schräge Schürze unter der Terrasse, mit Ziegelreihen und Dachrinne
    const OV = 0.75, DROP = 0.42, slope = Math.hypot(OV, DROP), ang = Math.atan2(DROP, OV), TILE = 0x9A4A33;
    const skirt = (len, cx, cz, rotY) => {
      const g = new THREE.Group(); g.position.set(cx, ry + rt - 0.02, cz); g.rotation.y = rotY; roof.add(g);
      const pl = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, slope), toon(TILE));
      pl.position.set(0, -DROP / 2, OV / 2); pl.rotation.x = ang; pl.castShadow = true; pl.receiveShadow = true; g.add(pl);
      for (let i = 1; i < 4; i++) {
        const row = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.03), toon(0x7A3526));
        row.position.set(0, -DROP * i / 4 + 0.04, OV * i / 4); g.add(row);
      }
      for (let x = -len / 2 + 0.22; x < len / 2; x += 0.22) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.02, slope), toon(0x7A3526));
        rib.position.set(x, -DROP / 2 + 0.04, OV / 2); rib.rotation.x = ang; g.add(rib);
      }
      const gut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 8), toon(0x8A9197));
      gut.rotation.z = Math.PI / 2; gut.position.set(0, -DROP - 0.02, OV + 0.02); g.add(gut);
    };
    const RW = X1 - X0, Dd = Z1 - Z0;
    skirt(RW + 2 * OV, 0, Z1, 0);
    skirt(RW + 2 * OV, 0, Z0, Math.PI);
    skirt(Dd, X1, 0, Math.PI / 2);
    skirt(Dd, X0, 0, -Math.PI / 2);
    // Ecken der Schürze schliessen
    for (const [cx, cz] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) {
      const c = this.box(0.5, 0.07, 0.5, TILE, cx + Math.sign(cx) * OV * 0.42, ry + rt - DROP * 0.7, cz + Math.sign(cz) * OV * 0.42, { parent: roof });
      c.rotation.y = Math.PI / 4;
    }
    // Fallrohr an der Südost-Ecke
    this.box(0.08, ry - DROP + 0.1, 0.08, 0x8A9197, X1 + OV - 0.1, 0, Z1 + OV - 0.1, { parent: roof });
    // Kamin (Nordwest), mit Blechkappe
    this.box(0.55, 1.35, 0.55, PAL.papier, X0 + 0.7, ry + rt, Z0 + 0.7, { parent: roof, solid: true, line: 0.012 });
    this.box(0.7, 0.06, 0.7, PAL.tinte, X0 + 0.7, ry + rt + 1.35, Z0 + 0.7, { parent: roof });
    this.box(0.12, 0.25, 0.12, PAL.tinte, X0 + 0.7, ry + rt + 1.41, Z0 + 0.7, { parent: roof });
    // Geländer rund ums Dach
    const rail = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 1.1));
      for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
        this.box(0.08, 0.95, 0.08, PAL.chalet, x, R.roof, z, { parent: roof, tilt: this.jit(0.04) });
      }
      const top = this.box(Math.abs(x1 - x0) + 0.08, 0.07, Math.abs(z1 - z0) + 0.08, PAL.chalet, (x0 + x1) / 2, R.roof + 0.92, (z0 + z1) / 2, { parent: roof });
      top.rotation.z = this.jit(0.01);
      this.addCollider(Math.min(x0, x1) - 0.05, R.roof, Math.min(z0, z1) - 0.05, Math.max(x0, x1) + 0.05, R.roof + 1.0, Math.max(z0, z1) + 0.05);
    };
    rail(X0 + 0.1, Z0 + 0.1, X1 - 0.1, Z0 + 0.1);
    rail(X0 + 0.1, Z1 - 0.1, X1 - 0.1, Z1 - 0.1);
    rail(X0 + 0.1, Z0 + 0.1, X0 + 0.1, Z1 - 0.1);
    rail(X1 - 0.1, Z0 + 0.1, X1 - 0.1, Z1 - 0.1);
    // Geländer am Treppenloch (Westseite)
    rail(HOLE.x0 - 0.05, HOLE.z0 + 1.1, HOLE.x0 - 0.05, HOLE.z1);

    // ---------- Treppe (Ostwand, nach Norden ansteigend) ----------
    for (let i = 0; i < STAIR.steps; i++) {
      const top = (i + 1) * STAIR.rise, z = STAIR.zBottom - i * STAIR.run;
      const s = this.box(STAIR.x1 - STAIR.x0, top, STAIR.run + 0.02, PAL.nuss, (STAIR.x0 + STAIR.x1) / 2, 0, z - STAIR.run / 2, { solid: true });
      s.rotation.y = this.jit(0.006);
      this.box(STAIR.x1 - STAIR.x0 + 0.02, 0.025, 0.05, PAL.tinte, (STAIR.x0 + STAIR.x1) / 2, top - 0.02, z, { cast: false });
    }
    // Handlauf
    const hl = this.box(0.05, 0.05, STAIR.steps * STAIR.run * 1.12, PAL.nuss, STAIR.x0 - 0.05, 0, STAIR.zBottom - STAIR.steps * STAIR.run / 2, { cast: false });
    hl.position.y = ROOM.roof / 2 + 0.9; hl.rotation.x = Math.atan2(ROOM.roof, STAIR.steps * STAIR.run);
    this.stairHint = new THREE.Vector3((STAIR.x0 + STAIR.x1) / 2, 0, STAIR.zBottom + 0.4);

    // ---------- Pult (einfache Form, Ausbau in office.js) ----------
    this.deskPos = new THREE.Vector3(-0.15, 0, -3.1);

    // ---------- Dorfplatz ----------
    this.buildVillage();
    this.buildMountains();
    this.buildSkyClouds();
    // Weltgrenze
    this.addCollider(-24, 0, -12, -23, 6, 40); this.addCollider(23, 0, -12, 24, 6, 40);
    this.addCollider(-24, 0, -12, 24, 6, -11); this.addCollider(-24, 0, 36, 24, 6, 37);
  }

  wallPart(x0, x1, y0, y1, side, mat) {
    const R = ROOM, T = R.wall;
    const z = side === 'n' ? R.z0 - T / 2 : R.z1 + T / 2;
    return this.box(x1 - x0, y1 - y0, T, mat, (x0 + x1) / 2, y0, z, { solid: true, parent: this.groups.n });
  }

  buildVillage() {
    const r = this.r;
    // Platz aus hellem Kies
    const sq = this.box(18, 0.03, 13, PAL.schnee, 0, 0, 12.5, { cast: false });
    sq.material = toon(PAL.schnee);
    // Weg vom Amtshaus
    this.box(2.2, 0.035, 2.2, PAL.schnee, 0, 0, 5.6, { cast: false });
    // Brunnen mit Wappen-Säule
    this.fountain = new THREE.Vector3(0, 0, 13);
    this.cyl(1.55, 1.65, 0.55, PAL.gletscher, 0, 0, 13, { seg: 10, solid: true, trip: true });
    this.cyl(1.6, 1.6, 0.07, PAL.schnee, 0, 0.55, 13, { seg: 10, cast: false });
    this.cyl(1.38, 1.38, 0.08, PAL.himmel, 0, 0.5, 13, { seg: 10, cast: false });
    this.cyl(0.22, 0.26, 1.6, PAL.gletscher, 0, 0.4, 13, { seg: 8 });
    const shield = this.box(0.42, 0.5, 0.06, PAL.rot, 0, 1.6, 13.25, { line: 0.02 });
    const wc = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), toon(PAL.schnee)); wc.scale.set(1.6, 0.8, 0.4); wc.position.set(0, 0.03, 0.03); shield.add(wc);

    // Häuser rund um den Platz: alle etwas anders
    const spots = [
      [-11.5, 7.5, 0.5], [-11.2, 19.6, 1.4], [-6, 22.5, 0.1], [0.5, 23.5, -0.05], [6.5, 22.8, 0.08],
      [11.6, 18.5, -1.5], [12.2, 12.5, -1.6], [11.5, 6.8, -0.4], [-17, 27, 0.3], [16, 27, -0.2], [-18, 4, 1.2], [18, 3, -1.1],
    ];
    this.houses = [];
    spots.forEach(([x, z, rot]) => this.addHouse(x, z, rot));

    // Tannen
    const firs = [[-8, 3], [-9.5, 4.5], [8.5, 3.5], [9, 1.5], [-16.5, 6.5], [14.5, 9.5], [-16.5, 19], [15, 15], [-3, 26], [3.5, 27], [-20, 14], [20, 20], [-10, -2], [10, -3], [-16, -6], [16, -6], [-7, -8], [7.5, -9]];
    firs.forEach(([x, z]) => this.fir(x + this.jit(0.4), z + this.jit(0.4), 2.2 + r() * 2));
    // Zäune, leicht schief
    for (const [x0, z0, x1, z1] of [[-9, 5.5, -9, 10], [9, 5.5, 9, 10], [-16, 22, -9, 25], [9.5, 25, 16, 22]]) {
      const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.9);
      for (let i = 0; i <= n; i++) this.box(0.1, 0.8 + this.jit(0.08), 0.1, PAL.chalet, x0 + (x1 - x0) * i / n, 0, z0 + (z1 - z0) * i / n, { tilt: this.jit(0.07), rot: this.jit(0.2) });
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
      for (const y of [0.35, 0.65]) { const b = this.box(len, 0.07, 0.05, PAL.chalet, (x0 + x1) / 2, y + this.jit(0.03), (z0 + z1) / 2, { rot: -ang }); b.rotation.z = this.jit(0.02); }
      this.addCollider(Math.min(x0, x1) - 0.1, 0, Math.min(z0, z1) - 0.1, Math.max(x0, x1) + 0.1, 0.9, Math.max(z0, z1) + 0.1);
    }
    // Bänkli
    for (const [x, z, rot] of [[-4.5, 10, 0.3], [4.6, 15.5, -0.2]]) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; this.scene.add(g);
      this.box(1.6, 0.08, 0.45, PAL.chalet, 0, 0.42, 0, { parent: g });
      this.box(1.6, 0.35, 0.06, PAL.chalet, 0, 0.55, -0.22, { parent: g });
      for (const s of [-0.65, 0.65]) this.box(0.08, 0.42, 0.4, PAL.tinte, s, 0, 0, { parent: g });
      this.addCollider(x - 0.85, 0, z - 0.35, x + 0.85, 0.5, z + 0.35, true);
    }
  }

  fir(x, z, h, parent) {
    const g = new THREE.Group(); g.position.set(x, 0, z); (parent || this.scene).add(g);
    this.cyl(0.12, 0.16, h * 0.25, PAL.chalet, 0, 0, 0, { parent: g, seg: 6 });
    for (let i = 0; i < 3; i++) {
      const rr = h * (0.36 - i * 0.08), hh = h * 0.42;
      const c = new THREE.Mesh(new THREE.ConeGeometry(rr, hh, 7), toon(PAL.matte));
      c.position.y = h * 0.2 + i * h * 0.24 + hh / 2; c.rotation.y = this.r() * 3; c.castShadow = true; g.add(c);
    }
    this.addCollider(x - 0.35, 0, z - 0.35, x + 0.35, h, z + 0.35);
    return g;
  }

  buildMountains() { buildLandscape(this); }

  buildSkyClouds() {
    this.skyClouds = [];
    const mat = toon(PAL.schnee);
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const n = 4 + ((this.r() * 3) | 0);
      for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1.6 + this.r() * 1.4, 9, 7), mat); s.position.set((k - n / 2) * 2 + this.jit(0.5), this.jit(0.6), this.jit(0.8)); s.scale.y = 0.75; g.add(s); }
      g.position.set(-60 + this.r() * 120, 24 + this.r() * 12, -50 + this.r() * 80);
      this.scene.add(g); this.skyClouds.push(g);
    }
  }

  // ---------------- Spieler ----------------
  makePlayer(color) {
    const b = new Beamtli(color); this.scene.add(b.root);
    return { b, pos: new THREE.Vector3(), vel: new THREE.Vector3(), grounded: true, tripCd: 0, maxFall: 0 };
  }
  setPlayerColor(color) {
    const p = this.player, old = p.b; const b = new Beamtli(color); b.yaw = old.yaw; old.dispose(); this.scene.add(b.root); p.b = b;
  }

  addRemote(id, color) {
    const b = new Beamtli(color); this.scene.add(b.root);
    const r = { b, pos: new THREE.Vector3(0, 0, 2), vel: new THREE.Vector3(), target: new THREE.Vector3(0, 0, 2), yawT: 0, grounded: true, down: false, buf: [] };
    this.remotes.set(id, r); return r;
  }
  removeRemote(id) { const r = this.remotes.get(id); if (r) { r.b.dispose(); this.remotes.delete(id); } }

  // ---------------- Eingabe ----------------
  input() {
    const map = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', Space: 'j', KeyE: 'e' };
    addEventListener('keydown', e => {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      const k = map[e.code]; if (!k || !this.enabled) return;
      if (k === 'e' && !e.repeat) this.use();
      if (k === 'j' && !e.repeat) this.jumpReq = true;
      this.keys.add(k);
      if (k === 'j' || k.length === 1 && /[fblr]/.test(k) && e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', e => { const k = map[e.code]; if (k) this.keys.delete(k); });
    addEventListener('blur', () => this.keys.clear());
    // Kamera mit Ziehen drehen
    let drag = null;
    this.canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') drag = { x: e.clientX, yaw: this.camYawT }; });
    addEventListener('pointermove', e => { if (drag) this.camYawT = drag.yaw - (e.clientX - drag.x) * 0.006; });
    addEventListener('pointerup', () => { drag = null; });
  }
  use() {
    if (!this.enabled || this.camAnim) return;
    const it = this.nearest;
    if (it && this.onUse) this.onUse(it.id, it);
  }
  addInteractable(id, pos, radius, label, y = 0) { const it = { id, pos: pos.clone(), radius, label, y, enabled: true }; this.interactables.push(it); return it; }

  // ---------------- Physik ----------------
  stepPlayer(dt) {
    const p = this.player, b = p.b, P = PLAYER;
    p.tripCd = Math.max(0, p.tripCd - dt);
    // Steuerung relativ zur Kamera
    let ix = 0, iz = 0;
    if (this.enabled && !b.down && !this.camAnim) {
      if (this.keys.has('f')) iz -= 1; if (this.keys.has('b')) iz += 1;
      if (this.keys.has('l')) ix -= 1; if (this.keys.has('r')) ix += 1;
      ix += this.joy.x; iz += this.joy.y;
    }
    const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
    const cy = Math.cos(this.camYaw), sy = Math.sin(this.camYaw);
    const dx = ix * cy + iz * sy, dz = -ix * sy + iz * cy;
    const tx = dx * P.speed, tz = dz * P.speed;
    const acc = (p.grounded ? P.accel : P.air) * dt;
    const vx = tx - p.vel.x, vz = tz - p.vel.z, vl = Math.hypot(vx, vz);
    if (vl > 0) { const k = Math.min(1, acc / vl); p.vel.x += vx * k; p.vel.z += vz * k; }
    if (b.down) { p.vel.x *= Math.pow(0.02, dt); p.vel.z *= Math.pow(0.02, dt); }
    if (il > 0.1 && !b.down) {
      const want = Math.atan2(dx, dz);
      let d = want - b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      b.yaw += d * Math.min(1, dt * 12);
    }
    // Hüpfen
    if (this.jumpReq) { this.jumpReq = false; if (p.grounded && !b.down && this.enabled && !this.camAnim) { p.vel.y = P.jump; p.grounded = false; b.jumped(); this.sfx && this.sfx('jump'); } }
    // Schwerkraft
    p.vel.y -= P.grav * dt;
    // bewegen
    const pos = p.pos;
    const hSpeed = Math.hypot(p.vel.x, p.vel.z);
    pos.x += p.vel.x * dt; pos.z += p.vel.z * dt;
    // horizontal gegen Boxen
    for (let it = 0; it < 2; it++) for (const c of this.colliders) {
      if (c.max.y <= pos.y + P.step || c.min.y >= pos.y + P.h) continue;
      const qx = Math.max(c.min.x, Math.min(pos.x, c.max.x)), qz = Math.max(c.min.z, Math.min(pos.z, c.max.z));
      let ddx = pos.x - qx, ddz = pos.z - qz; const d = Math.hypot(ddx, ddz);
      if (d >= P.r) continue;
      if (d > 1e-5) { const push = (P.r - d) / d; pos.x += ddx * push; pos.z += ddz * push; const n = { x: ddx / d, z: ddz / d }; const vn = p.vel.x * n.x + p.vel.z * n.z; if (vn < 0) { p.vel.x -= vn * n.x; p.vel.z -= vn * n.z; if (vn < -3.3 && it === 0) b.pitch.v -= 5; } }
      else {
        const pen = [pos.x - c.min.x + P.r, c.max.x - pos.x + P.r, pos.z - c.min.z + P.r, c.max.z - pos.z + P.r];
        const m = pen.indexOf(Math.min(...pen));
        if (m === 0) pos.x = c.min.x - P.r; else if (m === 1) pos.x = c.max.x + P.r; else if (m === 2) pos.z = c.min.z - P.r; else pos.z = c.max.z + P.r;
      }
    }
    if (this.bound) this.bound(pos);
    // Boden finden
    let ground = 0, groundC = null; const gr = P.r * 0.55;
    for (const c of this.colliders) {
      if (c.max.y > pos.y + P.step + 0.001) continue;
      if (pos.x + gr < c.min.x || pos.x - gr > c.max.x || pos.z + gr < c.min.z || pos.z - gr > c.max.z) continue;
      if (c.max.y > ground) { ground = c.max.y; groundC = c; }
    }
    // Decke
    for (const c of this.colliders) {
      if (p.vel.y <= 0 || c.min.y < pos.y + P.h - 0.1 || c.min.y > pos.y + P.h + p.vel.y * dt + 0.05) continue;
      if (pos.x < c.min.x || pos.x > c.max.x || pos.z < c.min.z || pos.z > c.max.z) continue;
      p.vel.y = 0; break;
    }
    pos.y += p.vel.y * dt;
    const wasG = p.grounded;
    if (pos.y <= ground) {
      // Stolpern: schnell über eine kleine Kante
      if (wasG && ground - (pos.y - p.vel.y * dt) > 0.08 && groundC && groundC.trip && hSpeed > 3.0 && p.tripCd <= 0) {
        p.tripCd = 2.5; if (Math.random() < 0.6) { b.tumble(); this.sfx && this.sfx('tumble'); }
      }
      const impact = -p.vel.y;
      pos.y = ground; p.vel.y = 0; p.grounded = true;
      if (!wasG) { b.landed(impact * 0.35); if (impact > 8.8) { b.tumble(); this.sfx && this.sfx('tumble'); } else if (impact > 3) this.sfx && this.sfx('land'); }
    } else if (pos.y - ground > 0.05 || p.vel.y > 0) {
      // kleine Absätze nach unten mitnehmen (Treppe)
      if (wasG && p.vel.y <= 0 && pos.y - ground < P.step) { pos.y = ground; p.vel.y = 0; }
      else p.grounded = false;
    }
    b.air = !p.grounded;
    b.root.position.copy(pos);
    b.update(dt, p.vel, p.grounded);
    // Schritte (knarrende Dielen im Amtshaus)
    if (p.grounded && hSpeed > 1 && !b.down) {
      p.stepAcc = (p.stepAcc || 0) + dt * hSpeed;
      if (p.stepAcc > 1.0) { p.stepAcc = 0; this.sfx && this.sfx('step', this.inside || pos.y > 0.2 ? 'wood' : 'gravel'); }
    }
  }

  stepRemotes(dt) {
    for (const r of this.remotes.values()) {
      // weich zum letzten bekannten Stand
      const prev = r.pos.clone();
      const k = 1 - Math.exp(-dt * 12);
      r.pos.lerp(r.target, k);
      r.vel.copy(r.pos).sub(prev).divideScalar(Math.max(dt, 1e-3));
      r.vel.y = 0;
      let d = r.yawT - r.b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); r.b.yaw += d * Math.min(1, dt * 12);
      if (r.downReq) { r.downReq = false; r.b.tumble(); }
      r.b.air = !r.grounded;
      r.b.root.position.copy(r.pos);
      r.b.update(dt, r.vel, r.grounded);
    }
  }

  // ---------------- Kamera ----------------
  // Kamerafahrt zu einer festen Ansicht (z. B. aufs Pult), danach Rückruf
  flyTo(pos, look, dur, done, inside = this.inside) {
    this.camSnap = false;
    this.holdInside = inside; this.orbitOn = false;
    const a = this.camAnim = { from: this.camera.position.clone(), fromLook: (this.lookNow || pos).clone(), to: pos.clone(), look: look.clone(), t: 0, dur, done };
    // Sicherung: falls der Tab im Hintergrund keine Bilder rendert, trotzdem weitermachen
    setTimeout(() => { if (this.camAnim === a) { a.t = a.dur; this.stepCamera(0); } }, dur * 1000 + 400);
  }
  release() { this.camMode = 'follow'; this.camAnim = null; this.hold = null; }
  stepCamera(dt) {
    const cam = this.camera, p = this.player.pos;
    this.camYaw += (this.camYawT - this.camYaw) * Math.min(1, dt * 6);
    if (!this.lookNow) this.lookNow = new THREE.Vector3();
    if (this.camAnim) {
      const a = this.camAnim; a.t += dt;
      const k = Math.min(1, a.t / a.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      cam.position.lerpVectors(a.from, a.to, e);
      this.lookNow.lerpVectors(a.fromLook, a.look, e);
      cam.lookAt(this.lookNow);
      if (k >= 1) { const d = a.done; this.hold = { pos: a.to, look: a.look }; this.camAnim = null; d && d(); }
      return;
    }
    if (this.orbitOn) {
      const a = this.t * 0.05 + 0.6;
      cam.position.set(Math.sin(a) * 15, 12.5, 9 + Math.cos(a) * 15);
      this.lookNow.set(0, 1.5, 3); cam.lookAt(this.lookNow); return;
    }
    if (this.hold) { cam.position.copy(this.hold.pos); cam.lookAt(this.hold.look); this.lookNow.copy(this.hold.look); return; }
    const inside = this.inside;
    const onRoof = p.y > 3;
    const dist = inside ? 7.4 : onRoof ? 7.2 : 9.5, height = inside ? 6.2 : onRoof ? 2.6 : 6.4;
    const off = new THREE.Vector3(Math.sin(this.camYaw) * dist, height, Math.cos(this.camYaw) * dist);
    const want = p.clone().add(off);
    const look = p.clone().add(new THREE.Vector3(0, onRoof ? 1.6 : 0.9, 0));
    const k = this.camSnap ? 1 : 1 - Math.exp(-dt * 5); this.camSnap = false;
    cam.position.lerp(want, k);
    this.lookNow.lerp(look, k);
    cam.lookAt(this.lookNow);
    this.fadeOccluders(look);
  }
  // Häuser, die zwischen Kamera und Beamtli stehen (oder in denen die Kamera steckt), ausblenden
  fadeOccluders(look) {
    if (!this.fadeList) return;
    const cam = this.camera.position, len = cam.distanceTo(look), hit = new THREE.Vector3();
    for (const f of this.fadeList) {
      // Direkt am eigenen Haus (Türe, Balkon darüber): nicht ausblenden
      let near;
      if (f.ud) { const lp = f.g.worldToLocal(look.clone()); near = Math.abs(lp.x) < f.ud.w / 2 + 0.25 && lp.z > -f.ud.d / 2 - 0.25 && lp.z < f.ud.d / 2 + 0.95; }
      else near = f.inner.containsPoint(look);
      // Strahl von der Kamera zum Beamtli: trifft er das Haus vorher, steht es im Weg
      const back = new THREE.Ray(cam, look.clone().sub(cam).normalize());
      const block = !this.inside && !near && (f.box.containsPoint(cam) || (back.intersectBox(f.box, hit) && hit.distanceTo(cam) < len - 0.05));
      f.g.visible = !block;
    }
  }
  setFadeHouses(idx, extra = []) {
    this.fadeList = idx.map(i => this.houses[i]).concat(extra).map(g => { const box = new THREE.Box3().setFromObject(g); box.expandByScalar(0.15); const inner = box.clone().expandByScalar(-1.4); return { g, box, inner, ud: g.userData && g.userData.w ? g.userData : null }; });
  }



  // ---------------- Leistung: Unbewegliches zusammenfassen ----------------
  // Alle statischen Meshes mit gleichem Material werden zu einem Mesh verschmolzen
  // (pro Sichtbarkeitsgruppe getrennt, damit das Ausblenden der Wände weiter geht).
  bake(dynamic = [], extra = []) {
    const dyn = new Set(dynamic), scene = this.scene;
    const groups = new Set([...Object.values(this.groups), this.sockel, ...extra]);
    scene.updateMatrixWorld(true);
    const buckets = new Map(), victims = [];
    scene.traverse(o => {
      if (!o.isMesh) return;
      for (let p = o; p; p = p.parent) if (dyn.has(p)) return;
      const m = o.material;
      if (Array.isArray(m) || m.map || m.transparent || !o.visible) return;
      let top = o; while (top.parent && top.parent !== scene) top = top.parent;
      const target = groups.has(top) ? top : scene;
      const key = target.uuid + m.uuid + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0);
      if (!buckets.has(key)) buckets.set(key, { target, m, cast: o.castShadow, recv: o.receiveShadow, list: [] });
      buckets.get(key).list.push(o); victims.push(o);
    });
    const vset = new Set(victims);
    const nm = new THREE.Matrix3(), v = new THREE.Vector3();
    for (const b of buckets.values()) {
      const inv = b.target === scene ? null : new THREE.Matrix4().copy(b.target.matrixWorld).invert();
      const geos = b.list.map(o => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry; return { g, mw: inv ? new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld) : o.matrixWorld }; });
      const n = geos.reduce((a, x) => a + x.g.attributes.position.count, 0);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
      let off = 0;
      for (const { g, mw } of geos) {
        const P = g.attributes.position, N = g.attributes.normal; nm.getNormalMatrix(mw);
        for (let i = 0; i < P.count; i++) {
          v.fromBufferAttribute(P, i).applyMatrix4(mw); pos[(off + i) * 3] = v.x; pos[(off + i) * 3 + 1] = v.y; pos[(off + i) * 3 + 2] = v.z;
          if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(off + i) * 3] = v.x; nor[(off + i) * 3 + 1] = v.y; nor[(off + i) * 3 + 2] = v.z; }
        }
        off += P.count;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, b.m); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.matrixAutoUpdate = false;
      b.target.add(mesh);
    }
    // ursprüngliche Meshes entfernen, nicht verschmolzene Kinder behalten
    for (const o of victims) {
      for (const c of [...o.children]) if (!vset.has(c)) o.parent.attach(c);
      o.removeFromParent();
    }
    // leere Gruppen-Hüllen bleiben stehen, stören aber nicht
    return buckets.size;
  }

  // ---------------- Dorfleute ----------------
  spawnVillagers(n = 11) {
    const cols = [PAL.matte, PAL.chalet, PAL.gletscher, PAL.schnee, PAL.ocker, PAL.lino, PAL.blau];
    const hats = ['filz', 'tuch', 'zipfel', 'filz', null];
    const hatCols = [PAL.chalet, PAL.rot, PAL.tinte, PAL.matte, PAL.lino];
    this.villagers = [];
    for (let i = 0; i < n; i++) {
      const b = new Beamtli(cols[i % cols.length], { villager: true, hat: hats[i % hats.length] || 'none', hatColor: hatCols[(i * 3) % hatCols.length] });
      const s = 0.82 + this.r() * 0.25; b.root.scale.setScalar(s);
      this.scene.add(b.root);
      const a = i / n * Math.PI * 2 + this.jit(0.2), d = 3.2 + this.r() * 3.5;
      const v = { b, pos: new THREE.Vector3(Math.cos(a) * d, 0, 13 + Math.sin(a) * d * 0.8), vel: new THREE.Vector3(), target: null, wait: this.r() * 4, watch: false, delay: 0 };
      b.yaw = this.r() * 6; b.root.position.copy(v.pos);
      this.villagers.push(v);
    }
  }
  stepVillagers(dt) {
    if (!this.villagers) return;
    for (const v of this.villagers) {
      const b = v.b;
      if (v.watch) {
        v.vel.set(0, 0, 0);
        v.delay -= dt;
        const k = v.delay < 0 ? 1 : 0;
        b.phoneUp += (k - b.phoneUp) * Math.min(1, dt * 4); b.lookUp += (k - b.lookUp) * Math.min(1, dt * 3);
        if (this.watchAt) { const want = Math.atan2(this.watchAt.x - v.pos.x, this.watchAt.z - v.pos.z); let d = want - b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); b.yaw += d * Math.min(1, dt * 4); }
        if (k && Math.random() < dt * 0.5) b.flashT = 0.12;
      } else {
        b.phoneUp *= 1 - Math.min(1, dt * 3); b.lookUp *= 1 - Math.min(1, dt * 3);
        v.wait -= dt;
        if (!v.target && v.wait <= 0) { const a = this.r() * 6.28, d = 3 + this.r() * 4.5; v.target = new THREE.Vector3(Math.cos(a) * d, 0, 13 + Math.sin(a) * d * 0.8); }
        // Bei hohem Verdacht: stehen bleiben und das Beamtli anstarren, wenn es nahe ist
        if (this.stare) {
          const sx = this.stare.x - v.pos.x, sz = this.stare.z - v.pos.z, sl = Math.hypot(sx, sz);
          if (sl < 6.5) { v.target = null; v.vel.set(0, 0, 0); v.wait = Math.max(v.wait, 1); let d = Math.atan2(sx, sz) - b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); b.yaw += d * Math.min(1, dt * 3); }
        }
        if (v.target) {
          const dx = v.target.x - v.pos.x, dz = v.target.z - v.pos.z, l = Math.hypot(dx, dz);
          if (l < 0.2) { v.target = null; v.wait = 2 + this.r() * 6; v.vel.set(0, 0, 0); }
          else { v.vel.set(dx / l * 1.1, 0, dz / l * 1.1); let d = Math.atan2(dx, dz) - b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); b.yaw += d * Math.min(1, dt * 5); }
        }
        v.pos.addScaledVector(v.vel, dt);
        // nicht in den Brunnen laufen
        const fx = v.pos.x, fz = v.pos.z - 13, fl = Math.hypot(fx, fz);
        if (fl < 2.1) { v.pos.x = fx / fl * 2.1; v.pos.z = 13 + fz / fl * 2.1; }
      }
      b.root.position.copy(v.pos);
      b.update(dt, v.vel, true);
    }
  }
  // Alle schauen nach oben und zücken das Handy
  watch(on, at) {
    this.watchAt = at || null;
    (this.villagers || []).forEach((v, i) => { v.watch = on; v.delay = on ? 0.2 + i * 0.12 + Math.random() * 0.3 : 0; if (on) v.target = null; });
  }

  // ---------------- Wolken am Himmel (aus der 2D-Ansicht) ----------------
  skyCloud(canvas, from, to, dur = 2.6, width = 13) {
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const h = width * canvas.height / canvas.width;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.copy(from); m.renderOrder = 2; this.scene.add(m);
    (this.flying || (this.flying = [])).push({ m, from: from.clone(), to: to.clone(), t: 0, dur, ph: Math.random() * 6 });
    return m;
  }
  clearSkyClouds() { (this.flying || []).forEach(f => { f.m.removeFromParent(); f.m.material.map.dispose(); f.m.material.dispose(); f.m.geometry.dispose(); }); this.flying = []; }
  stepFlying(dt) {
    for (const f of this.flying || []) {
      f.t += dt; const k = Math.min(1, f.t / f.dur), e = 1 - Math.pow(1 - k, 3);
      f.m.position.lerpVectors(f.from, f.to, e);
      f.m.position.y += Math.sin(this.t * 0.8 + f.ph) * 0.15;
      f.m.lookAt(this.camera.position.x, f.m.position.y, this.camera.position.z);
    }
  }

  // ---------------- Tageszeit ----------------
  setTod(T) {
    this.scene.background = new THREE.Color(T ? T.bg3d : PAL.himmel);
    this.sun.intensity = T ? T.sun3d : 2.1; this.amb.intensity = T ? T.amb3d : 1.15;
    this.amb.color.set(T && T.bg3d === PAL.blau ? PAL.gletscher : PAL.himmel);
    this.syncSky();
  }
  // Tageslauf im Dorf: 0 = Vormittag, 0.3 = goldener Nachmittag, 1 = Abend mit Lichtern
  setDusk(k) {
    this.dusk = k; const c = new THREE.Color(PAL.himmel);
    if (k > 0) { c.lerp(new THREE.Color('#E8B48A'), Math.min(1, k / 0.5)); if (k > 0.5) c.lerp(new THREE.Color('#4A5480'), (k - 0.5) / 0.5); }
    this.scene.background = c;
    this.sun.color.set(0xfff0d8).lerp(new THREE.Color('#FF9A5A'), Math.min(1, k * 1.3));
    this.sun.intensity = 2.1 * (1 - k * 0.62); this.amb.intensity = 1.15 * (1 - k * 0.5);
    this.amb.color.set(PAL.himmel).lerp(new THREE.Color('#6C7FB0'), Math.max(0, (k - 0.3) / 0.7));
    this.syncSky(); if (this.onDusk) this.onDusk(k);
  }
  // Himmelskuppel und Dunst passen sich der Hintergrundfarbe an
  syncSky() {
    const bg = this.scene.background;
    if (this.skyDome) this.skyDome.material.color.copy(bg);
    if (this.weather !== 'fog') this.scene.fog = new THREE.Fog(bg.clone().lerp(new THREE.Color(0xffffff), 0.1), 420, 2300);
  }

  // ---------------- Kamera-Rundflug fürs Menü ----------------
  orbit(on) { this.orbitOn = on; if (on) { this.camAnim = null; this.hold = null; } }

  // Wetter im Dorf: 'rain', 'fog', 'sun', 'storm' oder null
  setWeather(kind) {
    this.weather = kind || null;
    this.scene.fog = kind === 'fog' ? new THREE.Fog(PAL.papier, 6, 34) : null;
    if (kind === 'fog') this.scene.background = new THREE.Color(PAL.papier);
    if (kind === 'storm') { this.scene.background = new THREE.Color(PAL.gletscher); this.sun.intensity = 1.0; this.amb.intensity = 0.8; }
    if (kind === 'sun') { this.sun.intensity = 2.6; }
    if (kind === 'rain' || kind === 'storm') {
      if (!this.rain) {
        const n = 900, pos = new Float32Array(n * 6);
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: PAL.gletscher, transparent: true, opacity: 0.6 }));
        this.rain.frustumCulled = false; this.rainP = Array.from({ length: n }, () => [Math.random() * 40 - 20, Math.random() * 16, Math.random() * 40 - 20]);
        this.scene.add(this.rain);
      }
      this.rain.visible = true;
      if (kind === 'rain') { this.scene.background = new THREE.Color(PAL.gletscher); this.sun.intensity = 1.3; }
    } else if (this.rain) this.rain.visible = false;
    this.syncSky();
  }
  stepWeather(dt) {
    if (this.rain && this.rain.visible) {
      const a = this.rain.geometry.attributes.position.array, c = this.camera.position;
      this.rainP.forEach((p, i) => {
        p[1] -= dt * 14; if (p[1] < 0) { p[1] = 16; p[0] = Math.random() * 40 - 20; p[2] = Math.random() * 40 - 20; }
        const x = c.x + p[0], z = c.z + p[2] - 6;
        a[i * 6] = x; a[i * 6 + 1] = p[1]; a[i * 6 + 2] = z; a[i * 6 + 3] = x - 0.05; a[i * 6 + 4] = p[1] - 0.5; a[i * 6 + 5] = z;
      });
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    if (this.weather === 'storm') {
      this.flashT = (this.flashT || 0) - dt;
      if (this.flashT < 0 && Math.random() < dt * 0.25) { this.flashT = 0.12; this.amb.intensity = 3; this.sfx && this.sfx('thunder'); }
      else if (this.flashT < 0) this.amb.intensity = 0.8;
    }
  }
  setFov(f) { this.camera.fov = f; this.camera.updateProjectionMatrix(); }
  teleport(x, y, z, yaw) {
    const p = this.player; p.pos.set(x, y, z); p.vel.set(0, 0, 0); p.grounded = true;
    if (yaw !== undefined) p.b.yaw = yaw;
    p.b.root.position.copy(p.pos); p.b.downT = -1;
    this.camSnap = true;   // Kamera springt mit, statt quer durchs Dorf (und durch Dächer) zu fliegen
  }

  // ---------------- Hauptschleife ----------------
  resize() {
    const el = this.canvas.parentElement; if (!el) return;
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  update(dt) {
    this.t += dt;
    this.stepPlayer(dt);
    this.stepRemotes(dt);
    this.stepVillagers(dt);
    this.stepFlying(dt);
    this.stepWeather(dt);
    const p = this.player.pos, R = ROOM;
    const inside = p.x > R.x0 - 0.2 && p.x < R.x1 + 0.2 && p.z > R.z0 - 0.2 && p.z < R.z1 + 0.1 && p.y < 2.9;
    if (inside !== this.inside) { this.inside = inside; }
    const camInside = this.orbitOn ? false : this.hold ? this.holdInside : inside;
    // Puppenhaus-Schnitt: Wand zwischen Kamera und Figur ausblenden
    const cs = Math.sin(this.camYaw), cc = Math.cos(this.camYaw);
    this.groups.cutaway.visible = !camInside || cc < -0.35;
    this.groups.n.visible = !camInside || cc > -0.35;
    this.groups.w.visible = !camInside || cs > -0.45;
    this.groups.e.visible = !camInside || cs < 0.45;
    this.sockel.visible = true;
    this.groups.roof.visible = !camInside;
    if (this.office) this.office.update(dt, this.t);
    // Schatten folgen dem Spieler
    this.sun.position.set(p.x + 7, 16, p.z + 11); this.sun.target.position.set(p.x, 0, p.z);
    for (const c of this.skyClouds) { c.position.x += dt * 0.6; if (c.position.x > 70) c.position.x = -70; }
    this.stepCamera(dt);
    // nächstes Objekt zum Benutzen
    let best = null, bd = 1e9;
    for (const it of this.interactables) {
      if (!it.enabled) continue;
      const dx = p.x - it.pos.x, dz = p.z - it.pos.z, dy = Math.abs(p.y - it.y);
      const d = Math.hypot(dx, dz);
      if (d < it.radius && dy < 1 && d < bd) { bd = d; best = it; }
    }
    this.nearest = this.enabled && !this.camAnim && !this.hold && !this.orbitOn ? best : null;
    this.onTick && this.onTick(dt);
  }
  render() { this.renderer.render(this.scene, this.camera); }

  // Bildschirmposition eines Weltpunkts (für Hinweise)
  project(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x + 1) / 2, y: (1 - p.y) / 2, vis: p.z < 1 };
  }
}
