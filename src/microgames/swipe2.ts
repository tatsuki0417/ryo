import type { InputEvent, SwipeDir } from "../engine/types";
import { PALETTE, centerText, clamp, pick } from "../engine/util";
import { BaseGame, drawBall, drawBuddy } from "./base";

const DIR_JP: Record<SwipeDir, string> = { up: "↑", down: "↓", left: "←", right: "→" };
const ANGLE: Record<SwipeDir, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

// 反射神経: 3方向を素早く連続スワイプ！
export class ArrowRush extends BaseGame {
  protected seq: SwipeDir[] = [];
  protected idx = 0;
  protected count = 3;
  protected setup(): void {
    this.count = 3;
    this.buildSeq();
    this.command = "れんぞくスワイプ！";
  }
  protected buildSeq(): void {
    const dirs: SwipeDir[] = ["up", "down", "left", "right"];
    this.seq = [];
    for (let i = 0; i < this.count; i++) this.seq.push(pick(dirs));
    this.idx = 0;
  }
  onInput(e: InputEvent): void {
    if (e.type !== "swipe") return;
    if (e.dir === this.seq[this.idx]) {
      this.api.sfx.swipe();
      this.idx++;
      if (this.idx >= this.seq.length) this.clear();
    } else {
      this.fail();
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#17233d");
    const cy = this.api.h / 2;
    const startX = this.api.w / 2 - ((this.seq.length - 1) * 64) / 2;
    this.seq.forEach((d, i) => {
      const done = i < this.idx;
      const cur = i === this.idx;
      centerText(
        ctx,
        DIR_JP[d],
        startX + i * 64,
        cy,
        `900 ${cur ? 48 : 38}px sans-serif`,
        done ? PALETTE.good : cur ? PALETTE.accent2 : "rgba(255,255,255,0.4)"
      );
    });
    this.hint(ctx, `${this.idx}/${this.seq.length}`);
  }
}

// スワイプで狙う: 的の方向へスワイプして当てろ！
export class SlingAim extends BaseGame {
  private tx = 0;
  private ty = 0;
  private need: SwipeDir = "up";
  protected setup(): void {
    this.command = "的をねらってスワイプ！";
    const dir = pick(["up", "down", "left", "right"] as const);
    this.need = dir;
    const cx = this.api.w / 2;
    const cy = this.api.h / 2;
    const off = 150;
    this.tx = cx + Math.cos(ANGLE[dir]) * off;
    this.ty = cy + Math.sin(ANGLE[dir]) * off;
  }
  onInput(e: InputEvent): void {
    if (e.type !== "swipe") return;
    if (e.dir === this.need) this.clear();
    else this.fail();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#241038");
    drawBall(ctx, this.tx, this.ty, 34, PALETTE.bad, "#fff", 4);
    centerText(ctx, "🎯", this.tx, this.ty, "30px sans-serif", "#fff");
    drawBall(ctx, this.api.w / 2, this.api.h / 2, 26, PALETTE.accent2, "#c9a400", 4);
    this.hint(ctx, "的の方向へゆびをはじく");
  }
}

// 回避: 左右から来るビームを、上下スワイプでよけろ！（生存でクリア）
export class DodgeBeam extends BaseGame {
  private rows = 3;
  private row = 1;
  private beams: { row: number; x: number; dir: number }[] = [];
  private acc = 0;
  private vx = 0;
  private px = 0;
  protected setup(): void {
    this.command = "ビームをよけろ！";
    this.timeoutResult = "clear";
    this.row = 1;
    this.beams = [];
    this.acc = 0.3;
    this.vx = 320 * this.api.speed;
    this.px = this.api.w / 2;
  }
  private rowY(r: number): number {
    return 220 + r * 130;
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    this.acc -= dt;
    if (this.acc <= 0) {
      this.acc = Math.max(0.45, 0.8 - (this.api.speed - 1) * 0.15);
      const fromLeft = this.api.rand() < 0.5;
      this.beams.push({
        row: Math.floor(this.api.rand() * this.rows),
        x: fromLeft ? -20 : this.api.w + 20,
        dir: fromLeft ? 1 : -1,
      });
    }
    for (const b of this.beams) {
      b.x += this.vx * b.dir * dt;
      if (b.row === this.row && Math.abs(b.x - this.px) < 30) this.fail();
    }
    this.beams = this.beams.filter((b) => b.x > -40 && b.x < this.api.w + 40);
  }
  onInput(e: InputEvent): void {
    if (e.type !== "swipe") return;
    const before = this.row;
    if (e.dir === "up") this.row = clamp(this.row - 1, 0, this.rows - 1);
    else if (e.dir === "down") this.row = clamp(this.row + 1, 0, this.rows - 1);
    if (this.row !== before) this.api.sfx.swipe();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#0f1420");
    for (const b of this.beams) {
      ctx.fillStyle = PALETTE.bad;
      ctx.fillRect(0, this.rowY(b.row) - 5, this.api.w, 10);
      drawBall(ctx, b.x, this.rowY(b.row), 12, "#fff", PALETTE.bad, 3);
    }
    drawBuddy(ctx, this.px, this.rowY(this.row), 20, PALETTE.accent2, { happy: false });
    this.hint(ctx, "上下スワイプで列を移動");
  }
}
