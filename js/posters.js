// Alte Plakate im Schweizer Stil: eigene, erfundene Motive.
// Lithografie-Look: grosse flache Farbflächen, wenige Farben aus dem Farbkonzept,
// starke Silhouetten, grosse Schrift, Vergilbung, Knicke, abgestossene Ecken.
import { PAL, rng } from './palette.js';
import { t } from './i18n.js';

export const PW = 300, PH = 420;
const SERIF = '"Young Serif", Georgia, "Times New Roman", serif';
const SANS = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';

// Text so gross wie möglich in eine Breite einpassen
function fit(g, txt, x, y, maxW, size, font = SERIF, weight = '400', align = 'center') {
  let s = size;
  do { g.font = `${weight} ${s}px ${font}`; s -= 1; } while (g.measureText(txt).width > maxW && s > 8);
  g.textAlign = align; g.fillText(txt, x, y);
}
const poly = (g, pts) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
const ell = (g, x, y, rx, ry, a = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); g.fill(); };

// Wolke aus Bögen, unten flach (wie ein Scherenschnitt)
function cloud(g, x, y, s, col) {
  g.fillStyle = col; g.beginPath();
  const bumps = [[-34, 0, 18], [-14, -12, 22], [10, -16, 24], [32, -4, 18]];
  for (const [bx, by, r] of bumps) { g.moveTo(x + bx * s + r * s, y + by * s); g.arc(x + bx * s, y + by * s, r * s, Math.PI, 0); }
  g.rect(x - 52 * s, y - 2 * s, 102 * s, 10 * s); g.fill();
  for (const [bx, by, r] of bumps) circ(g, x + bx * s, y + by * s + 2 * s, r * s * 0.98);
}
function mountains(g, col, snow, base, r) {
  g.fillStyle = col; poly(g, [0, base, 0, base - 90, 60, base - 160, 108, base - 120, 168, base - 230, 236, base - 130, 300, base - 175, 300, base]);
  g.fillStyle = snow;
  poly(g, [168, base - 230, 141, base - 189, 156, base - 194, 166, base - 182, 181, base - 196, 196, base - 186]);
  poly(g, [60, base - 160, 44, base - 138, 58, base - 142, 70, base - 136]);
  poly(g, [300, base - 175, 278, base - 160, 290, base - 156, 300, base - 160]);
}
function chalet(g, x, base, w, h, wall, roof, ink) {
  g.fillStyle = wall; g.fillRect(x, base - h, w, h);
  g.fillStyle = roof; poly(g, [x - 6, base - h + 2, x + w / 2, base - h - w * 0.42, x + w + 6, base - h + 2]);
  g.fillStyle = ink; for (let i = 0; i < Math.max(1, Math.floor(w / 14)); i++) g.fillRect(x + 5 + i * 14, base - h + 9, 6, 7);
}
function stampRing(g, x, y, r, col, label) {
  g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.arc(x, y, r - 9, 0, Math.PI * 2); g.stroke();
  g.fillStyle = col; fit(g, label, x, y + 7, r * 1.4, 22, SANS, '700');
}
function cowSil(g, x, base, s, col) {
  g.fillStyle = col; g.save(); g.translate(x, base); g.scale(s, s);
  ell(g, 0, -22, 21, 11); ell(g, 23, -29, 7.5, 6, -0.4); g.fillRect(15, -31, 8, 7);
  poly(g, [20, -34, 18, -42, 23, -35]); poly(g, [27, -34, 31, -41, 29, -33]);
  for (const lx of [-15, -9, 8, 14]) g.fillRect(lx, -14, 4, 14);
  g.fillRect(-23, -27, 2.5, 16); circ(g, 21, -16, 3);
  g.restore();
}

const MOTIFS = {
  wolkenwil(g) {
    g.fillStyle = PAL.himmel; g.fillRect(0, 0, PW, PH);
    mountains(g, PAL.gletscher, PAL.schnee, 330, null);
    g.fillStyle = PAL.matte; poly(g, [0, 300, 70, 284, 150, 296, 230, 280, 300, 292, 300, 360, 0, 360]);
    chalet(g, 30, 340, 48, 30, PAL.chalet, PAL.rot, PAL.tinte); chalet(g, 92, 336, 38, 26, PAL.schnee, PAL.chalet, PAL.tinte);
    chalet(g, 196, 342, 56, 34, PAL.chalet, PAL.chalet, PAL.tinte);
    g.fillStyle = PAL.tinte; g.fillRect(150, 280, 10, 60); poly(g, [146, 282, 155, 248, 164, 282]);
    // geformte Wolke: ein Herz
    g.fillStyle = PAL.schnee; g.beginPath(); g.moveTo(150, 168); g.bezierCurveTo(96, 136, 92, 92, 124, 82); g.bezierCurveTo(140, 77, 148, 90, 150, 98); g.bezierCurveTo(152, 90, 160, 77, 176, 82); g.bezierCurveTo(208, 92, 204, 136, 150, 168); g.fill();
    g.fillStyle = PAL.schnee; g.fillRect(0, 360, PW, 60);
    g.fillStyle = PAL.rot; fit(g, t('poster.wolkenwil.a'), 150, 50, 260, 46);
    g.fillStyle = PAL.tinte; fit(g, t('poster.wolkenwil.b'), 150, 398, 262, 21);
  },
  amt(g) {
    g.fillStyle = PAL.blau; g.fillRect(0, 0, PW, PH);
    cloud(g, 92, 250, 1.3, PAL.schnee); cloud(g, 218, 300, 1.0, PAL.himmel);
    // Stempel
    g.fillStyle = PAL.chalet; g.fillRect(186, 92, 24, 70); ell(g, 198, 92, 20, 14);
    g.fillStyle = PAL.tinte; g.fillRect(170, 160, 56, 18);
    g.save(); g.translate(226, 222); g.rotate(-0.25); stampRing(g, 0, 0, 36, PAL.rot, '1897'); g.restore();
    // Schere
    g.save(); g.translate(96, 150); g.rotate(-0.5);
    g.fillStyle = PAL.schnee; poly(g, [0, -6, 92, -2, 0, 6]); g.rotate(0.55); poly(g, [0, -6, 92, 2, 0, 6]);
    g.strokeStyle = PAL.rot; g.lineWidth = 7; g.beginPath(); g.arc(-18, 12, 12, 0, 6.3); g.stroke(); g.beginPath(); g.arc(-20, -16, 12, 0, 6.3); g.stroke();
    g.restore();
    g.fillStyle = PAL.ocker; g.fillRect(24, 330, 252, 4);
    g.fillStyle = PAL.schnee; fit(g, t('poster.amt.a'), 150, 74, 250, 52);
    g.fillStyle = PAL.ocker; fit(g, t('poster.amt.b'), 150, 376, 250, 24);
  },
  foehn(g) {
    g.fillStyle = PAL.papier; g.fillRect(0, 0, PW, PH);
    g.strokeStyle = PAL.rot; g.lineWidth = 10; g.strokeRect(14, 14, PW - 28, PH - 28);
    // Windfahne
    g.fillStyle = PAL.tinte; g.fillRect(146, 120, 6, 150); poly(g, [149, 104, 140, 122, 158, 122]);
    poly(g, [152, 132, 236, 150, 222, 162, 238, 176, 152, 166]);
    g.fillRect(118, 236, 64, 5); g.fillRect(146, 210, 6, 56);
    fit(g, 'N', 149, 232, 20, 16, SANS, '700'); fit(g, 'S', 149, 290, 20, 16, SANS, '700');
    // Wind
    g.strokeStyle = PAL.gletscher; g.lineWidth = 4; g.lineCap = 'round';
    for (const [y, l] of [[140, 70], [170, 52], [200, 82]]) { g.beginPath(); g.moveTo(34, y); g.lineTo(34 + l, y); g.stroke(); }
    g.fillStyle = PAL.tinte; fit(g, t('poster.foehn.a'), 150, 68, 240, 34);
    fit(g, t('poster.foehn.b'), 150, 102, 240, 34);
    g.fillStyle = PAL.tinte; fit(g, t('poster.foehn.c'), 150, 330, 240, 12, SANS, '400');
    for (let i = 0; i < 4; i++) g.fillRect(40, 346 + i * 10, 220 - (i % 2) * 40, 2);
    // Wappen
    g.fillStyle = PAL.rot; g.beginPath(); g.moveTo(130, 382); g.lineTo(170, 382); g.lineTo(170, 394); g.quadraticCurveTo(170, 404, 150, 410); g.quadraticCurveTo(130, 404, 130, 394); g.fill();
  },
  f27b(g) {
    g.fillStyle = PAL.lino; g.fillRect(0, 0, PW, PH);
    g.save(); g.translate(150, 190); g.rotate(-0.09);
    g.fillStyle = PAL.tinte; g.fillRect(-82, -102, 172, 216);
    g.fillStyle = PAL.papier; g.fillRect(-90, -110, 172, 216);
    g.fillStyle = PAL.lino; g.fillRect(-90, -110, 172, 34);
    g.fillStyle = PAL.tinte; for (let i = 0; i < 8; i++) g.fillRect(-76, -54 + i * 18, 110 + (i % 3) * 10, 2);
    g.fillStyle = PAL.blau; fit(g, '27b', -4, 92, 120, 64);
    g.restore();
    stampRingRot(g);
    g.fillStyle = PAL.papier; fit(g, t('poster.f27b.a'), 150, 356, 250, 38);
    g.fillStyle = PAL.ocker; fit(g, t('poster.f27b.b'), 150, 392, 250, 22);
    function stampRingRot(g) { g.save(); g.translate(222, 120); g.rotate(0.3); g.globalAlpha = 0.9; stampRing(g, 0, 0, 34, PAL.rot, 'OK'); g.restore(); g.globalAlpha = 1; }
  },
  alp(g) {
    g.fillStyle = PAL.ocker; g.fillRect(0, 0, PW, PH);
    mountains(g, PAL.gletscher, PAL.schnee, 300, null);
    g.fillStyle = PAL.matte; poly(g, [0, 260, 120, 240, 220, 262, 300, 248, 300, 345, 0, 345]);
    g.fillStyle = PAL.tinte;
    for (let i = 0; i < 5; i++) cowSil(g, 36 + i * 50, 322 - i * 10, 1.05 - i * 0.07, PAL.tinte);
    g.fillRect(274, 260, 4, 46); circ(g, 276, 255, 5); g.fillRect(266, 244, 2, 62);
    g.fillStyle = PAL.chalet; g.fillRect(0, 345, PW, 75);
    g.fillStyle = PAL.schnee; fit(g, t('poster.alp.a'), 150, 392, 200, 38);
    g.fillStyle = PAL.tinte; fit(g, t('poster.alp.b'), 150, 62, 200, 60);
  },
  gipfeli(g) {
    g.fillStyle = PAL.himmel; g.fillRect(0, 0, PW, PH);
    // Gipfeli als Wolke, gezeichnet aus drei Segmenten
    g.save(); g.translate(150, 170);
    g.fillStyle = PAL.ocker; ell(g, 0, 0, 92, 50); g.fillStyle = PAL.himmel; ell(g, 0, 42, 70, 40);
    g.strokeStyle = PAL.chalet; g.lineWidth = 4; for (const x of [-46, -14, 18, 50]) { g.beginPath(); g.moveTo(x, -42 + Math.abs(x) * 0.3); g.quadraticCurveTo(x + 8, -10, x + (x < 0 ? -6 : 6), 4); g.stroke(); }
    g.restore();
    g.fillStyle = PAL.matte; g.fillRect(0, 300, PW, 60);
    chalet(g, 24, 330, 40, 26, PAL.schnee, PAL.rot, PAL.tinte); chalet(g, 124, 336, 60, 40, PAL.chalet, PAL.chalet, PAL.tinte); chalet(g, 222, 332, 46, 30, PAL.schnee, PAL.chalet, PAL.tinte);
    g.fillStyle = PAL.tinte; g.fillRect(0, 330, PW, 4);
    g.fillStyle = PAL.schnee; g.fillRect(0, 334, PW, 86);
    g.fillStyle = PAL.tinte; fit(g, t('poster.gipfeli.a'), 150, 54, 240, 26);
    g.fillStyle = PAL.chalet; fit(g, t('poster.gipfeli.b'), 150, 88, 260, 32);
    g.fillStyle = PAL.tinte; fit(g, t('poster.gipfeli.c'), 150, 380, 250, 16, SANS, '700');
  },
  schlitteln(g) {
    g.fillStyle = PAL.gletscher; g.fillRect(0, 0, PW, PH);
    g.fillStyle = PAL.schnee; for (let i = 0; i < 40; i++) circ(g, (i * 73) % 300, (i * 131) % 230 + 10, 2 + (i % 3));
    g.fillStyle = PAL.schnee; poly(g, [0, 210, 300, 330, 300, 420, 0, 420]);
    g.fillStyle = PAL.himmel; poly(g, [0, 236, 300, 356, 300, 372, 0, 252]);
    // Schlitten mit Figur, diagonal
    g.save(); g.translate(150, 282); g.rotate(0.38);
    g.fillStyle = PAL.chalet; g.fillRect(-46, -8, 92, 10); g.fillStyle = PAL.tinte; g.fillRect(-50, 4, 100, 4); poly(g, [50, 4, 58, -6, 54, 8]);
    g.fillStyle = PAL.tinte; ell(g, -6, -30, 18, 22); circ(g, -2, -60, 12);
    g.fillStyle = PAL.rot; g.fillRect(-14, -50, 26, 7); poly(g, [-14, -48, -44, -40, -40, -34, -12, -44]);
    g.restore();
    // Tannen
    g.fillStyle = PAL.tinte; for (const [x, y, h] of [[34, 240, 50], [62, 250, 38], [256, 340, 44]]) poly(g, [x, y - h, x - h * 0.35, y, x + h * 0.35, y]);
    g.fillStyle = PAL.schnee; fit(g, t('poster.schlitteln.a'), 150, 70, 250, 50);
    g.fillStyle = PAL.tinte; fit(g, t('poster.schlitteln.b'), 150, 400, 250, 28);
  },
  ruhe(g) {
    g.fillStyle = PAL.papier; g.fillRect(0, 0, PW, PH);
    g.fillStyle = PAL.blau; g.fillRect(0, 0, PW, 92);
    // Uhr
    g.fillStyle = PAL.tinte; circ(g, 150, 210, 84); g.fillStyle = PAL.papier; circ(g, 150, 210, 74);
    g.fillStyle = PAL.tinte; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.save(); g.translate(150 + Math.sin(a) * 62, 210 - Math.cos(a) * 62); g.rotate(a); g.fillRect(-2, -6, 4, i % 3 ? 8 : 14); g.restore(); }
    // 12:00 bis 13:30 als roter Sektor
    g.fillStyle = PAL.rot; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(150, 210); g.arc(150, 210, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 1.5 / 12); g.closePath(); g.fill(); g.globalAlpha = 1;
    g.save(); g.translate(150, 210); g.fillStyle = PAL.tinte; g.rotate(0); g.fillRect(-3, -50, 6, 50); g.rotate(Math.PI * 0.08); g.fillRect(-2, -64, 4, 64); g.restore(); circ(g, 150, 210, 6);
    g.fillStyle = PAL.papier; fit(g, t('poster.ruhe.a'), 150, 58, 260, 32);
    g.fillStyle = PAL.tinte; fit(g, t('poster.ruhe.b'), 150, 344, 260, 40, SANS, '700');
    fit(g, t('poster.ruhe.c'), 150, 384, 250, 18, SERIF);
  },
};
export const POSTER_IDS = Object.keys(MOTIFS);

// Alterung: Körnung, Vergilbung, Knicke, abgestossene Ecken, Klebeband
function age(g, seed) {
  const r = rng(seed);
  g.globalAlpha = 0.07; g.fillStyle = PAL.ocker; g.fillRect(0, 0, PW, PH); g.globalAlpha = 1;
  for (let i = 0; i < 1800; i++) {
    const v = r() < 0.5; g.fillStyle = v ? PAL.tinte : PAL.schnee; g.globalAlpha = 0.04 + r() * 0.06;
    g.fillRect(r() * PW, r() * PH, 1 + r() * 1.5, 1 + r());
  }
  // Flecken
  for (let i = 0; i < 4; i++) { g.globalAlpha = 0.05 + r() * 0.05; g.fillStyle = PAL.ocker; ell(g, r() * PW, r() * PH, 10 + r() * 30, 8 + r() * 20, r() * 3); }
  // Knicke: eine dunkle und eine helle Linie
  const fx = PW / 2 + (r() - 0.5) * 6, fy = PH / 2 + (r() - 0.5) * 8;
  g.globalAlpha = 0.16; g.fillStyle = PAL.tinte; g.fillRect(fx, 0, 1.5, PH); g.fillRect(0, fy, PW, 1.5);
  g.globalAlpha = 0.28; g.fillStyle = PAL.schnee; g.fillRect(fx + 1.5, 0, 1.5, PH); g.fillRect(0, fy + 1.5, PW, 1.5);
  g.globalAlpha = 1;
  // abgestossene Ecken / kleiner Riss
  g.globalCompositeOperation = 'destination-out';
  const corner = (x, y, sx, sy) => { if (r() < 0.6) poly(g, [x, y, x + sx * (6 + r() * 16), y, x, y + sy * (6 + r() * 16)]); };
  corner(0, 0, 1, 1); corner(PW, 0, -1, 1); corner(0, PH, 1, -1); corner(PW, PH, -1, -1);
  if (r() < 0.5) { const x = 30 + r() * 240; poly(g, [x, PH, x + 5, PH - 14, x + 9, PH - 6, x + 14, PH]); }
  g.globalCompositeOperation = 'source-over';
  // Klebeband oben
  g.fillStyle = PAL.papier; g.globalAlpha = 0.85;
  if (r() < 0.7) { g.save(); g.translate(PW / 2 + (r() - 0.5) * 40, 4); g.rotate((r() - 0.5) * 0.2); g.fillRect(-22, -6, 44, 14); g.restore(); }
  g.globalAlpha = 1;
}

export function drawPoster(id, seed = 1, canvas) {
  const c = canvas || document.createElement('canvas'); c.width = PW; c.height = PH;
  const g = c.getContext('2d');
  g.clearRect(0, 0, PW, PH); g.save(); MOTIFS[id](g); g.restore();
  age(g, seed);
  return c;
}

// zufällige Auswahl ohne Wiederholung
export function pickPosters(n, r = Math.random) {
  const a = [...POSTER_IDS];
  for (let i = a.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
