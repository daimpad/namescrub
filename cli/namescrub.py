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
    return "".join(parts)


def anonymise(text: str, nlp, entity_types: tuple) -> tuple[str, dict]:
    """Vollständige Anonymisierung; gibt (anonymisierter_text, mapping) zurück."""
    doc = nlp(text)
    mapping = build_mapping(doc, entity_types)
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
            "  namescrub.py bericht.txt -e PER,ORG,LOC\n"
            "  namescrub.py bericht.txt --interactive\n"
            "  cat text.txt | namescrub.py\n"
        ),
    )

    parser.add_argument(
        "input", nargs="?",
        help="Eingabedatei (Standard: stdin)",
    )
    parser.add_argument(
        "-o", "--output",
        help="Ausgabedatei (Standard: stdout)",
    )
    parser.add_argument(
        "-e", "--entities", default="PER",
        help="Komma-getrennte Entitätstypen: PER,ORG,LOC  (Standard: PER)",
    )
    parser.add_argument(
        "-i", "--interactive", action="store_true",
        help="Jede Entität interaktiv bestätigen",
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

    # ── Text lesen ─────────────────────────────────────────────────────────────
    if args.input:
        try:
            text = Path(args.input).read_text(encoding="utf-8")
        except FileNotFoundError:
            sys.exit(f"Fehler: Datei nicht gefunden: {args.input}")
    else:
        text = sys.stdin.read()

    if not text.strip():
        sys.exit("Fehler: Kein Text eingegeben.")

    # ── Modell laden ───────────────────────────────────────────────────────────
    print("Modell wird geladen…", file=sys.stderr, end="\r", flush=True)
    nlp = load_model(args.model)
    print(" " * 25,           file=sys.stderr, end="\r", flush=True)

    # ── Analyse ────────────────────────────────────────────────────────────────
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

    # ── Ausgabe ────────────────────────────────────────────────────────────────
    if args.output:
        Path(args.output).write_text(result, encoding="utf-8")
        print(f"✓ Anonymisiert → {args.output}", file=sys.stderr)
    else:
        print(result)

    # ── Zusammenfassung ────────────────────────────────────────────────────────
    if mapping and not args.no_summary:
        dest = sys.stderr if args.output else sys.stdout
        print(f"\n── {len(mapping)} Entität(en) ersetzt ──", file=dest)
        for placeholder in sorted(set(mapping.values())):
            originals = [k for k, v in mapping.items() if v == placeholder]
            print(f"  {placeholder:12}  {', '.join(originals)}", file=dest)
        print(file=dest)


if __name__ == "__main__":
    main()
