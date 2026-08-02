// かわいいどうぶつキャラたち。キャンバスに直接えがく（アセット不要）。
// プレイヤーの分身・タイトルのマスコット・きせかえ画面のどれにも使う。
// 小さいサイズ（r=18〜24）でも読めるよう、耳・くちばし・鼻などの特徴を大きめに。

export interface DrawOpts {
  /** false でこまり顔（ピンチ演出用）。省略時はにこにこ */
  happy?: boolean;
  /** -1..1 目線の左右 */
  look?: number;
}

export interface AnimalCharacter {
  id: string;
  /** 日本語の名前 */
  name: string;
  /** 代表色（UIのふち・強調に使う） */
  color: string;
  /** アンロックに必要なコイン（るいけい）。0は最初から使える */
  cost: number;
  /** x,y を中心に、体の半径 r で描画 */
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, opts?: DrawOpts): void;
}

const INK = "#2a2140";

// --- 共通パーツ ---------------------------------------------------------

function bodyCircle(ctx: CanvasRenderingContext2D, r: number, color: string): void {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.stroke();
}

function blush(ctx: CanvasRenderingContext2D, r: number, y = r * 0.26): void {
  ctx.fillStyle = "rgba(255,120,150,0.5)";
  ctx.beginPath();
  ctx.arc(-r * 0.52, y, r * 0.15, 0, Math.PI * 2);
  ctx.arc(r * 0.52, y, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

// つぶらな目（白目＋黒目＋ハイライト）
function eyes(ctx: CanvasRenderingContext2D, r: number, opts: DrawOpts, ey = -r * 0.06): void {
  const look = opts.look ?? 0;
  const ex = r * 0.36;
  for (const sx of [-1, 1]) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(sx * ex, ey, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    const px = sx * ex + look * r * 0.08;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(px, ey + r * 0.03, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(px - r * 0.04, ey - r * 0.03, r * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 黒い点目（ぱんだ/ひよこ/かえる用のシンプルな目）
function dotEyes(ctx: CanvasRenderingContext2D, r: number, opts: DrawOpts, ex = r * 0.34, ey = -r * 0.05): void {
  const look = opts.look ?? 0;
  for (const sx of [-1, 1]) {
    const px = sx * ex + look * r * 0.06;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(px, ey, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(px - r * 0.05, ey - r * 0.05, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
}

function smile(ctx: CanvasRenderingContext2D, r: number, opts: DrawOpts, y = r * 0.32): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.lineCap = "round";
  ctx.beginPath();
  if (opts.happy === false) ctx.arc(0, y + r * 0.16, r * 0.2, Math.PI, Math.PI * 2);
  else ctx.arc(0, y, r * 0.2, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();
}

function withCenter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fn: () => void
): void {
  ctx.save();
  ctx.translate(x, y);
  fn();
  ctx.restore();
}

// --- どうぶつたち -------------------------------------------------------

const neko: AnimalCharacter = {
  id: "neko",
  name: "ねこ",
  color: "#ffb74d",
  cost: 0,
  draw(ctx, x, y, r, opts = {}) {
    withCenter(ctx, x, y, () => {
      // とがった耳
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#ffb74d";
        ctx.beginPath();
        ctx.moveTo(s * r * 0.42, -r * 0.78);
        ctx.lineTo(s * r * 0.86, -r * 0.28);
        ctx.lineTo(s * r * 0.2, -r * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ff9db0";
        ctx.beginPath();
        ctx.moveTo(s * r * 0.46, -r * 0.62);
        ctx.lineTo(s * r * 0.68, -r * 0.34);
        ctx.lineTo(s * r * 0.34, -r * 0.42);
        ctx.closePath();
        ctx.fill();
      }
      bodyCircle(ctx, r, "#ffb74d");
      blush(ctx, r);
      eyes(ctx, r, opts);
      // 鼻
      ctx.fillStyle = "#e0607a";
      ctx.beginPath();
      ctx.moveTo(0, r * 0.18);
      ctx.lineTo(-r * 0.08, r * 0.1);
      ctx.lineTo(r * 0.08, r * 0.1);
      ctx.closePath();
      ctx.fill();
      // ひげ
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = Math.max(1, r * 0.03);
      for (const s of [-1, 1]) {
        for (const dy of [-0.02, 0.08]) {
          ctx.beginPath();
          ctx.moveTo(s * r * 0.2, r * (0.12 + dy));
          ctx.lineTo(s * r * 0.7, r * (0.06 + dy));
          ctx.stroke();
        }
      }
      smile(ctx, r, opts, r * 0.32);
    });
  },
};

const inu: AnimalCharacter = {
  id: "inu",
  name: "いぬ",
  color: "#d3a06a",
  cost: 0,
  draw(ctx, x, y, r, opts = {}) {
    withCenter(ctx, x, y, () => {
      // たれ耳
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#8a5a34";
        ctx.beginPath();
        ctx.ellipse(s * r * 0.78, -r * 0.2, r * 0.26, r * 0.5, s * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      bodyCircle(ctx, r, "#d3a06a");
      blush(ctx, r);
      eyes(ctx, r, opts);
      // 口まわり（白いマズル）
      ctx.fillStyle = "#f4e2cb";
      ctx.beginPath();
      ctx.ellipse(0, r * 0.34, r * 0.36, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      // 鼻
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.18, r * 0.12, r * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      smile(ctx, r, opts, r * 0.42);
    });
  },
};

const usagi: AnimalCharacter = {
  id: "usagi",
  name: "うさぎ",
  color: "#f6eef2",
  cost: 15,
  draw(ctx, x, y, r, opts = {}) {
    withCenter(ctx, x, y, () => {
      // 長い耳
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#f6eef2";
        ctx.beginPath();
        ctx.ellipse(s * r * 0.34, -r * 1.05, r * 0.2, r * 0.6, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.stroke();
        ctx.fillStyle = "#ff9db0";
        ctx.beginPath();
        ctx.ellipse(s * r * 0.34, -r * 1.0, r * 0.09, r * 0.42, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      bodyCircle(ctx, r, "#f6eef2");
      blush(ctx, r);
      eyes(ctx, r, opts);
      // 鼻＋口
      ctx.fillStyle = "#e0607a";
      ctx.beginPath();
      ctx.arc(0, r * 0.18, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
      smile(ctx, r, opts, r * 0.34);
    });
  },
};

const kuma: AnimalCharacter = {
  id: "kuma",
  name: "くま",
  color: "#b07a4b",
  cost: 60,
  draw(ctx, x, y, r, opts = {}) {
    withCenter(ctx, x, y, () => {
      // まるい耳
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#b07a4b";
        ctx.beginPath();
        ctx.arc(s * r * 0.66, -r * 0.68, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#e6c39a";
        ctx.beginPath();
        ctx.arc(s * r * 0.66, -r * 0.68, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      bodyCircle(ctx, r, "#b07a4b");
      blush(ctx, r);
      eyes(ctx, r, opts);
      // マズル
      ctx.fillStyle = "#e6c39a";
      ctx.beginPath();
      ctx.ellipse(0, r * 0.36, r * 0.34, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.22, r * 0.1, r * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      smile(ctx, r, opts, r * 0.44);
    });
  },
};

const panda: AnimalCharacter = {
  id: "panda",
  name: "ぱんだ",
  color: "#f4f4f4",
  cost: 140,
  draw(ctx, x, y, r, opts = {}) {
    withCenter(ctx, x, y, () => {
      // 黒いまるい耳
      for (const s of [-1, 1]) {
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(s * r * 0.66, -r * 0.66, r * 0.26, 0, Math.PI * 2);
        ctx.fill();
      }
      bodyCircle(ctx, r, "#f4f4f4");
      // 目のまわりの黒パッチ
      for (const s of [-1, 1]) {
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.ellipse(s * r * 0.36, -r * 0.04, r * 0.2, r * 0.26, s * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      blush(ctx, r, r * 0.32);
      dotEyes(ctx, r, opts, r * 0.36, -r * 0.05);
      // 鼻
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.24, r * 0.1, r * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      smile(ctx, r, opts, r * 0.42);
    });
  },
};

const penguin: AnimalCharacter = {
  id: "penguin",
  name: "ぺんぎん",
  color: "#38507a",
  cost: 95,
  draw(ctx, x, y, r, opts = {}) {
    withCenter(ctx, x, y, () => {
      // ひれ
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#2b3d5e";
        ctx.beginPath();
        ctx.ellipse(s * r * 0.92, r * 0.1, r * 0.16, r * 0.44, s * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      bodyCircle(ctx, r, "#38507a");
      // 白いおなか＋顔
      ctx.fillStyle = "#fbfbff";
      ctx.beginPath();
      ctx.ellipse(0, r * 0.12, r * 0.62, r * 0.74, 0, 0, Math.PI * 2);
      ctx.fill();
      eyes(ctx, r, opts, -r * 0.12);
      // くちばし
      ctx.fillStyle = "#ffb028";
      ctx.beginPath();
      ctx.moveTo(-r * 0.16, r * 0.12);
      ctx.lineTo(r * 0.16, r * 0.12);
      ctx.lineTo(0, r * 0.32);
      ctx.closePath();
      ctx.fill();
      blush(ctx, r, r * 0.18);
    });
  },
};

const kaeru: AnimalCharacter = {
  id: "kaeru",
  name: "かえる",
  color: "#7bd93a",
  cost: 35,
  draw(ctx, x, y, r, opts = {}) {
    withCenter(ctx, x, y, () => {
      bodyCircle(ctx, r, "#7bd93a");
      // 頭の上のとび出た目
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#7bd93a";
        ctx.beginPath();
        ctx.arc(s * r * 0.42, -r * 0.66, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = Math.max(2, r * 0.06);
        ctx.strokeStyle = "rgba(0,0,0,0.14)";
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s * r * 0.42, -r * 0.66, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        const look = opts.look ?? 0;
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(s * r * 0.42 + look * r * 0.05, -r * 0.62, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      blush(ctx, r, r * 0.16);
      // にっこり大きな口
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.lineCap = "round";
      ctx.beginPath();
      if (opts.happy === false) ctx.arc(0, r * 0.36, r * 0.36, Math.PI, Math.PI * 2);
      else ctx.arc(0, r * 0.06, r * 0.44, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      // 鼻あな
      ctx.fillStyle = INK;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s * r * 0.1, -r * 0.14, r * 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  },
};

const hiyoko: AnimalCharacter = {
  id: "hiyoko",
  name: "ひよこ",
  color: "#ffe14d",
  cost: 0,
  draw(ctx, x, y, r, opts = {}) {
    withCenter(ctx, x, y, () => {
      // あたまの毛
      ctx.strokeStyle = "#ffcf3d";
      ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.lineCap = "round";
      for (const dx of [-0.18, 0, 0.18]) {
        ctx.beginPath();
        ctx.moveTo(dx * r, -r * 0.9);
        ctx.lineTo(dx * r * 1.3, -r * 1.16);
        ctx.stroke();
      }
      // ちいさなつばさ
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#ffcf3d";
        ctx.beginPath();
        ctx.ellipse(s * r * 0.9, r * 0.18, r * 0.14, r * 0.3, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      bodyCircle(ctx, r, "#ffe14d");
      blush(ctx, r, r * 0.24);
      dotEyes(ctx, r, opts, r * 0.28, -r * 0.02);
      // くちばし
      ctx.fillStyle = "#ff9f28";
      ctx.beginPath();
      ctx.moveTo(-r * 0.14, r * 0.18);
      ctx.lineTo(r * 0.14, r * 0.18);
      ctx.lineTo(0, r * 0.36);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.14, r * 0.18);
      ctx.lineTo(r * 0.14, r * 0.18);
      ctx.lineTo(0, r * 0.04);
      ctx.closePath();
      ctx.fill();
    });
  },
};

// 全キャラの登録（この順で きせかえ画面に並ぶ）
export const CHARACTERS: AnimalCharacter[] = [
  neko,
  inu,
  hiyoko,
  usagi,
  kaeru,
  kuma,
  penguin,
  panda,
];

export const DEFAULT_CHARACTER_ID = "neko";

export function getCharacter(id: string): AnimalCharacter {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
