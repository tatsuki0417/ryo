"""コマンドラインからも使えるようにする（GUI が使えない環境や自動化向け）。

例:
  # ファイルの各行からフォルダ作成
  python -m foldercraft names.txt -d ./out

  # 標準入力から
  cat names.txt | python -m foldercraft - -d ./out

  # 連番作成
  python -m foldercraft --seq --template "案件_{n}" --start 1 --count 10 --pad 3 -d ./out

  # スクショOCR（Tesseract が必要）
  python -m foldercraft --ocr shot.png -d ./out
"""

from __future__ import annotations

import argparse
import sys

from . import core


def _read_names_from(source: str) -> str:
    if source == "-":
        return sys.stdin.read()
    with open(source, encoding="utf-8") as f:
        return f.read()


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="foldercraft",
        description="テキスト/連番/スクショからフォルダを一気に作る",
    )
    p.add_argument("input", nargs="?", help="行区切りテキストのファイル、または - で標準入力")
    p.add_argument("-d", "--dir", default=".", help="作成先ディレクトリ（既定: カレント）")
    p.add_argument("--ocr", metavar="IMAGE", help="画像を OCR して各行をフォルダ名にする")
    p.add_argument("--seq", action="store_true", help="連番モード")
    p.add_argument("--template", default="{n}", help="連番テンプレート（{n} が番号）")
    p.add_argument("--start", type=int, default=1)
    p.add_argument("--count", type=int, default=10)
    p.add_argument("--step", type=int, default=1)
    p.add_argument("--pad", type=int, default=0, help="ゼロ埋め桁数（0=自動）")
    p.add_argument(
        "--conflict",
        choices=[c.value for c in core.Conflict],
        default=core.Conflict.SKIP.value,
        help="既存フォルダとの衝突時の挙動",
    )
    p.add_argument("--dedupe", action="store_true", help="重複行を除去")
    p.add_argument("-n", "--dry-run", action="store_true", help="作らずに結果を表示")
    return p


def gather_names(args) -> list[str]:
    if args.seq:
        spec = core.SequenceSpec(
            template=args.template,
            start=args.start,
            count=args.count,
            step=args.step,
            pad=args.pad,
        )
        return spec.generate()
    if args.ocr:
        from . import ocr

        cap = ocr.check_capabilities()
        if not cap.can_ocr:
            sys.exit(
                "OCR に必要な依存が不足しています（Pillow / pytesseract / Tesseract 本体）。"
                "\nインストール方法は README を参照してください。"
            )
        img = ocr.load_image(args.ocr)
        text = ocr.image_to_text(img, lang=ocr.best_lang(cap))
        return core.normalize_lines(text, dedupe=args.dedupe)
    if args.input:
        text = _read_names_from(args.input)
        return core.normalize_lines(text, dedupe=args.dedupe)
    return []


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    names = gather_names(args)
    if not names:
        print("フォルダ名がありません。入力・--seq・--ocr のいずれかを指定してください。")
        return 1

    conflict = core.Conflict(args.conflict)
    plan = core.build_plan(names, args.dir, conflict=conflict)
    result = core.create_folders(plan, conflict=conflict, dry_run=args.dry_run)

    label = "作成予定" if args.dry_run else "作成"
    for name in result.created:
        print(f"[{label}] {name}")
    for msg in result.skipped:
        print(f"[スキップ] {msg}")
    for name, err in result.failed:
        print(f"[失敗] {name}: {err}")

    print(
        f"\n合計: {label} {len(result.created)} / "
        f"スキップ {len(result.skipped)} / 失敗 {len(result.failed)}"
    )
    return 0 if result.ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
