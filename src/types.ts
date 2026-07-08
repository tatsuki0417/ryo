export type FilterId =
  | "none"
  | "kirakira"
  | "pink"
  | "cafe"
  | "clear"
  | "film"
  | "mono";

export type TextPresetId =
  | "pop"
  | "cute"
  | "handwrite"
  | "minimal"
  | "price"
  | "neon";

/** 読み込んだ動画クリップ 1 本。トリミングとフィルターを持つ。 */
export interface Clip {
  id: string;
  name: string;
  /** blob URL（object URL） */
  src: string;
  /** 元動画の長さ（秒） */
  duration: number;
  /** トリミング開始（秒、元動画基準） */
  trimStart: number;
  /** トリミング終了（秒、元動画基準） */
  trimEnd: number;
  filter: FilterId;
}

/** 画面に重ねる字幕テロップ。位置はプレビュー比率 0..1。 */
export interface TextClip {
  id: string;
  text: string;
  preset: TextPresetId;
  /** 中心 X（0=左, 1=右） */
  x: number;
  /** 中心 Y（0=上, 1=下） */
  y: number;
  /** タイムライン上の表示開始（秒） */
  start: number;
  /** タイムライン上の表示終了（秒） */
  end: number;
  /** 文字サイズ倍率 */
  scale: number;
}

export interface Bgm {
  id: string;
  name: string;
  src: string;
  /** 0..1 */
  volume: number;
}

export interface Project {
  clips: Clip[];
  texts: TextClip[];
  bgm: Bgm | null;
}

/** クリップのトリミング後の長さ（秒）。 */
export function clipLength(clip: Clip): number {
  return Math.max(0, clip.trimEnd - clip.trimStart);
}

/** タイムライン全体の長さ（秒）。 */
export function totalLength(clips: Clip[]): number {
  return clips.reduce((sum, c) => sum + clipLength(c), 0);
}
