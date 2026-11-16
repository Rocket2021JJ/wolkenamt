// Inhalte von WOLKENAMT: Anträge, Sonderanträge, Wochenplan, Dorfgespräch.
// Texte als [deutsch, english]. Personennamen bleiben in beiden Sprachen gleich.
import { PAL } from './palette.js';

// ---------------- Formen (Zeichenhilfen für die Schablonen) ----------------
export const P = (c, p) => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fill(); };
export const Ci = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
export const E = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
export const R = (c, x, y, w, h) => c.fillRect(x, y, w, h);
export const OUT = (c, f) => { c.globalCompositeOperation = 'destination-out'; f(); c.globalCompositeOperation = 'source-over'; };
export const RING = (c, x, y, rx, ry, irx, iry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.moveTo(x + irx, y); c.ellipse(x, y, irx, iry, 0, 0, Math.PI * 2, true); c.fill(); };

// Absender: Institutionen werden übersetzt, Personen nicht
export const NAMES = {
  'Bäckerei Moser': ['Bäckerei Moser', 'Bäckerei Moser'],
  'Gemeinderat Wolkenwil': ['Gemeinderat Wolkenwil', 'Wolkenwil Municipal Council'],
  'Absender anonym': ['Absender anonym', 'Anonymous sender'],
  'Familie Brunner': ['Familie Brunner', 'The Brunner family'],
  'FC Wolkenwil': ['FC Wolkenwil', 'FC Wolkenwil'],
  'Pfarrei St. Niklaus': ['Pfarrei St. Niklaus', 'St. Niklaus Parish'],
  'Tourismusbüro': ['Tourismusbüro', 'Tourist Office'],
  'Kevin, 14': ['Kevin, 14', 'Kevin, 14'],
  'Seniorenresidenz Abendrot': ['Seniorenresidenz Abendrot', 'Abendrot Retirement Home'],
  'Tierhilfe Wolkenwil': ['Tierhilfe Wolkenwil', 'Wolkenwil Animal Rescue'],
  'Absender unbekannt': ['Absender unbekannt', 'Sender unknown'],
  'Gemeindepräsident Huber': ['Gemeindepräsident Huber', 'Mayor Huber'],
  'Herr Gerber': ['Herr Gerber', 'Mr Gerber'],
  'Dorfpolizei Wolkenwil': ['Dorfpolizei Wolkenwil', 'Wolkenwil Village Police'],
  'Lukas Brunner': ['Lukas Brunner', 'Lukas Brunner'],
  'Pfarrer Imhof': ['Pfarrer Imhof', 'Father Imhof'],
  'Kevin': ['Kevin', 'Kevin'],
  'Schulleitung': ['Schulleitung', 'Head Teacher'],
  'Grosi Elsbeth': ['Grosi Elsbeth', 'Granny Elsbeth'],
  '@user83920': ['@user83920', '@user83920'],
  'Ruedi Keller': ['Ruedi Keller', 'Ruedi Keller'],
  'Bauer Zbinden': ['Bauer Zbinden', 'Farmer Zbinden'],
  'Partei für klaren Himmel': ['Partei für klaren Himmel', 'Clear Sky Party'],
  'Klasse 3b, Schulhaus Matte': ['Klasse 3b, Schulhaus Matte', 'Class 3b, Matte School'],
  'Absender unbekannt (dicker Umschlag)': ['Absender unbekannt (dicker Umschlag)', 'Sender unknown (thick envelope)'],
  'Sie selbst': ['Sie selbst', 'You'],
  'Frau Huber (nicht verwandt)': ['Frau Huber (nicht verwandt)', 'Mrs Huber (not related)'],
  'Wolkenwil Sichtungen': ['Wolkenwil Sichtungen', 'Wolkenwil Sightings'],
};

// ---------------- Anträge ----------------
// c: [Autor|null, [de, en]]
export const ORDERS = [
 { from: 'Bäckerei Moser', nom: ['ein Gipfeli', 'a croissant'], tod: 'morning', mods: { outline: 1 },
   text: ['«Wir eröffnen am Samstag neu. Bitte ein Gipfeli über dem Dorfplatz. Gerne buttrig.»', '“We reopen on Saturday. One croissant over the village square, please. Buttery if possible.”'],
   draw: c => { E(c, 100, 98, 88, 60); OUT(c, () => E(c, 100, 132, 66, 52)); },
   head: [['Rätselhafte Formation über dem Dorfplatz – Bäckerei dementiert', 'Mysterious formation over village square – bakery denies everything'], ['Gipfeli am Himmel? Wolkenwil uneinig', 'Croissant in the sky? Wolkenwil divided'], ['Himmlisches Gipfeli: Schlange vor Bäckerei Moser bis zur Post', 'Heavenly croissant: queue outside Bäckerei Moser reaches the post office']],
   sub: [['Augenzeugen sprechen von «etwas Krummem». Die Bäckerei Moser will mit dem Vorfall nichts zu tun haben.', 'Witnesses describe “something bent”. Bäckerei Moser wants nothing to do with the incident.'], ['Die Mehrheit der Befragten erkannte Backwaren, eine Minderheit einen Bumerang.', 'Most respondents recognised baked goods. A minority saw a boomerang.'], ['Um 7:40 Uhr waren sämtliche Gipfeli ausverkauft. Die Bäckerei spricht von einem «Wunder mit Butter».', 'By 7:40 every croissant was sold out. The bakery speaks of “a miracle with butter”.']],
   c: [[['Bäckerei Moser', ['Wir haben das NICHT bestellt. (Doch.)', 'We did NOT order this. (We did.)']], [null, ['Bäckerei Moser hat soeben Konkurs angemeldet. Zusammenhang unklar.', 'Bäckerei Moser just filed for bankruptcy. Connection unclear.']]],
       [[null, ['Gipfeli oder Bumerang? Ich sag Bumerang.', 'Croissant or boomerang? I say boomerang.']], ['Bäckerei Moser', ['Danke für nichts. Und trotzdem danke.', 'Thanks for nothing. And thanks anyway.']]],
       [['Bäckerei Moser', ['AUSVERKAUFT. Danke, Himmel. 🥐', 'SOLD OUT. Thank you, sky. 🥐']], [null, ['Ich hab jetzt Hunger und es ist die Schuld einer Wolke.', 'I am now hungry and it is a cloud’s fault.']]]] },
 { from: 'Gemeinderat Wolkenwil', nom: ['ein Herz', 'a heart'], tod: 'morning', mods: { outline: 1 },
   text: ['«Für die Kampagne ‹Wolkenwil hat ein Herz›. Budget: CHF 0.–. Wir danken für Ihr Verständnis.»', '“For the campaign ‘Wolkenwil has a heart’. Budget: CHF 0.00. Thank you for your understanding.”'],
   draw: c => { c.beginPath(); c.moveTo(100, 142); c.bezierCurveTo(20, 92, 6, 40, 52, 22); c.bezierCurveTo(78, 12, 95, 30, 100, 48); c.bezierCurveTo(105, 30, 122, 12, 148, 22); c.bezierCurveTo(194, 40, 180, 92, 100, 142); c.fill(); },
   head: [['Gemeinde-Kampagne endet im Nebel', 'Council campaign ends in fog'], ['«Wolkenwil hat ein Herz» – mehr oder weniger', '“Wolkenwil has a heart” – more or less'], ['Ein Herz über Wolkenwil: Gemeinderat sprachlos', 'A heart over Wolkenwil: council speechless']],
   sub: [['Das Objekt erinnerte laut Umfrage an «eine Kartoffel mit Problemen».', 'According to a poll, the object resembled “a potato with issues”.'], ['Für eine Kampagne ohne Budget ein respektables Ergebnis, findet der Gemeinderat.', 'A respectable result for a campaign with no budget, the council finds.'], ['Drei spontane Heiratsanträge auf dem Dorfplatz. Zwei davon angenommen.', 'Three spontaneous marriage proposals on the village square. Two accepted.']],
   c: [[['Gemeinderat Wolkenwil', ['Wir prüfen rechtliche Schritte gegen den Himmel.', 'We are considering legal action against the sky.']], [null, ['Ist das eine Kartoffel? Eine Niere?', 'Is that a potato? A kidney?']]],
       [[null, ['Herz-ish. Wie meine letzte Beziehung.', 'Heart-ish. Like my last relationship.']], ['Gemeinderat Wolkenwil', ['Ziel erreicht. Budget eingehalten.', 'Target reached. Budget respected.']]],
       [[null, ['Hab meiner Freundin gesagt, das sei für sie. Sie glaubt es. 🙏', 'Told my girlfriend it was for her. She believes it. 🙏']], ['Gemeinderat Wolkenwil', ['Dieses Herz wurde Ihnen präsentiert von Ihren Steuern.', 'This heart was brought to you by your taxes.']]]] },
 { from: 'Absender anonym', nom: ['ein Fisch', 'a fish'], tod: 'day', mods: { holes: 1 },
   text: ['«Einen Fisch. Direkt über dem Haus von Herrn Gerber, Lindenweg 4. Er weiss warum.»', '“A fish. Directly above Mr Gerber’s house, Lindenweg 4. He knows why.”'],
   draw: c => { E(c, 84, 75, 62, 38); P(c, [126, 75, 190, 30, 190, 120]); },
   head: [['Formloses Gebilde über dem Lindenweg', 'Shapeless object above Lindenweg'], ['Fisch-Sichtung am Lindenweg – Anwohner verunsichert', 'Fish sighted above Lindenweg – residents unsettled'], ['Der Fisch vom Lindenweg: Herr Gerber verlässt das Haus nicht mehr', 'The Lindenweg fish: Mr Gerber no longer leaves the house']],
   sub: [['Herr Gerber gab an, «nichts gesehen zu haben, schon gar keinen Fisch».', 'Mr Gerber stated he “saw nothing, certainly not a fish”.'], ['Die Polizei hat keine Hinweise. Herr Gerber auch nicht. Angeblich.', 'The police have no leads. Neither does Mr Gerber. Allegedly.'], ['Herr Gerber liess über seinen Anwalt ausrichten, er wisse nicht, warum. Niemand glaubt ihm.', 'Through his lawyer, Mr Gerber said he does not know why. Nobody believes him.']],
   c: [[['Herr Gerber', ['Was auch immer das sein soll: Ich war es nicht.', 'Whatever that is supposed to be: it wasn’t me.']], [null, ['Das ist ein Fisch, wenn du sehr betrunken bist.', 'That’s a fish if you’re very drunk.']]],
       [['Dorfpolizei Wolkenwil', ['Wir bitten von Spekulationen über Herrn Gerber abzusehen.', 'Please refrain from speculating about Mr Gerber.']], [null, ['Gerber weiss genau warum. 👀', 'Gerber knows exactly why. 👀']]],
       [['Herr Gerber', ['…', '…']], [null, ['Gerber, was hast du getan?? Der Himmel weiss es!!', 'Gerber, what did you do?? The sky knows!!']]]] },
 { from: 'Familie Brunner', nom: ['zwei Ringe', 'two rings'], tod: 'day', mods: { holes: 1 },
   text: ['«Unser Sohn macht heute am See einen Antrag. Bitte zwei Ringe. Bitte NICHT zu früh formen, sie darf nichts merken.»', '“Our son is proposing at the lake today. Two rings, please. Do NOT form them too early, she mustn’t notice.”'],
   draw: c => { RING(c, 70, 75, 50, 50, 29, 29); RING(c, 130, 75, 50, 50, 29, 29); },
   head: [['Heiratsantrag am See: Himmel sendet gemischte Signale', 'Proposal at the lake: sky sends mixed signals'], ['Zwei Ringe über dem See – sie sagte «vielleicht»', 'Two rings above the lake – she said “maybe”'], ['JA! Wolkenwil feiert Verlobung unter Wolkenringen', 'YES! Wolkenwil celebrates engagement under cloud rings']],
   sub: [['Die Braut in spe fragte, ob das «eine Brille» sein solle. Die Gespräche dauern an.', 'The bride-to-be asked whether it was meant to be “a pair of glasses”. Talks are ongoing.'], ['Das Paar nimmt sich laut eigener Aussage «noch etwas Bedenkzeit».', 'The couple says they are taking “a little more time to think”.'], ['Die Hochzeit soll im Frühling stattfinden. Das Amt ist eingeladen.', 'The wedding is planned for spring. The office is invited.']],
   c: [[['Lukas Brunner', ['Sie hat gefragt, warum der Himmel eine Brille trägt. Danke.', 'She asked why the sky is wearing glasses. Thanks.']], [null, ['Brillenwerbung? Ist das ein Optiker?', 'Is this an advert for an optician?']]],
       [['Lukas Brunner', ['Sie hat «vielleicht» gesagt. Ich nehme das.', 'She said “maybe”. I’ll take it.']], [null, ['Zwei Ringe oder eine Acht. Ich bin neutral.', 'Two rings or an eight. I remain neutral.']]],
       [['Lukas Brunner', ['SIE HAT JA GESAGT 💍💍', 'SHE SAID YES 💍💍']], [null, ['Ich weine im Dorfladen. Wegen einer Wolke.', 'I am crying in the supermarket. Because of a cloud.']]]] },
 { from: 'FC Wolkenwil', nom: ['ein Pokal', 'a trophy'], tod: 'day', mods: { regrow: 1 },
   text: ['«Wir sind seit 1987 Tabellenletzter. Zeigen Sie uns bitte einmal einen Pokal. Nur zum Anschauen.»', '“We have been bottom of the league since 1987. Please show us a trophy once. Just to look at.”'],
   draw: c => { c.beginPath(); c.moveTo(46, 14); c.lineTo(154, 14); c.quadraticCurveTo(152, 86, 100, 92); c.quadraticCurveTo(48, 86, 46, 14); c.fill(); RING(c, 46, 40, 26, 16, 14, 7); RING(c, 154, 40, 26, 16, 14, 7); R(c, 89, 88, 22, 28); R(c, 60, 114, 80, 22); },
   head: [['FC Wolkenwil: Auch am Himmel kein Pokal', 'FC Wolkenwil: no trophy in the sky either'], ['Fast ein Pokal – wie immer beim FC', 'Almost a trophy – as always at FC'], ['Erster Pokal seit 1987! (Aus Dampf)', 'First trophy since 1987! (Made of vapour)']],
   sub: [['Der Trainer sprach von «einem typischen Wolkenwiler Ergebnis».', 'The coach called it “a typical Wolkenwil result”.'], ['Die Mannschaft betrachtete die Formation 40 Minuten lang. Das Training fiel aus.', 'The team looked at the formation for 40 minutes. Training was cancelled.'], ['Der Captain liess das Gebilde von der Mittellinie aus fotografieren und rahmte es ein.', 'The captain had it photographed from the halfway line and framed the picture.']],
   c: [[['FC Wolkenwil', ['Passt zu unserer Saison.', 'Fits our season.']], [null, ['Sogar der Himmel verliert für den FC.', 'Even the sky loses for FC.']]],
       [['FC Wolkenwil', ['Wir zählen das als Titel.', 'We are counting this as a title.']], [null, ['Ein Pokal, wenn man an den FC glaubt. Also nein.', 'A trophy, if you believe in FC. So no.']]],
       [['FC Wolkenwil', ['DAS IST UNSER POKAL. Niemand nimmt ihn uns weg.', 'THIS IS OUR TROPHY. Nobody takes it from us.']], [null, ['Meisterschaft 2026: Wolkenwil (am Himmel)', 'Champions 2026: Wolkenwil (in the sky)']]]] },
 { from: 'Pfarrei St. Niklaus', nom: ['eine Glocke', 'a bell'], tod: 'day', mods: { regrow: 1, holes: 1 },
   text: ['«Der Kirchturm ist in Renovation. Bitte eine Glocke am Himmel, damit die Leute wissen, dass Sonntag ist.»', '“The church tower is being renovated. Please put a bell in the sky so people know it is Sunday.”'],
   draw: c => { c.beginPath(); c.moveTo(36, 124); c.quadraticCurveTo(62, 110, 62, 62); c.quadraticCurveTo(62, 18, 100, 18); c.quadraticCurveTo(138, 18, 138, 62); c.quadraticCurveTo(138, 110, 164, 124); c.closePath(); c.fill(); Ci(c, 100, 134, 13); R(c, 91, 4, 18, 18); },
   head: [['Pfarrei bittet um Glocke, erhält Rätsel', 'Parish asks for a bell, receives a riddle'], ['Glocke über St. Niklaus – Gottesdienst gut besucht', 'Bell above St. Niklaus – service well attended'], ['Himmlisches Geläut: Kirche erstmals seit 1994 voll', 'Heavenly chimes: church full for the first time since 1994']],
   sub: [['Der Pfarrer nahm es gelassen: «Die Wege des Herrn sind unergründlich. Diese Wolke auch.»', 'The priest took it calmly: “The Lord works in mysterious ways. So does this cloud.”'], ['Mehrere Kirchgänger gaben an, die Glocke «fast gehört» zu haben.', 'Several churchgoers claimed they “almost heard” the bell.'], ['Selbst der Gemeindepräsident wurde gesichtet. Er bestreitet es.', 'Even the mayor was spotted. He denies it.']],
   c: [[['Pfarrer Imhof', ['Wir beten für die Wolke.', 'We are praying for the cloud.']], [null, ['Ist heute Sonntag? Keine Ahnung mehr.', 'Is it Sunday? No idea any more.']]],
       [['Pfarrer Imhof', ['Danke. Halbwegs erhört.', 'Thank you. Half answered.']], [null, ['Glocke oder Lampenschirm, aber ich bin hingegangen.', 'Bell or lampshade, but I went.']]],
       [['Pfarrer Imhof', ['Volles Haus. Amen und danke ans Amt.', 'Full house. Amen and thanks to the office.']], [null, ['Ich bin nicht mal gläubig, aber das hat was.', 'I’m not even religious, but this has something.']]]] },
 { from: 'Tourismusbüro', nom: ['ein Berg', 'a mountain'], tod: 'sunset', mods: { gusts: 1 },
   text: ['«Bitte einen markanten Berg für das Abendpanorama. Aber nicht DEN Berg. Aus markenrechtlichen Gründen.»', '“Please a striking mountain for the evening view. But not THE mountain. For trademark reasons.”'],
   draw: c => P(c, [8, 142, 62, 66, 84, 80, 122, 8, 146, 52, 162, 40, 194, 142]),
   head: [['Tourismusbüro: «Das war kein Berg»', 'Tourist office: “That was not a mountain”'], ['Ein Berg, aber nicht DER Berg – Juristen erleichtert', 'A mountain, but not THE mountain – lawyers relieved'], ['Neuer Hausberg am Abendhimmel – Hotels ausgebucht', 'New local peak in the evening sky – hotels fully booked']],
   sub: [['Touristen aus Übersee fotografierten trotzdem. «It\'s so Swiss», sagte einer.', 'Tourists from overseas took photos anyway. “It’s so Swiss,” said one.'], ['Die Rechtsabteilung bestätigt: keine Ähnlichkeit mit bekannten Gipfeln.', 'The legal department confirms: no resemblance to known peaks.'], ['Das Tourismusbüro prüft, ob man auf einen Wolkenberg Bergbahnen bauen kann.', 'The tourist office is looking into building a cable car up a cloud mountain.']],
   c: [[['Tourismusbüro', ['Wir distanzieren uns.', 'We distance ourselves.']], [null, ['Sieht aus wie mein Rücken nach dem Zügeln.', 'Looks like my back after moving house.']]],
       [['Tourismusbüro', ['Kein Markenrecht verletzt. Erfolg.', 'No trademark infringed. Success.']], [null, ['Berg! Glaub ich. Oder ein Zelt.', 'Mountain! I think. Or a tent.']]],
       [['Tourismusbüro', ['Buchungen +340 %. Wir lieben Sie.', 'Bookings +340 %. We love you.']], [null, ['Schöner als der echte. Sorry, Echter.', 'Prettier than the real one. Sorry, real one.']]]] },
 { from: 'Kevin, 14', nom: ['eine Rakete', 'a rocket'], tod: 'sunset', mods: { regrow: 1, gusts: 1 },
   text: ['«yo mach mal ne rakete die richtung schulhaus fliegt. danke 🚀»', '“yo make a rocket flying towards the school. thx 🚀”'],
   draw: c => { R(c, 78, 40, 44, 82); P(c, [78, 41, 100, 2, 122, 41]); P(c, [79, 84, 46, 132, 79, 122]); P(c, [121, 84, 154, 132, 121, 122]); OUT(c, () => Ci(c, 100, 66, 10)); },
   head: [['Schüler bestellt Rakete, erhält Wolke', 'Pupil orders rocket, receives cloud'], ['Rakete über Schulhaus – Rektor «nicht amüsiert»', 'Rocket above school – head teacher “not amused”'], ['Rakete Richtung Schulhaus: Rektor ruft Krisensitzung ein', 'Rocket aimed at school: head teacher calls crisis meeting']],
   sub: [['Kevin (14) zeigte sich enttäuscht: «Voll random.»', 'Kevin (14) was disappointed: “So random.”'], ['Der Rektor bezeichnete die Formation als «symbolisch problematisch».', 'The head teacher called the formation “symbolically problematic”.'], ['Kevin (14) gilt seither als lokale Legende. Seine Noten bleiben unverändert.', 'Kevin (14) is now a local legend. His grades remain unchanged.']],
   c: [[['Kevin', ['bro was ist das 💀', 'bro what is that 💀']], [null, ['Ist das eine Gurke?', 'Is that a cucumber?']]],
       [['Kevin', ['ok lowkey fire', 'ok lowkey fire']], ['Schulleitung', ['Wir sehen das. Und wir sehen dich, Kevin.', 'We see this. And we see you, Kevin.']]],
       [['Kevin', ['IM HIMMEL DIGGA 🚀🚀🚀 legende', 'IN THE SKY BRO 🚀🚀🚀 legend']], ['Schulleitung', ['Kevin, bitte ins Büro.', 'Kevin, to the office please.']]]] },
 { from: 'Seniorenresidenz Abendrot', nom: ['eine Kaffeetasse', 'a coffee cup'], tod: 'sunset', mods: { holes: 1, regrow: 1 },
   text: ['«Unsere Bewohner möchten wissen, wann Kaffeezeit ist. Eine Tasse, bitte. Gross. Die Brillen sind nicht mehr die besten.»', '“Our residents would like to know when it is coffee time. A cup, please. Large. The glasses are not what they used to be.”'],
   draw: c => { c.beginPath(); c.moveTo(34, 38); c.lineTo(136, 38); c.lineTo(129, 100); c.quadraticCurveTo(122, 126, 85, 126); c.quadraticCurveTo(48, 126, 41, 100); c.closePath(); c.fill(); RING(c, 138, 74, 26, 22, 13, 10); E(c, 88, 133, 82, 11); },
   head: [['Kaffeezeit verpasst – Unmut in der Residenz Abendrot', 'Coffee time missed – discontent at Abendrot'], ['Tasse am Himmel: Kaffeezeit um 15:00 bestätigt', 'Cup in the sky: coffee time at 3 pm confirmed'], ['Kaffee-Wolke begeistert Residenz Abendrot', 'Coffee cloud delights Abendrot residents']],
   sub: [['Frau Bühler (91) hielt die Formation für «ein Zeichen». Wofür, blieb offen.', 'Mrs Bühler (91) considered the formation “a sign”. Of what, she did not say.'], ['Die Bewohner tranken pünktlich. Zwei holten sich Nachschlag.', 'The residents drank on time. Two had seconds.'], ['Frau Bühler (91): «In meinem Alter sieht man nicht mehr viel. Das habe ich gesehen.»', 'Mrs Bühler (91): “At my age you don’t see much any more. This I saw.”']],
   c: [[['Grosi Elsbeth', ['Ich sehe gar nichts. Ist das ein Hut?', 'I can’t see a thing. Is that a hat?']], [null, ['Kaffeezeit ist jetzt einfach, wann man will.', 'Coffee time is now whenever you like.']]],
       [['Grosi Elsbeth', ['Eine Tasse! Oder ein Topf. Jedenfalls Kaffee.', 'A cup! Or a pot. Coffee, anyway.']], [null, ['Gemütlich. Ich mach mir jetzt auch einen.', 'Cosy. I’m making one too now.']]],
       [['Grosi Elsbeth', ['Das ist das Schönste seit dem Mondflug.', 'Loveliest thing since the moon landing.']], [null, ['Ich bin 23 und hab trotzdem um 15:00 Kaffee getrunken.', 'I’m 23 and still had coffee at 3 pm.']]]] },
 { from: 'Tierhilfe Wolkenwil', nom: ['eine Katze', 'a cat'], tod: 'night', mods: { holes: 1, regrow: 1 },
   text: ['«Minka wird seit Dienstag vermisst. Vielleicht sieht sie das und kommt heim.»', '“Minka has been missing since Tuesday. Maybe she sees this and comes home.”'],
   draw: c => { Ci(c, 100, 92, 54); P(c, [50, 74, 52, 8, 96, 46]); P(c, [150, 74, 148, 8, 104, 46]); },
   head: [['Suche nach Minka geht weiter', 'Search for Minka continues'], ['Katzenwolke über Wolkenwil – Minka weiterhin vermisst', 'Cat cloud over Wolkenwil – Minka still missing'], ['Minka ist zurück! Katze kehrt nach Wolken-Sichtung heim', 'Minka is back! Cat returns home after cloud sighting']],
   sub: [['Die Tierhilfe bittet weiterhin um Hinweise. Die Wolke war keiner.', 'The animal rescue still asks for tips. The cloud was not one.'], ['Mehrere Katzen im Dorf starrten lange in den Himmel. Minka nicht.', 'Several cats in the village stared at the sky for a long time. Minka did not.'], ['Laut Besitzerin sass Minka um 22:14 Uhr vor der Tür, «als wäre nichts gewesen».', 'According to her owner, Minka was sitting at the door at 22:14 “as if nothing had happened”.']],
   c: [[['Tierhilfe Wolkenwil', ['Danke für den Versuch. Wir suchen weiter.', 'Thanks for trying. We keep looking.']], [null, ['Ich hoffe, Minka erkennt das nicht als Katze. Wäre beleidigend.', 'I hope Minka doesn’t recognise that as a cat. Would be insulting.']]],
       [['Tierhilfe Wolkenwil', ['Unsere Katze hat 10 Minuten nach oben gestarrt.', 'Our cat stared upwards for 10 minutes.']], [null, ['Komm heim, Minka 🐈', 'Come home, Minka 🐈']]],
       [['Tierhilfe Wolkenwil', ['MINKA IST DA. Wir sind fertig. 😭', 'MINKA IS BACK. We are wrecked. 😭']], [null, ['Ich kannte Minka nicht und heule trotzdem.', 'Never met Minka and I’m crying anyway.']]]] },
 { from: 'Absender unbekannt', nom: ['ein Pfeil nach oben', 'an arrow pointing up'], tod: 'night', mods: { gusts: 1, regrow: 1 },
   text: ['«Ein Pfeil. Nach oben. Heute Nacht, 23:00 Uhr. Stellen Sie keine Fragen.»', '“An arrow. Pointing up. Tonight, 23:00. Ask no questions.”'],
   draw: c => P(c, [100, 4, 168, 70, 126, 70, 126, 146, 74, 146, 74, 70, 32, 70]),
   head: [['Mysteriöser Auftrag: Nichts zu sehen', 'Mysterious order: nothing to see'], ['Pfeil am Nachthimmel – Verschwörungstheorien blühen', 'Arrow in the night sky – conspiracy theories bloom'], ['Der Pfeil von Wolkenwil: Was geschah um 23:00 Uhr?', 'The Wolkenwil arrow: what happened at 23:00?']],
   sub: [['Wer den Antrag stellte, bleibt unklar. Ebenso, was am Himmel war.', 'Who submitted the request remains unclear. As does what was in the sky.'], ['Eine Online-Gruppe vermutet Ausserirdische, eine andere die Telefongesellschaft.', 'One online group suspects aliens, another the phone company.'], ['Ein Lichtpunkt soll kurz nach 23:00 Uhr dem Pfeil gefolgt sein. Das Amt äussert sich nicht.', 'A point of light is said to have followed the arrow just after 23:00. The office declines to comment.']],
   c: [[['@user83920', ['…nein.', '…no.']], [null, ['Was auch immer das war, es zeigte nirgendwohin.', 'Whatever that was, it pointed nowhere.']]],
       [['@user83920', ['Ausreichend.', 'Adequate.']], [null, ['Wer bestellt sowas?? Und warum??', 'Who orders something like that?? And why??']]],
       [['@user83920', ['Sie sind gekommen. Danke.', 'They came. Thank you.']], [null, ['Hat noch jemand das Licht gesehen?? HALLO???', 'Did anyone else see the light?? HELLO???']]]] },
 { from: 'Gemeindepräsident Huber', nom: ['eine Burg', 'a castle'], tod: 'night', mods: { holes: 1, regrow: 1, gusts: 1 },
   text: ['«Wahlkampf. Ich brauche etwas Mächtiges, Beständiges. Eine Burg. Und bitte vor Sonntag.»', '“Election campaign. I need something mighty, lasting. A castle. And please before Sunday.”'],
   draw: c => { R(c, 40, 72, 120, 70); R(c, 22, 36, 44, 106); R(c, 134, 36, 44, 106); for (const x of [22, 39, 56, 134, 151, 168]) R(c, x, 22, 10, 16); for (const x of [74, 95, 116]) R(c, x, 58, 12, 16); OUT(c, () => { R(c, 86, 112, 28, 32); Ci(c, 100, 112, 14); }); },
   head: [['Hubers Wahlkampf zerfällt – auch am Himmel', 'Huber’s campaign falls apart – in the sky too'], ['Burg über Wolkenwil: Huber mit «solidem» Auftritt', 'Castle over Wolkenwil: Huber with a “solid” performance'], ['Wolkenburg! Huber gewinnt Wahl mit Erdrutschsieg', 'Cloud castle! Huber wins election by a landslide']],
   sub: [['Die Opposition sprach von einem «Sinnbild dieser Amtszeit».', 'The opposition called it “a symbol of this term in office”.'], ['Huber nannte die Burg «ein Versprechen». Wofür, sagte er nicht.', 'Huber called the castle “a promise”. Of what, he did not say.'], ['Huber dankte in seiner Siegesrede «einem gewissen Amt». Das Amt fordert eine Lohnerhöhung.', 'In his victory speech Huber thanked “a certain office”. The office demands a pay rise.']],
   c: [[['Gemeindepräsident Huber', ['Das ist Fake News.', 'That is fake news.']], [null, ['Passt zu Hubers Wahlprogramm: formlos.', 'Matches Huber’s manifesto: shapeless.']]],
       [['Gemeindepräsident Huber', ['Stark. Wie ich.', 'Strong. Like me.']], [null, ['Burg? Eher eine Garage mit Ambitionen.', 'Castle? More like a garage with ambitions.']]],
       [['Gemeindepräsident Huber', ['DANKE WOLKENWIL. Die Burg bleibt. (Die Wolke nicht.)', 'THANK YOU WOLKENWIL. The castle stays. (The cloud doesn’t.)']], [null, ['Ich hab Huber gewählt, wegen einer Wolke. Bereue nichts.', 'Voted Huber because of a cloud. No regrets.']]]] },
];

// Folgen einer Ablehnung (pro Antrag)
export const NO = [
  ['Bäckerei Moser', ['Abgelehnt?! Dann gibt\'s fürs Amt halt keine Gipfeli mehr.', 'Rejected?! Then no more croissants for the office.']],
  ['Gemeinderat Wolkenwil', ['Der Gemeinderat lehnt nun seinerseits Ihr Budget ab.', 'The council now rejects your budget in return.']],
  ['Herr Gerber', ['Danke. Ich weiss nicht wofür, aber danke.', 'Thank you. I don’t know what for, but thank you.']],
  ['Lukas Brunner', ['Hab den Antrag ohne Wolke gemacht. Sie sagte trotzdem ja. Peinlich fürs Amt.', 'Proposed without a cloud. She said yes anyway. Embarrassing for the office.']],
  ['FC Wolkenwil', ['Wieder kein Pokal. Wir sind es gewohnt.', 'No trophy again. We are used to it.']],
  ['Pfarrer Imhof', ['Wir beten jetzt auch für das Amt.', 'We are now praying for the office as well.']],
  ['Tourismusbüro', ['Neuer Slogan: «Wolkenwil – ohne Berg, aber mit Charakter.»', 'New slogan: “Wolkenwil – no mountain, but plenty of character.”']],
  ['Kevin', ['ok boomer', 'ok boomer']],
  ['Grosi Elsbeth', ['Kaffeezeit war dann um 14:10. Totales Chaos.', 'Coffee time ended up at 2:10 pm. Total chaos.']],
  ['Tierhilfe Wolkenwil', ['Wir hatten auf Sie gezählt.', 'We were counting on you.']],
  ['@user83920', ['Um 23:00 leuchtete etwas über dem Wald. Ohne Pfeil fand es nicht hin.', 'At 23:00 something glowed above the forest. Without the arrow it never found its way.']],
  ['Gemeindepräsident Huber', ['Behördenwillkür! (Meine Umfragewerte steigen gerade.)', 'Bureaucratic tyranny! (My poll numbers are rising.)']],
];
export const NOREP = i => i === 9 ? -10 : i === 3 ? -6 : -4;

export const SPECIALS = {
  regen: { from: 'Ruedi Keller', title: ['Regen, lokal', 'Rain, local'], text: ['«Bitte Regen. Nur über dem Garten von Herrn Gerber. Er weiss warum.»', '“Rain, please. Only above Mr Gerber’s garden. He knows why.”'],
    ok: { rep: -6, sight: 900, text: ['Gerbers Garten steht unter Wasser. Gerber: «Ich weiss es immer noch nicht.»', 'Gerber’s garden is under water. Gerber: “I still don’t know.”'] },
    no: { rep: 2, text: ['Keller schreibt einen Leserbrief: «Das Amt schützt Gerber!»', 'Keller writes a letter to the editor: “The office protects Gerber!”'] } },
  duerre: { from: 'Bauer Zbinden', title: ['Regen fürs Feld', 'Rain for the field'], text: ['«Seit drei Wochen kein Tropfen. Bitte eine Regenwolke über meinen Kartoffeln. Ich lade Sie zur Rösti ein.»', '“Not a drop for three weeks. Please a rain cloud over my potatoes. I’ll invite you for rösti.”'],
    ok: { rep: 7, sight: 400, text: ['Zbindens Kartoffeln sind gerettet. Die Rösti war ausgezeichnet.', 'Zbinden’s potatoes are saved. The rösti was excellent.'] },
    no: { rep: -5, text: ['Zbinden: «Dann kaufe ich die Kartoffeln eben im Laden. Wie ein Städter.»', 'Zbinden: “Then I’ll buy potatoes at the supermarket. Like a city person.”'] } },
  abschaffung: { from: 'Partei für klaren Himmel', title: ['Abschaffung des Amts', 'Abolition of the office'], text: ['«Antrag auf sofortige Abschaffung des Wolkenamts. Wolken sollen wieder natürlich sein.»', '“Motion for the immediate abolition of the Cloud Office. Clouds should be natural again.”'],
    ok: { rep: -5, sight: 2500, text: ['Sie haben Ihre eigene Abschaffung bewilligt. Die Gemeinde ist verwirrt und lässt es bleiben.', 'You approved your own abolition. The municipality is confused and lets it be.'] },
    no: { rep: 1, text: ['Die Partei sammelt Unterschriften. Stand heute: 4.', 'The party is collecting signatures. Current count: 4.'] } },
  schule: { from: 'Klasse 3b, Schulhaus Matte', title: ['Besuch im Amt', 'Visit to the office'], text: ['«Dürfen wir morgen beim Wolkenmachen zuschauen? Wir bringen Znüni mit.»', '“May we watch the cloud-making tomorrow? We’ll bring snacks.”'],
    ok: { rep: 10, sight: 600, text: ['Die 3b war begeistert. Ein Kind will jetzt Wolkenbeamtin werden.', 'Class 3b loved it. One child now wants to become a cloud official.'] },
    no: { rep: -6, text: ['Die 3b hat eine sehr traurige Zeichnung geschickt.', 'Class 3b sent a very sad drawing.'] } },
  umschlag: { from: 'Absender unbekannt (dicker Umschlag)', title: ['«Spende»', '“Donation”'], text: ['«Für die Burg von Huber, bitte extra mächtig. Anbei CHF 5\'000. Für Ihre Kaffeekasse.»', '“For Huber’s castle, extra mighty please. Enclosed: CHF 5,000. For your coffee fund.”'],
    ok: { rep: -22, sight: 4000, text: ['Bestechungsskandal im Wolkenamt! Huber: «Ich kenne dieses Amt nicht.»', 'Bribery scandal at the Cloud Office! Huber: “I don’t know this office.”'] },
    no: { rep: 8, text: ['Sie melden den Umschlag. «Ehrlichkeit ist selten geworden», schreibt der Anzeiger.', 'You report the envelope. “Honesty has become rare,” writes the Anzeiger.'] } },
};

export const DAYS = [
  { name: ['Montag', 'Monday'], cards: [0, 1], slots: 2 },
  { name: ['Dienstag', 'Tuesday'], cards: [2, 'regen', 3], slots: 2 },
  { name: ['Mittwoch', 'Wednesday'], cards: ['duerre', 4, 5], slots: 2 },
  { name: ['Donnerstag', 'Thursday'], cards: [6, 'abschaffung', 7], slots: 2 },
  { name: ['Freitag', 'Friday'], cards: [8, 'schule', 9], slots: 2 },
  { name: ['Samstag', 'Saturday'], cards: [10, 11, 'umschlag'], slots: 2 },
];

export const FREE = { from: 'Sie selbst', nom: ['???', '???'], tod: 'sunset', mods: { free: 1 }, text: ['«Feierabend. Formen Sie, was Sie wollen. Wolkenwil schaut zu.»', '“End of the working day. Shape whatever you like. Wolkenwil is watching.”'] };

export const AUTHORS = [['Ruth Gerber', '@ruthgerber'], ['Marco Bianchi', '@marco.b'], ['Wolkenwil Sichtungen', '@wolkenwil_sky'], ['Lea', '@lea.kpunkt'], ['Hansruedi Meier', '@hrmeier52'], ['Nina', '@nina_fotografiert'], ['Tobias K.', '@tobi_k'], ['Sandro', '@sandro.ww'], ['Mira', '@mira_im_dorf'], ['Jonas', '@j0nas'], ['Frau Huber (nicht verwandt)', '@nichtverwandt'], ['Dorfpolizei Wolkenwil', '@polizei_ww']];
export const HANDLES = { 'Bäckerei Moser': '@baeckerei_moser', 'Gemeinderat Wolkenwil': '@gemeinde_ww', 'Herr Gerber': '@gerber_lindenweg', 'Dorfpolizei Wolkenwil': '@polizei_ww', 'Lukas Brunner': '@lukas.brunner', 'FC Wolkenwil': '@fcwolkenwil1923', 'Pfarrer Imhof': '@pfarrei_stniklaus', 'Tourismusbüro': '@visit_wolkenwil', 'Kevin': '@kev.14', 'Schulleitung': '@schule_ww', 'Grosi Elsbeth': '@elsbeth.1941', 'Tierhilfe Wolkenwil': '@tierhilfe_ww', '@user83920': '', 'Gemeindepräsident Huber': '@huber_praesident' };
export const GENERIC = [
  [['Was zur Hölle ist das?', 'What on earth is that?'], ['Ich glaube, die Wolke hat Probleme.', 'I think the cloud is going through something.'], ['Sieht aus wie mein Kontostand: formlos.', 'Looks like my bank balance: shapeless.'], ['Hab die Gemeinde angerufen. Die wissen auch nichts.', 'Called the council. They don’t know either.'], ['Ist das Kunst oder kann das weg?', 'Is this art or can it go?'], ['Mein Hund hat es angebellt. Zu Recht.', 'My dog barked at it. Rightly so.']],
  [['Erkennbar. Knapp.', 'Recognisable. Just.'], ['Man sieht\'s, wenn man die Augen zusammenkneift.', 'You can see it if you squint.'], ['Grosi hat\'s sofort erkannt, ich nicht.', 'Granny got it straight away. I didn’t.'], ['Solide Arbeit für das Steuergeld.', 'Solid work for the tax money.'], ['Nicht schlecht für Wasserdampf.', 'Not bad for water vapour.']],
  [['Das ist kein Zufall mehr. Irgendwer macht das.', 'This is no coincidence. Someone is doing this.'], ['Hab auf der Autobahn angehalten. Hat sich gelohnt.', 'Stopped on the motorway. Worth it.'], ['Mein neuer Sperrbildschirm.', 'My new lock screen.'], ['Wer auch immer das macht: Lohnerhöhung.', 'Whoever is doing this: pay rise.'], ['Ich will in dieser Gemeinde wohnen.', 'I want to live in this village.'], ['Leute aus Zürich fahren extra her. Wir sind jetzt Tourismus.', 'People drive here from Zurich. We are tourism now.']],
];

export const FREE_POSTS = {
  gone: [['Wo ist die Wolke hin??', 'Where did the cloud go??'], ['Das Amt hat die Wolke einfach… gelöscht?', 'The office just… deleted the cloud?'], ['Minimalismus. Respekt.', 'Minimalism. Respect.']],
  joke: [['Alle sagen {a}, ich sag: mein Ex.', 'Everyone says {a}. I say: my ex.'], ['Wenn das {b} ist, bin ich der Papst.', 'If that is {b}, I am the Pope.'], ['Meine Tochter sagt Dinosaurier. Ich widerspreche nicht mehr.', 'My daughter says dinosaur. I no longer argue.'], ['Sieht aus wie die Steuererklärung 2025.', 'Looks like my 2025 tax return.']],
};

export const RANKS = [[0, ['Praktikant/in', 'Intern']], [6, ['Sachbearbeiter/in', 'Clerk']], [14, ['Wolkenrat/rätin', 'Cloud Councillor']], [24, ['Oberwolkenrat/rätin', 'Senior Cloud Councillor']], [33, ['Himmelsdirektor/in', 'Director of the Sky']]];

export const MP_TALK = [
  [['Was ist DAS?', 'What is THAT?'], ['Ich hab Fragen. Viele.', 'I have questions. Many.'], ['Der Himmel braucht Hilfe.', 'The sky needs help.']],
  [['Erkennbar. Knapp.', 'Recognisable. Just.'], ['Solide Beamtenarbeit.', 'Solid civil service.'], ['Mit gutem Willen: ja.', 'With goodwill: yes.']],
  [['Das ist Kunst.', 'This is art.'], ['Sofort befördern!', 'Promote immediately!'], ['Mein neuer Sperrbildschirm.', 'My new lock screen.']],
];
export const MP_FINAL = [['Bekommt einen eigenen Parkplatz vor dem Amt.', 'Gets a personal parking space outside the office.'], ['Darf am Freitag früher gehen.', 'May leave early on Friday.'], ['Wird in die Abteilung Nebel versetzt.', 'Is transferred to the Fog Department.']];

// ---------------- Tageszeiten (2D-Schneideansicht, nur Farben aus dem Konzept) ----------------
const C = PAL;
export const TOD = {
  morning: { sky: [C.gletscher, C.himmel, C.himmel, C.papier, C.schnee, C.lampe, C.lampe], sun: { x: 740, y: 352, r: 40, c: C.schnee, moon: false },
    cb: C.schnee, cs: C.gletscher, cl: C.schnee, far: C.gletscher, snow: C.schnee, hill1: C.matte, hill2: C.lino, ink: C.tinte, win: C.lampe, stars: 0, bg3d: C.himmel, sun3d: 1.9, amb3d: 1.15 },
  day: { sky: [C.gletscher, C.gletscher, C.himmel, C.himmel, C.himmel, C.schnee, C.schnee], sun: { x: 784, y: 108, r: 32, c: C.schnee, moon: false },
    cb: C.schnee, cs: C.gletscher, cl: C.schnee, far: C.gletscher, snow: C.schnee, hill1: C.matte, hill2: C.lino, ink: C.tinte, win: C.himmel, stars: 0, bg3d: C.himmel, sun3d: 2.1, amb3d: 1.15 },
  sunset: { sky: [C.blau, C.gletscher, C.himmel, C.ocker, C.ocker, C.lampe, C.lampe], sun: { x: 690, y: 446, r: 58, c: C.lampe, moon: false },
    cb: C.schnee, cs: C.chalet, cl: C.schnee, far: C.blau, snow: C.schnee, hill1: C.lino, hill2: C.tinte, ink: C.tinte, win: C.lampe, stars: 0.15, bg3d: C.ocker, sun3d: 1.6, amb3d: 0.95 },
  night: { sky: [C.tinte, C.tinte, C.blau, C.blau, C.blau, C.gletscher, C.gletscher], sun: { x: 770, y: 112, r: 26, c: C.schnee, moon: true },
    cb: C.papier, cs: C.tinte, cl: C.schnee, far: C.blau, snow: C.gletscher, hill1: C.tinte, hill2: C.tinte, ink: C.tinte, win: C.lampe, stars: 1, bg3d: C.blau, sun3d: 0.7, amb3d: 0.6 },
};
