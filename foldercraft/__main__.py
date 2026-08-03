"""`python -m foldercraft` のエントリポイント。

引数があれば CLI、無ければ GUI を起動する。
"""

from __future__ import annotations

import sys


def main() -> int:
    if len(sys.argv) > 1:
        from .cli import main as cli_main
        return cli_main()
    # 引数なし → GUI
    from .app import main as gui_main
    gui_main()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
