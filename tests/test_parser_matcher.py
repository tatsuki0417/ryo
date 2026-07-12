"""パーサーとマッチャーの基本動作テスト。"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from ticket_watch.matcher import matches
from ticket_watch.parser import parse_post

RESALE_FILTER = ["定価以上", "良席のため", "プレミア"]

WANT = {
    "type": "譲",
    "keywords": ["サンプルアーティスト"],
    "exclude_keywords": ["高額"],
    "max_tickets": 2,
}


def test_parse_yuzuru_post():
    post = parse_post(
        "1", "fan", "【譲】サンプルアーティスト 12/24 ２枚 定価 同時入場", RESALE_FILTER
    )
    assert post.post_type == "譲"
    assert post.ticket_count == 2
    assert post.is_face_value
    assert not post.resale_flags


def test_parse_detects_resale_words():
    post = parse_post("2", "bot", "【譲】良席のため プレミア価格で", RESALE_FILTER)
    assert post.resale_flags == ["良席のため", "プレミア"]
    ok, reason = matches(post, WANT)
    assert not ok
    assert "高額転売" in reason


def test_match_ok():
    post = parse_post("3", "fan", "【譲】サンプルアーティスト 2枚 定価", RESALE_FILTER)
    ok, _ = matches(post, WANT)
    assert ok


def test_match_rejects_wrong_type():
    post = parse_post("4", "fan", "【求】サンプルアーティスト 1枚 定価", RESALE_FILTER)
    ok, reason = matches(post, WANT)
    assert not ok
    assert "種別" in reason


def test_match_rejects_too_many_tickets():
    post = parse_post("5", "fan", "【譲】サンプルアーティスト 4枚 定価", RESALE_FILTER)
    ok, reason = matches(post, WANT)
    assert not ok
    assert "枚数" in reason


def test_match_rejects_missing_keyword():
    post = parse_post("6", "fan", "【譲】別のアーティスト 1枚 定価", RESALE_FILTER)
    ok, reason = matches(post, WANT)
    assert not ok
