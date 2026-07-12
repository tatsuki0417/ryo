"""希望条件 (config の want) と投稿のマッチング。"""

from __future__ import annotations

from .parser import TicketPost


def matches(post: TicketPost, want: dict) -> tuple[bool, str]:
    """投稿が希望条件に合うか判定する。

    Returns:
        (合致したか, 合致しなかった理由)
    """
    if post.resale_flags:
        return False, f"高額転売の疑いワードを含む: {', '.join(post.resale_flags)}"

    want_type = want.get("type")
    if want_type and post.post_type != want_type:
        return False, f"投稿種別が {post.post_type} (希望: {want_type})"

    for kw in want.get("keywords") or []:
        if kw not in post.text:
            return False, f"キーワード「{kw}」が本文にない"

    for kw in want.get("exclude_keywords") or []:
        if kw in post.text:
            return False, f"除外キーワード「{kw}」を含む"

    max_tickets = want.get("max_tickets") or 0
    if max_tickets and post.ticket_count > max_tickets:
        return False, f"枚数 {post.ticket_count} が上限 {max_tickets} を超過"

    return True, ""
