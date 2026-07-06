#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC のフォルダを安全に階層整理するスクリプト
==========================================

やること
--------
1. 指定フォルダの直下に散らばったファイルを、種類ごとの階層フォルダへ整理します。
   （例: 書類 / 画像 / 動画 / 音声 / 圧縮ファイル / アプリ・インストーラ / コード / その他）
2. 「削除しても良さそう」なファイル・フォルダを、新規作成する `_削除候補` フォルダに
   まとめて移動します（コピー・バックアップ・空ファイル・OS のゴミファイル・重複ファイルなど）。

大切な原則
----------
* このスクリプトは **一切ファイルを削除しません**。すべて「移動」だけです。
* 既定は **ドライラン（計画の表示のみ）** です。実際に動かすには `--apply` を付けます。
* 実行したすべての移動は CSV ログに記録され、`--undo <ログ>` で元に戻せます。

使い方（例）
------------
    # 1) まず何が起きるか確認（ファイルは動きません）
    python3 organize_pc_folders.py "C:/Users/ryo/Desktop"

    # 2) 問題なければ実際に整理を実行
    python3 organize_pc_folders.py "C:/Users/ryo/Desktop" --apply

    # 3) やっぱり元に戻したい場合（実行時に表示されるログファイルを指定）
    python3 organize_pc_folders.py --undo organize_log_20260706_101530.csv

Mac / Linux ではパスを "/Users/ryo/Desktop" のように指定してください。
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# --------------------------------------------------------------------------
# 種類ごとの振り分け定義（拡張子 → カテゴリフォルダ名）
# --------------------------------------------------------------------------
CATEGORY_MAP: dict[str, str] = {}


def _register(category: str, extensions: str) -> None:
    for ext in extensions.split():
        CATEGORY_MAP[ext.lower()] = category


_register("書類", "pdf doc docx xls xlsx ppt pptx txt csv md rtf odt ods odp pages numbers key epub")
_register("画像", "jpg jpeg png gif bmp heic heif webp svg tif tiff raw psd ai eps ico")
_register("動画", "mp4 mov avi mkv wmv flv webm m4v mpg mpeg 3gp")
_register("音声", "mp3 wav aac flac m4a ogg wma aiff")
_register("圧縮ファイル", "zip rar 7z tar gz tgz bz2 xz")
_register("アプリ・インストーラ", "exe msi dmg pkg app apk deb rpm appimage")
_register("コード", "py js ts jsx tsx java c cpp cc h hpp cs go rs rb php html css scss json xml yml yaml sh bat ps1 sql")

OTHER_CATEGORY = "その他"
TRASH_DIR = "_削除候補"

# 整理の結果として作られるフォルダ名。二重整理を避けるためスキップ対象にする。
MANAGED_DIRS = set(CATEGORY_MAP.values()) | {OTHER_CATEGORY, TRASH_DIR}

# --------------------------------------------------------------------------
# 「削除候補」の判定に使うルール
# --------------------------------------------------------------------------
# どの OS でも安全に消せる典型的なゴミファイル名
JUNK_NAMES = {".ds_store", "thumbs.db", "desktop.ini", ".localized"}
# 未完了ダウンロードや一時ファイルの拡張子
JUNK_SUFFIXES = (".tmp", ".temp", ".crdownload", ".part", ".partial", "~")
# 一時ファイルの接頭辞（Office の作業用ファイルなど）
JUNK_PREFIXES = ("~$", ".~lock.")
# 「コピー・バックアップ・旧版」と読み取れる名前の断片（小文字で比較）
COPY_HINTS = (
    "コピー",
    " - copy",
    " copy",
    "のコピー",
    "backup",
    "バックアップ",
    "旧",
    "old_",
    "_old",
    "無題",
    "untitled",
    "新規",
)


def categorize(path: Path) -> str:
    """ファイルの拡張子からカテゴリフォルダ名を返す。"""
    ext = path.suffix.lower().lstrip(".")
    return CATEGORY_MAP.get(ext, OTHER_CATEGORY)


def is_junk_file(path: Path) -> str | None:
    """明確なゴミファイルなら理由文字列を返す。そうでなければ None。"""
    name = path.name
    lower = name.lower()
    if lower in JUNK_NAMES:
        return "OS が作る不要ファイル"
    if lower.endswith(JUNK_SUFFIXES):
        return "一時・未完了ファイル"
    if any(lower.startswith(p) for p in JUNK_PREFIXES):
        return "一時作業ファイル"
    try:
        if path.is_file() and path.stat().st_size == 0:
            return "中身が空（0バイト）"
    except OSError:
        pass
    return None


def looks_like_copy(name: str) -> bool:
    """コピー・バックアップ・旧版らしい名前かどうか。"""
    lower = name.lower()
    if any(h in lower for h in COPY_HINTS):
        return True
    # 「(1)」「(2)」... のような複製サフィックス
    stem = Path(name).stem.strip()
    if stem.endswith(tuple(f"({n})" for n in range(1, 20))):
        return True
    return False


def file_sha256(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(chunk), b""):
            h.update(block)
    return h.hexdigest()


def collision_free(dst: Path) -> Path:
    """移動先に同名があれば " (2)", " (3)" ... を付けて衝突を避ける。"""
    if not dst.exists():
        return dst
    stem, suffix, parent = dst.stem, dst.suffix, dst.parent
    n = 2
    while True:
        candidate = parent / f"{stem} ({n}){suffix}"
        if not candidate.exists():
            return candidate
        n += 1


def build_plan(target: Path, old_days: int, include_hidden: bool) -> list[tuple[Path, Path, str]]:
    """(移動元, 移動先, 理由) のリストを作る。実際の移動はまだ行わない。"""
    plan: list[tuple[Path, Path, str]] = []
    trash_root = target / TRASH_DIR

    # 直下の項目を列挙（このスクリプト自身とログは除外）
    entries = []
    for entry in sorted(target.iterdir()):
        if entry.name in MANAGED_DIRS:
            continue  # すでに整理済みのフォルダはそのまま
        if entry.name.startswith(".") and not include_hidden:
            continue  # 隠しファイル・設定フォルダは触らない
        if entry.name.startswith("organize_log_") and entry.suffix == ".csv":
            continue
        if entry.resolve() == Path(__file__).resolve():
            continue
        entries.append(entry)

    # 重複ファイル検出のため、同じサイズのファイルだけハッシュ化する
    size_groups: dict[int, list[Path]] = {}
    for entry in entries:
        if entry.is_file():
            try:
                size_groups.setdefault(entry.stat().st_size, []).append(entry)
            except OSError:
                pass
    duplicate_paths: dict[Path, Path] = {}  # 重複ファイル -> 残す代表ファイル
    for size, files in size_groups.items():
        if size == 0 or len(files) < 2:
            continue
        seen: dict[str, Path] = {}
        for f in sorted(files, key=lambda p: (len(str(p)), str(p))):
            try:
                digest = file_sha256(f)
            except OSError:
                continue
            if digest in seen:
                duplicate_paths[f] = seen[digest]
            else:
                seen[digest] = f

    old_threshold = None
    if old_days > 0:
        old_threshold = datetime.now() - timedelta(days=old_days)

    for entry in entries:
        # --- フォルダの扱い ---
        if entry.is_dir():
            try:
                is_empty = not any(entry.iterdir())
            except OSError:
                is_empty = False
            if is_empty:
                plan.append((entry, collision_free(trash_root / entry.name), "空のフォルダ"))
            elif looks_like_copy(entry.name):
                plan.append((entry, collision_free(trash_root / entry.name), "コピー・旧版らしいフォルダ名"))
            # それ以外の既存フォルダは意味があるとみなし、そのまま残す
            continue

        # --- ファイルの扱い ---
        junk_reason = is_junk_file(entry)
        if junk_reason:
            plan.append((entry, collision_free(trash_root / entry.name), junk_reason))
            continue
        if entry in duplicate_paths:
            keep = duplicate_paths[entry]
            plan.append((entry, collision_free(trash_root / entry.name), f"重複（{keep.name} と同じ内容）"))
            continue
        if looks_like_copy(entry.name):
            plan.append((entry, collision_free(trash_root / entry.name), "コピー・旧版らしいファイル名"))
            continue
        if old_threshold is not None:
            try:
                mtime = datetime.fromtimestamp(entry.stat().st_mtime)
                if mtime < old_threshold:
                    plan.append((entry, collision_free(trash_root / entry.name),
                                 f"{old_days}日以上更新なし"))
                    continue
            except OSError:
                pass

        # 通常ファイル → 種類別フォルダへ
        category = categorize(entry)
        plan.append((entry, collision_free(target / category / entry.name), f"種類: {category}"))

    return plan


def print_plan(plan: list[tuple[Path, Path, str]], target: Path) -> None:
    if not plan:
        print("整理が必要な項目は見つかりませんでした。すでに整った状態です。")
        return
    trash = [p for p in plan if p[1].parent.name == TRASH_DIR]
    normal = [p for p in plan if p[1].parent.name != TRASH_DIR]

    if normal:
        print(f"\n■ 種類別フォルダへ移動（{len(normal)} 件）")
        by_cat: dict[str, list[tuple[Path, Path, str]]] = {}
        for src, dst, reason in normal:
            by_cat.setdefault(dst.parent.name, []).append((src, dst, reason))
        for cat in sorted(by_cat):
            print(f"  └ {cat}/  ({len(by_cat[cat])} 件)")
            for src, dst, _ in by_cat[cat][:20]:
                print(f"       {src.name}")
            if len(by_cat[cat]) > 20:
                print(f"       … ほか {len(by_cat[cat]) - 20} 件")

    if trash:
        print(f"\n■ {TRASH_DIR}/ へ移動（削除候補・{len(trash)} 件）")
        for src, dst, reason in trash:
            print(f"     {src.name}  ← {reason}")

    print(f"\n合計 {len(plan)} 件を移動する計画です（対象フォルダ: {target}）。")


def apply_plan(plan: list[tuple[Path, Path, str]], log_path: Path) -> int:
    """計画を実行し、CSV ログに記録する。移動できた件数を返す。"""
    import shutil

    moved = 0
    with log_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "reason", "source", "destination"])
        for src, dst, reason in plan:
            try:
                dst.parent.mkdir(parents=True, exist_ok=True)
                dst = collision_free(dst)  # 実行時点で再チェック（別ファイルが増えている可能性）
                shutil.move(str(src), str(dst))  # ドライブ跨ぎでも動作する
                writer.writerow([datetime.now().isoformat(timespec="seconds"), reason, str(src), str(dst)])
                moved += 1
            except Exception as e:  # noqa: BLE001  個別の失敗で全体を止めない
                print(f"  [スキップ] {src} を移動できませんでした: {e}", file=sys.stderr)
    return moved


def run_undo(log_path: Path) -> None:
    if not log_path.exists():
        print(f"ログファイルが見つかりません: {log_path}", file=sys.stderr)
        sys.exit(1)
    import shutil

    rows: list[tuple[str, str]] = []
    with log_path.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append((row["source"], row["destination"]))

    restored = 0
    touched_dirs: set[Path] = set()
    # 逆順で戻す
    for source, destination in reversed(rows):
        src, dst = Path(destination), Path(source)
        if not src.exists():
            print(f"  [スキップ] 移動後のファイルが見つかりません: {src}")
            continue
        try:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(collision_free(dst)))
            touched_dirs.add(src.parent)
            restored += 1
        except Exception as e:  # noqa: BLE001
            print(f"  [スキップ] {src} を戻せませんでした: {e}", file=sys.stderr)

    # 整理で作られ、空になった種類別フォルダ／削除候補フォルダを片付ける
    for d in touched_dirs:
        try:
            if d.name in MANAGED_DIRS and d.is_dir() and not any(d.iterdir()):
                d.rmdir()
        except OSError:
            pass
    print(f"\n{restored} 件を元の場所に戻しました。")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="PC のフォルダを安全に階層整理します（削除はしません）。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("target", nargs="?", help="整理したいフォルダのパス（例: C:/Users/ryo/Desktop）")
    parser.add_argument("--apply", action="store_true", help="実際に移動を実行する（付けないと計画表示のみ）")
    parser.add_argument("--undo", metavar="ログCSV", help="指定した実行ログの移動をすべて元に戻す")
    parser.add_argument("--old-days", type=int, default=0,
                        help="指定日数以上更新されていないファイルも削除候補にする（0で無効・既定）")
    parser.add_argument("--include-hidden", action="store_true",
                        help="隠しファイル・ドット始まりのフォルダも対象にする（既定では触りません）")
    args = parser.parse_args(argv)

    if args.undo:
        run_undo(Path(args.undo))
        return 0

    if not args.target:
        parser.print_help()
        return 1

    target = Path(args.target).expanduser().resolve()
    if not target.is_dir():
        print(f"フォルダが見つかりません: {target}", file=sys.stderr)
        return 1

    plan = build_plan(target, old_days=args.old_days, include_hidden=args.include_hidden)
    print_plan(plan, target)

    if not plan:
        return 0

    if not args.apply:
        print("\n※ これはドライラン（計画表示）です。ファイルはまだ動いていません。")
        print("  実行するには、同じコマンドに --apply を付けてください。")
        return 0

    log_path = target / f"organize_log_{datetime.now():%Y%m%d_%H%M%S}.csv"
    print("\n実行中...")
    moved = apply_plan(plan, log_path)
    print(f"\n完了: {moved} 件を移動しました。")
    print(f"ログ: {log_path}")
    print(f"元に戻すには:  python3 {Path(__file__).name} --undo \"{log_path}\"")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
