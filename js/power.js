// HOCHDRUCK – Machtwerte: Parteien, Wählergruppen, Umfragen, Verdacht, Schwarzkasse, Einfluss,
// und verzögerte Folgen («Morgenpost»), die Tage später zurückkommen.
// Texte als [deutsch, english].
import { PAL, rng } from './palette.js';

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
  if (fx.cashAll && P.cash) { ch.push({ k: 'cash', d: -P.cash }); P.cash = 0; }
  if (fx.cash) { P.cash = Math.max(0, P.cash + fx.cash); ch.push({ k: 'cash', d: fx.cash }); }
  if (fx.suspicion) { P.suspicion = clamp(P.suspicion + fx.suspicion, 0, 100); ch.push({ k: 'suspicion', d: fx.suspicion }); }
  if (fx.inv) { P.inv = clamp((P.inv || 0) + fx.inv, 0, 100); ch.push({ k: 'inv', d: fx.inv }); }
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
  akten: { groups: [], yes: { inv: -8, suspicion: 4 }, no: { inv: 7, influence: 1 }, later: [] },
  sondersitzung: { groups: ['vereine', 'senioren'], yes: { trust: { vereine: 4, senioren: 3 }, inv: 3 }, no: { trust: { vereine: -3 } }, later: [] },
  leserbrief: { groups: ['senioren', 'kirche'], yes: { trust: { senioren: 3, kirche: 3 }, mod: { _own: 0.05 } }, no: { trust: { junge: 2 } }, later: [] },
  zeugin: { groups: [], yes: { inv: -10, cash: -1500 }, no: { inv: 4, trust: { kirche: 2 } }, later: [] },
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

// ---------------- Etappe 3: Wetter-Werkzeuge ----------------
// Einmal pro Tag am Wetterpult auf dem Dach. risk: Wahrscheinlichkeit einer Katastrophe am nächsten Tag.
export const WEATHER = [
  { id: 'rain_fields', kind: 'rain', where: ['Regen über den Feldern', 'Rain over the fields'], groups: ['bauern'],
    fx: { trust: { bauern: 5 } }, note: ['Die Bauern danken. Der Hang wird nass.', 'The farmers are grateful. The slope gets wet.'], hang: 1 },
  { id: 'rain_square', kind: 'rain', where: ['Regen über dem Dorfplatz', 'Rain over the village square'], groups: ['gewerbe'],
    fx: { trust: { gewerbe: -3 }, mod: { huber: -0.08 } }, note: ['Hubers Platzkonzert fällt ins Wasser. Die Marktfahrer fluchen.', 'Huber’s square concert is washed out. The market traders curse.'] },
  { id: 'fog_square', kind: 'fog', where: ['Nebel über dem Dorfplatz', 'Fog over the village square'], groups: [],
    fx: { suspicion: -3, flag: 'fog_today' }, note: ['Heute sieht niemand, wer was tut. Ideal für Dinge, die niemand sehen soll.', 'Today nobody sees who does what. Ideal for things nobody should see.'] },
  { id: 'fog_pass', kind: 'fog', where: ['Nebel auf der Passstrasse', 'Fog on the mountain pass road'], groups: ['gewerbe'],
    fx: { trust: { gewerbe: -2 }, mod: { fww: -0.06 } }, note: ['Die Ausflügler bleiben weg. Die Hotels auch leer.', 'The day-trippers stay away. The hotels stay empty too.'], risk: [0.35, 'nebel_unfall'] },
  { id: 'sun_hotel', kind: 'sun', where: ['Sonne über dem Hotel Bergblick', 'Sun over Hotel Bergblick'], groups: ['gewerbe'],
    fx: { trust: { gewerbe: 4 } }, note: ['Die Terrasse ist voll. Der Hoteldirektor winkt zum Amt hinauf.', 'The terrace is full. The hotel manager waves up at the office.'] },
  { id: 'sun_church', kind: 'sun', where: ['Sonne über der Kirche', 'Sun over the church'], groups: ['kirche', 'senioren'],
    fx: { trust: { kirche: 4, senioren: 2 } }, note: ['Pfarrer Imhof predigt über das Licht. Er schaut dabei zum Amt.', 'Father Imhof preaches about the light. He looks at the office while he does.'] },
  { id: 'snow_village', kind: 'snow', where: ['Schnee über dem ganzen Dorf', 'Snow over the whole village'], groups: ['junge', 'gewerbe'],
    fx: { trust: { junge: 5, gewerbe: -3 } }, note: ['Schulfrei! Auf dem Dorfplatz stehen Schneemänner. Der Lieferwagen der Bäckerei steckt fest.', 'Snow day! Snowmen on the village square. The bakery van is stuck.'] },
  { id: 'storm_rival', kind: 'storm', where: ['Gewitter über dem Parteilokal der Konkurrenz', 'Thunderstorm over the rival party’s office'], groups: ['junge'],
    fx: { mod: { huber: -0.12 }, suspicion: 7, trust: { junge: 2 } }, note: ['Der Strom fällt aus, die Plakate weichen auf. Ein Gewitter so gezielt? Manche fragen sich das.', 'The power fails, the posters go soggy. A thunderstorm that precise? Some people wonder.'], risk: [0.3, 'blitz'] },
];
Object.assign(EVENTS, {
  murgang: { from: 'Wolkenwiler Anzeiger',
    text: ['Nach dem vielen Regen ist am Hang ein Murgang niedergegangen. Die Strasse ins Tal ist gesperrt, zwei Ställe sind verschüttet. Verletzt wurde niemand. Der Kanton will wissen, wer so viel Regen bewilligt hat.', 'After all the rain, a mudslide came down the slope. The road to the valley is closed, two barns are buried. Nobody was hurt. The canton wants to know who approved so much rain.'],
    fx: { trust: { bauern: -8, gewerbe: -4 }, suspicion: 10 } },
  nebel_unfall: { from: 'Dorfpolizei Wolkenwil',
    text: ['Im dichten Nebel auf der Passstrasse sind zwei Autos zusammengestossen. Eine Fahrerin liegt mit gebrochenem Arm im Spital. Die Zeitung fragt, warum es dort neblig war.', 'In thick fog on the pass road two cars collided. A driver is in hospital with a broken arm. The paper asks why it was foggy there.'],
    choices: [
      [['Wetterprotokoll fälschen', 'Falsify the weather log'], { suspicion: 6, flag: 'log_forged' }, ['Im Protokoll steht jetzt «natürlicher Nebel». Wer genau hinschaut, sieht die frische Tinte.', 'The log now says “natural fog”. Anyone looking closely can see the fresh ink.']],
      [['Verantwortung übernehmen', 'Take responsibility'], { suspicion: -2, trust: { senioren: 2, kirche: 2 }, mod: { _own: -0.1 } }, ['Du entschuldigst dich öffentlich. Deine Partei ist wütend, das Dorf überrascht.', 'You apologise publicly. Your party is furious, the village surprised.']],
    ] },
  blitz: { from: 'Pfarrei St. Niklaus',
    text: ['Ein Blitz hat in den Kirchturm eingeschlagen. Das Dach brennt kurz, die Feuerwehr ist schnell da. Pfarrer Imhof spricht von «einem Zeichen». Er meint nicht Gott.', 'Lightning struck the church tower. The roof burns briefly, the fire brigade is quick. Father Imhof speaks of “a sign”. He does not mean God.'],
    fx: { trust: { kirche: -6, senioren: -3 }, suspicion: 8 } },
});

// ---------------- Etappe 4: Sachabstimmung, Gerüchte ----------------
// lean: wie stark eine Gruppe zu Ja neigt (−1 … +1). stance: Parteiparole.
export const VOTES = {
  seilbahn: { q: ['Soll Wolkenwil eine Seilbahn auf den Gipfel bauen? (CHF 14 Mio.)', 'Should Wolkenwil build a cable car to the summit? (CHF 14 m)'],
    lean: { gewerbe: 0.8, junge: 0.3, vereine: 0.2, bauern: -0.7, senioren: -0.4, kirche: -0.1 },
    stance: { wvb: 'no', fww: 'yes', pkh: 'no', huber: 'yes' },
    yes: { fx: { trust: { gewerbe: 4, bauern: -4 } }, text: ['Die Seilbahn kommt. Der Gipfel wird verkauft, die Bauern verlieren eine Weide.', 'The cable car is coming. The summit is sold off, the farmers lose a pasture.'] },
    no: { fx: { trust: { bauern: 3, gewerbe: -3 } }, text: ['Keine Seilbahn. Der Gipfel bleibt den Kühen. Das Hotel Bergblick droht mit Wegzug.', 'No cable car. The summit stays with the cows. Hotel Bergblick threatens to leave.'] } },
  aufsicht: { q: ['Soll das Wolkenamt unter die Aufsicht des Kantons gestellt werden?', 'Should the Cloud Office be placed under the canton’s supervision?'],
    lean: { junge: 0.6, kirche: 0.3, gewerbe: 0.1, senioren: -0.3, vereine: -0.4, bauern: -0.6 },
    stance: { wvb: 'no', fww: 'yes', pkh: 'yes', huber: 'no' },
    yes: { fx: { inv: 8, trust: { junge: 3 } }, text: ['Ja. Ab nächstem Monat sitzt ein Beamter aus der Stadt mit im Büro. Er bringt sein eigenes Znüni mit.', 'Yes. From next month a civil servant from the city sits in the office. He brings his own snack.'] },
    no: { fx: { inv: -6, trust: { vereine: 2, bauern: 2 } }, text: ['Nein. Wolkenwil regelt seinen Himmel selbst. Inspektor Wyss notiert sich das Resultat.', 'No. Wolkenwil runs its own sky. Inspector Wyss writes the result down.'] } },
  wolkensteuer: { q: ['Soll jede Wolke über Privatgrund eine Gebühr von CHF 20 kosten (Wolkensteuer)?', 'Should every cloud over private land cost a CHF 20 fee (cloud tax)?'],
    lean: { gewerbe: -0.6, bauern: -0.5, senioren: -0.2, junge: 0.4, kirche: 0.2, vereine: 0.1 },
    stance: { wvb: 'no', fww: 'no', pkh: 'yes', huber: 'yes' },
    yes: { fx: { cash: 1500, trust: { gewerbe: -3, bauern: -3 } }, text: ['Die Wolkensteuer kommt. Die Gemeindekasse ist voll, die Gartenbesitzer spannen Planen.', 'The cloud tax is coming. The council coffers are full, garden owners put up tarps.'] },
    no: { fx: { trust: { gewerbe: 2, bauern: 2 } }, text: ['Keine Wolkensteuer. Der Himmel bleibt gratis. Huber nennt das «Verantwortungslosigkeit».', 'No cloud tax. The sky stays free. Huber calls it “irresponsibility”.'] } },
};
export const VOTE_ACTIONS = [
  { id: 'camp', label: ['Kampagne machen', 'Campaign'], cost: { influence: -1 }, shift: 5, need: P => P.influence >= 1, note: ['Du redest im Rössli, an der Bushaltestelle und am Grab der Tante Huber.', 'You speak at the Rössli, at the bus stop and at Aunt Huber’s grave.'] },
  { id: 'poster', label: ['Plakate kaufen (CHF 800)', 'Buy posters (CHF 800)'], cost: { cash: -800, suspicion: 2 }, shift: 4, need: P => P.cash >= 800, note: ['Über Nacht hängt das Dorf voll. Wer bezahlt hat, steht nirgends.', 'Overnight the village is plastered. Who paid is written nowhere.'] },
  { id: 'mail', label: ['Briefwahl-Couverts verschwinden lassen', 'Make postal ballots disappear'], cost: { suspicion: 6 }, shift: 9, risk: 0.4, need: () => true, note: ['Ein Sack Couverts liegt jetzt im Heizungskeller. Hoffentlich heizt niemand.', 'A sack of ballots now lies in the boiler room. Hopefully nobody turns on the heating.'] },
];
export function voteForecast(P, vid) {
  const V = VOTES[vid], pos = (P.vote && P.vote[vid]) || { shift: 0 };
  let y = 50;
  for (const g in GROUPS) y += GROUPS[g].w * V.lean[g] * 40 * (0.6 + P.trust[g] / 125);
  return Math.max(3, Math.min(97, Math.round(y + pos.shift)));
}
export const RUMORS = [
  { target: 'huber', text: ['«Huber lässt sich die Gemeinderatssitzungen vom Hotel bezahlen.»', '“Huber gets the hotel to pay for council meetings.”'] },
  { target: 'fww', text: ['«Der FWW-Präsident ist mit dem Seilbahnbauer verschwägert.»', '“The FWW president is related by marriage to the cable car builder.”'] },
  { target: 'wvb', text: ['«Der Volksbund kauft seine Kühe im Ausland.»', '“The People’s League buys its cows abroad.”'] },
  { target: 'pkh', text: ['«Die Partei für klaren Himmel wird von Zürcher Investoren bezahlt.»', '“The Clear Sky Party is funded by Zurich investors.”'] },
];
Object.assign(EVENTS, {
  rumor_traced: { from: 'Bäckerei Moser',
    text: ['Frau Moser erzählt jedem, der ein Brot kauft, von wem das Gerücht stammt. Von dir.', 'Mrs Moser tells everyone who buys bread where the rumour came from. From you.'],
    fx: { suspicion: 6, mod: { _own: -0.08 } } },
  einbruch: { from: 'Wolkenwiler Anzeiger',
    text: ['Einbruch im Parteienhaus! Eine Zeugin hat jemanden mit Amtsmütze aus dem Fenster klettern sehen. Die Polizei hat eine Mütze, aber noch keinen Kopf dazu.', 'Break-in at the party house! A witness saw someone in an official cap climbing out of the window. The police have a cap but no head to go with it yet.'],
    fx: { suspicion: 10, mod: { _own: -0.12 } } },
  urn_caught: { from: 'Gemeindeschreiber',
    text: ['Beim Leeren der Urne fallen dem Gemeindeschreiber Zettel in derselben Handschrift auf. Viele. Er fragt, wer gestern allein im Ratssaal war.', 'Emptying the ballot box, the town clerk notices slips in the same handwriting. Many. He asks who was alone in the council chamber yesterday.'],
    fx: { suspicion: 12, mod: { _own: -0.1 } } },
  mail_found: { from: 'Gemeindeschreiber',
    text: ['Im Heizungskeller wurde ein Sack Briefwahl-Couverts gefunden. Der Gemeindeschreiber zählt nach. Der Kanton auch.', 'A sack of postal ballots was found in the boiler room. The town clerk is counting. So is the canton.'],
    fx: { suspicion: 15, mod: { _own: -0.12 } } },
});

// ---------------- Etappe 6: Abendpartie (mehrere Parteien gleichzeitig) ----------------
export function freshMulti(partyIds) {
  const S = { trust: {}, mod: { wvb: 0, fww: 0, pkh: 0, huber: 0.25 }, susp: {}, log: [] };
  partyIds.forEach(p => { S.trust[p] = {}; for (const g in GROUPS) S.trust[p][g] = 50; S.susp[p] = 0; });
  return S;
}
export function pollsMulti(S) {
  const out = {}; for (const p in PARTIES) out[p] = 0;
  for (const g in GROUPS) {
    let sum = 0; const sc = {};
    for (const p in PARTIES) {
      let v = PARTIES[p].aff[g] + (S.mod[p] || 0);
      if (S.trust[p]) v += (S.trust[p][g] - 50) / 32;
      if (S.susp[p] >= 100) v -= 1.2; else if (S.susp[p] >= 60) v -= 0.4;
      sc[p] = Math.exp(v * 1.6); sum += sc[p];
    }
    for (const p in PARTIES) out[p] += GROUPS[g].w * sc[p] / sum;
  }
  for (const p in out) out[p] = Math.round(out[p] * 1000) / 10;
  return out;
}
export const MP_ACTIONS = [
  { id: 'rumor', target: true, label: ['Gerücht streuen', 'Spread a rumour'], tip: ['Ziel verliert Stimmen. Kann auf dich zurückfallen.', 'Target loses votes. Can backfire on you.'] },
  { id: 'tip', target: true, label: ['Beim Kanton verpfeifen', 'Tip off the canton'], tip: ['Verdacht beim Ziel +15. Ab 60 ermittelt der Kanton.', 'Target suspicion +15. From 60 the canton investigates.'] },
  { id: 'posters', target: false, label: ['Plakate kleben', 'Put up posters'], tip: ['Eigene Partei legt leicht zu.', 'Your party gains slightly.'] },
  { id: 'bribe', target: false, label: ['Bestechung annehmen', 'Accept a bribe'], tip: ['Eigene Partei legt stark zu. Verdacht +12.', 'Your party gains a lot. Suspicion +12.'] },
];
// Aktion auf dem Host anwenden; Rückgabe: Logzeile als [de, en]
export function multiAct(S, own, a, target, rnd = Math.random) {
  const P = n => PARTIES[n].short;
  if (a === 'rumor' && target) {
    S.mod[target] = (S.mod[target] || 0) - 0.12;
    if (rnd() < 0.3) { S.mod[own] -= 0.08; S.susp[own] += 6; return [`Ein Gerücht über ${P(target)} macht die Runde. Frau Moser weiss, dass es von ${P(own)} kommt.`, `A rumour about ${P(target)} is going round. Mrs Moser knows it came from ${P(own)}.`]; }
    return [`Ein Gerücht über ${P(target)} macht die Runde. Woher, weiss niemand.`, `A rumour about ${P(target)} is going round. Nobody knows where from.`];
  }
  if (a === 'tip' && target) {
    S.susp[target] = Math.min(100, (S.susp[target] || 0) + 15);
    if (S.susp[target] >= 60) { S.mod[target] -= 0.15; return [`Anonyme Anzeige: Der Kanton ermittelt gegen ${P(target)}.`, `Anonymous tip: the canton is investigating ${P(target)}.`]; }
    return [`Beim Kanton ist eine anonyme Anzeige gegen ${P(target)} eingegangen.`, `The canton has received an anonymous tip about ${P(target)}.`];
  }
  if (a === 'posters') { S.mod[own] += 0.08; S.susp[own] += 2; return [`${P(own)} pflastert das Dorf mit Plakaten.`, `${P(own)} plasters the village with posters.`]; }
  if (a === 'bribe') { S.mod[own] += 0.18; S.susp[own] = Math.min(100, S.susp[own] + 12); return [`${P(own)} hat plötzlich viel Geld für den Wahlkampf. Woher?`, `${P(own)} suddenly has a lot of money for the campaign. From where?`]; }
  return null;
}
// Wolke einer Partei wirkt auf die Wählergruppen des Antrags
export function multiCloud(S, own, orderIdx, stars) {
  const pol = ORDER_POL[orderIdx]; if (!pol || !S.trust[own]) return;
  const sc = STAR_SCALE[stars] ?? 0;
  for (const g in (pol.yes.trust || {})) { const v = pol.yes.trust[g]; if (v > 0) S.trust[own][g] = Math.max(0, Math.min(100, S.trust[own][g] + Math.round(v * sc))); }
}
// Wer vorne liegt, zieht Aufmerksamkeit auf sich (Designregel 5)
export function multiRoundEnd(S) {
  const pl = pollsMulti(S), lead = Object.keys(S.trust).sort((a, b) => pl[b] - pl[a])[0];
  if (lead) S.susp[lead] = Math.min(100, S.susp[lead] + 5);
  return lead;
}

// ---------------- Kapitel 2: Die Untersuchung ----------------
// Inspektor Wyss befragt dich jeden Morgen. «inv» ist der Stand der Ermittlung (0–100).
// Bei 100 ist das Amt weg. Am Samstag entscheidet Wyss.
export const CH2_START = 6;
export function startInvestigation(P) {
  if (P.inv != null) return false;
  P.ch = 2; P.inv = clamp(Math.round(10 + P.suspicion * 0.5), 10, 70);
  P.snap2 = JSON.stringify(P);
  return true;
}
export const INV_INTRO = { from: 'Kanton Wolkenwil, Inspektorat',
  text: ['Einschreiben. «Gegen das Wolkenamt Wolkenwil wird eine Untersuchung eröffnet. Inspektor B. Wyss wird ab heute vor Ort sein. Bitte stellen Sie ihm einen Stuhl und Kaffee bereit.»', 'Registered letter. “An investigation into the Cloud Office of Wolkenwil is opened. Inspector B. Wyss will be on site from today. Please provide him with a chair and coffee.”'],
  fx: { suspicion: 0 } };
const W = 'Inspektor Wyss';
export const INTERROGATIONS = [
  { from: W, text: ['Wyss hat sich im Archiv eingerichtet. «Erklären Sie mir eines: Wer entscheidet hier, welche Wolke wohin fliegt?»', 'Wyss has settled into the archive. “Explain one thing to me: who decides here which cloud goes where?”'],
    choices: [
      [['«Ich. Nach Vorschrift.»', '“I do. By the rules.”'], { inv: -4, influence: -1 }, ['Wyss nickt langsam. «Nach welcher Vorschrift?» Du zeigst ihm einen Ordner. Er ist leer, aber dick.', 'Wyss nods slowly. “Which rules?” You show him a binder. It is empty, but thick.']],
      [['«Der Gemeinderat.»', '“The council.”'], { inv: 3, mod: { huber: -0.08 } }, ['Wyss schreibt «Gemeinderat» auf und unterstreicht es zweimal. Huber wird das nicht mögen.', 'Wyss writes “council” and underlines it twice. Huber will not like that.']],
      [['«Das Wetter.»', '“The weather.”'], { inv: 6, trust: { junge: 2 } }, ['Wyss lacht nicht. Draussen schon: Der Satz steht am Abend auf einem Plakat der Jungen.', 'Wyss does not laugh. Outside they do: by evening the line is on a poster by the young people.']],
    ] },
  { from: W, text: ['«In Ihrem Pultschrank liegt eine Kaffeekasse. Sie ist sehr voll. Woher stammt das Geld?»', '“There is a coffee fund in your desk. It is very full. Where does the money come from?”'],
    choices: [
      [['Kasse offenlegen', 'Open the books'], { inv: -12, cashAll: true, mod: { _own: -0.05 } }, ['Du legst alles auf den Tisch. Wyss zählt zweimal. Die Kasse ist jetzt leer und beim Kanton.', 'You put everything on the table. Wyss counts twice. The fund is now empty and with the canton.'], P => P.cash > 0],
      [['«Spenden vom Turnverein.»', '“Donations from the gym club.”'], { inv: 7, suspicion: 4 }, ['«Ich rufe den Turnverein an», sagt Wyss. Der Turnverein hat kein Telefon. Noch nicht.', '“I will call the gym club,” says Wyss. The gym club has no phone. Not yet.']],
      [['Anwalt Dr. Steiner holen (CHF 2000)', 'Call lawyer Dr Steiner (CHF 2,000)'], { inv: -9, cash: -2000 }, ['Dr. Steiner redet zwanzig Minuten ohne Punkt. Wyss gibt auf, für heute.', 'Dr Steiner talks for twenty minutes without a full stop. Wyss gives up, for today.'], P => P.cash >= 2000],
    ] },
  { from: W, text: ['«Herr Gerber, Frau Moser und der FC haben ausgesagt. Alle sagen etwas anderes. Und alle sagen Ihren Namen.»', '“Mr Gerber, Mrs Moser and the FC have given statements. They all say something different. And they all say your name.”'],
    choices: [
      [['Gerber als Lügner hinstellen', 'Paint Gerber as a liar'], { inv: -6, trust: { senioren: -5 }, suspicion: 3 }, ['Wyss streicht Gerbers Aussage an. Gerber hört davon und spricht im Rössli von nichts anderem.', 'Wyss marks Gerber’s statement. Gerber hears about it and talks about nothing else at the Rössli.']],
      [['Frau Moser um Hilfe bitten', 'Ask Mrs Moser for help'], { inv: -5, trust: { gewerbe: 2 }, cash: -500 }, ['Frau Moser erinnert sich plötzlich an nichts mehr. Für fünfhundert Franken Gipfeli.', 'Mrs Moser suddenly remembers nothing. For five hundred francs of croissants.'], P => P.cash >= 500],
      [['Schweigen', 'Stay silent'], { inv: 4 }, ['Du sagst nichts. Wyss schreibt trotzdem drei Seiten.', 'You say nothing. Wyss writes three pages anyway.']],
    ] },
  { from: W, text: ['«Der Aktenvernichter war gestern warm. Und im Heizungskeller riecht es nach Papier. Was haben Sie vernichtet?»', '“The shredder was warm yesterday. And the boiler room smells of paper. What did you destroy?”'],
    choices: [
      [['«Werbung.»', '“Junk mail.”'], { inv: 5, suspicion: 3 }, ['Wyss zieht einen Schnipsel aus dem Papierkorb. «Werbung mit Amtsstempel?»', 'Wyss pulls a scrap out of the bin. “Junk mail with an official stamp?”']],
      [['Huber belasten (Druckmittel)', 'Incriminate Huber (leverage)'], { inv: -16, mod: { huber: -0.2 }, unlev: 'huber' }, ['Du legst die Seilbahn-Studie auf den Tisch. Wyss liest lange. «Das ändert einiges», sagt er. Huber wird bleich.', 'You put the cable car study on the table. Wyss reads for a long time. “That changes a lot,” he says. Huber goes pale.'], P => P.lev && P.lev.huber],
      [['Gerber belasten (Druckmittel)', 'Incriminate Gerber (leverage)'], { inv: -10, trust: { senioren: -3 }, unlev: 'gerber' }, ['Gerbers alte Baubewilligung landet bei Wyss. Er hat jetzt zwei Akten statt einer.', 'Gerber’s old building permit lands with Wyss. He now has two files instead of one.'], P => P.lev && P.lev.gerber],
      [['Nichts sagen', 'Say nothing'], { inv: 6 }, ['Wyss notiert: «Verweigert die Aussage.» Er notiert es schön.', 'Wyss writes: “Refuses to testify.” He writes it neatly.']],
    ] },
  { from: 'Gemeindepräsident Huber', text: ['Huber steht in der Tür und schliesst sie leise. «Machen wir es einfach. Sie nehmen alles auf sich. Ich sorge dafür, dass es nicht so schlimm wird. Ehrenwort.»', 'Huber stands in the doorway and quietly closes the door. “Let’s keep it simple. You take the blame for everything. I make sure it won’t be so bad. Word of honour.”'],
    choices: [
      [['Deal annehmen', 'Take the deal'], { inv: -14, mod: { _own: -0.18, huber: 0.15 }, flag: 'huber_deal' }, ['Ihr gebt euch die Hand. Huber hat sehr weiche Hände. Am Nachmittag ist er bester Laune.', 'You shake hands. Huber has very soft hands. In the afternoon he is in excellent spirits.']],
      [['Ablehnen', 'Refuse'], { inv: 3, trust: { kirche: 2, junge: 2 } }, ['«Wie Sie wollen», sagt Huber. Er öffnet die Tür nicht leise.', '“As you wish,” says Huber. He does not open the door quietly.']],
      [['Das Gespräch aufnehmen', 'Record the conversation'], { inv: -4, lev: 'huber', suspicion: 2 }, ['Dein Telefon lag die ganze Zeit offen auf dem Pult. Huber hat es nicht bemerkt. Du hast jetzt etwas gegen ihn.', 'Your phone was lying open on the desk the whole time. Huber did not notice. You now have something on him.']],
    ] },
  { from: W, text: ['Samstagmorgen. Wyss packt seine Akten. «Bevor ich meinen Bericht schreibe: Gibt es noch etwas, das Sie mir sagen wollen?»', 'Saturday morning. Wyss packs his files. “Before I write my report: is there anything else you want to tell me?”'],
    choices: [
      [['Gestehen', 'Confess'], { inv: -22, suspicion: -25, mod: { _own: -0.22 } }, ['Du erzählst alles. Wyss schreibt nicht mit. Er hört nur zu. Am Ende sagt er: «Danke. Das war selten.»', 'You tell him everything. Wyss does not take notes. He just listens. At the end he says: “Thank you. That was rare.”']],
      [['«Nein.»', '“No.”'], {}, ['Wyss schliesst den Koffer. Das Schloss klickt laut.', 'Wyss closes the briefcase. The lock clicks loudly.']],
      [['Wyss einen Umschlag geben (CHF 5000)', 'Give Wyss an envelope (CHF 5,000)'], { inv: -30, cash: -5000, suspicion: 12, flag: 'wyss_envelope' }, ['Wyss sieht den Umschlag lange an. Dann steckt er ihn ein. Ohne ein Wort.', 'Wyss looks at the envelope for a long time. Then he pockets it. Without a word.'], P => P.cash >= 5000],
    ] },
];
export function interrogation(day) { return INTERROGATIONS[day - CH2_START] || null; }
// Ermittlung wächst mit dem Verdacht
export function invDaily(P) { const d = Math.round(P.suspicion / 7); if (d) apply(P, { inv: d }); return d; }
export function verdict(P) {
  if (P.inv >= 100) return 'removed';
  if (P.inv >= 65) return P.flags.huber_deal ? 'betrayed' : 'charged';
  if (P.inv >= 35) return 'scapegoat';
  return 'cleared';
}
export const VERDICT_FX = {
  removed: { mod: { _own: -0.5 }, influence: -5 },
  charged: { mod: { _own: -0.35 }, suspicion: 10 },
  betrayed: { mod: { _own: -0.3, huber: 0.2 } },
  scapegoat: { mod: { _own: -0.05 }, suspicion: -15 },
  cleared: { mod: { _own: 0.1 }, suspicion: -20 },
};

// ---------------- Kapitel 3: Der Wahlkampf ----------------
// Jeden Morgen ein Wahlkampf-Termin. Am Samstag ist Gemeindewahl, danach eines von mehreren Enden.
export const CH3_START = 12;
const R = 'Wolkenwiler Anzeiger';
export const CAMPAIGN = [
  { from: 'Parteisekretariat', text: ['Wahlkampfstart. Die Partei will ein Plakat mit deinem Gesicht. Welcher Spruch soll drauf?', 'Campaign launch. The party wants a poster with your face. Which slogan goes on it?'],
    choices: [
      [['«Ich habe den Himmel im Griff.»', '“I have the sky under control.”'], { mod: { _own: 0.08 }, suspicion: 3 }, ['Das Plakat hängt überall. Jemand hat «leider» dazugeschrieben.', 'The poster is everywhere. Someone has added “sadly”.']],
      [['«Sonne für alle.»', '“Sun for everyone.”'], { trust: { senioren: 3, vereine: 3, bauern: -2 } }, ['Die Bauern fragen, wann es dann regnet. Niemand antwortet.', 'The farmers ask when it will rain then. Nobody answers.']],
      [['«Huber. Wirklich?»', '“Huber. Really?”'], { mod: { huber: -0.1, _own: 0.03 }, trust: { junge: 3 } }, ['Die Jungen lieben es. Huber lässt die Plakate über Nacht überkleben. Mit Huber.', 'The young love it. Huber has the posters covered overnight. With Huber.']],
    ] },
  { from: R, text: ['Podium im Rössli. Moderatorin Imboden fragt: «Wer hat im Sommer die Hagelwolke über das Schwingfest geschickt?»', 'Debate at the Rössli. Host Imboden asks: “Who sent the hail cloud over the wrestling festival last summer?”'],
    choices: [
      [['«Das war vor meiner Zeit.»', '“That was before my time.”'], { trust: { vereine: -2 }, mod: { _own: 0.03 } }, ['Stimmt sogar. Klingt trotzdem nach Ausrede.', 'It is even true. It still sounds like an excuse.']],
      [['Auf Huber zeigen', 'Point at Huber'], { mod: { huber: -0.14 }, suspicion: 2 }, ['Huber verschluckt sich am Wasser. Das Publikum klatscht, bevor es weiss, warum.', 'Huber chokes on his water. The audience applauds before it knows why.']],
      [['Witz machen', 'Crack a joke'], { trust: { junge: 4, senioren: -3 } }, ['Die Hälfte lacht. Die andere Hälfte war am Schwingfest.', 'Half the room laughs. The other half was at the festival.']],
    ] },
  { from: 'Unbekannt', text: ['Ein USB-Stick im Briefkasten. Darauf: Fotos von Huber, wie er nachts Briefwahl-Couverts in sein Auto lädt. Echt? Vielleicht.', 'A USB stick in the letterbox. On it: photos of Huber loading postal ballots into his car at night. Real? Maybe.'],
    choices: [
      [['An die Zeitung geben', 'Give it to the paper'], { mod: { huber: -0.25 }, suspicion: 6 }, ['Die Schlagzeile ist riesig. Woher die Fotos stammen, fragt Imboden erst morgen.', 'The headline is huge. Imboden only asks tomorrow where the photos came from.']],
      [['Als Druckmittel behalten', 'Keep it as leverage'], { lev: 'huber' }, ['Der Stick liegt jetzt in deiner Schublade. Unter dem Locher.', 'The stick now lies in your drawer. Under the hole punch.']],
      [['Zerstören', 'Destroy it'], { trust: { kirche: 3 }, suspicion: -3 }, ['Du wirfst den Stick in den Brunnen. Das fühlt sich anständig an. Und dumm.', 'You throw the stick into the fountain. It feels decent. And stupid.']],
    ] },
  { from: 'Bauer Zbinden', text: ['«Wahlkampf hin oder her: Seit einer Woche kein Regen. Wenn Sie wollen, dass die Bauern Sie wählen, dann…»', '“Campaign or not: no rain for a week. If you want the farmers to vote for you, then…”'],
    choices: [
      [['Regen versprechen', 'Promise rain'], { trust: { bauern: 8 }, flag: 'rain_promise' }, ['Zbinden schüttelt dir die Hand. Lange. Er wird sich erinnern.', 'Zbinden shakes your hand. For a long time. He will remember.']],
      [['«Das Wetter ist unpolitisch.»', '“The weather is apolitical.”'], { trust: { bauern: -5, junge: 2 } }, ['Zbinden lacht so laut, dass die Kühe schauen.', 'Zbinden laughs so loudly the cows look over.']],
      [['Stimmen kaufen (CHF 2500)', 'Buy votes (CHF 2,500)'], { trust: { bauern: 10 }, cash: -2500, suspicion: 8 }, ['Fünfzig Franken pro Hof. «Für Saatgut», steht auf dem Couvert.', 'Fifty francs per farm. “For seeds”, it says on the envelope.'], P => P.cash >= 2500],
    ] },
  { from: 'Gemeindepräsident Huber', text: ['Huber am Telefon, ganz freundlich: «Ziehen Sie Ihre Kandidatur zurück. Sie bekommen dafür das Amt auf Lebenszeit und einen Parkplatz.»', 'Huber on the phone, very friendly: “Withdraw your candidacy. In return you get the office for life and a parking space.”'],
    choices: [
      [['Annehmen', 'Accept'], { mod: { _own: -0.4, huber: 0.3 }, cash: 3000, flag: 'withdrew' }, ['Du hast jetzt einen Parkplatz. Deine Partei hat jetzt ein Problem.', 'You now have a parking space. Your party now has a problem.']],
      [['Ablehnen', 'Refuse'], { mod: { _own: 0.05 } }, ['«Schade», sagt Huber. Er klingt nicht, als fände er es schade.', '“Pity,” says Huber. He doesn’t sound like he thinks it is a pity.']],
      [['Mit dem USB-Stick drohen', 'Threaten with the USB stick'], { mod: { huber: -0.2 }, unlev: 'huber', suspicion: 4 }, ['Langes Schweigen. «Ich werde krank», sagt Huber. «Am Wahltag. Sehr krank.»', 'A long silence. “I am getting ill,” says Huber. “On election day. Very ill.”'], P => P.lev && P.lev.huber],
    ] },
  { from: R, text: ['Wahltag. Das Wahllokal öffnet um acht. Der Himmel über Wolkenwil ist leer und wartet auf dich.', 'Election day. The polling station opens at eight. The sky above Wolkenwil is empty and waiting for you.'],
    choices: [
      [['Sonnenschein über dem Dorf', 'Sunshine over the village'], { trust: { senioren: 4, vereine: 3 } }, ['Die Senioren gehen bei Sonne wählen. Die Senioren gehen immer wählen.', 'The seniors vote when it is sunny. The seniors always vote.']],
      [['Regen über den Hochburgen der Gegner', 'Rain over the opponents’ strongholds'], { mod: { huber: -0.15 }, suspicion: 10 }, ['Im Oberdorf bleibt man zu Hause. Imboden fotografiert die einzelne Regenwolke.', 'In the upper village people stay at home. Imboden photographs the single rain cloud.']],
      [['Nichts tun. Ehrlich wählen lassen.', 'Do nothing. Let them vote honestly.'], { suspicion: -5, trust: { kirche: 3 } }, ['Ein normaler grauer Tag. Fast niemand merkt, wie selten das ist.', 'An ordinary grey day. Almost nobody notices how rare that is.']],
    ] },
];
export function campaignEvent(day) { return CAMPAIGN[day - CH3_START] || null; }
// Endergebnis der Gemeindewahl
export function election(P) {
  const pl = polls(P);
  if (P.verdict === 'charged' || P.verdict === 'betrayed') pl[P.party] *= 0.85;
  if (P.flags.withdrew) pl[P.party] *= 0.5;
  const sum = Object.values(pl).reduce((a, b) => a + b, 0);
  for (const k in pl) pl[k] = pl[k] / sum * 100;
  const order = Object.keys(pl).sort((a, b) => pl[b] - pl[a]);
  let end;
  if (P.flags.withdrew) end = 'parking';
  else if (order[0] === P.party && P.suspicion >= 70) end = 'hollow';
  else if (order[0] === P.party) end = P.suspicion <= 25 ? 'clean' : 'win';
  else if (pl[P.party] >= pl[order[0]] - 3) end = 'recount';
  else if (order[0] === 'huber') end = 'huber';
  else end = 'lost';
  return { pl, order, end };
}

// ---------------- Sandbox: Jahre im Amt ----------------
// Endlos: jedes Jahr 6 Tage, jedes Jahr eine Abstimmung, alle 2 Jahre Gemeindewahl.
export const SB_INDEX = 18;
const SB_SPECIALS = ['regen', 'duerre', 'abschaffung', 'schule', 'umschlag', 'akten', 'sondersitzung', 'leserbrief', 'zeugin'];
const DAYNAMES = [['Montag', 'Monday'], ['Dienstag', 'Tuesday'], ['Mittwoch', 'Wednesday'], ['Donnerstag', 'Thursday'], ['Freitag', 'Friday'], ['Samstag', 'Saturday']];
export function sbDay(year, day) {
  const r = rng((year * 7919 + day * 104729) % 2147483647 + 17); r(); r(); r();
  const o = []; while (o.length < 2) { const c = Math.floor(r() * 12); if (!o.includes(c)) o.push(c); }
  const sp = SB_SPECIALS[Math.floor(r() * SB_SPECIALS.length)];
  const cards = r() < 0.5 ? [o[0], sp, o[1]] : [o[0], o[1], sp];
  return { name: DAYNAMES[day], ch: 4, cards, slots: 2, end: day === 5 ? 4 : undefined };
}
export const SB_VOTES = ['seilbahn', 'aufsicht', 'wolkensteuer'];
export const isElectionYear = y => y % 2 === 0;
// Zufällige Morgenereignisse in der Sandbox (aus allen Kapiteln)
export function sbMorning(P, year, day) {
  const r = rng((year * 15485863 + day * 32452843) % 2147483647 + 5), out = []; r(); r();
  if (P.suspicion >= 55 && r() < 0.5) out.push(INTERROGATIONS[Math.floor(r() * INTERROGATIONS.length)]);
  else if (isElectionYear(year) && day >= 3) out.push(CAMPAIGN[Math.min(CAMPAIGN.length - 1, Math.floor(r() * 4))]);
  // Abkühlung: Verdacht verfliegt langsam, Huber erholt sich
  apply(P, { suspicion: -2 });
  P.mod.huber = Math.max(0.15, P.mod.huber + (0.35 - P.mod.huber) * 0.05);
  return out;
}

// ---------------- Gegner schlagen zurück (Einzelspiel) ----------------
// Am Abend entscheiden die anderen Parteien, ob sie dir am nächsten Morgen schaden. Wer vorne liegt
// oder unter Verdacht steht, ist ein leichtes Ziel. Gespeichert wird nur {kind, actor}, der Text entsteht beim Zeigen.
export function rivalTurn(P, rnd = Math.random) {
  const pl = polls(P), order = Object.keys(pl).sort((a, b) => pl[b] - pl[a]);
  const lead = order[0] === P.party;
  let chance = 0.3 + (lead ? 0.25 : 0) + (P.suspicion > 40 ? 0.15 : 0);
  if (rnd() > chance) return null;
  const rivals = order.filter(p => p !== P.party), actor = lead ? rivals[0] : (rnd() < 0.5 ? rivals[0] : 'huber');
  const w = [['rumor', 0.4], ['report', P.suspicion > 30 ? 0.35 : 0.15], ['breakin', 0.2], ['poster', actor === 'huber' ? 0.3 : 0.12]];
  let x = rnd() * w.reduce((s, [, v]) => s + v, 0), kind = 'rumor';
  for (const [k, v] of w) { if ((x -= v) <= 0) { kind = k; break; } }
  return { kind, actor };
}
const PN = id => PARTIES[id].name, PS = id => PARTIES[id].short;
const tx = (de, en) => [de, en];
export function rivalEvent(R, P) {
  const a = R.actor, own = PS(P.party);
  if (R.kind === 'rumor') return { from: 'Wolkenwiler Anzeiger',
    text: tx(`Im Dorf geht ein Gerücht um: Das Wolkenamt habe «gewisse Gärten» bevorzugt. Die Quelle sitzt angeblich im Büro von ${PS(a)}.`, `A rumour is going round: the Cloud Office supposedly favoured “certain gardens”. The source reportedly sits in the ${PS(a)} office.`),
    choices: [
      [tx('Gegendarstellung schreiben (1 Einfluss)', 'Write a correction (1 influence)'), { influence: -1, mod: { _own: 0.02 } }, tx('Imboden druckt sie klein auf Seite 4. Immerhin.', 'Imboden prints it small on page 4. Still.'), Q => Q.influence >= 1],
      [tx('Schweigen', 'Stay silent'), { mod: { _own: -0.06 } }, tx('Das Gerücht wird am Stammtisch grösser. Es hat jetzt einen Hund.', 'The rumour grows at the regulars’ table. It now has a dog.')],
      [tx(`${PS(a)} mit dem Druckmittel drohen`, `Threaten ${PS(a)} with your leverage`), { mod: { [a]: -0.08 }, unlev: a, suspicion: 3 }, tx('Ein kurzer Anruf. Am Nachmittag erzählt niemand mehr etwas.', 'One short call. By the afternoon nobody says anything any more.'), Q => Q.lev && Q.lev[a]],
    ] };
  if (R.kind === 'report') return { from: 'Kanton Wolkenwil, Inspektorat',
    text: tx(`Gegen das Wolkenamt ist eine anonyme Anzeige eingegangen. Absender unbekannt. Briefpapier von ${PS(a)}.`, `An anonymous complaint against the Cloud Office has arrived. Sender unknown. ${PS(a)} letterhead.`),
    choices: [
      [tx('Anwalt Dr. Steiner (CHF 1000)', 'Lawyer Dr Steiner (CHF 1,000)'), { cash: -1000, suspicion: 2 }, tx('Dr. Steiner schreibt drei Seiten zurück. Der Kanton legt sie ab.', 'Dr Steiner writes back three pages. The canton files them.'), Q => Q.cash >= 1000],
      [tx('Offen kooperieren', 'Cooperate openly'), { suspicion: 4, trust: { kirche: 2, senioren: 1 } }, tx('Du schickst alle Unterlagen. Fast alle.', 'You send all documents. Almost all.')],
      [tx('Ignorieren', 'Ignore it'), { suspicion: 9, inv: P.inv != null ? 5 : 0 }, tx('Der Kanton mag es nicht, ignoriert zu werden.', 'The canton does not like being ignored.')],
    ] };
  if (R.kind === 'breakin') {
    if (P.flags.lock) return { from: 'Wolkenwiler Anzeiger', text: tx(`Versuchter Einbruch im Büro von ${own}! Das neue Schloss hat gehalten. Am Türrahmen klebt ein ${PS(a)}-Kleber.`, `Attempted break-in at the ${own} office! The new lock held. A ${PS(a)} sticker is stuck to the door frame.`), fx: { mod: { [a]: -0.04 } } };
    const levs = Object.keys(P.lev || {}).filter(k => P.lev[k]);
    const fx = levs.length ? { unlev: levs[0], mod: { _own: -0.03 } } : P.cash >= 800 ? { cash: -800, mod: { _own: -0.03 } } : { influence: -2, mod: { _own: -0.03 } };
    return { from: 'Wolkenwiler Anzeiger', text: tx(`Einbruch im Büro von ${own}! Die Akten liegen am Boden, ${levs.length ? 'ein Dossier fehlt' : P.cash >= 800 ? 'die Kasse ist leichter' : 'die Pläne für den Wahlkampf sind weg'}. Tipp: im eigenen Parteibüro in der Parteigasse ein Schloss kaufen.`, `Break-in at the ${own} office! Files on the floor, ${levs.length ? 'a dossier is missing' : P.cash >= 800 ? 'the cash box is lighter' : 'the campaign plans are gone'}. Tip: buy a lock at your own party office in Party Lane.`), fx };
  }
  return { from: PN(a)[0] === 'Liste Huber' ? 'Gemeindepräsident Huber' : 'Wolkenwiler Anzeiger',
    text: tx(`Über Nacht hängen überall neue Plakate von ${PS(a)}. Sogar auf dem Brunnen.`, `Overnight new ${PS(a)} posters went up everywhere. Even on the fountain.`),
    choices: [
      [tx('Überkleben lassen (CHF 600)', 'Have them pasted over (CHF 600)'), { cash: -600, suspicion: 2 }, tx('Am Mittag kleben eure Plakate drüber. Am Abend wieder ihre.', 'By noon your posters cover theirs. By evening theirs are back on top.'), Q => Q.cash >= 600],
      [tx('Hinnehmen', 'Accept it'), { mod: { [a]: 0.05 } }, tx('Die Plakate bleiben. Die Kühe lesen sie auch.', 'The posters stay. The cows read them too.')],
    ] };
}

// ---------------- Dorfgeschehen: kleine Ereignisse an den Orten im Dorf ----------------
// Kommt an manchen Tagen zusätzlich zur Post. Jedes nur einmal pro Spiel, Auswahl mit Folgen.
const VE = [
  { id: 'kuehe', from: 'Wolkenwiler Anzeiger', text: tx('Bauer Mosers Kühe sind ausgebüxt und stehen auf dem Dorfplatz. Eine frisst die Geranien vor dem Rathaus.', 'Farmer Moser’s cows have escaped and are standing on the village square. One is eating the geraniums outside the town hall.'),
    choices: [[tx('Selbst beim Einfangen helfen', 'Help catch them yourself'), { trust: { bauern: 3 } }, tx('Du rennst eine Stunde hinter einer Kuh namens Berta her. Moser nickt anerkennend.', 'You chase a cow called Berta for an hour. Moser nods approvingly.')],
      [tx('Die Feuerwehr rufen', 'Call the fire brigade'), { trust: { vereine: 2 }, influence: -1 }, tx('Die Feuerwehr kommt mit Blaulicht. Die Kühe sind beeindruckt.', 'The fire brigade arrives with sirens. The cows are impressed.')],
      [tx('Nicht zuständig', 'Not my department'), { trust: { bauern: -2 } }, tx('Formal korrekt. Moser schreibt es sich auf.', 'Formally correct. Moser makes a note.')]] },
  { id: 'schulzeitung', from: 'Schulhaus Wolkenwil', text: tx('Die Klasse 3b macht eine Schülerzeitung und möchte ein Interview mit dem Wolkenamt. Thema: «Wem gehört der Himmel?»', 'Class 3b is making a school paper and wants an interview with the Cloud Office. Topic: “Who owns the sky?”'),
    choices: [[tx('Interview geben', 'Give the interview'), { trust: { junge: 3 }, suspicion: 1 }, tx('Die erste Frage lautet: «Nehmen Sie Geld?» Du antwortest sehr lange.', 'The first question is: “Do you take money?” Your answer is very long.')],
      [tx('Schriftlich antworten', 'Answer in writing'), { trust: { junge: 1 } }, tx('Die Kinder finden die Antworten langweilig, aber korrekt.', 'The children find the answers boring but correct.')]] },
  { id: 'orgel', from: 'Pfarrer Imhof', text: tx('Die Orgel in St. Niklaus pfeift aus dem letzten Loch. Pfarrer Imhof bittet um eine Spende und um Sonne für das Kirchenfest.', 'The organ at St. Niklaus is on its last legs. Father Imhof asks for a donation and for sun for the church fete.'),
    choices: [[tx('CHF 300 spenden', 'Donate CHF 300'), { cash: -300, trust: { kirche: 4, senioren: 1 } }, tx('Die Orgel spielt wieder. Etwas schief, aber laut.', 'The organ plays again. A bit off-key, but loud.'), Q => Q.cash >= 300],
      [tx('Sonne versprechen', 'Promise sunshine'), { trust: { kirche: 2 } }, tx('Imhof dankt. Er wird dich daran erinnern.', 'Imhof thanks you. He will remind you.')],
      [tx('Ablehnen', 'Decline'), { trust: { kirche: -2 } }, tx('Imhof betet jetzt auch für dich. Nicht nur im guten Sinn.', 'Imhof now prays for you too. Not only in a good way.')]] },
  { id: 'torte', from: 'Herr Gerber', text: tx('Bäcker Gerber hat eine Torte in Form deines Parteilogos gebacken und stellt sie ins Schaufenster.', 'Baker Gerber has baked a cake in the shape of your party logo and put it in the shop window.'),
    choices: [[tx('Stolz posieren für ein Foto', 'Pose proudly for a photo'), { mod: { _own: 0.02 }, trust: { gewerbe: 2 }, suspicion: 1 }, tx('Das Foto ist im Anzeiger. Die anderen Parteien wittern Vetternwirtschaft.', 'The photo is in the paper. The other parties smell favouritism.')],
      [tx('Höflich ablehnen', 'Politely decline'), { trust: { gewerbe: 1 } }, tx('Gerber isst die Torte selbst. Er ist nicht beleidigt. Eher satt.', 'Gerber eats the cake himself. He isn’t offended. More full.')]] },
  { id: 'feuerwehr', from: 'Feuerwehr Wolkenwil', text: tx('Die Feuerwehr hat Hauptübung und bittet das Amt um einen kleinen Regen, damit der neue Schlauch nicht umsonst gekauft wurde.', 'The fire brigade has its main drill and asks the office for a little rain, so the new hose wasn’t bought for nothing.'),
    choices: [[tx('Regen zusagen', 'Agree to rain'), { trust: { vereine: 3, gewerbe: -1 } }, tx('Die Übung wird nass und fröhlich. Der Gewerbeverein nicht.', 'The drill gets wet and cheerful. The trade association doesn’t.')],
      [tx('Lieber nicht', 'Rather not'), { trust: { vereine: -1 } }, tx('Die Feuerwehr spritzt sich gegenseitig nass. Geht auch.', 'The fire brigade sprays each other instead. That works too.')]] },
  { id: 'bienen', from: 'Gemeindepräsident Huber', text: tx('Ein Bienenschwarm hat sich an der Villa Huber niedergelassen. Huber behauptet, das Wolkenamt habe ihn «mit einer Pollenwolke» hingeschickt.', 'A swarm of bees has settled on Villa Huber. Huber claims the Cloud Office sent it “with a pollen cloud”.'),
    choices: [[tx('Sachlich dementieren', 'Deny it calmly'), { mod: { huber: 0.01 } }, tx('Niemand interessiert sich für Dementis. Huber jammert weiter.', 'Nobody cares about denials. Huber keeps whining.')],
      [tx('Im Anzeiger einen Witz darüber machen', 'Make a joke about it in the paper'), { mod: { huber: -0.04 }, suspicion: 1 }, tx('«Selbst die Bienen wollen zu Huber. Sie suchen den Honig.» Das Dorf lacht.', '“Even the bees go to Huber. They’re looking for the honey.” The village laughs.')]] },
  { id: 'seilbahn', from: 'Tourismusbüro', text: tx('Die Seilbahn steckt fest, mit 14 Ausflüglern drin. Sie hängen seit einer Stunde über dem Tal.', 'The cable car is stuck with 14 day-trippers inside. They have been hanging over the valley for an hour.'),
    choices: [[tx('Gipfeli per Seil hinaufschicken (CHF 100)', 'Send croissants up on a rope (CHF 100)'), { cash: -100, trust: { gewerbe: 3 } }, tx('Die Ausflügler schreiben begeisterte Bewertungen. Über die Gipfeli.', 'The day-trippers write rave reviews. About the croissants.'), Q => Q.cash >= 100],
      [tx('Eine Sonnenwolke darüberschieben', 'Push a sunny cloud over them'), { trust: { gewerbe: 1 }, suspicion: 1 }, tx('Warm haben sie es jetzt. Bewegen tut sich trotzdem nichts.', 'Now they’re warm. Still nothing moves.')]] },
  { id: 'kolumne', from: 'Wolkenwiler Anzeiger', text: tx('Imboden will eine wöchentliche Kolumne auf Wolkwilisch drucken, «weil es eh niemand versteht, wie die Politik». Sie fragt, ob das Amt mitschreibt.', 'Imboden wants to print a weekly column in Wolkwilish, “because nobody understands it anyway, like politics”. She asks whether the office will contribute.'),
    choices: [[tx('Mitschreiben', 'Contribute'), { trust: { junge: 1 }, influence: 1 }, tx('Deine erste Kolumne heisst «Grüüzimpf, Hubärli». Sie wird ausgeschnitten und an Kühlschränke geklebt.', 'Your first column is called “Grüüzimpf, Hubärli”. People cut it out and stick it on fridges.')],
      [tx('Keine Zeit', 'No time'), {}, tx('Imboden schreibt sie allein. Sie ist besser darin als erwartet.', 'Imboden writes it alone. She is better at it than expected.')]] },
];
export function villageEvent(P, rnd = Math.random) {
  P.flags = P.flags || {}; const seen = P.flags.veSeen || (P.flags.veSeen = []);
  if (rnd() > 0.45) return null;
  const left = VE.filter(e => !seen.includes(e.id)); if (!left.length) return null;
  const e = left[Math.floor(rnd() * left.length)]; seen.push(e.id);
  return { from: e.from, text: e.text, choices: e.choices };
}
