<p align="center"><img src="img/duchy-logo-rund.png" width="110" alt="Duchy Games"></p>

# WOLKENAMT – Amt für Himmelsgestaltung

> *Sie formen, was die Leute sehen.*

Du arbeitest beim **Wolkenamt** der Gemeinde Wolkenwil. Als kleines, wackeliges **Beamtli** mit Amtsmütze läufst du durch ein uraltes Amtsbüro, stempelst am Pult die Anträge aus dem Dorf, kurbelst auf dem Dach die Wolke hoch und schneidest sie in Form. Danach stehst du auf dem Dorfplatz, die Leute zücken die Handys, und der *Wolkenwiler Anzeiger* berichtet.

Ein Browserspiel ohne Installation und ohne Server, gebaut mit HTML, CSS, JavaScript und Three.js. Deutsch und Englisch.

**Status:** Testversion v0.4 (3D-Welt, Online zu dritt)

---

## So läuft eine Runde

1. **Amtsbüro (3D):** Zum Pult laufen und **E** drücken. Die Kamera fährt auf die Tischplatte.
2. **Stempeln (2D):** Anträge bewilligen oder ablehnen. Es gibt nur begrenzt Wolken pro Tag.
3. **Wolkenplattform (3D):** Die Treppe hoch aufs Dach, an der Kurbel **E** drücken.
4. **Schneiden (2D):** Die Wolke mit der Schere in Form bringen und freigeben.
5. **Dorfplatz (3D):** Die Wolke fliegt heran, das Dorf schaut hoch, die Zeitung erscheint.
6. Am Abend kommt der **Tagesbericht** mit deinem Ansehen.

## Spielmodi

| Modus | Beschreibung |
|---|---|
| **Arbeitswoche** | 6 Arbeitstage mit 12 Anträgen und 5 Sonderanträgen. Tagesbericht mit Ansehen und Rang. |
| **Freie Wolke** | Forme irgendetwas. Das Dorf rätselt, was es sein soll. Als Postkarte speicherbar. |
| **Online spielen** | Bis 3 Personen, jede bei sich zuhause. Alle laufen als Beamtli durchs Amt (Signalrot, Gletscherblau, Aktenocker). Amtssitzung am Pult, dann alle aufs Dach, gleiche Startwolke, am Schluss Beamter/in des Monats. Mit Text-Funk; der Sprachkanal ist vorerst nur als Vorschau sichtbar. |
| **Zu dritt an einem Gerät** | Nacheinander am selben Gerät (Pass & Play), nur in der 2D-Schneideansicht. |

## Steuerung

| Aktion | Tastatur / Maus | Handy |
|---|---|---|
| Gehen | `WASD` oder Pfeiltasten | Joystick links |
| Hüpfen | Leertaste | runde Taste rechts |
| Benutzen (Pult, Kurbel) | `E` | «Benutzen» |
| Kamera drehen | Maus ziehen | – |
| Schneiden | linke Maustaste ziehen, `1` grosse / `2` feine Schere | Finger |
| Dampf (Wolke auffüllen) | rechte Maustaste oder `3` | Knopf «Dampf» |
| Schablone kurz zeigen | `H` | Knopf |
| Wolke freigeben | `Enter` | Knopf «Freigeben» |
| Zur Zentrale | `Esc` | Knopf «Zentrale» |

Wer zu schnell über die Türschwelle oder den Brunnenrand rennt, stolpert. Das ist Absicht.

## Gestaltung

Farbkonzept **«Alpenplakat × Amtsstube»**: Draussen die flachen Farben alter Schweizer Tourismusplakate (Himmel, Gletscher, Matte, Schnee, Chaletholz, Signalrot), drinnen das warme Amtsbüro von 1930 (Linoleum, Aktenocker, Papier, Stempelblau, Nussholz, Lampenlicht). Tinte `#22303A` für Linien, Schrift und Augen. Keine weiteren Farben.

- **Toon-Shading** mit drei harten Helligkeitsstufen, eine warme Hauptlichtquelle mit Schatten, kühles Umgebungslicht.
- **Beamtli:** eigene Figur von Duchy Games. Bohnenkörper, Amtsmütze mit goldenem Abzeichen, zwei Punktaugen, Krawatte, Stummelarme. Das Wackeln ist selbst gebaut: Federn für Rumpf, Mütze und Arme, Watscheln, Nachschwingen, Umkippen und Aufstehen.
- **Dorfleute** mit Filzhut, Kopftuch oder Zipfelmütze.
- **Plakate:** 8 erfundene Motive im Stil der Lithografie-Plakate (1920–1950), im Code gezeichnet, mit Vergilbung und Knicken. Bei jedem Laden hängen andere im Büro und im Dorf.
- Alles aus Grundformen im Code gebaut, leicht unregelmässig. Keine 3D-Modelle, keine Bilddateien ausser dem Logo.
- **Schriften:** *Young Serif*, *Schibsted Grotesk*, *Courier Prime* (Google Fonts).

---

## Lokal starten

Wegen der ES-Module braucht es einen kleinen lokalen Webserver (ein Doppelklick auf `index.html` reicht nicht mehr):

```bash
cd wolkenamt
python3 -m http.server 8000
```

Dann im Browser `http://localhost:8000` öffnen.

Three.js und PeerJS liegen im Ordner `lib/`. Das Spiel läuft darum auch ohne Internet. Fehlt PeerJS lokal, wird es von unpkg.com nachgeladen.

## Online spielen (zu dritt, verschiedene Orte)

1. Das Spiel muss online erreichbar sein (z. B. über GitHub Pages, siehe unten).
2. Eine Person klickt **Online spielen → Neuen Raum eröffnen** und schickt den **Raum-Code** oder den **Einladungslink**.
3. Die anderen öffnen den Link oder geben den Code bei **Raum beitreten** ein.
4. Bis die Sitzung beginnt, können alle im Amt herumlaufen. Der Host wählt die Rundenzahl und klickt **Sitzung eröffnen**.

Technik: Die Browser verbinden sich direkt per WebRTC ([PeerJS](https://peerjs.com/)). Positionen werden mit 12 Hz gesendet und beim Empfänger weich interpoliert. Der Host ist die «Zentrale» und verteilt den Spielstand.

Hinweise:
- Den Spiel-Tab im Vordergrund lassen. Browser bremsen Spiele in Hintergrund-Tabs.
- Wenn der Host das Spiel schliesst, endet der Raum für alle.
- In manchen Firmen- oder Schulnetzen ist WebRTC gesperrt. Zuhause funktioniert es normalerweise.
- **Test ohne Internet:** `index.html?lokaltest` in mehreren Tabs desselben Browsers öffnen (über den lokalen Webserver).

## Auf GitHub hochladen und als Website veröffentlichen

**Variante A: ohne Git (am einfachsten)**

1. Auf github.com auf **New repository** klicken, Name `wolkenamt`, Sichtbarkeit **Public** (GitHub Pages ist gratis nur für öffentliche Repos), dann **Create repository**.
2. Auf **uploading an existing file** klicken und den *Inhalt* des Ordners `wolkenamt` hineinziehen (`index.html`, `README.md`, Ordner `css`, `js`, `img`, `lib`), dann **Commit changes**.
3. **Settings → Pages → Source: «Deploy from a branch» → Branch `main` / `(root)` → Save**.
4. Nach 1–2 Minuten ist das Spiel unter `https://<DEIN-NAME>.github.io/wolkenamt/` online.

**Variante B: mit Git**

```bash
cd wolkenamt
git init
git add .
git commit -m "WOLKENAMT v0.4 – 3D-Welt mit Beamtli"
git branch -M main
git remote add origin https://github.com/<DEIN-NAME>/wolkenamt.git
git push -u origin main
```

Danach wie in Variante A unter **Settings → Pages** den Branch `main` / `(root)` wählen.

> Sicherheitstipp: Zum Pushen einen Personal Access Token oder SSH verwenden, nie das Passwort. Keine Tokens oder Passwörter im Repo ablegen.

---

## Projektstruktur

```
wolkenamt/
├── index.html          # Aufbau: 3D- und 2D-Canvas, Menü, Formulare, Overlays
├── css/style.css       # Gestaltung (Papier und Tinte, HUD, Handy-Steuerung)
├── js/
│   ├── main.js         # Ablauf: Menü, Pult, Plattform, Dorfplatz, Mehrspieler
│   ├── world3d.js      # 3D-Welt: Amtshaus, Dorf, Physik, Kamera, Dorfleute
│   ├── beamtli.js      # Spielfigur mit Feder-Animation
│   ├── office.js       # Einrichtung des Büros, Wolkenplattform, Plakat-Plätze
│   ├── posters.js      # 8 Plakatmotive als Canvas-Zeichnungen
│   ├── cut2d.js        # 2D-Schneideansicht (Wolkenlogik aus v0.3)
│   ├── net.js          # Online-Protokoll (PeerJS / BroadcastChannel)
│   ├── data.js         # Anträge, Sonderanträge, Wochenplan, Dorfgespräch (DE/EN)
│   ├── texts.js        # Texte der Bedienung (DE/EN)
│   ├── i18n.js         # Sprachumschaltung
│   ├── audio.js        # Töne (alle im Code erzeugt)
│   ├── toon.js         # Toon-Material
│   └── palette.js      # Farbkonzept
├── lib/                # three.module.min.js (r160), peerjs.min.js (1.5.4)
├── img/                # Duchy-Games-Logo (Tab-Icon, README)
├── BRIEFING.md         # Auftrag für den 3D-Umbau
└── README.md
```

Wichtige Stellen:

- `data.js` → `ORDERS`: die 12 Anträge (Form, Texte, Schlagzeilen, Kommentare, jeweils `[deutsch, english]`)
- `data.js` → `SPECIALS`, `DAYS`, `TOD` (Farben der Tageszeiten, nur aus dem Farbkonzept)
- `texts.js`: alle Knöpfe und Hinweise. Neue Texte immer in beiden Sprachen eintragen.
- `world3d.js` → `ROOM`, `PLAYER`: Masse des Büros, Laufgeschwindigkeit, Sprunghöhe
- `net.js`: Online-Nachrichten `hello`, `players`, `pos`, `vote`, `pick`, `start`, `prog`, `done`, `results`, `final`, `chat`

Fortschritt, Ansehen, Sichtungen, Sprache und Ton werden im `localStorage` des Browsers gespeichert.

## Ideen für nächste Versionen

- [x] Online-Mehrspieler (bis 3 Personen)
- [x] 3D-Welt mit eigenen Figuren
- [x] Deutsch und Englisch
- [ ] Sprachkanal (Optik ist schon drin, Funktion folgt)
- [ ] «Wolke des Tages» für alle gleich, mit Teilen-Link
- [ ] Mehr Anträge und eine zweite Arbeitswoche
- [ ] Musik

---

Ein Spiel von **Duchy Games** (Herz & Zog) · Idee & Konzept: Jayson Herzog · Lizenz: noch offen · Three.js und PeerJS: MIT-Lizenz
