import { sfx } from "./audio";
import { setMusicLevel } from "./music";
import { Particles } from "./particles";
import type {
  BossDef,
  Genre,
  InputEvent,
  Microgame,
  MicrogameApi,
  MicrogameDef,
} from "./types";
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
const BOSS_EVERY = 2; // 何回レベルアップごとにボス
const RESULT_DUR = 0.85;
const LEVELUP_DUR = 1.15;

function introDur(level: number, boss: boolean): number {
  if (boss) return 1.8;
  return clamp(1.6 - (level - 1) * 0.1, 0.85, 1.6);
}
function playDur(level: number): number {
  return clamp(5.0 - (level - 1) * 0.32, 2.3, 5.0);
}

export interface EngineCallbacks {
  onGameOver(score: number): void;
}

export class GameEngine {
  private defs: MicrogameDef[];
  private bosses: BossDef[];
  private cb: EngineCallbacks;

  lives = START_LIVES;
  score = 0;
  level = 1;
  combo = 0;
  bestCombo = 0;
  private clears = 0;
  private levelUps = 0;

  private phase: Phase = "intro";
  private phaseTime = 0;
  private playTime = 0;
  private curDur = 5;
  private introTime = 0;

  private current: Microgame | null = null;
  private lastResult: "clear" | "fail" = "clear";
  private pendingLevelUp = false;
  private bossPending = false;
  private isBossRound = false;
  private isLearnRound = false;
  private queue: MicrogameDef[] = [];
  private bossQueue: BossDef[] = [];
  private lastGenre: Genre | null = null;
  private tickAcc = 0;

  private shakeTime = 0;
  private shakeMag = 0;
  private particles = new Particles();

  constructor(defs: MicrogameDef[], bosses: BossDef[], cb: EngineCallbacks) {
    this.defs = defs;
    this.bosses = bosses;
    this.cb = cb;
  }

  start(): void {
    this.lives = START_LIVES;
    this.score = 0;
    this.level = 1;
    this.combo = 0;
    this.bestCombo = 0;
    this.clears = 0;
    this.levelUps = 0;
    this.pendingLevelUp = false;
    this.bossPending = false;
    this.queue = [];
    this.bossQueue = [];
    this.lastGenre = null;
    this.particles.clear();
    this.beginIntro();
  }

  // --- 出題（直前と同じジャンルを避ける） ---
  private nextDef(): MicrogameDef {
    if (this.queue.length === 0) this.queue = shuffle(this.defs);
    let i = 0;
    if (this.lastGenre !== null) {
      const alt = this.queue.findIndex((d) => d.genre !== this.lastGenre);
      if (alt > 0) i = alt;
    }
    const [def] = this.queue.splice(i, 1);
    this.lastGenre = def.genre;
    return def;
  }

  private nextBoss(): BossDef {
    if (this.bossQueue.length === 0) this.bossQueue = shuffle(this.bosses);
    return this.bossQueue.shift()!;
  }

  private makeApi(): MicrogameApi {
    const raw = 1 + (this.level - 1) * 0.16;
    // 知育（learn）は小さな子でも遊べるよう、加速を抑える
    const speed = this.isLearnRound ? Math.min(raw, 1.15) : raw;
    return {
      w: LOGICAL_W,
      h: LOGICAL_H,
      speed,
      duration: this.curDur,
      rand: () => Math.random(),
      range,
      sfx: {
        tap: sfx.tap,
        good: sfx.good,
        bad: sfx.bad,
        pop: sfx.pop,
        coin: sfx.coin,
        swipe: sfx.swipe,
        jump: sfx.jump,
      },
      burst: (x, y, color, count) => this.particles.burst(x, y, color, count),
    };
  }

  private beginIntro(): void {
    this.isBossRound = this.bossPending;
    this.bossPending = false;
    this.isLearnRound = false;
    if (this.isBossRound) {
      this.curDur = Math.min(9, playDur(this.level) * 1.7);
      this.current = this.nextBoss().make();
      this.shake(7, 0.35);
      sfx.boss();
    } else {
      const def = this.nextDef();
      this.isLearnRound = def.genre === "learn";
      // 知育は制限時間を長めに固定して、あせらず取り組めるように
      this.curDur = this.isLearnRound ? Math.max(playDur(this.level), 6.5) : playDur(this.level);
      this.current = def.make();
    }
    this.current.init(this.makeApi());
    this.introTime = introDur(this.level, this.isBossRound);
    this.phase = "intro";
    this.phaseTime = 0;
  }

  private beginPlay(): void {
    this.phase = "play";
    this.phaseTime = 0;
    this.playTime = 0;
    this.tickAcc = 0;
  }

  private shake(mag: number, time: number): void {
    this.shakeMag = mag;
    this.shakeTime = time;
  }

  private resolve(result: "clear" | "fail"): void {
    this.lastResult = result;
    if (result === "clear") {
      this.score += this.isBossRound ? 3 : 1;
      this.clears += 1;
      this.combo += 1;
      if (this.combo > this.bestCombo) this.bestCombo = this.combo;
      sfx.good();
      if (this.combo >= 2) sfx.combo(this.combo);
      this.particles.confetti(LOGICAL_W, this.isBossRound ? 90 : 50);
      if (this.clears % LEVEL_EVERY === 0) {
        this.level += 1;
        this.levelUps += 1;
        this.pendingLevelUp = true;
        if (this.levelUps % BOSS_EVERY === 0) this.bossPending = true;
      }
    } else {
      this.lives -= 1;
      this.combo = 0;
      sfx.bad();
      this.shake(9, 0.3);
    }
    this.phase = "result";
    this.phaseTime = 0;
  }

  update(dt: number): void {
    dt = Math.min(dt, 0.05);
    this.phaseTime += dt;
    if (this.shakeTime > 0) this.shakeTime -= dt;
    this.particles.update(dt);

    switch (this.phase) {
      case "intro":
        if (this.phaseTime >= this.introTime) this.beginPlay();
        break;
      case "play": {
        this.playTime += dt;
        this.current?.update(dt);
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
            setMusicLevel(this.level);
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

    ctx.save();
    if (this.shakeTime > 0) {
      const k = this.shakeMag * (this.shakeTime > 0 ? this.shakeTime : 0);
      ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
    }

    if (this.phase === "levelup") {
      this.renderLevelUp(ctx);
      ctx.restore();
      return;
    }

    this.current?.render(ctx);
    this.particles.render(ctx);
    this.renderHud(ctx);

    if (this.phase === "intro") this.renderCommand(ctx);
    if (this.phase === "result") this.renderStamp(ctx);
    ctx.restore();
  }

  private renderHud(ctx: CanvasRenderingContext2D): void {
    const hx = 16;
    const hy = 20;
    for (let i = 0; i < START_LIVES; i++) {
      drawHeart(ctx, hx + i * 26, hy, 9, i < this.lives);
    }
    centerText(ctx, String(this.score), LOGICAL_W - 30, hy, "900 26px sans-serif", PALETTE.accent2, {
      color: "rgba(0,0,0,0.5)",
      width: 4,
    });
    ctx.textAlign = "right";
    ctx.font = "700 11px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Lv." + this.level, LOGICAL_W - 16, hy + 22);

    if (this.combo >= 2) {
      centerText(
        ctx,
        `${this.combo} コンボ!`,
        LOGICAL_W / 2,
        24,
        "900 18px sans-serif",
        PALETTE.accent,
        { color: "#fff", width: 3 }
      );
    }

    if (this.phase === "play") {
      const frac = clamp((this.curDur - this.playTime) / this.curDur, 0, 1);
      const barW = LOGICAL_W - 32;
      const bx = 16;
      const by = 40;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      roundRect(ctx, bx, by, barW, 6, 3);
      ctx.fill();
      ctx.fillStyle = this.isBossRound ? PALETTE.accent : frac < 0.3 ? PALETTE.bad : PALETTE.accent2;
      roundRect(ctx, bx, by, barW * frac, 6, 3);
      ctx.fill();
    }
  }

  private renderCommand(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = this.isBossRound ? "rgba(60,10,20,0.6)" : "rgba(27,16,48,0.55)";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    if (this.isBossRound) {
      centerText(ctx, "⚠ BOSS ⚠", LOGICAL_W / 2, LOGICAL_H / 2 - 70, "900 30px sans-serif", PALETTE.bad, {
        color: "#fff",
        width: 4,
      });
    }
    const cmd = this.current?.command ?? "";
    const t = clamp(this.phaseTime / 0.18, 0, 1);
    const pop = 0.7 + t * 0.3;
    const baseFont = this.isBossRound ? 40 : 46;
    ctx.font = `900 ${baseFont}px sans-serif`;
    const textW = ctx.measureText(cmd).width;
    const fit = Math.min(1, (LOGICAL_W - 36) / textW);
    ctx.translate(LOGICAL_W / 2, LOGICAL_H / 2);
    ctx.scale(pop, pop);
    ctx.rotate(-0.05);
    centerText(ctx, cmd, 0, 0, `900 ${baseFont * fit}px sans-serif`, PALETTE.accent2, {
      color: PALETTE.ink,
      width: 8 * fit,
    });
    ctx.restore();
  }

  private renderStamp(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const ok = this.lastResult === "clear";
    const t = clamp(this.phaseTime / 0.14, 0, 1);
    const scale = 1.4 - t * 0.4;
    let label = ok ? "クリア！" : "ミス！";
    // コンボが乗ってきたら褒め言葉でテンションを上げる
    if (ok && this.combo >= 8) label = "スゴイ！";
    else if (ok && this.combo >= 5) label = "ナイス！";
    ctx.translate(LOGICAL_W / 2, LOGICAL_H / 2);
    ctx.scale(scale, scale);
    ctx.rotate(ok ? -0.12 : 0.12);
    centerText(ctx, label, 0, 0, "900 52px sans-serif", ok ? PALETTE.good : PALETTE.bad, {
      color: PALETTE.white,
      width: 8,
    });
    ctx.restore();
  }

  private renderLevelUp(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.save();
    ctx.translate(LOGICAL_W / 2, LOGICAL_H / 2);
    ctx.rotate(-0.3);
    for (let i = -12; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(233,64,120,0.25)" : "rgba(255,214,61,0.12)";
      ctx.fillRect(-400, i * 40, 800, 20);
    }
    ctx.restore();
    const t = clamp(this.phaseTime / 0.2, 0, 1);
    const nextBoss = this.bossPending;
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
      nextBoss ? "つぎは ボス！" : "Lv." + this.level,
      LOGICAL_W / 2,
      LOGICAL_H / 2 + 40,
      "900 30px sans-serif",
      nextBoss ? PALETTE.bad : PALETTE.white
    );
  }

  debugState(): {
    phase: Phase;
    lives: number;
    score: number;
    level: number;
    combo: number;
    boss: boolean;
  } {
    return {
      phase: this.phase,
      lives: this.lives,
      score: this.score,
      level: this.level,
      combo: this.combo,
      boss: this.isBossRound,
    };
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
