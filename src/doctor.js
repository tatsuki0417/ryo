#!/usr/bin/env node
// 外出先アクセス(Cloudflare Tunnel)が動かないときの自己診断ツール。
// `npm run doctor` で実行し、どこで詰まっているかを切り分ける。
import { createServer } from "node:http";
import { loadConfig } from "./config.js";
import { resolveCloudflared } from "./install-cloudflared.js";
import { execFile } from "node:child_process";

const ok = (m) => console.log(`  ✅ ${m}`);
const ng = (m) => console.log(`  ❌ ${m}`);
const info = (m) => console.log(`  ・ ${m}`);
const hr = () => console.log("─".repeat(50));

console.log("\n🩺 ryo remote 自己診断\n");
hr();

const problems = [];

// 1. Node バージョン
const major = Number(process.versions.node.split(".")[0]);
if (major >= 18) ok(`Node.js ${process.versions.node}`);
else {
  ng(`Node.js ${process.versions.node}（18以上が必要）`);
  problems.push("Node.js を 18 以上に更新してください");
}

// 2. 設定
const cfg = loadConfig();
console.log("");
info(`ポート: ${cfg.port}`);
info(`カメラ: ${cfg.camera?.enabled ? "有効" : "無効"}`);
if (cfg._usingExample) {
  ng("config.json がありません（config.example.json を使用中）");
  problems.push("`npm run setup` で config.json を作成してください");
} else {
  ok("config.json を読み込みました");
}

// トンネル有効かどうか（外出先アクセスの前提）
if (!cfg.tunnel?.enabled) {
  ng("外出先アクセス(tunnel.enabled)が false です");
  problems.push('config.json の "tunnel": { "enabled": true } にしてください');
} else {
  ok("外出先アクセス(tunnel.enabled)が true です");
}

// PIN 長（公開時の安全性）
if (cfg.tunnel?.enabled && String(cfg.pin).length < 6) {
  ng(`PIN が短い（${String(cfg.pin).length}桁）。公開するなら6桁以上推奨`);
  problems.push("PIN を6桁以上（できれば長いパスワード）に変更してください");
}

hr();

// 3. cloudflared の有無
const bin = resolveCloudflared();
if (bin) ok(`cloudflared 利用可能: ${bin}`);
else {
  ng("cloudflared が見つかりません");
  problems.push("`npm run install-tunnel` で自動ダウンロードできます");
}

// 4. cloudflared が使う接続先(api.trycloudflare.com)に到達できるか
console.log("");
info("Cloudflare への接続を確認中…");
const netOK = await checkReach("https://api.trycloudflare.com");
if (netOK) {
  ok("api.trycloudflare.com に到達できました（トンネル発行の前提OK）");
} else {
  ng("api.trycloudflare.com に到達できません");
  problems.push(
    "ネットワーク(会社/学校/一部ルーターやVPN)が cloudflared の通信をブロックしている可能性。\n" +
      "     別のネットワーク(スマホのテザリング等)で試すか、ファイアウォール設定を確認してください"
  );
}

// 5. ローカルサーバーが起動中か
console.log("");
const serverUp = await checkLocalServer(cfg.port);
if (serverUp) ok(`ローカルサーバー(:${cfg.port})は起動中です`);
else info(`ローカルサーバー(:${cfg.port})は今は起動していません（診断中は未起動でもOK）`);

hr();

// まとめ
console.log("");
if (problems.length === 0) {
  console.log("🎉 問題は見つかりませんでした。`npm start` で表示される");
  console.log("   https://xxxx.trycloudflare.com をスマホのブラウザで開いてください。");
  console.log("   URL表示直後は接続確立まで10〜20秒かかることがあります。");
} else {
  console.log("🔧 直すべき点:");
  problems.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
}
console.log("");

// ---------- ヘルパ ----------
function checkReach(url) {
  return new Promise((resolve) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    // サーバーが 4xx を返しても「到達はできている」とみなす
    fetch(url, { signal: ctrl.signal })
      .then(() => resolve(true))
      .catch(() => resolve(false))
      .finally(() => clearTimeout(t));
  });
}

function checkLocalServer(port) {
  return new Promise((resolve) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    fetch(`http://localhost:${port}/`, { signal: ctrl.signal })
      .then(() => resolve(true))
      .catch(() => resolve(false))
      .finally(() => clearTimeout(t));
  });
}
