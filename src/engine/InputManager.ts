import type { InputEvent, SwipeDir } from "./types";
import { computeViewport, toLogical, type Viewport } from "./util";

const SWIPE_THRESHOLD = 24; // CSSpx。これ以上動いたらスワイプ
const TAP_MAX_MOVE = 16; // これ未満の移動はタップ扱い

type Listener = (e: InputEvent) => void;

/**
 * pointer(touch/mouse共通)からタップ/スワイプを検出して正規化し、リスナへ配る。
 * 座標はレターボックスを考慮して論理座標へ変換する。
 */
export class InputManager {
  private canvas: HTMLCanvasElement;
  private listener: Listener | null = null;
  private startX = 0;
  private startY = 0;
  private tracking = false;
  private vp: Viewport;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const rect = canvas.getBoundingClientRect();
    this.vp = computeViewport(rect.width, rect.height);
    canvas.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onCancel);
  }

  setViewport(vp: Viewport): void {
    this.vp = vp;
  }

  onEvent(fn: Listener | null): void {
    this.listener = fn;
  }

  private canvasPoint(e: PointerEvent): { cssX: number; cssY: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { cssX: e.clientX - rect.left, cssY: e.clientY - rect.top };
  }

  private onDown = (e: PointerEvent): void => {
    e.preventDefault();
    const { cssX, cssY } = this.canvasPoint(e);
    this.startX = cssX;
    this.startY = cssY;
    this.tracking = true;
  };

  private onUp = (e: PointerEvent): void => {
    if (!this.tracking) return;
    this.tracking = false;
    const { cssX, cssY } = this.canvasPoint(e);
    const dx = cssX - this.startX;
    const dy = cssY - this.startY;
    const dist = Math.hypot(dx, dy);
    const start = toLogical(this.vp, this.startX, this.startY);

    if (dist >= SWIPE_THRESHOLD) {
      let dir: SwipeDir;
      if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
      else dir = dy > 0 ? "down" : "up";
      this.emit({ type: "swipe", dir, x: start.x, y: start.y });
    } else if (dist <= TAP_MAX_MOVE) {
      const p = toLogical(this.vp, cssX, cssY);
      this.emit({ type: "tap", x: p.x, y: p.y });
    }
  };

  private onCancel = (): void => {
    this.tracking = false;
  };

  private emit(e: InputEvent): void {
    this.listener?.(e);
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onCancel);
  }
}
