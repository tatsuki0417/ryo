import type { InputEvent, Microgame, MicrogameApi } from "../engine/types";
import { centerText, pick, shuffle } from "../engine/util";

interface Dot {
  x: number;
  y: number;
  r: number;
  colorId: number;
  got: boolean;
}

const COLORS = [
  { id: 0, name: "あか", css: "#ff5757" },
  { id: 1, name: "あお", css: "#4a90ff" },
  { id: 2, name: "きいろ", css: "#ffd63d" },
  { id: 3, name: "みどり", css: "#39d98a" },
];

// 判断/クイズ: 指示された色の玉だけをタップ！ 違う色を押すとミス。
export class JudgeColor implements Microgame {
  command = "あかだけタップ！";
  readonly timeoutResult = "fail" as const;
  status: "playing" | "cleared" | "failed" = "playing";

  private api!: MicrogameApi;
  private targetId = 0;
  private dots: Dot[] = [];

  init(api: MicrogameApi): void {
    this.api = api;
    const target = pick(COLORS);
    this.targetId = target.id;
    this.command = target.name + "だけタップ！";

    const n = 6;
    // ターゲット色を最低2個は入れる
    const ids: number[] = [target.id, target.id];
    for (let i = 2; i < n; i++) {
      ids.push(pick(COLORS).id);
    }
    const shuffled = shuffle(ids);

    // グリッド配置（2列×3行）に少しゆらぎ
    this.dots = [];
    const cols = 2;
    const rows = 3;
    const cellW = api.w / cols;
    const cellH = (api.h - 160) / rows;
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = cellW * c + cellW / 2 + api.range(-14, 14);
        const cy = 130 + cellH * r + cellH / 2 + api.range(-14, 14);
        this.dots.push({ x: cx, y: cy, r: 34, colorId: shuffled[i++], got: false });
      }
    }
  }

  update(): void {
    // 静止（判断ゲームなので動かさない）
  }

  onInput(e: InputEvent): void {
    if (this.status !== "playing" || e.type !== "tap") return;
    for (const d of this.dots) {
      if (d.got || Math.hypot(e.x - d.x, e.y - d.y) > d.r + 10) continue;
      if (d.colorId === this.targetId) {
        d.got = true;
        this.api.sfx.tap();
        if (this.dots.filter((x) => x.colorId === this.targetId).every((x) => x.got)) {
          this.status = "cleared";
        }
      } else {
        this.status = "failed"; // 違う色を押したら即ミス
      }
      return;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { w, h } = this.api;
    ctx.fillStyle = "#20142f";
    ctx.fillRect(0, 0, w, h);

    const target = COLORS[this.targetId];
    for (const d of this.dots) {
      if (d.got) continue;
      const col = COLORS[d.colorId];
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.fillStyle = col.css;
      ctx.beginPath();
      ctx.arc(0, 0, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.stroke();
      ctx.restore();
    }

    centerText(ctx, "「" + target.name + "」をぜんぶ", w / 2, 96, "800 20px sans-serif", target.css, {
      color: "rgba(0,0,0,0.5)",
      width: 4,
    });
  }
}
