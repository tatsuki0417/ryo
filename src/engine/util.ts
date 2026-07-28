import { LOGICAL_H, LOGICAL_W } from "./types";

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function rand(): number {
  return Math.random();
}

export function range(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number): number {
  return Math.floor(range(min, max + 1));
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Fisher–Yates シャッフル（新しい配列を返す） */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
  cssW: number;
  cssH: number;
}

/** CSS表示サイズから論理座標へのレターボックス変換を計算 */
export function computeViewport(cssW: number, cssH: number): Viewport {
  const scale = Math.min(cssW / LOGICAL_W, cssH / LOGICAL_H);
  const offsetX = (cssW - LOGICAL_W * scale) / 2;
  const offsetY = (cssH - LOGICAL_H * scale) / 2;
  return { scale, offsetX, offsetY, cssW, cssH };
}

/** CSSピクセル座標 → 論理座標 */
export function toLogical(vp: Viewport, cssX: number, cssY: number): { x: number; y: number } {
  return {
    x: (cssX - vp.offsetX) / vp.scale,
    y: (cssY - vp.offsetY) / vp.scale,
  };
}

/** 角丸矩形パス */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** 中央寄せテキスト描画のヘルパ */
export function centerText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  stroke?: { color: string; width: number }
): void {
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (stroke) {
    ctx.lineWidth = stroke.width;
    ctx.strokeStyle = stroke.color;
    ctx.lineJoin = "round";
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export const PALETTE = {
  bg: "#1b1030",
  bg2: "#2a1750",
  accent: "#e94078",
  accent2: "#ffd63d",
  good: "#39d98a",
  bad: "#ff5757",
  white: "#ffffff",
  ink: "#1b1030",
};

export { LOGICAL_W, LOGICAL_H };
