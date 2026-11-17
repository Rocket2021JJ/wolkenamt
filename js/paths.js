// HOCHDRUCK – Wegnetz im Dorf (Kieswege). Reine Daten, damit Gelände (Grasbüschel) und Dorf sie kennen.
// Jede Liste ist ein Weg aus Punkten [x, z]. Der Dorfplatz selbst ist gepflastert und braucht keinen Weg.
export const PATHS = [
  // nach Westen in die Parteigasse
  [[-9.4, 14], [-24, 14], [-38, 14]],
  [[-38, -16], [-38, 14], [-38, 44]],
  // nach Osten (nördlich am Haus vorbei) bis zur Schulgasse
  [[7.4, 4.6], [12, 2], [15, -2], [28, -2.5], [40, -2]],
  [[40, -30], [40, -2], [40, 40]],
  [[40, 40], [46.5, 45]],
  // nach Norden: Kirche, Weide, Aussichtspunkt
  [[0, -5.2], [0, -20], [0, -36], [0, -50]],
  [[0, -21], [-12, -21], [-12, -10], [-16, -8.6]],
  [[-16, -8.6], [-22, -9], [-29, -12], [-29, -21]],
  [[0, -30], [12, -32], [18, -36]],
  [[-38, -16], [-42, -28], [-44, -33]],
  // nach Süden durch die Lücke zwischen den Häusern
  [[-2.85, 19.6], [-2.85, 27.5], [0, 32], [0, 47]],
  [[-30, 48], [-12, 48], [0, 47], [14, 48], [30, 47], [40, 40]],
];
export function pathDist(x, z) {
  let best = 1e9;
  for (const P of PATHS) for (let i = 1; i < P.length; i++) {
    const [ax, az] = P[i - 1], [bx, bz] = P[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), px = ax + dx * t, pz = az + dz * t;
    best = Math.min(best, Math.hypot(x - px, z - pz));
  }
  return best;
}
