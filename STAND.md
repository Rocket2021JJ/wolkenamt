# Arbeitsstand HOCHDRUCK

Diese Datei wird nach jeder Etappe nachgeführt. Jede fertige Etappe ist auf GitHub und unter
https://rocket2021jj.github.io/wolkenamt/ spielbar.

Konzept: https://claude.ai/artifact/7PKn1gV7qVtZYPk8aTwhUG

## Etappen

| Etappe | Inhalt | Stand |
|---|---|---|
| 0 | Vollbild-Layout (keine weissen Flächen), Titel HOCHDRUCK | fertig |
| 1 | Machtwerte: Parteien, Umfragen, Verdacht, Schwarzkasse, Vertrauen, verzögerte Folgen | fertig |
| 2 | Pult 2.0: Prüfen, Telefon, Archiv, Aktenvernichter | fertig |
| 3 | Wetter-Werkzeuge: Nebel, Regen, Sonne, Gewitter | fertig |
| 4 | Dorf lebt: Gemeindehaus mit Sachabstimmung, Gerüchte am Marktstand | fertig (Teil 1) |
| 5 | Kapitel 1 spielbar | fertig |
| 6 | Abendpartie (Mehrspieler) | fertig (Version 1) |
| 7 | README für HOCHDRUCK | fertig |
| 8 | Kapitel 2 «Die Untersuchung» | fertig (Version 1) |
| 9 | Kapitel 3 «Der Wahlkampf» mit Gemeindewahl und 7 Enden | fertig (Version 1) |
| 10 | Sandbox «Jahre im Amt» | fertig (Version 1) |
| 11 | Ratssaal im Gemeindehaus begehbar | fertig |
| 12 | Echter Sprachkanal (online) | gebaut, Test mit echten Geräten offen |

## Notizen

- Etappe 0: Das Spielfeld füllt jetzt das ganze Fenster. Die 2D-Schneideansicht bleibt 3:2 mit dunklem Rand.
- Etappe 1: Vor dem ersten Arbeitstag wählst du eine Partei (WVB, FWW, PKH). Huber ist der Gegner.
  Oben rechts zeigt die Akte Umfrage, Verdacht, Einfluss und Schwarzkasse. Jeder Antrag zeigt, welche
  Wählergruppen er betrifft. Am Tagesende kommt der Machtbericht. Manche Entscheide kommen Tage später
  als «Morgenpost» zurück, oft mit einer neuen Entscheidung (11 Ereignisse, z. B. Gerber, FC-Konto,
  Hotel Bergblick, Huber droht, Journalistin fragt nach dem Umschlag).
  Im Menü: «Neue Kampagne» setzt Partei und Woche zurück. Code: js/power.js
- Etappe 2: Ab Dienstag ist pro Tag ein Antrag gefälscht. Mit «Prüfen» vergleichst du Unterschrift und
  Stempel mit der Kartei (falsche Neigung, eine Schlaufe zu viel oder blauer Stempel «WOLKENWYL»).
  «Als Fälschung melden» belohnt dich, wenn du richtig liegst. Eine bewilligte Fälschung fliegt am
  nächsten Tag auf. Nach dem Stempeln klingelt das Telefon (6 Anrufe: Gewerbe, anonymer Tipp, Redaktorin,
  Huber, Inspektor Wyss, Parteisekretär). Im Archiv (Aktenschränke links) liegen 4 Dossiers, die Einfluss
  kosten und Druckmittel liefern. Der Aktenvernichter neben dem Pult senkt den Verdacht, aber jemand
  könnte es sehen.
- Etappe 3: Auf dem Dach steht neben der Kurbel ein Wetterpult (E). Einmal pro Tag: 7 Optionen (Regen,
  Nebel, Sonne, Gewitter über verschiedenen Orten), jede mit Wirkung auf Gruppen und Parteien. Das Wetter
  ist danach im 3D-Dorf zu sehen (Regen, Nebel, Gewitter mit Blitzen). Katastrophen: zweimal Regen über
  dem Hang löst einen Murgang aus, Nebel auf der Passstrasse kann einen Unfall verursachen, ein gezieltes
  Gewitter kann in den Kirchturm einschlagen. Nebel über dem Platz verhindert Zeugen beim Aktenvernichter.
- Etappe 4: Am Dorfplatz stehen neu das Gemeindehaus (mit Uhrturm) und der Marktstand der Bäckerei Moser.
  Im Gemeindehaus läuft die Sachabstimmung der Woche (Seilbahn ja/nein). Ab Dienstag: Kampagne machen
  (Einfluss), Plakate kaufen (Schwarzkasse) oder Briefwahl-Couverts verschwinden lassen (riskant).
  Am Samstag wird im Tagesbericht ausgezählt. Am Marktstand streust du einmal pro Tag ein Gerücht über
  eine andere Partei. Es kann zu dir zurückverfolgt werden (ausser bei Nebel).
  Noch offen aus Etappe 4: begehbarer Innenraum des Gemeindehauses, Zeitungs-Schlagzeile am Morgen.
- Etappe 5: Das Menü heisst jetzt «Kampagne · Kapitel 1». Jeden Morgen bringt der Anzeiger eine Schlagzeile
  aus den echten Veränderungen (wer zulegt, wer abstürzt, ob das Amt unter Verdacht steht). Am Samstag:
  Sachabstimmung, offene Folgen und Kapitelende mit 4 möglichen Ausgängen.
- Etappe 6: Online hat jede Person eine eigene Partei (1. WVB, 2. FWW, 3. PKH), Huber spielt als vierte Partei
  mit. Wie gut deine Wolke wird, bewegt die Umfrage deiner Partei bei den betroffenen Wählergruppen. Nach
  jeder Runde gibt es im Ergebnis-Fenster das «Hinterzimmer» mit einer Aktion pro Runde: Gerücht streuen,
  beim Kanton verpfeifen, Plakate kleben oder Bestechung annehmen. Alles erscheint anonym im Funk. Wer vorne
  liegt, bekommt jede Runde +5 Verdacht. Am Schluss entscheidet die Gemeindewahl (Umfrage), nicht die Punkte.
  Getestet mit ?lokaltest in drei Tabs.
- Etappe 8: Nach Kapitel 1 wird im Menü Kapitel 2 freigeschaltet (6 weitere Tage). Am Montag kommt ein
  Einschreiben vom Kanton, Inspektor Wyss zieht ins Archiv. Neu in der Akte: «Ermittlung» (0–100), Start
  aus dem Verdacht. Jeden Morgen befragt dich Wyss (6 Verhöre: Kaffeekasse, Zeugen, Aktenvernichter,
  Hubers Deal, Schlussgespräch) mit Antworten wie Anwalt, Lügen, Huber belasten (Druckmittel), Gespräch
  aufnehmen oder Wyss einen Umschlag geben. Die Ermittlung wächst täglich mit dem Verdacht. Bei 100 bist
  du das Amt los und beginnst Kapitel 2 neu (Stand vom Kapitelanfang). 4 neue Sonderanträge, neue
  Abstimmung «Kantonale Aufsicht». Am Samstag schreibt Wyss den Bericht: entlastet, Bauernopfer, Anklage
  oder (mit Hubers Deal) verraten. Code: js/power.js (Abschnitt Kapitel 2).
- Etappe 9: Kapitel 3 (6 Tage). Jeden Morgen ein Wahlkampftermin: Plakatspruch, Podium im Rössli,
  anonymer USB-Stick mit Huber-Fotos, Bauer Zbinden will Regen (oder gekaufte Stimmen), Huber bietet
  einen Parkplatz für deinen Rückzug, am Wahltag entscheidest du über das Wetter. Neue Abstimmung
  «Wolkensteuer». Am Samstag Gemeindewahl mit Schlussresultat und einem von 7 Enden: Der saubere Himmel,
  Gemeindepräsidium, Gewonnen aber…, Nachzählung, Huber für immer, Opposition, Der Parkplatz. Frühere
  Entscheide (Umschlag an Wyss, Regenversprechen, Anklage aus Kapitel 2) wirken im Abspann nach.
  Damit ist die Story von Anfang bis Ende spielbar (18 Tage).
- Etappe 10: Neuer Menüpunkt «Sandbox: Jahre im Amt». Eigene Partei und eigener Spielstand (die
  Kampagne bleibt unberührt). Endlos: jedes Jahr 6 Tage mit zufälligen Anträgen und Sonderanträgen,
  Morgenpost mit verzögerten Folgen, bei hohem Verdacht Verhöre von Wyss, in Wahljahren
  Wahlkampftermine. Jedes Jahr eine Abstimmung (wechselt zwischen Seilbahn, Aufsicht, Wolkensteuer),
  alle 2 Jahre Gemeindewahl. Wer regiert, verliert langsam an Glanz. Ab Verdacht 95 ist die Sandbox vorbei.
- Etappe 11: Das Gemeindehaus ist jetzt begehbar (E an der Türe). Im Ratssaal: Ratstisch mit Hubers
  hohem roten Stuhl, Wappen, Zuschauerbänke, Rednerpult (Abstimmung beeinflussen), Wahlurne (nachzählen
  lassen, Zettel dazulegen, Gemeindeschreiber bestechen; kann am nächsten Tag auffliegen) und Hubers
  Schreibtisch (einmal pro Kapitel durchsuchen: Druckmittel finden oder von Huber erwischt werden; Nebel
  hilft). Raus geht es durch die Türe. Code: js/hall.js
- Etappe 12: Der Sprachkanal funktioniert jetzt (nur echtes Online-Spiel, nicht im ?lokaltest). Knopf
  «Sprachkanal beitreten» fragt nach dem Mikrofon. Wer beitritt, ruft alle an, die schon drin sind
  (WebRTC-Audio über PeerJS, direkt von Browser zu Browser). Stumm-Knopf und Taste M, «Verlassen».
  In der Spielerliste: grüner Ring = im Sprachkanal, leuchtet beim Sprechen, «stumm» wird angezeigt.
  Konnte hier nicht mit echten Mikrofonen getestet werden (kein Internet im Testsystem). Bitte zu zweit
  auf zwei Geräten ausprobieren. Hinweis: Manche Netze (Schule, Firma) blockieren WebRTC.
