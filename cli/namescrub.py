#!/usr/bin/env python3
"""
namescrub-cli — lokale Textanonymisierung mit spaCy NER.

Erkennt Eigennamen (Personen, optional Orte und Organisationen) in
deutschem Text und ersetzt sie durch nummerierte Platzhalter.
Verarbeitung erfolgt 100% lokal — keine Netzwerkverbindung.

Schnellstart:
    pip install spacy
    python -m spacy download de_core_news_lg
    python namescrub.py meintext.txt
"""

import argparse
import re
import sys
from pathlib import Path

# ── spaCy-Import mit klarer Fehlermeldung ──────────────────────────────────────

try:
    import spacy
except ImportError:
    sys.exit(
        "Fehler: spaCy ist nicht installiert.\n"
        "  pip install spacy\n"
        "  python -m spacy download de_core_news_lg"
    )

# ── Konfiguration ──────────────────────────────────────────────────────────────

DEFAULT_MODEL    = "de_core_news_lg"
FALLBACK_MODEL   = "de_core_news_md"   # kleineres Modell als Fallback

# Platzhalter-Präfixe pro Entitätstyp
LABEL_PREFIX = {
    "PER":  "Name",
    "ORG":  "Org",
    "LOC":  "Ort",
    "MISC": "Name",
}

# ── Modell laden ───────────────────────────────────────────────────────────────

def load_model(model_name: str):
    """Lädt das spaCy-Modell; gibt bei Fehler eine klare Anleitung aus."""
    for name in (model_name, FALLBACK_MODEL) if model_name == DEFAULT_MODEL else (model_name,):
        try:
            return spacy.load(name)
        except OSError:
            pass

    sys.exit(
        f"Fehler: Kein passendes Modell gefunden ('{model_name}').\n"
        f"  python -m spacy download {model_name}\n"
        f"  python -m spacy download {FALLBACK_MODEL}   ← kleinere Alternative"
    )

# ── Kern-Analyse ───────────────────────────────────────────────────────────────

def build_mapping(doc, entity_types: tuple) -> dict:
    """
    Ordnet jede einzigartige Entität einem Platzhalter zu.
    Gleicher Name → gleicher Platzhalter (konsistent im gesamten Text).
    Kurznamen ("Schneider") erben den Platzhalter des zugehörigen Vollnamens
    ("Thomas Schneider"), falls eindeutig zuordenbar.
    """
    mapping  = {}
    counters = {}

    # Längere Namen zuerst verarbeiten, damit Vollnamen vor Kurznamen eingetragen sind
    entities_sorted = sorted(
        [(ent.text.strip().lower(), ent.label_) for ent in doc.ents if ent.label_ in entity_types],
        key=lambda x: (-len(x[0]), x[0]),
    )

    for key, label in entities_sorted:
        if key in mapping:
            continue

        # Prüfen ob dieser Kurzname Teilmenge eines bereits bekannten Vollnamens ist
        inherited = _inherit_placeholder(key, mapping)
        if inherited:
            mapping[key] = inherited
            continue

        prefix = LABEL_PREFIX.get(label, "Name")
        counters[prefix] = counters.get(prefix, 0) + 1
        mapping[key] = f"{prefix}-{counters[prefix]}"

    return mapping


def _inherit_placeholder(key: str, mapping: dict) -> str | None:
    """
    Gibt den Platzhalter eines bereits bekannten Namens zurück, wenn `key`
    ein einzelnes Token ist, das als Teil eines Vollnamens in `mapping` auftaucht.
    Z.B. "schneider" erbt von "thomas schneider".
    """
    if " " in key:
        return None   # Vollname erbt nicht von anderem Vollnamen
    for full_key, placeholder in mapping.items():
        if " " in full_key and key in full_key.split():
            return placeholder
    return None


def _partial_mapping(mapping: dict) -> dict:
    """
    Leitet für jede Wortkomponente eines Mehrwort-Eintrags den Platzhalter ab,
    sofern die Komponente nicht bereits direkt in mapping steht.
    Z.B. {'thomas müller': 'Name-1'} → {'thomas': 'Name-1', 'müller': 'Name-1'}
    """
    partials = {}
    for key, placeholder in mapping.items():
        if " " not in key:
            continue
        for part in key.split():
            if part not in mapping and part not in partials:
                partials[part] = placeholder
    return partials


def apply_mapping(text: str, doc, mapping: dict, entity_types: tuple) -> str:
    """Ersetzt alle Entitäten im Originaltext anhand der Zuordnung."""
    parts = []
    cursor = 0

    for ent in doc.ents:
        if ent.label_ not in entity_types:
            continue
        key = ent.text.strip().lower()
        if key not in mapping:
            continue
        parts.append(text[cursor:ent.start_char])
        parts.append(mapping[key])
        cursor = ent.end_char

    parts.append(text[cursor:])
    result = "".join(parts)

    # Second pass: replace name components spaCy missed without full-name context
    # (e.g. standalone "Schneider" after "Thomas Schneider" was already replaced).
    # Always derive from multi-word entries so the set is correct even if partials
    # were already merged into mapping by anonymise().
    partials = {}
    for key, placeholder in mapping.items():
        if " " not in key:
            continue
        for part in key.split():
            if part not in partials:
                partials[part] = placeholder

    if not partials:
        return result

    pattern = r'\b(' + '|'.join(re.escape(p) for p in partials) + r')\b'

    def _sub(m):
        word = m.group(1)
        if word[0].isupper():           # only replace capitalised occurrences
            return partials[word.lower()]
        return word

    return re.sub(pattern, _sub, result, flags=re.IGNORECASE)


def anonymise(text: str, nlp, entity_types: tuple) -> tuple[str, dict]:
    """Vollständige Anonymisierung; gibt (anonymisierter_text, mapping) zurück."""
    doc = nlp(text)
    mapping = build_mapping(doc, entity_types)
    # Add partial-name entries so the summary reflects every replacement made
    mapping.update({k: v for k, v in _partial_mapping(mapping).items() if k not in mapping})
    result  = apply_mapping(text, doc, mapping, entity_types)
    return result, mapping

# ── Interaktiver Modus ─────────────────────────────────────────────────────────

def interactive_review(doc, entity_types: tuple) -> dict:
    """
    Zeigt jede erkannte Entität und fragt den Nutzer:
      Enter        → Platzhalter übernehmen
      eigener Text → eigenen Platzhalter verwenden
      n / skip     → Entität NICHT ersetzen
      q            → ab hier alle automatisch ersetzen
    """
    mapping  = {}
    counters = {}
    auto     = False

    print("\n── Interaktive Prüfung ── (Enter=übernehmen, n=überspringen, q=alle automatisch)\n")

    for ent in doc.ents:
        if ent.label_ not in entity_types:
            continue
        key = ent.text.strip().lower()
        if key in mapping:
            continue

        prefix = LABEL_PREFIX.get(ent.label_, "Name")
        counters[prefix] = counters.get(prefix, 0) + 1
        default = f"{prefix}-{counters[prefix]}"

        if auto:
            mapping[key] = default
            continue

        try:
            answer = input(f"  [{ent.label_}] \"{ent.text}\"  →  {default}   ? ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if answer.lower() in ("q", "quit"):
            mapping[key] = default
            auto = True
        elif answer.lower() in ("n", "skip", "nein"):
            pass   # nicht in mapping → wird nicht ersetzt
        elif answer == "":
            mapping[key] = default
        else:
            mapping[key] = answer

    print()
    return mapping

# ── Einzeldatei verarbeiten ────────────────────────────────────────────────────

def process_file(path: Path, nlp, entity_types: tuple, args) -> dict:
    """Liest, anonymisiert und schreibt eine einzelne Datei. Gibt mapping zurück."""
    try:
        text = path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"  ✗ {path.name}: {e}", file=sys.stderr)
        return {}

    if not text.strip():
        print(f"  – {path.name}: leer, übersprungen", file=sys.stderr)
        return {}

    doc = nlp(text)

    if args.list:
        seen = set()
        print(f"\n── {path.name} ──")
        for ent in doc.ents:
            if ent.label_ not in entity_types or ent.text in seen:
                continue
            seen.add(ent.text)
            print(f"  [{ent.label_:4}]  {ent.text}")
        return {}

    result, mapping = anonymise(text, nlp, entity_types)
    return result, mapping, doc


def write_result(result: str, src_path: Path, output_arg: str | None) -> Path:
    """
    Bestimmt den Ausgabepfad:
    - -o verzeichnis/  → verzeichnis/dateiname.txt
    - -o datei.txt     → datei.txt  (nur bei Einzeldatei sinnvoll)
    - kein -o          → stdout
    """
    if not output_arg:
        print(result)
        return None

    out = Path(output_arg)
    if out.is_dir() or output_arg.endswith("/") or output_arg.endswith("\\"):
        out.mkdir(parents=True, exist_ok=True)
        out = out / src_path.name
    else:
        out.parent.mkdir(parents=True, exist_ok=True)

    out.write_text(result, encoding="utf-8")
    return out


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        prog="namescrub",
        description="Anonymisiert deutsche Texte lokal mit spaCy NER.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Beispiele:\n"
            "  namescrub.py bericht.txt\n"
            "  namescrub.py bericht.txt -o anonym.txt\n"
            "  namescrub.py *.txt -o ausgabe/\n"
            "  namescrub.py docs/*.txt -o anonym/ -e PER,ORG,LOC\n"
            "  namescrub.py bericht.txt --interactive\n"
            "  cat text.txt | namescrub.py\n"
        ),
    )

    parser.add_argument(
        "input", nargs="*",
        help="Eingabedatei(en) (Standard: stdin). Glob-Muster möglich: *.txt",
    )
    parser.add_argument(
        "-o", "--output",
        help="Ausgabedatei oder -verzeichnis (Standard: stdout). "
             "Bei mehreren Eingaben muss ein Verzeichnis angegeben werden.",
    )
    parser.add_argument(
        "-e", "--entities", default="PER",
        help="Komma-getrennte Entitätstypen: PER,ORG,LOC  (Standard: PER)",
    )
    parser.add_argument(
        "-i", "--interactive", action="store_true",
        help="Jede Entität interaktiv bestätigen (nur bei Einzeldatei)",
    )
    parser.add_argument(
        "--list", action="store_true",
        help="Erkannte Entitäten anzeigen, ohne Text zu verändern",
    )
    parser.add_argument(
        "--model", default=DEFAULT_MODEL,
        help=f"spaCy-Modell  (Standard: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--no-summary", action="store_true",
        help="Keine Zusammenfassung der Ersetzungen ausgeben",
    )

    args = parser.parse_args()
    entity_types = tuple(e.strip().upper() for e in args.entities.split(","))

    # ── Modell laden ───────────────────────────────────────────────────────────
    print("Modell wird geladen…", file=sys.stderr, end="\r", flush=True)
    nlp = load_model(args.model)
    print(" " * 25,           file=sys.stderr, end="\r", flush=True)

    # ── Eingabe: stdin oder Datei(en) ──────────────────────────────────────────
    if not args.input:
        # stdin-Modus
        text = sys.stdin.read()
        if not text.strip():
            sys.exit("Fehler: Kein Text eingegeben.")
        doc = nlp(text)

        if args.list:
            seen = set()
            print(f"\n── Erkannte Entitäten ({', '.join(entity_types)}) ──\n")
            for ent in doc.ents:
                if ent.label_ not in entity_types or ent.text in seen:
                    continue
                seen.add(ent.text)
                print(f"  [{ent.label_:4}]  {ent.text}")
            print()
            return

        if args.interactive:
            mapping = interactive_review(doc, entity_types)
            result  = apply_mapping(text, doc, mapping, entity_types)
        else:
            result, mapping = anonymise(text, nlp, entity_types)

        write_result(result, Path("output.txt"), args.output)
        _print_summary(mapping, bool(args.output), args.no_summary)
        return

    # ── Batch-Modus: eine oder mehrere Dateien ─────────────────────────────────
    # Glob-Expansion (Shell erledigt das meist, aber Windows braucht manuelles Glob)
    import glob as _glob
    paths = []
    for pattern in args.input:
        expanded = _glob.glob(pattern, recursive=True)
        if expanded:
            paths.extend(Path(p) for p in expanded)
        else:
            paths.append(Path(pattern))   # wird später als FileNotFoundError behandelt

    if len(paths) > 1 and args.output and not (
        args.output.endswith("/") or args.output.endswith("\\") or Path(args.output).is_dir()
    ):
        sys.exit(
            "Fehler: Bei mehreren Eingabedateien muss -o ein Verzeichnis sein.\n"
            f"  Tipp: -o {args.output}/"
        )

    total_entities = 0
    ok = 0

    for i, path in enumerate(paths, 1):
        prefix = f"[{i}/{len(paths)}]" if len(paths) > 1 else ""

        if not path.exists():
            print(f"  ✗ {path}: nicht gefunden", file=sys.stderr)
            continue

        try:
            text = path.read_text(encoding="utf-8")
        except Exception as e:
            print(f"  ✗ {path.name}: {e}", file=sys.stderr)
            continue

        if not text.strip():
            print(f"  – {path.name}: leer, übersprungen", file=sys.stderr)
            continue

        doc = nlp(text)

        if args.list:
            seen = set()
            print(f"\n── {path.name} ──")
            for ent in doc.ents:
                if ent.label_ not in entity_types or ent.text in seen:
                    continue
                seen.add(ent.text)
                print(f"  [{ent.label_:4}]  {ent.text}")
            continue

        if args.interactive and len(paths) == 1:
            mapping = interactive_review(doc, entity_types)
            result  = apply_mapping(text, doc, mapping, entity_types)
        else:
            result, mapping = anonymise(text, nlp, entity_types)

        out_path = write_result(result, path, args.output)
        total_entities += len(mapping)
        ok += 1

        if out_path:
            n = len(mapping)
            print(f"  ✓ {prefix} {path.name} → {out_path.name}  ({n} Entität{'en' if n != 1 else ''})", file=sys.stderr)
            if not args.no_summary and mapping:
                for placeholder in sorted(set(mapping.values())):
                    originals = [k for k, v in mapping.items() if v == placeholder]
                    print(f"      {placeholder:12}  {', '.join(originals)}", file=sys.stderr)
        else:
            _print_summary(mapping, False, args.no_summary)

    if len(paths) > 1:
        print(f"\n── {ok}/{len(paths)} Dateien verarbeitet, {total_entities} Entitäten ersetzt ──\n", file=sys.stderr)


def _print_summary(mapping: dict, to_stderr: bool, no_summary: bool):
    if not mapping or no_summary:
        return
    dest = sys.stderr if to_stderr else sys.stdout
    print(f"\n── {len(mapping)} Entität(en) ersetzt ──", file=dest)
    for placeholder in sorted(set(mapping.values())):
        originals = [k for k, v in mapping.items() if v == placeholder]
        print(f"  {placeholder:12}  {', '.join(originals)}", file=dest)
    print(file=dest)


if __name__ == "__main__":
    main()
