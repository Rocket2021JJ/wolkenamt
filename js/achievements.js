// HOCHDRUCK – Errungenschaften. Jede hat einen Namen auf Wolkwilisch und eine Übersetzung.
// unlock() speichert im Spielstand und gibt true zurück, wenn sie neu ist (dann zeigt main.js die Meldung).
// hidden: erscheint in der Liste erst, wenn sie freigeschaltet ist.
export const ACH = [
  { id: 'erster_stempel', lingo: 'Gstämpfli!', name: ['Erster Stempel', 'First stamp'], desc: ['Den ersten Stapel Anträge gestempelt.', 'Stamped your first pile of requests.'] },
  { id: 'erste_wolke', lingo: 'Wölkli-plopp', name: ['Erste Wolke', 'First cloud'], desc: ['Die erste Wolke selbst geformt.', 'Shaped your first cloud yourself.'] },
  { id: 'drei_sterne', lingo: 'Stärnli-dräi', name: ['Meisterwolke', 'Master cloud'], desc: ['Eine Wolke mit drei Sternen abgeliefert.', 'Delivered a three-star cloud.'] },
  { id: 'kapitel1', lingo: 'Poschtli fertig', name: ['Der Posten', 'The post'], desc: ['Kapitel 1 abgeschlossen.', 'Finished chapter 1.'] },
  { id: 'kapitel2', lingo: 'Untersüechli', name: ['Die Untersuchung überlebt', 'Survived the investigation'], desc: ['Kapitel 2 abgeschlossen, im Amt geblieben.', 'Finished chapter 2 and kept the job.'] },
  { id: 'huber_gestuerzt', lingo: 'Hubärli tschüüdeli', name: ['Huber gestürzt', 'Huber toppled'], desc: ['Die Gemeindewahl gegen Huber gewonnen.', 'Won the election against Huber.'] },
  { id: 'sauber', lingo: 'Glüüfi-bümpf', name: ['Der saubere Himmel', 'The clean sky'], desc: ['Die Wahl ehrlich gewonnen.', 'Won the election honestly.'] },
  { id: 'parkplatz', lingo: 'Parkümpf', name: ['Der Parkplatz', 'The parking space'], desc: ['Hubers Angebot angenommen.', 'Accepted Huber’s offer.'], hidden: true },
  { id: 'hochdruck', lingo: 'Hochdrüüpf!', name: ['Hochdruck', 'High pressure'], desc: ['Verdacht von 60 oder mehr erreicht.', 'Reached a suspicion of 60 or more.'] },
  { id: 'zuhoerer', lingo: 'Ohrli-wolk', name: ['Ein offenes Ohr', 'A willing ear'], desc: ['Allen vier Dorfleuten mit Namen zugehört.', 'Listened to all four named villagers.'] },
  { id: 'tresor', lingo: 'Kässeli-kläpf', name: ['1973', '1973'], desc: ['Hubers Tresor geknackt.', 'Cracked Huber’s safe.'], hidden: true },
  { id: 'schnurrbart', lingo: 'Schnäuzli', name: ['Kunst am Bau', 'Public art'], desc: ['Hubers Porträt verschönert.', 'Improved Huber’s portrait.'], hidden: true },
  { id: 'blaess', lingo: 'Wuff-wuff-plimm', name: ['Bläss ist wach', 'Bläss is awake'], desc: ['Hubers Hund geweckt.', 'Woke up Huber’s dog.'], hidden: true },
  { id: 'einbrecher', lingo: 'Schliichli', name: ['Hausbesuch', 'House call'], desc: ['In alle vier Parteibüros geschlichen.', 'Snuck into all four party offices.'] },
];
export function unlock(save, id) {
  save.ach = save.ach || {};
  if (save.ach[id] || !ACH.some(a => a.id === id)) return false;
  save.ach[id] = Date.now();
  return true;
}
