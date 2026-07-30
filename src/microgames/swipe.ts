import type { InputEvent, SwipeDir } from "../engine/types";
import { PALETTE, centerText, pick, range } from "../engine/util";
import { BaseGame, drawBall, drawBuddy } from "./base";

const OPP: Record<SwipeDir, SwipeDir> = { up: "down", down: "up", left: "right", right: "left" };
const DIR_JP: Record<SwipeDir, string> = { up: "うえ", down: "した", left: "ひだり", right: "みぎ" };

// 瞬発: くだものだけスパッと切れ！ばくだんを切るとミス。
const FRUIT_EMOJI = ["🍉", "🍎", "🍊", "🍓", "🍇"];
export class SliceFruit extends BaseGame {
  private items: { x: number; y: number; bomb: boolean; sliced: boolean; emoji: string }[] = [];
  protected setup(): void {
    this.command = "くだものを きれ！";
    this.items = [];
    const n = 3;
    const bombIdx = this.api.rand() < 0.7 ? Math.floor(this.api.rand() * (n + 1)) : -1;
    for (let i = 0; i < n + 1; i++) {
      this.items.push({
        x: range(70, this.api.w - 70),
        y: range(200, this.api.h - 170),
        bomb: i === bombIdx,
        sliced: false,
        emoji: FRUIT_EMOJI[(this.api.rand() * FRUIT_EMOJI.length) | 0],
      });
    }
    // ばくだんが無い場合は最後を必ずフルーツに（クリア可能）
    if (bombIdx < 0) this.items[n].bomb = false;
  }
  onInput(e: InputEvent): void {
    if (e.type !== "swipe") return;
    for (const it of this.items) {
      if (it.sliced || Math.hypot(it.x - e.x, it.y - e.y) > 60) continue;
      if (it.bomb) {
        this.fail();
      } else {
        it.sliced = true;
        this.api.sfx.swipe();
        this.api.burst(it.x, it.y, "#7bd93a", 14);
        if (this.items.filter((x) => !x.bomb).every((x) => x.sliced)) this.clear();
      }
      return;
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#0f2818");
    for (const it of this.items) {
      if (it.sliced) continue;
      if (it.bomb) {
        drawBall(ctx, it.x, it.y, 40, "#333", "#000", 4);
        centerText(ctx, "💣", it.x, it.y, "38px sans-serif", "#fff");
      } else {
        drawBall(ctx, it.x, it.y, 42, "#7bd93a", "#4f9f1f", 4);
        centerText(ctx, it.emoji, it.x, it.y, "40px sans-serif", "#fff");
      }
    }
    this.hint(ctx, "ばくだんは切るな！");
  }
}

// アクション: 飛びまわる虫を全部はらいのけろ！（スワイプ）
export class SwatFlies extends BaseGame {
  private flies: { x: number; y: number; vx: number; vy: number; gone: boolean }[] = [];
  protected setup(): void {
    this.command = "むしを はらえ！";
    this.flies = [];
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = this.api.rand() * Math.PI * 2;
      const sp = 70 * this.api.speed;
      this.flies.push({
        x: range(70, this.api.w - 70),
        y: range(180, this.api.h - 140),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        gone: false,
      });
    }
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    for (const f of this.flies) {
      if (f.gone) continue;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < 40 || f.x > this.api.w - 40) f.vx *= -1;
      if (f.y < 140 || f.y > this.api.h - 60) f.vy *= -1;
    }
  }
  onInput(e: InputEvent): void {
    if (e.type !== "swipe") return;
    // スワイプ開始点に近い虫を1匹はらう
    let best = -1;
    let bd = 70;
    this.flies.forEach((f, i) => {
      if (f.gone) return;
      const d = Math.hypot(f.x - e.x, f.y - e.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best >= 0) {
      this.flies[best].gone = true;
      this.api.sfx.swipe();
      this.api.burst(this.flies[best].x, this.flies[best].y, "#39d98a");
      if (this.flies.every((f) => f.gone)) this.clear();
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#1c1c10");
    for (const f of this.flies) {
      if (f.gone) continue;
      centerText(ctx, "🪰", f.x, f.y, "40px sans-serif", "#fff");
    }
    this.hint(ctx, "むしの上をスワイプ");
  }
}

// 回避: 障害物が来たらスワイプで ジャンプ！
export class JumpOver extends BaseGame {
  private obsX = 0;
  private vx = 0;
  private air = 0;
  private playerX = 90;
  private ground = 0;
  protected setup(): void {
    this.command = "ジャンプ！";
    this.timeoutResult = "clear";
    this.ground = this.api.h - 160;
    this.obsX = this.api.w + 40;
    this.vx = (this.api.w + 120) / (this.api.duration * 0.75) * this.api.speed;
    this.air = 0;
  }
  update(dt: number): void {
    if (this.status !== "playing") return;
    if (this.air > 0) this.air -= dt;
    this.obsX -= this.vx * dt;
    const airborne = this.air > 0;
    if (Math.abs(this.obsX - this.playerX) < 36 && !airborne) {
      this.fail();
    } else if (this.obsX < this.playerX - 40) {
      this.clear();
    }
  }
  onInput(e: InputEvent): void {
    if (e.type === "swipe" && e.dir === "up" && this.air <= 0) {
      this.air = 0.55;
      this.api.sfx.jump();
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#101830");
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.ground + 30);
    ctx.lineTo(this.api.w, this.ground + 30);
    ctx.stroke();
    // プレイヤー（かわいいキャラ）
    const jump = this.air > 0 ? Math.sin((1 - this.air / 0.55) * Math.PI) * 90 : 0;
    drawBuddy(ctx, this.playerX, this.ground - jump, 24, PALETTE.accent2, { look: 1 });
    // 障害物
    ctx.fillStyle = PALETTE.bad;
    ctx.fillRect(this.obsX - 18, this.ground - 6, 36, 36);
    this.hint(ctx, "上にスワイプでジャンプ");
  }
}

// 瞬発+記憶: 表示された2方向を順にスワイプ！
export class SwipeTwo extends BaseGame {
  private seq: SwipeDir[] = [];
  private idx = 0;
  protected setup(): void {
    const dirs: SwipeDir[] = ["up", "down", "left", "right"];
    this.seq = [pick(dirs), pick(dirs)];
    this.idx = 0;
    this.command = `${DIR_JP[this.seq[0]]}→${DIR_JP[this.seq[1]]} とスワイプ！`;
  }
  onInput(e: InputEvent): void {
    if (e.type !== "swipe") return;
    if (e.dir === this.seq[this.idx]) {
      this.api.sfx.tap();
      this.idx++;
      if (this.idx >= this.seq.length) this.clear();
    } else {
      this.fail();
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#17233d");
    const cy = this.api.h / 2;
    this.seq.forEach((d, i) => {
      const x = this.api.w / 2 + (i - 0.5) * 110;
      const done = i < this.idx;
      centerText(
        ctx,
        DIR_JP[d],
        x,
        cy,
        "900 30px sans-serif",
        done ? PALETTE.good : PALETTE.accent2,
        { color: PALETTE.ink, width: 5 }
      );
    });
    this.hint(ctx, "じゅんばんにスワイプ");
  }
}

// アクション: 画面のよごれをスワイプで ふきとれ！（規定回数）
export class CleanScreen extends BaseGame {
  private need = 4;
  private done = 0;
  protected setup(): void {
    this.command = "ふきとれ！";
    this.need = 4;
    this.done = 0;
  }
  onInput(e: InputEvent): void {
    if (e.type !== "swipe" || this.status !== "playing") return;
    this.done++;
    this.api.sfx.tap();
    if (this.done >= this.need) this.clear();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#123");
    // 残りよごれ
    const remain = 1 - this.done / this.need;
    ctx.fillStyle = "#5a4a2a";
    const rows = 6;
    const cols = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r * cols + c) / (rows * cols) < remain) {
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(
            (this.api.w / cols) * (c + 0.5),
            140 + (this.api.h - 200) * (r / rows) + 40,
            26,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    this.hint(ctx, `ゴシゴシ ${this.done}/${this.need}`);
  }
}

// 判断+瞬発: 矢印の「はんたい」にスワイプ！
export class OppositeSwipe extends BaseGame {
  private dir: SwipeDir = "up";
  protected setup(): void {
    this.dir = pick(["up", "down", "left", "right"] as const);
    this.command = "はんたいにスワイプ！";
  }
  onInput(e: InputEvent): void {
    if (e.type !== "swipe") return;
    if (e.dir === OPP[this.dir]) this.clear();
    else this.fail();
  }
  render(ctx: CanvasRenderingContext2D): void {
    this.fillBg(ctx, "#2a1030");
    const cx = this.api.w / 2;
    const cy = this.api.h / 2;
    const ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[this.dir];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = PALETTE.bad;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-60, -18);
    ctx.lineTo(16, -18);
    ctx.lineTo(16, -40);
    ctx.lineTo(64, 0);
    ctx.lineTo(16, 40);
    ctx.lineTo(16, 18);
    ctx.lineTo(-60, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    centerText(ctx, "この矢印と逆へ！", cx, cy + 130, "800 20px sans-serif", PALETTE.accent2);
  }
}
