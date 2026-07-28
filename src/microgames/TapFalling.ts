import type { InputEvent, Microgame, MicrogameApi } from "../engine/types";
import { PALETTE, centerText } from "../engine/util";

// アクション: 落ちてくる的を、下に着く前にタップ！
export class TapFalling implements Microgame {
  readonly command = "タップ！";
  readonly timeoutResult = "fail" as const;
  status: "playing" | "cleared" | "failed" = "playing";

  private api!: MicrogameApi;
  private x = 0;
  private y = 0;
  private vy = 0;
  private r = 34;
  private wobble = 0;

  init(api: MicrogameApi): void {
    this.api = api;
    this.x = api.range(60, api.w - 60);
    this.y = -40;
    this.r = 34;
    // 制限時間内に画面下へ着くよう落下速度を決める（余裕を持って）
    const travel = api.h + 80;
    this.vy = (travel / (api.duration * 0.85)) * 1.0;
  }

  update(dt: number): void {
    if (this.status !== "playing") return;
    this.y += this.vy * dt;
    this.wobble += dt * 8;
    this.x += Math.sin(this.wobble) * 0.4;
    if (this.y - this.r > this.api.h) {
      this.status = "failed";
    }
  }

  onInput(e: InputEvent): void {
    if (this.status !== "playing" || e.type !== "tap") return;
    if (Math.hypot(e.x - this.x, e.y - this.y) <= this.r + 14) {
      this.status = "cleared";
      this.api.sfx.tap();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { w, h } = this.api;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#241447");
    grad.addColorStop(1, "#150b28");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // ターゲット（星風の丸）
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = PALETTE.accent;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    centerText(ctx, "！", 0, 2, "900 34px sans-serif", "#fff");
    ctx.restore();
  }
}
