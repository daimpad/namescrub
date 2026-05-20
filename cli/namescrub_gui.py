#!/usr/bin/env python3
"""
NameScrub — Desktop-GUI
Tkinter-basierte Oberfläche für namescrub.py (spaCy NER).
Läuft ohne Kommandozeile; beim ersten Start wird das Modell automatisch geladen.
"""

import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk
from pathlib import Path

# Pfad zum CLI-Modul (gleicher Ordner wie diese Datei)
_HERE = Path(__file__).parent
sys.path.insert(0, str(_HERE))

try:
    from namescrub import load_model, anonymise, apply_mapping, interactive_review, LABEL_PREFIX
except ImportError as e:
    import tkinter as tk
    root = tk.Tk(); root.withdraw()
    messagebox.showerror("Fehler", f"namescrub.py nicht gefunden:\n{e}")
    sys.exit(1)

# ── Farben & Fonts (nozilla-nah) ───────────────────────────────────────────────
BG        = "#FFFEE5"
INK       = "#000000"
GREEN     = "#00FF9C"
GREEN2    = "#00E88D"
WHITE     = "#FFFFFF"
MONO      = ("Courier New", 10)
MONO_SM   = ("Courier New", 9)
SANS      = ("Arial", 10)
SANS_BOLD = ("Arial", 10, "bold")
TITLE_F   = ("Georgia", 13, "bold")

# ── Haupt-App ──────────────────────────────────────────────────────────────────

class NameScrubApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("NameScrub")
        self.root.geometry("980x680")
        self.root.configure(bg=BG)
        self.root.minsize(700, 500)

        self.nlp       = None
        self.model_name = "de_core_news_lg"
        self.mapping   = {}

        self._build_ui()
        self._load_model_async()

    # ── UI aufbauen ────────────────────────────────────────────────────────────

    def _build_ui(self):
        # ── Header ──────────────────────────────────────────────────────────
        header = tk.Frame(self.root, bg=INK, pady=8)
        header.pack(fill=tk.X)
        tk.Label(
            header, text="NameScrub", font=TITLE_F,
            bg=INK, fg=GREEN, padx=16,
        ).pack(side=tk.LEFT)
        tk.Label(
            header, text="Text rein. Sensible Daten raus.",
            font=SANS, bg=INK, fg=WHITE, padx=0,
        ).pack(side=tk.LEFT, pady=2)

        self.model_label = tk.Label(
            header, text="Modell wird geladen…",
            font=MONO_SM, bg=INK, fg="#888888", padx=16,
        )
        self.model_label.pack(side=tk.RIGHT)

        # ── Optionsleiste ────────────────────────────────────────────────────
        opts = tk.Frame(self.root, bg=BG, padx=14, pady=8)
        opts.pack(fill=tk.X)

        tk.Label(opts, text="Entitäten:", font=SANS_BOLD, bg=BG).pack(side=tk.LEFT)

        self.var_per  = tk.BooleanVar(value=True)
        self.var_org  = tk.BooleanVar(value=False)
        self.var_loc  = tk.BooleanVar(value=False)

        for var, label in ((self.var_per, "Personen (PER)"),
                           (self.var_org, "Organisationen (ORG)"),
                           (self.var_loc, "Orte (LOC)")):
            tk.Checkbutton(
                opts, text=label, variable=var,
                font=SANS, bg=BG, activebackground=BG,
            ).pack(side=tk.LEFT, padx=(10, 0))

        # ── Hauptbereich: zwei Textfelder ────────────────────────────────────
        panes = tk.Frame(self.root, bg=BG, padx=14, pady=0)
        panes.pack(fill=tk.BOTH, expand=True)
        panes.columnconfigure(0, weight=1)
        panes.columnconfigure(1, weight=1)
        panes.rowconfigure(1, weight=1)

        # Eingabe
        tk.Label(
            panes, text="EINGABE", font=MONO_SM, bg=INK, fg=BG,
            anchor="w", padx=8, pady=3,
        ).grid(row=0, column=0, sticky="ew", padx=(0, 6))

        self.input_text = scrolledtext.ScrolledText(
            panes, font=MONO, wrap=tk.WORD,
            bg=WHITE, fg=INK, insertbackground=INK,
            relief=tk.FLAT, borderwidth=2,
            undo=True,
        )
        self.input_text.grid(row=1, column=0, sticky="nsew", padx=(0, 6), pady=(2, 0))
        self.input_text.insert("1.0", "Deutschen Text hier einfügen…\n\nTipp: Strg+Enter startet die Analyse.")
        self.input_text.bind("<FocusIn>", self._clear_placeholder)
        self.input_text.bind("<Control-Return>", lambda e: self._analyse())

        # Ausgabe
        tk.Label(
            panes, text="ERGEBNIS", font=MONO_SM, bg=INK, fg=BG,
            anchor="w", padx=8, pady=3,
        ).grid(row=0, column=1, sticky="ew", padx=(6, 0))

        self.output_text = scrolledtext.ScrolledText(
            panes, font=MONO, wrap=tk.WORD,
            bg=WHITE, fg=INK,
            relief=tk.FLAT, borderwidth=2,
            state=tk.DISABLED,
        )
        self.output_text.grid(row=1, column=1, sticky="nsew", padx=(6, 0), pady=(2, 0))

        # Farb-Tags für Ersetzungen
        self.output_text.tag_configure("replaced", background=INK, foreground=GREEN, font=MONO)

        # ── Buttonleiste ─────────────────────────────────────────────────────
        btns = tk.Frame(self.root, bg=BG, padx=14, pady=10)
        btns.pack(fill=tk.X)

        btn_cfg = dict(font=MONO_SM, relief=tk.FLAT, padx=14, pady=7, cursor="hand2")

        self.btn_analyse = tk.Button(
            btns, text="Analyse starten",
            bg=GREEN, fg=INK, activebackground=GREEN2,
            command=self._analyse, **btn_cfg,
        )
        self.btn_analyse.pack(side=tk.LEFT, padx=(0, 8))
        self.btn_analyse.config(state=tk.DISABLED)

        self.btn_open = tk.Button(
            btns, text="Datei öffnen…",
            bg=BG, fg=INK, activebackground="#F0EFC0",
            command=self._open_file, **btn_cfg,
        )
        self.btn_open.pack(side=tk.LEFT, padx=(0, 8))

        self.btn_save = tk.Button(
            btns, text="Speichern als…",
            bg=BG, fg=INK, activebackground="#F0EFC0",
            command=self._save_file, **btn_cfg,
        )
        self.btn_save.pack(side=tk.LEFT, padx=(0, 8))
        self.btn_save.config(state=tk.DISABLED)

        self.btn_copy = tk.Button(
            btns, text="In Zwischenablage",
            bg=INK, fg=GREEN, activebackground="#222222",
            command=self._copy, **btn_cfg,
        )
        self.btn_copy.pack(side=tk.RIGHT)
        self.btn_copy.config(state=tk.DISABLED)

        # ── Statusleiste ──────────────────────────────────────────────────────
        self.status_var = tk.StringVar(value="Modell wird geladen…")
        status_bar = tk.Label(
            self.root, textvariable=self.status_var,
            font=MONO_SM, bg=INK, fg="#AAAAAA",
            anchor="w", padx=14, pady=4,
        )
        status_bar.pack(fill=tk.X, side=tk.BOTTOM)

    # ── Modell laden ───────────────────────────────────────────────────────────

    def _load_model_async(self):
        threading.Thread(target=self._load_model, daemon=True).start()

    def _load_model(self):
        try:
            import spacy  # noqa: F401
        except ImportError:
            self.root.after(0, lambda: self._on_spacy_missing())
            return
        nlp = load_model(self.model_name)
        self.nlp = nlp
        self.root.after(0, self._on_model_ready)

    def _on_model_ready(self):
        self.model_label.config(text=f"✓ {self.model_name}", fg=GREEN)
        self.btn_analyse.config(state=tk.NORMAL)
        self.status_var.set("Bereit. Text eingeben und Analyse starten.")

    def _on_spacy_missing(self):
        self.model_label.config(text="spaCy fehlt", fg="#FF4444")
        self.status_var.set("Fehler: spaCy nicht installiert.")
        messagebox.showerror(
            "spaCy fehlt",
            "spaCy ist nicht installiert.\n\n"
            "Terminal öffnen und ausführen:\n\n"
            "  pip install spacy\n"
            "  python -m spacy download de_core_news_lg",
        )

    # ── Analyse ────────────────────────────────────────────────────────────────

    def _get_entity_types(self):
        types = []
        if self.var_per.get(): types.append("PER")
        if self.var_org.get(): types.append("ORG")
        if self.var_loc.get(): types.append("LOC")
        return tuple(types) if types else ("PER",)

    def _analyse(self):
        if not self.nlp:
            return
        text = self.input_text.get("1.0", tk.END).strip()
        if not text or text == "Deutschen Text hier einfügen…\n\nTipp: Strg+Enter startet die Analyse.":
            self.status_var.set("Bitte zuerst Text eingeben.")
            return

        self.btn_analyse.config(state=tk.DISABLED, text="Analyse läuft…")
        self.status_var.set("Analyse läuft…")
        entity_types = self._get_entity_types()

        def run():
            result, mapping = anonymise(text, self.nlp, entity_types)
            self.mapping = mapping
            self.root.after(0, lambda: self._show_result(result, mapping))

        threading.Thread(target=run, daemon=True).start()

    def _show_result(self, result: str, mapping: dict):
        self.output_text.config(state=tk.NORMAL)
        self.output_text.delete("1.0", tk.END)

        # Platzhalter farblich markieren
        placeholders = set(mapping.values())
        pos = 0
        while pos < len(result):
            earliest = None
            earliest_ph = None
            for ph in placeholders:
                idx = result.find(ph, pos)
                if idx != -1 and (earliest is None or idx < earliest):
                    earliest = idx
                    earliest_ph = ph
            if earliest is None:
                self.output_text.insert(tk.END, result[pos:])
                break
            self.output_text.insert(tk.END, result[pos:earliest])
            self.output_text.insert(tk.END, earliest_ph, "replaced")
            pos = earliest + len(earliest_ph)

        self.output_text.config(state=tk.DISABLED)

        n = len(mapping)
        self.status_var.set(
            f"{n} Entität{'en' if n != 1 else ''} ersetzt  —  "
            + "  ·  ".join(f"{v} = {k}" for k, v in sorted(mapping.items(), key=lambda x: x[1]))
        )
        self.btn_analyse.config(state=tk.NORMAL, text="Analyse starten")
        self.btn_save.config(state=tk.NORMAL)
        self.btn_copy.config(state=tk.NORMAL)

    # ── Datei-Operationen ──────────────────────────────────────────────────────

    def _clear_placeholder(self, _event):
        content = self.input_text.get("1.0", tk.END).strip()
        if content == "Deutschen Text hier einfügen…\n\nTipp: Strg+Enter startet die Analyse.":
            self.input_text.delete("1.0", tk.END)

    def _open_file(self):
        path = filedialog.askopenfilename(
            title="Textdatei öffnen",
            filetypes=[("Textdateien", "*.txt"), ("Alle Dateien", "*.*")],
        )
        if not path:
            return
        try:
            text = Path(path).read_text(encoding="utf-8")
        except Exception as e:
            messagebox.showerror("Fehler", f"Datei konnte nicht gelesen werden:\n{e}")
            return
        self.input_text.delete("1.0", tk.END)
        self.input_text.insert("1.0", text)
        self.status_var.set(f"Geöffnet: {Path(path).name}")

    def _save_file(self):
        result = self.output_text.get("1.0", tk.END).strip()
        if not result:
            return
        path = filedialog.asksaveasfilename(
            title="Anonymisierten Text speichern",
            defaultextension=".txt",
            filetypes=[("Textdateien", "*.txt"), ("Alle Dateien", "*.*")],
        )
        if not path:
            return
        try:
            Path(path).write_text(result, encoding="utf-8")
            self.status_var.set(f"Gespeichert: {Path(path).name}")
        except Exception as e:
            messagebox.showerror("Fehler", f"Speichern fehlgeschlagen:\n{e}")

    def _copy(self):
        result = self.output_text.get("1.0", tk.END).strip()
        if not result:
            return
        self.root.clipboard_clear()
        self.root.clipboard_append(result)
        old = self.btn_copy.cget("text")
        self.btn_copy.config(text="Kopiert ✓")
        self.root.after(2000, lambda: self.btn_copy.config(text=old))

    # ── Start ──────────────────────────────────────────────────────────────────

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    NameScrubApp().run()
