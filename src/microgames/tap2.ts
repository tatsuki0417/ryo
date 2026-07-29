import type { InputEvent } from "../engine/types";
import { PALETTE, centerText, range, roundRect } from "../engine/util";
import { BaseGame, drawBall, isTapOn } from "./base";

// アクション: すばやく動く的を1回タップ！
export class TapMovingOnce extends BaseGame {
  private x = 180;
  private y = 320;
  private vx = 0;
  private vy = 0;
  private r = 34;
  protected setup(): void {
    this.command = "うごく的をタップ！";
    this.x = range(80, this.api.w - 80);
    this.y = range(200, this.api.h - 160);
    const a = this.api.rand() * Math.PI * 2;
    const sp = 150 * this.api.speed;
    this.vx = Math.cos(a) * sp;
    this.vy = Math.sin(a) * sp;
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < this.r || this.x > this.api.w - this.r) this.vx *= -1;
    if (this.y < 140 + this.r || this.y > this.api.h - this.r) this.vy *= -1;
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    if (isTapOn(e, this.x, this.y, this.r + 8)) this.clear();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#101a2e");
    drawBall(ctx, this.x, this.y, this.r, PALETTE.accent, "#fff", 5);
    centerText(ctx, "！", this.x, this.y, "900 30px sans-serif", "#fff");
    this.hint(ctx, "にげる的をつかまえろ");
  }
}

// アクション+判断: 落ちてくる良い物だけタップ、ばくだんは押すな！
export class GoodBadFalling extends BaseGame {
  private items: { x: number; y: number; vy: number; bomb: boolean; got: boolean }[] = [];
  private need = 0;
  private got = 0;
  protected setup(): void {
    this.command = "フルーツだけタップ！";
    this.items = [];
    const n = 5;
    let goods = 0;
    for (let i = 0; i < n; i++) {
      const bomb = this.api.rand() < 0.35;
      if (!bomb) goods++;
      this.items.push({
        x: range(50, this.api.w - 50),
        y: -range(20, 400),
        vy: (90 + range(0, 50)) * this.api.speed,
        bomb,
        got: false,
      });
    }
    if (goods === 0) {
      this.items[0].bomb = false;
      goods = 1;
    }
    this.need = goods;
    this.got = 0;
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    for (const it of this.items) {
      if (it.got) continue;
      it.y += it.vy * dt;
      if (!it.bomb && it.y > this.api.h + 30) this.fail(); // 良い物を落とした
    }
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const it of this.items) {
      if (it.got || !isTapOn(e, it.x, it.y, 34)) continue;
      if (it.bomb) this.fail();
      else {
        it.got = true;
        this.got++;
        this.api.sfx.tap();
        if (this.got >= this.need) this.clear();
      }
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#141d10");
    for (const it of this.items) {
      if (it.got || it.y < 130) continue;
      drawBall(ctx, it.x, it.y, 30, it.bomb ? "#333" : PALETTE.good, it.bomb ? "#000" : "#1f8f5a", 4);
      centerText(ctx, it.bomb ? "💣" : "🍏", it.x, it.y, "28px sans-serif", "#fff");
    }
    this.hint(ctx, "ばくだんは さわるな！");
  }
}

// 記憶: 光ったパネルを覚えて、止まったらタップ！
export class MemoryFlash extends BaseGame {
  private panels: { x: number; y: number }[] = [];
  private target = 0;
  private flashUntil = 0;
  private t = 0;
  private cur = 0;
  protected setup(): void {
    this.command = "光ったパネルをタップ！";
    const cx = this.api.w / 2;
    const cy = this.api.h / 2;
    this.panels = [
      { x: cx - 80, y: cy - 80 },
      { x: cx + 80, y: cy - 80 },
      { x: cx - 80, y: cy + 80 },
      { x: cx + 80, y: cy + 80 },
    ];
    this.target = Math.floor(this.api.rand() * 4);
    this.flashUntil = 0.9;
    this.t = 0;
    this.cur = this.target;
  }
  update(dt: number): void {
    this.t += dt;
  }
  private flashing(): boolean {
    return this.t < this.flashUntil;
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap" || this.flashing()) return;
    for (let i = 0; i < this.panels.length; i++) {
      const p = this.panels[i];
      if (isTapOn(e, p.x, p.y, 56)) {
        if (i === this.target) this.clear();
        else this.fail();
        return;
      }
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#161233");
    const lit = this.flashing();
    this.panels.forEach((p, i) => {
      const on = lit && i === this.cur;
      ctx.fillStyle = on ? PALETTE.accent2 : "rgba(255,255,255,0.12)";
      roundRect(ctx, p.x - 56, p.y - 56, 112, 112, 18);
      ctx.fill();
    });
    this.hint(ctx, lit ? "おぼえて！" : "どこが光った？");
  }
}

// アクション: 動きまわる虫を全部タップでたたけ！
export class SwatTap extends BaseGame {
  private bugs: { x: number; y: number; vx: number; vy: number; dead: boolean }[] = [];
  protected setup(): void {
    this.command = "むしを たたけ！";
    this.bugs = [];
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = this.api.rand() * Math.PI * 2;
      const sp = 90 * this.api.speed;
      this.bugs.push({
        x: range(60, this.api.w - 60),
        y: range(170, this.api.h - 120),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        dead: false,
      });
    }
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    for (const b of this.bugs) {
      if (b.dead) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < 40 || b.x > this.api.w - 40) b.vx *= -1;
      if (b.y < 140 || b.y > this.api.h - 50) b.vy *= -1;
    }
  }
  onInput(e: InputEvent): void {
    if (e.type !== "tap") return;
    for (const b of this.bugs) {
      if (!b.dead && isTapOn(e, b.x, b.y, 34)) {
        b.dead = true;
        this.api.sfx.tap();
        if (this.bugs.every((x) => x.dead)) this.clear();
        return;
      }
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#1c1c10");
    for (const b of this.bugs) {
      if (b.dead) continue;
      centerText(ctx, "🐛", b.x, b.y, "38px sans-serif", "#fff");
    }
    this.hint(ctx, "タップでピシャッ！");
  }
}
