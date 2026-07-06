import { spawn } from "node:child_process";

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

    console.log("[tunnel] cloudflared を起動します…");
    try {
      this.proc = spawn("cloudflared", args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      this._fail(err);
      return;
    }

    const scan = (buf) => {
      const text = buf.toString();
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
        console.error(`[tunnel] cloudflared が終了しました (code ${code})`);
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
