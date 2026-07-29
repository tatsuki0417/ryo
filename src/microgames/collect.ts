import type { InputEvent } from "../engine/types";
import { PALETTE, centerText, clamp, range, roundRect } from "../engine/util";
import { BaseGame, drawBall, isTapOn } from "./base";

// スポーツ: 落ちてくる玉を、スワイプで動かすカゴで うけとめろ！
export class CatchBasket extends BaseGame {
  private lanes = 3;
  private lane = 1;
  private items: { lane: number; y: number }[] = [];
  private need = 3;
  private got = 0;
  private vy = 0;
  private acc = 0;
  private basketY = 0;
  protected setup(): void {
    this.command = "うけとめろ！";
    this.lane = 1;
    this.got = 0;
    this.items = [];
    this.basketY = this.api.h - 130;
    this.vy = 300 * this.api.speed;
    this.acc = 0.3;
  }
  private laneX(l: number): number {
    const m = 70;
    return m + ((this.api.w - m * 2) / (this.lanes - 1)) * l;
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    this.acc -= dt;
    if (this.acc <= 0 && this.got + this.items.length < this.need) {
      this.acc = 0.7;
      this.items.push({ lane: Math.floor(this.api.rand() * this.lanes), y: -20 });
    }
    for (const it of this.items) it.y += this.vy * dt;
    // 判定
    this.items = this.items.filter((it) => {
      if (it.y >= this.basketY - 26 && it.y <= this.basketY + 26) {
        if (it.lane === this.lane) {
          this.got++;
          this.api.sfx.tap();
          if (this.got >= this.need) this.clear();
          return false;
        }
      }
      if (it.y > this.api.h + 30) {
        this.fail(); // 取り逃し
        return false;
      }
      return true;
    });
  }
  onInput(e: InputEvent): void {
    if (e.type !== "swipe") return;
    if (e.dir === "left") this.lane = clamp(this.lane - 1, 0, this.lanes - 1);
    else if (e.dir === "right") this.lane = clamp(this.lane + 1, 0, this.lanes - 1);
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#0f1a24");
    for (const it of this.items) drawBall(ctx, this.laneX(it.lane), it.y, 20, PALETTE.accent2, "#c9a400", 3);
    // カゴ
    const bx = this.laneX(this.lane);
    ctx.fillStyle = PALETTE.accent;
    roundRect(ctx, bx - 40, this.basketY - 6, 80, 44, 10);
    ctx.fill();
    this.hint(ctx, `キャッチ ${this.got}/${this.need}（←→スワイプ）`);
  }
}

// 収集: エサを全部タップして ペットに たべさせろ！
export class FeedPet extends BaseGame {
  private foods: { x: number; y: number; got: boolean }[] = [];
  protected setup(): void {
    this.command = "たべさせろ！";
    this.foods = [];
    const n = 4;
    for (let i = 0; i < n; i++) {
      this.foods.push({ x: range(60, this.api.w - 60), y: range(180, this.api.h - 220), got: false });
    }
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const f of this.foods) {
      if (!f.got && isTapOn(e, f.x, f.y, 40)) {
        f.got = true;
        this.api.sfx.tap();
        if (this.foods.every((x) => x.got)) this.clear();
        return;
      }
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#1a2410");
    centerText(ctx, "🐶", this.api.w / 2, this.api.h - 110, "72px sans-serif", "#fff");
    for (const f of this.foods) {
      if (f.got) continue;
      centerText(ctx, "🍖", f.x, f.y, "40px sans-serif", "#fff");
    }
    const left = this.foods.filter((f) => !f.got).length;
    this.hint(ctx, `のこり ${left}`);
  }
}

// スポーツ: ゴールに向かって シュート！（上にスワイプ）
export class Soccer extends BaseGame {
  private kicked = 0;
  private ballY = 0;
  protected setup(): void {
    this.command = "シュート！";
    this.kicked = 0;
    this.ballY = this.api.h - 160;
  }
  update(dt: number): void {
    if (this.kicked > 0) {
      this.kicked += dt;
      this.ballY -= 500 * dt;
    }
  }
  onInput(e: InputEvent): void {
    if (this.status !== "playing") return;
    if (e.type === "swipe" && e.dir === "up") {
      if (this.kicked === 0) this.kicked = 0.0001;
      this.api.sfx.tap();
      this.clear();
    } else if (e.type === "swipe") {
      this.fail();
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#0e2416");
    // ゴール
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 6;
    ctx.strokeRect(this.api.w / 2 - 90, 120, 180, 90);
    // ボール
    centerText(ctx, "⚽", this.api.w / 2, this.ballY, "48px sans-serif", "#fff");
    this.hint(ctx, "上にスワイプでキック");
  }
}

// アクション: 消える前に、光る玉を全部タップ！
export class PopStars extends BaseGame {
  private stars: { x: number; y: number; life: number; got: boolean }[] = [];
  protected setup(): void {
    this.command = "きえる前にタップ！";
    this.stars = [];
    const n = 4;
    for (let i = 0; i < n; i++) {
      this.stars.push({
        x: range(60, this.api.w - 60),
        y: range(170, this.api.h - 150),
        life: range(1.4, 2.4),
        got: false,
      });
    }
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    for (const s of this.stars) {
      if (s.got) continue;
      s.life -= dt;
      if (s.life <= 0) this.fail();
    }
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const s of this.stars) {
      if (!s.got && isTapOn(e, s.x, s.y, 38)) {
        s.got = true;
        this.api.sfx.tap();
        if (this.stars.every((x) => x.got)) this.clear();
        return;
      }
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#141030");
    for (const s of this.stars) {
      if (s.got) continue;
      const scale = clamp(s.life, 0.2, 1);
      ctx.save();
      ctx.globalAlpha = clamp(s.life, 0.2, 1);
      drawBall(ctx, s.x, s.y, 20 + 18 * scale, PALETTE.accent2, "#c9a400", 3);
      centerText(ctx, "★", s.x, s.y, "900 24px sans-serif", "#c9a400");
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
