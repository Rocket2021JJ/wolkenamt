// FEIERABEND – Hauptschleife: Welt, Eingabe, Kamera, Spiellogik, Netz.
import * as THREE from 'three';
import * as A from './audio.js';
import * as LG from './lingo.js';
import { PAL, PLAYER_COLS, rng } from './palette.js';
import { toon } from './toon.js';
import { buildTerrain, buildRoads, buildTrees, buildSky, C } from './world.js';
import { buildVillage, SPOTS } from './village.js';
import { terrainY, groundAt, near, SEA, solids } from './solid.js';
import { bodies, bodyById, stepBodies, drawBodies, populate, respawn, GRAV } from './props.js';
import { Char, chars, RAD } from './chars.js';
import { Vehicle, vehicles, buildRamps, VKINDS } from './vehicles.js';
import { net, host as netHost, join as netJoin, bcast, toHost, toPeer, reset as netReset, slotOf, netAvailable, LOCALTEST } from './net.js';
import { clamp } from './geo.js';

const $ = id => document.getElementById(id);
const cv = $('cv');
const lowgfx = (() => { try { return localStorage.getItem('fa-low') === '1'; } catch (e) { return false; } })();
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !lowgfx, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, lowgfx ? 1 : 1.75));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#CBE6F2', 90, 330);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);
const hemi = new THREE.HemisphereLight('#E6F2FF', '#7A9A55', 1.15); scene.add(hemi);
const sun = new THREE.DirectionalLight('#FFF1D6', 2.1); sun.castShadow = true;
sun.shadow.mapSize.set(lowgfx ? 1024 : 2048, lowgfx ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 220 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------------- Welt ----------------
const t0 = performance.now();
buildTerrain(scene);
buildRoads(scene);
const SKY = buildSky(scene);
buildVillage(scene);
buildRamps(scene);
buildTrees(scene, (x, z, r) => near(x, z).some(o => !o.circle && Math.abs(x - o.x) < o.hx + r + 2 && Math.abs(z - o.z) < o.hz + r + 2) || Math.hypot(x, z) < 40);
populate(scene, SPOTS);
const vstart = [['auto', 6, 30, 0.2], ['auto', -38, -8, 1.6], ['traktor', -84, 30, 2.2], ['bus', 9, 40, 1.57], ['maeher', -12, 30, 0.5], ['kiste', 78, -66, -0.86], ['kiste', 74, -64, -0.9], ['auto', 30, 96, 1.3]];
for (const [k, x, z, y] of vstart) new Vehicle(scene, k, x, z, y);
console.log('Welt gebaut in', Math.round(performance.now() - t0), 'ms');

// Goldene Stempel zum Finden
const STAMPS = [[0, 2.9, 0], [-22, 0, -6, 'roof'], [22, 0, 10, 'roof'], [10, 0, 22, 'roof'], [-10, 0, -26, 'church'], [90, 8.2, -80], [37, 1.4, 117.5, 'pier'], [-46, 0, -62, 'pond'], [-92, 0, 40, 'roof'], [-104, 0, 18], [104, 0, 40], [60, 0, -95], [-86, 0, 18], [-70, 0, 60], [30, 0, 92], [-40, 0, -100], [-110, 0, -40], [0, 0, 64, 'ramp'], [-26, 0, 30, 'tramp'], [46, 0, 14], [70, 0, 86], [-120, 0, 10], [120, 0, -10], [8, 0, -80], [-60, 0, 100]];
const stampGeo = new THREE.CylinderGeometry(0.3, 0.38, 0.35, 12), stampMat = toon(C.gelb, { emissive: '#7A5A10', emissiveIntensity: 0.6 });
const stamps = STAMPS.map(([x, y, z, tag], i) => {
  let yy = y || terrainY(x, z) + 1.2;
  if (tag === 'roof') yy = groundAt(x, 40, z, 0)[0] + 0.9;
  if (tag === 'church') yy = groundAt(x, 40, z, 0)[0] + 0.9;
  if (tag === 'pond') yy = 0.6;
  if (tag === 'ramp') yy = terrainY(x, z) + 5.5;
  if (tag === 'tramp') yy = terrainY(x, z) + 7;
  if (tag === 'pier') yy = 1.4;
  const g = new THREE.Group(); const m = new THREE.Mesh(stampGeo, stampMat); m.castShadow = true; g.add(m);
  const h = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8), toon(C.holz)); h.position.y = 0.35; g.add(h);
  const k = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), toon(C.holz)); k.position.y = 0.58; g.add(k);
  g.position.set(x, yy, z); scene.add(g); return { g, x, y: yy, z, i };
});
$('stT').textContent = stamps.length;

// Partikel (Splitter, Spritzer, Staub)
const parts = []; const pGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
function burst(x, y, z, col, n = 10, sp = 4, up = 4) {
  for (let i = 0; i < n; i++) {
    let p = parts.find(q => q.life <= 0); if (!p) { if (parts.length > 220) break; p = { m: new THREE.Mesh(pGeo, toon(col)), v: new THREE.Vector3(), life: 0 }; scene.add(p.m); parts.push(p); }
    p.m.material = toon(col); p.m.visible = true; p.m.position.set(x, y, z); p.v.set((Math.random() - 0.5) * sp * 2, Math.random() * up + 1, (Math.random() - 0.5) * sp * 2); p.life = 0.6 + Math.random() * 0.6; const s = 0.6 + Math.random() * 0.9; p.m.scale.set(s, s, s);
  }
}
function stepParts(dt) { for (const p of parts) { if (p.life <= 0) continue; p.life -= dt; p.v.y -= 18 * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += dt * 5; p.m.rotation.y += dt * 4; if (p.m.position.y < terrainY(p.m.position.x, p.m.position.z)) { p.v.multiplyScalar(0.4); p.v.y = Math.abs(p.v.y); } if (p.life <= 0) p.m.visible = false; else if (p.life < 0.3) p.m.scale.multiplyScalar(0.92); } }

// ---------------- Figuren ----------------
const NAMES_NPC = ['Gerber', 'Moser', 'Zbinden', 'Elsbeth', 'Brunner', 'Käser', 'Frau Wyss', 'Sepp', 'Vreni', 'Ruedi'];
const HATS = ['filz', 'tuch', 'zipfel'], NPCCOL = ['#7A8F5A', '#B5654A', '#6E7FA6', '#C9A24A', '#8E6AA0', '#5E9A8A', '#C77A9A', '#9A7A5A', '#6F8F4E', '#A0524A'];
const npcs = NAMES_NPC.map((n, i) => {
  const c = new Char(scene, NPCCOL[i], { villager: true, hat: HATS[i % 3], hatColor: [PAL.chalet, C.rot, C.blau, PAL.tinte][i % 4], kind: 'npc', id: 'n' + i, name: n });
  const a = i / NAMES_NPC.length * 6.28, r = 8 + (i % 3) * 7; c.place(Math.cos(a) * r, terrainY(Math.cos(a) * r, Math.sin(a) * r), Math.sin(a) * r); c.yaw = a;
  c.voice = A.voiceFor(n); c.home = [c.p.x, c.p.z]; c.ai.wait = Math.random() * 3; return c;
});
const me = new Char(scene, PLAYER_COLS[0], { kind: 'me', id: 'host', name: 'Du' });
{ const [x, z] = SPOTS.spawns[0]; me.place(x, terrainY(x, z) + 0.2, z); me.yaw = Math.PI; }
const remotes = new Map(); // id -> Char

// ---------------- Eingabe ----------------
const keys = {}; let mouseDown = false, chargeT = 0, camYaw = 0, camPitch = 0.32, camDist = 6.5, lastMouse = 0, locked = false, playing = false;
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (!playing) return;
  if (e.code === 'Tab') { e.preventDefault(); toggleBook(); }
  if (e.code === 'KeyE') useAction();
  if (e.code === 'KeyR' && !me.inVeh) { me.stumble(hooks); sendFx('oops', me.p); }
  if (e.code === 'KeyQ') { me.waveT = 1.4; }
  if (e.code === 'KeyB') shout(me);
  if (e.code === 'KeyH' && me.inVeh) honk(me.inVeh, true);
  if (e.code === 'Escape') openMenu();
});
addEventListener('keyup', e => { keys[e.code] = false; });
cv.addEventListener('mousedown', e => {
  if (!playing) return;
  A.ensureAudio();
  if (!locked) { cv.requestPointerLock && cv.requestPointerLock(); }
  if (e.button === 0) { mouseDown = true; chargeT = 0; if (!me.held) { tryGrab(); mouseDown = false; } }
  if (e.button === 2) dropHeld(false);
});
addEventListener('mouseup', e => { if (e.button === 0 && mouseDown) { mouseDown = false; if (me.held) throwHeld(); } });
cv.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === cv; if (!locked && playing && !LOCALTEST && !window.__test) openMenu(); });
addEventListener('mousemove', e => { if (!locked) return; camYaw -= e.movementX * 0.0032; camPitch = clamp(camPitch + e.movementY * 0.0026, -0.5, 1.3); lastMouse = performance.now(); });
addEventListener('wheel', e => { camDist = clamp(camDist + Math.sign(e.deltaY) * 0.8, 3, 16); }, { passive: true });

// ---------------- Hooks für Physik (Geräusche, Effekte, Erlebnisse) ----------------
const dist = p => p.distanceTo(camera.position);
const hooks = {
  splash(o) { const p = o.p; A.fun('splash', dist(p), 1); burst(p.x, SEA + 0.1, p.z, '#BFE6F5', 14, 3, 5); if (o === me) ach('nass'); },
  boing(o, s) { A.fun('boing', dist(o.p)); const t = SPOTS.trampolines.find(q => q.box === s); if (t) t.k = 1; if (o === me) { me.boings = (me.boingT > 0 ? (me.boings || 0) + 1 : 1); me.boingT = 2.5; if (me.boings >= 3) ach('trampolin'); } },
  impact(b, imp) { if (b.K.burst && imp > b.K.burst && net.host) burstBody(b); else A.fun(b.kind === 'kiste' || b.kind === 'kegel' ? 'wood' : 'thud', dist(b.p), imp / 4); },
  clack(a, c, v) { if (a.kind === 'kegel' || c.kind === 'kegel') A.fun('pins', dist(a.p)); else A.fun('wood', dist(a.p), v / 4); },
  pin(b) { },
  cluck(b) { if (b.K.alive === 'kuh') A.fun('moo', dist(b.p)); else A.fun('hen', dist(b.p)); },
  nearestChar(p, r) { if (!r) return null; for (const c of allChars()) { if (c.inVeh) continue; if (Math.abs(c.p.x - p.x) < r && Math.abs(c.p.z - p.z) < r) return c.p; } return null; },
  jump(c) { if (c === me) A.sfx('jump'); },
  land(c) { if (c === me) A.sfx('land'); },
  thud(c, imp) { A.fun('thud', dist(c.p), 3); burst(c.p.x, c.p.y + 0.2, c.p.z, '#C9B48A', 5, 2, 2); if (c.kind === 'npc' && Math.random() < 0.6) A.gesture(Math.random() < 0.5 ? 'oh' : 'hmpf', c.voice, { gain: Math.max(0.1, 1 - dist(c.p) / 25) }); },
  tumble(c) { A.sfx('tumble'); if (c === me) { ach('stolper'); stats.trips++; } },
  fellOff(c) { const [x, z] = SPOTS.spawns[0]; c.place(x, terrainY(x, z) + 1, z); },
  crash(v, k) { A.fun('crash', dist(v.p)); shake = Math.min(0.6, k * 0.04); burst(v.p.x, v.p.y + 0.6, v.p.z, '#C9B48A', 6, 3, 3); },
  land(v, imp, air) { if (v.p !== undefined && v.K) { A.fun('thud', dist(v.p), imp / 3); if (v.driver === net.id && air > 1.5) ach('rampe'); } else if (v === me) A.sfx('land'); },
};
// zwei Hooks heissen «land»: Figuren und Fahrzeuge unterscheiden
const charLand = c => { if (c === me) A.sfx('land'); };
const charHooks = Object.assign({}, hooks, { land: charLand });
const vehHooks = Object.assign({}, hooks);

function allChars() { const a = [me, ...npcs]; for (const r of remotes.values()) a.push(r); return a; }
function charById(id) { if (id === net.id) return me; if (id && id[0] === 'n' && !remotes.has(id)) return npcs[+id.slice(1)]; return remotes.get(id); }

// ---------------- Erlebnisse ----------------
const ACH = {
  stolper: 'Über eine Schwelle gestolpert', nass: 'Ins Wasser geplumpst', kanone: 'Aus der Kanone geschossen', huhn: 'Ein Huhn geworfen',
  strike: 'Alle Kegel umgeworfen', rampe: 'Mit einem Fahrzeug weit geflogen', glocke: 'Die Kirchenglocke geläutet', umfahren: 'Jemanden umgefahren',
  melone: 'Eine Melone zerplatzen lassen', trampolin: 'Dreimal hintereinander aufs Trampolin', turm: 'Auf dem Aussichtsturm gestanden', dach: 'Auf einem Dach gestanden',
  bus: 'Mit dem Dorfbus zur Haltestelle', seifenkiste: 'Mit der Seifenkiste den Hügel hinunter', werfen: 'Ein anderes Beamtli geworfen', getragen: 'Einen Dorfbewohner herumgetragen', stempel: 'Alle goldenen Stempel gefunden',
};
const SAVE = 'feierabend-v1';
let save = { ach: {}, stamps: [] };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE) || '{}')); } catch (e) {}
const stats = { trips: 0 };
function persist() { try { localStorage.setItem(SAVE, JSON.stringify(save)); } catch (e) {} }
function ach(k) { if (save.ach[k]) return; save.ach[k] = Date.now(); persist(); toast('Erlebnis: ' + ACH[k], 'gold'); A.fun('achieve'); }
function toast(txt, cls = '', sub = '') { const d = document.createElement('div'); d.className = 'toast ' + cls; d.innerHTML = txt + (sub ? '<small>' + sub + '</small>' : ''); $('toasts').appendChild(d); setTimeout(() => d.remove(), 3600); }
function toggleBook() { const b = $('book'); b.classList.toggle('hidden'); $('bookList').innerHTML = Object.entries(ACH).map(([k, t]) => `<div class="${save.ach[k] ? 'got' : 'no'}">${save.ach[k] ? '★' : '☆'} ${t}</div>`).join('') + `<div>Gefundene Stempel: <b>${save.stamps.length}</b> / ${stamps.length}</div>`; }
for (const s of stamps) if (save.stamps.includes(s.i)) s.g.visible = false;
$('stN').textContent = save.stamps.length;

// ---------------- Aufheben, Werfen ----------------
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function fwd() { return [Math.sin(me.yaw), Math.cos(me.yaw)]; }
function grabTarget() {
  const [fx, fz] = fwd(); let best = null, bd = 2.4;
  for (const b of bodies) { if (!b.alive || b.K.heavy || (b.held && b.held !== net.id)) continue; const dx = b.p.x - me.p.x, dz = b.p.z - me.p.z, dy = b.p.y - me.p.y; if (dy > 2.2 || dy < -1) continue; const d = Math.hypot(dx, dz); if (d > 2.0) continue; const front = (dx * fx + dz * fz) / (d || 1); const s = d - front * 0.8; if (s < bd) { bd = s; best = { type: 'b', id: b.id, o: b }; } }
  for (const c of allChars()) { if (c === me || c.inVeh || c.heldBy) continue; const dx = c.p.x - me.p.x, dz = c.p.z - me.p.z, d = Math.hypot(dx, dz); if (d > 1.7 || Math.abs(c.p.y - me.p.y) > 1.5) continue; const front = (dx * fx + dz * fz) / (d || 1); const s = d - front * 0.8 + 0.2; if (s < bd) { bd = s; best = { type: 'c', id: c.id, o: c }; } }
  return best;
}
function tryGrab() {
  if (me.inVeh || me.busy) return;
  const t = grabTarget(); if (!t) return;
  me.held = { type: t.type, id: t.id }; me.heldBig = t.type === 'c' || (t.o.K && t.o.K.big);
  A.fun('grab');
  if (net.host) hostGrab(net.id, t.type, t.id); else toHost({ t: 'grab', k: t.type, id: t.id });
  if (t.type === 'b' && t.o.kind === 'huhn') A.fun('hen');
}
function throwVec(power) {
  const cp = Math.cos(camPitch), dir = new THREE.Vector3(-Math.sin(camYaw) * 1, 0, -Math.cos(camYaw) * 1);
  const up = clamp(0.35 - (camPitch - 0.3) * 0.9, -0.2, 1.0);
  return [dir.x * power + me.v.x * 0.5, up * power + 2.5, dir.z * power + me.v.z * 0.5];
}
function throwHeld() {
  const h = me.held; if (!h) return;
  const power = 7 + Math.min(1, chargeT / 0.9) * 15;
  const v = throwVec(power);
  me.yaw = Math.atan2(v[0], v[2]);
  A.fun('throw', 0, power / 22); me.b.armS[0].v -= 20; me.b.armS[1].v -= 20;
  if (h.type === 'b') { const b = bodyById(h.id); if (b && b.kind === 'huhn') { ach('huhn'); A.fun('hen'); } }
  if (h.type === 'c') { const c = charById(h.id); if (c && c.kind === 'remote') ach('werfen'); }
  me.held = null; chargeT = 0;
  if (net.host) hostRelease(net.id, h, v); else toHost({ t: 'throw', h, v });
}
function dropHeld() { const h = me.held; if (!h) return; me.held = null; const v = [me.v.x + Math.sin(me.yaw) * 1.5, 1.5, me.v.z + Math.cos(me.yaw) * 1.5]; if (net.host) hostRelease(net.id, h, v); else toHost({ t: 'throw', h, v }); }
me.dropHeld = dropHeld;

// Host: wer hält was
function hostGrab(holderId, type, id) {
  if (type === 'b') { const b = bodyById(id); if (!b || !b.alive || (b.held && b.held !== holderId)) return deny(holderId); b.held = holderId; b.sleep = 0; }
  else { const c = charById(id); if (!c || c.heldBy || c.inVeh) return deny(holderId); c.heldBy = holderId; if (c === me) { me.heldBy = holderId; if (me.held) dropHeld(); toast('Du wirst getragen!', '', 'Leertaste: zappeln'); } else if (c.kind === 'remote') toPeer(c.id, { t: 'carried', by: holderId }); else { A.gesture('oh', c.voice, { gain: 0.6 }); if (holderId === net.id) setTimeout(() => ach('getragen'), 2500); } }
}
function deny(holderId) { if (holderId === net.id) { me.held = null; } else toPeer(holderId, { t: 'deny' }); }
function hostRelease(holderId, h, v) {
  if (h.type === 'b') { const b = bodyById(h.id); if (!b || b.held !== holderId) return; b.held = null; b.v.set(v[0], v[1], v[2]); b.w.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8); b.sleep = 0; b.lastBy = holderId; b.thrownT = 1.2; }
  else { const c = charById(h.id); if (!c || c.heldBy !== holderId) return; c.heldBy = null; if (c === me) { me.heldBy = null; me.fling(v[0], v[1], v[2]); } else if (c.kind === 'remote') toPeer(c.id, { t: 'fling', v }); else c.fling(v[0], v[1], v[2]); }
}
function carriedPos(c) { const h = charById(c.heldBy); if (!h) return null; return h.hand(true, tmp2); }

// ---------------- Benutzen (E) ----------------
function nearestVehicle() { let best = null, bd = 1e9; for (const v of vehicles) { const d = Math.hypot(v.p.x - me.p.x, v.p.z - me.p.z) - v.K.hz * 0.6; if (d < 2.4 && d < bd) { bd = d; best = v; } } return best; }
function nearSpot(list, r) { return list.find(s => Math.hypot(s.x - me.p.x, s.z - me.p.z) < r); }
let inCannon = null;
function useAction() {
  if (me.heldBy) return;
  if (me.inVeh) { exitVehicle(); return; }
  if (me.busy) return;
  const v = nearestVehicle(); if (v) { if (me.held) dropHeld(); if (net.host) { hostEnter(net.id, v.id); if (!me.inVeh) toast('Fahrzeug ist voll'); } else { toHost({ t: 'enter', id: v.id }); setTimeout(() => { if (!me.inVeh) toast('Einsteigen klappt nicht', '', 'Keine Antwort vom Raum-Eröffner oder Fahrzeug voll'); }, 1500); } return; }
  const c = nearSpot(SPOTS.cannons, 2.4); if (c && !inCannon) { if (me.held) dropHeld(); inCannon = { c, t: 1.1 }; me.b.root.visible = false; A.fun('pop'); toast('3… 2… 1…'); return; }
  const bl = nearSpot(SPOTS.bells, 2); if (bl) { ringBell(); sendFx('bell', bl); ach('glocke'); return; }
  const kz = SPOTS.zones.find(z => z.kind === 'kegel'); if (kz && Math.hypot(kz.x - me.p.x, kz.z - me.p.z) < 4) { if (net.host) resetPins(); else toHost({ t: 'pins' }); toast('Kegel neu aufgestellt'); }
}
function hintText() {
  if (me.heldBy) return 'Leertaste: zappeln, um loszukommen';
  if (me.inVeh) return me.inVeh.driver === net.id ? 'W/S Gas · A/D lenken · Leertaste Handbremse · H hupen · E aussteigen' : 'Mitfahrer · E aussteigen · B rufen';
  if (me.held) return 'Klick halten und loslassen: werfen · Rechtsklick: ablegen';
  if (inCannon) return '';
  const v = nearestVehicle(); if (v) return `E: ${v.driver ? 'Mitfahren' : 'Einsteigen'} (${v.K.name})`;
  if (nearSpot(SPOTS.cannons, 2.4)) return 'E: In die Kanone klettern';
  if (nearSpot(SPOTS.bells, 2)) return 'E: Glocke läuten';
  const kz = SPOTS.zones.find(z => z.kind === 'kegel'); if (kz && Math.hypot(kz.x - me.p.x, kz.z - me.p.z) < 4) return 'E: Kegel neu aufstellen';
  const t = grabTarget(); if (t) return 'Klick: ' + (t.type === 'c' ? (t.o.name || 'Beamtli') + ' hochheben' : 'aufheben');
  return '';
}
function ringBell() { A.fun('bell', 0); A.churchBells(4); const b = SPOTS.bells[0]; if (b) b.t = 3; }

// Fahrzeuge betreten
function hostEnter(pid, vid) {
  const v = vehicles.find(q => q.id === vid); if (!v) return;
  let seat = -1;
  if (!v.driver) { v.driver = pid; seat = 0; } else if (v.pass.length < v.K.seats - 1 && !v.pass.includes(pid)) { v.pass.push(pid); seat = v.pass.length; }
  if (seat < 0) return;
  if (pid === net.id) sitIn(v, seat); else toPeer(pid, { t: 'seat', id: vid, seat });
}
function hostExit(pid) { for (const v of vehicles) { if (v.driver === pid) { v.driver = null; v.speed *= 0.5; } v.pass = v.pass.filter(q => q !== pid); } }
let engine = null;
function sitIn(v, seat) {
  me.inVeh = v; me.seat = seat; me.v.set(0, 0, 0); A.fun('pop');
  if (seat === 0) { if (v.net) { v.p.copy(v.net.p); v.yaw = v.net.yaw; } v.net = null; v.driver = net.id; engine = A.engine(); }
  if (v.kind === 'bus') toast('Fahr zur Haltestelle im Dorf!', '', 'Mitspieler können mit E mitfahren');
  if (v.kind === 'kiste') toast('Seifenkiste: kein Motor', '', 'Lass sie den Hügel hinunterrollen');
}
function exitVehicle() {
  const v = me.inVeh; if (!v) return;
  me.inVeh = null; if (engine) { engine.stop(); engine = null; }
  const s = Math.sin(v.yaw), c = Math.cos(v.yaw); const side = v.K.hx + 0.9;
  me.place(v.p.x + c * side, v.p.y + 0.5, v.p.z - s * side); me.v.set(v.v.x * 0.6, 2, v.v.z * 0.6);
  if (Math.abs(v.speed) > 6) me.fling(v.v.x * 0.8, 4, v.v.z * 0.8);
  if (net.host) hostExit(net.id); else toHost({ t: 'exit' });
}
function honk(v, mine) { v.horn = 0.35; A.fun('horn', dist(v.p), v.kind === 'bus' ? 0.75 : v.kind === 'traktor' ? 0.6 : 1); if (mine) sendFx('horn', { x: v.id }); }

// Rufen (Wolkwilisch)
const CALLS = ['Hoppla!', 'Hallo zusammen!', 'Feierabend!', 'Wirf mir das!', 'Achtung!', 'Wo bist du?', 'Komm her!', 'Juhuu!', 'Nicht schon wieder!', 'Mir nach!'];
function shout(c, line) {
  line = line || CALLS[(Math.random() * CALLS.length) | 0];
  const voice = c === me || c.kind === 'remote' ? Object.assign(A.voiceFor('Spieler' + (c === me ? slotOf(net.id) : c.slot || 0)), {}) : c.voice;
  A.speak(LG.syllables(LG.translate(line)), voice, { gain: Math.max(0.1, 1 - dist(c.p) / 30), mood: line.endsWith('!') ? '!' : line.endsWith('?') ? '?' : '', interrupt: false });
  c.bubble = { txt: LG.translate(line), t: 2.5 };
  if (c === me) sendFx('shout', { line });
}

// Kegel
function pinsDown() { const pins = bodies.filter(b => b.kind === 'kegel'); return pins.length && pins.every(b => b.fallen || tilt(b) > 0.6) ; }
function tilt(b) { tmp.set(0, 1, 0).applyQuaternion(b.q); return 1 - tmp.y; }
function resetPins() { for (const b of bodies) if (b.kind === 'kegel' || b.kind === 'kugel') respawn(b); strikeDone = false; }
let strikeDone = false;

// Melonen zerplatzen
function burstBody(b) { b.alive = false; b.held = null; sendFx('splat', b.p); splat(b.p); setTimeout(() => respawn(b), 25000); if (b.lastBy === net.id) ach('melone'); else if (b.lastBy) toPeer(b.lastBy, { t: 'ach', k: 'melone' }); }
function splat(p) { A.fun('splat', dist(p)); burst(p.x, p.y, p.z, '#E0473A', 10, 3, 4); burst(p.x, p.y, p.z, C.gruen, 6, 3, 3); }

// ---------------- Netz ----------------
function sendFx(k, d) { const m = { t: 'fx', k, d: d.x !== undefined && d.isVector3 ? { x: d.x, y: d.y, z: d.z } : d, from: net.id }; if (!net.on) return; if (net.host) bcast(m); else toHost(m); }
function onFx(m) {
  const c = charById(m.from);
  if (m.k === 'bell') ringBell();
  else if (m.k === 'splat') splat(new THREE.Vector3(m.d.x, m.d.y, m.d.z));
  else if (m.k === 'boom') { A.fun('boom', Math.hypot(m.d.x - camera.position.x, m.d.z - camera.position.z)); burst(m.d.x, m.d.y, m.d.z, '#E9E6DA', 12, 3, 4); }
  else if (m.k === 'horn') { const v = vehicles.find(q => q.id === m.d.x); if (v) honk(v, false); }
  else if (m.k === 'shout' && c) shout(c, m.d.line);
  else if (m.k === 'oops' && c) { }
}
function myState() {
  const f = (me.grounded ? 1 : 0) | (me.down > 0 ? 2 : 0) | (me.fly > 0 ? 4 : 0) | (me.heldBy ? 8 : 0) | (me.wet ? 16 : 0) | (me.waveT > 0 ? 32 : 0) | (me.heldBig ? 64 : 0) | (inCannon ? 128 : 0);
  return [+me.p.x.toFixed(2), +me.p.y.toFixed(2), +me.p.z.toFixed(2), +me.yaw.toFixed(2), +me.v.x.toFixed(1), +me.v.y.toFixed(1), +me.v.z.toFixed(1), f, me.held ? me.held.type + me.held.id : 0, me.inVeh ? me.inVeh.id : 0];
}
function vehState(v) { return [v.id, +v.p.x.toFixed(2), +v.p.y.toFixed(2), +v.p.z.toFixed(2), +v.yaw.toFixed(3), +v.pitch.toFixed(2), +v.roll.toFixed(2), +v.speed.toFixed(1), v.driver || 0, v.pass.join(',')]; }
function applyRemote(id, s) {
  let r = remotes.get(id);
  if (!r) { r = new Char(scene, PLAYER_COLS[slotOf(id) % 3], { kind: 'remote', id, name: (net.players.find(p => p.id === id) || {}).name || '?' }); r.slot = slotOf(id); r.place(s[0], s[1], s[2]); remotes.set(id, r); r.tgt = new THREE.Vector3(); }
  if (r.slot !== slotOf(id)) { r.slot = slotOf(id); const old = r.b; const nb = new (old.constructor)(PLAYER_COLS[r.slot % 3]); old.dispose(); r.b = nb; scene.add(nb.root); r.name = (net.players.find(p => p.id === id) || {}).name || r.name; }
  r.tgt.set(s[0], s[1], s[2]); r.tyaw = s[3]; r.v.set(s[4], s[5], s[6]); const f = s[7];
  r.grounded = !!(f & 1); r.wet = !!(f & 16); r.heldBig = !!(f & 64); r.hidden = !!(f & 128);
  if ((f & 2 || f & 4) && !r.b.down) r.b.tumble();
  r.fly = f & 4 ? 1 : 0; r.flagHeld = !!(f & 8);
  if (f & 32 && !(r.waveT > 0)) r.waveT = 1.4;
  r.held = s[8] ? { type: s[8][0], id: s[8][0] === 'b' ? +s[8].slice(1) : s[8].slice(1) } : null;
  r.inVeh = s[9] ? vehicles.find(v => v.id === s[9]) : null;
  r.last = performance.now();
}
// Host → alle: Weltstand
let netT = 0, fullT = 0;
function hostSend(dt) {
  netT += dt; if (netT < 1 / 15) return; netT = 0; fullT += 1 / 15;
  const full = fullT > 1.5; if (full) fullT = 0;
  const B = [];
  for (const b of bodies) { if (!full && b.sleep > 1.2 && !b.held && b.sentAsleep) continue; b.sentAsleep = b.sleep > 1.2; B.push([b.id, +b.p.x.toFixed(2), +b.p.y.toFixed(2), +b.p.z.toFixed(2), +b.q.x.toFixed(3), +b.q.y.toFixed(3), +b.q.z.toFixed(3), +b.q.w.toFixed(3), b.held || 0, b.alive ? 1 : 0, b.fallen ? 1 : 0]); }
  const N = npcs.map(c => [+c.p.x.toFixed(2), +c.p.y.toFixed(2), +c.p.z.toFixed(2), +c.yaw.toFixed(2), +c.v.x.toFixed(1), +c.v.z.toFixed(1), (c.grounded ? 1 : 0) | (c.down > 0 ? 2 : 0) | (c.fly > 0 ? 4 : 0) | (c.heldBy ? 8 : 0), c.heldBy || 0]);
  const P = [[net.id, ...myState()]]; for (const [id, r] of remotes) if (r.raw) P.push([id, ...r.raw]);
  const V = vehicles.map(vehState);
  bcast({ t: 'w', B, N, P, V });
}
function clientSend(dt) {
  netT += dt; if (netT < 1 / 15) return; netT = 0;
  const m = { t: 's', s: myState() };
  if (me.inVeh && me.inVeh.driver === net.id) m.v = vehState(me.inVeh);
  toHost(m);
}
net.on_msg = (from, m) => {
  lastMsg[from] = performance.now();
  if (net.host) {
    const r = remotes.get(from);
    if (m.t === 's') { if (!r) applyRemote(from, m.s); const rr = remotes.get(from); rr.raw = m.s; applyRemote(from, m.s); if (m.v) adoptVeh(m.v, from); }
    else if (m.t === 'grab') hostGrab(from, m.k, m.id);
    else if (m.t === 'throw') hostRelease(from, m.h, m.v);
    else if (m.t === 'enter') hostEnter(from, m.id);
    else if (m.t === 'exit') hostExit(from);
    else if (m.t === 'pins') resetPins();
    else if (m.t === 'free') { const c = charById(m.id); if (c && c.heldBy) { const h = charById(c.heldBy); if (h === me) { me.held = null; } else if (h) toPeer(h.id, { t: 'lost' }); c.heldBy = null; } }
    else if (m.t === 'hitb') { const b = bodyById(m.id); if (b) { b.v.x += m.v[0]; b.v.y += m.v[1]; b.v.z += m.v[2]; b.sleep = 0; } }
    else if (m.t === 'fx') { onFx(m); bcast(m, from); }
    return;
  }
  // Client
  if (m.t === 'w') clientWorld(m);
  else if (m.t === 'seat') { const v = vehicles.find(q => q.id === m.id); if (v) sitIn(v, m.seat); }
  else if (m.t === 'carried') { me.heldBy = m.by; if (me.held) dropHeld(); toast('Du wirst getragen!', '', 'Leertaste: zappeln'); }
  else if (m.t === 'fling') { me.heldBy = null; me.fling(m.v[0], m.v[1], m.v[2]); }
  else if (m.t === 'deny' || m.t === 'lost') { me.held = null; }
  else if (m.t === 'ach') ach(m.k);
  else if (m.t === 'fx') onFx(m);
  else if (m.t === 'roster') updateRoster();
};
function adoptVeh(s, from) { const v = vehicles.find(q => q.id === s[0]); if (!v || v.driver !== from) return; v.net = v.net || { p: new THREE.Vector3() }; v.net.p.set(s[1], s[2], s[3]); v.net.yaw = s[4]; v.net.pitch = s[5]; v.net.roll = s[6]; v.net.speed = s[7]; v.v.set(Math.sin(s[4]) * s[7], 0, Math.cos(s[4]) * s[7]); }
function clientWorld(m) {
  for (const s of m.B) { const b = bodyById(s[0]); if (!b) continue; b.net = b.net || { p: new THREE.Vector3(), q: new THREE.Quaternion() }; b.net.p.set(s[1], s[2], s[3]); b.net.q.set(s[4], s[5], s[6], s[7]); b.held = s[8] || null; b.alive = !!s[9]; b.fallen = !!s[10]; if (b.held === net.id && !(me.held && me.held.id === b.id)) { b.held = null; } }
  m.N.forEach((s, i) => { const c = npcs[i]; c.tgt = c.tgt || new THREE.Vector3(); c.tgt.set(s[0], s[1], s[2]); c.tyaw = s[3]; c.v.set(s[4], 0, s[5]); c.grounded = !!(s[6] & 1); if ((s[6] & 6) && !c.b.down) c.b.tumble(); c.fly = s[6] & 4 ? 1 : 0; c.heldBy = s[7] || null; });
  const seen = new Set();
  for (const s of m.P) { const id = s[0]; if (id === net.id) { // eigener Zustand vom Host: nur Tragen übernehmen
      continue; } seen.add(id); applyRemote(id, s.slice(1)); }
  for (const [id, r] of remotes) if (!seen.has(id)) { r.dispose(); remotes.delete(id); }
  for (const s of m.V) { const v = vehicles.find(q => q.id === s[0]); if (!v) continue; const mine = me.inVeh === v && me.seat === 0; v.driver = s[8] || null; v.pass = s[9] ? String(s[9]).split(',') : []; if (mine) { v.driver = net.id; continue; } v.net = v.net || { p: new THREE.Vector3() }; v.net.p.set(s[1], s[2], s[3]); v.net.yaw = s[4]; v.net.pitch = s[5]; v.net.roll = s[6]; v.net.speed = s[7]; }
  if (me.inVeh && me.inVeh.driver !== net.id && me.seat === 0) { me.inVeh = null; }
}
net.on_close = (id) => { const r = remotes.get(id); if (r) { r.dispose(); remotes.delete(id); } hostExit(id); for (const b of bodies) if (b.held === id) b.held = null; for (const c of npcs) if (c.heldBy === id) c.heldBy = null; if (me.heldBy === id) me.heldBy = null; updateRoster(); toast('Jemand hat den Raum verlassen'); };
net.on_join = () => { updateRoster(); toast('Ein Beamtli ist dazugekommen!'); };
net.on_lost = () => { toast('Verbindung zum Raum verloren'); for (const [, r] of remotes) r.dispose(); remotes.clear(); for (const b of bodies) b.net = null; for (const v of vehicles) v.net = null; updateRoster(); };
// Verbindungsanzeige: kommen noch Daten an?
const lastMsg = {}; let statusT = 0;
function netStatus() {
  if (!net.on) return; const now = performance.now(); if (now - statusT < 500) return; statusT = now;
  for (const el of document.querySelectorAll('#room .p')) { const id = el.dataset.id; if (!id || id === net.id) continue; const src = net.host ? id : 'host'; const ok = lastMsg[src] && now - lastMsg[src] < 2500; el.classList.toggle('lag', !ok); }
  const warn = !net.host && (!lastMsg.host || now - lastMsg.host > 2500);
  const nw = $('netwarn'); if (nw) nw.textContent = warn ? 'Keine Daten vom Raum-Eröffner. Ist sein Spiel offen?' : '';
}
function updateRoster() {
  const el = $('room'); if (!net.on) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.innerHTML = `Raum <b>${net.code}</b>` + '<span id="netwarn"></span>' + net.players.map(p => `<span class="p" data-id="${p.id}"><i class="dot" style="background:${PLAYER_COLS[p.slot % 3]}"></i>${esc(p.name)}${p.id === net.id ? ' (du)' : ''}</span>`).join('');
  const col = PLAYER_COLS[slotOf(net.id) % 3]; if (me.b.color !== col) { const old = me.b; old.dispose(); me.b = new (old.constructor)(col); scene.add(me.b.root); }
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------- Dorfleute (nur Host) ----------------
const R = rng(3);
const NPC_LINES = ['Schöner Feierabend heute!', 'Hast du meine Melone gesehen?', 'Pass auf die Schwelle auf!', 'Der Bus fährt nie pünktlich.', 'Mein Huhn ist wieder weg!', 'Grüezi, Beamtli!', 'Wer hat die Kegel umgeworfen?', 'Auf dem Hügel steht eine Kanone!', 'Nicht auf das Dach klettern!', 'Ich habe Feierabend!'];
function stepNpc(c, dt) {
  const A2 = c.ai; let wish = { x: 0, z: 0 };
  if (!c.busy) {
    const d = Math.hypot(me.p.x - c.p.x, me.p.z - c.p.z);
    if (A2.wait > 0) { A2.wait -= dt; if (d < 3.2 && A2.talk <= 0) { A2.talk = 9 + R() * 8; c.tyawOverride = Math.atan2(me.p.x - c.p.x, me.p.z - c.p.z); const line = NPC_LINES[(R() * NPC_LINES.length) | 0]; A.speak(LG.syllables(LG.translate(line)), c.voice, { gain: 0.7, mood: line.endsWith('?') ? '?' : '!' }); c.bubble = { txt: LG.translate(line), t: 3 }; } }
    else {
      const dx = A2.tx - c.p.x, dz = A2.tz - c.p.z, dd = Math.hypot(dx, dz);
      if (dd < 0.6 || A2.stuck > 3) { A2.wait = 2 + R() * 6; A2.stuck = 0; const a = R() * 6.28, r = 3 + R() * 26; A2.tx = Math.cos(a) * r; A2.tz = Math.sin(a) * r; }
      else { wish = { x: dx / dd * 1.9, z: dz / dd * 1.9 }; c.tyawOverride = Math.atan2(dx, dz); if (Math.hypot(c.v.x, c.v.z) < 0.4) A2.stuck = (A2.stuck || 0) + dt; else A2.stuck = 0; }
    }
    A2.talk -= dt;
  }
  c.step(dt, wish, false, charHooks);
}

// ---------------- Kamera ----------------
let camD = 1; function blocked(x, y, z) { for (const o of near(x, z)) { if (o.circle || o.y1 - o.y0 < 1.2) continue; const dx = x - o.x, dz = z - o.z, lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c; if (Math.abs(lx) < o.hx + 0.2 && Math.abs(lz) < o.hz + 0.2 && y > o.y0 && y < (o.rise ? o.y0 + (o.y1 - o.y0) * ((lz / o.hz + 1) / 2) : o.y1) + 0.2) return true; } return false; }
let shake = 0; const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
function stepCamera(dt) {
  const v = me.inVeh;
  const focus = v ? tmp.copy(v.p).add(new THREE.Vector3(0, v.kind === 'bus' ? 2.6 : 1.6, 0)) : (inCannon ? tmp.set(inCannon.c.x, inCannon.c.y + 2, inCannon.c.z) : tmp.copy(me.p).add(new THREE.Vector3(0, 1.35, 0)));
  if (v && performance.now() - lastMouse > 1200 && Math.abs(v.speed) > 2) { let d = (v.yaw + Math.PI) - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * 2.2); camPitch += (0.28 - camPitch) * Math.min(1, dt * 1.5); }
  camTarget.lerp(focus, Math.min(1, dt * (v ? 10 : 14)));
  const dd = camDist * (v ? (v.kind === 'bus' ? 2.0 : 1.4) : 1);
  const cp = Math.cos(camPitch);
  camPos.set(camTarget.x + Math.sin(camYaw) * cp * dd, camTarget.y + Math.sin(camPitch) * dd, camTarget.z + Math.cos(camYaw) * cp * dd);
  // Kamera nicht in Wände und Dächer schieben
  { const steps = 14; let k = 1; for (let i = 1; i <= steps; i++) { const t = i / steps; const x = camTarget.x + (camPos.x - camTarget.x) * t, y = camTarget.y + (camPos.y - camTarget.y) * t, z = camTarget.z + (camPos.z - camTarget.z) * t; if (blocked(x, y, z)) { k = Math.max(0.15, (i - 1.5) / steps); break; } } camD = camD + (k - camD) * Math.min(1, dt * (k < camD ? 20 : 3)); camPos.lerpVectors(camTarget, camPos, camD); }
  const gy = terrainY(camPos.x, camPos.z) + 0.6; if (camPos.y < gy) camPos.y = gy;
  camera.position.copy(camPos);
  if (shake > 0) { shake = Math.max(0, shake - dt * 1.5); camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; }
  camera.lookAt(camTarget);
  sun.position.set(camTarget.x + 60, camTarget.y + 90, camTarget.z + 35); sun.target.position.copy(camTarget);
}

// ---------------- Namensschilder und Sprechblasen ----------------
const labels = new Map();
function drawLabels() {
  const show = [];
  for (const c of allChars()) { if (c === me && !c.bubble) continue; if (c.kind === 'npc' && !(c.bubble && c.bubble.t > 0)) continue; show.push(c); }
  const used = new Set();
  for (const c of show) {
    tmp.copy(c.p); tmp.y += 2.0; tmp.project(camera); if (tmp.z > 1) continue;
    let el = labels.get(c); if (!el) { el = document.createElement('div'); el.className = 'name3d'; $('hud').appendChild(el); labels.set(c, el); }
    used.add(c); el.style.left = ((tmp.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - tmp.y) / 2 * innerHeight) + 'px';
    const txt = c.bubble && c.bubble.t > 0 ? '💬 ' + c.bubble.txt : c.name; if (el.textContent !== txt) el.textContent = txt;
  }
  for (const [c, el] of labels) if (!used.has(c)) { el.remove(); labels.delete(c); }
}

// ---------------- Hauptschleife ----------------
let last = performance.now(), wiggle = 0;
const wish = { x: 0, z: 0 };
const fixed = 1 / 60; let acc = 0;
function frame(dtRaw) {
  const dt = Math.min(0.05, dtRaw);
  acc += dt; let n = 0;
  while (acc >= fixed && n < 7) { tick(fixed); acc -= fixed; n++; }
  if (n === 7) acc = 0;
  render(dt);
}
function tick(dt) {
  // Eingabe → Wunschgeschwindigkeit relativ zur Kamera
  const ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const sprint = keys.ShiftLeft || keys.ShiftRight;
  const spd = (sprint ? 7.8 : 4.6) * (me.held && me.heldBig ? 0.75 : 1);
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = -fz, rz = fx;
  let wx = (fx * iz + rx * ix), wz = (fz * iz + rz * ix); const wl = Math.hypot(wx, wz); if (wl > 0) { wx /= wl; wz /= wl; }
  wish.x = playing ? wx * spd : 0; wish.z = playing ? wz * spd : 0;
  const jump = playing && keys.Space;

  // eigene Figur
  if (me.heldBy) {
    const p = carriedPos(me); if (p) { me.p.copy(p); me.v.set(0, 0, 0); }
    if (jump && !keys._sp) { wiggle++; me.b.squash.v += 3; if (wiggle >= 6) { wiggle = 0; const by = me.heldBy; me.heldBy = null; if (net.host) { const h = charById(by); if (h === me) {} else if (h && h.kind === 'remote') toPeer(h.id, { t: 'lost' }); else if (h) h.held = null; } else toHost({ t: 'free', id: net.id }); me.fling(Math.sin(me.yaw) * 2, 5, Math.cos(me.yaw) * 2); } }
  } else if (me.inVeh) {
    const v = me.inVeh;
    if (v.driver === net.id) {
      const t = playing ? (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) : 0, s = playing ? (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) : 0;
      v.step(dt, t, s, jump, vehHooks);
      if (engine) engine.set(Math.min(1, Math.abs(v.speed) / v.K.vmax), v.K.tone ? 1 : 0, v.K.tone);
      if (v.kind === 'kiste' && Math.abs(v.speed) > 14) ach('seifenkiste');
      if (v.kind === 'bus') { const z = SPOTS.zones.find(q => q.kind === 'bus'); if (z && Math.hypot(z.x - v.p.x, z.z - v.p.z) < 5 && Math.abs(v.speed) < 1.5) ach('bus'); }
    }
    v.seatPos(me.seat, me.p); me.yaw = v.yaw; me.v.copy(v.v);
  } else if (inCannon) {
    inCannon.t -= dt;
    const c = inCannon.c; me.p.set(c.x, c.y + 0.5, c.z);
    if (inCannon.t <= 0) {
      me.b.root.visible = true; me.p.copy(c.mouth); me.fling(c.dir.x * c.power, c.dir.y * c.power, c.dir.z * c.power); me.fly = 1;
      A.fun('boom', 0); A.fun('whee', 0); shake = 0.8; burst(c.mouth.x, c.mouth.y, c.mouth.z, '#E9E6DA', 16, 3, 4); sendFx('boom', c.mouth); ach('kanone'); inCannon = null;
    }
  } else {
    me.step(dt, wish, jump, charHooks);
    // über Kleinzeug stolpern
    if (me.grounded && me.down <= 0 && Math.hypot(me.v.x, me.v.z) > 5.5 && me.tripCd <= 0) for (const b of bodies) { if (!b.alive || b.held || b.r > 0.36) continue; if (Math.abs(b.p.x - me.p.x) < 0.55 && Math.abs(b.p.z - me.p.z) < 0.55 && b.p.y < me.p.y + 0.6) { me.tripCd = 2; if (Math.random() < 0.4) { me.stumble(charHooks); } break; } }
    // Dach / Turm
    if (me.grounded) { const [gy, o] = groundAt(me.p.x, me.p.y + 0.1, me.p.z, 0.2); if (o && o.rise && gy > 4 && o.hz < 6) ach('dach'); if (Math.hypot(me.p.x - 90, me.p.z + 80) < 2.3 && me.p.y > terrainY(90, -80) + 6) ach('turm'); }
  }
  keys._sp = keys.Space;
  if (me.boingT > 0) me.boingT -= dt;
  if (mouseDown && me.held) chargeT += dt;
  // getragene Dinge folgen der Hand (Host rechnet für alle, Client zeigt das eigene sofort)
  for (const b of bodies) {
    if (!b.held) continue;
    const h = charById(b.held); if (!h) { if (net.host) b.held = null; continue; }
    if (net.host || b.held === net.id) { h.hand(b.K.big, b.p); b.p.y += b.K.big ? 0.2 : 0; b.v.set(0, 0, 0); if (b.K.alive) b.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.yaw); if (b.net && b.held === net.id) b.net.p.copy(b.p); }
  }
  if (me.held && me.held.type === 'b') { const b = bodyById(me.held.id); if (b && !b.alive) me.held = null; }

  if (net.host) {
    for (const c of npcs) { if (c.heldBy) { const p = carriedPos(c); if (p) { c.p.copy(p); c.v.set(0, 0, 0); c.heldT = (c.heldT || 0) + dt; if (c.heldT > 7) { const h = charById(c.heldBy); c.heldBy = null; c.heldT = 0; if (h === me) me.held = null; else if (h) toPeer(h.id, { t: 'lost' }); c.fling(0, 5, 0); } } else c.heldBy = null; } else { c.heldT = 0; stepNpc(c, dt); } }
    // geparkte Fahrzeuge rollen aus (und Seifenkisten den Hang hinunter)
    for (const v of vehicles) if (!v.driver) v.step(dt, 0, 0, true, vehHooks); else if (v.driver !== net.id) { /* von Client gesteuert */ }
    stepBodies(dt, hooks);
    interact(dt);
    if (!strikeDone && pinsDown()) { strikeDone = true; const k = bodies.find(b => b.kind === 'kugel' && b.lastBy); const by = k ? k.lastBy : net.id; A.fun('pins'); if (by === net.id) ach('strike'); else toPeer(by, { t: 'ach', k: 'strike' }); setTimeout(resetPins, 9000); }
  }
  // Stempel einsammeln
  for (const s of stamps) { if (!s.g.visible) continue; if (Math.abs(s.x - me.p.x) < 1.1 && Math.abs(s.z - me.p.z) < 1.1 && Math.abs(s.y - (me.p.y + 0.8)) < 1.4) { s.g.visible = false; save.stamps.push(s.i); persist(); $('stN').textContent = save.stamps.length; A.fun('collect'); burst(s.x, s.y, s.z, C.gelb, 12, 2, 4); toast(`Goldener Stempel! ${save.stamps.length} / ${stamps.length}`, 'gold'); if (save.stamps.length >= stamps.length) ach('stempel'); } }
}

// Host: Figuren und Fahrzeuge schubsen Requisiten, Fahrzeuge und Würfe hauen Figuren um
function interact(dt) {
  const cs = allChars();
  for (const c of cs) {
    if (c.inVeh || c.heldBy || c.hidden) continue;
    const cp = c.kind === 'remote' && c.tgt ? c.tgt : c.p;
    for (const b of bodies) {
      if (!b.alive || b.held) continue;
      const dx = b.p.x - cp.x, dz = b.p.z - cp.z, dy = b.p.y - (cp.y + 0.5);
      const m = RAD + b.r; if (Math.abs(dx) > m || Math.abs(dz) > m || Math.abs(dy) > 0.6 + b.r) continue;
      const d = Math.hypot(dx, dz) || 0.01; if (d > m) continue;
      // fliegender Gegenstand trifft Figur
      const sp = b.v.length();
      if (sp > 7.5 && b.thrownT > 0 && b.lastBy !== c.id && !b.K.heavy) {
        const k = Math.min(1, b.m / 2); hitChar(c, b.v.x * 0.5 * k, 4 + sp * 0.12, b.v.z * 0.5 * k); b.v.multiplyScalar(-0.3); A.fun('thud', dist(b.p), 4); continue;
      }
      if (b.K.heavy) { c.p.x -= dx / d * (m - d) * (c.kind === 'remote' ? 0 : 1); c.p.z -= dz / d * (m - d) * (c.kind === 'remote' ? 0 : 1); continue; }
      const push = (m - d); b.p.x += dx / d * push; b.p.z += dz / d * push;
      const cv2 = c.v; const along = cv2.x * dx / d + cv2.z * dz / d;
      if (along > 0) { b.v.x += dx / d * along * (1.3 / Math.max(0.5, b.m)); b.v.z += dz / d * along * (1.3 / Math.max(0.5, b.m)); if (along > 5) b.v.y += 2; }
      b.sleep = 0;
    }
  }
  for (const b of bodies) if (b.thrownT > 0) b.thrownT -= dt;
  // Fahrzeuge
  for (const v of vehicles) {
    const sp = Math.abs(v.speed) + Math.hypot(v.v.x, v.v.z) * 0.3; if (sp < 1) continue;
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    const inBox = (p, r) => { const dx = p.x - v.p.x, dz = p.z - v.p.z, lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < v.K.hx + r && Math.abs(lz) < v.K.hz + r && p.y > v.p.y - 1 && p.y < v.p.y + 2.5 ? [lx, lz] : null; };
    for (const ch of cs) {
      if (ch.inVeh || ch.heldBy || ch.fly > 0 || (ch.down > 0.8 && ch.kind !== 'remote')) continue;
      const cp = ch.kind === 'remote' && ch.tgt ? ch.tgt : ch.p;
      if (!inBox(cp, RAD)) continue;
      if (sp > 3.5) { hitChar(ch, v.v.x * 1.1, 5 + sp * 0.35, v.v.z * 1.1); A.fun('thud', dist(v.p), 5); A.fun('horn', dist(v.p), 0.5); if (v.driver === net.id) ach('umfahren'); else if (v.driver) toPeer(v.driver, { t: 'ach', k: 'umfahren' }); }
    }
    for (const b of bodies) {
      if (!b.alive || b.held) continue; const l = inBox(b.p, b.r); if (!l) continue;
      const k = b.K.heavy ? 0.3 : 1;
      b.v.set(v.v.x * 1.25 * k + (Math.random() - 0.5) * 2, (2.5 + sp * 0.25) * k, v.v.z * 1.25 * k + (Math.random() - 0.5) * 2); b.w.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
      b.p.x += (b.p.x - v.p.x) * 0.1; b.p.z += (b.p.z - v.p.z) * 0.1; b.sleep = 0; b.thrownT = 0.5; b.lastBy = v.driver;
      if (b.K.burst && sp > 6) burstBody(b); else A.fun(b.kind === 'kiste' ? 'wood' : 'thud', dist(b.p), 3);
      if (b.K.heavy) { v.speed *= 0.3; v.v.multiplyScalar(0.3); A.fun('moo', dist(b.p)); }
    }
  }
}
function hitChar(c, vx, vy, vz) { if (c === me) me.fling(vx, vy, vz); else if (c.kind === 'remote') toPeer(c.id, { t: 'fling', v: [vx, vy, vz] }); else { c.fling(vx, vy, vz); if (Math.random() < 0.7) A.gesture(Math.random() < 0.5 ? 'oh' : 'hmpf', c.voice, { gain: Math.max(0.1, 1 - dist(c.p) / 25) }); } }

const vel = new THREE.Vector3();
function render(dt) {
  if (!net.host) {
    // Client: Dorfleute und entfernte Spieler weich nachziehen
    for (const c of npcs) { if (c.tgt) { if (c.heldBy) { const p = carriedPos(c); if (p) c.p.copy(p); } else c.p.lerp(c.tgt, Math.min(1, dt * 12)); } }
  }
  for (const r of remotes.values()) {
    if (r.tgt) { if (r.flagHeld) { /* Position kommt vom Träger */ r.p.lerp(r.tgt, Math.min(1, dt * 14)); } else r.p.lerp(r.tgt, Math.min(1, dt * 12)); }
    if (r.inVeh) r.inVeh.seatPos(r.inVeh.driver === r.id ? 0 : Math.max(1, r.inVeh.pass.indexOf(r.id) + 1), r.p);
    r.b.root.visible = !r.hidden;
    r.yaw = r.tyaw ?? r.yaw;
  }
  for (const c of allChars()) {
    if (c.bubble) c.bubble.t -= dt;
    if (c === me) { const hs = Math.hypot(me.v.x, me.v.z); const ty = me.held && mouseDown ? Math.atan2(-Math.sin(camYaw), -Math.cos(camYaw)) : hs > 0.4 ? Math.atan2(me.v.x, me.v.z) : undefined; me.animate(dt, me.inVeh ? vel.set(0, 0, 0) : me.v, me.grounded || !!me.inVeh, ty); continue; }
    const ty = c.kind === 'npc' ? (net.host ? (Math.hypot(c.v.x, c.v.z) > 0.4 ? Math.atan2(c.v.x, c.v.z) : c.tyawOverride) : c.tyaw) : undefined;
    if (c.kind === 'remote') { c.animate(dt, c.inVeh ? vel.set(0, 0, 0) : c.v, c.grounded || !!c.inVeh); c.b.yaw = c.yaw; c.b.root.rotation.y = c.yaw; }
    else c.animate(dt, c.v, c.grounded, ty);
  }
  for (const v of vehicles) v.draw(dt);
  drawBodies(dt);
  // eigenes gehaltenes Ding sofort an der Hand
  if (me.held && me.held.type === 'b') { const b = bodyById(me.held.id); if (b) { me.hand(b.K.big, b.mesh.position); if (b.K.big) b.mesh.position.y += 0.2; } }
  stepParts(dt);
  // Trampoline federn, Stempel drehen, Wolken ziehen, Glocke schwingt
  for (const t of SPOTS.trampolines) { t.k = Math.max(0, t.k - dt * 3); t.mesh.position.y = t.y - 0.02 - Math.sin(t.k * 9) * t.k * 0.25 - (t.y - 0.7 - t.mesh.position.y) * 0; }
  const T = performance.now() / 1000;
  for (const s of stamps) if (s.g.visible) { s.g.rotation.y = T * 2 + s.i; s.g.position.y = s.y + Math.sin(T * 2.5 + s.i) * 0.12; }
  for (const cl of SKY.clouds.children) { cl.position.x += cl.userData.v * dt; if (cl.position.x > 420) cl.position.x = -420; }
  for (const b of SPOTS.bells) { if (b.t > 0) b.t -= dt; b.bell.rotation.z = Math.sin(T * 5) * Math.max(0, b.t) * 0.15; }
  SKY.sky.position.copy(camera.position);
  stepCamera(dt);
  // Netz
  if (net.on) { if (net.host) hostSend(dt); else clientSend(dt); }
  // Anzeige
  $('hint').textContent = playing ? hintText() : '';
  const ch = $('charge'); if (me.held && mouseDown) { ch.style.display = 'block'; ch.firstElementChild.style.width = Math.min(100, chargeT / 0.9 * 100) + '%'; } else ch.style.display = 'none';
  const bg = performance.now() - lastRaf > 250; if (!bg) drawLabels();
  // Ton: Umgebung, Musik
  A.ambient('village', dt, { nearHens: false });
  if (!bg) renderer.render(scene, camera);
  netStatus();
}

// ---------------- Menü ----------------
const nameIn = $('name'); try { nameIn.value = localStorage.getItem('fa-name') || ''; } catch (e) {}
$('mute').checked = A.sound.muted; $('mute').onchange = e => A.setMuted(e.target.checked);
$('vMusic').value = A.volume.music; $('vMusic').oninput = e => A.setVolume('music', +e.target.value);
$('lowgfx').checked = lowgfx; $('lowgfx').onchange = e => { try { localStorage.setItem('fa-low', e.target.checked ? '1' : '0'); } catch (er) {} $('msg').textContent = 'Wird beim nächsten Laden übernommen.'; };
const myName = () => { const n = (nameIn.value || 'Beamtli').trim().slice(0, 14); try { localStorage.setItem('fa-name', n); } catch (e) {} return n; };
function start() { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); playing = true; $('menu').classList.add('hidden'); $('hud').classList.remove('hidden'); A.ensureAudio(); A.setMusic('fun'); if (!window.__test) cv.requestPointerLock && cv.requestPointerLock(); }
function openMenu() { playing = false; $('menu').classList.remove('hidden'); $('resume').classList.remove('hidden'); $('bLeave').classList.toggle('hidden', !net.on); if (document.pointerLockElement) document.exitPointerLock(); }
$('bBack').onclick = () => { A.ui && A.ui('click'); start(); };
$('bLeave').onclick = () => { netReset(); for (const [, r] of remotes) r.dispose(); remotes.clear(); for (const b of bodies) b.net = null; for (const v of vehicles) { v.net = null; v.driver = v.driver === net.id ? v.driver : null; } updateRoster(); $('msg').textContent = 'Raum verlassen. Du spielst allein weiter.'; $('bLeave').classList.add('hidden'); };
$('bSolo').onclick = () => { me.name = myName(); start(); };
$('bHost').onclick = () => {
  if (!netAvailable()) { $('msg').textContent = 'Online geht gerade nicht (PeerJS fehlt).'; return; }
  $('msg').textContent = 'Raum wird eröffnet…';
  netHost(myName(), { ok(code) { $('msg').innerHTML = `Raum <b>${code}</b> ist offen. Gib den Code deinen Freunden.`; updateRoster(); start(); toast(`Raum ${code} offen`, 'gold', 'Freunde geben den Code im Menü ein'); }, fail(e) { $('msg').textContent = 'Raum konnte nicht eröffnet werden (' + e + ').'; } });
};
$('bJoin').onclick = () => {
  const code = $('code').value.trim().toUpperCase(); if (code.length !== 4) { $('msg').textContent = 'Der Code hat 4 Zeichen.'; return; }
  if (!netAvailable()) { $('msg').textContent = 'Online geht gerade nicht (PeerJS fehlt).'; return; }
  $('msg').textContent = 'Verbinde…';
  netJoin(code, myName(), {
    ok() { $('msg').textContent = 'Verbunden!'; for (const v of vehicles) { v.driver = null; } const s = SPOTS.spawns[1 + (Math.random() * 2 | 0)]; me.place(s[0], terrainY(s[0], s[1]) + 0.3, s[1]); start(); setTimeout(updateRoster, 400); },
    fail(e) { $('msg').textContent = e === 'full' ? 'Der Raum ist voll (3 Spieler).' : e === 'peer-unavailable' || e === 'timeout' ? 'Raum nicht gefunden. Stimmt der Code?' : 'Verbindung fehlgeschlagen (' + e + ').'; },
  });
};
$('code').addEventListener('keydown', e => { if (e.key === 'Enter') $('bJoin').click(); });

// ---------------- Ladebildschirm (Duchy Games) ----------------
(function intro() {
  const el = $('intro'); if (!el) return;
  const bar = $('iBar'), txt = $('iTxt');
  const LINES = ['Die Insel wird aufgebaut …', 'Schwellen werden montiert …', 'Hühner werden gezählt …', 'Formulare werden gestempelt …', 'Feierabend!'];
  const MIN = window.__test ? 0 : 3600, t0 = performance.now(); let gone = false, li = 0;
  const show = () => { bar.style.width = Math.round(Math.min(1, 0.15 + (performance.now() - t0) / MIN * 0.85) * 100) + '%'; };
  const lt = setInterval(() => { if (li < LINES.length - 2) txt.textContent = LINES[++li]; show(); }, 850);
  const end = () => { if (gone) return; gone = true; clearInterval(lt); bar.style.width = '100%'; txt.textContent = LINES[LINES.length - 1]; setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 950); }, 300); };
  setTimeout(end, MIN);
  setTimeout(() => { try { A.chime([392, 523, 659], 0.18); } catch (e) {} }, 1000);
  el.addEventListener('click', () => { A.ensureAudio(); end(); });
  addEventListener('keydown', function k() { if (gone) return removeEventListener('keydown', k); end(); });
})();

// Testschnittstelle
window.__fa = { me, npcs, bodies, vehicles, net, SPOTS, start, ach, save, remotes, keys, setCam(y, p, d) { camYaw = y; camPitch = p; if (d) camDist = d; }, grab: tryGrab, throwHeld, use: useAction, get playing() { return playing; } };

// Läuft das Spiel im Hintergrund (anderer Tab, minimiert), bleibt die Welt für die Mitspieler am Leben:
// ein Worker gibt den Takt, gezeichnet wird nicht.
try {
  const w = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),50)'], { type: 'text/javascript' })));
  let lastH = performance.now();
  w.onmessage = () => { const now = performance.now(); if (net.on && now - lastRaf > 250) { frame(Math.min(0.1, (now - lastH) / 1000)); last = now; } lastH = now; };
} catch (e) {}
let lastRaf = 0;
function loop(now) { lastRaf = performance.now(); const dt = (now - last) / 1000; last = now; frame(dt); requestAnimationFrame(loop); }
window.__frame = dt => frame(dt);
if (!window.__offline) requestAnimationFrame(loop);
