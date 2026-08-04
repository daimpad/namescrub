<div align="center">
  <img src="public/logo_lang.svg" alt="NameScrub" height="200" />
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

NameScrub erkennt personenbezogene Angaben in deutschen Texten und ersetzt sie durch nummerierte Platzhalter — `Name-1`, `Email-1`, `IBAN-1` usw. Der Text bleibt **lesbar und zusammenhängend**, Personen sind aber nicht mehr identifizierbar.

> **Datenschutzversprechen:** Kein Wort verlässt Ihren Browser (Web) bzw. Ihren Rechner (Desktop). Keine API, kein Server, kein Logging.

Es gibt zwei Varianten:

| | NameScrub Web | NameScrub+ Desktop |
|---|---|---|
| **Technik** | Regelbasiert — Wörterbuch + Heuristiken | KI-basiert — spaCy NER-Modell |
| **Start** | Sofort im Browser, kein Install | Python 3.9+ + Modell-Download (~560 MB) |
| **Entitäten** | Namen, E-Mail, Telefon, IBAN, Datum, Adresse | Personen, Orte, Organisationen |
| **Fehlerrate** | Moderat, interaktiv korrigierbar | Deutlich geringer |
| **Batch** | Nein | Ja — ganze Ordner auf einmal |
| **Dateien** | .txt/.md öffnen (auch Drag & Drop), Ergebnis herunterladen | Öffnen & Speichern per Klick |

---

## Was es erkennt

| Entität | Beispiel | Platzhalter | Aktivierung |
|---|---|---|---|
| **Personennamen** | `Thomas Müller`, `Frau Dr. Weber`, `Schmidts Bericht` | `Name-1` | immer |
| **E-Mail-Adressen** | `t.mueller@firma.de` | `Email-1` | immer |
| **Telefonnummern** | `+49 30 12345678`, `0170 1234567` | `Tel-1` | immer |
| **IBANs** | `DE89 3704 0044 0532 0130 00` — mit MOD-97-Prüfsumme validiert | `IBAN-1` | immer |
| **Datumsangaben** | `12.03.2024` | `Datum-1` | Checkbox |
| **Adressen** | `Musterstraße 12, 10115 Berlin` | `Adresse-1` | Checkbox |

Alle Platzhalter-Präfixe sind unter „Bezeichnungen anpassen" frei wählbar (z. B. `Person-1` statt `Name-1`) und bleiben im Browser gespeichert.

**NameScrub+ Desktop** erkennt zusätzlich **Orte** (`Ort-1`) und **Organisationen** (`Org-1`) über das trainierte spaCy-Modell.

### Abgrenzung: Verwaltungs-Tools wie der Datenlotse

Werkzeuge für den deutschen Verwaltungskontext (etwa der Datenlotse mit seinen elf Entitätstypen) sind auf Behördendokumente zugeschnitten — inklusive Aktenzeichen, Kassenzeichen, Versicherten- und Personalnummern. NameScrub überschneidet sich mit ihnen bei den Klassikern (Namen, Adressen, Kontaktdaten, Datumsangaben, IBAN), ist aber **anders zugeschnitten**: auf allgemeine Korrespondenz — Briefe, E-Mails, Berichte, Notizen — mit sofortigem Start im Browser und interaktiver Nachkontrolle pro Fundstelle statt fester Verwaltungs-Taxonomie. Wer regelmäßig Bescheide mit Aktenzeichen anonymisiert, ist mit einem Verwaltungs-Tool besser bedient; wer schnell einen Text säubern will, bevor er ihn weitergibt, mit NameScrub.

---

## Was es nicht tut

Mustergestützte Erkennung hat klare Grenzen — die soll man kennen, bevor man dem Ergebnis vertraut:

- **Ohne Kontext keine Erkennung.** Ein unbekannter Nachname wird über Kontext gefunden: Anrede davor („Frau Yilmaz"), Vorname davor, Verb dahinter („Yilmaz sagte"), und/oder-Paarung, oder ein zweites Vorkommen mitten im Satz. Steht er nackt am Satzanfang und sonst nirgends, bleibt er stehen.
- **Nachnamen, die gewöhnliche Wörter sind** und nicht in der internen Nachnamensliste stehen, werden ohne Kontext übersehen — „die Aussage Stark" bleibt unmarkiert, „Frau Stark" wird gefunden.
- **Web: keine Orte, keine Organisationen.** Das Wörterbuch enthält keine Eigennamen, ein Orts-/Firmenlexikon wäre ein eigenes Feature. Dafür gibt es NameScrub+ (spaCy erkennt PER/ORG/LOC).
- **Keine Verwaltungs- und Sonderkennungen:** Aktenzeichen, Versichertennummern, Steuer-IDs, Kfz-Kennzeichen und Kontonummern ohne IBAN-Format werden nicht erkannt.
- **Nur numerische Datumsformate.** `12.03.2024` ja — „am dritten März" nein.
- **Adressen brauchen ein Straßen-Suffix** (-straße, -weg, -platz, -allee …). „Am Markt 3" wird nicht erkannt.
- **Keine indirekte Identifikation.** „der Bürgermeister von Kleinstadt", „meine älteste Schwester" — semantische Umschreibungen erfordern Textverständnis, das ein Musteransatz nicht hat.
- **Bewusstes Übermarkieren:** Häufige Nachnamen, die zugleich Berufe sind (Richter, Koch, Bauer, Jäger), werden absichtlich markiert — bei Anonymisierung ist ein Klick auf „✓ Kein Name" billiger als ein übersehener Name.

**Deshalb ist die interaktive Prüfung Teil des Konzepts:** Jede Fundstelle ist anklickbar (Löschen / Kein Name / Ersetzen), nichts wird ungefragt ersetzt. Die Endkontrolle vor der Weitergabe bleibt beim Menschen.

---

## Entstehung

NameScrub ist aus einem praktischen Bedürfnis entstanden: Deutsche Texte — Briefe, E-Mails, Berichte — sollen weitergegeben, abgelegt oder von Cloud-Diensten (etwa KI-Assistenten) verarbeitet werden können, **ohne dass Namen und Kontaktdaten mitreisen**. Die verfügbaren Werkzeuge dafür waren entweder Cloud-Dienste (denen man genau die sensiblen Daten anvertrauen müsste, die man entfernen will) oder installationslastige Fachanwendungen. NameScrub besetzt die Lücke dazwischen: aufrufen, einfügen, prüfen, kopieren — komplett lokal. Für höhere Ansprüche an die Erkennungsqualität kam NameScrub+ mit spaCy-NER als Desktop-Variante dazu.

---

## NameScrub Web

### Features

| | |
|---|---|
| 🔒 **100% lokal** | Verarbeitung via Web Worker, kein Netzwerk nach dem Laden |
| 🔄 **Konsistente Platzhalter** | Dasselbe Vorkommen eines Namens erhält überall denselben Platzhalter — auch im Genitiv („Müllers") |
| 🖱️ **Interaktives Popup** | Pro Fundstelle: `× Löschen` · `✓ Kein Name` · `↔ Name-X ersetzen` — auch per Tastatur (Tab + Enter) |
| ↩️ **Rückgängig** | Jeder Schritt umkehrbar (Strg+Z) |
| ⚡ **Bulk-Modus** | „Alle ersetzen" nummeriert alle Fundstellen in einem Schritt |
| 🏷️ **Eigene Bezeichnungen** | Platzhalter-Präfixe pro Entität konfigurierbar, in `localStorage` gespeichert |
| 📄 **Dateien** | .txt/.md öffnen (Button oder Drag & Drop, mit cp1252-Fallback), Ergebnis als Datei herunterladen |
| 📚 **675.000 Wörter** | [`enz/german-wordlist`](https://github.com/enz/german-wordlist) — explizit ohne Eigennamen |
| 🏷️ **~2.000 Vornamen** | Kuratierte Liste (DE, TR, AR, Slawisch, ES/PT, FA, Asiatisch, NL/Skandinavisch, EN) mit Kollisions-Blockliste |

### Erkennungs-Algorithmus

Vor der Tokenisierung ersetzt ein **Pre-Processing** E-Mails, Telefonnummern, IBANs (prüfsummenvalidiert) sowie optional Datumsangaben und Adressen durch Marker. Danach läuft ein **Multi-Pass-Algorithmus** im Web Worker:

```
Pass 1 — Basisklassifikation
  ├─ Honorifike (Herr, Frau, Dr., Prof. Dr. med., …) → präzise Kettenlogik
  ├─ Partikel (von, van, de, zu, …) → transparent
  ├─ Abkürzungen / Rechtsformen (GmbH, e.V., MFG, DSGVO) → skip
  ├─ Bekannte Nicht-Personen (Google, Spiegel, Bitcoin, …) → skip
  ├─ Vornamenliste (~2.000) und Nachnamensliste (~160) → Name
  ├─ Genitiv-Namen („Annas Buch", „Schmidts Bericht") → Name
  ├─ Anrede-Kontext („Hallo …", „Viele Grüße …") → Name
  └─ Dictionary-Lookup (675k) mit Suffix-Filter und Compound-Zerlegung

Pass 2 — Nachname-Chaining
  └─ Wort-Token nach erkanntem Namen + Großbuchstabe → Name

Pass 3 — Konsistenz-Propagierung
  └─ Alle Vorkommen eines bestätigten Namens → Name (Genitiv-bewusst)

Pass 4 — Bilateraler Kontext
  └─ Unbekanntes Uppercase-Token vor bestätigtem Namen → Name

Pass 4b — Koordinations-Paare
  └─ „Xenia und Thomas" → beide Namen (rettet Satzanfänge)

Pass 5 — Verb-Kontext
  └─ Uppercase-Token direkt vor Verb → Name („Müller arbeitet hier.")

Finale — erneute Propagierung spät beförderter Namen
```

### Lokale Entwicklung

```bash
git clone https://github.com/daimpad/namescrub.git
cd namescrub
npm install
npm run build        # Wörterbuch + Vornamen aufbereiten + Vite-Build
npm run dev          # → http://localhost:5173
npm test             # Vitest — Regressionstests für die Erkennung
```

### Produktions-Build

```bash
npm run build
# → dist/ — direkt in den Webserver-Root kopieren
```

Der Ordner `dist/` enthält alles, kein Node.js auf dem Server nötig. Details: [`DEPLOY.md`](DEPLOY.md)

---

## NameScrub+ Desktop

NameScrub+ ist eine Python-Desktop-App, die statt Wörterbuch-Heuristiken ein trainiertes KI-Modell nutzt: **[spaCy de_core_news_lg](https://spacy.io/models/de)**, ein deutsches Named-Entity-Recognition-Modell. Zusätzlich fängt ein regelbasierter Honorifik-Pass Fälle wie „Frau Müller" ab, die das Modell ohne Vornamen übersieht.

Fertige Executables für Windows, macOS und Linux gibt es unter [Releases](https://github.com/daimpad/namescrub/releases/latest).

### Schnellstart

```bash
pip install spacy
python -m spacy download de_core_news_lg   # ~560 MB, einmalig
python cli/namescrub_gui.py                # Desktop-GUI starten
```

Die GUI bietet Datei öffnen/speichern, Fortschrittsanzeige und Batch-Verarbeitung ganzer Ordner („Ordner verarbeiten…" — schreibt `name_anon.txt` neben jede Datei).

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
├── namescrub.py       Kern-Logik + CLI (spaCy NER, Honorifik-Pass, Batch)
├── namescrub_gui.py   Tkinter Desktop-GUI (Fortschritt, Ordner-Batch)
├── build_exe.py       PyInstaller-Build-Script
└── requirements.txt   Abhängigkeiten
```

---

## Tech Stack

| Schicht | Technologie |
|---------|-------------|
| Build | [Vite 8](https://vitejs.dev) |
| Tests | [Vitest](https://vitest.dev) |
| Sprache (Web) | Vanilla JavaScript (ES Modules) |
| Analyse (Web) | [Web Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) |
| Wörterbuch | [`enz/german-wordlist`](https://github.com/enz/german-wordlist) · 675k Einträge |
| Sprache (Desktop) | Python 3.9+ |
| NER-Modell | [spaCy de_core_news_lg](https://spacy.io/models/de) |
| GUI | Tkinter |
| Releases | GitHub Actions — Windows/macOS/Linux-Binaries bei jedem `v*.*.*`-Tag |
| Design | [nozilla CI](https://nozilla.de) — Neo-Brutalism |

---

## Architektur (Web)

```
Browser
├── app.js             UI, Popup, Platzhalter-Mapping, Undo, Dateien, Modal
├── worker.js          Dünner Web-Worker-Wrapper
└── analyser.js        Pre-Processing + Multi-Pass-Analyse (pure Funktionen, getestet)
     ├── dictionary.json    675k Wörter (einmalig geladen)
     └── firstnames.json    ~2.000 Vornamen
```

Kein Netzwerkzugriff nach dem initialen Laden.

---

## Lizenz

MIT License — Copyright (c) 2026 [nozilla](https://nozilla.de)

---

<div align="center">

Ein Projekt von **[nozilla](https://nozilla.de)** — bits & bytes mit ❤

</div>
