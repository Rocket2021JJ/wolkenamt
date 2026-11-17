// HOCHDRUCK – «Wolkwilisch», die Sprache der Wolkenwiler. Keine echte Sprache.
// Klingt nach Bergdorf und Amtsstube: viel -li und -ümpf, doppelte Vokale, Stempelgeräusche im Wortinneren.
// Feste Wörter (mit Bedeutung) und ein Silbengenerator, der aus jedem Satz ein gleichbleibendes Gebrabbel macht.
// Später für Errungenschaften und ein Wörterbuch im Spiel verwendbar.

export const LINGO_NAME = ['Wolkwilisch', 'Wolkwilish'];

// Wörterbuch: Wolkwilisch → [Deutsch, Englisch]
export const WORDS = {
  'Grüüzimpf': ['Hallo', 'Hello'],
  'Tschüüdeli': ['Tschüss', 'Bye'],
  'Bümpf': ['Ja', 'Yes'],
  'Nüpf': ['Nein', 'No'],
  'Hmmpfli': ['Vielleicht', 'Maybe'],
  'Wolkwolk': ['Wolken!', 'Clouds!'],
  'Gstämpfli': ['gestempelt', 'stamped'],
  'Formulääri': ['Formular', 'form'],
  'Plätschli': ['Regen', 'rain'],
  'Glüüfi': ['Sonne', 'sun'],
  'Chläpf': ['Aua! / Schreck', 'Ouch! / Yikes'],
  'Bümpfelimümpf': ['einverstanden, aber unter Protest', 'agreed, but under protest'],
  'Amtsli': ['das Wolkenamt', 'the Cloud Office'],
  'Hubärli': ['der Huber (abschätzig)', 'Huber (dismissive)'],
  'Kässeli-kläpf': ['Bestechung', 'bribe'],
  'Gmüetwölkli': ['schönes Wetter', 'nice weather'],
  'Schnüüfli': ['Gerücht', 'rumour'],
  'Zytigli': ['Zeitung', 'newspaper'],
  'Wäälimpf': ['Wahl', 'election'],
  'Plakäätli': ['Plakat', 'poster'],
  'Verdächtli': ['verdächtig', 'suspicious'],
  'Hochdrüüpf': ['Hochdruck! (Fluch)', 'High pressure! (curse)'],
  'Ufpasse-pümpf': ['Pass auf!', 'Watch out!'],
  'Mümpfeli': ['Znüni, kleiner Imbiss', 'snack'],
  'Chuchichämpf': ['Ach du meine Güte', 'Oh my goodness'],
  'Gugguseli': ['Schau mal!', 'Look!'],
  'Wüürzli': ['Geheimnis', 'secret'],
  'Blüemli-blüemli': ['schön, schön', 'lovely, lovely'],
  'Nüpfnüpf': ['schlecht', 'bad'],
  'Bombümpf': ['sehr gut', 'very good'],
};

// Was Dorfbewohner einander zurufen (Wolkwilisch, damit der Bildschirm nicht voller Text ist)
export const SHOUTS = {
  greet: ['Grüüzimpf!', 'Grüüzimpf, Amtsli!', 'Tschüüdeli!'],
  sun: ['Glüüfi! Gmüetwölkli!', 'Blüemli-blüemli!', 'Bombümpf!'],
  rain: ['Plätschli… nüpfnüpf.', 'Chläpf! Plätschli!', 'Hmmpfli Plätschli?'],
  cloud: ['Wolkwolk!', 'Gugguseli! Wolkwolk!', 'Wolkwolk-bümpf!'],
  suspicion: ['Verdächtli…', 'Schnüüfli, schnüüfli…', 'Kässeli-kläpf?!', 'Ufpasse-pümpf!'],
  huber: ['Hubärli…', 'Hubärli hubärli.', 'Wäälimpf! Hubärli!'],
  misc: ['Mümpfeli?', 'Zytigli! Zytigli!', 'Chuchichämpf!', 'Formulääri gstämpfli?', 'Hochdrüüpf!', 'Bümpfelimümpf.'],
};

// ---------------- Silbengenerator ----------------
const ON = ['b', 'bl', 'br', 'ch', 'chl', 'd', 'f', 'gl', 'gr', 'h', 'm', 'pf', 'schm', 'schn', 'tsch', 'w', 'z', 'zw', 'gs', 'l'];
const NU = ['ü', 'üü', 'ä', 'ää', 'ö', 'u', 'uu', 'i', 'ii', 'ei', 'ue', 'a', 'o'];
const CO = ['', '', 'li', 'mpf', 'tz', 'ch', 'ng', 'sch', 'll', 'rn', 'pf', 'eli'];
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = seed || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// Ein echtes Wort wird immer zum gleichen Fantasiewort (damit sich Sätze wiederholt «gleich» anhören)
export function wordOf(w) {
  const r = rng(hash(w.toLowerCase())), n = Math.max(1, Math.min(4, Math.round(w.length / 3.2)));
  let out = '';
  for (let i = 0; i < n; i++) out += ON[Math.floor(r() * ON.length)] + NU[Math.floor(r() * NU.length)] + (i === n - 1 ? CO[Math.floor(r() * CO.length)] : '');
  return out;
}
// Ganzen Satz übersetzen (Satzzeichen bleiben), z. B. für Sprechblasen bei Telefonaten
export function translate(text, max = 12) {
  const words = text.replace(/[«»"“”]/g, '').split(/\s+/).filter(Boolean).slice(0, max);
  let out = words.map(w => { const m = w.match(/^(.*?)([.,!?:;…]*)$/); return wordOf(m[1]) + m[2]; }).join(' ');
  out = out.charAt(0).toUpperCase() + out.slice(1);
  if (text.split(/\s+/).length > max) out += '…';
  return out;
}
// Silben für die Stimme: Vokale bestimmen den Klang
export function syllables(text) {
  const s = text.toLowerCase().replace(/[^a-zäöüéèàß\s!?.,]/g, '');
  const out = []; const re = /([^aeiouäöü\s!?.,]*)([aeiouäöü]+)([^aeiouäöü\s!?.,]?)|([!?.,])/g; let m;
  while ((m = re.exec(s))) {
    if (m[4]) { out.push({ pause: m[4] }); continue; }
    const w = m.index === 0 || /[\s!?.,]/.test(s[m.index - 1]);
    out.push({ c: m[1], v: m[2][0], long: m[2].length > 1, end: m[3], w });
  }
  return out;
}
export function shout(kind, seed = 0) { const l = SHOUTS[kind] || SHOUTS.misc; return l[Math.abs(seed) % l.length]; }
