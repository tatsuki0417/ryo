#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";
import { networkInterfaces } from "node:os";

import { loadConfig } from "./config.js";
import { issueToken, verifyToken, checkPin, extractToken, LoginGuard } from "./auth.js";
import { availableActions, runAction, getCurrentOS } from "./power.js";
import { CameraStreamer } from "./camera.js";
import { CloudflareTunnel } from "./tunnel.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

const config = loadConfig();
const camera = config.camera?.enabled ? new CameraStreamer(config.camera) : null;
const loginGuard = new LoginGuard();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    // --- API ルート ---
    if (path === "/api/login" && req.method === "POST") return handleLogin(req, res);
    if (path === "/api/config" && req.method === "GET") return handleConfig(req, res, url);
    if (path === "/api/action" && req.method === "POST") return handleAction(req, res, url);
    if (path === "/api/camera/stream" && req.method === "GET") return handleStream(req, res, url);
    if (path === "/api/camera/snapshot" && req.method === "GET") return handleSnapshot(req, res, url);

    // --- 静的ファイル ---
    return serveStatic(req, res, path);
  } catch (err) {
    console.error("[server] 予期しないエラー:", err);
    sendJson(res, 500, { ok: false, message: "サーバーエラー" });
  }
});

// ---------- ハンドラ ----------

async function handleLogin(req, res) {
  const locked = loginGuard.lockedSeconds();
  if (locked > 0) {
    return sendJson(res, 429, {
      ok: false,
      message: `試行回数が多すぎます。${locked}秒後にもう一度お試しください`,
    });
  }
  const body = await readBody(req);
  if (!checkPin(body.pin, config.pin)) {
    const delay = loginGuard.recordFail();
    await sleep(delay); // 失敗が続くほど待ち時間を延ばす
    const nowLocked = loginGuard.lockedSeconds();
    return sendJson(res, nowLocked > 0 ? 429 : 401, {
      ok: false,
      message:
        nowLocked > 0
          ? `試行回数が多すぎます。${nowLocked}秒後にもう一度お試しください`
          : "PIN が違います",
    });
  }
  loginGuard.recordSuccess();
  return sendJson(res, 200, { ok: true, token: issueToken() });
}

function requireAuth(req, res, url) {
  const token = extractToken(req, url);
  if (!verifyToken(token)) {
    sendJson(res, 401, { ok: false, message: "認証が必要です" });
    return false;
  }
  return true;
}

function handleConfig(req, res, url) {
  if (!requireAuth(req, res, url)) return;
  sendJson(res, 200, {
    ok: true,
    os: getCurrentOS(),
    actions: availableActions(config.allowedActions),
    confirmDangerousActions: config.confirmDangerousActions,
    camera: {
      enabled: !!camera,
      streamPath: "/api/camera/stream",
      snapshotPath: "/api/camera/snapshot",
    },
  });
}

async function handleAction(req, res, url) {
  if (!requireAuth(req, res, url)) return;
  const body = await readBody(req);
  const action = body.action;
  if (!action) return sendJson(res, 400, { ok: false, message: "action が指定されていません" });

  const result = await runAction(action, config.allowedActions);
  sendJson(res, result.ok ? 200 : 400, result);
}

function handleStream(req, res, url) {
  if (!requireAuth(req, res, url)) return;
  if (!camera) return sendJson(res, 404, { ok: false, message: "カメラは無効です" });
  camera.addClient(res);
}

async function handleSnapshot(req, res, url) {
  if (!requireAuth(req, res, url)) return;
  if (!camera) return sendJson(res, 404, { ok: false, message: "カメラは無効です" });
  try {
    const frame = await camera.getSnapshot();
    res.writeHead(200, {
      "Content-Type": "image/jpeg",
      "Content-Length": frame.length,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
    res.end(frame);
  } catch (err) {
    sendJson(res, 500, { ok: false, message: err.message });
  }
}

async function serveStatic(req, res, path) {
  let rel = path === "/" ? "/index.html" : path;
  // パストラバーサル対策
  const safe = normalize(rel).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, 403, { ok: false, message: "アクセス拒否" });
  }
  try {
    const data = await readFile(filePath);
    const mime = MIME[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  } catch {
    sendJson(res, 404, { ok: false, message: "Not Found" });
  }
}

// ---------- ユーティリティ ----------

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 1e6) req.destroy(); // 過大なボディを拒否
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function localIPs() {
  const ips = [];
  for (const iface of Object.values(networkInterfaces())) {
    for (const net of iface || []) {
      if (net.family === "IPv4" && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

// ---------- 起動 ----------

server.listen(config.port, config.host, () => {
  const acts = availableActions(config.allowedActions)
    .map((a) => a.label)
    .join(" / ");
  console.log("");
  console.log("  ┌─────────────────────────────────────────────┐");
  console.log("  │   ryo-remote — スマホからPCを操作           │");
  console.log("  └─────────────────────────────────────────────┘");
  console.log("");
  console.log(`  OS         : ${getCurrentOS()}`);
  console.log(`  操作        : ${acts || "(なし)"}`);
  console.log(`  カメラ      : ${camera ? "有効" : "無効"}`);
  console.log(`  PIN        : ${config.pin}`);
  if (config._usingExample) {
    console.log("");
    console.log("  ⚠️  config.example.json を使用中です。");
    console.log("     `npm run setup` か、config.json を作って PIN を必ず変更してください。");
  }
  console.log("");
  console.log("  スマホのブラウザで以下を開いてください（同じ Wi-Fi 内）:");
  for (const ip of localIPs()) console.log(`    → http://${ip}:${config.port}`);
  console.log(`    (このPC: http://localhost:${config.port})`);
  console.log("");

  startTunnelIfEnabled();
});

let tunnel = null;
function startTunnelIfEnabled() {
  if (!config.tunnel?.enabled) return;

  // インターネット公開時は短いPINが危険なので警告する
  if (String(config.pin).length < 6) {
    console.log("  ⚠️  外出先アクセスを有効化していますが PIN が短いです。");
    console.log("     インターネット公開時は 6桁以上（できれば英数の長いパスワード）を推奨します。");
    console.log("");
  }

  tunnel = new CloudflareTunnel({
    port: config.port,
    token: config.tunnel.token,
    hostname: config.tunnel.hostname,
  });
  tunnel.onUrl = (url) => {
    console.log("  🌍 外出先からアクセスできる公開URL（モバイル回線でもOK）:");
    console.log(`    → ${url}`);
    console.log("     ※ このURLは他人に知られないよう注意。PINで保護されています。");
    console.log("");
  };
  tunnel.start();
}

process.on("SIGINT", () => {
  console.log("\n終了します…");
  camera?.stop();
  tunnel?.stop();
  process.exit(0);
});
