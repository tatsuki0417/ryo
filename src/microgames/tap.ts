import type { InputEvent } from "../engine/types";
import { PALETTE, centerText, range, roundRect } from "../engine/util";
import { BaseGame, drawBall, isTapOn } from "./base";

// 反応: 赤→緑に変わった瞬間にタップ！（早押しはミス）
export class TapReaction extends BaseGame {
  private green = false;
  private delay = 1;
  private t = 0;
  protected setup(): void {
    this.command = "みどりでタップ！";
    this.green = false;
    this.t = 0;
    this.delay = range(0.4, Math.max(0.8, 1.8 - (this.api.speed - 1)));
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    this.t += dt;
    if (!this.green && this.t >= this.delay) this.green = true;
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    if (this.green) this.clear();
    else this.fail(); // 早押し
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, this.green ? "#123a1f" : "#3a1212");
    drawBall(ctx, this.api.w / 2, this.api.h / 2, 90, this.green ? PALETTE.good : PALETTE.bad, "#fff", 6);
    centerText(
      ctx,
      this.green ? "いま！" : "まて…",
      this.api.w / 2,
      this.api.h / 2,
      "900 34px sans-serif",
      "#fff"
    );
  }
}

// アクション: 出てきたモグラをたたけ！（規定数）
export class WhackMole extends BaseGame {
  private holes: { x: number; y: number; up: number }[] = [];
  private need = 3;
  private got = 0;
  private acc = 0;
  protected setup(): void {
    this.command = "モグラをたたけ！";
    this.need = 3;
    this.got = 0;
    this.acc = 0.2;
    this.holes = [];
    const cols = 3;
    const rows = 2;
    const w = this.api.w;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.holes.push({
          x: (w / (cols + 1)) * (c + 1),
          y: 230 + r * 150,
          up: 0,
        });
      }
    }
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    for (const h of this.holes) if (h.up > 0) h.up -= dt;
    this.acc -= dt;
    if (this.acc <= 0) {
      this.acc = Math.max(0.4, 0.75 - (this.api.speed - 1) * 0.15);
      const down = this.holes.filter((h) => h.up <= 0);
      if (down.length) down[Math.floor(this.api.rand() * down.length)].up = 0.9;
    }
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const h of this.holes) {
      if (h.up > 0 && isTapOn(e, h.x, h.y - 18, 44)) {
        h.up = 0;
        this.got++;
        this.api.sfx.tap();
        if (this.got >= this.need) this.clear();
        return;
      }
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#241a10");
    for (const h of this.holes) {
      ctx.fillStyle = "#120c06";
      ctx.beginPath();
      ctx.ellipse(h.x, h.y + 16, 46, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      if (h.up > 0) {
        drawBall(ctx, h.x, h.y - 18, 40, "#b06a32", "#7a4620", 5);
        drawBall(ctx, h.x - 13, h.y - 26, 6, "#fff", "#000", 1.5);
        drawBall(ctx, h.x + 13, h.y - 26, 6, "#fff", "#000", 1.5);
      }
    }
    this.hint(ctx, `たたいた ${this.got}/${this.need}`);
  }
}

// 連打: ゲージをMAXまで連打！
export class TapMash extends BaseGame {
  private gauge = 0;
  protected setup(): void {
    this.command = "れんだ！";
    this.gauge = 0;
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    this.gauge = Math.max(0, this.gauge - 0.16 * dt);
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap" || this.status !== "playing") return;
    this.gauge += 0.075;
    this.api.sfx.tap();
    if (this.gauge >= 1) this.clear();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#2a1030");
    const bx = 60;
    const bw = 40;
    const bh = this.api.h - 320;
    const by = 180;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, this.api.w / 2 - bw / 2, by, bw, bh, 16);
    ctx.fill();
    const fh = bh * Math.min(1, this.gauge);
    ctx.fillStyle = this.gauge > 0.8 ? PALETTE.good : PALETTE.accent2;
    roundRect(ctx, this.api.w / 2 - bw / 2, by + bh - fh, bw, fh, 16);
    ctx.fill();
    void bx;
    this.hint(ctx, "タップしまくれ！");
  }
}

// 判断+アクション: くだものだけタップ、ばくだんは押すな！
export class AvoidBomb extends BaseGame {
  private items: { x: number; y: number; bomb: boolean; got: boolean }[] = [];
  protected setup(): void {
    this.command = "ばくだんはおすな！";
    this.items = [];
    const positions = [
      [90, 260],
      [270, 260],
      [90, 430],
      [270, 430],
      [180, 345],
    ];
    const bombIdx = Math.floor(this.api.rand() * positions.length);
    positions.forEach((p, i) => {
      this.items.push({ x: p[0], y: p[1], bomb: i === bombIdx, got: false });
    });
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const it of this.items) {
      if (it.got || !isTapOn(e, it.x, it.y, 46)) continue;
      if (it.bomb) {
        this.fail();
      } else {
        it.got = true;
        this.api.sfx.tap();
        if (this.items.filter((x) => !x.bomb).every((x) => x.got)) this.clear();
      }
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#13232a");
    for (const it of this.items) {
      if (it.got) continue;
      if (it.bomb) {
        drawBall(ctx, it.x, it.y, 42, "#333", "#000", 4);
        centerText(ctx, "💣", it.x, it.y, "40px sans-serif", "#fff");
      } else {
        drawBall(ctx, it.x, it.y, 42, PALETTE.accent, "#a82a54", 4);
        centerText(ctx, "🍎", it.x, it.y, "38px sans-serif", "#fff");
      }
    }
  }
}

// アクション: あがってくる風船を全部われ！（逃がすとミス）
export class PopBalloon extends BaseGame {
  private bs: { x: number; y: number; vy: number; hue: string; pop: boolean }[] = [];
  protected setup(): void {
    this.command = "ふうせんをわれ！";
    this.bs = [];
    const n = 3;
    const hues = [PALETTE.accent, PALETTE.accent2, PALETTE.good, "#4a90ff"];
    for (let i = 0; i < n; i++) {
      this.bs.push({
        x: range(60, this.api.w - 60),
        y: this.api.h + 60 + i * 120,
        vy: (110 + i * 10) * this.api.speed,
        hue: hues[i % hues.length],
        pop: false,
      });
    }
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    for (const b of this.bs) {
      if (b.pop) continue;
      b.y -= b.vy * dt;
      if (b.y < -40) this.fail();
    }
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const b of this.bs) {
      if (!b.pop && isTapOn(e, b.x, b.y, 40)) {
        b.pop = true;
        this.api.sfx.tap();
        if (this.bs.every((x) => x.pop)) this.clear();
        return;
      }
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#101a2e");
    for (const b of this.bs) {
      if (b.pop) continue;
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + 34);
      ctx.lineTo(b.x, b.y + 70);
      ctx.stroke();
      drawBall(ctx, b.x, b.y, 32, b.hue, "rgba(0,0,0,0.2)", 3);
    }
  }
}

// パレットクレンザー: とにかくボタンをおせ！（かんたん）
export class BigButton extends BaseGame {
  protected setup(): void {
    this.command = "ボタンをおせ！";
  }
  onInput(e: InputEvent): void {
    if (e.type === "tap") this.clear();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#201038");
    const w = this.api.w;
    const h = this.api.h;
    ctx.fillStyle = "#c9a400";
    roundRect(ctx, w / 2 - 110, h / 2 - 60, 220, 120, 24);
    ctx.fill();
    ctx.fillStyle = PALETTE.accent2;
    roundRect(ctx, w / 2 - 110, h / 2 - 70, 220, 120, 24);
    ctx.fill();
    centerText(ctx, "おす", w / 2, h / 2 - 10, "900 44px sans-serif", PALETTE.ink);
  }
}

// 回避/がまん: さわるな！（時間まで待てばクリア）
export class DontTap extends BaseGame {
  protected setup(): void {
    this.command = "さわるな！";
    this.timeoutResult = "clear";
  }
  onInput(e: InputEvent): void {
    if (e.type === "tap" || e.type === "swipe") this.fail();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#2a1414");
    centerText(ctx, "🚫", this.api.w / 2, this.api.h / 2 - 30, "120px sans-serif", "#fff");
    centerText(
      ctx,
      "さわらずまつ！",
      this.api.w / 2,
      this.api.h / 2 + 80,
      "800 22px sans-serif",
      PALETTE.bad
    );
  }
}

// 判断/記憶: 数字を1→2→3の順にタップ！
export class TapSequence extends BaseGame {
  private nums: { x: number; y: number; n: number }[] = [];
  private next = 1;
  protected setup(): void {
    this.command = "じゅんばんにタップ！";
    this.next = 1;
    const count = 3;
    const order = [1, 2, 3];
    const positions: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      positions.push([range(70, this.api.w - 70), range(200, this.api.h - 150)]);
    }
    this.nums = order.map((n, i) => ({ x: positions[i][0], y: positions[i][1], n }));
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const it of this.nums) {
      if (!isTapOn(e, it.x, it.y, 42)) continue;
      if (it.n === this.next) {
        this.api.sfx.tap();
        this.next++;
        if (this.next > this.nums.length) this.clear();
      } else {
        this.fail();
      }
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#161233");
    for (const it of this.nums) {
      const done = it.n < this.next;
      drawBall(ctx, it.x, it.y, 40, done ? PALETTE.good : PALETTE.accent2, "rgba(0,0,0,0.25)", 4);
      centerText(ctx, String(it.n), it.x, it.y, "900 34px sans-serif", PALETTE.ink);
    }
    this.hint(ctx, "1 → 2 → 3");
  }
}
