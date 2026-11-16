// Wörterbuch Deutsch / Englisch.
// t('key', {name: 'x'}) liefert den Text in der aktuellen Sprache, {name} wird ersetzt.
// Personennamen (Moser, Gerber, Huber …) bleiben in beiden Sprachen gleich.

const KEY = 'wolkenamt-lang';
const listeners = [];

function detect() {
  try { const s = localStorage.getItem(KEY); if (s === 'de' || s === 'en') return s; } catch (e) {}
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'de';
  return /^de\b/i.test(nav) || /^(gsw|rm)\b/i.test(nav) ? 'de' : 'en';
}

export let lang = detect();

export const DICT = { de: {}, en: {} };

// Einträge hinzufügen: add({ key: ['deutsch', 'english'] })
export function add(entries) {
  for (const k in entries) { DICT.de[k] = entries[k][0]; DICT.en[k] = entries[k][1]; }
}

export function t(key, vars) {
  let s = DICT[lang][key];
  if (s === undefined) s = DICT.de[key];
  if (s === undefined) return key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, v) => (vars[v] !== undefined ? vars[v] : m));
  return s;
}

// Für Inhalte, die als {de, en} oder [de, en] gespeichert sind
export function L(v) {
  if (v == null) return '';
  if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string') return lang === 'en' ? v[1] : v[0];
  if (typeof v === 'object' && ('de' in v || 'en' in v)) return v[lang] ?? v.de;
  return v;
}

export const locale = () => (lang === 'en' ? 'en-GB' : 'de-CH');
export const num = n => Number(n).toLocaleString(locale());

export function setLang(l) {
  if (l !== 'de' && l !== 'en' || l === lang) return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch (e) {}
  document.documentElement.lang = l;
  listeners.forEach(f => f(l));
}
export const onLang = f => listeners.push(f);

// HTML-Elemente mit data-i18n="key" (Text), data-i18n-ph (Platzhalter), data-i18n-title
export function applyDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
}
document.documentElement.lang = lang;

// ---------------- Plakate ----------------
add({
  'poster.wolkenwil.a': ['Wolkenwil', 'Wolkenwil'],
  'poster.wolkenwil.b': ['Wo der Himmel bewilligt ist', 'Where the sky is approved'],
  'poster.amt.a': ['Wolkenamt', 'Cloud Office'],
  'poster.amt.b': ['Seit 1897 im Dienst', 'In service since 1897'],
  'poster.foehn.a': ['Föhn ist', 'Föhn wind must'],
  'poster.foehn.b': ['meldepflichtig', 'be reported'],
  'poster.foehn.c': ['Zuwiderhandlungen werden gebüsst. Der Gemeinderat.', 'Offenders will be fined. The Municipal Council.'],
  'poster.f27b.a': ['Formular 27b', 'Form 27b'],
  'poster.f27b.b': ['jetzt auch in Grün', 'now also in green'],
  'poster.alp.a': ['Alpaufzug', 'Cattle drive'],
  'poster.alp.b': ['1931', '1931'],
  'poster.gipfeli.a': ['Besuchen Sie das', 'Visit the'],
  'poster.gipfeli.b': ['Gipfeli am Himmel', 'croissant in the sky'],
  'poster.gipfeli.c': ['Bäckerei Moser, Dorfplatz', 'Bäckerei Moser, village square'],
  'poster.schlitteln.a': ['Schlitteln', 'Sledging'],
  'poster.schlitteln.b': ['in Wolkenwil', 'in Wolkenwil'],
  'poster.ruhe.a': ['Amtliche Ruhezeit', 'Official quiet hours'],
  'poster.ruhe.b': ['12.00–13.30 Uhr', '12.00–13.30'],
  'poster.ruhe.c': ['Bitte nicht klopfen.', 'Please do not knock.'],
});

// ---------------- 3D-Welt ----------------
add({
  'sign.amt': ['Wolkenamt', 'Cloud Office'],
  'use.desk': ['Am Pult arbeiten', 'Work at the desk'],
  'use.platform': ['Wolke kurbeln und schneiden', 'Crank up and cut a cloud'],
});
