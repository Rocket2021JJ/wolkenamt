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
- Etappe 3: Auf dem Dach steht neben der Kurbel ein Wetterpult (E). Einmal pro Tag: 7 Optionen (Regen,
  Nebel, Sonne, Gewitter über verschiedenen Orten), jede mit Wirkung auf Gruppen und Parteien. Das Wetter
  ist danach im 3D-Dorf zu sehen (Regen, Nebel, Gewitter mit Blitzen). Katastrophen: zweimal Regen über
  dem Hang löst einen Murgang aus, Nebel auf der Passstrasse kann einen Unfall verursachen, ein gezieltes
  Gewitter kann in den Kirchturm einschlagen. Nebel über dem Platz verhindert Zeugen beim Aktenvernichter.
