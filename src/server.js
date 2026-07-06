#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";
import { networkInterfaces } from "node:os";

import { loadConfig } from "./config.js";
import { issueToken, verifyToken, checkPin, extractToken } from "./auth.js";
import { availableActions, runAction, getCurrentOS, ACTION_LABELS } from "./power.js";
import { CameraStreamer } from "./camera.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

const config = loadConfig();
const camera = config.camera?.enabled ? new CameraStreamer(config.camera) : null;

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
  const body = await readBody(req);
  if (!checkPin(body.pin, config.pin)) {
    await sleep(500); // 総当たり対策に軽い遅延
    return sendJson(res, 401, { ok: false, message: "PIN が違います" });
  }
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
});

process.on("SIGINT", () => {
  console.log("\n終了します…");
  camera?.stop();
  process.exit(0);
});
