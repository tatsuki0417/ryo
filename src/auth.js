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
