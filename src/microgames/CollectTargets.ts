import type { InputEvent, Microgame, MicrogameApi } from "../engine/types";
import { PALETTE, centerText } from "../engine/util";

interface Coin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  got: boolean;
}

// スポーツ/収集: 動き回るコインを、時間内に全部タップ！
export class CollectTargets implements Microgame {
  readonly command = "ぜんぶ集めろ！";
  readonly timeoutResult = "fail" as const;
  status: "playing" | "cleared" | "failed" = "playing";

  private api!: MicrogameApi;
  private coins: Coin[] = [];

  init(api: MicrogameApi): void {
    this.api = api;
    const n = 3 + Math.min(3, Math.floor((api.speed - 1) * 3)); // 3〜6個
    this.coins = [];
    for (let i = 0; i < n; i++) {
      const sp = 60 * api.speed;
      const ang = api.rand() * Math.PI * 2;
      this.coins.push({
        x: api.range(60, api.w - 60),
        y: api.range(120, api.h - 120),
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        r: 26,
        got: false,
      });
    }
  }

  update(dt: number): void {
    if (this.status !== "playing") return;
    for (const c of this.coins) {
      if (c.got) continue;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.x < c.r || c.x > this.api.w - c.r) c.vx *= -1;
      if (c.y < 80 + c.r || c.y > this.api.h - c.r) c.vy *= -1;
    }
  }

  onInput(e: InputEvent): void {
    if (this.status !== "playing" || e.type !== "tap") return;
    for (const c of this.coins) {
      if (!c.got && Math.hypot(e.x - c.x, e.y - c.y) <= c.r + 12) {
        c.got = true;
        this.api.sfx.coin();
        this.api.burst(c.x, c.y, "#ffd63d");
        break;
      }
    }
    if (this.coins.every((c) => c.got)) this.status = "cleared";
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { w, h } = this.api;
    ctx.fillStyle = "#1e2410";
    ctx.fillRect(0, 0, w, h);

    for (const c of this.coins) {
      if (c.got) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = PALETTE.accent2;
      ctx.beginPath();
      ctx.arc(0, 0, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#c9a400";
      ctx.stroke();
      centerText(ctx, "★", 0, 1, "900 24px sans-serif", "#c9a400");
      ctx.restore();
    }

    const left = this.coins.filter((c) => !c.got).length;
    centerText(ctx, "のこり " + left, w / 2, 100, "800 20px sans-serif", "rgba(255,255,255,0.8)");
  }
}
