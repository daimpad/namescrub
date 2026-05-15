<div align="center">
  <img src="public/namescrub_logo_long.svg" alt="NameScrub" height="80" />
  <br/><br/>
  <strong>Anonymisierung deutscher Texte — direkt im Browser.</strong>
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

> **Datenschutzversprechen:** Kein Wort verlässt Ihren Browser. Keine API, kein Server, kein Logging.

---

## Features

| | |
|---|---|
| 🔒 **100% lokal** | Verarbeitung via Web Worker, kein Netzwerk nach dem Laden |
| 🔄 **Konsistente Platzhalter** | Dasselbe Vorkommen eines Namens erhält überall denselben Platzhalter |
| 🖱️ **Interaktives Popup** | Pro markiertem Wort: `× Löschen` · `✓ Kein Name` · `↔ Name-X ersetzen` |
| ⚡ **Bulk-Modus** | „Alle ersetzen" nummeriert alle erkannten Namen in einem Schritt |
| 🎯 **Mehrstufige Erkennung** | 4 Analyse-Pässe mit Honorifik-, Suffix-, Kontext- und Konsistenz-Logik |
| 📚 **675.000 Wörter** | [`enz/german-wordlist`](https://github.com/enz/german-wordlist) — explizit ohne Eigennamen |

---

## Erkennung — wie es funktioniert

NameScrub nutzt einen **4-Pass-Algorithmus** im Web Worker:

```
Pass 1 — Basisklassifikation
  ├─ Honorifike (Herr, Frau, Dr., Prof., Pastor, …) → Kontext-Marker
  ├─ Partikel (von, van, de, zu, …) → transparent, kein Block
  ├─ Abkürzungen / Rechtsformen (GmbH, AG, e.V., USA) → skip
  └─ Dictionary-Lookup mit Flexionsstripping (-s, -en, -er, …)

Pass 2 — Nachname-Chaining
  └─ Token nach erkanntem Namen + Großbuchstabe → ebenfalls Name
     Deckt "Vorname Nachname" und "Herr von Müller" ab

Pass 3 — Konsistenz-Propagierung
  └─ Alle Vorkommen eines bestätigten Namens im Text → Name
     Löst "Müller" auch dann, wenn es im Wörterbuch als Beruf steht

Pass 4 — Bilateraler Kontext
  └─ Uppercase-Token vor einem bestätigten Namen → Name
     Fängt Vornamen ab, deren Grundform ein Wörterbucheintrag ist
```

**Bekannte Nachnamen** (`Müller`, `Schneider`, `Koch`, `Wolf`, …) und **Namens-Suffixe** (`-mann`, `-stein`, `-berg`, `-feld`, …) werden zusätzlich als starkes Signal gewertet.

**Beispiel:**

| Vorher | Nachher |
|--------|---------|
| *Herr Prof. Dr. Hans Müller traf Frau Koch.* | *Name-1 traf Name-2.* |
| *Damian schrieb. Später rief Damian nochmal an.* | *Name-1 schrieb. Später rief Name-1 nochmal an.* |
| *Friedrich von Bülow (GmbH & Co. KG)* | *Name-1 von Name-2 (GmbH & Co. KG)* |

---

## Bedienung

```
1. Text einfügen  (Eingabefeld links)
2. „Analyse starten" klicken  oder  Strg+Enter
3. Grün markierte Namen anklicken:
      [× Löschen]   [✓ Kein Name]   [↔ Name-1 ersetzen]
4. Oder: „Alle ersetzen" für vollautomatische Anonymisierung
5. „In Zwischenablage kopieren" — fertig
```

---

## Tech Stack

| Schicht | Technologie |
|---------|-------------|
| Build | [Vite 5](https://vitejs.dev) |
| Sprache | Vanilla JavaScript (ES Modules) |
| Analyse | [Web Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) |
| Wörterbuch | [`enz/german-wordlist`](https://github.com/enz/german-wordlist) · 675k Einträge |
| Design | [nozilla CI](https://nozilla.de) — Neo-Brutalism |
| Hosting | Plesk · Apache Static Files |

---

## Lokale Entwicklung

```bash
git clone https://github.com/daimpad/namescrub.git
cd namescrub
npm install
npm run build:dict   # Wörterbuch aufbereiten (einmalig)
npm run dev          # → http://localhost:5173
```

### Produktions-Build

```bash
npm run build:plesk
# → dist/ — direkt in den Webserver-Root kopieren
```

Der Ordner `dist/` enthält alles, kein Node.js auf dem Server nötig. Details: [`DEPLOY.md`](DEPLOY.md)

---

## Architektur

```
Browser
├── app.js       UI, Popup, Name-Mapping, Clipboard
└── worker.js    4-Pass-Analyse (off-thread)
     └── dictionary.json   675k Wörter (einmalig geladen)
```

Kein Netzwerkzugriff nach dem initialen Laden.

---

## Lizenz

MIT License — Copyright (c) 2026 [nozilla](https://nozilla.de)

---

<div align="center">

Ein Projekt von **[nozilla](https://nozilla.de)** — bits & bytes mit ❤

</div>
