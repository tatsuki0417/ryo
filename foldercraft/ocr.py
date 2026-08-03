"""OCR とスクリーンキャプチャのラッパー。

Pillow / pytesseract / Tesseract 本体が無くても import 自体は失敗しないように、
依存は関数内で遅延 import する。使えるかどうかは capability チェック関数で判定する。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Capability:
    pillow: bool
    tesseract: bool          # pytesseract パッケージ
    tesseract_bin: bool      # Tesseract 実行ファイル
    langs: tuple[str, ...]

    @property
    def can_ocr(self) -> bool:
        return self.pillow and self.tesseract and self.tesseract_bin

    @property
    def can_capture(self) -> bool:
        return self.pillow


def check_capabilities() -> Capability:
    """実行環境で何が使えるかを調べる。GUI の案内表示に使う。"""
    pillow = False
    try:
        import PIL  # noqa: F401
        pillow = True
    except Exception:
        pass

    pytess = False
    tess_bin = False
    langs: tuple[str, ...] = ()
    try:
        import pytesseract
        pytess = True
        try:
            langs = tuple(pytesseract.get_languages(config=""))
            tess_bin = True
        except Exception:
            tess_bin = False
    except Exception:
        pass

    return Capability(
        pillow=pillow, tesseract=pytess, tesseract_bin=tess_bin, langs=langs
    )


def best_lang(cap: Capability, prefer: tuple[str, ...] = ("jpn", "eng")) -> str:
    """使える言語データから OCR 用の lang 文字列（例 "jpn+eng"）を作る。"""
    available = [l for l in prefer if l in cap.langs]
    if not available:
        # 利用可能言語が取れない場合は素直に prefer を渡す（環境次第で動く）
        return "+".join(prefer)
    return "+".join(available)


def image_to_text(image, lang: str = "jpn+eng", psm: int = 6) -> str:
    """Pillow の Image オブジェクトを OCR してテキストを返す。

    psm=6 は「単一の均一なテキストブロック」。リスト状のスクショに向く。
    """
    import pytesseract

    config = f"--psm {psm}"
    return pytesseract.image_to_string(image, lang=lang, config=config)


def load_image(path: str):
    """画像ファイルを開いて Pillow Image を返す。"""
    from PIL import Image

    return Image.open(path)


def grab_clipboard():
    """クリップボードの画像を取得する。無ければ None。"""
    from PIL import ImageGrab

    img = ImageGrab.grabclipboard()
    # Linux などでは file list が返ることがある
    if isinstance(img, list):
        return None
    return img


def grab_screen(bbox=None):
    """画面（または bbox 領域）をキャプチャして Pillow Image を返す。

    bbox=(left, top, right, bottom)。None なら全画面。
    """
    from PIL import ImageGrab

    return ImageGrab.grab(bbox=bbox)
