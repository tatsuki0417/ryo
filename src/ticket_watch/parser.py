"""投稿本文からチケット情報を抽出するルールベースパーサー。

LLM を使わずに正規表現で「譲/求・枚数・定価かどうか」を推定する。
完璧な抽出より「危険な投稿（高額転売）を通知しない」ことを優先する。
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class TicketPost:
    """1件の投稿から抽出したチケット情報。"""

    tweet_id: str
    author: str
    text: str
    url: str
    post_type: str = "不明"  # 譲 / 求 / 交換 / 不明
    ticket_count: int = 0  # 0 = 不明
    is_face_value: bool = False  # 定価取引を明示しているか
    resale_flags: list[str] = field(default_factory=list)  # 高額転売の疑いワード


# 「譲」「求」は同一投稿に両方出ることが多い（例:【譲】A公演【求】B公演）。
# 先に出てくるほうを主種別とみなす。
_TYPE_PATTERN = re.compile(r"[【\[(（]?\s*(譲|求|交換)\s*[】\])）]?")

# 枚数: 「2枚」「１枚」など。全角数字にも対応。
_COUNT_PATTERN = re.compile(r"([0-9０-９]+)\s*枚")

_FACE_VALUE_WORDS = ("定価", "額面", "同時入場", "手渡し")


def _to_int(s: str) -> int:
    return int(s.translate(str.maketrans("０１２３４５６７８９", "0123456789")))


def parse_post(
    tweet_id: str,
    author: str,
    text: str,
    resale_filter: list[str] | None = None,
) -> TicketPost:
    """投稿本文を解析して TicketPost を返す。"""
    post = TicketPost(
        tweet_id=tweet_id,
        author=author,
        text=text,
        url=f"https://x.com/{author}/status/{tweet_id}",
    )

    type_match = _TYPE_PATTERN.search(text)
    if type_match:
        post.post_type = type_match.group(1)

    count_match = _COUNT_PATTERN.search(text)
    if count_match:
        post.ticket_count = _to_int(count_match.group(1))

    post.is_face_value = any(w in text for w in _FACE_VALUE_WORDS)

    for word in resale_filter or []:
        if word in text:
            post.resale_flags.append(word)

    return post
