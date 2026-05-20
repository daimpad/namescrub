#!/usr/bin/env python3
"""
Build-Script: erzeugt eine eigenständige ausführbare Datei mit PyInstaller.

Verwendung:
    pip install pyinstaller
    python build_exe.py

Ausgabe:
    dist/NameScrub.exe       (Windows)
    dist/NameScrub           (Linux)
    dist/NameScrub.app       (macOS — mit --onedir)

Hinweis:
    Das spaCy-Modell (de_core_news_lg) wird NICHT in die Executable eingebettet
    (würde ~600 MB hinzufügen). Die App prüft beim ersten Start ob das Modell
    installiert ist und gibt eine klare Anleitung aus wenn nicht.
"""

import subprocess
import sys
import shutil
from pathlib import Path

HERE    = Path(__file__).parent
ROOT    = HERE.parent
DIST    = HERE / "dist"
BUILD   = HERE / "build"

def run(cmd):
    print(f"\n$ {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, check=True)
    return result

def main():
    # PyInstaller vorhanden?
    if not shutil.which("pyinstaller"):
        sys.exit(
            "PyInstaller nicht gefunden.\n"
            "  pip install pyinstaller"
        )

    # spaCy-Hooks-Pfad ermitteln (nötig damit spaCy korrekt gebundelt wird)
    try:
        import spacy
    except ImportError:
        sys.exit("spaCy nicht installiert — pip install spacy")

    icon_arg = []
    icon_win = ROOT / "public" / "favicon-96x96.png"
    if icon_win.exists():
        icon_arg = ["--icon", str(icon_win)]

    # Modell-Daten nur einbetten wenn lokal installiert (CI baut ohne Modell)
    model_args = []
    try:
        import importlib
        importlib.import_module("de_core_news_lg")
        model_args = ["--collect-data", "de_core_news_lg",
                      "--hidden-import", "de_core_news_lg"]
        print("Modell de_core_news_lg gefunden — wird eingebettet.")
    except ImportError:
        print("Modell de_core_news_lg nicht gefunden — wird nicht eingebettet.")
        print("Nutzer müssen es nach der Installation einmalig laden:")
        print("  python -m spacy download de_core_news_lg")

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name", "NameScrub",
        "--onefile",
        "--windowed",           # kein Konsolenfenster (Windows/macOS)
        "--clean",
        "--distpath", str(DIST),
        "--workpath", str(BUILD),
        "--collect-data", "spacy",
        "--hidden-import", "spacy.lang.de",
        *model_args,
        *icon_arg,
        str(HERE / "namescrub_gui.py"),
    ]

    try:
        run(cmd)
    except subprocess.CalledProcessError:
        sys.exit("\nBuild fehlgeschlagen. Ausgabe oben prüfen.")

    exe = DIST / ("NameScrub.exe" if sys.platform == "win32" else "NameScrub")
    if not exe.exists():
        # macOS .app
        exe = DIST / "NameScrub.app"

    if exe.exists():
        size_mb = sum(f.stat().st_size for f in exe.rglob("*") if f.is_file()) / 1024 / 1024
        print(f"\n✓ Build erfolgreich: {exe}  ({size_mb:.0f} MB)")
        print("\nHinweis: Beim ersten Start muss das spaCy-Modell installiert sein:")
        print("  pip install spacy")
        print("  python -m spacy download de_core_news_lg")
    else:
        print(f"\nBuild abgeschlossen. Ausgabe in: {DIST}")


if __name__ == "__main__":
    main()
