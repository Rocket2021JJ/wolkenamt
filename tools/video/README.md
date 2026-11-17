# HOCHDRUCK Video-Fabrik

Macht aus einer Szenenliste (JSON) ein fertiges Video: Bild aus dem Spiel, Untertitel, Figurenstimmen auf
Wolkwilisch und Musik. Kein Bildschirm, kein Aufnahmeprogramm nötig. Alles kommt aus dem Spiel selbst,
alle Rechte bei Duchy Games.

## Einmal einrichten
```bash
git clone https://github.com/Rocket2021JJ/wolkenamt.git && cd wolkenamt
pip install playwright        # Python 3.10 oder neuer
# Google Chrome oder Chromium muss installiert sein, dazu ffmpeg
```

## Ein Video machen
```bash
python3 -m http.server 8765 &                     # im Ordner wolkenamt, läuft im Hintergrund
python3 tools/video/fabrik.py tools/video/szenen/short01.json out/short01.mp4
```
Dauer: etwa 1,5 Sekunden Rechenzeit pro Bild (ohne Grafikkarte). Ein Short mit 25 Sekunden braucht
rund 15 bis 20 Minuten. Schneller: `VF_SCALE=0.5` (kleiner rendern, etwas weicher) oder `"fps": 24`.

## Aufbau einer Szenenliste
```json
{
  "format": "short",            // "short" = 1080×1920, "wide" = 1920×1080
  "fps": 30,
  "music": "dorf_laendler",     // Datei aus tools/video/musik/ ohne .mp3, oder weglassen
  "music_gain": 0.42,
  "scenes": [
    {
      "dur": 4,                                            // Sekunden
      "cam": { "from": [x, y, z, blickX, blickY, blickZ], "to": [ ... ] },   // Kamerafahrt (weich)
      "js": "__world.teleport(2.5, 0, 16, Math.PI);",      // optional: Szene vorbereiten
      "walk": { "from": [x, z], "to": [x, z] },            // optional: das Beamtli läuft
      "dusk": 0,                                           // 0 Tag, 0.3 Nachmittag, 1 Abend
      "audio": [ { "say": "Grüüzimpf!", "who": "Gemeindeschreiber", "mood": "!", "at": 0.6 },
                 { "gesture": "laugh", "who": "Gemeindepräsident Huber", "at": 2.0 },
                 { "bells": 4, "at": 0.5 } ],
      "subs": [ { "from": 0.5, "to": 4, "lingo": "Grüüzimpf!", "text": "Hi!", "small": "Grüezi!" } ],
      "card": { "title": "HOCHDRUCK", "line": "…", "small": "…" }   // optional: Titelkarte statt Spielbild
    }
  ]
}
```

**Figuren (who):** `Gemeindeschreiber` (Beamtli/Erzähler), `Gemeindepräsident Huber`, `Inspektor Wyss`,
`Frau Imboden, Wolkenwiler Anzeiger`, `Grosi Elsbeth`, `moser`, `gerber`, `zbinden`.
**Laute (gesture):** `hmpf`, `hm`, `hehe`, `laugh`, `sigh`, `pff`, `oh`.
**Stimmung (mood):** `""`, `"!"`, `"?"`.

## Nützliche Orte (x, y, z)
| Ort | Kamera von → Blick | Beamtli hinstellen |
|---|---|---|
| Dorf von oben | `[-16,62,104, 0,0,4]` | – |
| Dorfplatz | `[-5,4.4,19, 0,1.8,6]` | `teleport(1.5,0,9,Math.PI)` |
| Amtshaus-Eingang | `[6,3.6,18, 0.5,1.4,8]` | `walk` von `[1.5,11]` nach `[0.2,5.2]` |
| Pult | `[1.6,2.6,-0.4, -0.15,0.9,-3.2]` | `teleport(1.3,0,-2.0,-1.2)` |
| Dach mit Kurbel | `[3.5,7.5,6, -2.4,4.2,-1.8]` | `teleport(-2.2,3.52,-0.7,Math.PI); __world.office.crankT=6` |
| Parteigasse | `[-38,4.5,21, -38.5,2.2,-2]` | – |
| Kirche | `[-5,6.5,-1, -17,6,-16]` | – |
| Tal mit Feldern | `[0,16,-48, 0,-22,-320]` | – |
| Schule/Spielplatz | `[34,7,30, 46,2,12]` | – |
| Kuhweide | `[8,6,-28, 22,1,-42]` | – |
| Villa Huber innen | `[19.5,4.6,-634.5, 16,0.8,-640.5]` | `teleport(16,0,-637.5,Math.PI)` |
| Parteibüro FWW innen | `[-29,4.6,-635, -32,0.8,-640.5]` | `teleport(-32,0,-637.5,Math.PI)` |

Tipp: Positionen ausprobieren im Spiel mit der Browser-Konsole (siehe Kino-Werkzeuge in der Anleitung
des Dev-Kanal-Pakets).
