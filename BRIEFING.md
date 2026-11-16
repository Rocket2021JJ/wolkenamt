# Übergabe: WOLKENAMT 3D-Umbau (v0.4)

Dieses Dokument ist der Auftrag für den nächsten Arbeitsschritt. Bitte zuerst ganz lesen, dann die Meilensteine der Reihe nach umsetzen und jeden Meilenstein mit Screenshots prüfen.

Studio: **Duchy Games** (Signatur «Herz & Zog»). Entwickler: Jayson Herzog.

---

## 1. Wo wir stehen (v0.3, dieser Ordner)

Ein fertiges, spielbares 2D-Browserspiel:

- **Idee:** Man arbeitet beim Wolkenamt der Gemeinde Wolkenwil, bekommt Anträge aus dem Dorf (Bäckerei will ein Gipfeli, Anonymer will einen Fisch über Herrn Gerbers Haus …), schneidet Wolken in Form, und das Dorf reagiert in Zeitung und Social-Feed.
- **Modi:** Arbeitswoche (Schreibtisch: Anträge stempeln, nur begrenzte Wolken pro Tag, Tagesbericht mit Ansehen), freie Wolke mit Postkarte, lokal zu dritt, **online zu dritt** (PeerJS, Host verteilt den Stand).
- **Technik:** `index.html`, `css/style.css`, `js/game.js` (ein IIFE, ca. 1500 Zeilen), kein Build-Schritt, läuft auf GitHub Pages.
- **Wichtige Stellen in `js/game.js`:** `ORDERS` (12 Anträge mit Texten), `SPECIALS`, `DAYS`, `TOD` (Farbwelten), `startPlay(seed)` (Wolke erzeugen), `release()`, `renderCloud()`, `draw()`, `drawHud()`, Online: `hostOnMsg` / `onNet` / `toHost` / `bc`.
- **Ladebildschirm** mit Duchy-Games-Logo (Krone, Schriftzug, Space Grotesk + Instrument Serif): **unverändert lassen**, das ist das Studio-Branding.

## 2. Was sich ändert (Entscheide von Jayson)

1. **Name:** Der Spieltitel heisst wieder **WOLKENAMT** (in Grossbuchstaben, wie in v0.1/v0.2).
2. **Sprache:** **Deutsch und Englisch umschaltbar** (Umschalter im Menü, Wahl im `localStorage` merken, Standard nach Browsersprache). Alle Texte in ein Wörterbuch auslagern, auch Anträge, Schlagzeilen und Feed-Kommentare. Personennamen (Moser, Gerber, Huber …) bleiben in beiden Sprachen gleich.
3. **3D-Welt zum Herumlaufen**, Gefühl wie *Wobbly Life*: wackelige, physikalisch wirkende Figuren, die man frei steuert. **Aber nichts kopieren**, Figuren und Welt sind eigene Entwürfe (siehe Abschnitt 4).
4. **Szenenwechsel 3D → 2D:** Wer an den Schreibtisch geht, bei dem fährt die Kamera auf die Tischplatte und das Spiel wechselt in die 2D-Ansicht zum Stempeln. Auf der Wolkenplattform wechselt es in die 2D-Ansicht zum Wolkenschneiden. Die bestehenden 2D-Teile werden dafür weiterverwendet.
5. **Begehbares, uraltes Amtsbüro**, ganz traditionell (siehe Abschnitt 5).
6. **Alte Plakate im Schweizer Stil** hängen ab und zu an den Wänden im Büro und im Dorf (siehe Abschnitt 6).
7. **Online zu dritt bleibt**, jetzt mit sichtbaren Figuren der anderen Spieler in der 3D-Welt.
8. **Sprachchat:** weiterhin nur als Vorschau (Optik), Funktion kommt später. Text-Funk bleibt.
9. **Nicht KI-mässig aussehen** (siehe Abschnitt 7). Das ist Jayson sehr wichtig.

## 3. Farbkonzept: «Alpenplakat × Amtsstube»

Draussen die frischen Flächen alter Schweizer Tourismusplakate, drinnen das warme, nostalgische Amtsbüro.

**Aussen (Dorf, Himmel, Berge)**

| Name | Hex | Verwendung |
|---|---|---|
| Himmel | `#A9C6D6` | Himmel, helle Flächen |
| Gletscher | `#5E86A8` | Berge, Schatten aussen, Spielerfarbe 2 |
| Matte | `#6F8F4E` | Wiesen, Bäume (hell) |
| Schnee | `#F3F1EA` | Schneekappen, Wolkenpapier |
| Chaletholz | `#8B5A35` | Häuser, Zäune |
| Signalrot | `#C8352B` | Dächer (vereinzelt), Wappen, Stempel, Spielerfarbe 1 |

**Innen (Amtsbüro)**

| Name | Hex | Verwendung |
|---|---|---|
| Linoleum | `#4F6B57` | Wandsockel, Bodenläufer, Aktenschränke |
| Aktenocker | `#C99A3B` | Aktenordner, Messing, Spielerfarbe 3 |
| Papier | `#E9E6DA` | Wände oben, Formulare, Oberfläche |
| Stempelblau | `#2F4E8C` | Stempelfarbe, Schilder, Akzente |
| Kaffee / Nussholz | `#6B4A33` | Pult, Täfer, Holzboden |
| Lampenlicht | `#F2D27A` | Lampen, Fensterlicht am Abend |

**Tinte:** `#22303A` für Linien, Schrift, Augen der Figuren.

Regeln:
- Pro Szene höchstens 5 bis 6 dieser Farben, plus Tinte. Keine neuen Farben dazuerfinden.
- **Flaches Toon-Shading** mit 2 bis 3 harten Helligkeitsstufen (z. B. `MeshToonMaterial` mit eigener Gradient-Map). Kein Glanz, kein Bloom, keine Farbverläufe als Deko.
- Licht: eine warme Hauptlichtquelle und ein kühles Umgebungslicht. Schatten weich, aber erkennbar.
- 2D-Oberfläche (Menüs, Formulare, Zeitung): weiter im Papier-und-Tinte-Stil von v0.3, aber mit den neuen Farben.

## 4. Eigene Figuren: die «Beamtli»

Gefühl wie Wobbly Life (wackelig, tollpatschig, lustig), Aussehen **eigenständig**:

- **Körper:** rundliche Kapsel / Bohnenform, ein Stück (Kopf und Körper verschmolzen), etwa 1,2 Einheiten hoch.
- **Kopf-Merkmal:** eine **Amtsmütze mit Schirm** in Tinte (`#22303A`) mit kleinem goldenem Abzeichen (Aktenocker). Das ist das Erkennungszeichen.
- **Gesicht:** nur zwei Punktaugen in Tinte, kein Mund (Gefühle über Körperhaltung zeigen).
- **Krawatte:** schmaler dunkler Streifen vorne.
- **Arme:** kurze Stummel ohne Hände, die beim Laufen pendeln. **Beine:** zwei kurze Stummel.
- **Farben:** Spieler 1 Signalrot, Spieler 2 Gletscher, Spieler 3 Aktenocker.
- **Wackeln selbst gebaut** (keine Assets, keine fertigen Rigs): Federsystem für Rumpfneigung beim Beschleunigen, Kopfnicken, Armpendel, leichtes Nachschwingen beim Stoppen, Watscheln beim Gehen. Beim Stolpern über eine Kante kurz umkippen und wieder aufstehen. Physik kann vereinfacht sein (Kapsel-Kollision gegen Boxen reicht).
- **Steuerung:** WASD / Pfeiltasten + Leertaste zum Hüpfen, **E** zum Benutzen. Am Handy ein Joystick links und eine Taste rechts.
- **Kamera:** Third-Person, folgt weich, leicht von oben.

## 5. Das begehbare Amtsbüro

Ein uraltes, traditionelles Schweizer Amtsbüro, etwa um 1930 eingerichtet und seither nie renoviert:

- **Boden:** knarrende Holzdielen (Nussholz) mit einem grünen Linoleum-Läufer.
- **Wände:** unten Holztäfer, oben papierhelle Wand, ein Gemeindewappen von Wolkenwil (rotes Schild, weisse Wolke).
- **Das Pult:** ein schwerer, uralter Holzschreibtisch mit Stempelkarussell, Tintenkissen, Schreibmaschine, Wählscheibentelefon und einem Stapel Anträge. **Hier wechselt das Spiel in die 2D-Stempelansicht.**
- **Weitere Möbel:** Aktenschränke (Linoleumgrün), Regale mit Ordnern (Aktenocker), Gusseisenheizkörper, Garderobe mit Amtsmützen, Pendellampe (Lampenlicht), Wanduhr, Kaffeemaschine.
- **Fenster** mit Blick aufs Dorf und die Berge.
- **Treppe aufs Dach zur Wolkenplattform** mit Kurbel und Scheren. **Hier wechselt das Spiel in die 2D-Schneideansicht.**
- **Tür zum Dorfplatz:** Dort steht man nach jeder Runde zusammen und schaut zu, wie die Wolken ankommen (3D-Auflösung, Leute im Dorf zücken die Handys).
- Alles aus einfachen Grundformen (Boxen, Zylinder) im Code gebaut, mit leicht unregelmässigen Massen, damit es handgemacht wirkt.

## 6. Alte Plakate im Schweizer Stil

- **Eigene, erfundene Motive.** Keine echten Plakate nachbauen, keine echten Marken oder Firmen (kein SBB, keine Swissair, keine echten Tourismusorte als Werbung).
- **Stil:** Lithografie-Plakat der 1920er- bis 1950er-Jahre: grosse flache Farbflächen, wenige Farben aus dem Farbkonzept, starke Silhouetten, grosse Schrift unten oder oben, leichte Papiervergilbung und Knicke.
- **Umsetzung:** im Code auf ein Canvas gezeichnet und als Textur verwendet, bei jedem Laden leicht anders angeordnet (z. B. 3 bis 4 von 8 Motiven im Büro, 2 bis 3 im Dorf).
- **Motivideen** (Text je nach Sprache):
  - «Wolkenwil – Wo der Himmel bewilligt ist» (Berg, Dorf, eine geformte Wolke)
  - «Wolkenamt – Seit 1897 im Dienst» (Stempel und Schere über Wolken)
  - «Föhn ist meldepflichtig» (Amtsplakat, Windfahne, strenger Text)
  - «Formular 27b – jetzt auch in Grün»
  - «Alpaufzug 1931» (Kühe als Silhouetten)
  - «Besuchen Sie das Gipfeli am Himmel» (Bäckerei Moser)
  - «Schlitteln in Wolkenwil» (Winter)
  - «Amtliche Ruhezeit: 12.00–13.30 Uhr»

## 7. Damit es nicht KI-mässig aussieht

Recherche-Ergebnis aus dem letzten Chat: Typische KI-Merkmale sind Lila-Blau-Verläufe, Glas-Panels, Emojis als Icons, alles zentriert, gesperrte Grossbuchstaben-Labels, «→» an jedem Button, Creme mit Terrakotta oder Neon auf Schwarz.

Deshalb:
- **Keine** Emojis in der Bedienung, **keine** Verläufe als Deko, **kein** Glas, **kein** Bloom, **keine** Pfeile an Buttons, keine Grossbuchstaben-Labels (ausser dem Spieltitel WOLKENAMT).
- **Handgemacht wirken:** leicht unregelmässige Formen (keine perfekt gleichen Häuser, leicht schiefe Zäune, unterschiedliche Fenster), Papierkörnung auf Texturen, vereinzelt Abnutzung.
- **Orientierung an eigenständigen Spielen**, ohne zu kopieren: *A Short Hike* (wenige Farben, niedrige Auflösung möglich), *Untitled Goose Game* (flache Farben ohne Texturen), *Townscaper* (verspielte Häuser), *Wobbly Life* / *Human: Fall Flat* (Bewegungsgefühl).
- **Texte:** kurz, trocken, Schweizer Amtshumor. Keine Marketingsprache.

## 8. Technik

- **3D:** Three.js. Damit es auch ohne Internet getestet werden kann, liegt die Bibliothek als Datei im Ordner `lib/` (siehe `lib/LIESMICH.txt`). Laden per `<script type="importmap">` auf `./lib/three.module.min.js`.
- **Online:** `peerjs.min.js` ebenfalls lokal aus `lib/` laden (Fallback auf unpkg). Bestehendes Protokoll weiterverwenden und erweitern:
  - Position, Richtung und Animationszustand jedes Spielers mit 10 bis 15 Hz senden, beim Empfänger weich interpolieren.
  - Bestehende Nachrichten (`vote`, `start`, `done`, `results`, `final`, `chat`) bleiben.
- **Test ohne Internet:** `?lokaltest` (BroadcastChannel, mehrere Tabs) muss weiter funktionieren.
- **Leistung:** muss auf einem normalen Schul-Laptop flüssig laufen (Ziel 60 fps, höchstens ein paar hundert Objekte, Schatten nur von einer Lichtquelle).
- **Struktur:** `js/game.js` aufteilen, z. B. `js/i18n.js`, `js/world3d.js`, `js/beamtli.js`, `js/posters.js`, `js/net.js`, `js/cut2d.js` (bestehende 2D-Logik), `js/main.js`. Weiterhin ohne Build-Schritt (ES-Module).
- **GitHub Pages** muss weiter funktionieren (nur relative Pfade).

## 9. Meilensteine (der Reihe nach, jeden testen)

1. **Grundgerüst 3D:** Three.js aus `lib/`, Toon-Licht, Dorfplatz und Büro als einfache Formen, eine Beamtli-Figur, die man steuern kann, Kamera folgt. Screenshot prüfen.
2. **Wackel-Animation** der Beamtli (Federn, Watscheln, Umkippen) und Kollision.
3. **Büro ausbauen** (Pult, Schränke, Fenster, Treppe, Tür) und **Plakate** als Canvas-Texturen.
4. **Szenenwechsel:** Pult → 2D-Stempelansicht (bestehender Schreibtisch), Plattform → 2D-Schneideansicht (bestehende Wolkenlogik), danach zurück in 3D. Auflösung auf dem Dorfplatz.
5. **Online:** drei Beamtli sichtbar, Positionen synchron, bestehender Ablauf (Abstimmung, Schneiden, Ergebnis) eingebaut.
6. **Deutsch / Englisch** komplett.
7. **Feinschliff:** Ton, Handy-Steuerung, README aktualisieren, ZIP.

Nach jedem Meilenstein: kurz zeigen, was neu ist, mit Screenshot.

## 10. Was bleiben muss

- Duchy-Games-Ladebildschirm und Tab-Icon.
- Alle 12 Anträge, Sonderanträge, Schlagzeilen und Kommentare (nur übersetzen).
- Postkarte zum Speichern.
- Text-Funk und Sprachkanal-Vorschau im Online-Modus.
- Speicherstand im `localStorage`.
