"""X (旧Twitter) API v2 クライアント。

読み取り(検索)のみ。投稿・DM送信の機能は意図的に持たせていない。
X_BEARER_TOKEN が未設定のときはモックモードになり、
data/mock_tweets.json をデータ源として全体の動作確認ができる。
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import requests

SEARCH_URL = "https://api.x.com/2/tweets/search/recent"

MOCK_FILE = Path(__file__).resolve().parents[2] / "data" / "mock_tweets.json"


class XClient:
    def __init__(self, bearer_token: str | None = None):
        self.bearer_token = bearer_token or os.environ.get("X_BEARER_TOKEN")

    @property
    def is_mock(self) -> bool:
        return not self.bearer_token

    def search_recent(self, query: str, since_id: str | None = None) -> list[dict]:
        """直近7日間のツイートを検索して返す。

        Returns:
            [{"id": ..., "author": ..., "text": ...}, ...] 新しい順。
        """
        if self.is_mock:
            return self._search_mock(query, since_id)

        params: dict = {
            "query": query,
            "max_results": 50,
            "tweet.fields": "author_id,created_at",
            "expansions": "author_id",
            "user.fields": "username",
        }
        if since_id:
            params["since_id"] = since_id

        resp = requests.get(
            SEARCH_URL,
            params=params,
            headers={"Authorization": f"Bearer {self.bearer_token}"},
            timeout=30,
        )
        if resp.status_code == 429:
            print("[warn] X API レート制限。今回はこのクエリをスキップします。")
            return []
        resp.raise_for_status()
        body = resp.json()

        users = {
            u["id"]: u["username"] for u in body.get("includes", {}).get("users", [])
        }
        return [
            {
                "id": t["id"],
                "author": users.get(t["author_id"], t["author_id"]),
                "text": t["text"],
            }
            for t in body.get("data", [])
        ]

    def _search_mock(self, query: str, since_id: str | None) -> list[dict]:
        """モックモード: ローカルの JSON をデータ源にする。"""
        if not MOCK_FILE.exists():
            return []
        tweets = json.loads(MOCK_FILE.read_text(encoding="utf-8"))
        if since_id:
            tweets = [t for t in tweets if int(t["id"]) > int(since_id)]
        return tweets
