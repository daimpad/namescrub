# CLAUDE.md — NameScrub Projektkontext

Diese Datei dokumentiert den aktuellen Stand, die Architektur und die geplante Roadmap für zukünftige Claude-Code-Sessions.

---

## Projektübersicht

**NameScrub** anonymisiert deutsche Texte, indem Eigennamen durch nummerierte Platzhalter (`Name-1`, `Name-2` …) ersetzt werden. Zwei Varianten:

- **NameScrub Web** — Vite + Vanilla JS, läuft 100% im Browser
- **NameScrub+ Desktop** — Python + spaCy NER, Tkinter GUI, läuft lokal ohne Browser

Live-URL: `https://namescrub.nozilla.net`  
Hosting: Plesk / Apache Static Files  
Repo: `https://github.com/daimpad/namescrub`  
Branch-Konvention: Feature-Branches, Merge in `main`

---

## Was bisher umgesetzt wurde

### NameScrub Web (`src/`, `public/`, `index.html`)

#### Erkennung (Web Worker `src/worker.js`)
- **5-Pass-Algorithmus:**
  1. Basisklassifikation: Honorifike, Partikel, Rechtsformen, Abkürzungen, Dictionary-Lookup
  2. Nachname-Chaining: Token nach erkanntem Name → ebenfalls Name
  3. Konsistenz-Propagierung: Alle Vorkommen eines bestätigten Namens im Text
  4. Bilateraler Kontext: Uppercase-Token vor bekanntem Namen
  5. Verb-Kontext: Uppercase-Token direkt vor Verb → Satzanfangs-Namen
- **Dictionary:** `enz/german-wordlist`, 675.556 Wörter, explizit ohne Eigennamen, als `Set` für O(1)-Lookup
- **Vornamenliste:** 810 Vornamen (DE, EN, FR, TR, PL, RU, IT, AR, GR, VN) in `public/firstnames.json`
- **Wort-Suffix-Filter:** Suffixe wie `-lich`, `-isch`, `-haft`, `-ung`, `-schaft` → kein Name
- **Compound-Detection:** Zerlegung zusammengesetzter Wörter in 2-3 Teile, Prüfung gegen Dictionary
- **Satzanfangs-Guard:** Tokens am Satzanfang werden nicht automatisch als Name gewertet (außer via Kontext)
- **Honorifik-Lookback:** Bis 8 Token rückwärts für Tittelketten (Prof. Dr. med. Dr. h.c. mult.)
- **Bindestrich-Namen:** Hans-Peter → beide Teile uppercase, keiner im Dictionary → Name
- **Konsistente Platzhalter:** Gleicher Name → gleicher Platzhalter im gesamten Text

#### UI (`src/app.js`, `index.html`, `src/style.css`)
- Interaktives Token-Popup: `× Löschen`, `✓ Kein Name`, `↔ Name-X ersetzen`
- „Alle ersetzen" (Bulk-Modus)
- „In Zwischenablage kopieren"
- Strg+Enter startet Analyse
- Lade-Status im Header
- Legende mit Farbkodierung
- **NameScrub+ Modal:** Button im Header → Modal mit Erklärung, Vergleichstabelle, Voraussetzungen, Download-Link

#### Build (`package.json`, `scripts/`)
- `npm run build`: Dictionary-Build + Vornamen-Build + Vite-Build
- `scripts/build-dictionary.js`: Lädt `enz/german-wordlist`, erzeugt `public/dictionary.json`
- `scripts/build-firstnames.js`: Hardcodierte 810 Vornamen → `public/firstnames.json`

#### Deployment (`public/.htaccess`, `dist/.htaccess`)
- Apache-Regeln: Asset-Extension Early-Exit (verhindert MIME-Fehler bei SPA-Fallback)
- CSP, Gzip, Caching-Header
- SPA-Fallback: alle nicht-existierenden Pfade → `index.html`

---

### NameScrub+ Desktop (`cli/`)

#### `cli/namescrub.py` — Kern-Logik + CLI
- spaCy `de_core_news_lg` (Fallback: `de_core_news_md`)
- Erkennt: PER, ORG, LOC (konfigurierbar via `-e`)
- Konsistente Platzhalter: `Name-X`, `Org-X`, `Ort-X`
- **Vollname-vor-Kurzname-Verarbeitung:** Entitäten längste zuerst → Platzhalter-Vererbung
- **Partial-Name-Matching (2. Pass):** Regex-Pass nach Entity-Pass ersetzt Komponenten von Mehrwort-Entitäten auch dort, wo spaCy sie ohne Kontext nicht erkannt hat (z.B. „Schneider" nach „Thomas Schneider")
- Batch-Modus: mehrere Dateien / Glob-Muster, Fortschrittsanzeige
- Interaktiver Modus (`--interactive`): jede Entität bestätigen/überspringen/umbenennen
- `--list`: Entitäten anzeigen ohne Ersetzen
- stdin/stdout-Unterstützung

#### `cli/namescrub_gui.py` — Tkinter Desktop-GUI
- Zwei-Spalten-Layout: Eingabe links, Ergebnis rechts
- Asynchrones Modell-Laden via `threading`
- Farbige Platzhalter-Hervorhebung (schwarz/grün, nozilla-Design)
- Buttons: Analyse, Datei öffnen, Speichern als, In Zwischenablage
- Checkboxen für Entitätstypen (PER / ORG / LOC)
- Logo-PNG aus `public/namescrub_logo_header.png`
- Strg+Enter startet Analyse

#### `cli/build_exe.py` — PyInstaller-Build-Script
- `--onefile --windowed` (kein Konsolenfenster)
- Bündelt spaCy-Daten und Modell-Dateien
- Ausgabe: `cli/dist/NameScrub(.exe)`

---

## Design-System (nozilla Neo-Brutalism)

| Token | Wert |
|-------|------|
| `BG` | `#FFFEE5` — Papier-Gelb |
| `INK` | `#000000` — Schwarz |
| `GREEN` | `#00FF9C` — Akzent |
| `GREEN2` | `#00E88D` — Hover |
| Schatten | `10px 10px 0 #000` |
| Schrift | Inter (UI), Space Mono (Code/Output), Zilla Slab (Logo) |

---

## Dateistruktur

```
namescrub/
├── index.html                  Haupt-HTML (SPA)
├── src/
│   ├── app.js                  UI-Logik, Modal, Popup, Mapping
│   ├── worker.js               5-Pass-NER-Algorithmus (Web Worker)
│   └── style.css               Gesamtes CSS inkl. Modal
├── public/
│   ├── dictionary.json         675k deutsche Wörter (generiert)
│   ├── firstnames.json         810 Vornamen (generiert)
│   ├── namescrub_logo_header.png  Logo für Desktop-GUI
│   ├── namescrub_logo_long.svg    Logo für Web-Header
│   └── .htaccess               Apache-Regeln
├── cli/
│   ├── namescrub.py            CLI + Kern-Logik (spaCy)
│   ├── namescrub_gui.py        Tkinter Desktop-GUI
│   ├── build_exe.py            PyInstaller-Build
│   └── requirements.txt
├── scripts/
│   ├── build-dictionary.js     Wörterbuch-Build-Script
│   └── build-firstnames.js     Vornamenlisten-Build-Script
├── dist/                       Produktions-Build (nicht in Git außer .htaccess)
├── DEPLOY.md                   Deployment-Anleitung
└── CLAUDE.md                   Diese Datei
```

---

## Bekannte Einschränkungen / Tech-Debt

- **Honorifik + Nachname ohne Vorname** (z.B. „Frau Müller"): spaCy erkennt dies nicht immer als PER — ein zusätzlicher regelbasierter Honorifik-Pass in `namescrub.py` würde helfen
- **Web: Ortsnamen** werden nicht erkannt (nur Personen) — das Dictionary enthält keine Orte, und ein Ortsnamen-Lookup wäre ein eigenes Feature
- **Web: Organisationsnamen** werden nicht erkannt
- **Keine automatisierten Tests** — weder für `worker.js` noch für `namescrub.py`
- **Kein CI/CD** — Build und Deploy sind manuelle Schritte
- **Keine GitHub Releases** — NameScrub+ wird aktuell als Quellcode-ZIP verteilt

---

## Roadmap — geplante Features

### Kurzfristig (nächste Sessions)

#### Web
- [ ] **E-Mail-Adressen** erkennen und anonymisieren (`user@domain.tld` → `Email-1`)
- [ ] **Telefonnummern** erkennen (`+49 123 456789` → `Tel-1`)
- [ ] **Datumsangaben** optional erkennen (`12.03.2024` → `Datum-1`)
- [ ] **Konfigurierbare Labels** — User kann Platzhalter-Präfix selbst wählen

#### NameScrub+ Desktop
- [ ] **GitHub Releases** mit vorgefertigten Executables (Windows .exe, macOS .app, Linux)
- [ ] **Honorifik-Fallback-Pass** in `namescrub.py` für „Frau Müller"-Fälle ohne Vornamen
- [ ] **Fortschrittsbalken** in der GUI für lange Texte
- [ ] **Batch-Verarbeitung** auch in der GUI (Ordner auswählen)

### Mittelfristig

#### Web
- [ ] **Adressen** erkennen (Straße + Hausnummer + PLZ + Ort)
- [ ] **IBAN / Kontonummern** erkennen
- [ ] **Mehrsprachige Unterstützung** (EN, FR, …) — eigene Dictionaries

#### NameScrub+ Desktop
- [ ] **DOCX/PDF Ein- und Ausgabe** (python-docx, pdfminer)
- [ ] **Konfigurationsdatei** für persistente Einstellungen
- [ ] **Auto-Update** Prüfung beim Start
- [ ] **Dunkelmodus** in der GUI

### Langfristig
- [ ] **Browser-Extension** — direktes Anonymisieren in Webformularen
- [ ] **VS Code Extension** — Anonymisieren im Editor
- [ ] **API-Modus** für lokale Dienste (FastAPI-Server, nur im LAN)
- [ ] **Eigenes Feintuning** des NER-Modells auf deutschen Datenschutz-Texten

---

## Entwicklungshinweise für Claude Code

- **Branch-Konvention:** Feature-Branches `claude/<beschreibung>`, Merge in `main`
- **Nach jedem Feature:** `npm run build` ausführen, `dist/` mitcommiten
- **Commit-Style:** Englisch, imperativ, erste Zeile max. 72 Zeichen
- **Kein CSS-Framework** — alles in `src/style.css` nach nozilla-Design-System
- **Kein TypeScript** — Vanilla JS mit ES Modules
- **Worker-Kommunikation** über `postMessage` mit `{id, action, payload}` Schema
- **Python-Kompatibilität:** `cli/` muss mit Python 3.9+ laufen (kein 3.10+-only Syntax außer `str | None` — via `from __future__ import annotations` absichern falls nötig)
- **spaCy-Modell** ist NICHT im Repo — Nutzer laden es selbst; `load_model()` hat Fallback-Logik

---

## Wichtige Kommandos

```bash
# Web-Entwicklung
npm run dev              # Vite Dev-Server
npm run build            # Vollständiger Prod-Build
npm run build:names      # Nur Vornamenliste neu generieren

# Desktop
python cli/namescrub_gui.py          # GUI starten
python cli/namescrub.py --help       # CLI-Hilfe
python cli/build_exe.py              # Executable bauen

# Git
git add <files> && git commit -m "..."
git push -u origin <branch>
```
