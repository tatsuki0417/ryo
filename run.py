#!/usr/bin/env python3
"""どこからでも起動できるランチャー。

引数なしで実行すると GUI、引数を付けると CLI として動く。
`python run.py` / ダブルクリック / `python run.py --seq ...` のいずれも可。
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from foldercraft.__main__ import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
