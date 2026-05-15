# NameScrub — Plesk Deployment Guide

**Zieldomain:** `namescrub.nozilla.net`

---

## Was hochgeladen werden muss

Nach dem Build-Prozess enthält der Ordner `/dist` **alle** Dateien, die auf den Server müssen.
Lade **den gesamten Inhalt** von `/dist` in das **Dokumentenstamm-Verzeichnis** (Document Root) der Domain hoch.

```
/dist/
├── index.html          → Einstiegspunkt der App
├── .htaccess           → Apache-Konfiguration (Caching, Headers, CSP)
├── dictionary.json     → Deutsches Wörterbuch (233k Wörter, ~3.3 MB)
└── assets/
    ├── main-[hash].js  → Gebündeltes JavaScript (inkl. Web Worker)
    └── main-[hash].css → Gebündeltes CSS
```

> **Wichtig:** Lade den *Inhalt* von `/dist` hoch, nicht den Ordner selbst.
> Die `index.html` muss direkt im Document Root liegen.

---

## Build-Schritte (lokal oder auf dem CI-Server)

```bash
# 1. Abhängigkeiten installieren (einmalig)
npm install

# 2. Deutsches Wörterbuch herunterladen und optimieren
npm run build:dict

# 3. Produktions-Build erzeugen
npm run build:plesk
# → Ausgabe in /dist/
```

**Node.js Anforderung:** v18 oder höher (getestet auf v21.7.3)

---

## Plesk-Einstellungen

### 1. Document Root setzen
In Plesk → **Domains → namescrub.nozilla.net → Hosting-Einstellungen**:
- Document Root: `/httpdocs` (Standard) oder angepasster Pfad
- PHP-Unterstützung: **nicht nötig** (reine statische App)

### 2. Dateien hochladen
Über Plesk File Manager oder per FTP/SFTP:
```
Ziel: /var/www/vhosts/nozilla.net/namescrub.nozilla.net/httpdocs/
```

Alle Dateien aus `/dist/` dorthin kopieren (inkl. `.htaccess`).

### 3. Apache-Module prüfen
Die `.htaccess` nutzt diese Apache-Module — sollten auf Plesk standardmäßig aktiv sein:
- `mod_deflate` (Komprimierung)
- `mod_expires` (Browser-Caching)
- `mod_headers` (Security-Header)
- `mod_rewrite` (SPA-Fallback)

Falls ein Modul fehlt: Plesk → **Tools & Einstellungen → Apache-Webserver**.

### 4. HTTPS sicherstellen
In Plesk → **SSL/TLS-Zertifikate** → Let's Encrypt aktivieren.
Die CSP in `.htaccess` erlaubt nur HTTPS-Ressourcen.

---

## Aktualisierungen einspielen

```bash
npm run build:plesk        # neuen /dist-Build erzeugen
# Dann /dist-Inhalt erneut hochladen (alte Dateien überschreiben)
```

Da Vite gehashte Dateinamen erzeugt (`main-abc123.js`), werden alte Versionen
automatisch durch neue ersetzt. Browser-Caches werden dadurch automatisch invalidiert.

---

## Schnell-Test nach dem Upload

1. Browser öffnen: `https://namescrub.nozilla.net`
2. Status-Badge muss von „Wörterbuch wird geladen…" auf „Bereit" wechseln
3. Deutschen Text einfügen → „Analyse starten" → Eigennamen erscheinen gelb markiert
4. Browser-DevTools → Network: `dictionary.json` sollte mit Status 200 laden
5. Browser-DevTools → Console: keine Fehler

---

## Datenschutz-Hinweis für Nutzer

NameScrub verarbeitet **alle Texte ausschließlich im Browser**. Nach dem ersten Laden
der Seite findet **keinerlei Netzwerkkommunikation** statt. Die Texte verlassen das Gerät
des Nutzers zu keinem Zeitpunkt.
