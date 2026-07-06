import { spawn, execFile } from "node:child_process";
import { platform } from "node:os";

const BOUNDARY = "ryoframe";

/**
 * ffmpeg を使って Web カメラの映像を MJPEG 化し、複数のスマホ／ブラウザへ
 * 同時配信するストリーマー。
 *
 * - ffmpeg プロセスは「最初の視聴者が来たら起動」「全員切断したら停止」する遅延起動方式。
 * - stdout に流れる連結 JPEG を SOI(0xFFD8)/EOI(0xFFD9) で1フレームずつ切り出し、
 *   最新フレームを保持しつつ全クライアントへ配信する。
 */
export class CameraStreamer {
  constructor(cameraConfig) {
    this.config = cameraConfig;
    this.proc = null;
    this.clients = new Set(); // 配信中の res 一覧
    this.latestFrame = null;
    this.buffer = Buffer.alloc(0);
    this.lastError = null;
    this.stopTimer = null;
  }

  get boundary() {
    return BOUNDARY;
  }

  buildFfmpegArgs() {
    const os = platform();
    const { device, resolution, framerate } = this.config;
    const size = resolution || "1280x720";
    const fps = String(framerate || 15);

    const common = [
      "-f", "image2pipe",
      "-c:v", "mjpeg",
      "-q:v", "5",
      "-",
    ];

    if (os === "darwin") {
      const dev = device && device !== "auto" ? device : "0";
      return ["-f", "avfoundation", "-framerate", fps, "-video_size", size, "-i", dev, ...common];
    }
    if (os === "win32") {
      // Windows(dshow) はデバイス名が必須。config.device に正確な名前を設定する。
      const dev = device && device !== "auto" ? device : "Integrated Camera";
      return ["-f", "dshow", "-framerate", fps, "-video_size", size, "-i", `video=${dev}`, ...common];
    }
    // linux (v4l2)
    const dev = device && device !== "auto" ? device : "/dev/video0";
    return ["-f", "v4l2", "-framerate", fps, "-video_size", size, "-i", dev, ...common];
  }

  start() {
    if (this.proc) return;
    const args = this.buildFfmpegArgs();
    console.log("[camera] ffmpeg 起動:", "ffmpeg", args.join(" "));
    this.lastError = null;

    try {
      this.proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      this.lastError = `ffmpeg を起動できませんでした: ${err.message}`;
      console.error("[camera]", this.lastError);
      return;
    }

    this.proc.stdout.on("data", (chunk) => this._onData(chunk));

    let stderrTail = "";
    this.proc.stderr.on("data", (d) => {
      stderrTail = (stderrTail + d.toString()).slice(-800);
    });

    this.proc.on("error", (err) => {
      this.lastError =
        err.code === "ENOENT"
          ? "ffmpeg が見つかりません。PC に ffmpeg をインストールしてください。"
          : `ffmpeg エラー: ${err.message}`;
      console.error("[camera]", this.lastError);
      this._cleanup();
    });

    this.proc.on("close", (code) => {
      if (code && code !== 0 && !this.lastError) {
        this.lastError = `ffmpeg が終了しました(code ${code})。カメラ設定を確認してください。\n${stderrTail}`;
        console.error("[camera]", this.lastError);
      }
      this._cleanup();
    });
  }

  _onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    // バッファ内から完結した JPEG フレームを取り出す
    while (true) {
      const start = this.buffer.indexOf(Buffer.from([0xff, 0xd8]));
      if (start === -1) break;
      const end = this.buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
      if (end === -1) {
        // まだフレーム末尾が来ていない。先頭のゴミは捨てる。
        if (start > 0) this.buffer = this.buffer.subarray(start);
        break;
      }
      const frame = this.buffer.subarray(start, end + 2);
      this.buffer = this.buffer.subarray(end + 2);
      this.latestFrame = frame;
      this._broadcast(frame);
    }
    // バッファが肥大化しないよう保険
    if (this.buffer.length > 5_000_000) this.buffer = Buffer.alloc(0);
  }

  _broadcast(frame) {
    const header = Buffer.from(
      `--${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`
    );
    for (const res of this.clients) {
      try {
        res.write(header);
        res.write(frame);
        res.write(Buffer.from("\r\n"));
      } catch {
        this.clients.delete(res);
      }
    }
  }

  /** MJPEG ストリームを res に接続する。 */
  addClient(res) {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    res.writeHead(200, {
      "Content-Type": `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Connection: "close",
    });
    this.clients.add(res);
    this.start();
    if (this.latestFrame) this._broadcast(this.latestFrame);

    const remove = () => {
      this.clients.delete(res);
      this._maybeStop();
    };
    res.on("close", remove);
    res.on("error", remove);
  }

  /** 最新の1フレーム(JPEG)を返す。無ければ ffmpeg を起動して少し待つ。 */
  async getSnapshot() {
    if (this.latestFrame) return this.latestFrame;
    this.start();
    // 最初のフレームを最大3秒待つ
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      if (this.latestFrame) return this.latestFrame;
      if (this.lastError) throw new Error(this.lastError);
      await new Promise((r) => setTimeout(r, 100));
    }
    this._maybeStop();
    throw new Error(this.lastError || "カメラのフレームを取得できませんでした");
  }

  _maybeStop() {
    if (this.clients.size > 0) return;
    // すぐ止めず、少し待ってから停止（再接続に備える）
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = setTimeout(() => {
      if (this.clients.size === 0) this.stop();
    }, 5000);
  }

  stop() {
    if (this.proc) {
      console.log("[camera] ffmpeg 停止");
      try {
        this.proc.kill("SIGKILL");
      } catch {
        /* noop */
      }
    }
    this._cleanup();
  }

  _cleanup() {
    this.proc = null;
    this.buffer = Buffer.alloc(0);
    // latestFrame は残しておく（スナップショットのフォールバック用途）
  }
}

/**
 * 接続されているカメラデバイス一覧を ffmpeg 経由で取得する（セットアップ補助用）。
 */
export function listCameras() {
  return new Promise((resolve) => {
    const os = platform();
    let args;
    if (os === "darwin") args = ["-f", "avfoundation", "-list_devices", "true", "-i", ""];
    else if (os === "win32") args = ["-f", "dshow", "-list_devices", "true", "-i", "dummy"];
    else args = null; // linux は /dev/video* を見るのが確実

    if (!args) {
      resolve({ os, raw: "Linux では ls /dev/video* でデバイスを確認してください" });
      return;
    }
    execFile("ffmpeg", args, (err, _stdout, stderr) => {
      // ffmpeg はデバイス一覧を stderr に出す
      resolve({ os, raw: stderr || String(err || "") });
    });
  });
}
