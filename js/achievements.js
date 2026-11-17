// HOCHDRUCK – Errungenschaften (vorbereitet, noch ohne Anzeige im Spiel).
// Jede Errungenschaft hat einen Namen auf Wolkwilisch und eine Übersetzung. unlock() speichert im Spielstand.
export const ACH = [
  { id: 'erster_stempel', lingo: 'Gstämpfli!', name: ['Erster Stempel', 'First stamp'], desc: ['Den ersten Antrag gestempelt.', 'Stamped your first request.'] },
  { id: 'nie_erwischt', lingo: 'Wüürzli-wüürzli', name: ['Nie erwischt', 'Never caught'], desc: ['Ein Kapitel ohne Einbruch-Schlagzeile beendet.', 'Finished a chapter without a break-in headline.'] },
  { id: 'huber_gestuerzt', lingo: 'Hubärli tschüüdeli', name: ['Huber gestürzt', 'Huber toppled'], desc: ['Die Gemeindewahl gegen Huber gewonnen.', 'Won the election against Huber.'] },
  { id: 'sauber', lingo: 'Glüüfi-bümpf', name: ['Der saubere Himmel', 'The clean sky'], desc: ['Mit wenig Verdacht gewonnen.', 'Won with little suspicion.'] },
  { id: 'parkplatz', lingo: 'Parkümpf', name: ['Der Parkplatz', 'The parking space'], desc: ['Hubers Angebot angenommen.', 'Accepted Huber’s offer.'] },
  { id: 'wortschatz', lingo: 'Bombümpf Wolkwilisch', name: ['Wolkwilisch gelernt', 'Learned Wolkwilish'], desc: ['Alle Wörter im Wörterbuch gefunden.', 'Found every word in the dictionary.'] },
];
export function unlock(save, id) {
  save.ach = save.ach || {};
  if (save.ach[id]) return false;
  save.ach[id] = Date.now();
  return true;
}
