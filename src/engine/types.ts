// 論理座標系のサイズ（全ミニゲームはこの座標で描画する）
export const LOGICAL_W = 360;
export const LOGICAL_H = 640;

export type SwipeDir = "up" | "down" | "left" | "right";

export type InputEvent =
  | { type: "tap"; x: number; y: number }
  | { type: "swipe"; dir: SwipeDir; x: number; y: number };

export type GameStatus = "playing" | "cleared" | "failed";

// ミニゲームに渡す実行コンテキスト（難易度・効果音・乱数など）
export interface MicrogameApi {
  /** 論理幅 */
  readonly w: number;
  /** 論理高さ */
  readonly h: number;
  /** 難易度倍率（1.0〜）。レベルが上がるほど大きい */
  readonly speed: number;
  /** 本番の制限時間（秒） */
  readonly duration: number;
  /** [0,1) 乱数 */
  rand(): number;
  /** min以上max未満 */
  range(min: number, max: number): number;
  /** 効果音 */
  sfx: {
    tap(): void;
    good(): void;
    bad(): void;
  };
}

// 各ミニゲームが実装する共通ライフサイクル
export interface Microgame {
  /** 画面上部に出す指示（例: 「タップ！」） */
  readonly command: string;
  /** 制限時間切れの扱い。survive系は "clear" にする（デフォルト fail） */
  readonly timeoutResult?: "clear" | "fail";
  /** 現在の状態。ミニゲーム自身が cleared / failed に更新する */
  status: GameStatus;

  init(api: MicrogameApi): void;
  /** dt: 前フレームからの経過秒 */
  update(dt: number): void;
  /** 論理座標系でそのまま描画してよい */
  render(ctx: CanvasRenderingContext2D): void;
  onInput(e: InputEvent): void;
}

// 毎ラウンド新しいインスタンスを生成するためのファクトリ
export interface MicrogameDef {
  id: string;
  make(): Microgame;
}
