import { sfx } from "./audio";
import type { InputEvent, Microgame, MicrogameApi, MicrogameDef } from "./types";
import {
  LOGICAL_H,
  LOGICAL_W,
  PALETTE,
  centerText,
  clamp,
  range,
  roundRect,
  shuffle,
} from "./util";

type Phase = "intro" | "play" | "result" | "levelup" | "gameover";

const START_LIVES = 4;
const LEVEL_EVERY = 4; // 何問クリアごとにレベルアップ
const RESULT_DUR = 0.85;
const LEVELUP_DUR = 1.15;

function introDur(level: number): number {
  return clamp(1.6 - (level - 1) * 0.1, 0.85, 1.6);
}
function playDur(level: number): number {
  return clamp(5.0 - (level - 1) * 0.3, 2.4, 5.0);
}

export interface EngineCallbacks {
  onGameOver(score: number): void;
}

export class GameEngine {
  private defs: MicrogameDef[];
  private cb: EngineCallbacks;

  lives = START_LIVES;
  score = 0;
  level = 1;
  private clears = 0;

  private phase: Phase = "intro";
  private phaseTime = 0;
  private playTime = 0;
  private curDur = 5;
  private introTime = 0;

  private current: Microgame | null = null;
  private lastResult: "clear" | "fail" = "clear";
  private pendingLevelUp = false;
  private queue: MicrogameDef[] = [];
  private lastId = "";
  private tickAcc = 0;

  constructor(defs: MicrogameDef[], cb: EngineCallbacks) {
    this.defs = defs;
    this.cb = cb;
  }

  start(): void {
    this.lives = START_LIVES;
    this.score = 0;
    this.level = 1;
    this.clears = 0;
    this.pendingLevelUp = false;
    this.queue = [];
    this.lastId = "";
    this.beginIntro();
  }

  // --- 出題（直前と同じものを避ける） ---
  private nextDef(): MicrogameDef {
    if (this.queue.length === 0) {
      this.queue = shuffle(this.defs);
      if (this.queue.length > 1 && this.queue[0].id === this.lastId) {
        this.queue.push(this.queue.shift()!);
      }
    }
    const def = this.queue.shift()!;
    this.lastId = def.id;
    return def;
  }

  private makeApi(): MicrogameApi {
    const speed = 1 + (this.level - 1) * 0.15;
    return {
      w: LOGICAL_W,
      h: LOGICAL_H,
      speed,
      duration: this.curDur,
      rand: () => Math.random(),
      range,
      sfx: { tap: sfx.tap, good: sfx.good, bad: sfx.bad },
    };
  }

  private beginIntro(): void {
    this.curDur = playDur(this.level);
    this.introTime = introDur(this.level);
    const def = this.nextDef();
    this.current = def.make();
    this.current.init(this.makeApi());
    this.phase = "intro";
    this.phaseTime = 0;
  }

  private beginPlay(): void {
    this.phase = "play";
    this.phaseTime = 0;
    this.playTime = 0;
    this.tickAcc = 0;
  }

  private resolve(result: "clear" | "fail"): void {
    this.lastResult = result;
    if (result === "clear") {
      this.score += 1;
      this.clears += 1;
      sfx.good();
      if (this.clears % LEVEL_EVERY === 0) {
        this.level += 1;
        this.pendingLevelUp = true;
      }
    } else {
      this.lives -= 1;
      sfx.bad();
    }
    this.phase = "result";
    this.phaseTime = 0;
  }

  update(dt: number): void {
    // 過大なdt（タブ復帰など）を抑制
    dt = Math.min(dt, 0.05);
    this.phaseTime += dt;

    switch (this.phase) {
      case "intro":
        if (this.phaseTime >= this.introTime) this.beginPlay();
        break;
      case "play": {
        this.playTime += dt;
        this.current?.update(dt);
        // 残り時間のカウント音
        const remain = this.curDur - this.playTime;
        if (remain < 1.4) {
          this.tickAcc += dt;
          if (this.tickAcc >= 0.28) {
            this.tickAcc = 0;
            sfx.tick();
          }
        }
        const st = this.current?.status;
        if (st === "cleared") this.resolve("clear");
        else if (st === "failed") this.resolve("fail");
        else if (remain <= 0) {
          this.resolve(this.current?.timeoutResult === "clear" ? "clear" : "fail");
        }
        break;
      }
      case "result":
        if (this.phaseTime >= RESULT_DUR) {
          if (this.lives <= 0) {
            this.phase = "gameover";
            sfx.gameOver();
            this.cb.onGameOver(this.score);
          } else if (this.pendingLevelUp) {
            this.pendingLevelUp = false;
            this.phase = "levelup";
            this.phaseTime = 0;
            sfx.levelUp();
          } else {
            this.beginIntro();
          }
        }
        break;
      case "levelup":
        if (this.phaseTime >= LEVELUP_DUR) this.beginIntro();
        break;
      case "gameover":
        break;
    }
  }

  handleInput(e: InputEvent): void {
    if (this.phase === "play") this.current?.onInput(e);
  }

  // --- 描画 ---
  render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

    if (this.phase === "levelup") {
      this.renderLevelUp(ctx);
      return;
    }

    // ミニゲーム本体（intro中は静止プレビュー、result中は結果スタンプ付き）
    this.current?.render(ctx);
    this.renderHud(ctx);

    if (this.phase === "intro") this.renderCommand(ctx);
    if (this.phase === "result") this.renderStamp(ctx);
  }

  private renderHud(ctx: CanvasRenderingContext2D): void {
    // ライフ（ハート）
    const hx = 16;
    const hy = 20;
    for (let i = 0; i < START_LIVES; i++) {
      drawHeart(ctx, hx + i * 26, hy, 9, i < this.lives);
    }
    // スコア
    centerText(
      ctx,
      String(this.score),
      LOGICAL_W - 30,
      hy,
      "900 26px sans-serif",
      PALETTE.accent2,
      { color: "rgba(0,0,0,0.5)", width: 4 }
    );
    ctx.textAlign = "right";
    ctx.font = "700 11px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Lv." + this.level, LOGICAL_W - 16, hy + 22);

    // タイマーバー（play中のみ）
    if (this.phase === "play") {
      const frac = clamp((this.curDur - this.playTime) / this.curDur, 0, 1);
      const barW = LOGICAL_W - 32;
      const bx = 16;
      const by = 40;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      roundRect(ctx, bx, by, barW, 6, 3);
      ctx.fill();
      ctx.fillStyle = frac < 0.3 ? PALETTE.bad : PALETTE.accent2;
      roundRect(ctx, bx, by, barW * frac, 6, 3);
      ctx.fill();
    }
  }

  private renderCommand(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "rgba(27,16,48,0.55)";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    const cmd = this.current?.command ?? "";
    // ポップイン演出
    const t = clamp(this.phaseTime / 0.18, 0, 1);
    const scale = 0.7 + t * 0.3;
    ctx.translate(LOGICAL_W / 2, LOGICAL_H / 2);
    ctx.scale(scale, scale);
    ctx.rotate(-0.05);
    centerText(ctx, cmd, 0, 0, "900 46px sans-serif", PALETTE.accent2, {
      color: PALETTE.ink,
      width: 8,
    });
    ctx.restore();
  }

  private renderStamp(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const ok = this.lastResult === "clear";
    const t = clamp(this.phaseTime / 0.14, 0, 1);
    const scale = 1.4 - t * 0.4;
    ctx.translate(LOGICAL_W / 2, LOGICAL_H / 2);
    ctx.scale(scale, scale);
    ctx.rotate(ok ? -0.12 : 0.12);
    centerText(
      ctx,
      ok ? "せいかい！" : "ミス…",
      0,
      0,
      "900 52px sans-serif",
      ok ? PALETTE.good : PALETTE.bad,
      { color: PALETTE.white, width: 8 }
    );
    ctx.restore();
  }

  private renderLevelUp(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    // ストライプ背景
    ctx.save();
    ctx.translate(LOGICAL_W / 2, LOGICAL_H / 2);
    ctx.rotate(-0.3);
    for (let i = -12; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(233,64,120,0.25)" : "rgba(255,214,61,0.12)";
      ctx.fillRect(-400, i * 40, 800, 20);
    }
    ctx.restore();
    const t = clamp(this.phaseTime / 0.2, 0, 1);
    ctx.save();
    ctx.translate(LOGICAL_W / 2, LOGICAL_H / 2 - 20);
    ctx.scale(0.6 + t * 0.4, 0.6 + t * 0.4);
    ctx.rotate(-0.06);
    centerText(ctx, "スピードアップ！", 0, 0, "900 36px sans-serif", PALETTE.accent2, {
      color: PALETTE.ink,
      width: 7,
    });
    ctx.restore();
    centerText(
      ctx,
      "Lv." + this.level,
      LOGICAL_W / 2,
      LOGICAL_H / 2 + 40,
      "900 30px sans-serif",
      PALETTE.white
    );
  }

  // デバッグ/自動テスト用
  debugState(): { phase: Phase; lives: number; score: number; level: number } {
    return { phase: this.phase, lives: this.lives, score: this.score, level: this.level };
  }
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  filled: boolean
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(-s * 1.4, -s * 0.4, -s * 0.6, -s * 1.2, 0, -s * 0.4);
  ctx.bezierCurveTo(s * 0.6, -s * 1.2, s * 1.4, -s * 0.4, 0, s * 0.9);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = PALETTE.bad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.stroke();
  } else {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.stroke();
  }
  ctx.restore();
}
