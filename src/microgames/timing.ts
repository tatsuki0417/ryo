import type { InputEvent } from "../engine/types";
import { PALETTE, clamp, roundRect } from "../engine/util";
import { BaseGame } from "./base";

// タイミング: 回る針が みどりゾーンに来たらタップ！
export class StopNeedle extends BaseGame {
  private ang = 0;
  private vel = 0;
  private zoneCenter = 0;
  private zoneHalf = 0;
  private radius = 110;
  protected setup(): void {
    this.command = "ゾーンで とめろ！";
    this.zoneHalf = clamp(0.5 - (this.api.speed - 1) * 0.12, 0.28, 0.5);
    this.zoneCenter = this.api.range(-Math.PI * 0.7, Math.PI * 0.7);
    this.vel = 3.0 * this.api.speed * (this.api.rand() < 0.5 ? 1 : -1);
    this.ang = this.api.range(-Math.PI, Math.PI);
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    this.ang += this.vel * dt;
    if (this.ang > Math.PI) this.ang -= Math.PI * 2;
    if (this.ang < -Math.PI) this.ang += Math.PI * 2;
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    let d = Math.abs(this.ang - this.zoneCenter);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d <= this.zoneHalf) this.clear();
    else this.fail();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#101f2a");
    const cx = this.api.w / 2;
    const cy = this.api.h / 2;
    const R = this.radius;
    ctx.lineWidth = 22;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.good;
    ctx.beginPath();
    ctx.arc(cx, cy, R, this.zoneCenter - this.zoneHalf, this.zoneCenter + this.zoneHalf);
    ctx.stroke();
    // 針
    ctx.strokeStyle = PALETTE.accent2;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(this.ang) * R, cy + Math.sin(this.ang) * R);
    ctx.stroke();
    this.hint(ctx, "みどりでタップ");
  }
}

// タイミング/反応: しんごうが あおになったらタップ！（赤で押すとミス）
export class TrafficGo extends BaseGame {
  private go = false;
  private delay = 1;
  private t = 0;
  protected setup(): void {
    this.command = "あおで タップ！";
    this.go = false;
    this.t = 0;
    this.delay = this.api.range(0.5, Math.max(0.9, 2.0 - (this.api.speed - 1)));
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    this.t += dt;
    if (!this.go && this.t >= this.delay) this.go = true;
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    if (this.go) this.clear();
    else this.fail();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#0e1420");
    const cx = this.api.w / 2;
    const cy = this.api.h / 2;
    ctx.fillStyle = "#222";
    roundRect(ctx, cx - 46, cy - 130, 92, 260, 20);
    ctx.fill();
    const lamp = (i: number, on: boolean, col: string) => {
      ctx.beginPath();
      ctx.arc(cx, cy - 80 + i * 80, 30, 0, Math.PI * 2);
      ctx.fillStyle = on ? col : "rgba(255,255,255,0.12)";
      ctx.fill();
    };
    lamp(0, !this.go, PALETTE.bad);
    lamp(1, false, PALETTE.accent2);
    lamp(2, this.go, PALETTE.good);
    this.hint(ctx, this.go ? "いま！" : "あおまで まて");
  }
}

// タイミング: メーターが たまりきる直前でストップ！
export class FillStop extends BaseGame {
  private fill = 0;
  private target = 0.86;
  private band = 0.12;
  protected setup(): void {
    this.command = "ちょうどで ストップ！";
    this.fill = 0;
    this.band = clamp(0.14 - (this.api.speed - 1) * 0.02, 0.08, 0.14);
    this.target = 1 - this.band;
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    this.fill += 0.55 * this.api.speed * dt;
    if (this.fill >= 1) this.fail(); // 出しすぎ
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    if (this.fill >= this.target - this.band && this.fill <= 1) this.clear();
    else this.fail();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#231038");
    const bx = 70;
    const bw = this.api.w - 140;
    const by = this.api.h / 2 - 30;
    const bh = 60;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, bx, by, bw, bh, 14);
    ctx.fill();
    // 当たり帯
    ctx.fillStyle = "rgba(57,217,138,0.5)";
    roundRect(ctx, bx + bw * (this.target - this.band), by, bw * (1 - (this.target - this.band)), bh, 8);
    ctx.fill();
    // ゲージ
    ctx.fillStyle = this.fill > 0.98 ? PALETTE.bad : PALETTE.accent2;
    roundRect(ctx, bx, by, bw * Math.min(1, this.fill), bh, 14);
    ctx.fill();
    this.hint(ctx, "みどりの帯でタップ");
  }
}
