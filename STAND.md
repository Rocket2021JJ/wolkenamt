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
| 3 | Wetter-Werkzeuge: Nebel, Regen, Sonne | offen |
| 4 | Dorf lebt: Gerüchte, Zeitung, Katastrophen, Wahlhaus | offen |
| 5 | Kapitel 1 spielbar | offen |
| 6 | Abendpartie (Mehrspieler) | offen |

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
