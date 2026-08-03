"""コアロジック（標準ライブラリのみ）。

- フォルダ名のサニタイズ
- テキスト行 → フォルダ名候補への整形
- Excel風の連番生成
- 実際のフォルダ作成（プレビュー・重複処理つき）

GUI やOCR に依存しないので、単体テストしやすいように分離してある。
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Iterable

# Windows/mac/Linux いずれでも問題になりうる文字をまとめて禁止扱いにする。
# （\ / : * ? " < > | と制御文字）
_INVALID_CHARS = re.compile(r'[\\/:*?"<>|\x00-\x1f]')

# 末尾のドット・空白は Windows で問題になるので落とす。
_TRAILING = re.compile(r"[ .]+$")

# Windows の予約デバイス名。フォルダ名として使うと不具合が出るのでリネームする。
_RESERVED = {
    "con", "prn", "aux", "nul",
    *(f"com{i}" for i in range(1, 10)),
    *(f"lpt{i}" for i in range(1, 10)),
}


class Conflict(str, Enum):
    """作成先に同名フォルダが既にある場合の挙動。"""

    SKIP = "skip"        # 何もしない
    RENAME = "rename"    # 末尾に (2), (3)... を付けて作る
    ERROR = "error"      # 失敗として記録する


def sanitize_name(name: str, replacement: str = "_") -> str:
    """1件のテキストを安全なフォルダ名に整える。

    - 前後の空白を除去
    - 使用不可文字を replacement に置換
    - 末尾のドット/空白を除去
    - Windows 予約名は末尾に _ を付けて回避
    空文字になった場合は "" を返す（呼び出し側でスキップ判定する）。
    """
    if name is None:
        return ""
    cleaned = _INVALID_CHARS.sub(replacement, name).strip()
    cleaned = _TRAILING.sub("", cleaned)
    if not cleaned:
        return ""
    if cleaned.lower() in _RESERVED:
        cleaned = cleaned + "_"
    return cleaned


def normalize_lines(
    text: str,
    *,
    strip: bool = True,
    drop_blank: bool = True,
    dedupe: bool = False,
    trim_bullets: bool = True,
) -> list[str]:
    """複数行テキスト（OCR結果や貼り付け）をフォルダ名候補のリストに整える。

    trim_bullets が真なら、行頭の箇条書き記号（・, -, *, 数字. など）を落とす。
    dedupe が真なら、出現順を保ったまま重複を除去する。
    """
    # 記号系（・• 等）はスペース無しも許容。ハイフン/アスタリスクや数字付きは
    # 名前中のハイフンを誤って削らないよう、後ろのスペースを必須にする。
    bullet = re.compile(r"^\s*(?:[・•‣▪●○]\s*|[-*]\s+|\d+[.)、]\s+|[（(]\d+[）)]\s+)")
    out: list[str] = []
    seen: set[str] = set()
    for raw in text.splitlines():
        line = raw
        if trim_bullets:
            line = bullet.sub("", line)
        if strip:
            line = line.strip()
        if drop_blank and not line.strip():
            continue
        if dedupe:
            if line in seen:
                continue
            seen.add(line)
        out.append(line)
    return out


@dataclass
class SequenceSpec:
    """Excel風の連番生成の指定。

    template 内の "{n}" が連番に置き換わる。{n} が無ければ末尾に付く。
    例: template="案件_{n}_資料", start=1, count=3, step=1, pad=2
        -> ["案件_01_資料", "案件_02_資料", "案件_03_資料"]
    """

    template: str = "{n}"
    start: int = 1
    count: int = 10
    step: int = 1
    pad: int = 0          # 0 = 自動（生成される最大値の桁数に合わせる）
    upper: bool = False   # {a} 用の英字連番で使う大文字/小文字（下記参照）

    def _numbers(self) -> list[int]:
        if self.count <= 0:
            return []
        return [self.start + self.step * i for i in range(self.count)]

    def _auto_pad(self, numbers: list[int]) -> int:
        if self.pad > 0:
            return self.pad
        widest = max((len(str(abs(n))) for n in numbers), default=1)
        return widest

    def generate(self) -> list[str]:
        numbers = self._numbers()
        if not numbers:
            return []
        width = self._auto_pad(numbers)
        tpl = self.template if "{n}" in self.template else self.template + "{n}"
        result = []
        for n in numbers:
            sign = "-" if n < 0 else ""
            body = f"{abs(n):0{width}d}"
            result.append(tpl.replace("{n}", f"{sign}{body}"))
        return result


@dataclass
class PlanItem:
    """作成計画の1件。"""

    source: str          # 元テキスト
    name: str            # サニタイズ後のフォルダ名（空ならスキップ対象）
    status: str          # "ok" | "empty" | "duplicate" | "exists"
    final_name: str = "" # 実際に作られる名前（リネーム後含む）


@dataclass
class Plan:
    """作成前のプレビュー結果。"""

    base_dir: str
    items: list[PlanItem] = field(default_factory=list)

    @property
    def creatable(self) -> list[PlanItem]:
        return [i for i in self.items if i.status in ("ok", "exists") and i.final_name]

    def summary(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for i in self.items:
            counts[i.status] = counts.get(i.status, 0) + 1
        return counts


def build_plan(
    names: Iterable[str],
    base_dir: str,
    *,
    conflict: Conflict = Conflict.SKIP,
    replacement: str = "_",
) -> Plan:
    """作成計画（プレビュー）を組み立てる。実際にはまだ作らない。

    同一バッチ内の重複、および既存フォルダとの衝突を status に反映する。
    conflict=RENAME の場合は衝突時の最終名（(2) 付き等）も計算する。
    """
    plan = Plan(base_dir=base_dir)
    used: set[str] = set()  # このバッチで確保済みの最終名（小文字比較）

    def exists_on_disk(final: str) -> bool:
        return os.path.exists(os.path.join(base_dir, final))

    def reserve_unique(name: str) -> str:
        """RENAME 用に (2),(3)... を付けて未使用の名前を返す。"""
        candidate = name
        i = 2
        while candidate.lower() in used or exists_on_disk(candidate):
            candidate = f"{name} ({i})"
            i += 1
        used.add(candidate.lower())
        return candidate

    for src in names:
        clean = sanitize_name(src, replacement=replacement)
        if not clean:
            plan.items.append(PlanItem(source=src, name="", status="empty"))
            continue

        key = clean.lower()
        on_disk = exists_on_disk(clean)
        in_batch = key in used

        if conflict is Conflict.RENAME:
            final = reserve_unique(clean)
            status = "ok" if final == clean and not on_disk else "exists"
            plan.items.append(
                PlanItem(source=src, name=clean, status=status, final_name=final)
            )
            continue

        # SKIP / ERROR は衝突を作らない
        if in_batch:
            plan.items.append(PlanItem(source=src, name=clean, status="duplicate"))
            continue
        used.add(key)
        if on_disk:
            plan.items.append(
                PlanItem(source=src, name=clean, status="exists", final_name=clean)
            )
        else:
            plan.items.append(
                PlanItem(source=src, name=clean, status="ok", final_name=clean)
            )
    return plan


@dataclass
class CreateResult:
    created: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    failed: list[tuple[str, str]] = field(default_factory=list)  # (name, error)

    @property
    def ok(self) -> bool:
        return not self.failed


def create_folders(
    plan: Plan,
    *,
    conflict: Conflict = Conflict.SKIP,
    dry_run: bool = False,
) -> CreateResult:
    """プレビュー計画に従って実際にフォルダを作る。

    dry_run=True なら作らずに、作られる予定を created に入れて返す。
    """
    result = CreateResult()
    for item in plan.items:
        if item.status == "empty":
            result.skipped.append(f"(空) {item.source!r}")
            continue
        if item.status == "duplicate":
            result.skipped.append(f"(バッチ内重複) {item.name}")
            continue
        if item.status == "exists" and conflict is Conflict.SKIP:
            result.skipped.append(f"(既存) {item.name}")
            continue
        if item.status == "exists" and conflict is Conflict.ERROR:
            result.failed.append((item.name, "既に存在します"))
            continue

        target_name = item.final_name or item.name
        path = os.path.join(plan.base_dir, target_name)
        if dry_run:
            result.created.append(target_name)
            continue
        try:
            os.makedirs(path, exist_ok=False)
            result.created.append(target_name)
        except FileExistsError:
            if conflict is Conflict.SKIP:
                result.skipped.append(f"(既存) {target_name}")
            else:
                result.failed.append((target_name, "既に存在します"))
        except OSError as exc:
            result.failed.append((target_name, str(exc)))
    return result
