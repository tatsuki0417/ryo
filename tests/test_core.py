"""core モジュールの単体テスト（標準ライブラリのみで実行可能）。"""

from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from foldercraft import core  # noqa: E402


class SanitizeTest(unittest.TestCase):
    def test_removes_invalid_chars(self):
        self.assertEqual(core.sanitize_name('a/b:c*?"<>|d'), "a_b_c______d")

    def test_strips_whitespace_and_trailing_dot(self):
        self.assertEqual(core.sanitize_name("  hello  "), "hello")
        self.assertEqual(core.sanitize_name("name..."), "name")
        self.assertEqual(core.sanitize_name("name.   "), "name")

    def test_empty_becomes_empty(self):
        self.assertEqual(core.sanitize_name("   "), "")
        self.assertEqual(core.sanitize_name(""), "")
        self.assertEqual(core.sanitize_name(None), "")

    def test_reserved_names(self):
        self.assertEqual(core.sanitize_name("CON"), "CON_")
        self.assertEqual(core.sanitize_name("com1"), "com1_")

    def test_keeps_japanese(self):
        self.assertEqual(core.sanitize_name("案件_資料 "), "案件_資料")


class NormalizeLinesTest(unittest.TestCase):
    def test_basic_split_and_blank_drop(self):
        text = "a\n\n  b  \n\nc\n"
        self.assertEqual(core.normalize_lines(text), ["a", "b", "c"])

    def test_trim_bullets(self):
        text = "・りんご\n- ばなな\n1. みかん\n(2) ぶどう"
        self.assertEqual(
            core.normalize_lines(text),
            ["りんご", "ばなな", "みかん", "ぶどう"],
        )

    def test_dedupe(self):
        text = "a\nb\na\nc\nb"
        self.assertEqual(core.normalize_lines(text, dedupe=True), ["a", "b", "c"])


class SequenceTest(unittest.TestCase):
    def test_basic(self):
        spec = core.SequenceSpec(template="資料_{n}", start=1, count=3)
        self.assertEqual(spec.generate(), ["資料_1", "資料_2", "資料_3"])

    def test_auto_pad(self):
        spec = core.SequenceSpec(template="p{n}", start=1, count=10)
        got = spec.generate()
        self.assertEqual(got[0], "p01")
        self.assertEqual(got[-1], "p10")

    def test_manual_pad_and_step(self):
        spec = core.SequenceSpec(template="{n}号室", start=100, count=3, step=2, pad=4)
        self.assertEqual(spec.generate(), ["0100号室", "0102号室", "0104号室"])

    def test_template_without_placeholder_appends(self):
        spec = core.SequenceSpec(template="部屋", start=1, count=2)
        self.assertEqual(spec.generate(), ["部屋1", "部屋2"])

    def test_zero_count(self):
        self.assertEqual(core.SequenceSpec(count=0).generate(), [])

    def test_negative_numbers(self):
        spec = core.SequenceSpec(template="t{n}", start=-1, count=2, step=-1)
        self.assertEqual(spec.generate(), ["t-1", "t-2"])


class PlanAndCreateTest(unittest.TestCase):
    def setUp(self):
        import tempfile
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_plan_marks_empty_and_duplicate(self):
        plan = core.build_plan(["a", "", "a"], self.tmp)
        statuses = [i.status for i in plan.items]
        self.assertEqual(statuses, ["ok", "empty", "duplicate"])

    def test_create_and_skip_existing(self):
        plan = core.build_plan(["one", "two"], self.tmp)
        result = core.create_folders(plan)
        self.assertEqual(sorted(result.created), ["one", "two"])
        self.assertTrue(os.path.isdir(os.path.join(self.tmp, "one")))

        # 2回目は既存としてスキップ
        plan2 = core.build_plan(["one", "three"], self.tmp, conflict=core.Conflict.SKIP)
        result2 = core.create_folders(plan2, conflict=core.Conflict.SKIP)
        self.assertEqual(result2.created, ["three"])
        self.assertEqual(len(result2.skipped), 1)

    def test_rename_on_conflict(self):
        core.create_folders(core.build_plan(["dup"], self.tmp))
        plan = core.build_plan(["dup", "dup"], self.tmp, conflict=core.Conflict.RENAME)
        result = core.create_folders(plan, conflict=core.Conflict.RENAME)
        self.assertEqual(result.created, ["dup (2)", "dup (3)"])

    def test_error_on_conflict(self):
        core.create_folders(core.build_plan(["x"], self.tmp))
        plan = core.build_plan(["x"], self.tmp, conflict=core.Conflict.ERROR)
        result = core.create_folders(plan, conflict=core.Conflict.ERROR)
        self.assertFalse(result.ok)
        self.assertEqual(len(result.failed), 1)

    def test_dry_run_creates_nothing(self):
        plan = core.build_plan(["ghost"], self.tmp)
        result = core.create_folders(plan, dry_run=True)
        self.assertEqual(result.created, ["ghost"])
        self.assertFalse(os.path.exists(os.path.join(self.tmp, "ghost")))


if __name__ == "__main__":
    unittest.main()
