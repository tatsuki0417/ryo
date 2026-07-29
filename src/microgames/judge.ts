import type { InputEvent } from "../engine/types";
import { PALETTE, centerText, pick, range, roundRect, shuffle } from "../engine/util";
import { BaseGame, drawBall, isTapOn } from "./base";

const COLORS = [
  { name: "あか", css: "#ff5757" },
  { name: "あお", css: "#4a90ff" },
  { name: "きいろ", css: "#ffd63d" },
  { name: "みどり", css: "#39d98a" },
];

// 判断: 大きいほうの玉をタップ！
export class BiggerShape extends BaseGame {
  private a = { x: 0, y: 0, r: 0 };
  private b = { x: 0, y: 0, r: 0 };
  protected setup(): void {
    this.command = "おおきいほうをタップ！";
    const cy = this.api.h / 2;
    const r1 = range(40, 55);
    const r2 = r1 + range(14, 30);
    const big = this.api.rand() < 0.5;
    this.a = { x: this.api.w * 0.3, y: cy, r: big ? r2 : r1 };
    this.b = { x: this.api.w * 0.7, y: cy, r: big ? r1 : r2 };
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    const onA = isTapOn(e, this.a.x, this.a.y, this.a.r);
    const onB = isTapOn(e, this.b.x, this.b.y, this.b.r);
    if (!onA && !onB) return;
    const bigger = this.a.r > this.b.r ? this.a : this.b;
    if ((onA && this.a === bigger) || (onB && this.b === bigger)) this.clear();
    else this.fail();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#101a2e");
    drawBall(ctx, this.a.x, this.a.y, this.a.r, PALETTE.accent, "#a82a54", 4);
    drawBall(ctx, this.b.x, this.b.y, this.b.r, "#4a90ff", "#2a5aa8", 4);
  }
}

// 判断: 1つだけ色がちがう玉をタップ！
export class OddOneOut extends BaseGame {
  private dots: { x: number; y: number; css: string; odd: boolean }[] = [];
  protected setup(): void {
    this.command = "ちがういろをタップ！";
    const base = pick(COLORS);
    let other = pick(COLORS);
    while (other.name === base.name) other = pick(COLORS);
    const cols = 3;
    const rows = 3;
    const oddIdx = Math.floor(this.api.rand() * cols * rows);
    this.dots = [];
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isOdd = i === oddIdx;
        this.dots.push({
          x: (this.api.w / (cols + 1)) * (c + 1),
          y: 200 + r * 130,
          css: isOdd ? other.css : base.css,
          odd: isOdd,
        });
        i++;
      }
    }
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const d of this.dots) {
      if (!isTapOn(e, d.x, d.y, 38)) continue;
      if (d.odd) this.clear();
      else this.fail();
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#161233");
    for (const d of this.dots) drawBall(ctx, d.x, d.y, 34, d.css, "rgba(0,0,0,0.25)", 3);
  }
}

// 判断/計算: 式が合っていたら右、ちがったら左へスワイプ！
export class MathTrueFalse extends BaseGame {
  private text = "";
  private correct = false;
  protected setup(): void {
    const a = Math.floor(range(1, 9));
    const b = Math.floor(range(1, 9));
    const real = a + b;
    this.correct = this.api.rand() < 0.5;
    const shown = this.correct ? real : real + (this.api.rand() < 0.5 ? 1 : -1);
    this.text = `${a} + ${b} = ${shown}`;
    this.command = "あってたら右, ちがえば左！";
  }
  onInput(e: InputEvent): void {
    if (e.type !== "swipe") return;
    if (e.dir === "right") this.answer(true);
    else if (e.dir === "left") this.answer(false);
  }
  private answer(yes: boolean): void {
    if (yes === this.correct) this.clear();
    else this.fail();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#22142f");
    centerText(ctx, this.text, this.api.w / 2, this.api.h / 2 - 20, "900 44px sans-serif", "#fff");
    centerText(ctx, "◯右 → / ✕左 ←", this.api.w / 2, this.api.h / 2 + 60, "800 20px sans-serif", PALETTE.accent2);
  }
}

// 判断/計数: 玉の数と同じ数字ボタンをタップ！
export class CountTap extends BaseGame {
  private count = 3;
  private dots: { x: number; y: number }[] = [];
  private options: { x: number; y: number; n: number }[] = [];
  protected setup(): void {
    this.count = Math.floor(range(2, 6)); // 2..5
    this.dots = [];
    for (let i = 0; i < this.count; i++) {
      this.dots.push({ x: range(70, this.api.w - 70), y: range(160, this.api.h / 2 - 20) });
    }
    const set = new Set<number>([this.count]);
    while (set.size < 3) set.add(Math.floor(range(2, 7)));
    const opts = shuffle([...set]);
    this.options = opts.map((n, i) => ({
      x: (this.api.w / (opts.length + 1)) * (i + 1),
      y: this.api.h - 150,
      n,
    }));
    this.command = "いくつ？ かずをタップ！";
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const o of this.options) {
      if (!isTapOn(e, o.x, o.y, 40)) continue;
      if (o.n === this.count) this.clear();
      else this.fail();
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#12202a");
    for (const d of this.dots) drawBall(ctx, d.x, d.y, 22, PALETTE.accent2, "#c9a400", 3);
    for (const o of this.options) {
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      roundRect(ctx, o.x - 38, o.y - 38, 76, 76, 16);
      ctx.fill();
      centerText(ctx, String(o.n), o.x, o.y, "900 34px sans-serif", "#fff");
    }
  }
}

// 判断: 指示された色のボタンをタップ！
export class PickColor extends BaseGame {
  private targetName = "";
  private btns: { x: number; y: number; css: string; name: string }[] = [];
  protected setup(): void {
    const target = pick(COLORS);
    this.targetName = target.name;
    this.command = `「${target.name}」をタップ！`;
    const chosen = shuffle(COLORS);
    this.btns = chosen.map((c, i) => ({
      x: this.api.w / 2 + (i % 2 === 0 ? -80 : 80),
      y: 240 + Math.floor(i / 2) * 150,
      css: c.css,
      name: c.name,
    }));
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const b of this.btns) {
      if (!isTapOn(e, b.x, b.y, 50)) continue;
      if (b.name === this.targetName) this.clear();
      else this.fail();
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#1b1230");
    for (const b of this.btns) {
      ctx.fillStyle = b.css;
      roundRect(ctx, b.x - 50, b.y - 40, 100, 80, 18);
      ctx.fill();
    }
  }
}
