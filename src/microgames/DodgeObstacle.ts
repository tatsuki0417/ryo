import type { InputEvent, Microgame, MicrogameApi } from "../engine/types";
import { PALETTE, clamp } from "../engine/util";
import { drawBuddy } from "./base";

interface Rock {
  lane: number;
  y: number;
}

// 回避: スワイプでレースを移動して、落ちてくる岩をよけ切れ！（時間まで生存でクリア）
export class DodgeObstacle implements Microgame {
  readonly command = "よけろ！";
  readonly timeoutResult = "clear" as const; // 最後まで生き残ればクリア
  status: "playing" | "cleared" | "failed" = "playing";

  private api!: MicrogameApi;
  private lanes = 3;
  private lane = 1;
  private rocks: Rock[] = [];
  private spawnAcc = 0;
  private spawnEvery = 0.5;
  private vy = 0;
  private playerY = 0;

  init(api: MicrogameApi): void {
    this.api = api;
    this.lane = 1;
    this.playerY = api.h - 110;
    this.vy = 360 * api.speed;
    this.spawnEvery = Math.max(0.32, 0.62 - (api.speed - 1) * 0.12);
    this.spawnAcc = 0.2;
    this.rocks = [];
  }

  private laneX(lane: number): number {
    const margin = 60;
    const usable = this.api.w - margin * 2;
    return margin + (usable / (this.lanes - 1)) * lane;
  }

  update(dt: number): void {
    if (this.status !== "playing") return;
    this.spawnAcc -= dt;
    if (this.spawnAcc <= 0) {
      this.spawnAcc = this.spawnEvery;
      // プレイヤーの現在レーンを避けやすいよう、他レーンに寄せつつランダム
      const lane = Math.floor(this.api.rand() * this.lanes);
      this.rocks.push({ lane, y: -30 });
    }
    const px = this.laneX(this.lane);
    for (const r of this.rocks) {
      r.y += this.vy * dt;
      const rx = this.laneX(r.lane);
      if (Math.abs(rx - px) < 40 && Math.abs(r.y - this.playerY) < 40) {
        this.status = "failed";
        return;
      }
    }
    this.rocks = this.rocks.filter((r) => r.y < this.api.h + 40);
  }

  onInput(e: InputEvent): void {
    if (this.status !== "playing" || e.type !== "swipe") return;
    const before = this.lane;
    if (e.dir === "left") this.lane = clamp(this.lane - 1, 0, this.lanes - 1);
    else if (e.dir === "right") this.lane = clamp(this.lane + 1, 0, this.lanes - 1);
    if (this.lane !== before) this.api.sfx.swipe();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { w, h } = this.api;
    ctx.fillStyle = "#0f1a2b";
    ctx.fillRect(0, 0, w, h);

    // レーン線
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    for (let i = 0; i < this.lanes; i++) {
      const x = this.laneX(i);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // 岩（ゴツゴツした顔つき）
    for (const r of this.rocks) {
      ctx.fillStyle = PALETTE.bad;
      ctx.beginPath();
      ctx.arc(this.laneX(r.lane), r.y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.stroke();
    }

    // プレイヤー（かわいいキャラ）
    drawBuddy(ctx, this.laneX(this.lane), this.playerY, 24, PALETTE.accent2);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "700 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("← スワイプでよける →", w / 2, h - 40);
  }
}
