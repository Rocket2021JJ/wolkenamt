# FEIERABEND

Ein Spass-Spiel von **Duchy Games** (Herz & Zog).
Die Beamtli aus HOCHDRUCK haben Dienstschluss: herumtollen, stolpern, Sachen werfen, Auto fahren, goldene Stempel finden.
Man spielt allein oder zu dritt online (PeerJS, ohne eigenen Server).

## Steuerung
- WASD: laufen, Shift: rennen, Leertaste: springen
- Klick: aufheben. Klick halten und loslassen: werfen. Rechtsklick: ablegen
- E: einsteigen, Kanone, Glocke, Kegel
- R: hinfallen, Q: winken, B: rufen, Tab: Erlebnisse, Esc: Menü
- Im Fahrzeug: W/S, A/D, Leertaste (Handbremse), H (Hupe)

## Technik
- Three.js r160 (lib/), eigene Kugel-Physik (js/props.js, js/solid.js), kein Build-Schritt
- Alle Grafiken, Klänge, Stimmen und Musik werden im Code erzeugt (eigene Werke, keine fremden Dateien)
- Online: js/net.js, Host rechnet Requisiten, Tiere und Dorfleute
- Zum Testen ohne Internet: `?lokaltest` in zwei Tabs

© Duchy Games. Alle Rechte vorbehalten.
