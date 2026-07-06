#!/usr/bin/env node
// 対話なしで config.json を作る簡易セットアップ。
// ランダムな PIN を生成し、接続カメラ一覧のヒントを表示する。
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomInt } from "node:crypto";
import { listCameras } from "./camera.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const configPath = join(ROOT, "config.json");
const examplePath = join(ROOT, "config.example.json");

const base = JSON.parse(readFileSync(examplePath, "utf8"));

if (existsSync(configPath)) {
  console.log("config.json は既に存在します。上書きしません。");
  console.log(`編集する場合: ${configPath}`);
} else {
  const pin = String(randomInt(1000, 10000)); // 4桁
  base.pin = pin;
  writeFileSync(configPath, JSON.stringify(base, null, 2) + "\n");
  console.log("config.json を作成しました。");
  console.log(`  PIN: ${pin}   （スマホで最初に入力する暗証番号です）`);
  console.log(`  変更する場合は ${configPath} を編集してください。`);
}

console.log("\n接続カメラを確認します…\n");
const { os, raw } = await listCameras();
console.log(`[OS: ${os}]`);
console.log(raw.trim() || "(情報なし)");
console.log("\nカメラ名/番号を config.json の camera.device に設定できます（既定は auto）。");
