import type { InputEvent, Microgame, MicrogameApi } from "../engine/types";
import { PALETTE, centerText, roundRect } from "../engine/util";

// タイミング/音ゲー: 光が当たりゾーンに来たらタップ！
export class TimingBar implements Microgame {
  readonly command = "ゾーンでタップ！";
  readonly timeoutResult = "fail" as const;
  status: "playing" | "cleared" | "failed" = "playing";

  private api!: MicrogameApi;
  private pos = 0; // 0..1
  private vel = 0;
  private zoneStart = 0;
  private zoneW = 0;
  private barX = 40;
  private barW = 0;
  private barY = 0;

  init(api: MicrogameApi): void {
    this.api = api;
    this.barW = api.w - 80;
    this.barY = api.h / 2;
    // 難易度でゾーンを狭く、速く
    this.zoneW = Math.max(0.14, 0.26 - (api.speed - 1) * 0.05);
    this.zoneStart = api.range(0.15, 0.85 - this.zoneW);
    this.vel = 0.8 * api.speed * (api.rand() < 0.5 ? 1 : -1);
    this.pos = api.rand();
  }

  update(dt: number): void {
    if (this.status !== "playing") return;
    this.pos += this.vel * dt;
    if (this.pos > 1) {
      this.pos = 1;
      this.vel *= -1;
    } else if (this.pos < 0) {
      this.pos = 0;
      this.vel *= -1;
    }
  }

  onInput(e: InputEvent): void {
    if (this.status !== "playing" || e.type !== "tap") return;
    if (this.pos >= this.zoneStart && this.pos <= this.zoneStart + this.zoneW) {
      this.status = "cleared";
      this.api.sfx.tap();
    } else {
      this.status = "failed";
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { w, h } = this.api;
    ctx.fillStyle = "#12232e";
    ctx.fillRect(0, 0, w, h);

    const bx = this.barX;
    const by = this.barY;
    const bw = this.barW;
    // バー
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, bx, by - 20, bw, 40, 12);
    ctx.fill();
    // 当たりゾーン
    ctx.fillStyle = PALETTE.good;
    roundRect(ctx, bx + bw * this.zoneStart, by - 20, bw * this.zoneW, 40, 8);
    ctx.fill();
    // 動く光
    const px = bx + bw * this.pos;
    ctx.fillStyle = PALETTE.accent2;
    ctx.shadowColor = PALETTE.accent2;
    ctx.shadowBlur = 16;
    roundRect(ctx, px - 5, by - 34, 10, 68, 5);
    ctx.fill();
    ctx.shadowBlur = 0;

    centerText(ctx, "みどりでタップ", w / 2, by - 70, "700 18px sans-serif", "rgba(255,255,255,0.75)");
  }
}
