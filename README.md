# FolderCraft 🗂️

**スクショ・テキスト・連番から、フォルダを一気に作る**痒いところに手が届くツール。

- 📷 **スクショ/画像から作成** — 画面キャプチャや画像を OCR で読み取り、書かれている名前でフォルダを一括作成
- 📋 **テキストから作成** — 複数行を貼り付ければ、1 行 = 1 フォルダで一気に作成
- 🔢 **連番で作成** — Excel のオートフィル感覚で「案件_001_資料」〜のような連番フォルダを大量生成
- 🖥️ **GUI と CLI の両対応** — マウスでポチポチも、コマンド一発も

Windows / macOS / Linux 対応。コア機能は Python 標準ライブラリだけで動きます。

---

## クイックスタート

### GUI で使う

```bash
python -m foldercraft
```

ウィンドウが開きます。上部のタブで「スクショ/画像」「テキスト」「連番」を切り替え、
作成先フォルダを選んで **［フォルダを作成］** を押すだけ。作成前に必ずプレビューで確認できます。

### CLI で使う

```bash
# テキストファイルの各行からフォルダ作成
python -m foldercraft names.txt -d ./出力先

# 標準入力から（パイプ）
cat names.txt | python -m foldercraft - -d ./出力先

# 連番作成（案件_001 〜 案件_010）
python -m foldercraft --seq --template "案件_{n}" --start 1 --count 10 --pad 3 -d ./出力先

# スクショ画像を OCR してフォルダ作成
python -m foldercraft --ocr shot.png -d ./出力先

# まず確認だけ（実際には作らない）
python -m foldercraft names.txt -d ./出力先 --dry-run
```

---

## インストール

### 1. コア機能だけ（テキスト・連番・CLI）

追加インストール不要です。Python 3.9 以上があれば動きます。

```bash
git clone <このリポジトリ>
cd ryo
python -m foldercraft --seq --template "テスト_{n}" --count 3 -d .
```

### 2. スクショ OCR まで使う

画像から文字を読み取るには **Pillow** と **Tesseract OCR** が必要です。

```bash
pip install -r requirements.txt
```

さらに Tesseract 本体（＋日本語データ）をインストールします。

| OS | インストール方法 |
|----|------------------|
| **Windows** | [UB Mannheim ビルド](https://github.com/UB-Mannheim/tesseract/wiki) のインストーラを使用。インストール時に **Japanese** の言語データにチェック |
| **macOS** | `brew install tesseract tesseract-lang` |
| **Ubuntu/Debian** | `sudo apt install tesseract-ocr tesseract-ocr-jpn` |

> GUI 起動時に OCR が使えるかどうかを自動判定して画面上部に表示します。
> Tesseract が無い場合でも、画像の読み込みや手入力での編集は可能です。

Linux で GUI（Tkinter）が入っていない場合は `sudo apt install python3-tk` を実行してください。

---

## 機能の詳細

### スクショ/画像タブ

- **画像を開く** … PNG/JPG などのファイルを OCR
- **クリップボードから貼り付け** … `Win+Shift+S` などで撮ったスクショをそのまま
- **画面をキャプチャ** … ボタンを押すとウィンドウが一旦引っ込み、全画面を撮影して OCR

OCR 結果はテキストボックスで**自由に編集**できます（誤認識の修正や不要行の削除）。
1 行が 1 つのフォルダになります。

### テキストタブ

メモやチャットからコピペした複数行を、そのままフォルダ名に。
行頭の箇条書き記号（`・` `-` `1.` `(2)` など）は自動で取り除きます。

### 連番タブ

| 項目 | 説明 | 例 |
|------|------|----|
| テンプレート | `{n}` が番号に置き換わる（無ければ末尾に付与） | `案件_{n}_資料` |
| 開始番号 | 最初の番号 | `1` |
| 件数 | 作る個数 | `10` |
| 刻み | 増分（マイナス可） | `1` |
| ゼロ埋め桁 | `0` で自動（最大値の桁に合わせる） | `3` → `001` |

例）テンプレート `Room{n}` / 開始 `101` / 件数 `3` / 刻み `1` → `Room101`, `Room102`, `Room103`

### 共通機能

- **プレビュー** … 作成前に「作成されるフォルダ名」と「状態（新規/既存/スキップ）」を一覧表示
- **重複時の挙動** …
  - `skip`（既定）: 既にあるものは飛ばす
  - `rename`: `名前 (2)`, `名前 (3)` と枝番を付けて作る
  - `error`: 既存があれば失敗として記録
- **重複行を除去** … 同じ名前が複数あっても 1 つにまとめる
- **安全なフォルダ名** … `\ / : * ? " < > |` などの使用不可文字を自動で `_` に置換。
  Windows の予約名（`CON`, `COM1` 等）や末尾ドットも自動回避
- **設定の記憶** … 前回の作成先・テンプレートを `~/.foldercraft.json` に保存

---

## 開発

```bash
# テスト実行（標準ライブラリのみ）
python -m unittest discover -s tests -v
```

### 構成

```
foldercraft/
  core.py      … サニタイズ・連番生成・作成計画・フォルダ作成（純ロジック / テスト対象）
  ocr.py       … Tesseract / Pillow のラッパー（依存は遅延読み込み）
  cli.py       … コマンドライン
  app.py       … Tkinter GUI
  settings.py  … 設定の保存/読込
tests/
  test_core.py … コアロジックの単体テスト
```

GUI・OCR に依存しないコアロジックを `core.py` に分離しているので、
ロジックは追加ライブラリ無しで完全にテストできます。
