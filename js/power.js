// HOCHDRUCK – Machtwerte: Parteien, Wählergruppen, Umfragen, Verdacht, Schwarzkasse, Einfluss,
// und verzögerte Folgen («Morgenpost»), die Tage später zurückkommen.
// Texte als [deutsch, english].
import { PAL } from './palette.js';

export const GROUPS = {
  bauern:   { name: ['Bauern', 'Farmers'], w: 0.18 },
  gewerbe:  { name: ['Gewerbe', 'Business'], w: 0.18 },
  senioren: { name: ['Senioren', 'Seniors'], w: 0.20 },
  junge:    { name: ['Junge', 'Young people'], w: 0.16 },
  kirche:   { name: ['Kirche', 'Church'], w: 0.12 },
  vereine:  { name: ['Vereine', 'Clubs'], w: 0.16 },
};

export const PARTIES = {
  wvb: { short: 'WVB', name: ['Wolkenwiler Volksbund', 'Wolkenwil People’s League'], color: PAL.matte,
    slogan: ['Wie früher. Nur früher.', 'Like before. Only earlier.'],
    aff: { bauern: 1.0, senioren: 0.8, vereine: 0.6, kirche: 0.6, gewerbe: 0.1, junge: -0.4 } },
  fww: { short: 'FWW', name: ['Fortschritt Wolkenwil', 'Progress Wolkenwil'], color: PAL.blau,
    slogan: ['Eine Seilbahn für jeden.', 'A cable car for everyone.'],
    aff: { gewerbe: 1.0, junge: 0.5, vereine: 0.3, bauern: -0.4, senioren: -0.1, kirche: 0 } },
  pkh: { short: 'PKH', name: ['Partei für klaren Himmel', 'Clear Sky Party'], color: PAL.gletscher,
    slogan: ['Der Himmel gehört allen.', 'The sky belongs to everyone.'],
    aff: { junge: 1.0, kirche: 0.2, bauern: 0.1, vereine: 0, gewerbe: -0.3, senioren: -0.2 } },
  huber: { short: 'HUB', name: ['Liste Huber', 'Huber List'], color: PAL.ocker,
    slogan: ['Huber. Weil Huber.', 'Huber. Because Huber.'],
    aff: { senioren: 0.6, vereine: 0.5, gewerbe: 0.4, bauern: 0.3, kirche: 0.3, junge: -0.2 } },
};
export const PLAYABLE = ['wvb', 'fww', 'pkh'];

// ---------------- Zustand ----------------
export function freshPower(party) {
  const trust = {}; for (const g in GROUPS) trust[g] = 50;
  return { party, trust, mod: { wvb: 0, fww: 0, pkh: 0, huber: 0.35 }, influence: 0, cash: 0, suspicion: 0, queue: [], flags: {}, history: [], lev: {}, read: {} };
}

// Umfragewerte: jede Gruppe verteilt ihre Stimmen nach Nähe zur Partei,
// das Vertrauen in dich zählt für deine Partei.
export function polls(P) {
  const out = {}; for (const p in PARTIES) out[p] = 0;
  for (const g in GROUPS) {
    let sum = 0; const sc = {};
    for (const p in PARTIES) {
      let v = PARTIES[p].aff[g] + (P.mod[p] || 0);
      if (p === P.party) v += (P.trust[g] - 50) / 32 - (P.flags.exposed ? 0.6 : 0);
      sc[p] = Math.exp(v * 1.6); sum += sc[p];
    }
    for (const p in PARTIES) out[p] += GROUPS[g].w * sc[p] / sum;
  }
  for (const p in out) out[p] = Math.round(out[p] * 1000) / 10;
  return out;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Wirkung anwenden: { trust:{g:n}, mod:{p:n}, influence, cash, suspicion, flag }
// Rückgabe: Liste kurzer Änderungen für Anzeigen
export function apply(P, fx, scale = 1) {
  if (!fx) return [];
  const ch = [];
  if (fx.trust) for (const g in fx.trust) { const d = Math.round(fx.trust[g] * (fx.trust[g] > 0 ? scale : 1)); if (!d) continue; P.trust[g] = clamp(P.trust[g] + d, 0, 100); ch.push({ k: 'trust', g, d }); }
  if (fx.mod) for (const k in fx.mod) { const p = k === '_own' ? P.party : k; P.mod[p] = (P.mod[p] || 0) + fx.mod[k]; ch.push({ k: 'mod', p, d: fx.mod[k] }); }
  if (fx.influence) { P.influence = Math.max(0, P.influence + fx.influence); ch.push({ k: 'influence', d: fx.influence }); }
  if (fx.cash) { P.cash = Math.max(0, P.cash + fx.cash); ch.push({ k: 'cash', d: fx.cash }); }
  if (fx.suspicion) { P.suspicion = clamp(P.suspicion + fx.suspicion, 0, 100); ch.push({ k: 'suspicion', d: fx.suspicion }); }
  if (fx.flag) P.flags[fx.flag] = true;
  if (fx.lev) { P.lev = P.lev || {}; P.lev[fx.lev] = true; ch.push({ k: 'lev', p: fx.lev, d: 1 }); }
  if (fx.unlev && P.lev) { delete P.lev[fx.unlev]; ch.push({ k: 'lev', p: fx.unlev, d: -1 }); }
  return ch;
}
export function schedule(P, day, id) { P.queue.push({ day, id }); }
export function due(P, day) {
  const now = P.queue.filter(q => q.day <= day); P.queue = P.queue.filter(q => q.day > day);
  return now.map(q => q.id).filter(id => EVENTS[id] && (!EVENTS[id].when || EVENTS[id].when(P)));
}

// ---------------- Politische Wirkung der Anträge ----------------
// yes/no: sofortige Wirkung, later: verzögerte Folge (Tage, Ereignis), nur wenn die Bedingung stimmt
// Positive Vertrauenswerte werden mit der Qualität der Wolke skaliert.
export const STAR_SCALE = [-0.5, 0.5, 1, 1.4];
export const ORDER_POL = [
  { groups: ['gewerbe'], yes: { trust: { gewerbe: 6 } }, no: { trust: { gewerbe: -3 } }, later: [[2, 'moser_plakat', s => s >= 2]] },
  { groups: ['vereine'], yes: { influence: 1, trust: { vereine: 2 } }, no: { influence: -1 }, later: [[3, 'rat_budget', s => s === 0]] },
  { groups: ['junge', 'senioren'], yes: { trust: { junge: 3, senioren: -3 }, suspicion: 4 }, no: {}, later: [[2, 'gerber_besuch', () => true]] },
  { groups: ['kirche', 'vereine'], yes: { trust: { vereine: 4, kirche: 4 } }, no: { trust: { kirche: -3 } }, later: [] },
  { groups: ['vereine'], yes: { trust: { vereine: 6 } }, no: { trust: { vereine: -4 } }, later: [[2, 'fc_konto', s => s >= 2]] },
  { groups: ['kirche', 'senioren'], yes: { trust: { kirche: 8, senioren: 3 } }, no: { trust: { kirche: -4 } }, later: [] },
  { groups: ['gewerbe', 'bauern'], yes: { trust: { gewerbe: 6, bauern: -2 } }, no: { trust: { gewerbe: -3 } }, later: [[2, 'hotel_angebot', s => s >= 1]] },
  { groups: ['junge', 'senioren'], yes: { trust: { junge: 8, senioren: -4 } }, no: { trust: { junge: -3 } }, later: [[1, 'rektor', () => true]] },
  { groups: ['senioren'], yes: { trust: { senioren: 8 } }, no: { trust: { senioren: -5 } }, later: [] },
  { groups: ['junge', 'senioren'], yes: { trust: { junge: 4, senioren: 3 } }, no: { trust: { junge: -5 } }, later: [] },
  { groups: [], yes: { suspicion: 6, influence: 2 }, no: {}, later: [[2, 'pfeil_umschlag', () => true]] },
  { groups: ['senioren', 'vereine'], yes: { mod: { huber: 0.25 }, influence: 2 }, no: { influence: -1 }, later: [[2, 'huber_droht', (s, yes) => !yes]] },
];
export const SPECIAL_POL = {
  regen: { groups: [], yes: { suspicion: 5, influence: 1 }, no: {}, later: [[2, 'gerber_garten', (s, yes) => yes]] },
  duerre: { groups: ['bauern'], yes: { trust: { bauern: 12 } }, no: { trust: { bauern: -10 } }, later: [[3, 'duerre', (s, yes) => !yes]] },
  abschaffung: { groups: ['junge'], yes: { mod: { pkh: 0.3 }, trust: { junge: 4 } }, no: {}, later: [] },
  schule: { groups: ['senioren', 'vereine'], yes: { trust: { senioren: 4, vereine: 4, junge: 3 } }, no: { trust: { vereine: -4 } }, later: [] },
  umschlag: { groups: [], yes: { cash: 5000, suspicion: 22, influence: 2 }, no: { trust: { senioren: 3, kirche: 3 } }, later: [[1, 'umschlag_journalistin', (s, yes) => yes]] },
};

// ---------------- Morgenpost: verzögerte Folgen ----------------
// text: was passiert; choices: [label, wirkung, ergebnistext]; ohne choices nur fx
export const EVENTS = {
  moser_plakat: { from: 'Bäckerei Moser',
    text: ['Die Bäckerei Moser hängt dein Parteiplakat ins Schaufenster. «Wer uns ein Gipfeli schenkt, kriegt das Fenster.»', 'Bäckerei Moser puts your party poster in its window. “Whoever gives us a croissant gets the window.”'],
    fx: { trust: { gewerbe: 4 }, influence: 1 } },
  rat_budget: { from: 'Gemeinderat Wolkenwil',
    text: ['Der Gemeinderat hat dein Herz am Himmel gesehen. Er streicht dem Amt das Kaffeebudget.', 'The council saw your heart in the sky. It cuts the office’s coffee budget.'],
    fx: { influence: -1, trust: { vereine: -2 } } },
  gerber_besuch: { from: 'Herr Gerber',
    text: ['Herr Gerber steht im Amt. Er will wissen, wer den Fisch über seinem Haus bestellt hat. Er bietet dafür «eine Gefälligkeit».', 'Mr Gerber is standing in the office. He wants to know who ordered the fish above his house. He offers “a favour” in return.'],
    choices: [
      [['Namen nennen', 'Give the name'], { influence: 2, suspicion: 6 }, ['Gerber nickt langsam. «Ich vergesse das nicht.» Du hast jetzt einen Freund, der Dinge über andere weiss.', 'Gerber nods slowly. “I won’t forget this.” You now have a friend who knows things about people.']],
      [['Amtsgeheimnis', 'Official secrecy'], { trust: { senioren: 3 } }, ['Gerber geht. Im Dorf heisst es, das Amt sei verschwiegen. Das kommt gut an.', 'Gerber leaves. Word in the village is that the office keeps its mouth shut. People like that.']],
    ] },
  fc_konto: { from: 'FC Wolkenwil',
    text: ['Der Kassier des FC flüstert: «Wir hätten ein Spendenkonto. Was da reinfliesst, sieht niemand.»', 'The FC treasurer whispers: “We have a donations account. Nobody looks at what flows in.”'],
    choices: [
      [['Konto nutzen', 'Use the account'], { cash: 1500, suspicion: 8, flag: 'fc_konto' }, ['CHF 1’500 landen in der Schwarzkasse. Der Kassier zwinkert. Er weiss jetzt etwas über dich.', 'CHF 1,500 lands in the slush fund. The treasurer winks. He now knows something about you.']],
      [['Ablehnen', 'Decline'], { trust: { vereine: 2 } }, ['Der Kassier zuckt mit den Schultern. «Dann halt der Huber.»', 'The treasurer shrugs. “Huber, then.”']],
    ] },
  hotel_angebot: { from: 'Hotel Bergblick',
    text: ['Das Hotel Bergblick will am Samstag Sonne über der Terrasse. Bezahlung «unbürokratisch, in bar».', 'Hotel Bergblick wants sunshine over its terrace on Saturday. Payment “informal, in cash”.'],
    choices: [
      [['Annehmen', 'Accept'], { cash: 2500, suspicion: 10, trust: { gewerbe: 4 } }, ['Das Geld liegt in einem Umschlag unter der Schreibmaschine. Das Gewerbe ist zufrieden.', 'The money lies in an envelope under the typewriter. Local business is pleased.']],
      [['Ablehnen', 'Decline'], { trust: { gewerbe: -2 } }, ['Der Hoteldirektor erzählt allen, das Amt sei «unflexibel».', 'The hotel manager tells everyone the office is “inflexible”.']],
    ] },
  rektor: { from: 'Schulleitung',
    text: ['Der Rektor beschwert sich beim Gemeinderat: Eine Rakete Richtung Schulhaus sei «ein klares Signal». Die Senioren sind empört.', 'The head teacher complains to the council: a rocket aimed at the school is “a clear signal”. The seniors are outraged.'],
    fx: { trust: { senioren: -3, kirche: -2 } } },
  pfeil_umschlag: { from: '@user83920',
    text: ['Unter der Tür liegt ein Umschlag ohne Absender. Darin CHF 800 und eine Karte: «Danke. Wir melden uns.»', 'An envelope without a sender lies under the door. Inside: CHF 800 and a card: “Thank you. We’ll be in touch.”'],
    choices: [
      [['Behalten', 'Keep it'], { cash: 800, suspicion: 5, flag: 'user83920' }, ['Die Karte riecht nach Kerosin. Du steckst sie ein.', 'The card smells of kerosene. You pocket it.']],
      [['Melden', 'Report it'], { trust: { kirche: 2, senioren: 2 }, suspicion: -3 }, ['Die Dorfpolizei nimmt den Umschlag mit. Am Abend ist er verschwunden. Die Polizei auch, kurz.', 'The village police take the envelope. By evening it has disappeared. So have the police, briefly.']],
    ] },
  huber_droht: { from: 'Gemeindepräsident Huber',
    text: ['Huber ruft an. «Keine Burg? Sie wissen schon, wer Ihr Budget unterschreibt?» Er verlangt ein Zeichen der Loyalität.', 'Huber calls. “No castle? You do know who signs your budget?” He demands a sign of loyalty.'],
    choices: [
      [['Nachgeben', 'Give in'], { mod: { huber: 0.15 }, influence: 1 }, ['Du versprichst Huber «etwas Schönes» für die nächste Woche. Er legt zufrieden auf.', 'You promise Huber “something nice” for next week. He hangs up, satisfied.']],
      [['Standhaft bleiben', 'Stand firm'], { influence: -1, trust: { junge: 3, kirche: 2 } }, ['Huber legt wortlos auf. Im Dorf erzählt man sich, das Amt habe Rückgrat.', 'Huber hangs up without a word. The village says the office has a backbone.']],
      [['Die Seilbahn-Studie erwähnen', 'Mention the cable car study'], { mod: { huber: -0.15 }, influence: 2, suspicion: 4 }, ['Langes Schweigen. Dann: «Vergessen wir das mit der Burg.» Huber weiss jetzt, dass du etwas weisst.', 'A long silence. Then: “Let’s forget about the castle.” Huber now knows that you know something.'], P => P.lev && P.lev.huber],
    ] },
  gerber_garten: { from: 'Wolkenwiler Anzeiger',
    text: ['Der Garten von Herrn Gerber stand unter Wasser. Redaktorin Imboden fragt, wer den lokalen Regen bewilligt hat.', 'Mr Gerber’s garden was flooded. Editor Imboden asks who approved the local rain.'],
    choices: [
      [['Auf Keller zeigen', 'Point at Keller'], { suspicion: 2, trust: { senioren: -2 } }, ['Ruedi Keller steht jetzt in der Zeitung. Er weiss, dass du das warst.', 'Ruedi Keller is now in the paper. He knows it was you.']],
      [['Kein Kommentar', 'No comment'], { suspicion: 5 }, ['«Das Amt schweigt», titelt der Anzeiger. Schweigen klingt in Wolkenwil immer schuldig.', '“The office stays silent,” reads the headline. In Wolkenwil, silence always sounds guilty.']],
    ] },
  duerre: { from: 'Bauer Zbinden',
    text: ['Die Kartoffeln von Bauer Zbinden sind vertrocknet. Die Bauern treffen sich im Wirtshaus und reden über dich.', 'Farmer Zbinden’s potatoes have dried up. The farmers meet at the inn and talk about you.'],
    fx: { trust: { bauern: -8 } } },
  umschlag_journalistin: { from: 'Redaktorin Imboden',
    text: ['Redaktorin Imboden ruft an. Sie habe «aus sicherer Quelle» von einem dicken Umschlag gehört. Ob du etwas dazu sagen möchtest?', 'Editor Imboden calls. She has heard “from a reliable source” about a thick envelope. Would you like to comment?'],
    choices: [
      [['Lügen', 'Lie'], { suspicion: 6 }, ['«Ein Umschlag? Höchstens mit Formularen.» Sie notiert sich das. Wörtlich.', '“An envelope? Only with forms in it.” She writes it down. Word for word.']],
      [['Geld spenden (CHF 2’000)', 'Donate the money (CHF 2,000)'], { cash: -2000, suspicion: -8, trust: { kirche: 4 } }, ['Die Pfarrei bekommt eine anonyme Spende. Imboden findet keine Story. Noch nicht.', 'The parish gets an anonymous donation. Imboden finds no story. Not yet.']],
    ] },
};

// ---------------- Etappe 2: Fälschungen, Telefon, Archiv, Aktenvernichter ----------------
Object.assign(EVENTS, {
  forgery_exposed: { from: 'Gemeinderat Wolkenwil',
    text: ['Der Antrag, den du gestern bewilligt hast, war gefälscht. Der Gemeinderat fragt, wer im Amt eigentlich nicht hinschaut.', 'The request you approved yesterday was forged. The council asks who at the office is not paying attention.'],
    fx: { suspicion: 8, influence: -1 } },
  shredder_witness: { from: 'Frau Rüegg, Reinigung',
    text: ['Die Putzfrau hat gesehen, wie du gestern Akten vernichtet hast. Sie lächelt. «Mein Lohn ist seit 2009 gleich.»', 'The cleaner saw you shredding files yesterday. She smiles. “My wage hasn’t changed since 2009.”'],
    choices: [
      [['CHF 600 zahlen', 'Pay CHF 600'], { cash: -600 }, ['Sie zählt nach und nickt. Sie hat nichts gesehen. Diesmal.', 'She counts it and nods. She saw nothing. This time.'], P => P.cash >= 600],
      [['Abstreiten', 'Deny it'], { suspicion: 10 }, ['Am Nachmittag erzählt sie es in der Bäckerei. Die Bäckerei erzählt es allen.', 'In the afternoon she tells the bakery. The bakery tells everyone.']],
    ] },
  kanton_besuch: { from: 'Kantonsinspektor Wyss',
    text: ['Inspektor Wyss steht unangemeldet im Amt und blättert in deinen Akten. Er sagt nichts. Er notiert viel.', 'Inspector Wyss turns up unannounced and leafs through your files. He says nothing. He writes a lot.'],
    fx: { suspicion: 10 } },
});

// Anrufe am Pult: req = Bedingung, damit der Anruf kommen kann
export const CALLS = {
  call_gewerbe: { from: 'Gewerbeverband',
    text: ['«Am Samstag ist Markt. Ein bisschen Sonne über dem Platz wäre uns CHF 1’200 wert. Bar, versteht sich.»', '“It’s market day on Saturday. A bit of sun over the square would be worth CHF 1,200 to us. Cash, of course.”'],
    choices: [
      [['Abgemacht', 'Deal'], { cash: 1200, suspicion: 6, trust: { gewerbe: 3 } }, ['Der Präsident des Gewerbeverbands lacht ins Telefon. Du hörst Gläser klirren.', 'The association president laughs into the phone. You hear glasses clinking.']],
      [['Das Amt ist nicht käuflich', 'The office is not for sale'], { trust: { gewerbe: -2, kirche: 1 } }, ['«Schade. Huber war da immer zugänglicher.»', '“Pity. Huber was always more approachable.”']],
    ] },
  call_tipp: { from: 'Anonymer Anrufer',
    text: ['Eine verstellte Stimme: «Ich weiss, wer die Seilbahn-Studie geschrieben hat. Für CHF 500 erzähle ich es Ihnen.»', 'A disguised voice: “I know who wrote the cable car study. For CHF 500 I’ll tell you.”'],
    req: P => !(P.lev && P.lev.huber),
    choices: [
      [['Zahlen', 'Pay'], { cash: -500, lev: 'huber' }, ['«Hubers Schwager. Ohne Ausschreibung.» Klick. Das ist ein Druckmittel.', '“Huber’s brother-in-law. No tender.” Click. That is leverage.'], P => P.cash >= 500],
      [['Auflegen', 'Hang up'], {}, ['Das Telefon klingelt nicht noch einmal.', 'The phone does not ring again.']],
    ] },
  call_imboden: { from: 'Redaktorin Imboden',
    text: ['«Ich schreibe über Huber und die Seilbahn. Haben Sie etwas für mich? Ich schütze meine Quellen.»', '“I’m writing about Huber and the cable car. Do you have anything for me? I protect my sources.”'],
    req: P => P.lev && P.lev.huber,
    choices: [
      [['Auspacken', 'Spill it'], { mod: { huber: -0.35 }, suspicion: 3, unlev: 'huber', flag: 'imboden' }, ['Am nächsten Morgen titelt der Anzeiger: «Seilbahn für den Schwager». Huber stürzt in den Umfragen.', 'Next morning the Gazette runs: “A cable car for the brother-in-law”. Huber plunges in the polls.']],
      [['Später vielleicht', 'Maybe later'], {}, ['«Warten Sie nicht zu lange. Andere reden auch.»', '“Don’t wait too long. Others talk too.”']],
    ] },
  call_huber: { from: 'Gemeindepräsident Huber',
    text: ['Huber lädt dich zum Abendessen ins «Rössli» ein. «Ganz privat. Unter Freunden.»', 'Huber invites you to dinner at the “Rössli”. “Completely private. Among friends.”'],
    choices: [
      [['Hingehen', 'Go'], { influence: 2, mod: { huber: 0.1 }, trust: { junge: -2 } }, ['Huber bestellt für dich. Am Nebentisch sitzt ein Fotograf. Zufall, sagt Huber.', 'Huber orders for you. A photographer sits at the next table. Coincidence, says Huber.']],
      [['Absagen', 'Decline'], {}, ['«Wie Sie meinen.» Huber klingt nicht, als würde er es vergessen.', '“As you wish.” Huber does not sound like he will forget it.']],
    ] },
  call_kanton: { from: 'Kantonsinspektor Wyss',
    text: ['«Wyss, Kantonale Aufsicht. Mir sind Unregelmässigkeiten gemeldet worden. Ich komme in den nächsten Tagen vorbei.»', '“Wyss, cantonal oversight. Irregularities have been reported to me. I will be stopping by in the next few days.”'],
    req: P => P.suspicion >= 35,
    choices: [
      [['Akten in Ordnung bringen', 'Put the files in order'], { suspicion: -4, influence: -1 }, ['Du verbringst den Abend im Archiv. Am Ende sieht alles fast sauber aus.', 'You spend the evening in the archive. In the end, everything looks almost clean.']],
      [['Ignorieren', 'Ignore it'], { flag: 'kanton_ignored' }, ['Wyss legt auf. Er hat deinen Namen zweimal wiederholt.', 'Wyss hangs up. He repeated your name twice.']],
      [['An seinen Führerschein erinnern', 'Remind him of his licence'], { suspicion: -12, unlev: 'wyss', flag: 'wyss_bought' }, ['Stille. «Ich sehe, hier ist alles in Ordnung.» Wyss wird das nicht vergessen.', 'Silence. “I see everything is in order here.” Wyss will not forget this.'], P => P.lev && P.lev.wyss],
    ] },
  call_partei: { from: 'Parteisekretariat',
    text: ['Dein Parteisekretär: «Die Plakate sind teuer. Kannst du aus deiner… Kasse etwas beisteuern? CHF 1’000 würden reichen.»', 'Your party secretary: “Posters are expensive. Could you chip in from your… fund? CHF 1,000 would do.”'],
    choices: [
      [['CHF 1’000 geben', 'Give CHF 1,000'], { cash: -1000, suspicion: 3, mod: { _own: 0.15 } }, ['Am nächsten Morgen hängen neue Plakate am Dorfplatz. Niemand fragt, woher das Geld kommt. Noch nicht.', 'Next morning new posters hang on the square. Nobody asks where the money came from. Not yet.'], P => P.cash >= 1000],
      [['Leider nein', 'Sorry, no'], { mod: { _own: -0.05 } }, ['«Dann eben mit Filzstift», seufzt der Sekretär.', '“Felt-tip pens it is, then,” sighs the secretary.']],
    ] },
};
export function pickCall(P, day) {
  const done = new Set((P.history || []).map(h => h.ev));
  const ids = Object.keys(CALLS).filter(id => !done.has(id) && (!CALLS[id].req || CALLS[id].req(P)));
  if (!ids.length) return null;
  // Wyss kommt zuerst, wenn der Verdacht hoch ist
  if (ids.includes('call_kanton')) return 'call_kanton';
  return ids[(day * 7 + ids.length) % ids.length];
}

// Archiv: Dossiers kosten Einfluss zum Lesen und werden dann Druckmittel oder Zeitungsstoff
export const DOSSIERS = [
  { id: 'huber', who: ['Gemeindepräsident Huber', 'Mayor Huber'], cost: 2,
    secret: ['2019 ging die Seilbahn-Studie ohne Ausschreibung an Hubers Schwager. Rechnung: CHF 84’000. Seiten mit Inhalt: 3.', 'In 2019 the cable car study went to Huber’s brother-in-law without a tender. Invoice: CHF 84,000. Pages with content: 3.'],
    leak: { mod: { huber: -0.35 }, suspicion: 3, flag: 'imboden' }, keep: { lev: 'huber' } },
  { id: 'gerber', who: ['Herr Gerber', 'Mr Gerber'], cost: 1,
    secret: ['Gerber war 1998 Kassier des FC. Die Vereinskasse fehlt bis heute. Gerber hat seither nie mehr ein Fussballspiel besucht.', 'Gerber was FC treasurer in 1998. The club funds are still missing. Gerber has not attended a match since.'],
    leak: { trust: { vereine: 3, senioren: -2 } }, keep: { lev: 'gerber' } },
  { id: 'moser', who: ['Bäckerei Moser', 'Bäckerei Moser'], cost: 1,
    secret: ['Die «Butter-Gipfeli» der Bäckerei Moser werden seit 2011 mit Margarine gebacken. Lieferscheine liegen bei.', 'Bäckerei Moser’s “butter croissants” have been baked with margarine since 2011. Delivery notes attached.'],
    leak: { trust: { gewerbe: -3, junge: 2 } }, keep: { lev: 'moser' } },
  { id: 'wyss', who: ['Kantonsinspektor Wyss', 'Inspector Wyss'], cost: 3,
    secret: ['Inspektor Wyss hat seinen Führerschein dreimal verloren. Der Kanton weiss von einmal.', 'Inspector Wyss has lost his driving licence three times. The canton knows about once.'],
    leak: { suspicion: -6 }, keep: { lev: 'wyss' } },
];
