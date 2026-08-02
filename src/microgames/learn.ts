import type { InputEvent } from "../engine/types";
import { PALETTE, centerText, range, roundRect, shuffle } from "../engine/util";
import { BaseGame, drawBall, isTapOn } from "./base";

// ===== 知育（子ども向け学習）ゲーム =====

const HIRAGANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわ".split("");

// ボタン配置ヘルパ（2列×n行のグリッド）
function grid2(w: number, count: number, top = 300, gapY = 120): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    pts.push({ x: w / 2 + (i % 2 === 0 ? -80 : 80), y: top + Math.floor(i / 2) * gapY });
  }
  return pts;
}

// ひらがな: 手本と同じ字をタップ！
export class HiraganaFind extends BaseGame {
  private target = "あ";
  private btns: { x: number; y: number; ch: string }[] = [];
  protected setup(): void {
    const pool = shuffle(HIRAGANA).slice(0, 6);
    this.target = pool[(this.api.rand() * pool.length) | 0];
    this.command = "おなじ字をタップ！";
    this.btns = grid2(this.api.w, 6, 320).map((p, i) => ({ ...p, ch: pool[i] }));
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const b of this.btns) {
      if (!isTapOn(e, b.x, b.y, 46)) continue;
      if (b.ch === this.target) this.clear();
      else this.fail();
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#1a1533");
    centerText(ctx, "この字は？", this.api.w / 2, 140, "700 18px sans-serif", "rgba(255,255,255,0.7)");
    centerText(ctx, this.target, this.api.w / 2, 210, "900 84px sans-serif", PALETTE.accent2);
    for (const b of this.btns) {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      roundRect(ctx, b.x - 46, b.y - 40, 92, 80, 16);
      ctx.fill();
      centerText(ctx, b.ch, b.x, b.y, "900 44px sans-serif", "#fff");
    }
  }
}

// かず: おおいほうをタップ！（数の感覚）
export class CountMore extends BaseGame {
  private left: { x: number; y: number }[] = [];
  private right: { x: number; y: number }[] = [];
  private leftMore = false;
  protected setup(): void {
    this.command = "おおいのは どっち？";
    const a = Math.floor(range(2, 7));
    let b = Math.floor(range(2, 7));
    while (b === a) b = Math.floor(range(2, 7));
    this.leftMore = a > b;
    const place = (n: number, x0: number): { x: number; y: number }[] => {
      const arr: { x: number; y: number }[] = [];
      for (let i = 0; i < n; i++) arr.push({ x: x0 + range(-45, 45), y: range(220, this.api.h - 160) });
      return arr;
    };
    this.left = place(a, this.api.w * 0.28);
    this.right = place(b, this.api.w * 0.72);
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    const pickedLeft = e.x < this.api.w / 2;
    if (pickedLeft === this.leftMore) this.clear();
    else this.fail();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#12222a");
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.api.w / 2, 180);
    ctx.lineTo(this.api.w / 2, this.api.h - 60);
    ctx.stroke();
    for (const p of this.left) drawBall(ctx, p.x, p.y, 22, PALETTE.accent, "#a82a54", 3);
    for (const p of this.right) drawBall(ctx, p.x, p.y, 22, "#4a90ff", "#2a5aa8", 3);
    this.hint(ctx, "タップでえらぶ");
  }
}

// たしざん・ひきざん: こたえをタップ！
export class MathPick extends BaseGame {
  private text = "";
  private answer = 0;
  private opts: { x: number; y: number; n: number }[] = [];
  private sub: boolean;
  constructor(sub = false) {
    super();
    this.sub = sub;
  }
  protected setup(): void {
    let a = Math.floor(range(1, 9));
    let b = Math.floor(range(1, 9));
    if (this.sub) {
      if (b > a) [a, b] = [b, a];
      this.answer = a - b;
      this.text = `${a} - ${b} = ?`;
      this.command = "ひきざん！";
    } else {
      this.answer = a + b;
      this.text = `${a} + ${b} = ?`;
      this.command = "たしざん！";
    }
    const set = new Set<number>([this.answer]);
    while (set.size < 3) set.add(Math.max(0, this.answer + Math.floor(range(-3, 4))));
    const arr = shuffle([...set]);
    this.opts = arr.map((n, i) => ({ x: (this.api.w / (arr.length + 1)) * (i + 1), y: this.api.h - 170, n }));
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const o of this.opts) {
      if (!isTapOn(e, o.x, o.y, 44)) continue;
      if (o.n === this.answer) this.clear();
      else this.fail();
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#20142f");
    centerText(ctx, this.text, this.api.w / 2, 220, "900 52px sans-serif", "#fff");
    for (const o of this.opts) {
      ctx.fillStyle = PALETTE.accent2;
      roundRect(ctx, o.x - 44, o.y - 44, 88, 88, 18);
      ctx.fill();
      centerText(ctx, String(o.n), o.x, o.y, "900 40px sans-serif", PALETTE.ink);
    }
  }
}

type ShapeId = "circle" | "square" | "triangle" | "star";
const SHAPES: ShapeId[] = ["circle", "square", "triangle", "star"];

function drawShape(ctx: CanvasRenderingContext2D, s: ShapeId, x: number, y: number, r: number, fill: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = fill;
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (s === "circle") {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  } else if (s === "square") {
    ctx.rect(-r, -r, r * 2, r * 2);
  } else if (s === "triangle") {
    ctx.moveTo(0, -r);
    ctx.lineTo(r, r);
    ctx.lineTo(-r, r);
    ctx.closePath();
  } else {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a2) * r * 0.5, Math.sin(a2) * r * 0.5);
    }
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// かたち: 手本と同じ形をタップ！
export class ShapeMatch extends BaseGame {
  private target: ShapeId = "circle";
  private btns: { x: number; y: number; s: ShapeId }[] = [];
  protected setup(): void {
    this.target = SHAPES[(this.api.rand() * SHAPES.length) | 0];
    this.command = "おなじ形をタップ！";
    const order = shuffle(SHAPES);
    this.btns = grid2(this.api.w, 4, 340).map((p, i) => ({ ...p, s: order[i] }));
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const b of this.btns) {
      if (!isTapOn(e, b.x, b.y, 46)) continue;
      if (b.s === this.target) this.clear();
      else this.fail();
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#141d33");
    centerText(ctx, "これとおなじ", this.api.w / 2, 150, "700 18px sans-serif", "rgba(255,255,255,0.7)");
    drawShape(ctx, this.target, this.api.w / 2, 220, 44, PALETTE.accent2);
    for (const b of this.btns) drawShape(ctx, b.s, b.x, b.y, 38, "#7f8cff");
  }
}

// いろ: 手本と同じ色をタップ！
const LEARN_COLORS = ["#ff5757", "#4a90ff", "#ffd63d", "#39d98a", "#b06aff", "#ff9a3d"];
export class ColorSampleMatch extends BaseGame {
  private target = "#ff5757";
  private btns: { x: number; y: number; c: string }[] = [];
  protected setup(): void {
    const pool = shuffle(LEARN_COLORS).slice(0, 4);
    this.target = pool[(this.api.rand() * pool.length) | 0];
    this.command = "おなじ色をタップ！";
    this.btns = grid2(this.api.w, 4, 340).map((p, i) => ({ ...p, c: pool[i] }));
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const b of this.btns) {
      if (!isTapOn(e, b.x, b.y, 48)) continue;
      if (b.c === this.target) this.clear();
      else this.fail();
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#181430");
    centerText(ctx, "これとおなじ色", this.api.w / 2, 150, "700 18px sans-serif", "rgba(255,255,255,0.7)");
    drawBall(ctx, this.api.w / 2, 220, 44, this.target, "rgba(255,255,255,0.3)", 4);
    for (const b of this.btns) {
      ctx.fillStyle = b.c;
      roundRect(ctx, b.x - 46, b.y - 36, 92, 72, 16);
      ctx.fill();
    }
  }
}

// じゅんばん: 小さい数から順にタップ！（数の並び）
export class NumberOrder extends BaseGame {
  private items: { x: number; y: number; n: number; done: boolean }[] = [];
  private nextIdx = 0;
  private sorted: number[] = [];
  protected setup(): void {
    this.command = "小さいじゅんにタップ！";
    const set = new Set<number>();
    while (set.size < 4) set.add(Math.floor(range(1, 20)));
    const nums = [...set];
    this.sorted = [...nums].sort((a, b) => a - b);
    this.nextIdx = 0;
    this.items = nums.map((n) => ({
      x: range(70, this.api.w - 70),
      y: range(220, this.api.h - 150),
      n,
      done: false,
    }));
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const it of this.items) {
      if (it.done || !isTapOn(e, it.x, it.y, 42)) continue;
      if (it.n === this.sorted[this.nextIdx]) {
        it.done = true;
        this.api.sfx.coin();
        this.api.burst(it.x, it.y, PALETTE.good);
        this.nextIdx++;
        if (this.nextIdx >= this.sorted.length) this.clear();
      } else {
        this.fail();
      }
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#12203a");
    for (const it of this.items) {
      if (it.done) continue;
      drawBall(ctx, it.x, it.y, 40, PALETTE.accent2, "#c9a400", 4);
      centerText(ctx, String(it.n), it.x, it.y, "900 30px sans-serif", PALETTE.ink);
    }
    this.hint(ctx, "1→2→3…の じゅんに");
  }
}

// ABC: アルファベット順にタップ！
export class AlphabetOrder extends BaseGame {
  private items: { x: number; y: number; ch: string; done: boolean }[] = [];
  private nextIdx = 0;
  private seq: string[] = [];
  protected setup(): void {
    this.command = "ABCじゅんにタップ！";
    const start = Math.floor(range(0, 22)); // A..V あたり
    this.seq = [0, 1, 2, 3].map((i) => String.fromCharCode(65 + start + i));
    this.nextIdx = 0;
    const shuffled = shuffle(this.seq);
    this.items = shuffled.map((ch) => ({
      x: range(70, this.api.w - 70),
      y: range(220, this.api.h - 150),
      ch,
      done: false,
    }));
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const it of this.items) {
      if (it.done || !isTapOn(e, it.x, it.y, 42)) continue;
      if (it.ch === this.seq[this.nextIdx]) {
        it.done = true;
        this.api.sfx.coin();
        this.api.burst(it.x, it.y, PALETTE.good);
        this.nextIdx++;
        if (this.nextIdx >= this.seq.length) this.clear();
      } else {
        this.fail();
      }
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#1a1230");
    for (const it of this.items) {
      if (it.done) continue;
      drawBall(ctx, it.x, it.y, 40, "#7f8cff", "#4a56c0", 4);
      centerText(ctx, it.ch, it.x, it.y, "900 34px sans-serif", "#fff");
    }
    this.hint(ctx, `${this.seq[0]}→${this.seq[1]}→…の じゅんに`);
  }
}
