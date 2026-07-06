#!/usr/bin/env node
// cloudflared(Cloudflare Tunnel のクライアント) を公式リリースから自動ダウンロードして
// プロジェクト内の bin/ に設置する。手動インストール不要にするための仕組み。
import { existsSync, mkdirSync, chmodSync, createWriteStream, rmSync } from "node:fs";
import { execFile, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BIN_DIR = join(ROOT, "bin");

const BASE = "https://github.com/cloudflare/cloudflared/releases/latest/download";

/** OS/CPU から、ダウンロードすべきファイル名と保存先を決める。 */
function target() {
  const os = process.platform;
  const arch = process.arch;
  const archMap = { x64: "amd64", arm64: "arm64", ia32: "386", arm: "arm" };
  const a = archMap[arch] || "amd64";

  if (os === "win32") {
    return {
      os,
      asset: `cloudflared-windows-${a === "386" ? "386" : "amd64"}.exe`,
      isTgz: false,
      binName: "cloudflared.exe",
    };
  }
  if (os === "darwin") {
    // macOS は .tgz 配布（arm64/amd64）
    return {
      os,
      asset: `cloudflared-darwin-${a === "arm64" ? "arm64" : "amd64"}.tgz`,
      isTgz: true,
      binName: "cloudflared",
    };
  }
  // linux は直接バイナリ
  return { os, asset: `cloudflared-linux-${a}`, isTgz: false, binName: "cloudflared" };
}

/** local bin に置かれる想定のパス。 */
export function localBinPath() {
  const { binName } = target();
  return join(BIN_DIR, binName);
}

/**
 * 使える cloudflared のコマンドを返す。
 * 優先: プロジェクト内 bin/ → 見つからなければ PATH 上の "cloudflared"。
 * どちらも無ければ null。
 */
export function resolveCloudflared() {
  const local = localBinPath();
  if (existsSync(local)) return local;
  try {
    execFileSync("cloudflared", ["--version"], { stdio: "ignore" });
    return "cloudflared";
  } catch {
    return null;
  }
}

/** cloudflared をダウンロードして bin/ に設置する。既にあればスキップ。 */
export async function installCloudflared({ force = false } = {}) {
  const existing = resolveCloudflared();
  if (existing && !force) {
    return { path: existing, alreadyAvailable: true };
  }

  const { os, asset, isTgz, binName } = target();
  const url = `${BASE}/${asset}`;
  mkdirSync(BIN_DIR, { recursive: true });
  const finalPath = join(BIN_DIR, binName);

  console.log(`[install] cloudflared をダウンロードします…`);
  console.log(`[install]   ${url}`);

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) {
    throw new Error(`ダウンロードに失敗しました (HTTP ${res.status})`);
  }

  if (isTgz) {
    // macOS: 一旦 .tgz を保存して展開
    const tgzPath = join(BIN_DIR, asset);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tgzPath));
    await extractTgz(tgzPath, BIN_DIR);
    rmSync(tgzPath, { force: true });
  } else {
    await pipeline(Readable.fromWeb(res.body), createWriteStream(finalPath));
  }

  if (os !== "win32") {
    chmodSync(finalPath, 0o755); // 実行権限を付与
  }

  console.log(`[install] 完了: ${finalPath}`);
  return { path: finalPath, alreadyAvailable: false };
}

function extractTgz(tgzPath, destDir) {
  return new Promise((resolve, reject) => {
    // macOS/Linux には tar が標準搭載
    execFile("tar", ["-xzf", tgzPath, "-C", destDir], (err) =>
      err ? reject(new Error(`展開に失敗しました: ${err.message}`)) : resolve()
    );
  });
}

// 直接 `node src/install-cloudflared.js` で実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const r = await installCloudflared({ force: process.argv.includes("--force") });
    if (r.alreadyAvailable) {
      console.log(`cloudflared は既に利用可能です: ${r.path}`);
    }
    // バージョン表示で動作確認
    execFile(r.path, ["--version"], (err, stdout) => {
      if (!err && stdout) console.log(stdout.trim());
    });
  } catch (err) {
    console.error("[install] エラー:", err.message);
    console.error(
      "手動インストールも可能です → https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    );
    process.exit(1);
  }
}
