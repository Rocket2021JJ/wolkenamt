// HOCHDRUCK – Wolkenwiler Anzeiger: Zeitungsbilder im Rasterdruck (Halbton), von Hand gezeichnet auf Canvas.
// Jedes Motiv ist eine kleine Zeichnung aus Grundformen. Keine Fotos, keine fremden Bilder.

const INK = '#22272B', PAPER = '#EDE8DA';

// Motiv anhand von Stichwörtern im Text wählen (Deutsch und Englisch)
const KEYS = [
  ['huber', /huber/i],
  ['money', /umschlag|envelope|kasse|fund|chf|geld|money|bestech|brib|spende|donat/i],
  ['inspector', /wyss|kanton|canton|inspekt|ermittl|investig|untersuch/i],
  ['storm', /blitz|lightning|sturm|storm|gewitter|hagel|hail/i],
  ['fog', /nebel|fog/i],
  ['drought', /dürre|drought|trocken|dry|kein regen|no rain/i],
  ['rain', /regen|rain|flut|flood|garten|murgang|mudslide/i],
  ['cable', /seilbahn|cable car/i],
  ['ballot', /wahl|election|urne|ballot|abstimm|referend|stimm|vote/i],
  ['crowd', /podium|debate|versammlung|meeting|sitzung|turnfest|festival|verein|club/i],
];
export function pickMotif(text, from = '') {
  const s = text + ' ' + from;
  for (const [m, re] of KEYS) if (re.test(s)) return m;
  return 'village';
}

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// Rasterpunkte: Dichte d(x,y) zwischen 0 und 1
function halftone(c, x0, y0, w, h, d, step = 5) {
  c.fillStyle = INK;
  for (let y = y0; y < y0 + h; y += step) for (let x = x0 + ((y / step) % 2 ? step / 2 : 0); x < x0 + w; x += step) {
    const v = d(x, y); if (v <= 0.02) continue;
    c.beginPath(); c.arc(x, y, Math.min(step * 0.62, step * 0.5 * Math.sqrt(v) * 1.15), 0, Math.PI * 2); c.fill();
  }
}
// Fläche mit Rasterpunkten füllen (Pfad als Clip)
function shade(c, path, dens, W, H, step = 4) {
  c.save(); path(); c.clip(); halftone(c, 0, 0, W, H, typeof dens === 'function' ? dens : () => dens, step); c.restore();
}
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); }
function cloud(c, x, y, s, dark, W, H) {
  const blobs = [[-0.9, 0.1, 0.55], [-0.35, -0.25, 0.7], [0.35, -0.2, 0.62], [0.9, 0.12, 0.5], [0, 0.2, 0.6]];
  const path = () => { c.beginPath(); for (const [bx, by, r] of blobs) { c.moveTo(x + bx * s + r * s, y + by * s); c.arc(x + bx * s, y + by * s, r * s, 0, Math.PI * 2); } };
  c.fillStyle = PAPER; path(); c.fill();
  if (dark) shade(c, path, dark, W, H, 4);
  c.strokeStyle = INK; c.lineWidth = 2; for (const [bx, by, r] of blobs) { c.beginPath(); c.arc(x + bx * s, y + by * s, r * s, Math.PI * 0.95, Math.PI * 2.05); c.stroke(); }
}
function sky(c, W, H, top = 0.55) { halftone(c, 0, 0, W, H * 0.75, (x, y) => top * (1 - y / (H * 0.75)), 6); }
function mountains(c, W, H, r) {
  const base = H * 0.62;
  const pts = [[0, base]]; let x = 0;
  while (x < W) { x += 60 + r() * 70; pts.push([x - 35, base - 50 - r() * 60], [x, base - 10]); }
  pts.push([W, H], [0, H]);
  shade(c, () => poly(c, pts), 0.35, W, H, 5);
  c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1, -2)) c.lineTo(p[0], p[1]); c.stroke();
}
function houses(c, W, H, r, y = H * 0.72) {
  let x = -10;
  while (x < W) {
    const w = 34 + r() * 26, h = 22 + r() * 18, roof = 14 + r() * 8;
    const body = () => { c.beginPath(); c.rect(x, y - h, w, h + 2); };
    c.fillStyle = PAPER; body(); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; body(); c.stroke();
    poly(c, [[x - 5, y - h], [x + w / 2, y - h - roof], [x + w + 5, y - h]]); c.fillStyle = INK; c.fill();
    c.fillStyle = INK; for (let wx = x + 7; wx < x + w - 8; wx += 12) c.fillRect(wx, y - h + 7, 6, 8);
    if (r() < 0.18) { c.fillStyle = PAPER; c.fillRect(x + w / 2 - 5, y - h - roof - 26, 10, 30); c.strokeRect(x + w / 2 - 5, y - h - roof - 26, 10, 30); poly(c, [[x + w / 2 - 8, y - h - roof - 26], [x + w / 2, y - h - roof - 44], [x + w / 2 + 8, y - h - roof - 26]]); c.fillStyle = INK; c.fill(); }
    x += w + 6 + r() * 10;
  }
  c.fillStyle = INK; c.fillRect(0, y + 2, W, 3);
  halftone(c, 0, y + 6, W, H - y, () => 0.22, 5);
}
function grain(c, W, H, r) { c.fillStyle = 'rgba(34,39,43,.06)'; for (let i = 0; i < W * H / 90; i++) c.fillRect(r() * W, r() * H, 1, 1); }

const DRAW = {
  village(c, W, H, r) { sky(c, W, H); mountains(c, W, H, r); houses(c, W, H, r); cloud(c, W * 0.42, H * 0.25, 30, 0, W, H); },
  rain(c, W, H, r) {
    sky(c, W, H, 0.7); mountains(c, W, H, r); houses(c, W, H, r);
    cloud(c, W * 0.5, H * 0.2, 40, 0.55, W, H);
    c.strokeStyle = INK; c.lineWidth = 1.3;
    for (let i = 0; i < 70; i++) { const x = W * 0.25 + r() * W * 0.5, y = H * 0.3 + r() * H * 0.45; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 5, y + 14); c.stroke(); }
  },
  storm(c, W, H, r) {
    sky(c, W, H, 0.85); mountains(c, W, H, r); houses(c, W, H, r);
    cloud(c, W * 0.4, H * 0.2, 44, 0.75, W, H);
    poly(c, [[W * 0.42, H * 0.3], [W * 0.38, H * 0.48], [W * 0.43, H * 0.47], [W * 0.37, H * 0.7], [W * 0.5, H * 0.43], [W * 0.45, H * 0.44], [W * 0.5, H * 0.3]]);
    c.fillStyle = PAPER; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  },
  fog(c, W, H, r) {
    sky(c, W, H, 0.3); mountains(c, W, H, r); houses(c, W, H, r);
    for (let i = 0; i < 6; i++) { const y = H * (0.35 + i * 0.09); c.fillStyle = 'rgba(237,232,218,.82)'; c.fillRect(-20 + r() * 40, y, W, 14 + r() * 10); }
  },
  drought(c, W, H, r) {
    halftone(c, 0, 0, W, H * 0.6, () => 0.08, 6);
    const sx = W * 0.72, sy = H * 0.26; c.strokeStyle = INK; c.lineWidth = 2.5;
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; c.beginPath(); c.moveTo(sx + Math.cos(a) * 40, sy + Math.sin(a) * 40); c.lineTo(sx + Math.cos(a) * 60, sy + Math.sin(a) * 60); c.stroke(); }
    c.beginPath(); c.arc(sx, sy, 32, 0, Math.PI * 2); c.fillStyle = PAPER; c.fill(); c.stroke();
    halftone(c, 0, H * 0.6, W, H * 0.4, () => 0.35, 5);
    c.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) { let x = r() * W, y = H * 0.62 + r() * H * 0.36; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 30; y += (r() - 0.3) * 10; c.lineTo(x, y); } c.stroke(); }
    // verdorrte Ähren
    for (let i = 0; i < 9; i++) { const x = 30 + i * 22; c.beginPath(); c.moveTo(x, H * 0.62); c.quadraticCurveTo(x + 6, H * 0.48, x + 14, H * 0.52); c.stroke(); }
  },
  huber(c, W, H, r) {
    halftone(c, 0, 0, W, H, (x, y) => 0.18 + 0.3 * (x / W), 6);
    const cx = W * 0.5, cy = H * 0.42;
    // Schultern / Anzug
    const suit = () => { c.beginPath(); c.moveTo(cx - 120, H); c.quadraticCurveTo(cx - 115, cy + 55, cx - 30, cy + 48); c.lineTo(cx + 30, cy + 48); c.quadraticCurveTo(cx + 115, cy + 55, cx + 120, H); c.closePath(); };
    c.fillStyle = INK; suit(); c.fill();
    poly(c, [[cx - 26, cy + 48], [cx, cy + 110], [cx + 26, cy + 48]]); c.fillStyle = PAPER; c.fill();
    poly(c, [[cx - 6, cy + 52], [cx + 6, cy + 52], [cx + 9, cy + 100], [cx, cy + 112], [cx - 9, cy + 100]]); c.fillStyle = INK; c.fill();
    // Amtskette
    c.strokeStyle = PAPER; c.lineWidth = 3; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(cx - 55, cy + 60); c.quadraticCurveTo(cx, cy + 150, cx + 55, cy + 60); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(cx, cy + 118, 10, 0, Math.PI * 2); c.fillStyle = PAPER; c.fill();
    // Kopf
    const head = () => { c.beginPath(); c.ellipse(cx, cy, 40, 48, 0, 0, Math.PI * 2); };
    c.fillStyle = PAPER; head(); c.fill();
    shade(c, head, (x) => Math.max(0, (x - cx + 10) / 60) * 0.6, W, H, 3.5);
    c.strokeStyle = INK; c.lineWidth = 2; head(); c.stroke();
    // Haarkranz, Schnauz, Brille
    c.lineWidth = 6; c.beginPath(); c.arc(cx, cy - 4, 40, Math.PI * 0.95, Math.PI * 1.25); c.stroke(); c.beginPath(); c.arc(cx, cy - 4, 40, Math.PI * 1.75, Math.PI * 2.05); c.stroke();
    c.lineWidth = 2; c.strokeRect(cx - 26, cy - 8, 20, 13); c.strokeRect(cx + 6, cy - 8, 20, 13); c.beginPath(); c.moveTo(cx - 6, cy - 2); c.lineTo(cx + 6, cy - 2); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.ellipse(cx - 10, cy + 22, 14, 5, 0.25, 0, Math.PI * 2); c.ellipse(cx + 10, cy + 22, 14, 5, -0.25, 0, Math.PI * 2); c.fill();
    // Mikrofon
    c.fillStyle = INK; c.fillRect(W * 0.2 - 3, cy + 30, 6, H); c.beginPath(); c.ellipse(W * 0.2, cy + 26, 11, 15, 0, 0, Math.PI * 2); c.fill();
  },
  money(c, W, H, r) {
    halftone(c, 0, 0, W, H, () => 0.12, 6);
    // Tischkante
    halftone(c, 0, H * 0.7, W, H * 0.3, () => 0.4, 4);
    c.save(); c.translate(W * 0.5, H * 0.48); c.rotate(-0.12);
    // Noten
    for (let i = 0; i < 3; i++) { c.save(); c.rotate(-0.2 + i * 0.16); c.fillStyle = PAPER; c.fillRect(-60, -70 - i * 4, 120, 60); c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(-60, -70 - i * 4, 120, 60); c.font = 'bold 18px Georgia,serif'; c.fillStyle = INK; c.fillText('1000', -50, -45 - i * 4); c.beginPath(); c.arc(30, -42 - i * 4, 12, 0, Math.PI * 2); c.stroke(); c.restore(); }
    // Umschlag
    c.fillStyle = PAPER; c.fillRect(-90, -40, 180, 100); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(-90, -40, 180, 100);
    c.beginPath(); c.moveTo(-90, -40); c.lineTo(0, 20); c.lineTo(90, -40); c.stroke();
    c.beginPath(); c.moveTo(-90, 60); c.lineTo(-8, 14); c.moveTo(90, 60); c.lineTo(8, 14); c.stroke();
    c.font = 'italic 13px Georgia,serif'; c.fillStyle = INK; c.fillText('vertraulich', -78, -26);
    c.restore();
  },
  inspector(c, W, H, r) {
    sky(c, W, H, 0.35);
    const x0 = W * 0.18, x1 = W * 0.82, y0 = H * 0.3, y1 = H * 0.85;
    poly(c, [[x0 - 14, y0], [(x0 + x1) / 2, y0 - 46], [x1 + 14, y0]]); c.fillStyle = PAPER; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    c.fillStyle = PAPER; c.fillRect(x0, y0, x1 - x0, y1 - y0); c.strokeRect(x0, y0, x1 - x0, y1 - y0);
    for (let i = 0; i < 6; i++) { const x = x0 + 18 + i * (x1 - x0 - 36) / 5; shade(c, () => { c.beginPath(); c.rect(x - 7, y0 + 12, 14, y1 - y0 - 24); }, 0.45, W, H, 3); c.strokeRect(x - 7, y0 + 12, 14, y1 - y0 - 24); }
    c.font = 'bold 13px Georgia,serif'; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('KANTON', (x0 + x1) / 2, y0 - 8); c.textAlign = 'left';
    halftone(c, 0, y1, W, H - y1, () => 0.3, 5);
    // Lupe
    c.lineWidth = 9; c.beginPath(); c.moveTo(W * 0.74, H * 0.62); c.lineTo(W * 0.9, H * 0.88); c.stroke();
    c.lineWidth = 5; c.beginPath(); c.arc(W * 0.67, H * 0.5, 38, 0, Math.PI * 2); c.fillStyle = 'rgba(237,232,218,.7)'; c.fill(); c.stroke();
  },
  cable(c, W, H, r) {
    sky(c, W, H, 0.45);
    shade(c, () => poly(c, [[0, H], [0, H * 0.55], [W * 0.25, H * 0.15], [W * 0.5, H * 0.6], [W * 0.75, H * 0.25], [W, H * 0.5], [W, H]]), 0.35, W, H, 5);
    c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(W * 0.1, H * 0.62); c.quadraticCurveTo(W * 0.5, H * 0.45, W * 0.86, H * 0.2); c.stroke();
    c.beginPath(); c.moveTo(W * 0.1, H * 0.66); c.quadraticCurveTo(W * 0.5, H * 0.5, W * 0.86, H * 0.24); c.stroke();
    const gx = W * 0.55, gy = H * 0.43;
    c.lineWidth = 2; c.beginPath(); c.moveTo(gx, gy - 6); c.lineTo(gx, gy + 14); c.stroke();
    c.fillStyle = PAPER; c.fillRect(gx - 22, gy + 14, 44, 32); c.strokeRect(gx - 22, gy + 14, 44, 32);
    c.fillStyle = INK; c.fillRect(gx - 16, gy + 20, 12, 10); c.fillRect(gx + 4, gy + 20, 12, 10);
    c.setLineDash([5, 5]); c.beginPath(); c.moveTo(W * 0.62, gy + 30); c.lineTo(W * 0.8, gy + 50); c.stroke(); c.setLineDash([]);
    c.font = 'italic 13px Georgia,serif'; c.fillStyle = INK; c.fillText('(geplant)', W * 0.66, gy + 66);
  },
  ballot(c, W, H, r) {
    halftone(c, 0, 0, W, H, (x, y) => 0.1 + 0.25 * (y / H), 6);
    const bx = W * 0.5, by = H * 0.55;
    c.fillStyle = PAPER; c.fillRect(bx - 70, by - 40, 140, 100); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(bx - 70, by - 40, 140, 100);
    shade(c, () => { c.beginPath(); c.rect(bx + 30, by - 40, 40, 100); }, 0.4, W, H, 3.5);
    c.fillStyle = INK; c.fillRect(bx - 30, by - 44, 60, 6);
    c.save(); c.translate(bx + 6, by - 62); c.rotate(0.08); c.fillStyle = PAPER; c.fillRect(-24, -36, 48, 44); c.strokeRect(-24, -36, 48, 44);
    c.font = 'bold 15px Georgia,serif'; c.fillStyle = INK; c.fillText('JA', -10, -10); c.strokeRect(-17, -2, 9, 9); c.beginPath(); c.moveTo(-16, 2); c.lineTo(-12, 6); c.lineTo(-6, -4); c.stroke(); c.restore();
    c.font = 'bold 16px Georgia,serif'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText('URNE', bx - 15, by + 20); c.textAlign = 'left';
  },
  crowd(c, W, H, r) {
    halftone(c, 0, 0, W, H, () => 0.15, 6);
    // Rednerpult
    c.fillStyle = PAPER; c.fillRect(W * 0.46, H * 0.28, 50, 60); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(W * 0.46, H * 0.28, 50, 60);
    c.beginPath(); c.arc(W * 0.46 + 25, H * 0.2, 13, 0, Math.PI * 2); c.fillStyle = INK; c.fill();
    // Köpfe von hinten
    for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
      const x = 20 + i * (W - 40) / 8 + (row % 2) * 16 + (r() - 0.5) * 8, y = H * 0.62 + row * 30;
      c.fillStyle = INK; c.beginPath(); c.ellipse(x, y + 26, 22, 18, 0, Math.PI, 0); c.fill();
      c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill();
      if (r() < 0.3) { c.fillRect(x - 15, y - 9, 30, 4); c.fillRect(x - 9, y - 18, 18, 10); }
    }
  },
};

export function drawPicture(cv, motif, seed = 1) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, r = rng(seed * 7919 + 13);
  c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
  (DRAW[motif] || DRAW.village)(c, W, H, r);
  grain(c, W, H, r);
}

// Kleines Wettersymbol für die Seitenspalte
export function drawWeather(cv, kind) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height; c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
  c.strokeStyle = INK; c.fillStyle = INK; c.lineWidth = 2;
  if (kind === 'sun') { c.beginPath(); c.arc(W / 2, H / 2, 13, 0, Math.PI * 2); c.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * 18, H / 2 + Math.sin(a) * 18); c.lineTo(W / 2 + Math.cos(a) * 25, H / 2 + Math.sin(a) * 25); c.stroke(); } return; }
  cloud(c, W / 2, H * 0.45, 13, kind === 'storm' ? 0.6 : kind === 'rain' ? 0.35 : 0, W, H);
  if (kind === 'rain') for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(W / 2 - 15 + i * 6, H * 0.72); c.lineTo(W / 2 - 18 + i * 6, H * 0.9); c.stroke(); }
  if (kind === 'storm') { poly(c, [[W / 2, H * 0.62], [W / 2 - 6, H * 0.8], [W / 2, H * 0.78], [W / 2 - 4, H * 0.98], [W / 2 + 8, H * 0.72], [W / 2 + 2, H * 0.74], [W / 2 + 6, H * 0.62]]); c.fill(); }
  if (kind === 'fog') for (let i = 0; i < 3; i++) c.fillRect(W / 2 - 24 + i * 4, H * 0.72 + i * 6, 46, 2.5);
}
