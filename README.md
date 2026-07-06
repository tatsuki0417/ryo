# ryo remote 🖥️📱

スマホから自分のPCを操作する外部ツールです。

- **電源操作**: スリープ / 画面ロック / ログオフ / 再起動 / シャットダウン をスマホから選んで実行
- **カメラ**: PCのWebカメラ（家カメラ）の映像をスマホでライブ表示＋スナップショット保存
- **外出先からもOK**: Cloudflare Tunnel 連携で、モバイル回線でもスマホのブラウザから操作（ポート開放不要・自動HTTPS）
- **アプリ不要**: PC側で小さなサーバーを起動し、スマホは **ブラウザで開くだけ**
- **クロスプラットフォーム**: Windows / macOS / Linux（OSを自動判別）
- **追加インストール不要**: Node.js標準機能のみ（カメラを使う場合だけ `ffmpeg` が必要）

```
┌──────────┐   同じWi-Fi   ┌───────────────────────┐
│  スマホ   │ ───────────▶ │  PC（ryo-remoteサーバー） │
│ ブラウザ  │ ◀─────────── │  電源操作 / カメラ配信     │
└──────────┘   映像・操作   └───────────────────────┘
```

---

## 必要なもの

- **PC側**: [Node.js](https://nodejs.org/) 18以上
- **カメラ機能を使う場合**: [ffmpeg](https://ffmpeg.org/)（PCにインストール）
- スマホとPCが **同じWi-Fi（LAN）** にあること

---

## セットアップ

```bash
# 1. このリポジトリを取得
git clone <this-repo-url>
cd ryo

# 2. PIN(暗証番号)入りの設定ファイルを作成（ランダムPINが発行されます）
npm run setup

# 3. サーバー起動
npm start
```

起動すると、スマホで開くべきURLが表示されます:

```
  スマホのブラウザで以下を開いてください（同じ Wi-Fi 内）:
    → http://192.168.1.23:8765
```

スマホのブラウザでそのURLを開き、表示されたPINを入力すればログイン完了です。
（ホーム画面に追加すればアプリのように使えます）

---

## 設定 `config.json`

`npm run setup` で自動生成されます。必要に応じて編集してください。

| 項目 | 説明 | 既定値 |
|------|------|--------|
| `port` | サーバーのポート番号 | `8765` |
| `host` | 待ち受けアドレス（`0.0.0.0`でLAN公開） | `0.0.0.0` |
| `pin` | スマホで入力する暗証番号 | ランダム4桁 |
| `allowedActions` | 許可する電源操作 | 全部 |
| `confirmDangerousActions` | 危険な操作(再起動/シャットダウン等)に確認ダイアログを出す | `true` |
| `tunnel.enabled` | 外出先アクセス(Cloudflare Tunnel)を有効化 | `false` |
| `tunnel.token` | 固定URL用の名前付きトンネルのトークン（空ならお試しURL） | `""` |
| `tunnel.hostname` | 名前付きトンネルのホスト名（表示用） | `""` |
| `camera.enabled` | カメラ機能の有効/無効 | `true` |
| `camera.device` | カメラデバイス名/番号（`auto`で自動） | `auto` |
| `camera.resolution` | 解像度 | `1280x720` |
| `camera.framerate` | フレームレート | `15` |

環境変数 `RYO_PORT` / `RYO_PIN` / `RYO_HOST` でも上書きできます。

### カメラデバイスの指定

`camera.device` は OS によって指定方法が異なります。`npm run setup` を実行すると接続カメラの一覧ヒントが出ます。

- **Windows (dshow)**: デバイス名。例 `"Integrated Camera"`
- **macOS (avfoundation)**: 番号。例 `"0"`
- **Linux (v4l2)**: パス。例 `"/dev/video0"`

---

## 外出先から使う（Cloudflare Tunnel）📡

自宅のWi-Fiの外（モバイル回線など）からでもスマホのブラウザで操作できます。
**ポート開放やルーター設定は不要**で、Cloudflareが自動でHTTPS化してくれます。

### 設定を有効化して起動するだけ（cloudflared は自動でダウンロードされます）

`config.json` の `tunnel.enabled` を `true` にして `npm start` するだけ。

```jsonc
"tunnel": { "enabled": true, "provider": "cloudflare", "token": "", "hostname": "" }
```

**`cloudflared` が入っていなくても大丈夫です。** 初回起動時に、お使いのOS/CPUに合った
公式バイナリを自動でダウンロードして `bin/` に設置します（手動インストール不要）。

```
  cloudflared が見つからないので自動でダウンロードします…
  [install] 完了: .../ryo/bin/cloudflared
```

> 先に入れておきたい場合は `npm run install-tunnel` でダウンロードだけ実行できます。
> `brew install cloudflared` や `winget install --id Cloudflare.cloudflared` など、
> 自分で入れた `cloudflared`（PATH上）があればそちらが優先して使われます。

起動時に、外出先からアクセスできる公開URLが表示されます:

```
  🌍 外出先からアクセスできる公開URL（モバイル回線でもOK）:
    → https://random-words-1234.trycloudflare.com
```

このURLをスマホのブラウザで開けば、外出先からでもPINログインして操作できます。

### お試しURL vs 固定URL

- **お試し（token空）**: 起動のたびに `xxx.trycloudflare.com` の**ランダムURLが変わります**。まず試すならこれでOK。
- **固定URL（token設定）**: 自分のドメインで**URLを固定**したい場合。[Cloudflare Zero Trust](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) でトンネルを作成し、発行された **トンネルトークン** を `tunnel.token` に、公開ホスト名を `tunnel.hostname` に設定します。スマホにブックマークして常用するならこちらが便利です。

> ⚠️ **外出先アクセスを有効にすると、URLを知っていれば誰でもログイン画面に到達できます。**
> PINは必ず **6桁以上（できれば英数の長いパスワード）** にしてください。連続失敗すると自動でロックされます。

---

## 対応している電源操作

| 操作 | Windows | macOS | Linux(systemd) |
|------|---------|-------|----------------|
| スリープ | ✅ | ✅ | ✅ |
| 画面ロック | ✅ | ✅ | ✅ |
| ログオフ | ✅ | ✅ | ✅ |
| 再起動 | ✅ | ✅ | ✅ |
| シャットダウン | ✅ | ✅ | ✅ |

> Linux は `systemctl` / `loginctl`（systemd）前提です。環境によっては sudo 設定や
> コマンドの調整が必要な場合があります。macOS のシャットダウン等は初回に権限確認が出ることがあります。

---

## セキュリティについて ⚠️

このツールはPCの電源操作という強い権限を扱います。次の点に注意してください。

- **PINは必ず変更する**（`config.json` はコミットされません＝`.gitignore`済み）。
  特に外出先アクセス（トンネル）を使う場合は **6桁以上／長いパスワード** にしてください。
- **総当たり対策**: PINを連続で間違えると待ち時間が延び、しきい値を超えると一定時間ロックされます。
- **外出先アクセスは Cloudflare Tunnel 経由を推奨**。Cloudflareが自動でHTTPS化するので通信は暗号化されます。
  ルーターのポート開放でLANを直接公開するのは避けてください（平文HTTP＋ポート開放は危険）。
- さらに強固にしたい場合は、Cloudflare Zero Trust の Access ポリシー（メール認証など）を
  トンネルの手前に重ねると、ログイン画面に到達する前段でアクセスを制限できます。
- サーバーを再起動するとトークンは無効化され、スマホで再ログインが必要になります。

---

## 仕組み（概要）

- `src/server.js` — Node標準 `http` のみで動くサーバー本体（依存パッケージなし）
- `src/power.js` — OSごとの電源操作コマンド
- `src/camera.js` — `ffmpeg` でWebカメラをMJPEG化し、複数端末へ同時配信
- `src/auth.js` — PIN認証とHMAC署名トークン
- `public/` — スマホ向けWeb UI（PWA風、ホーム画面追加対応）

---

## トラブルシューティング

- **外出先アクセス(URL)がうまくいかない**: まず `npm run doctor` を実行してください。
  設定・cloudflaredの有無・Cloudflareへの到達性などを自動チェックし、直すべき点を教えてくれます。
- **スマホから開けない**: PCのファイアウォールで対象ポート(既定8765)を許可してください。PCとスマホが同じWi-Fiか確認。
- **カメラ映像が出ない**: PCに `ffmpeg` が入っているか、`config.json` の `camera.device` が正しいか確認（`npm run setup` で一覧確認）。
- **Linuxで電源操作が効かない**: `systemctl`/`loginctl` が使えるか、権限（polkit/sudo）を確認してください。

## ライセンス

MIT
