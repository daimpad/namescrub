<div align="center">
  <img src="public/namescrub_logo_long.svg" alt="NameScrub" height="80" />
  <br/><br/>
  <strong>Anonymisierung deutscher Texte — direkt im Browser oder als Desktop-App.</strong>
  <br/><br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-black?style=flat-square)](LICENSE)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-black?style=flat-square&logo=vite&logoColor=00FF9C)](https://vitejs.dev)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-black?style=flat-square&logo=javascript&logoColor=00FF9C)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Zero Server](https://img.shields.io/badge/Zero--Server-100%25%20lokal-black?style=flat-square)](https://namescrub.nozilla.net)
[![nozilla](https://img.shields.io/badge/by-nozilla-00FF9C?style=flat-square)](https://nozilla.de)

</div>

---

## Was ist NameScrub?

NameScrub erkennt Eigennamen in deutschen Texten und ersetzt sie durch nummerierte Platzhalter — `Name-1`, `Name-2` usw. Der Text bleibt **lesbar und zusammenhängend**, Personen sind aber nicht mehr identifizierbar.

> **Datenschutzversprechen:** Kein Wort verlässt Ihren Browser (Web) bzw. Ihren Rechner (Desktop). Keine API, kein Server, kein Logging.

Es gibt zwei Varianten:

| | NameScrub Web | NameScrub+ Desktop |
|---|---|---|
| **Technik** | Regelbasiert — Wörterbuch + Heuristiken | KI-basiert — spaCy NER-Modell |
| **Start** | Sofort im Browser, kein Install | Python 3.9+ + Modell-Download (~560 MB) |
| **Entitäten** | Personen (Namen) | Personen, Orte, Organisationen |
| **Fehlerrate** | Moderat | Deutlich geringer |
| **Batch** | Nein | Ja — ganze Ordner auf einmal |
| **Dateien** | Nur Texteingabe | Öffnen & Speichern per Klick |

---

## NameScrub Web

### Features

| | |
|---|---|
| 🔒 **100% lokal** | Verarbeitung via Web Worker, kein Netzwerk nach dem Laden |
| 🔄 **Konsistente Platzhalter** | Dasselbe Vorkommen eines Namens erhält überall denselben Platzhalter |
| 🖱️ **Interaktives Popup** | Pro markiertem Wort: `× Löschen` · `✓ Kein Name` · `↔ Name-X ersetzen` |
| ⚡ **Bulk-Modus** | „Alle ersetzen" nummeriert alle erkannten Namen in einem Schritt |
| 🎯 **5-Pass-Erkennung** | Honorifik, Suffix, Kontext, Konsistenz, Verb-Kontext |
| 📚 **675.000 Wörter** | [`enz/german-wordlist`](https://github.com/enz/german-wordlist) — explizit ohne Eigennamen |
| 🏷️ **810 Vornamen** | Mehrsprachige Vornamenliste (DE, EN, FR, TR, PL, RU, IT, AR, GR, VN) |

### Erkennungs-Algorithmus

NameScrub nutzt einen **5-Pass-Algorithmus** im Web Worker:

```
Pass 1 — Basisklassifikation
  ├─ Honorifike (Herr, Frau, Dr., Prof. Dr. med., …) → Kontext-Marker
  ├─ Partikel (von, van, de, zu, …) → transparent
  ├─ Abkürzungen / Rechtsformen (GmbH, AG, e.V., USA) → skip
  ├─ Vornamenliste (810 Einträge, mehrsprachig) → Name
  └─ Dictionary-Lookup (675k Wörter) mit Wort-Suffix-Filter

Pass 2 — Nachname-Chaining
  └─ Token nach erkanntem Namen + Großbuchstabe → Name
     Deckt "Vorname Nachname" und "Herr von Müller" ab

Pass 3 — Konsistenz-Propagierung
  └─ Alle Vorkommen eines bestätigten Namens im Text → Name

Pass 4 — Bilateraler Kontext
  └─ Uppercase-Token vor einem bestätigten Namen → Name

Pass 5 — Verb-Kontext
  └─ Uppercase-Token direkt vor Verb → Name
     Fängt Satzanfangsnamen ab ("Müller arbeitet hier.")
```

### Lokale Entwicklung

```bash
git clone https://github.com/daimpad/namescrub.git
cd namescrub
npm install
npm run build        # Wörterbuch + Vornamen aufbereiten + Vite-Build
npm run dev          # → http://localhost:5173
```

### Produktions-Build

```bash
npm run build
# → dist/ — direkt in den Webserver-Root kopieren
```

Der Ordner `dist/` enthält alles, kein Node.js auf dem Server nötig. Details: [`DEPLOY.md`](DEPLOY.md)

---

## NameScrub+ Desktop

NameScrub+ ist eine Python-Desktop-App, die statt Wörterbuch-Heuristiken ein trainiertes KI-Modell nutzt: **[spaCy de_core_news_lg](https://spacy.io/models/de)**, ein deutsches Named-Entity-Recognition-Modell.

### Schnellstart

```bash
pip install spacy
python -m spacy download de_core_news_lg   # ~560 MB, einmalig
python cli/namescrub_gui.py                # Desktop-GUI starten
```

### CLI

```bash
# Einzeldatei
python cli/namescrub.py bericht.txt

# Mit Ausgabedatei
python cli/namescrub.py bericht.txt -o anonym.txt

# Batch: ganzer Ordner
python cli/namescrub.py docs/*.txt -o ausgabe/

# Personen + Orte + Organisationen
python cli/namescrub.py text.txt -e PER,ORG,LOC

# Interaktive Prüfung
python cli/namescrub.py text.txt --interactive

# Erkannte Entitäten auflisten (kein Ersetzen)
python cli/namescrub.py text.txt --list

# stdin
cat text.txt | python cli/namescrub.py
```

### Als Executable bauen

```bash
pip install pyinstaller
python cli/build_exe.py
# → cli/dist/NameScrub(.exe)
```

### Dateien

```
cli/
├── namescrub.py       Kern-Logik + CLI (spaCy NER, Batch-Modus)
├── namescrub_gui.py   Tkinter Desktop-GUI
├── build_exe.py       PyInstaller-Build-Script
└── requirements.txt   Abhängigkeiten
```

---

## Tech Stack

| Schicht | Technologie |
|---------|-------------|
| Build | [Vite 5](https://vitejs.dev) |
| Sprache (Web) | Vanilla JavaScript (ES Modules) |
| Analyse (Web) | [Web Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) |
| Wörterbuch | [`enz/german-wordlist`](https://github.com/enz/german-wordlist) · 675k Einträge |
| Sprache (Desktop) | Python 3.9+ |
| NER-Modell | [spaCy de_core_news_lg](https://spacy.io/models/de) |
| GUI | Tkinter |
| Design | [nozilla CI](https://nozilla.de) — Neo-Brutalism |

---

## Architektur (Web)

```
Browser
├── app.js         UI, Popup, Name-Mapping, Clipboard, Modal
└── worker.js      5-Pass-Analyse (off-thread)
     ├── dictionary.json    675k Wörter (einmalig geladen)
     └── firstnames.json    810 Vornamen
```

Kein Netzwerkzugriff nach dem initialen Laden.

---

## Lizenz

MIT License — Copyright (c) 2026 [nozilla](https://nozilla.de)

---

<div align="center">

Ein Projekt von **[nozilla](https://nozilla.de)** — bits & bytes mit ❤

</div>
