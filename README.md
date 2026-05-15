# NameScrub

**Anonymisierung deutscher Texte — 100% lokal, 100% privat.**

## Sicherheitsversprechen

> Ihre Daten verlassen niemals Ihren Browser.

NameScrub verarbeitet alle Texte ausschließlich im Browser des Nutzers. Es gibt:

- **keinen Server**, der Daten empfängt
- **keine Datenbank**, die Texte speichert
- **kein Tracking**, keine Analytics, keine Cookies
- **keine Netzwerkanfragen** nach dem ersten Laden der Seite

Das Wörterbuch wird einmalig geladen und lokal vorgehalten. Der gesamte Abgleich läuft in einem Web Worker — isoliert vom UI-Thread, aber niemals außerhalb Ihres Geräts.

## Funktionsweise

1. Text einfügen
2. **Analyse starten** — Wörter, die nicht im deutschen Wörterbuch gefunden werden, werden gelb markiert
3. Markierte Wörter per Klick einzeln entfernen, oder **Namen entfernen** für alle auf einmal
4. Anonymisierten Text per **In Zwischenablage kopieren** weiterverarbeiten

## Technischer Hintergrund

- **Architektur:** Pure Client-Side, Zero-Server-Footprint
- **Wörterbuch:** Basiert auf [wortliste](https://github.com/davidak/wortliste) (Open Source)
- **Performance:** Web Worker + O(1)-Set-Lookup
- **Design:** Neo-Brutalismus

## Lokale Entwicklung

```bash
npm install
npm run build:dict   # Wörterbuch aufbereiten
npm run dev          # Dev-Server starten
```

## Deployment

GitHub Actions deployed automatisch auf GitHub Pages bei jedem Push auf `main`.

## Lizenz

MIT
