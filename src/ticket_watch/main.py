"""エントリポイント: 検索 → 解析 → マッチング → 通知 を1回実行する。

定期実行は GitHub Actions (.github/workflows/watch.yml) が担当。
ローカルでは `python -m ticket_watch.main` で手動実行できる。
"""

from __future__ import annotations

from pathlib import Path

import yaml

from .matcher import matches
from .notifier import build_notification, notify_console, notify_github_issue
from .parser import parse_post
from .state import load_state, save_state
from .x_client import XClient

CONFIG_FILE = Path(__file__).resolve().parents[2] / "config.yaml"


def run() -> int:
    config = yaml.safe_load(CONFIG_FILE.read_text(encoding="utf-8"))
    state = load_state()
    client = XClient()

    if client.is_mock:
        print("[info] X_BEARER_TOKEN 未設定 → モックモード (data/mock_tweets.json を使用)")

    notify_cfg = config.get("notify", {})
    safety = config.get("safety", {})
    resale_filter = safety.get("resale_filter", [])
    max_notify = safety.get("max_notifications_per_run", 5)
    draft = (config.get("draft_template") or "").strip()

    notified = 0
    for search in config.get("searches", []):
        label = search["label"]
        query = search["query"]
        want = search.get("want", {})
        since_id = state["since_ids"].get(label)

        print(f"[search] {label}: {query}")
        tweets = client.search_recent(query, since_id=since_id)
        print(f"  → {len(tweets)} 件取得")

        if tweets:
            state["since_ids"][label] = max(tweets, key=lambda t: int(t["id"]))["id"]

        for tweet in tweets:
            if tweet["id"] in state["notified_ids"]:
                continue

            post = parse_post(
                tweet["id"], tweet["author"], tweet["text"], resale_filter
            )
            ok, reason = matches(post, want)
            if not ok:
                print(f"  skip {post.url}: {reason}")
                continue

            if notified >= max_notify:
                print("[warn] 通知上限に達したため残りは次回実行に回します")
                break

            title, body = build_notification(post, label, draft)
            if notify_cfg.get("console", True):
                notify_console(title, body)
            if notify_cfg.get("github_issue"):
                notify_github_issue(title, body)

            state["notified_ids"].append(tweet["id"])
            notified += 1

    save_state(state)
    print(f"[done] 通知 {notified} 件")
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
