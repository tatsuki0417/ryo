import { spawn } from "node:child_process";
import { resolveCloudflared } from "./install-cloudflared.js";

/**
 * Cloudflare Tunnel(cloudflared) を起動して、外出先からアクセスできる
 * 公開HTTPS URLを用意する。ポート開放不要・自動でTLS化される。
 *
 * 2モード:
 *  - クイックトンネル: token 未設定時。https://xxxx.trycloudflare.com が毎回発行される（お試し向け）。
 *  - 名前付きトンネル: token 設定時。Cloudflareダッシュボードで固定ホスト名に紐付けたトンネルを起動（URLが固定）。
 */
export class CloudflareTunnel {
  constructor({ port, token = "", hostname = "" }) {
    this.port = port;
    this.token = token;
    this.hostname = hostname;
    this.proc = null;
    this.publicUrl = null;
    this.onUrl = null;
  }

  start() {
    const args = this.token
      ? ["tunnel", "--no-autoupdate", "run", "--token", this.token]
      : ["tunnel", "--no-autoupdate", "--url", `http://localhost:${this.port}`];

    const bin = resolveCloudflared() || "cloudflared";
    console.log("[tunnel] cloudflared を起動します…");
    try {
      this.proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      this._fail(err);
      return;
    }

    let logTail = "";
    const scan = (buf) => {
      const text = buf.toString();
      logTail = (logTail + text).slice(-2000); // 失敗時の原因表示用に末尾を保持
      // クイックトンネルのURLを拾う
      const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (m && !this.publicUrl) {
        this.publicUrl = m[0];
        this._announce();
      }
    };
    this.proc.stdout.on("data", scan);
    this.proc.stderr.on("data", scan);

    this.proc.on("error", (err) => this._fail(err));
    this.proc.on("close", (code) => {
      // 起動そのものに失敗した場合(_fail)は既に案内済みなので二重表示しない
      if (!this.failed && !this.stopping && code && code !== 0) {
        console.error(`[tunnel] cloudflared が異常終了しました (code ${code})`);
        // cloudflared 自身のエラー行を見せると原因が分かりやすい
        const errLines = logTail
          .split("\n")
          .filter((l) => /ERR|error|failed|unable|refused/i.test(l))
          .slice(-4);
        if (errLines.length) {
          console.error("[tunnel] cloudflared のエラー:");
          for (const l of errLines) console.error("   " + l.trim());
        }
        console.error(
          "[tunnel] ネット接続やファイアウォールを確認し、再度 `npm start` してください。"
        );
      }
      this.proc = null;
    });

    // 名前付きトンネルはURLがログに出ないので、設定済みホスト名を表示
    if (this.token && this.hostname) {
      this.publicUrl = this.hostname.startsWith("http")
        ? this.hostname
        : `https://${this.hostname}`;
      setTimeout(() => this._announce(), 1500);
    }
  }

  _announce() {
    if (this.onUrl) this.onUrl(this.publicUrl);
    this._selfCheck();
  }

  /**
   * 発行された公開URLへ実際にアクセスして、外から到達できるか自動確認する。
   * edge への登録に時間がかかるため数回リトライする。
   * - 成功: トンネルは機能している（開けないならスマホ側ネットワークの問題）
   * - 失敗: トンネル/接続側の問題（もう少し待つ or 再起動が必要）
   */
  async _selfCheck() {
    if (this._checked) return;
    this._checked = true;
    const url = this.publicUrl;
    for (let i = 0; i < 8 && !this.stopping; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      try {
        const res = await fetch(url + "/", { redirect: "manual" });
        // 200(ログイン画面) や 401 等が返れば「到達できている」
        if (res.status >= 200 && res.status < 500) {
          console.log("  ✅ 公開URLへの接続確認OK。上のURLをスマホのブラウザで開けます。");
          console.log("     （開けない場合はスマホ側のWi-Fi/回線が原因。モバイル回線で試してください）");
          console.log("");
          return;
        }
      } catch {
        /* まだ繋がらない。リトライ */
      }
    }
    if (!this.stopping) {
      console.log("  ⚠️  公開URLへまだ接続できません。20〜30秒待ってスマホで再読み込みするか、");
      console.log("     一度 Ctrl+C で止めて `npm start` し直してください。");
      console.log("");
    }
  }

  _fail(err) {
    this.failed = true;
    if (err && err.code === "ENOENT") {
      console.error(
        "[tunnel] cloudflared が見つかりません。外出先アクセスには cloudflared のインストールが必要です。\n" +
          "         → https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
      );
    } else {
      console.error("[tunnel] 起動に失敗しました:", err?.message || err);
    }
    this.proc = null;
  }

  stop() {
    this.stopping = true;
    if (this.proc) {
      try {
        this.proc.kill("SIGINT");
      } catch {
        /* noop */
      }
      this.proc = null;
    }
  }
}
