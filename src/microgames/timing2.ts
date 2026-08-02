import type { InputEvent } from "../engine/types";
import { PALETTE, clamp } from "../engine/util";
import { BaseGame, drawBall } from "./base";
import { drawPlayer } from "../engine/profile";

// 連打+タイミング: ちょうどの大きさまで連打でふくらませ、割るな！（止めるのはタップ長押し不可なので自動判定）
export class PumpBalloon extends BaseGame {
  private size = 0;
  private target = 0.85;
  private band = 0.12;
  private deflate = 0.35;
  private stopped = false;
  protected setup(): void {
    this.command = "ちょうどまで ふくらませ！";
    this.size = 0.1;
    this.band = clamp(0.14 - (this.api.speed - 1) * 0.02, 0.09, 0.14);
    this.target = 1 - this.band;
    this.stopped = false;
  }
  update(dt: number): void {
    if (this.status !== "playing" || this.stopped) return;
    this.size = Math.max(0.1, this.size - this.deflate * dt);
    if (this.size >= 1) this.fail(); // 割れた
  }
  onInput(e: InputEvent): void {
    if (e.type === "swipe") {
      // スワイプで「ストップ」＝いまの大きさで確定
      this.stopped = true;
      if (this.size >= this.target - this.band && this.size < 1) this.clear();
      else this.fail();
      return;
    }
    if (e.type !== "tap" || this.status !== "playing") return;
    this.size += 0.11;
    this.api.sfx.tap();
    if (this.size >= 1) this.fail();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#231038");
    const cx = this.api.w / 2;
    const cy = this.api.h / 2;
    // 目標リング
    ctx.strokeStyle = "rgba(57,217,138,0.5)";
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, 40 + this.target * 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    drawBall(ctx, cx, cy, 40 + this.size * 90, this.size > this.target ? PALETTE.good : PALETTE.accent, "#fff", 4);
    this.hint(ctx, "連打でふくらむ／スワイプでストップ");
  }
}

// タイミング/アクション: タップで羽ばたいて、すき間を通れ！（生存でクリア）
export class FlappyTap extends BaseGame {
  private y = 0;
  private vy = 0;
  private gaps: { x: number; cy: number; gap: number }[] = [];
  private vx = 0;
  private acc = 0;
  private px = 90;
  protected setup(): void {
    this.command = "タップで すき間を通れ！";
    this.timeoutResult = "clear";
    this.y = this.api.h / 2;
    this.vy = 0;
    this.gaps = [];
    this.acc = 0.1;
    this.vx = 150 * this.api.speed;
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    this.vy += 900 * dt;
    this.y += this.vy * dt;
    if (this.y < 150 || this.y > this.api.h - 20) this.fail();
    this.acc -= dt;
    if (this.acc <= 0) {
      this.acc = 1.1;
      this.gaps.push({
        x: this.api.w + 30,
        cy: this.api.range(230, this.api.h - 130),
        gap: 130,
      });
    }
    for (const g of this.gaps) {
      g.x -= this.vx * dt;
      if (Math.abs(g.x - this.px) < 24) {
        if (Math.abs(this.y - g.cy) > g.gap / 2) this.fail();
      }
    }
    this.gaps = this.gaps.filter((g) => g.x > -40);
  }
  onInput(e: InputEvent): void {
    if (e.type === "tap" && this.status === "playing") {
      this.vy = -300;
      this.api.sfx.jump();
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#101a30");
    for (const g of this.gaps) {
      ctx.fillStyle = PALETTE.good;
      ctx.fillRect(g.x - 18, 140, 36, g.cy - g.gap / 2 - 140);
      ctx.fillRect(g.x - 18, g.cy + g.gap / 2, 36, this.api.h - (g.cy + g.gap / 2));
    }
    drawPlayer(ctx, this.px, this.y, 18, { look: 1 });
    this.hint(ctx, "タップで上へ");
  }
}
