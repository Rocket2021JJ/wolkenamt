// HOCHDRUCK – Leute mit Namen: vier Dorfbewohner, die man ansprechen kann.
// Jede Person gehört zu einer Gruppe. Einmal am Tag zuhören bringt ein wenig Vertrauen dieser Gruppe,
// und was sie sagt, hängt davon ab, wie es dir gerade geht (Verdacht, Umfrage, Kapitel).
export const FOLK = [
  { id: 'gerber', name: ['Bäcker Gerber', 'Baker Gerber'], group: 'gewerbe', lingo: 'Grüüzimpf! Brötli-wolk? Hubärli plimm.',
    day: [
      ['Wenn morgen wieder Nebel ist, gehen meine Gipfeli nicht. Niemand kauft Gipfeli im Nebel. Das ist Wissenschaft.', 'If there’s fog again tomorrow, my croissants won’t sell. Nobody buys croissants in fog. That’s science.'],
      ['Ich backe seit 31 Jahren um vier Uhr. Ich habe noch nie einen Sonnenaufgang gesehen, nur den Ofen.', 'I’ve been baking at four a.m. for 31 years. I’ve never seen a sunrise, only the oven.'],
      ['Huber kauft jeden Morgen ein Weggli und zahlt mit einer Hunderternote. Jeden Morgen. Ich glaube, das ist Absicht.', 'Huber buys one bread roll every morning and pays with a hundred-franc note. Every morning. I think it’s on purpose.'],
    ],
    susp: ['Man sagt, du stempelst nicht nur Anträge. Ich sag nichts. Aber ich zähle mein Wechselgeld jetzt zweimal.', 'People say you stamp more than requests. I’m not saying anything. But I count my change twice now.'],
    lead: ['Deine Leute liegen vorne? Dann will ich ein Plakat im Schaufenster. Gratis natürlich. Und eine Sonnenwolke am Samstag.', 'Your lot is in front? Then I want a poster in my shop window. Free, of course. And a sunny cloud on Saturday.'] },
  { id: 'moser', name: ['Bauer Moser', 'Farmer Moser'], group: 'bauern', lingo: 'Mmh. Rägäpfli? Kuhwolk. Mmh.',
    day: [
      ['Mmh. Regen wär gut. Nicht zu viel. Nicht zu wenig. Mmh.', 'Mmh. Rain would be good. Not too much. Not too little. Mmh.'],
      ['Meine Kühe schauen jeden Tag in die Wolken. Die wissen mehr über dein Amt als der Gemeinderat.', 'My cows look at the clouds every day. They know more about your office than the council does.'],
      ['Mein Grossvater hat das Wetter mit dem Knie gemacht. Hat auch funktioniert. Billiger war es sicher.', 'My grandfather did the weather with his knee. Worked too. Cheaper, that’s for sure.'],
    ],
    susp: ['Mmh. Die Leute reden. Ich red nicht. Aber die Kühe schauen dich komisch an.', 'Mmh. People are talking. I don’t talk. But the cows are looking at you funny.'],
    lead: ['Mmh. Vorne bist du. Dann denk an den Heuet. Drei Tage trocken. Nicht verhandelbar.', 'Mmh. You’re ahead. Then remember the hay harvest. Three dry days. Not negotiable.'] },
  { id: 'zbinden', name: ['Lehrerin Zbinden', 'Ms Zbinden, teacher'], group: 'junge', lingo: 'Plimm-plimm! Schüelerli wolkwil, gäll?',
    day: [
      ['Die Kinder zeichnen im Unterricht nur noch Wolken in Form von Huber. Ich weiss nicht, ob das Kritik ist.', 'In class the children only draw clouds shaped like Huber now. I can’t tell if that’s criticism.'],
      ['Wir machen eine Projektwoche über die Gemeinde. Darf die Klasse dein Amt besuchen? Sie bringen Fragen mit. Viele.', 'We’re doing a project week on the village. Can my class visit your office? They’ll bring questions. Many.'],
      ['Ein Schüler hat gefragt, wer eigentlich das Wetter wählt. Ich habe gesagt: niemand. Er hat gesagt: genau.', 'A pupil asked who actually elects the weather. I said nobody. He said: exactly.'],
    ],
    susp: ['Die Kinder spielen in der Pause jetzt «Untersuchung». Einer ist der Kanton, einer bist du. Du verlierst immer.', 'At break the kids now play “investigation”. One is the canton, one is you. You always lose.'],
    lead: ['Wenn du gewinnst, will ich einen Schulausflug mit Garantie auf Sonne. Schriftlich.', 'If you win, I want a school trip with guaranteed sunshine. In writing.'] },
  { id: 'elsbeth', name: ['Grosi Elsbeth', 'Granny Elsbeth'], group: 'senioren', lingo: 'Ach jöö, Büebli! Chüechli-wolk? Hubärli, pfff.',
    day: [
      ['Früher hatten wir keine Wolkenbeamten. Früher hat der Pfarrer gebetet, und dann hat es geregnet oder nicht.', 'We didn’t have cloud officials in my day. The priest prayed, and then it rained or it didn’t.'],
      ['Ich habe Huber gekannt, da war er so gross. Hat schon damals anderen die Guetsli weggenommen.', 'I knew Huber when he was this small. Took other kids’ biscuits even back then.'],
      ['Mach mir am Sonntag eine schöne Wolke. Eine wie ein Schaf. Ich mag Schafe.', 'Make me a nice cloud on Sunday. One like a sheep. I like sheep.'],
    ],
    susp: ['Büebli, du hast so einen Blick wie mein Mann selig, wenn er beim Jassen beschissen hat.', 'Dear, you’ve got the same look my late husband had when he cheated at cards.'],
    lead: ['Ich habe dich gewählt. Also, ich werde. Wenn ich dran denke. Schreib es mir auf.', 'I voted for you. Well, I will. If I remember. Write it down for me.'] },
];
// Wo die Leute stehen, und was sie sich vom Wetter wünschen (wechselt jeden Tag)
export const FOLK_HOME = { gerber: [43.2, 31, 2.2], moser: [18, -32.6, 2.5], zbinden: [42.5, 9, 3], elsbeth: [-15.6, -6.6, 1.8] };
export const WISHES = {
  gerber: [['sun', ['Sonne, dann sitzen die Leute draussen und kaufen Gipfeli.', 'Sun, then people sit outside and buy croissants.']],
           ['fog', ['Nebel! Dann kauft niemand bei der Konkurrenz im Tal. Die sieht man ja nicht.', 'Fog! Then nobody shops at the competitor in the valley. You can’t even see it.']],
           ['sun', ['Sonne. Bitte. Ich habe 200 Nussgipfel gebacken.', 'Sun. Please. I baked 200 nut croissants.']]],
  moser:  [['rain', ['Mmh. Regen. Die Kartoffeln.', 'Mmh. Rain. The potatoes.']],
           ['sun', ['Mmh. Sonne. Heuet.', 'Mmh. Sun. Haymaking.']],
           ['rain', ['Mmh. Der Brunnen ist leer. Regen.', 'Mmh. The well is empty. Rain.']]],
  zbinden: [['snow', ['Schnee! Dann gibt es schulfrei, und ich kann endlich die Aufsätze korrigieren.', 'Snow! Then school’s off and I can finally mark the essays.']],
            ['sun', ['Sonne für die Schulreise! 24 Kinder und ich, ohne Regenjacken.', 'Sun for the school trip! 24 kids and me, no rain jackets.']],
            ['storm', ['Ein kleines Gewitter? Für den Naturkunde-Unterricht. Nur ein kleines.', 'A little thunderstorm? For science class. Just a little one.']]],
  elsbeth: [['sun', ['Ein bisschen Sonne für meine alten Knochen, Büebli.', 'A little sun for my old bones, dear.']],
            ['snow', ['Schnee wie früher! Da war alles noch weiss und Huber noch klein.', 'Snow like the old days! Everything white and Huber still small.']],
            ['sun', ['Sonne zum Kaffee auf dem Bänkli. Mehr will ich nicht.', 'Sun for coffee on the bench. That’s all I want.']]],
};
export const wishOf = (f, d) => WISHES[f.id][(d + f.id.length) % WISHES[f.id].length];
export function folkLine(f, P, d) {
  if (P && P.suspicion >= 55) return f.susp;
  if (P && P.lead) return f.lead;
  return f.day[(d + f.id.length) % f.day.length];
}
