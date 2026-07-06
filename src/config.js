import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const DEFAULTS = {
  port: 8765,
  host: "0.0.0.0",
  pin: "1234",
  allowedActions: ["sleep", "shutdown", "restart", "lock", "logoff"],
  confirmDangerousActions: true,
  camera: {
    enabled: true,
    device: "auto",
    resolution: "1280x720",
    framerate: 15,
  },
};

/**
 * config.json を読み込む。無ければ config.example.json を、
 * それも無ければ組み込みデフォルトを使う。
 * 環境変数（RYO_PORT / RYO_PIN など）があれば上書きする。
 */
export function loadConfig() {
  let cfg = { ...DEFAULTS };

  const configPath = join(ROOT, "config.json");
  const examplePath = join(ROOT, "config.example.json");
  const usePath = existsSync(configPath)
    ? configPath
    : existsSync(examplePath)
      ? examplePath
      : null;

  if (usePath) {
    try {
      const fileCfg = JSON.parse(readFileSync(usePath, "utf8"));
      cfg = deepMerge(cfg, fileCfg);
    } catch (err) {
      console.error(`[config] ${usePath} の読み込みに失敗しました:`, err.message);
    }
  }

  // 環境変数での上書き
  if (process.env.RYO_PORT) cfg.port = Number(process.env.RYO_PORT);
  if (process.env.RYO_PIN) cfg.pin = String(process.env.RYO_PIN);
  if (process.env.RYO_HOST) cfg.host = process.env.RYO_HOST;

  cfg._usingExample = usePath === examplePath;
  return cfg;
}

function deepMerge(base, override) {
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof base[k] === "object") {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
