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

#### Erkennung (`src/analyser.js`, dünner Worker-Wrapper `src/worker.js`)
- **Multi-Pass-Algorithmus:**
  1. Basisklassifikation: Honorifike, Partikel, Rechtsformen, Abkürzungen, `KNOWN_NON_PERSONS` (Tech-Marken), Dictionary-Lookup, Genitiv-Namen („Annas", „Müllers"), Anrede-Kontext („Hallo X", „Liebe Grüße X"), Bindestrich-Namen
  2. Nachname-Chaining: Token nach erkanntem Name → ebenfalls Name (E-Mail/Telefon/Datum/Adresse geschützt)
  3. Konsistenz-Propagierung: Alle Vorkommen eines bestätigten Namens (Genitiv-bewusst, nur Nicht-Dictionary-Keys)
  4. Bilateraler Kontext: Uppercase-Token vor bekanntem Namen
  4b. Koordinations-Paare: „Xenia und Thomas" → beide Namen (rettet Satzanfänge)
  5. Verb-Kontext: Uppercase-Token direkt vor Verb → Satzanfangs-Namen
  6. Finale Propagierung: spät beförderte Namen werden textweit verteilt
- **Pre-Processing** (`preProcess`): E-Mails, Telefonnummern, optional Datumsangaben und Adressen werden vor der Tokenisierung durch Null-Byte-Marker ersetzt
- **Dictionary:** `enz/german-wordlist`, 675.556 Wörter, explizit ohne Eigennamen, als `Set` für O(1)-Lookup
- **Vornamenliste:** `public/firstnames.json` (generiert aus `scripts/build-firstnames.js`)
- **COMMON_SURNAMES:** ~160 häufigste deutsche Nachnamen inkl. Dictionary-Kollisionen (Müller, Schmidt, Jäger …)
- **Wort-Suffix-Filter:** Suffixe wie `-lich`, `-isch`, `-ung`, `-tion`, `-ität` → kein Name
- **Compound-Detection:** Zerlegung zusammengesetzter Wörter in 2-3 Teile, Prüfung gegen Dictionary
- **Satzanfangs-Guard:** Tokens am Satzanfang werden nicht automatisch als Name gewertet (Rettung via Vornamensliste, Nachnamensliste, Genitiv, Anrede, und/oder-Paar, Verb-Kontext, Propagierung)
- **Honorifik-Lookback:** Bis 8 Token rückwärts für Titelketten (Prof. Dr. med. Dr. h.c. mult.)
- **Konsistente Platzhalter:** Gleicher Name → gleicher Platzhalter im gesamten Text
- **Tests:** `src/analyser.test.js` (Vitest), `npm test`

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
- `scripts/build-firstnames.js`: Kuratierte ~2.000 Vornamen (DE, TR, AR, Slawisch, ES/PT, FA, Asiatisch, NL/Skandinavisch, EN) mit Kollisions-Blockliste → `public/firstnames.json`

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
│   ├── analyser.js             Multi-Pass-NER-Algorithmus (pure Funktionen)
│   ├── analyser.test.js        Vitest-Tests
│   ├── worker.js               Dünner Web-Worker-Wrapper um analyser.js
│   └── style.css               Gesamtes CSS inkl. Modal
├── public/
│   ├── dictionary.json         675k deutsche Wörter (generiert)
│   ├── firstnames.json         ~2.000 Vornamen (generiert)
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

- **Web: Ortsnamen** werden nicht erkannt (nur Personen) — das Dictionary enthält keine Orte, und ein Ortsnamen-Lookup wäre ein eigenes Feature
- **Web: Organisationsnamen** werden nicht erkannt (nur `KNOWN_NON_PERSONS`-Ausschluss bekannter Marken)
- **Keine Python-Tests** — `namescrub.py` / `namescrub_gui.py` sind ungetestet (Web hat Vitest)
- **Kein Web-Deploy-CI** — `dist/` wird manuell auf Plesk deployt (Release-Workflow existiert nur für Desktop-Binaries)
- **Präfix-Änderung mitten in der Session** wirkt nur auf neu vergebene Platzhalter — bereits vergebene behalten das alte Präfix bis zur nächsten Analyse

### Evaluierte Bibliotheken (Stand 2026-08)

- **Client-seitige NER-Modelle (Transformers.js + deutsches BERT-NER als ONNX):** technisch möglich, aber 40–100+ MB Modell-Download pro Nutzer — widerspricht dem „sofort im Browser"-Konzept. Position: NameScrub+ (spaCy) IST der KI-Pfad; als optionaler „Genauer-Modus" im Web denkbar → Langfrist-Roadmap.
- **compromise / wink-nlp:** nur Englisch, für deutsche NER unbrauchbar.
- **Verbesserungsweg im Web stattdessen:** größere Datenbasis (Vornamen-/Nachnamenlisten) + Kontext-Heuristiken — umgesetzt.

---

## Roadmap — geplante Features

### Kurzfristig (nächste Sessions)

#### Web
- [x] **E-Mail-Adressen** erkennen und anonymisieren (`user@domain.tld` → `Email-1`)
- [x] **Telefonnummern** erkennen (`+49 123 456789` → `Tel-1`)
- [x] **Datumsangaben** optional erkennen (`12.03.2024` → `Datum-1`)
- [x] **Konfigurierbare Labels** — User kann Platzhalter-Präfix selbst wählen (localStorage)

#### NameScrub+ Desktop
- [x] **GitHub Releases** mit vorgefertigten Executables (`.github/workflows/release.yml`, Tag `v*.*.*`)
- [x] **Honorifik-Fallback-Pass** in `namescrub.py` für „Frau Müller"-Fälle ohne Vornamen
- [x] **Fortschrittsbalken** in der GUI für lange Texte
- [x] **Batch-Verarbeitung** auch in der GUI (Ordner auswählen)

### Mittelfristig

#### Web
- [x] **Adressen** erkennen (Straße + Hausnummer, optional PLZ + Ort)
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
