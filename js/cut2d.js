// 2D-Schneideansicht: Wolke mit der Schere in Form bringen (Logik aus v0.3).
import { ORDERS, FREE, TOD } from './data.js';
import { PAL, rng } from './palette.js';
import { t, L } from './i18n.js';
import * as A from './audio.js';

export const W = 900, H = 600, COLS = 80, ROWS = 60, CELL = 5, N = COLS * ROWS;
const OX = 250, OY = 80, DORF = 1500;
export const THRESH = [0.60, 0.75, 0.87];
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
const INK = PAL.tinte, BLATT = PAL.schnee, LINIE = 'rgba(34,48,58,0.28)', GRAU = 'rgba(34,48,58,0.68)', ROT = PAL.rot;
const F_SANS = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif', F_SERIF = '"Young Serif", Georgia, serif';

const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const pick = (a, r = Math.random) => a[(r() * a.length) | 0];
export const pad = n => String(n).padStart(3, '0');

// ---------------- Masken ----------------
export function makeMask(draw) {
  const m = document.createElement('canvas'); m.width = COLS; m.height = ROWS;
  const c = m.getContext('2d'); c.scale(COLS / 200, ROWS / 150); c.fillStyle = '#000'; draw(c);
  const d = c.getImageData(0, 0, COLS, ROWS).data, out = new Uint8Array(N);
  for (let k = 0; k < N; k++) out[k] = d[k * 4 + 3] > 127 ? 1 : 0;
  return out;
}
export function makeImg(draw, color, w = 200, h = 150) { const m = document.createElement('canvas'); m.width = w; m.height = h; const c = m.getContext('2d'); c.scale(w / 200, h / 150); c.fillStyle = color; draw(c); return m; }
function stamp(arr, cx, cy, r, v, limit) {
  const ri = Math.ceil(r); let ch = 0;
  for (let dy = -ri; dy <= ri; dy++) for (let dx = -ri; dx <= ri; dx++) {
    if (dx * dx + dy * dy > r * r) continue;
    const x = Math.round(cx + dx), y = Math.round(cy + dy);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
    const k = y * COLS + x;
    if (arr[k] !== v) { if (limit !== undefined && ch >= limit) return ch; arr[k] = v; ch++; }
  }
  return ch;
}
function iou(a, b, n) { let i = 0, u = 0; for (let k = 0; k < n; k++) if (a[k] || b[k]) { u++; if (a[k] && b[k]) i++; } return u ? i / u : 0; }
function normMask(m) {
  let x0 = COLS, y0 = ROWS, x1 = -1, y1 = -1;
  for (let k = 0; k < N; k++) if (m[k]) { const x = k % COLS, y = (k / COLS) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const out = new Uint8Array(1200); if (x1 < 0) return out;
  for (let gy = 0; gy < 30; gy++) for (let gx = 0; gx < 40; gx++) {
    const x = Math.round(x0 + (gx + 0.5) / 40 * (x1 - x0 + 1) - 0.5), y = Math.round(y0 + (gy + 0.5) / 30 * (y1 - y0 + 1) - 0.5);
    out[gy * 40 + gx] = m[y * COLS + x];
  }
  return out;
}
let LIB = null;
function classify(cloud) {
  if (!LIB) LIB = ORDERS.map((o, i) => ({ i, m: normMask(makeMask(o.draw)) }));
  const cm = normMask(cloud);
  return LIB.map(l => ({ i: l.i, s: iou(cm, l.m, 1200) })).sort((a, b) => b.s - a.s);
}

// ---------------- Dorf (2D-Scherenschnitt) ----------------
function buildTown(seed) {
  const r = rng(seed * 7919 + 13), houses = [], trees = [];
  let x = -300;
  while (x < 3200) {
    if (Math.abs(x - DORF) < 110) { x = DORF + 110; continue; }
    const w = 26 + r() * 40, h = 22 + r() * 46 + (Math.abs(x - DORF) < 400 ? 14 : 0);
    const win = []; const cols = Math.max(1, Math.floor(w / 13)), rows = Math.max(1, Math.floor(h / 15));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) win.push([6 + i * 13, 8 + j * 15, r()]);
    houses.push({ x, w, h, roof: r() < 0.7 ? 1 : 0, rh: 10 + r() * 16, win });
    if (r() < 0.35) trees.push({ x: x + w + 4 + r() * 10, h: 16 + r() * 22 });
    x += w + 3 + r() * 26;
  }
  return { houses, trees, seed };
}

// ---------------- Zustand ----------------
export const cut = {
  active: false, state: 'idle', lvl: 0, order: ORDERS[0], free: false, tod: TOD.sunset,
  finalScore: 0, finalStars: 0, guess: null, short: false,
  onDone: null, onProg: null, onQuit: null,
};
let target = new Uint8Array(N), edge = new Uint8Array(N), cloud = new Uint8Array(N), targetImg = null;
let tool = 'big', watte = 0, hints = 3, hintT = 0, timeLeft = 60, timeMax = 60;
let dirty = true, cur = 0, regAcc = 0, gustT = 4, gustFlash = 0, animT = 0, offX = 0, offY = 0;
let prog = 0, progFrom = 0, camX = 0, flash = 0, noWatte = 0, lastProg = 0;
let particles = [], streaks = [], hover = null, town = buildTown(42), birds = [];
let G = Math.random, RND = Math.random;

export function setup(i) {
  cut.free = i < 0; cut.lvl = i; cut.order = cut.free ? FREE : ORDERS[i];
  cut.tod = TOD[cut.order.tod]; town = buildTown(cut.free ? 99 : i + 1);
  prog = 0; dirty = true;
  return cut.order;
}

export function start(seed, opts = {}) {
  A.ensureAudio();
  G = seed ? rng(seed) : Math.random; RND = seed ? rng(seed + 991) : Math.random;
  const m = cut.order.mods, lvl = cut.lvl;
  if (cut.free) {
    target = new Uint8Array(N); edge = new Uint8Array(N); targetImg = null;
    cloud = new Uint8Array(N);
    for (let b = 0; b < 12; b++) stamp(cloud, 40 + (Math.random() - 0.5) * 44, 30 + (Math.random() - 0.5) * 28, 7 + Math.random() * 7, 1);
    watte = 600; hints = 0; timeLeft = timeMax = 90;
  } else {
    target = makeMask(cut.order.draw);
    targetImg = makeImg(cut.order.draw, INK, 120, 90);
    edge = new Uint8Array(N);
    const edges = [], inner = [];
    const tg = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && target[y * COLS + x];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const k = y * COLS + x; if (!target[k]) continue;
      if (!tg(x - 1, y) || !tg(x + 1, y) || !tg(x, y - 1) || !tg(x, y + 1)) { edge[k] = 1; edges.push(k); }
      else if (tg(x - 4, y) && tg(x + 4, y) && tg(x, y - 4) && tg(x, y + 4)) inner.push(k);
    }
    cloud = new Uint8Array(N);
    const d = 3 + G() * 2.5;
    for (let k = 0; k < N; k++) if (target[k]) { if (edge[k]) stamp(cloud, k % COLS, (k / COLS) | 0, d, 1); else cloud[k] = 1; }
    const blobs = 9 + Math.floor(G() * 6);
    for (let b = 0; b < blobs; b++) { const k = pick(edges, G); stamp(cloud, k % COLS + (G() * 6 - 3), ((k / COLS) | 0) + (G() * 6 - 3), 3 + G() * 6, 1); }
    if (m.holes) for (let h = 0; h < 1 + Math.floor(lvl / 4) && inner.length; h++) { const k = pick(inner, G); stamp(cloud, k % COLS, (k / COLS) | 0, 2.5 + G() * 2.5, 0); }
    let carved = 0; for (let k = 0; k < N; k++) if (target[k] && !cloud[k]) carved++;
    watte = Math.round(carved * 1.4) + 30;
    hints = m.outline ? 0 : 3;
    timeLeft = timeMax = opts.short ? 45 : Math.max(45, 70 - lvl * 2);
  }
  hintT = 0; regAcc = 0; gustT = 3 + G() * 3; particles = []; streaks = [];
  dirty = true; cut.state = 'arrive'; animT = 0; offX = 640; prog = 0; cut.guess = null;
  setTool('big'); updateBar(); relabel();
  cut.active = true; document.body.classList.add('mode2d');
  $('bar').classList.remove('idle');
  A.chime([392, 587], 0.09);
  lt = performance.now(); requestAnimationFrame(frame);
}

export function release() {
  if (cut.state !== 'play') return;
  if (cut.free) { cut.guess = classify(cloud); cut.finalScore = 0; cut.finalStars = 0; }
  else { cut.finalScore = score(); cut.finalStars = THRESH.filter(x => cut.finalScore >= x).length; }
  cut.state = 'travel'; animT = 0; progFrom = prog;
  $('bar').classList.add('idle');
}
export function stop() { cut.active = false; cut.state = 'idle'; document.body.classList.remove('mode2d'); $('bar').classList.add('idle'); hover = null; }

const score = () => cut.free ? 0 : iou(cloud, target, N);
export const cellCount = () => cloud.reduce((a, b) => a + b, 0);

// ---------------- Ergebnis-Daten ----------------
// Wolke als Bild mit transparentem Hintergrund (für den 3D-Himmel)
export function cloudCanvas() { if (dirty) renderCloud(); const c = document.createElement('canvas'); c.width = cloudCv.width; c.height = cloudCv.height; c.getContext('2d').drawImage(cloudCv, 0, 0); return c; }
// Maske kompakt als Base64 (600 Byte) für den Online-Modus
export function maskB64() { const b = new Uint8Array(N / 8); for (let k = 0; k < N; k++) if (cloud[k]) b[k >> 3] |= 1 << (k & 7); let s = ''; b.forEach(x => { s += String.fromCharCode(x); }); return btoa(s); }
export function cloudFromB64(str, todKey) {
  const m = new Uint8Array(N);
  try { const s = atob(str); for (let k = 0; k < N; k++) m[k] = (s.charCodeAt(k >> 3) >> (k & 7)) & 1; } catch (e) {}
  const c = document.createElement('canvas'); c.width = cloudCv.width; c.height = cloudCv.height;
  paintCloud(c.getContext('2d'), m, TOD[todKey] || TOD.day);
  return c;
}
export function thumb(fmt = 'image/png', q) {
  if (dirty) renderCloud();
  const c = document.createElement('canvas'); c.width = 240; c.height = 184;
  const g = c.getContext('2d');
  g.save(); g.scale(240 / cloudCv.width, 184 / cloudCv.height); g.translate(-(OX - 15), -(OY - 15)); drawSky(g, cut.tod, 470); g.restore();
  g.drawImage(cloudCv, 0, 0, cloudCv.width, cloudCv.height, 0, 0, 240, 184);
  return c.toDataURL(fmt, q);
}
// Antragsbild in eine Canvas zeichnen
export function drawOrder(canvas, i, color = INK) { const g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height); g.save(); g.scale(canvas.width / 200, canvas.height / 150); g.fillStyle = color; ORDERS[i].draw(g); g.restore(); }

// ---------------- Werkzeuge ----------------
function setTool(x) { tool = x; $('tBig').classList.toggle('on', x === 'big'); $('tFine').classList.toggle('on', x === 'fine'); $('tPuff').classList.toggle('on', x === 'puff'); }
function updateBar() { $('watte').textContent = watte; $('hints').textContent = hints; $('tHint').disabled = hints <= 0; }
function useHint() { if (cut.state !== 'play' || hints <= 0) return; hints--; hintT = 2.5; updateBar(); A.chime([660], 0.06); }
export function relabel() {}
$('tBig').onclick = () => setTool('big'); $('tFine').onclick = () => setTool('fine'); $('tPuff').onclick = () => setTool('puff');
$('tHint').onclick = useHint; $('tDone').onclick = release;
addEventListener('keydown', e => {
  if (!cut.active || e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key;
  if (k === '1') setTool('big'); else if (k === '2') setTool('fine'); else if (k === '3') setTool('puff');
  else if (k === 'h' || k === 'H') useHint();
  else if (k === 'Enter' && cut.state === 'play') release();
});

// ---------------- Eingabe ----------------
let down = false, last = null, btn = 0;
const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { A.ensureAudio(); if (cut.state !== 'play') return; down = true; btn = e.button; try { cv.setPointerCapture(e.pointerId); } catch (_) {} const p = pos(e); last = p; hover = p; apply(p, p); });
cv.addEventListener('pointermove', e => { const p = pos(e); hover = p; if (down && cut.state === 'play') { apply(last, p); last = p; } });
const up = () => { down = false; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('pointerleave', () => { if (!down) hover = null; });
const activeTool = () => btn === 2 ? 'puff' : tool;
const radius = x => x === 'big' ? 3.6 : x === 'fine' ? 1.5 : 2.4;
function apply(a, b) {
  const tl = activeTool(), r = radius(tl);
  const dist = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(1, Math.ceil(dist / (CELL * 0.7)));
  let total = 0;
  for (let s = 0; s <= steps; s++) {
    const x = a.x + (b.x - a.x) * s / steps, y = a.y + (b.y - a.y) * s / steps;
    const gx = (x - OX - offX) / CELL - 0.5, gy = (y - OY - offY) / CELL - 0.5;
    if (tl === 'puff') {
      if (watte <= 0) { noWatte = 1.2; break; }
      const ch = stamp(cloud, gx, gy, r, 1, watte); watte -= ch; total += ch;
      for (let i = 0; i < Math.min(3, ch); i++) spawn(x, y, 'puff');
    } else {
      const ch = stamp(cloud, gx, gy, r, 0); total += ch;
      for (let i = 0; i < Math.min(5, Math.ceil(ch / 2)); i++) spawn(x, y, 'cut');
    }
  }
  if (total) { dirty = true; if (tl === 'puff') { A.puffSound(); updateBar(); } else A.snip(); }
}
function spawn(x, y, kind) {
  if (particles.length > 350) return;
  const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 50;
  particles.push({ x: x + Math.random() * 8 - 4, y: y + Math.random() * 8 - 4, vx: Math.cos(a) * sp - (kind === 'cut' ? 25 : 0), vy: Math.sin(a) * sp * 0.6, r: 3 + Math.random() * 4.5, life: 1, kind, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 });
}

// ---------------- Wolke rendern ----------------
const skyStars = Array.from({ length: 110 }, () => ({ x: Math.random() * W, y: Math.random() * 380, r: Math.random() * 1.3 + 0.3, p: Math.random() * 6 }));
const farClouds = Array.from({ length: 7 }, () => ({ x: Math.random() * 1400, y: 30 + Math.random() * 330, s: 0.5 + Math.random() * 1.1, seed: Math.random() * 100 }));
const cloudCv = document.createElement('canvas'); cloudCv.width = COLS * CELL + 30; cloudCv.height = ROWS * CELL + 30;
const cc = cloudCv.getContext('2d');
const tmpCv = document.createElement('canvas'); tmpCv.width = cloudCv.width; tmpCv.height = cloudCv.height;
const tc = tmpCv.getContext('2d');
const grainCv = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); const r = rng(4242);
  for (let i = 0; i < 2600; i++) { const v = r() < 0.5 ? '34,48,58' : '243,241,234'; g.fillStyle = `rgba(${v},${0.035 + r() * 0.05})`; g.fillRect(r() * 160, r() * 160, 1 + r() * 1.5, 1); }
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(34,48,58,${0.03 + r() * 0.03})`; g.lineWidth = 0.6; g.beginPath(); const x = r() * 160, y = r() * 160; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 14, y + (r() - 0.5) * 6); g.stroke(); }
  return c;
})();
const grainPat = ctx.createPattern(grainCv, 'repeat');
const smCv = document.createElement('canvas'); smCv.width = tmpCv.width; smCv.height = tmpCv.height;
const smCtx = smCv.getContext('2d');
const EDGE_OK = 'filter' in smCtx && !/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
function paintCloud(out, mask, T) {
  tc.clearRect(0, 0, tmpCv.width, tmpCv.height);
  tc.fillStyle = T.cb; tc.beginPath();
  for (let k = 0; k < N; k++) if (mask[k]) {
    const x = 15 + (k % COLS) * CELL + CELL / 2, y = 15 + ((k / COLS) | 0) * CELL + CELL / 2;
    tc.moveTo(x + 5.6, y); tc.arc(x, y, 5.6, 0, Math.PI * 2);
  }
  tc.fill();
  if (EDGE_OK) { smCtx.clearRect(0, 0, smCv.width, smCv.height); smCtx.filter = 'url(#papierkante)'; smCtx.drawImage(tmpCv, 0, 0); smCtx.filter = 'none'; tc.clearRect(0, 0, tmpCv.width, tmpCv.height); tc.drawImage(smCv, 0, 0); }
  tc.globalCompositeOperation = 'source-atop'; tc.fillStyle = tc.createPattern(grainCv, 'repeat'); tc.fillRect(0, 0, tmpCv.width, tmpCv.height);
  tc.globalCompositeOperation = 'source-over';
  out.clearRect(0, 0, cloudCv.width, cloudCv.height);
  out.globalAlpha = T === TOD.night ? 0.55 : 0.32; out.drawImage(tmpCv, 4, 5);
  out.globalCompositeOperation = 'source-in'; out.globalAlpha = 1; out.fillStyle = T.cs; out.fillRect(0, 0, cloudCv.width, cloudCv.height);
  out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1; out.drawImage(tmpCv, 0, 0);
}
function renderCloud() { paintCloud(cc, cloud, cut.tod); cur = score(); dirty = false; }

// ---------------- Update ----------------
let lt = performance.now();
function frame(now) {
  if (!cut.active) return;
  const dt = Math.min(0.05, (now - lt) / 1000); lt = now;
  update(dt); draw(now / 1000);
  requestAnimationFrame(frame);
}
function update(dt) {
  noWatte = Math.max(0, noWatte - dt); gustFlash = Math.max(0, gustFlash - dt); flash = Math.max(0, flash - dt * 1.6);
  const m = cut.order.mods;
  if (cut.state === 'arrive') {
    animT += dt; offX = 640 * (1 - ease(animT / 1.3)); offY = 0;
    if (animT >= 1.3) { cut.state = 'play'; offX = 0; }
  } else if (cut.state === 'play') {
    timeLeft -= dt; hintT = Math.max(0, hintT - dt);
    prog = 1 - timeLeft / timeMax;
    if (m.regrow) { regAcc += (0.9 + Math.max(0, cut.lvl) * 0.25) * dt; while (regAcc >= 1) { regAcc--; growOne(); } }
    if (m.gusts) { gustT -= dt; if (gustT <= 0) { gust(); gustT = 3.5 + RND() * 3.5; } }
    if (cut.onProg && performance.now() - lastProg > 500) { lastProg = performance.now(); cut.onProg(cur); }
    if (timeLeft <= 0) { timeLeft = 0; release(); }
  } else if (cut.state === 'travel') {
    animT += dt; prog = progFrom + (1 - progFrom) * ease(animT / 1.4);
    if (animT >= 1.4) { prog = 1; cut.state = 'flash'; animT = 0; flash = 1; A.shutter(); }
  } else if (cut.state === 'flash') {
    animT += dt; if (animT > 0.6) { cut.state = 'done'; const d = cut.onDone; stop(); d && d(); return; }
  }
  camX = DORF - (1090 - 640 * prog);
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.vx *= 0.97; p.vy += (p.kind === 'cut' ? 25 : -6) * dt; p.life -= dt * (p.kind === 'cut' ? 0.8 : 1.5); }
  particles = particles.filter(p => p.life > 0);
  for (const s of streaks) { s.x -= s.v * dt; s.life -= dt; }
  streaks = streaks.filter(s => s.life > 0);
  if (Math.random() < dt * 0.6) streaks.push({ x: W + 50, y: 40 + Math.random() * 380, len: 60 + Math.random() * 140, v: 300 + Math.random() * 300, life: 4 });
  for (const c of farClouds) { c.x -= dt * 8; if (c.x < -300) { c.x = 1200 + Math.random() * 200; c.y = 30 + Math.random() * 330; } }
  if (Math.random() < dt * 0.05 && birds.length < 2) birds.push({ x: W + 40, y: 120 + Math.random() * 200, n: 3 + ((Math.random() * 5) | 0), v: 40 + Math.random() * 30, t: 0 });
  for (const b of birds) { b.x -= b.v * dt; b.t += dt; }
  birds = birds.filter(b => b.x > -120);
}
function growOne() {
  for (let tries = 0; tries < 40; tries++) {
    const k = (RND() * N) | 0; if (!cloud[k]) continue;
    const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][(RND() * 4) | 0];
    const x = k % COLS + d[0], y = ((k / COLS) | 0) + d[1];
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
    const k2 = y * COLS + x; if (cloud[k2]) continue;
    cloud[k2] = 1; dirty = true; return;
  }
}
function gust() {
  const cand = [];
  for (let k = 0; k < N; k++) if (cloud[k]) { const x = k % COLS; if (x < COLS - 1 && !cloud[k + 1]) cand.push(k); }
  if (!cand.length) return;
  for (let i = 0; i < 2; i++) { const k = pick(cand, RND); stamp(cloud, k % COLS + 2, ((k / COLS) | 0) + (RND() * 4 - 2), 2.5 + RND() * 1.5, 1); }
  dirty = true; gustFlash = 1.2; A.windSound();
  for (let i = 0; i < 8; i++) streaks.push({ x: W + Math.random() * 100, y: OY + Math.random() * 300, len: 100 + Math.random() * 150, v: 700 + Math.random() * 300, life: 2, strong: 1 });
}

// ---------------- Zeichnen ----------------
function ridge(x, s, base, amp, sharp) {
  let v = 0.45 * (1 - Math.abs(Math.sin(x * 0.0042 + s))) + 0.3 * Math.sin(x * 0.0093 + s * 1.7) + 0.18 * Math.sin(x * 0.023 + s * 2.9) + 0.07 * Math.sin(x * 0.061 + s);
  if (sharp) v = 0.6 * (1 - Math.abs(Math.sin(x * 0.0031 + s))) ** 1.6 + v * 0.5;
  return base - amp * v;
}
function layerPath(fac, base, amp, s, sharp) {
  const cx = camX * fac; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, ridge(x + cx, s, base, amp, sharp));
  ctx.lineTo(W, H); ctx.closePath();
}
const BANDS = [0, 0.26, 0.45, 0.6, 0.72, 0.82, 0.91, 1];
function drawSky(g, T, h) {
  for (let i = 0; i < T.sky.length; i++) { g.fillStyle = T.sky[i]; g.fillRect(0, Math.floor(BANDS[i] * h), W, Math.ceil((BANDS[i + 1] - BANDS[i]) * h) + 1); }
  g.fillStyle = T.sky[T.sky.length - 1]; g.fillRect(0, h, W, H - h);
}
function paperCloud(x, y, s, col, seed) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = seed + i * 1.9, dx = (i - 2.5) * 20 * s, dy = -Math.abs(Math.sin(a)) * 12 * s, r = (14 + 9 * Math.abs(Math.cos(a))) * s; ctx.moveTo(x + dx + r, y + dy); ctx.arc(x + dx, y + dy, r, Math.PI, 0); }
  ctx.rect(x - 60 * s, y - 1, 120 * s, 2 + 4 * s); ctx.fill();
}
function draw(time) {
  const T = cut.tod, night = T === TOD.night;
  drawSky(ctx, T, 470);
  if (T.stars) { ctx.fillStyle = PAL.schnee; for (const s of skyStars) { ctx.globalAlpha = T.stars * (0.5 + 0.5 * Math.sin(time * 1.2 + s.p)); ctx.fillRect(s.x, s.y, s.r + 0.4, s.r + 0.4); } ctx.globalAlpha = 1; }
  const S = T.sun;
  ctx.fillStyle = S.c;
  ctx.globalAlpha = 0.14; ctx.beginPath(); ctx.arc(S.x, S.y, S.r * 2.3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.arc(S.x, S.y, S.r * 1.55, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(S.x, S.y, S.r, 0, Math.PI * 2); ctx.fill();
  if (S.moon) { ctx.fillStyle = T.sky[1]; ctx.beginPath(); ctx.arc(S.x + 11, S.y - 7, S.r * 0.86, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = night ? 0.16 : 0.55;
  for (const c of farClouds) paperCloud(c.x - (camX * 0.05) % 1400, c.y, c.s, PAL.schnee, c.seed);
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  for (const s of streaks) {
    ctx.strokeStyle = night ? 'rgba(243,241,234,0.18)' : (s.strong ? 'rgba(34,48,58,0.35)' : 'rgba(34,48,58,0.12)'); ctx.lineWidth = s.strong ? 1.4 : 1;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.len, s.y); ctx.stroke();
  }
  ctx.strokeStyle = night ? 'rgba(243,241,234,0.5)' : INK; ctx.lineWidth = 1.5;
  for (const b of birds) for (let i = 0; i < b.n; i++) {
    const x = b.x + i * 16 + (i % 2) * 6, y = b.y + Math.abs(i - b.n / 2) * 8, f = Math.sin(b.t * 9 + i) * 3;
    ctx.beginPath(); ctx.moveTo(x - 5, y - f); ctx.quadraticCurveTo(x - 2, y - 1, x, y); ctx.quadraticCurveTo(x + 2, y - 1, x + 5, y - f); ctx.stroke();
  }
  layerPath(0.15, 450, 170, 1.3, true); ctx.fillStyle = T.far; ctx.fill();
  ctx.save(); layerPath(0.15, 450, 170, 1.3, true); ctx.clip();
  ctx.fillStyle = T.snow; ctx.beginPath(); ctx.moveTo(0, 0);
  const cxm = camX * 0.15;
  for (let x = 0; x <= W + 8; x += 8) { const y = ridge(x + cxm, 1.3, 450, 170, true); const d = Math.max(0, 352 - y) * 0.55 + (y < 352 ? 4 + 5 * Math.sin((x + cxm) * 0.09) : 0); ctx.lineTo(x, y + d); }
  ctx.lineTo(W, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  layerPath(0.4, 515, 70, 4.1, false); ctx.fillStyle = T.hill1; ctx.fill();
  layerPath(0.65, 548, 34, 7.7, false); ctx.fillStyle = T.hill2; ctx.fill();

  if (dirty) renderCloud();
  const bob = Math.sin(time * 0.8) * 2.5;
  const cx0 = OX - 15 + offX, cy0 = OY - 15 + offY + bob;
  ctx.drawImage(cloudCv, cx0, cy0);
  if (cut.state === 'play' && !cut.free && (cut.order.mods.outline || hintT > 0)) {
    ctx.fillStyle = ROT; ctx.globalAlpha = cut.order.mods.outline ? 0.9 : Math.min(1, hintT);
    for (let k = 0; k < N; k++) if (edge[k] && ((k % COLS) + ((k / COLS) | 0)) % 2 === 0) ctx.fillRect(cx0 + 15 + (k % COLS) * CELL + 1, cy0 + 15 + ((k / COLS) | 0) * CELL + 1.5, 3, 2);
    ctx.globalAlpha = 1;
  }
  drawTown(time);
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
    if (p.kind === 'cut') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = T.cb; ctx.fillRect(-p.r / 2, -p.r * 0.35, p.r, p.r * 0.7); ctx.fillStyle = 'rgba(34,48,58,0.12)'; ctx.fillRect(-p.r / 2, p.r * 0.2, p.r, p.r * 0.15); ctx.restore(); }
    else { ctx.fillStyle = T.cl; ctx.globalAlpha *= 0.7; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.6 - p.life * 0.6), 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  if (cut.state === 'play' || cut.state === 'arrive') drawHud();
  if (hover && cut.state === 'play') {
    const tl = activeTool(), r = (radius(tl) + 0.6) * CELL;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(243,241,234,0.85)'; ctx.beginPath(); ctx.arc(hover.x, hover.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = tl === 'puff' && watte <= 0 ? ROT : INK; ctx.setLineDash(tl === 'puff' ? [4, 3] : []);
    ctx.beginPath(); ctx.arc(hover.x, hover.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = INK; ctx.fillRect(hover.x - 1, hover.y - 1, 2, 2);
  }
  if (flash > 0) { ctx.fillStyle = `rgba(243,241,234,${flash * 0.85})`; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = grainPat; ctx.fillRect(0, 0, W, H);
}
function fir(x, base, h) {
  ctx.fillRect(x - 1.5, base - h * 0.22, 3, h * 0.22);
  for (let i = 0; i < 3; i++) { const w = h * (0.42 - i * 0.1), y = base - h * 0.18 - i * h * 0.26; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - h * 0.42); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill(); }
}
function cow(x, base, dir, step) {
  ctx.save(); ctx.translate(x, base); ctx.scale(dir, 1);
  ctx.beginPath(); ctx.ellipse(0, -11, 10, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(11.5, -14, 3.6, 2.8, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(8, -15, 4, 3);
  ctx.beginPath(); ctx.moveTo(10, -16.5); ctx.lineTo(9, -20); ctx.lineTo(11, -17); ctx.fill();
  ctx.beginPath(); ctx.moveTo(13, -16.5); ctx.lineTo(15, -19.5); ctx.lineTo(14, -16); ctx.fill();
  const s = Math.sin(step) * 1.5;
  for (const lx of [-7, -4, 4, 7]) ctx.fillRect(lx + (lx > 0 ? s : -s) * 0.5, -7, 1.8, 7);
  ctx.fillRect(9.5, -11.5, 1.4, 3); ctx.beginPath(); ctx.arc(10.2, -8, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-11, -14, 1.2, 8);
  ctx.restore();
}
function drawTown(time) {
  const T = cut.tod, cam = camX, base = 556;
  ctx.fillStyle = T.ink;
  for (const tr of town.trees) { const x = tr.x - cam; if (x < -40 || x > W + 40) continue; fir(x, base, tr.h + 10); }
  for (const h of town.houses) {
    const x = h.x - cam; if (x + h.w < -14 || x > W + 14) continue;
    ctx.fillStyle = T.ink; ctx.fillRect(x, base - h.h, h.w, h.h);
    ctx.beginPath(); ctx.moveTo(x - 6, base - h.h + 2); ctx.lineTo(x + h.w / 2, base - h.h - h.rh); ctx.lineTo(x + h.w + 6, base - h.h + 2); ctx.closePath(); ctx.fill();
    if (h.roof) ctx.fillRect(x + h.w * 0.72, base - h.h - h.rh * 0.75, 4, h.rh * 0.6);
    ctx.fillStyle = T.win;
    for (const [dx, dy, r] of h.win) if (dx + 5 < h.w && dy + 6 < h.h && (T.stars ? r < 0.6 : r < 0.75)) ctx.fillRect(x + dx, base - h.h + dy, 4, 5);
    if (h.w > 34 && h.rh > 14) { const hx = x + h.w / 2, hy = base - h.h - h.rh * 0.35; ctx.beginPath(); ctx.moveTo(hx, hy + 3); ctx.bezierCurveTo(hx - 4, hy, hx - 3, hy - 3.5, hx, hy - 1.5); ctx.bezierCurveTo(hx + 3, hy - 3.5, hx + 4, hy, hx, hy + 3); ctx.fill(); }
    ctx.fillStyle = T.ink;
  }
  for (const hx of [760, 2220]) {
    const x = hx - cam; if (x < -120 || x > W + 60) continue;
    ctx.fillStyle = T.ink;
    for (let i = 0; i < 4; i++) cow(x + i * 28, base, -1, time * 4 + i);
    ctx.fillRect(x - 20, base - 15, 3, 15); ctx.beginPath(); ctx.arc(x - 18.5, base - 17.5, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 25, base - 26, 1.4, 26);
  }
  const cx = DORF - cam;
  if (cx > -120 && cx < W + 120) {
    ctx.fillStyle = T.ink;
    ctx.fillRect(cx + 18, base - 56, 70, 56);
    ctx.beginPath(); ctx.moveTo(cx + 12, base - 54); ctx.lineTo(cx + 53, base - 84); ctx.lineTo(cx + 94, base - 54); ctx.fill();
    ctx.fillRect(cx - 4, base - 128, 24, 128);
    ctx.beginPath(); ctx.moveTo(cx - 8, base - 128); ctx.lineTo(cx + 8, base - 176); ctx.lineTo(cx + 24, base - 128); ctx.fill();
    ctx.fillRect(cx + 7.2, base - 190, 1.6, 15); ctx.fillRect(cx + 3.5, base - 185, 9, 1.6);
    ctx.fillStyle = T.win; ctx.beginPath(); ctx.arc(cx + 8, base - 108, 6, 0, Math.PI * 2); ctx.fill();
    for (const wx of [32, 50, 68]) { ctx.beginPath(); ctx.moveTo(wx + cx, base - 22); ctx.lineTo(wx + cx, base - 36); ctx.arc(wx + cx + 3, base - 36, 3, Math.PI, 0); ctx.lineTo(wx + cx + 6, base - 22); ctx.fill(); }
    ctx.fillStyle = T.ink; ctx.fillRect(cx + 7.5, base - 112, 1, 4); ctx.fillRect(cx + 8, base - 108.5, 3, 1);
    const look = cut.state === 'flash' || (cut.state === 'travel' && prog > 0.9);
    const r = rng(7);
    for (let i = 0; i < 18; i++) {
      const px = cx - 90 + r() * 80 + (i % 2 ? 130 : 0), hgt = 9 + r() * 3;
      ctx.fillStyle = T.ink; ctx.fillRect(px, base - hgt, 3, hgt); ctx.beginPath(); ctx.arc(px + 1.5, base - hgt - 2, 2.2, 0, Math.PI * 2); ctx.fill();
      if (look && r() < 0.6) { ctx.fillStyle = T.win; ctx.fillRect(px + 2, base - hgt - 7, 3, 4); } else r();
    }
    if (cut.state === 'play' || cut.state === 'arrive') {
      ctx.strokeStyle = 'rgba(34,48,58,0.4)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx + 8, base - 206); ctx.lineTo(cx + 8, OY + 320); ctx.stroke(); ctx.setLineDash([]);
      const lab = t('hud.square');
      ctx.font = `500 12px ${F_SANS}`; const tw = ctx.measureText(lab).width;
      ctx.fillStyle = BLATT; ctx.fillRect(cx + 8 - tw / 2 - 7, base - 228, tw + 14, 20);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(cx + 8 - tw / 2 - 7, base - 228, tw + 14, 20);
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(lab, cx + 8, base - 214); ctx.textAlign = 'left';
    }
  }
  ctx.fillStyle = T.ink; ctx.fillRect(0, base, W, H - base);
  ctx.fillStyle = T.win; ctx.globalAlpha = 0.55;
  const off = -(cam % 24);
  for (let x = off; x < W + 24; x += 24) { ctx.beginPath(); ctx.moveTo(x, base + 22); ctx.lineTo(x + 5, base + 17); ctx.lineTo(x + 10, base + 22); ctx.lineTo(x + 5, base + 27); ctx.closePath(); ctx.fill(); ctx.fillRect(x + 14, base + 21.4, 6, 1.2); }
  ctx.globalAlpha = 1;
}
function slip(x, y, w, h) {
  ctx.fillStyle = 'rgba(34,48,58,0.25)'; ctx.fillRect(x + 4, y + 4, w, h);
  ctx.fillStyle = BLATT; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
}
function drawHud() {
  const free = cut.free, order = cut.order;
  ctx.save(); ctx.textBaseline = 'alphabetic';
  slip(18, 18, 178, free ? 64 : 160);
  ctx.font = `500 12px ${F_SANS}`; ctx.fillStyle = GRAU; ctx.fillText(free ? t('free.title') : t('order.no', { n: pad(cut.lvl + 1) }), 30, 38);
  ctx.font = `16px ${F_SERIF}`; ctx.fillStyle = INK; fitText(free ? t('free.hud') : nameOf(order.from), 30, 58, 156);
  if (!free && targetImg) ctx.drawImage(targetImg, 47, 70, 120, 90);
  const x = 650, w = 232;
  slip(x, 18, w, free ? 64 : 112);
  ctx.font = `500 12px ${F_SANS}`; ctx.fillStyle = GRAU; ctx.fillText(t('hud.arrival'), x + 14, 38);
  ctx.fillStyle = LINIE; ctx.fillRect(x + 14, 46, w - 28, 4);
  const f = 1 - timeLeft / timeMax;
  ctx.fillStyle = timeLeft < 8 ? ROT : INK; ctx.fillRect(x + 14, 46, (w - 28) * f, 4);
  ctx.font = `700 16px ${F_SANS}`; ctx.fillStyle = timeLeft < 8 ? ROT : INK; ctx.fillText(`${Math.ceil(timeLeft)} s`, x + 14, 70);
  if (!free) {
    ctx.font = `500 12px ${F_SANS}`; ctx.fillStyle = GRAU; ctx.fillText(t('hud.match'), x + 14, 94);
    ctx.fillStyle = LINIE; ctx.fillRect(x + 14, 102, w - 28, 4);
    ctx.fillStyle = INK; ctx.fillRect(x + 14, 102, (w - 28) * cur, 4);
    for (const th of THRESH) { ctx.fillStyle = ROT; ctx.fillRect(x + 14 + (w - 28) * th - 1, 98, 2, 12); }
    const st = THRESH.filter(th => cur >= th).length;
    ctx.font = `700 16px ${F_SANS}`; ctx.fillStyle = INK; ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(cur * 100)} %  ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, x + w - 14, 70);
    ctx.textAlign = 'left';
  }
  const tag = (txt, y, col, a) => {
    ctx.globalAlpha = Math.min(1, a); ctx.font = `700 14px ${F_SANS}`; const tw = ctx.measureText(txt).width;
    slip(W / 2 - tw / 2 - 10, y, tw + 20, 26); ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.fillText(txt, W / 2, y + 18); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  };
  if (gustFlash > 0) tag(t('hud.gust'), 20, INK, gustFlash);
  if (noWatte > 0) tag(t('hud.nosteam'), 52, ROT, noWatte);
  if (cut.state === 'play' && !free && order.mods.regrow) { ctx.fillStyle = 'rgba(243,241,234,0.8)'; ctx.font = `500 12px ${F_SANS}`; ctx.textAlign = 'center'; ctx.fillText(t('hud.regrow'), W / 2, H - 10); }
  ctx.restore();
}
function fitText(s, x, y, maxW) { let sz = 16; do { ctx.font = `${sz}px ${F_SERIF}`; sz--; } while (ctx.measureText(s).width > maxW && sz > 10); ctx.fillText(s, x, y); }
import { NAMES } from './data.js';
export const nameOf = k => L(NAMES[k] || k);

// ---------------- Postkarte ----------------
const CROWN = new Path2D('M20 70 V36 L35 50 L50 28 L65 50 L80 36 V70 Z M50 64 C43 59.5 41.5 53.5 45.5 52 C47.8 51.2 49.4 52.6 50 54 C50.6 52.6 52.2 51.2 54.5 52 C58.5 53.5 57 59.5 50 64 Z');
function drawStudioMark(g, x, y, col) {
  g.save(); g.textAlign = 'right'; g.textBaseline = 'alphabetic';
  g.fillStyle = col || INK; g.font = '600 13px "Space Grotesk", "Helvetica Neue", Arial, sans-serif';
  if ('letterSpacing' in g) g.letterSpacing = '3px';
  const label = 'DUCHY GAMES', w = g.measureText(label).width;
  g.fillText(label, x, y);
  const s = 0.3, cx = x - w - 10 - 66 * s;
  g.translate(cx - 14 * s, y - 62 * s); g.scale(s, s); g.fillStyle = '#C8A251';
  g.fill(CROWN, 'evenodd'); g.beginPath(); g.rect(20, 74, 60, 7); g.fill();
  for (const [px, py] of [[20, 33], [50, 25], [80, 33]]) { g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
export function postcard(line1, line2) {
  const c2 = document.createElement('canvas'); c2.width = 900; c2.height = 690;
  const g = c2.getContext('2d');
  g.fillStyle = PAL.schnee; g.fillRect(0, 0, 900, 690);
  g.drawImage(cv, 0, 0, 900, 600);
  g.fillStyle = INK; g.fillRect(0, 600, 900, 1.5);
  g.font = '26px "Young Serif", Georgia, serif'; g.fillStyle = INK; g.fillText(line1, 28, 640);
  g.font = '500 14px "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif'; g.fillStyle = GRAU; g.fillText(line2, 28, 668);
  g.save(); g.translate(842, 616); g.rotate(-0.12); g.strokeStyle = ROT; g.lineWidth = 2.5; g.globalAlpha = 0.85;
  g.beginPath(); g.arc(0, 20, 30, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 20, 25, 0, Math.PI * 2); g.lineWidth = 1; g.stroke();
  g.fillStyle = ROT; g.font = '700 8px "Courier Prime", monospace'; g.textAlign = 'center'; g.fillText('Wolkenwil', 0, 17); g.fillText(t('pc.official'), 0, 28); g.restore();
  drawStudioMark(g, 790, 668);
  return c2.toDataURL('image/png');
}
