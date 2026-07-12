"""実行状態の永続化（重複通知の防止）。

通知済みツイートIDと、検索ごとの最終取得ID (since_id) を
data/state.json に保存する。GitHub Actions ではこのファイルを
実行後にコミットして次回に引き継ぐ。
"""

from __future__ import annotations

import json
from pathlib import Path

STATE_FILE = Path(__file__).resolve().parents[2] / "data" / "state.json"

_MAX_NOTIFIED_IDS = 2000  # 際限なく増えないよう古いものから切り捨てる


def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {"since_ids": {}, "notified_ids": []}


def save_state(state: dict) -> None:
    state["notified_ids"] = state.get("notified_ids", [])[-_MAX_NOTIFIED_IDS:]
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(
        json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8"
    )
