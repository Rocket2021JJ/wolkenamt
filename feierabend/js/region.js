// Länder-Einstellung: Schweiz, Deutschland, Österreich.
// Ändert Begriffe, Begrüssungen, Behörden, Regeln und die Sprüche der Prüfer. In der Schweiz wird «ß» zu «ss».
const KEY = 'feierabend-land';
const guess = () => { const l = (navigator.language || '').toLowerCase(); return l.includes('ch') ? 'CH' : l.includes('at') ? 'AT' : 'DE'; };
export let LAND = (() => { try { return localStorage.getItem(KEY) || guess(); } catch (e) { return guess(); } })();
export function setLand(l) { try { localStorage.setItem(KEY, l); } catch (e) {} LAND = l; }
export const LANDS = { CH: 'Schweiz', DE: 'Deutschland', AT: 'Österreich' };
// Deutschland hat zwei Dialekte zur Wahl: Berlinerisch (B) oder Schwäbisch (S)
const DKEY = 'feierabend-dialekt';
export let DIA = (() => { try { return localStorage.getItem(DKEY) || 'B'; } catch (e) { return 'B'; } })();
export function setDialekt(d) { try { localStorage.setItem(DKEY, d); } catch (e) {} DIA = d; }
export const DIALEKTE = { B: 'Berlinerisch', S: 'Schwäbisch' };
// Schlüssel für Sprüche: CH, DE (Berlin), DE_S (Schwaben), AT
export const VK = () => LAND === 'DE' && DIA === 'S' ? 'DE_S' : LAND;

// [Schweiz, Deutschland, Österreich]
const W = {
  amt: ['Gemeindeverwaltung', 'Ordnungsamt', 'Magistrat'],
  amtKurz: ['GEMEINDE', 'ORDNUNGSAMT', 'MAGISTRAT'],
  hallo: ['Grüezi!', 'Moin!', 'Grüß Gott!'],
  tschau: ['Ade!', 'Tschüss!', 'Servus!'],
  velo: ['Velo', 'Fahrrad', 'Radl'],
  kiosk: ['KIOSK', 'KIOSK', 'TRAFIK'],
  post: ['POST', 'POST', 'POST'],
  postJob: ['Pöstler', 'Postbote', 'Briefträger'],
  muellJob: ['Kehrichtabfuhr', 'Müllabfuhr', 'Müllabfuhr'],
  sack: ['Kehrichtsack', 'Müllsack', 'Mistsackerl'],
  glas: ['Altglas', 'Altglas', 'Altglas'],
  huhnJob: ['Hühnerfänger', 'Hühnerfänger', 'Hendlfänger'],
  huhn: ['Huhn', 'Huhn', 'Hendl'],
  haltestelle: ['HALTESTELLE', 'BUSHALTESTELLE', 'HALTESTELLE'],
  geld: ['Stempelmarken', 'Stempelmarken', 'Stempelmarken'],
  plakette: ['MFK-Kleber', 'Prüfplakette', 'Pickerl'],
  feierabend: ['Feierabend!', 'Feierabend!', 'Feierabend, endlich!'],
  znueni: ['Znüni', 'Frühstückspause', 'Jause'],
  ruhe: ['Mittagsruhe', 'Mittagsruhe', 'Mittagsruhe'],
  formular: ['Formular', 'Antrag', 'Ansuchen'],
  bewilligung: ['Bewilligung', 'Genehmigung', 'Bewilligung'],
  rang: [['Praktikant', 'Sachbearbeiter', 'Abteilungsleiter', 'Gemeindeschreiber', 'Gemeindepräsident'], ['Praktikant', 'Sachbearbeiter', 'Referatsleiter', 'Amtsleiter', 'Bürgermeister'], ['Praktikant', 'Sachbearbeiter', 'Referent', 'Amtsrat', 'Bürgermeister']],
};
export function w(k) { const v = W[k]; if (!v) return k; return v[LAND === 'CH' ? 0 : LAND === 'DE' ? 1 : 2]; }
export function tx(s) { return LAND === 'CH' ? String(s).replace(/ß/g, 'ss') : s; }

// Was die Dorfleute so sagen
const LINES = {
  CH: ['Grüezi mitenand!', 'Hesch mini Melone gseh?', 'Pass uf d Schwelle uf!', 'De Bus chunnt nie pünktlich.', 'Mis Huhn isch scho wieder weg!', 'Isch das bewilligt?', 'Wer hät d Kegel umgheit?', 'Uf em Hügel stoht e Kanone!', 'Nöd ufs Dach klettere!', 'Schöne Fiirobig!', 'Häsch s Formular scho igreicht?', 'Am Sunntig wird nöd gmäht!'],
  DE: ['Moin zusammen!', 'Haben Sie meine Melone gesehen?', 'Vorsicht, Schwelle!', 'Der Bus ist schon wieder zu spät.', 'Mein Huhn ist weg!', 'Ist das genehmigt?', 'Wer hat die Kegel umgeworfen?', 'Auf dem Hügel steht eine Kanone!', 'Betreten des Daches verboten!', 'Schönen Feierabend!', 'Haben Sie den Antrag in dreifacher Ausfertigung?', 'Sonntags wird nicht gemäht!'],
  DE_S: ['Griaß Gott mitnand!', 'Hen Sie mei Melone gsehe?', 'Obacht, Schwell!', 'Dr Bus kommt mol widder z spät.', 'Mei Henna isch fort!', 'Isch des überhaupt gnehmigt?', 'Wer hot die Kegel omgschmissa?', 'Uff\'m Bergle stoht a Kanon!', 'Net uffs Dach nuffkraxla!', 'Schee Feierobed!', 'Hen Sie Kehrwoch? Des Treppehaus isch dreckig!', 'Am Sonndig wird net gmäht, gell!'],
  AT: ['Grüß Gott beinand!', 'Haben S meine Melone gsehn?', 'Obacht, Schwelle!', 'Der Bus kommt eh nie pünktlich.', 'Mei Hendl is scho wieder weg!', 'Is des bewilligt?', 'Wer hat die Kegel umghaut?', 'Am Hügel steht a Kanone!', 'Net aufs Dach kraxeln!', 'Schönen Feierabend!', 'Haben S das Ansuchen scho eingereicht?', 'Am Sonntag wird net gmäht!'],
};
export const npcLines = () => LINES[VK()];

// Die zwei Prüfer – frei erfunden, bewusst ohne Ähnlichkeit zu echten Prüfstellen oder Normen-Instituten.
// RUK: «Rüttel- und Klopfgesellschaft», Herr Klopfer klopft mit einem Hämmerchen auf alles und klebt Klopfmarken.
// AFL: «Anstalt für Lineal und Ordnung», Frau Lineal misst alles mit dem Lineal nach («Lineal-Norm LN 0815»).
// Jede Figur spricht im Dialekt des gewählten Landes: Schweizerdeutsch, Berlinerisch/Amtsdeutsch, Wienerisch.
export const PRUEFER = {
  ruk: { name: { CH: 'Herr Chlopfer', DE: 'Herr Klopfer', AT: 'Herr Klopfer' }, org: 'Rüttel- und Klopfgesellschaft (RUK)', marke: 'Klopfmarke', col: '#E8E2CF', hat: 'filz', hatCol: '#22303A', tool: 'hammer' },
  afl: { name: { CH: 'Frau Lineal', DE: 'Frau Lineal', AT: 'Frau Lineal' }, org: 'Anstalt für Lineal und Ordnung (AFL)', marke: 'LN 0815', col: '#9FB3C8', hat: 'tuch', hatCol: '#2F4E8C', tool: 'lineal' },
};
export const prueferName = k => PRUEFER[k].name[LAND];
const PL = {
  start: {
    CH: ['Grüezi. Ich prüefe Ihri Arbet. Ganz neutral.', 'Ich chlopf da churz druf. Rein vorschriftsgmäss.', 'Gemäss LN 0815 muess ich Sie begleite.'],
    DE: ['Na denn wolln wa ma prüfen. Janz neutral.', 'Ick klopp da ma kurz druff. Vorschrift is Vorschrift.', 'Jemäß LN 0815 bejleite ick Sie.'],
    DE_S: ['Griaß Gott. I prüf Ihr Arbeit. Ganz neutral, gell.', 'I klopf do mol kurz druff. Vorschrift isch Vorschrift.', 'Nach LN 0815 muss i Sie begleite.'],
    AT: ['Servus, i prüf Ihna Arbeit. Ganz neutral, gö.', 'I klopf da amoi kurz drauf. Vorschrift is Vorschrift.', 'Laut LN 0815 muass i Sie begleiten.'] },
  wurf: {
    CH: ['Gworfe?! Das isch nöd normgrecht!', 'Würf sind nöd bewilliget!', 'Das chlopf ich jetzt ab… tönt hohl.'],
    DE: ['Jeworfen?! Det is nich normjerecht!', 'Wurfzustellung is nich vorjesehn!', 'Ick klopp ma druff… klingt hohl.'],
    DE_S: ['Gschmissa?! Des isch fei net normgrecht!', 'Ha noi! Werfe isch net vorgsehe!', 'I klopf mol druff… klingt hohl.'],
    AT: ['Gschmissn?! Des is net normgerecht!', 'Schmeißn is net vorgsehn, Herrschaftszeitn!', 'I klopf amoi drauf… klingt hohl.'] },
  kaputt: {
    CH: ['Bruch! Das git en Abzug.', 'Do isch «zerbrechlich» druf gstande!', 'Das isch hinüber. Ich notiere das.'],
    DE: ['Bruch! Det jibt Abzug.', 'Da stand «zerbrechlich» druff!', 'Det is hinüber. Ick notier det.'],
    DE_S: ['Kaputt! Des gibt Abzug, des sag i Ihne.', 'Do isch «zerbrechlich» druffgstande!', 'Des isch hee. I schreib des uff.'],
    AT: ['Hin is! Des gibt an Abzug.', 'Do is «zerbrechlich» draufgstandn!', 'Des is im Oasch. I notier des.'] },
  gut: {
    CH: ['Korrekt zuegstellt.', 'Iiwandfrei. Fascht.', 'Messt genau 0815 Millimeter. Guet.'],
    DE: ['Ordnungsjemäß zujestellt.', 'Einwandfrei. Beinahe.', 'Misst jenau 0815 Millimeter. Jut.'],
    DE_S: ['Ordnungsgemäß zugstellt. Ned gschimpft isch globt gnug.', 'Passt scho. Fascht.', 'Misst gnau 0815 Millimeter. Subber.'],
    AT: ['Ordnungsgemäß zugstellt.', 'Passt scho. Fast.', 'Misst genau 0815 Millimeter. Leiwand.'] },
  falsch: {
    CH: ['Falsch trennt! Glas ghört is Altglas!', 'Das isch e Ordnigswidrigkeit!'],
    DE: ['Falsch jetrennt! Glas jehört inn Glascontaina!', 'Det is ne Ordnungswidrigkeit!'],
    DE_S: ['Falsch trennt! Glas ghört in Glascontainer!', 'Des isch a Ordnungswidrigkeit! Und Kehrwoch hen Sie au net gmacht!'],
    AT: ['Falsch trennt! Glas ghört ins Altglas!', 'Des is a Verwaltungsübertretung!'] },
  stolper: {
    CH: ['Arbetsunfall! Ich notiere das.', 'Bitte Schwelle beachte.', 'Ui. Das gibt es Formular.'],
    DE: ['Arbeitsunfall! Ick notier det.', 'Stolperstelle nich jekennzeichnet!', 'Uff. Det jibt n Formular.'],
    DE_S: ['Arbeitsunfall! I schreib des uff.', 'Obacht uff d Schwell!', 'Jesses. Des gibt a Formular.'],
    AT: ['Arbeitsunfall! I notier des.', 'Obacht auf die Schwelln!', 'Jessas. Des gibt a Formular.'] },
  ende: {
    CH: ['Prüefig abgschlosse. Ich chläb Ihne e Chlopfmarke druf.', 'Gmesse, gchlopft, gstämpflet. Fertig.'],
    DE: ['Prüfung abjeschlossen. Ick kleb Ihn ne Klopfmarke druff.', 'Jemessen, jeklopft, jestempelt. Feierabend.'],
    DE_S: ['Prüfung abgschlossa. I bapp Ihne a Klopfmärkle druff.', 'Gmessa, klopft, gstempelt. Feierobed.'],
    AT: ['Prüfung abgschlossn. I pick Ihna a Klopfmarkerl drauf.', 'Gmessn, klopft, gstempelt. Passt.'] },
};
export function prueferLine(k) { const a = (PL[k] || PL.start)[VK()]; return a[(Math.random() * a.length) | 0]; }
// Noten: Schweiz 6 = beste, Deutschland/Österreich 1 = beste
export function note(score) { // score 0..1
  if (LAND === 'CH') { const n = Math.max(1, Math.min(6, Math.round((1 + score * 5) * 2) / 2)); return n.toFixed(1).replace('.0', ''); }
  const n = Math.max(1, Math.min(LAND === 'AT' ? 5 : 6, Math.round(6 - score * 5))); return String(n);
}
export const noteLabel = () => LAND === 'CH' ? 'Note (6 = beste)' : 'Note (1 = beste)';
