"""通知: コンソール出力 と GitHub Issue 作成。

GitHub Issue 通知は GitHub Actions 上で動くときに GITHUB_TOKEN を使う。
GitHub モバイルアプリを入れておけば Issue 作成時にプッシュ通知が届くので、
追加サービスなし・無料で通知が完結する。
"""

from __future__ import annotations

import os

import requests

from .parser import TicketPost


def build_notification(post: TicketPost, label: str, draft: str) -> tuple[str, str]:
    """通知のタイトルと本文を組み立てる。"""
    title = f"🎫 [{label}] {post.post_type} {post.ticket_count or '?'}枚: @{post.author}"
    body = f"""## 見つかった投稿

- **検索**: {label}
- **投稿者**: @{post.author}
- **種別**: {post.post_type} / **枚数**: {post.ticket_count or "不明"} / **定価の記載**: {"あり" if post.is_face_value else "なし ⚠️ 本文をよく確認"}
- **URL**: {post.url}

> {post.text}

## 返信の下書き（送信は必ず自分で内容確認のうえ手動で）

```
{draft}
```

---
⚠️ 取引前チェック: 定価であること / 相手のアカウントの取引実績 / 公式リセール(定価トレード)対象公演ならそちらを優先。
"""
    return title, body


def notify_console(title: str, body: str) -> None:
    print("=" * 70)
    print(title)
    print(body)


def notify_github_issue(title: str, body: str) -> bool:
    """このリポジトリに Issue を作成して通知する。Actions 上でのみ動作。"""
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")  # 例: owner/repo (Actions が自動設定)
    if not token or not repo:
        print("[info] GITHUB_TOKEN/GITHUB_REPOSITORY 未設定のため Issue 通知はスキップ")
        return False

    resp = requests.post(
        f"https://api.github.com/repos/{repo}/issues",
        json={"title": title, "body": body, "labels": ["ticket-alert"]},
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        },
        timeout=30,
    )
    if resp.status_code == 201:
        print(f"[ok] Issue を作成しました: {resp.json().get('html_url')}")
        return True
    print(f"[warn] Issue 作成に失敗: {resp.status_code} {resp.text[:200]}")
    return False
