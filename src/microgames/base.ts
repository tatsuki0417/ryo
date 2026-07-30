import type { GameStatus, InputEvent, Microgame, MicrogameApi } from "../engine/types";
import { PALETTE, centerText } from "../engine/util";

// ミニゲームの共通ベース。定型処理（状態管理・背景塗り・成否確定）をまとめ、
// 各ゲームは必要なメソッドだけ実装すればよい。
export abstract class BaseGame implements Microgame {
  command = "";
  timeoutResult: "clear" | "fail" = "fail";
  status: GameStatus = "playing";
  protected api!: MicrogameApi;

  init(api: MicrogameApi): void {
    this.api = api;
    this.setup();
  }

  /** 初期化（api は this.api で参照可能） */
  protected abstract setup(): void;

  update(_dt: number): void {}
  render(_ctx: CanvasRenderingContext2D): void {}
  onInput(_e: InputEvent): void {}

  protected clear(): void {
    if (this.status === "playing") {
      this.status = "cleared";
      this.api.sfx.tap();
    }
  }
  protected fail(): void {
    if (this.status === "playing") this.status = "failed";
  }

  protected fillBg(ctx: CanvasRenderingContext2D, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.api.w, this.api.h);
  }

  /** 画面上部の小さな補助テキスト */
  protected hint(ctx: CanvasRenderingContext2D, text: string): void {
    centerText(ctx, text, this.api.w / 2, 96, "700 17px sans-serif", "rgba(255,255,255,0.75)");
  }
}

export function isTapOn(e: InputEvent, x: number, y: number, r: number): boolean {
  return e.type === "tap" && Math.hypot(e.x - x, e.y - y) <= r;
}

/** ぷにっとした丸ボタン/玉の描画 */
export function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke = "rgba(0,0,0,0.25)",
  strokeW = 4
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (strokeW > 0) {
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/** かわいいキャラ（丸い体＋目＋ほっぺ＋口）。プレイヤーやマスコットに使う。 */
export function drawBuddy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  opts: { happy?: boolean; look?: number } = {}
): void {
  const look = opts.look ?? 0; // -1..1 目線の左右
  ctx.save();
  ctx.translate(x, y);
  // 体
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.stroke();
  // ほっぺ
  ctx.fillStyle = "rgba(255,120,150,0.5)";
  ctx.beginPath();
  ctx.arc(-r * 0.45, r * 0.2, r * 0.16, 0, Math.PI * 2);
  ctx.arc(r * 0.45, r * 0.2, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  // 目
  const ex = r * 0.34;
  const ey = -r * 0.12;
  for (const sx of [-1, 1]) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(sx * ex, ey, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b1030";
    ctx.beginPath();
    ctx.arc(sx * ex + look * r * 0.08, ey, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // 口
  ctx.strokeStyle = "#1b1030";
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath();
  if (opts.happy === false) {
    ctx.arc(0, r * 0.5, r * 0.24, Math.PI, Math.PI * 2);
  } else {
    ctx.arc(0, r * 0.28, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  ctx.stroke();
  ctx.restore();
}

export { PALETTE };
