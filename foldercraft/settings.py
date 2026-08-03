"""前回の作成先やテンプレートなどを覚えておくための簡易設定保存。

ホームディレクトリの ~/.foldercraft.json に保存する。壊れていても落ちない。
"""

from __future__ import annotations

import json
import os

_PATH = os.path.join(os.path.expanduser("~"), ".foldercraft.json")


def load_settings() -> dict:
    try:
        with open(_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def save_settings(data: dict) -> None:
    try:
        with open(_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except OSError:
        pass
