// HOCHDRUCK – Dorfplan (Taste M oder K): von Hand gezeichnet wirkende Karte auf Papier.
// Zeigt Wege, Häuser (besondere mit Namen), Parteihäuser in Parteifarbe, die Leute mit Namen,
// gefundene Zettel, und wo man selbst steht.
import { PATHS } from './paths.js';
import { PL } from './terrain.js';
import { NOTES } from './town.js';

const PLACES = [
  ['map.office', 0, 0], ['map.church', -18, -19], ['map.roessli', -0.8, 26.6, true], ['map.huber', 9.5, 20.2, true], ['map.hall', 0, 13.2, true], ['map.townhall', -14.6, 13],
  ['map.school', 47, 6], ['map.fire', 31, -12], ['map.bakery', 46, 31], ['map.shop', -24, 53], ['map.cemetery', -29, -26],
  ['map.pasture', 22, -41], ['map.bees', -45, -38], ['map.view', 0, -53.5], ['map.cable', 49.5, 47], ['map.playground', 46, 21],
];
let jitSeed = 1;
const jit = () => { jitSeed = (jitSeed * 16807) % 2147483647; return (jitSeed / 2147483647 - 0.5); };

export function drawMap(cv, ctx) {
  const { world, t, L, parties, folk, save, partyHouses } = ctx;
  const W = cv.width, H = cv.height, g = cv.getContext('2d');
  const x0 = PL.cx - PL.hx - 4, z0 = PL.cz - PL.hz - 4, sx = W / (PL.hx * 2 + 8), sz = H / (PL.hz * 2 + 8), s = Math.min(sx, sz);
  const ox = (W - (PL.hx * 2 + 8) * s) / 2, oz = (H - (PL.hz * 2 + 8) * s) / 2;
  const X = x => ox + (x - x0) * s, Z = z => oz + (z - z0) * s;
  jitSeed = 7;
  // Papier
  g.fillStyle = '#F3ECD9'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(120,95,60,${0.03 + Math.abs(jit()) * 0.05})`; g.fillRect((jit() + 0.5) * W, (jit() + 0.5) * H, 2, 2); }
  // Wiese des Dorfs
  g.fillStyle = '#DCE6C2'; g.strokeStyle = '#6B7F4E'; g.lineWidth = 2;
  const r = PL.r * s; g.beginPath(); g.roundRect(X(PL.cx - PL.hx + 2.6), Z(PL.cz - PL.hz + 2.6), (PL.hx - 2.6) * 2 * s, (PL.hz - 2.6) * 2 * s, r); g.fill();
  g.setLineDash([6, 5]); g.stroke(); g.setLineDash([]);
  // Dorfplatz
  g.fillStyle = '#EDE6D2'; g.beginPath(); g.roundRect(X(-9.6), Z(5.3), 19.2 * s, 14.3 * s, 8); g.fill();
  // Wege
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [w, c] of [[2.3, '#B9A985'], [1.5, '#E8DCC0']]) {
    g.strokeStyle = c; g.lineWidth = w * s;
    for (const P of PATHS) { g.beginPath(); P.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.stroke(); }
  }
  // Häuser
  for (const h of world.houses) {
    const u = h.userData, pid = u.party;
    g.save(); g.translate(X(h.position.x), Z(h.position.z)); g.rotate(-h.rotation.y);
    g.fillStyle = pid ? parties[pid].color : u.wood ? '#B98A5A' : '#F7F2E6'; g.strokeStyle = '#2A2E38'; g.lineWidth = 1.5;
    g.fillRect(-u.w / 2 * s, -u.d / 2 * s, u.w * s, u.d * s); g.strokeRect(-u.w / 2 * s, -u.d / 2 * s, u.w * s, u.d * s);
    g.beginPath(); g.moveTo(0, -u.d / 2 * s); g.lineTo(0, u.d / 2 * s); g.strokeStyle = 'rgba(42,46,56,.35)'; g.stroke();
    g.restore();
  }
  // Amtshaus und Kirche als eigene Formen
  g.fillStyle = '#C8352B'; g.strokeStyle = '#2A2E38'; g.lineWidth = 2; g.fillRect(X(-6.3), Z(-4.8), 12.6 * s, 9.6 * s); g.strokeRect(X(-6.3), Z(-4.8), 12.6 * s, 9.6 * s);
  g.save(); g.translate(X(-18), Z(-19)); g.rotate(-0.25); g.fillStyle = '#F4EFE4'; g.fillRect(-2.8 * s, -6.7 * s, 5.6 * s, 13.6 * s); g.strokeRect(-2.8 * s, -6.7 * s, 5.6 * s, 13.6 * s);
  g.beginPath(); g.moveTo(0, -4 * s); g.lineTo(0, 1 * s); g.moveTo(-1.6 * s, -2.2 * s); g.lineTo(1.6 * s, -2.2 * s); g.stroke(); g.restore();
  g.fillStyle = '#4A6FA5'; g.fillRect(X(-16.4), Z(9.8), 6.6 * s, 6.4 * s); g.strokeRect(X(-16.4), Z(9.8), 6.6 * s, 6.4 * s);
  // Weide und Friedhof
  g.strokeStyle = '#8A6A3E'; g.setLineDash([3, 3]); g.strokeRect(X(14), Z(-47), 16 * s, 12 * s); g.strokeRect(X(-33.5), Z(-29.5), 9 * s, 7 * s); g.setLineDash([]);
  // Beschriftungen
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const label = (txt, x, z, size = 15, col = '#2A2E38', off = 0) => { g.font = `600 ${size}px Georgia, serif`; g.lineWidth = 4; g.strokeStyle = '#F3ECD9'; g.strokeText(txt, X(x), Z(z) + off); g.fillStyle = col; g.fillText(txt, X(x), Z(z) + off); };
  for (const [k, x, z, small] of PLACES) label(t(k), x, z, small ? 12 : 15, '#2A2E38', 0);
  for (const [pid, [x, z]] of Object.entries(partyHouses)) label(parties[pid].short, x, z, 14, '#2A2E38', 0);
  label(t('map.partylane'), -38, 46, 13, '#6B5A3A');
  // Zettel
  const found = save.words || {};
  NOTES.forEach(([x, z], i) => { if (!found[i]) return; g.fillStyle = '#F6F0DC'; g.strokeStyle = '#C8352B'; g.lineWidth = 1.5; g.fillRect(X(x) - 5, Z(z) - 6, 10, 12); g.strokeRect(X(x) - 5, Z(z) - 6, 10, 12); });
  // Leute mit Namen
  folk.forEach(([name, pos]) => { g.fillStyle = '#4A6FA5'; g.beginPath(); g.arc(X(pos.x), Z(pos.z), 5, 0, 7); g.fill(); g.font = 'italic 12px Georgia, serif'; g.lineWidth = 3; g.strokeStyle = '#F3ECD9'; g.strokeText(name, X(pos.x), Z(pos.z) + 14); g.fillStyle = '#2E4A78'; g.fillText(name, X(pos.x), Z(pos.z) + 14); });
  // Ich
  const p = world.player.pos, yaw = world.player.b.yaw;
  if (p.z > -300) {
    g.save(); g.translate(X(p.x), Z(p.z)); g.rotate(-yaw + Math.PI);
    g.fillStyle = '#C8352B'; g.strokeStyle = '#2A2E38'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 8); g.lineTo(0, 4); g.lineTo(-8, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  // Nordpfeil und Titel
  g.font = '700 22px Georgia, serif'; g.fillStyle = '#2A2E38'; g.textAlign = 'left'; g.fillText(t('map.title'), 18, 26);
  g.font = 'italic 13px Georgia, serif'; g.fillText(t('map.notes', { n: Object.keys(found).length, m: NOTES.length }), 18, 48);
  g.textAlign = 'center'; g.font = '700 16px Georgia, serif'; g.fillText('N', W - 28, 24); g.beginPath(); g.moveTo(W - 28, 34); g.lineTo(W - 34, 50); g.lineTo(W - 22, 50); g.closePath(); g.fill();
}
