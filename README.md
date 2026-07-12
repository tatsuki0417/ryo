# ticket-watch — SNSチケットトレード監視ツール

X (旧Twitter) からチケットの譲渡・交換（譲/求）投稿を定期的に検索し、
条件に合うものを **通知＋返信の下書き付き** で知らせるツールです。

**送信は必ず自分で行います。** 自動送信機能は意図的に実装していません
（Xの自動化ポリシー違反によるアカウント凍結の防止と、
チケット不正転売禁止法への配慮のため、定価トレードの補助に特化しています）。

## 仕組み

```
GitHub Actions (30分おき・無料)
  └─ X API v2 で検索 (譲/求 キーワード)
       └─ パース (譲/求・枚数・定価か・転売疑いワード)
            └─ config.yaml の希望条件とマッチング
                 └─ 合致 → GitHub Issue を作成して通知 (スマホにプッシュ通知)
                          + 返信下書きを添付 → 自分で確認して手動送信
```

## 費用

| 項目 | 費用 |
| --- | --- |
| 実行環境 (GitHub Actions) | **無料** (パブリックは無制限、プライベートも月2,000分の枠内) |
| 通知 (GitHub Issue + モバイルアプリ) | **無料** |
| X API v2 検索 | **有料** (Basic プラン。料金は [developer.x.com](https://developer.x.com) で確認) |

X API キーがなくても**モックモード**で全体の動作確認ができます。

## セットアップ

1. **希望条件を書く**: `config.yaml` の `searches` を自分の探したい公演に書き換える
2. **X API キーを登録** (本稼働時):
   リポジトリの Settings → Secrets and variables → Actions →
   `X_BEARER_TOKEN` に X API v2 の Bearer Token を登録
3. **通知を受け取る**: スマホに GitHub モバイルアプリを入れ、
   このリポジトリを Watch (Custom → Issues) に設定
4. あとは放置でOK。30分おきに自動実行されます
   (Actions タブ → ticket-watch → Run workflow で手動実行も可能)

## ローカルでの動作確認

```bash
pip install -r requirements.txt

# モックモード (data/mock_tweets.json を使用。APIキー不要)
cd src && python -m ticket_watch.main

# テスト
pip install pytest && pytest
```

本物のXを検索する場合は環境変数 `X_BEARER_TOKEN` を設定してから実行します。

## 構成

```
config.yaml               # 検索条件・通知設定 (ここだけ触ればOK)
src/ticket_watch/
  main.py                 # エントリポイント (検索→解析→通知)
  x_client.py             # X API v2 検索 (キーなしならモック)
  parser.py               # 譲/求・枚数・定価・転売疑いの抽出
  matcher.py              # 希望条件とのマッチング
  notifier.py             # GitHub Issue / コンソール通知
  state.py                # 通知済みIDの記録 (重複通知防止)
.github/workflows/watch.yml  # 30分おきの定期実行
data/state.json           # 実行状態 (Actions が自動コミット)
```

## 安全のための設計

- 検知した投稿でも `定価以上` `プレミア` などの語を含むものは通知しない (`safety.resale_filter`)
- 1回の実行での通知は最大5件 (`safety.max_notifications_per_run`)
- X への書き込み系 API は一切呼ばない (読み取り専用)
