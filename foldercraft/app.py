"""FolderCraft の GUI（Tkinter）。

タブ構成:
  1. スクショ/画像   … 画像を読み込み/貼り付け/画面キャプチャ → OCR → 名前リスト
  2. テキスト        … 複数行を貼り付けて、そのままフォルダ名に
  3. 連番            … Excel 風の連番（テンプレート + 開始/件数/刻み/ゼロ埋め）

下部は共通:
  作成先フォルダの選択、プレビュー、重複時の挙動、作成ボタン、ログ。

Tkinter / Pillow が無い環境では起動時に分かりやすく案内する。
"""

from __future__ import annotations

import os
import threading

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except Exception as exc:  # pragma: no cover - 環境依存
    raise SystemExit(
        "Tkinter が見つかりません。Python の標準GUIライブラリです。\n"
        "  - Windows/mac の公式インストーラなら通常同梱\n"
        "  - Debian/Ubuntu: sudo apt install python3-tk\n"
        f"（詳細: {exc}）"
    )

from . import core, ocr
from .settings import load_settings, save_settings


class FolderCraftApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("FolderCraft - フォルダ一括作成")
        self.geometry("760x640")
        self.minsize(680, 560)

        self.cap = ocr.check_capabilities()
        self.settings = load_settings()
        self._current_image = None  # 直近に読み込んだ Pillow Image

        self.dest_var = tk.StringVar(value=self.settings.get("dest", os.getcwd()))
        self.conflict_var = tk.StringVar(value=self.settings.get("conflict", core.Conflict.SKIP.value))
        self.dedupe_var = tk.BooleanVar(value=self.settings.get("dedupe", False))

        self._build_ui()
        self._refresh_preview()

    # ---- UI 構築 -------------------------------------------------------
    def _build_ui(self) -> None:
        nb = ttk.Notebook(self)
        nb.pack(fill="x", padx=10, pady=(10, 6))

        self._build_image_tab(nb)
        self._build_text_tab(nb)
        self._build_seq_tab(nb)

        self._build_dest_bar()
        self._build_preview()
        self._build_action_bar()
        self._build_log()

    def _build_image_tab(self, nb: ttk.Notebook) -> None:
        f = ttk.Frame(nb)
        nb.add(f, text="  スクショ/画像  ")

        bar = ttk.Frame(f)
        bar.pack(fill="x", padx=8, pady=8)
        ttk.Button(bar, text="画像を開く…", command=self._open_image).pack(side="left")
        ttk.Button(bar, text="クリップボードから貼り付け", command=self._paste_image).pack(side="left", padx=6)
        ttk.Button(bar, text="画面をキャプチャ", command=self._capture_screen).pack(side="left")

        self.ocr_status = ttk.Label(f, text="", foreground="#555")
        self.ocr_status.pack(fill="x", padx=8)
        self._update_ocr_status()

        ttk.Label(f, text="OCR結果（編集可・1行=1フォルダ）:").pack(anchor="w", padx=8, pady=(6, 0))
        self.ocr_text = tk.Text(f, height=8, wrap="none")
        self.ocr_text.pack(fill="both", expand=True, padx=8, pady=(0, 4))
        self.ocr_text.bind("<KeyRelease>", lambda e: self._refresh_preview())

        ttk.Button(f, text="この内容をプレビューに反映", command=self._use_ocr_text).pack(anchor="e", padx=8, pady=(0, 8))
        self.active_source = "image"

    def _build_text_tab(self, nb: ttk.Notebook) -> None:
        f = ttk.Frame(nb)
        nb.add(f, text="  テキスト  ")
        ttk.Label(f, text="1行に1つ、フォルダ名を貼り付け:").pack(anchor="w", padx=8, pady=(8, 0))
        self.plain_text = tk.Text(f, height=12, wrap="none")
        self.plain_text.pack(fill="both", expand=True, padx=8, pady=4)
        self.plain_text.bind("<KeyRelease>", lambda e: self._on_text_change())
        f.bind("<Visibility>", lambda e: self._set_source("text"))

    def _build_seq_tab(self, nb: ttk.Notebook) -> None:
        f = ttk.Frame(nb)
        nb.add(f, text="  連番  ")
        f.bind("<Visibility>", lambda e: self._set_source("seq"))

        grid = ttk.Frame(f)
        grid.pack(fill="x", padx=8, pady=8)

        self.tpl_var = tk.StringVar(value=self.settings.get("template", "資料_{n}"))
        self.start_var = tk.IntVar(value=1)
        self.count_var = tk.IntVar(value=10)
        self.step_var = tk.IntVar(value=1)
        self.pad_var = tk.IntVar(value=0)

        def row(r, label, widget, hint=""):
            ttk.Label(grid, text=label).grid(row=r, column=0, sticky="w", pady=3)
            widget.grid(row=r, column=1, sticky="w", padx=6)
            if hint:
                ttk.Label(grid, text=hint, foreground="#777").grid(row=r, column=2, sticky="w")

        e_tpl = ttk.Entry(grid, textvariable=self.tpl_var, width=28)
        row(0, "テンプレート", e_tpl, "{n} が番号に。例: 案件_{n}_資料")
        row(1, "開始番号", ttk.Spinbox(grid, from_=-9999, to=999999, textvariable=self.start_var, width=8))
        row(2, "件数", ttk.Spinbox(grid, from_=0, to=100000, textvariable=self.count_var, width=8))
        row(3, "刻み", ttk.Spinbox(grid, from_=-1000, to=1000, textvariable=self.step_var, width=8))
        row(4, "ゼロ埋め桁", ttk.Spinbox(grid, from_=0, to=10, textvariable=self.pad_var, width=8), "0=自動")

        for var in (self.tpl_var, self.start_var, self.count_var, self.step_var, self.pad_var):
            var.trace_add("write", lambda *_: self._on_seq_change())

    def _build_dest_bar(self) -> None:
        bar = ttk.Frame(self)
        bar.pack(fill="x", padx=10, pady=4)
        ttk.Label(bar, text="作成先:").pack(side="left")
        ttk.Entry(bar, textvariable=self.dest_var).pack(side="left", fill="x", expand=True, padx=6)
        ttk.Button(bar, text="選択…", command=self._choose_dest).pack(side="left")

    def _build_preview(self) -> None:
        frame = ttk.LabelFrame(self, text="プレビュー")
        frame.pack(fill="both", expand=True, padx=10, pady=4)

        cols = ("name", "status")
        self.tree = ttk.Treeview(frame, columns=cols, show="headings", height=8)
        self.tree.heading("name", text="作成されるフォルダ名")
        self.tree.heading("status", text="状態")
        self.tree.column("name", width=520, anchor="w")
        self.tree.column("status", width=140, anchor="w")
        vsb = ttk.Scrollbar(frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        self.tree.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y")

        self.tree.tag_configure("ok", foreground="#0a7d00")
        self.tree.tag_configure("exists", foreground="#b26a00")
        self.tree.tag_configure("skip", foreground="#999")

    def _build_action_bar(self) -> None:
        bar = ttk.Frame(self)
        bar.pack(fill="x", padx=10, pady=4)

        ttk.Label(bar, text="重複時:").pack(side="left")
        cb = ttk.Combobox(
            bar, textvariable=self.conflict_var, width=10, state="readonly",
            values=[c.value for c in core.Conflict],
        )
        cb.pack(side="left", padx=6)
        cb.bind("<<ComboboxSelected>>", lambda e: self._refresh_preview())

        ttk.Checkbutton(bar, text="重複行を除去", variable=self.dedupe_var,
                        command=self._refresh_preview).pack(side="left", padx=6)

        self.summary_label = ttk.Label(bar, text="")
        self.summary_label.pack(side="left", padx=10)

        ttk.Button(bar, text="フォルダを作成", command=self._create).pack(side="right")
        ttk.Button(bar, text="プレビュー更新", command=self._refresh_preview).pack(side="right", padx=6)

    def _build_log(self) -> None:
        frame = ttk.LabelFrame(self, text="ログ")
        frame.pack(fill="x", padx=10, pady=(4, 10))
        self.log = tk.Text(frame, height=5, wrap="word", state="disabled")
        self.log.pack(fill="x", padx=4, pady=4)

    # ---- ソース切り替え ------------------------------------------------
    def _set_source(self, name: str) -> None:
        self.active_source = name
        self._refresh_preview()

    def _use_ocr_text(self) -> None:
        self._set_source("image")

    def _on_text_change(self) -> None:
        self.active_source = "text"
        self._refresh_preview()

    def _on_seq_change(self) -> None:
        self.active_source = "seq"
        self._refresh_preview()

    # ---- 名前の収集 ----------------------------------------------------
    def _current_names(self) -> list[str]:
        if self.active_source == "seq":
            try:
                spec = core.SequenceSpec(
                    template=self.tpl_var.get(),
                    start=int(self.start_var.get()),
                    count=int(self.count_var.get()),
                    step=int(self.step_var.get()),
                    pad=int(self.pad_var.get()),
                )
                return spec.generate()
            except (tk.TclError, ValueError):
                return []
        if self.active_source == "text":
            text = self.plain_text.get("1.0", "end")
        else:
            text = self.ocr_text.get("1.0", "end")
        return core.normalize_lines(text, dedupe=self.dedupe_var.get())

    # ---- プレビュー ----------------------------------------------------
    def _refresh_preview(self) -> None:
        names = self._current_names()
        conflict = core.Conflict(self.conflict_var.get())
        plan = core.build_plan(names, self.dest_var.get(), conflict=conflict)

        for row in self.tree.get_children():
            self.tree.delete(row)

        status_ja = {"ok": "新規作成", "exists": "既存あり", "empty": "空(スキップ)", "duplicate": "重複(スキップ)"}
        tag_map = {"ok": "ok", "exists": "exists", "empty": "skip", "duplicate": "skip"}
        for item in plan.items:
            shown = item.final_name or item.name or f"({item.source.strip() or '空'})"
            self.tree.insert(
                "", "end",
                values=(shown, status_ja.get(item.status, item.status)),
                tags=(tag_map.get(item.status, ""),),
            )

        counts = plan.summary()
        creatable = len(plan.creatable)
        self.summary_label.config(
            text=f"作成 {creatable} / 全 {len(plan.items)} 件"
                 + (f"（既存 {counts.get('exists', 0)}）" if counts.get("exists") else "")
        )
        self._plan = plan

    # ---- 作成 ----------------------------------------------------------
    def _create(self) -> None:
        dest = self.dest_var.get().strip()
        if not dest:
            messagebox.showwarning("FolderCraft", "作成先フォルダを指定してください。")
            return
        if not os.path.isdir(dest):
            if not messagebox.askyesno("FolderCraft", f"作成先が存在しません。\n{dest}\n作成しますか？"):
                return
            try:
                os.makedirs(dest, exist_ok=True)
            except OSError as exc:
                messagebox.showerror("FolderCraft", f"作成先を作れませんでした:\n{exc}")
                return

        conflict = core.Conflict(self.conflict_var.get())
        plan = core.build_plan(self._current_names(), dest, conflict=conflict)
        if not plan.creatable:
            messagebox.showinfo("FolderCraft", "作成できるフォルダがありません。")
            return
        if not messagebox.askyesno("FolderCraft", f"{len(plan.creatable)} 個のフォルダを作成します。よろしいですか？"):
            return

        result = core.create_folders(plan, conflict=conflict)
        self._write_log(result, dest)
        self._save_current_settings()
        self._refresh_preview()
        messagebox.showinfo(
            "FolderCraft",
            f"完了: 作成 {len(result.created)} / スキップ {len(result.skipped)} / 失敗 {len(result.failed)}",
        )

    def _write_log(self, result: core.CreateResult, dest: str) -> None:
        self.log.config(state="normal")
        self.log.insert("end", f"=== {dest} ===\n")
        for n in result.created:
            self.log.insert("end", f"  [作成] {n}\n")
        for m in result.skipped:
            self.log.insert("end", f"  [スキップ] {m}\n")
        for n, e in result.failed:
            self.log.insert("end", f"  [失敗] {n}: {e}\n")
        self.log.see("end")
        self.log.config(state="disabled")

    # ---- 画像/OCR ------------------------------------------------------
    def _update_ocr_status(self) -> None:
        if self.cap.can_ocr:
            langs = "+".join(l for l in ("jpn", "eng") if l in self.cap.langs) or "既定"
            self.ocr_status.config(text=f"OCR 利用可（言語: {langs}）", foreground="#0a7d00")
        elif not self.cap.pillow:
            self.ocr_status.config(text="Pillow 未導入: pip install pillow", foreground="#b00")
        else:
            self.ocr_status.config(
                text="Tesseract 未導入のため OCR 不可（画像読込は可）。README のインストール手順を参照",
                foreground="#b26a00",
            )

    def _open_image(self) -> None:
        path = filedialog.askopenfilename(
            title="画像を選択",
            filetypes=[("画像", "*.png *.jpg *.jpeg *.bmp *.gif *.tiff"), ("すべて", "*.*")],
        )
        if path:
            try:
                self._current_image = ocr.load_image(path)
                self._run_ocr()
            except Exception as exc:
                messagebox.showerror("FolderCraft", f"画像を開けませんでした:\n{exc}")

    def _paste_image(self) -> None:
        if not self.cap.pillow:
            messagebox.showwarning("FolderCraft", "Pillow が必要です: pip install pillow")
            return
        img = ocr.grab_clipboard()
        if img is None:
            messagebox.showinfo("FolderCraft", "クリップボードに画像がありません。")
            return
        self._current_image = img
        self._run_ocr()

    def _capture_screen(self) -> None:
        if not self.cap.pillow:
            messagebox.showwarning("FolderCraft", "Pillow が必要です: pip install pillow")
            return
        self.iconify()
        self.after(400, self._do_capture)

    def _do_capture(self) -> None:
        try:
            self._current_image = ocr.grab_screen()
        except Exception as exc:
            messagebox.showerror("FolderCraft", f"キャプチャに失敗しました:\n{exc}")
        finally:
            self.deiconify()
        if self._current_image is not None:
            self._run_ocr()

    def _run_ocr(self) -> None:
        if self._current_image is None:
            return
        if not self.cap.can_ocr:
            messagebox.showwarning(
                "FolderCraft",
                "OCR に必要な Tesseract が見つかりません。\n"
                "画像は読み込めましたが、文字認識はできません。\n"
                "README のインストール手順を参照してください。",
            )
            return
        self.ocr_status.config(text="OCR 実行中…", foreground="#555")
        img = self._current_image
        lang = ocr.best_lang(self.cap)

        def worker():
            try:
                text = ocr.image_to_text(img, lang=lang)
            except Exception as exc:
                self.after(0, lambda: self._ocr_failed(exc))
                return
            self.after(0, lambda: self._ocr_done(text))

        threading.Thread(target=worker, daemon=True).start()

    def _ocr_done(self, text: str) -> None:
        lines = core.normalize_lines(text, dedupe=self.dedupe_var.get())
        self.ocr_text.delete("1.0", "end")
        self.ocr_text.insert("1.0", "\n".join(lines))
        self.active_source = "image"
        self._update_ocr_status()
        self._refresh_preview()

    def _ocr_failed(self, exc: Exception) -> None:
        self._update_ocr_status()
        messagebox.showerror("FolderCraft", f"OCR に失敗しました:\n{exc}")

    # ---- その他 --------------------------------------------------------
    def _choose_dest(self) -> None:
        path = filedialog.askdirectory(initialdir=self.dest_var.get() or os.getcwd())
        if path:
            self.dest_var.set(path)
            self._refresh_preview()

    def _save_current_settings(self) -> None:
        self.settings.update({
            "dest": self.dest_var.get(),
            "conflict": self.conflict_var.get(),
            "dedupe": self.dedupe_var.get(),
            "template": self.tpl_var.get(),
        })
        save_settings(self.settings)

    def destroy(self) -> None:  # noqa: D401
        try:
            self._save_current_settings()
        except Exception:
            pass
        super().destroy()


def main() -> None:
    app = FolderCraftApp()
    app.mainloop()


if __name__ == "__main__":
    main()
