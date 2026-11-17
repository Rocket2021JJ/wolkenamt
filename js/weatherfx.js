// HOCHDRUCK – das Wetter, das du machst, sieht man im Dorf:
// Regen: nasser, dunklerer Boden, Pfützen mit Tropfenringen, die Leute haben Schirme, einige bleiben drinnen.
// Sonne: warmes Licht, Leute mit Sonnenbrille und Glace, Schmetterlinge über den Gärten.
// Schnee: Schneeflocken, Schnee auf allen Dächern und am Boden, Schneemänner, Leute mit Kappe und Schal.
// Nebel: macht world3d.setWeather schon selbst (kurze Sichtweite).
import * as THREE from 'three';
import { PAL } from './palette.js';
import { toon } from './toon.js';

let built = false;
const S = { puddles: [], rings: null, ringP: [], butter: null, butterP: [], flakes: null, flakeP: [], roofSnow: [], snowmen: [], kind: null, groundMats: [] };

function umbrella(col) {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 5), toon(PAL.tinte)); stick.position.y = 0.45; g.add(stick);
  const can = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.32, 8, 1, true), toon(col, { side: THREE.DoubleSide })); can.position.y = 0.95; g.add(can);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), toon(PAL.tinte)); tip.position.y = 1.12; g.add(tip);
  return g;
}
function shades() {
  const g = new THREE.Group(), m = toon(PAL.tinte);
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.02), m); l.position.set(0.1 * s, 0, 0); g.add(l); }
  const br = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), m); g.add(br);
  return g;
}
function iceCream() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 7), toon('#D9A35A')); cone.rotation.x = Math.PI; cone.position.y = -0.07; g.add(cone);
  const sc = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), toon(['#F2B8C6', '#F4EFE4', '#8A5A36'][Math.floor(Math.random() * 3)])); sc.position.y = 0.02; g.add(sc);
  return g;
}
function winterWear(col) {
  const g = new THREE.Group();
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.06, 6, 14), toon(col)); scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.42; g.add(scarf);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.04), toon(col)); tail.position.set(0.12, 0.3, 0.27); g.add(tail);
  return g;
}
function snowman(w, x, z, r) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r; w.scene.add(g);
  const sn = toon('#F8FAFC');
  [[0.42, 0.38], [0.3, 0.98], [0.21, 1.42]].forEach(([rad, y]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), sn); b.position.y = y; b.castShadow = true; g.add(b); });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.2, 6), toon('#E07A2E')); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.42, 0.27); g.add(nose);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), toon(PAL.tinte)); e.position.set(0.07 * s, 1.5, 0.18); g.add(e); }
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 10), toon(PAL.tinte)); hat.position.y = 1.7; g.add(hat);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 4), toon(PAL.nuss)); a.position.set(0.38 * s, 1.0, 0); a.rotation.z = s * 1.0; g.add(a); }
  g.visible = false; return g;
}

function build(w) {
  built = true;
  // Pfützen auf Platz und Wegen
  const pm = new THREE.MeshBasicMaterial({ color: '#7E9DB4', transparent: true, opacity: 0.0, depthWrite: false });
  const spots = [[-3, 9], [4, 15], [6, 7.5], [-5.5, 17], [1, 18.5], [-20, 14], [-30, 14.4], [-38, 4], [-38, 26], [20, -2.4], [33, -2.6], [40, 8], [40, 30], [0, -12], [0, -28], [-1.8, 26], [0, 40], [-12, -15], [12, 47.6], [-24, 48]];
  for (const [x, z] of spots) { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 18), pm); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.035, z); m.scale.set(0.8 + Math.random() * 1.1, 0.5 + Math.random() * 0.6, 1); m.renderOrder = 1; w.scene.add(m); S.puddles.push(m); }
  S.puddleMat = pm;
  // Tropfenringe in den Pfützen
  const rg = new THREE.RingGeometry(0.85, 1, 16); rg.rotateX(-Math.PI / 2);
  S.rings = new THREE.InstancedMesh(rg, new THREE.MeshBasicMaterial({ color: '#DDE8F0', transparent: true, opacity: 0.55, depthWrite: false }), 60); S.rings.frustumCulled = false; S.rings.visible = false; w.scene.add(S.rings);
  for (let i = 0; i < 60; i++) S.ringP.push({ p: 0, t: Math.random(), x: 0, z: 0 });
  // Schmetterlinge
  const wing = new THREE.PlaneGeometry(0.16, 0.12);
  S.butter = new THREE.InstancedMesh(wing, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 48); S.butter.frustumCulled = false; S.butter.visible = false; w.scene.add(S.butter);
  const bc = ['#F2C14E', '#F28C8C', '#9CC3F2', '#FFFFFF'], col = new THREE.Color();
  for (let i = 0; i < 24; i++) { const hx = (Math.random() - 0.5) * 90, hz = -40 + Math.random() * 95; S.butterP.push({ hx, hz, ph: Math.random() * 10, sp: 0.5 + Math.random() * 0.5 }); col.set(bc[i % 4]); S.butter.setColorAt(i * 2, col); S.butter.setColorAt(i * 2 + 1, col); }
  // Schneeflocken
  const n = 1400, pos = new Float32Array(n * 3); const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  S.flakes = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.95, depthWrite: false })); S.flakes.frustumCulled = false; S.flakes.visible = false; w.scene.add(S.flakes);
  for (let i = 0; i < n; i++) S.flakeP.push([Math.random() * 60 - 30, Math.random() * 22, Math.random() * 60 - 30, Math.random() * 6]);
  // Schnee auf den Dächern: weisse Haube etwas über jedem Dach
  const snowMat = toon('#F4F7FA');
  for (const g of w.houses || []) {
    const u = g.userData; if (!u.roofH) continue;
    const rw = u.w + 0.9, rh = u.roofH, d = u.d + 0.7;
    const sh = new THREE.Shape(); sh.moveTo(-rw / 2 - 0.02, 0); sh.lineTo(0, rh + 0.06); sh.lineTo(rw / 2 + 0.02, 0); sh.lineTo(rw / 2 - 0.12, -0.02); sh.lineTo(0, rh - 0.1); sh.lineTo(-rw / 2 + 0.12, -0.02); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: d + 0.04, bevelEnabled: false }); geo.translate(0, u.h + 0.07, -(d + 0.04) / 2);
    const m = new THREE.Mesh(geo, snowMat); m.visible = false; g.add(m); S.roofSnow.push(m);
  }
  S.snowmen = [snowman(w, -6, 11, 0.4), snowman(w, 44, 18, -0.6), snowman(w, -36, 10, 1.2), snowman(w, 3, 44, 0.2)];
  // Zubehör für die Dorfleute
  const ucol = [PAL.rot, PAL.blau, PAL.ocker, PAL.matte, '#8E5BA8', PAL.tinte];
  (w.villagers || []).forEach((v, i) => {
    const t = v.b.torso;
    const um = umbrella(ucol[i % ucol.length]); um.position.set(0.3, 0.45, 0.05); um.rotation.z = -0.15; um.visible = false; t.add(um);
    const sg = shades(); sg.position.set(0, 0.74, 0.31); sg.visible = false; t.add(sg);
    const ic = iceCream(); ic.position.set(0, -0.3, 0.06); ic.visible = false; v.b.arms[0].add(ic);
    const ww = winterWear(ucol[(i + 2) % ucol.length]); ww.visible = false; t.add(ww);
    v.wx = { um, sg, ic, ww };
  });
}

// Boden im Dorf und draussen: Farbe des Geländematerials anpassen (nass dunkler, Schnee heller)
function groundTint(w, kind) {
  for (const m of w.landscape || []) {
    const mat = m.material; if (!mat || !mat.isMeshToonMaterial || !mat.vertexColors) continue;
    if (m.isInstancedMesh) { if (!mat.userData.e0) mat.userData.e0 = mat.emissive.clone(); mat.emissive.copy(kind === 'snow' ? new THREE.Color('#5E666E') : mat.userData.e0); continue; }
    if (!mat.userData.baseColor) mat.userData.baseColor = mat.color.clone();
    mat.color.copy(mat.userData.baseColor);
    if (!mat.emissive) continue;
    mat.emissive.set(0x000000);
    if (kind === 'rain' || kind === 'storm') mat.color.multiplyScalar(0.8);
    if (kind === 'snow') { mat.color.setRGB(0.55, 0.58, 0.62); mat.emissive.set('#C8D0D8'); }
    if (kind === 'sun') mat.color.setRGB(1.04, 1.02, 0.95);
  }
}

export function weatherFX(w, kind) {
  if (!built) build(w);
  S.kind = kind || null;
  const wet = kind === 'rain' || kind === 'storm', sun = kind === 'sun', snow = kind === 'snow';
  S.puddleMat.opacity = wet ? 0.75 : 0;
  S.puddles.forEach(p => { p.visible = wet; });
  S.rings.visible = wet; S.butter.visible = sun; S.flakes.visible = snow;
  S.roofSnow.forEach(m => { m.visible = snow; }); S.snowmen.forEach(m => { m.visible = snow; });
  (w.villagers || []).forEach((v, i) => {
    if (!v.wx) return;
    v.wx.um.visible = wet; v.wx.sg.visible = sun && i % 2 === 0; v.wx.ic.visible = sun && i % 3 !== 1; v.wx.ww.visible = snow;
    // bei Regen bleibt jeder Dritte drinnen
    v.b.root.visible = !(wet && i % 3 === 2);
  });
  groundTint(w, kind);
  if (wet) { w.scene.background = new THREE.Color(kind === 'storm' ? '#6F7A86' : '#9AA6B1'); w.sun.intensity = kind === 'storm' ? 0.8 : 1.0; w.amb.intensity = 0.95; w.syncSky && w.syncSky(); }
  if (snow) { w.scene.background = new THREE.Color('#D9E2EA'); w.sun.intensity = 1.5; w.syncSky && w.syncSky(); }
}

export function stepWeatherFX(w, dt, tm) {
  if (!built || !S.kind) return;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  if (S.rings.visible) {
    S.ringP.forEach((r, i) => {
      r.t += dt * 1.6; if (r.t > 1) { r.t = 0; const pd = S.puddles[Math.floor(Math.random() * S.puddles.length)]; r.x = pd.position.x + (Math.random() - 0.5) * pd.scale.x; r.z = pd.position.z + (Math.random() - 0.5) * pd.scale.y; }
      const sc = 0.05 + r.t * 0.35; s.set(sc, 1, sc); p.set(r.x, 0.045, r.z); m.compose(p, q, s); S.rings.setMatrixAt(i, m);
    });
    S.rings.instanceMatrix.needsUpdate = true;
  }
  if (S.butter.visible) {
    S.butterP.forEach((b, i) => {
      const a = tm * b.sp + b.ph, x = b.hx + Math.sin(a) * 2.5 + Math.sin(a * 2.3) * 0.8, z = b.hz + Math.cos(a * 0.8) * 2.5, y = 0.8 + Math.sin(a * 3) * 0.35, flap = Math.sin(tm * 18 + b.ph) * 1.1;
      for (const k of [0, 1]) { q.setFromEuler(new THREE.Euler(0, a, (k ? 1 : -1) * flap)); s.set(1, 1, 1); const off = new THREE.Vector3(k ? 0.07 : -0.07, 0, 0).applyQuaternion(q); p.set(x + off.x, y + off.y, z + off.z); m.compose(p, q, s); S.butter.setMatrixAt(i * 2 + k, m); }
    });
    S.butter.instanceMatrix.needsUpdate = true;
  }
  if (S.flakes.visible) {
    const a = S.flakes.geometry.attributes.position.array, c = w.camera.position;
    S.flakeP.forEach((f, i) => {
      f[1] -= dt * 1.4; if (f[1] < 0) { f[1] = 22; f[0] = Math.random() * 60 - 30; f[2] = Math.random() * 60 - 30; }
      a[i * 3] = c.x + f[0] + Math.sin(tm * 0.8 + f[3]) * 0.6; a[i * 3 + 1] = f[1]; a[i * 3 + 2] = c.z - 10 + f[2];
    });
    S.flakes.geometry.attributes.position.needsUpdate = true;
  }
}
