import type { InputEvent } from "../engine/types";
import { PALETTE, centerText, range, roundRect, shuffle } from "../engine/util";
import { BaseGame, isTapOn } from "./base";

// 判断: じゃんけんで「勝てる手」をタップ！
const HANDS = ["✊", "✌️", "🖐️"] as const;
const NAME = ["グー", "チョキ", "パー"];
// win[opp] = 相手に勝つ手のindex
const WIN: Record<number, number> = { 0: 2, 1: 0, 2: 1 };

export class RockPaperScissors extends BaseGame {
  private opp = 0;
  private btns: { x: number; y: number; hand: number }[] = [];
  protected setup(): void {
    this.opp = Math.floor(this.api.rand() * 3);
    this.command = "じゃんけん…かてる手！";
    const order = shuffle([0, 1, 2]);
    this.btns = order.map((h, i) => ({
      x: (this.api.w / 4) * (i + 1),
      y: this.api.h - 180,
      hand: h,
    }));
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const b of this.btns) {
      if (!isTapOn(e, b.x, b.y, 44)) continue;
      if (b.hand === WIN[this.opp]) this.clear();
      else this.fail();
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#1a1230");
    centerText(ctx, "あいて", this.api.w / 2, 170, "700 18px sans-serif", "rgba(255,255,255,0.7)");
    centerText(ctx, HANDS[this.opp], this.api.w / 2, 250, "90px sans-serif", "#fff");
    centerText(ctx, `(${NAME[this.opp]})`, this.api.w / 2, 320, "700 16px sans-serif", "rgba(255,255,255,0.6)");
    for (const b of this.btns) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      roundRect(ctx, b.x - 44, b.y - 44, 88, 88, 16);
      ctx.fill();
      centerText(ctx, HANDS[b.hand], b.x, b.y, "48px sans-serif", "#fff");
    }
  }
}

// 判断: 大きい数字をタップ！
export class HigherNumber extends BaseGame {
  private a = { x: 0, y: 0, n: 0 };
  private b = { x: 0, y: 0, n: 0 };
  protected setup(): void {
    this.command = "大きい数字をタップ！";
    let n1 = Math.floor(range(1, 99));
    let n2 = Math.floor(range(1, 99));
    while (n2 === n1) n2 = Math.floor(range(1, 99));
    const cy = this.api.h / 2;
    this.a = { x: this.api.w * 0.3, y: cy, n: n1 };
    this.b = { x: this.api.w * 0.7, y: cy, n: n2 };
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    const onA = isTapOn(e, this.a.x, this.a.y, 60);
    const onB = isTapOn(e, this.b.x, this.b.y, 60);
    if (!onA && !onB) return;
    const bigger = this.a.n > this.b.n ? this.a : this.b;
    if ((onA && this.a === bigger) || (onB && this.b === bigger)) this.clear();
    else this.fail();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#12202a");
    for (const it of [this.a, this.b]) {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      roundRect(ctx, it.x - 60, it.y - 60, 120, 120, 20);
      ctx.fill();
      centerText(ctx, String(it.n), it.x, it.y, "900 52px sans-serif", PALETTE.accent2);
    }
  }
}

// 判断（ストループ）: 文字の意味ではなく「色」に合うボタンをタップ！
const CLR = [
  { name: "あか", css: "#ff5757" },
  { name: "あお", css: "#4a90ff" },
  { name: "きいろ", css: "#ffd63d" },
  { name: "みどり", css: "#39d98a" },
];
export class Stroop extends BaseGame {
  private wordIdx = 0;
  private inkIdx = 0;
  private btns: { x: number; y: number; idx: number }[] = [];
  protected setup(): void {
    this.command = "文字の「色」をタップ！";
    this.wordIdx = Math.floor(this.api.rand() * CLR.length);
    do {
      this.inkIdx = Math.floor(this.api.rand() * CLR.length);
    } while (this.inkIdx === this.wordIdx);
    const order = shuffle(CLR.map((_, i) => i));
    this.btns = order.map((idx, i) => ({
      x: this.api.w / 2 + (i % 2 === 0 ? -80 : 80),
      y: 330 + Math.floor(i / 2) * 130,
      idx,
    }));
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const b of this.btns) {
      if (!isTapOn(e, b.x, b.y, 48)) continue;
      if (b.idx === this.inkIdx) this.clear();
      else this.fail();
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#1b1230");
    centerText(ctx, CLR[this.wordIdx].name, this.api.w / 2, 200, "900 56px sans-serif", CLR[this.inkIdx].css);
    for (const b of this.btns) {
      ctx.fillStyle = CLR[b.idx].css;
      roundRect(ctx, b.x - 46, b.y - 34, 92, 68, 14);
      ctx.fill();
    }
    this.hint(ctx, "文字の意味にだまされるな！");
  }
}
