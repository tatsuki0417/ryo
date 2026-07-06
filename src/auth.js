import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// サーバー起動ごとにランダムな署名鍵を生成する。
// 再起動するとトークンは無効になり、スマホで再ログインが必要になる。
const SECRET = randomBytes(32);
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30日

/**
 * PIN と一致すればトークンを発行する。署名付きなのでサーバー側に
 * セッションを保存しなくても検証できる（ステートレス）。
 */
export function issueToken() {
  const expires = Date.now() + TOKEN_TTL_MS;
  const payload = String(expires);
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(payload))) return false;
  const expires = Number(payload);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  return true;
}

/** PIN 同士をタイミング攻撃に強い方法で比較する。 */
export function checkPin(input, expected) {
  return safeEqual(String(input ?? ""), String(expected ?? ""));
}

function sign(payload) {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

function safeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * ログインの総当たり対策。
 * インターネット公開（トンネル利用）時に、PINへの総当たりを防ぐ。
 * - 失敗が続くほど待ち時間を指数的に伸ばす
 * - しきい値を超えたら一定時間ロック（429を返す）
 * トンネル越しでは全リクエストが同じ経路IPになりがちなのでグローバルに管理する。
 */
export class LoginGuard {
  constructor({ maxFails = 5, lockMs = 5 * 60 * 1000 } = {}) {
    this.maxFails = maxFails;
    this.lockMs = lockMs;
    this.fails = 0;
    this.lockedUntil = 0;
  }

  /** 現在ロック中か。残り秒数(>0)、または 0 を返す。 */
  lockedSeconds() {
    const remain = this.lockedUntil - Date.now();
    return remain > 0 ? Math.ceil(remain / 1000) : 0;
  }

  /** 失敗時に呼ぶ。返り値は次に入れるべき遅延(ms)。 */
  recordFail() {
    this.fails += 1;
    if (this.fails >= this.maxFails) {
      this.lockedUntil = Date.now() + this.lockMs;
    }
    // 300ms, 600ms, 1200ms ... 最大5秒
    return Math.min(300 * 2 ** (this.fails - 1), 5000);
  }

  /** 成功時に呼ぶ。カウンタをリセット。 */
  recordSuccess() {
    this.fails = 0;
    this.lockedUntil = 0;
  }
}

/**
 * リクエストからトークンを取り出す。
 * ヘッダ（Authorization: Bearer xxx）と、クエリ（?token=xxx）の両対応。
 * <img src> の MJPEG ストリームはヘッダを付けられないのでクエリも許可する。
 */
export function extractToken(req, url) {
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  if (url && url.searchParams.has("token")) return url.searchParams.get("token");
  return null;
}
