// Farbkonzept «Alpenplakat × Amtsstube» (siehe BRIEFING.md, Abschnitt 3).
// Keine weiteren Farben dazuerfinden. Helligkeitsstufen entstehen nur durch das Toon-Licht.
export const PAL = {
  // aussen
  himmel: '#A9C6D6',
  gletscher: '#5E86A8',
  matte: '#6F8F4E',
  schnee: '#F3F1EA',
  chalet: '#8B5A35',
  rot: '#C8352B',
  // innen
  lino: '#4F6B57',
  ocker: '#C99A3B',
  papier: '#E9E6DA',
  blau: '#2F4E8C',
  nuss: '#6B4A33',
  lampe: '#F2D27A',
  // Linien, Schrift, Augen
  tinte: '#22303A',
};

// Spielerfarben: 1 Signalrot, 2 Gletscher, 3 Aktenocker
export const PLAYER_COLS = [PAL.rot, PAL.gletscher, PAL.ocker];

// kleiner, reproduzierbarer Zufall (mulberry32)
export function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
