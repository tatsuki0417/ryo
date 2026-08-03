import type { InputEvent, Microgame, MicrogameApi, SwipeDir } from "../engine/types";
import { PALETTE, centerText, pick } from "../engine/util";

const DIR_LABEL: Record<SwipeDir, string> = {
  up: "うえ",
  down: "した",
  left: "ひだり",
  right: "みぎ",
};
const ANGLE: Record<SwipeDir, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

// 瞬発: 表示された矢印の方向へスワイプ！
export class SwipeArrow implements Microgame {
  command = "スワイプ！";
  readonly timeoutResult = "fail" as const;
  status: "playing" | "cleared" | "failed" = "playing";

  private api!: MicrogameApi;
  private dir: SwipeDir = "up";
  private flash = 0;

  init(api: MicrogameApi): void {
    this.api = api;
    this.dir = pick(["up", "down", "left", "right"] as const);
    this.command = DIR_LABEL[this.dir] + "へスワイプ！";
  }

  update(dt: number): void {
    if (this.flash > 0) this.flash -= dt;
  }

  onInput(e: InputEvent): void {
    if (this.status !== "playing" || e.type !== "swipe") return;
    if (e.dir === this.dir) {
      this.status = "cleared";
      this.api.sfx.tap();
    } else {
      this.status = "failed";
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { w, h } = this.api;
    ctx.fillStyle = "#182a3d";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ANGLE[this.dir]);
    // 大きな矢印
    ctx.fillStyle = PALETTE.accent2;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    const L = 70;
    ctx.beginPath();
    ctx.moveTo(-L, -22);
    ctx.lineTo(20, -22);
    ctx.lineTo(20, -48);
    ctx.lineTo(L + 20, 0);
    ctx.lineTo(20, 48);
    ctx.lineTo(20, 22);
    ctx.lineTo(-L, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    centerText(ctx, "ゆびでスワイプ", cx, cy + 140, "700 18px sans-serif", "rgba(255,255,255,0.7)");
  }
}
