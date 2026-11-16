// HOCHDRUCK – Prüfen am Pult: Unterschriften und Stempel, echte und gefälschte.
// Jede Person hat eine feste Unterschrift (aus ihrem Namen erzeugt). Fälschungen weichen sichtbar ab:
// Neigung, eine Schlaufe zu viel oder ein falscher Stempel.
import { PAL, rng } from './palette.js';

const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// Ein Fälschungsfall für einen Antrag: welcher Fehler?
export function forgeryKind(seed) { return ['slant', 'loop', 'stamp'][seed % 3]; }

export function drawSignature(cv, name, forged, kind) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  const r = rng(hash(name));
  const n = 4 + ((r() * 3) | 0);
  let slant = 0.25 + r() * 0.35;
  const amps = Array.from({ length: n + 1 }, () => 0.25 + r() * 0.55);
  if (forged && kind === 'slant') slant = -slant * 0.6;
  if (forged && kind === 'loop') { amps.splice(2, 0, 0.95); }
  g.strokeStyle = PAL.tinte; g.lineWidth = 2.6; g.lineCap = g.lineJoin = 'round';
  g.beginPath();
  const x0 = W * 0.08, x1 = W * 0.9, cy = H * 0.62, steps = amps.length * 24;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, k = Math.min(amps.length - 1, Math.floor(u * amps.length)), ph = u * amps.length * Math.PI * 2;
    const a = amps[k] * H * 0.38;
    const y = cy - Math.abs(Math.sin(ph / 2)) * a * (k % 2 ? 1 : 0.7) + Math.sin(ph) * 2;
    const x = x0 + (x1 - x0) * u + (cy - y) * slant;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  // Unterstrich
  g.beginPath(); g.moveTo(x0 + 6, cy + 9); g.quadraticCurveTo(W * 0.5, cy + 14 + r() * 4, x1 - 4, cy + 6); g.stroke();
}

export function drawStamp(cv, forged, kind) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  const fake = forged && kind === 'stamp';
  g.save(); g.translate(W / 2, H / 2); g.rotate(-0.12);
  g.strokeStyle = fake ? PAL.blau : PAL.rot; g.fillStyle = g.strokeStyle; g.globalAlpha = 0.85;
  const R = Math.min(W, H) * 0.42;
  g.lineWidth = 2.2; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1; g.beginPath(); g.arc(0, 0, R - 5, 0, Math.PI * 2); g.stroke();
  g.font = '700 7.5px "Courier Prime", monospace'; g.textAlign = 'center';
  g.fillText(fake ? 'WOLKENWYL' : 'WOLKENWIL', 0, -2);
  g.font = '700 6px "Courier Prime", monospace';
  g.fillText(fake ? 'GEMEINDE' : 'WOLKENAMT', 0, 9);
  g.restore();
}
