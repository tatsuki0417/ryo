import type { InputEvent } from "../engine/types";
import { PALETTE, clamp } from "../engine/util";
import { BaseGame, drawBall, isTapOn } from "./base";
import { ArrowRush } from "./swipe2";

// ボス: 6連続スワイプの嵐！
export class BossArrowStorm extends ArrowRush {
  protected setup(): void {
    this.count = 6;
    this.buildSeq();
    this.command = "ボス！ れんぞくスワイプ！";
  }
}

// ボス: 大量のモグラをたたきまくれ！
export class BossWhackRush extends BaseGame {
  private holes: { x: number; y: number; up: number }[] = [];
  private need = 8;
  private got = 0;
  private acc = 0;
  protected setup(): void {
    this.command = "ボス！ たたきまくれ！";
    this.need = 8;
    this.got = 0;
    this.acc = 0.2;
    this.holes = [];
    const cols = 3;
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.holes.push({ x: (this.api.w / (cols + 1)) * (c + 1), y: 220 + r * 120, up: 0 });
      }
    }
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    for (const h of this.holes) if (h.up > 0) h.up -= dt;
    this.acc -= dt;
    if (this.acc <= 0) {
      this.acc = 0.4;
      const down = this.holes.filter((h) => h.up <= 0);
      // 一度に2匹まで
      for (let k = 0; k < 2 && down.length; k++) {
        const i = Math.floor(this.api.rand() * down.length);
        down[i].up = 0.85;
        down.splice(i, 1);
      }
    }
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const h of this.holes) {
      if (h.up > 0 && isTapOn(e, h.x, h.y - 16, 42)) {
        h.up = 0;
        this.got++;
        this.api.sfx.tap();
        if (this.got >= this.need) this.clear();
        return;
      }
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#2a1408");
    for (const h of this.holes) {
      ctx.fillStyle = "#140b04";
      ctx.beginPath();
      ctx.ellipse(h.x, h.y + 14, 42, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      if (h.up > 0) {
        drawBall(ctx, h.x, h.y - 16, 36, "#b06a32", "#7a4620", 5);
        drawBall(ctx, h.x - 12, h.y - 24, 5, "#fff", "#000", 1.5);
        drawBall(ctx, h.x + 12, h.y - 24, 5, "#fff", "#000", 1.5);
      }
    }
    this.hint(ctx, `${this.got}/${this.need}`);
  }
}

// ボス: 降りそそぐ岩を最後までよけ切れ！（生存でクリア）
export class BossSurvive extends BaseGame {
  private lanes = 4;
  private lane = 1;
  private rocks: { lane: number; y: number }[] = [];
  private acc = 0;
  private vy = 0;
  private playerY = 0;
  protected setup(): void {
    this.command = "ボス！ よけ切れ！";
    this.timeoutResult = "clear";
    this.lane = 1;
    this.rocks = [];
    this.acc = 0.25;
    this.vy = 340 * this.api.speed;
    this.playerY = this.api.h - 120;
  }
  private laneX(l: number): number {
    const m = 55;
    return m + ((this.api.w - m * 2) / (this.lanes - 1)) * l;
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    this.acc -= dt;
    if (this.acc <= 0) {
      this.acc = Math.max(0.22, 0.4 - (this.api.speed - 1) * 0.06);
      this.rocks.push({ lane: Math.floor(this.api.rand() * this.lanes), y: -20 });
    }
    const px = this.laneX(this.lane);
    for (const r of this.rocks) {
      r.y += this.vy * dt;
      if (Math.abs(this.laneX(r.lane) - px) < 34 && Math.abs(r.y - this.playerY) < 34) this.fail();
    }
    this.rocks = this.rocks.filter((r) => r.y < this.api.h + 30);
  }
  onInput(e: InputEvent): void {
    if (e.type !== "swipe") return;
    if (e.dir === "left") this.lane = clamp(this.lane - 1, 0, this.lanes - 1);
    else if (e.dir === "right") this.lane = clamp(this.lane + 1, 0, this.lanes - 1);
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#0d1424");
    for (const r of this.rocks) {
      drawBall(ctx, this.laneX(r.lane), r.y, 20, PALETTE.bad, "rgba(0,0,0,0.3)", 3);
    }
    const px = this.laneX(this.lane);
    ctx.save();
    ctx.translate(px, this.playerY);
    ctx.fillStyle = PALETTE.accent2;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(20, 22);
    ctx.lineTo(-20, 22);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.restore();
    this.hint(ctx, "←→でにげろ！");
  }
}
