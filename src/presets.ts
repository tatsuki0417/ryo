import type { FilterId, TextPresetId } from "./types";

export interface FilterPreset {
  id: FilterId;
  label: string;
  /** CSS filter 文字列（プレビュー・書き出し共通） */
  css: string;
  /** サムネのグラデ */
  swatch: string;
}

/** 女子Vlog・買い物紹介で映える色味プリセット。 */
export const FILTERS: FilterPreset[] = [
  { id: "none", label: "なし", css: "none", swatch: "#2a2733" },
  {
    id: "kirakira",
    label: "キラキラ",
    css: "brightness(1.12) contrast(1.02) saturate(1.15)",
    swatch: "linear-gradient(135deg,#fff6cf,#ffd0e8)",
  },
  {
    id: "pink",
    label: "ぴんく",
    css: "brightness(1.06) saturate(1.1) sepia(0.12) hue-rotate(-12deg)",
    swatch: "linear-gradient(135deg,#ffd6ec,#ff9ec9)",
  },
  {
    id: "cafe",
    label: "カフェ",
    css: "brightness(1.04) contrast(0.96) sepia(0.28) saturate(1.05)",
    swatch: "linear-gradient(135deg,#e8d3b0,#c9a37a)",
  },
  {
    id: "clear",
    label: "透明感",
    css: "brightness(1.1) contrast(0.94) saturate(0.92)",
    swatch: "linear-gradient(135deg,#eafaff,#dbe9ff)",
  },
  {
    id: "film",
    label: "フィルム",
    css: "contrast(1.1) saturate(0.85) sepia(0.18) brightness(0.98)",
    swatch: "linear-gradient(135deg,#d8c9b0,#8a8170)",
  },
  {
    id: "mono",
    label: "モノクロ",
    css: "grayscale(1) contrast(1.05)",
    swatch: "linear-gradient(135deg,#e7e7e7,#8a8a8a)",
  },
];

export function filterCss(id: FilterId): string {
  return FILTERS.find((f) => f.id === id)?.css ?? "none";
}

export interface TextPreset {
  id: TextPresetId;
  label: string;
  sample: string;
  /** インライン style として適用するプロパティ */
  style: React.CSSProperties;
}

export const TEXT_PRESETS: TextPreset[] = [
  {
    id: "pop",
    label: "ポップ",
    sample: "たのしい♡",
    style: {
      fontWeight: 800,
      color: "#fff",
      background: "#ff5fa2",
      padding: "6px 14px",
      borderRadius: "999px",
      boxShadow: "0 4px 0 #d63c82",
    },
  },
  {
    id: "cute",
    label: "ゆめかわ",
    sample: "おかいもの",
    style: {
      fontWeight: 700,
      color: "#ff6fb1",
      background: "rgba(255,255,255,0.92)",
      padding: "6px 14px",
      borderRadius: "14px",
      textShadow: "0 1px 0 #ffd7ea",
    },
  },
  {
    id: "handwrite",
    label: "手書き風",
    sample: "today vlog",
    style: {
      fontWeight: 600,
      fontStyle: "italic",
      color: "#fff",
      fontFamily: "'Comic Sans MS', 'Segoe Print', cursive",
      textShadow: "0 2px 8px rgba(0,0,0,0.45)",
    },
  },
  {
    id: "minimal",
    label: "シンプル",
    sample: "GET したもの",
    style: {
      fontWeight: 600,
      color: "#fff",
      letterSpacing: "0.04em",
      textShadow: "0 2px 10px rgba(0,0,0,0.5)",
    },
  },
  {
    id: "price",
    label: "値段タグ",
    sample: "¥1,980",
    style: {
      fontWeight: 900,
      color: "#222",
      background: "#ffe14d",
      padding: "6px 16px",
      borderRadius: "8px",
      transform: "rotate(-4deg)",
      boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
    },
  },
  {
    id: "neon",
    label: "ネオン",
    sample: "NEW IN",
    style: {
      fontWeight: 800,
      color: "#fff",
      letterSpacing: "0.08em",
      textShadow:
        "0 0 6px #ff5fa2, 0 0 14px #ff5fa2, 0 0 22px #a06bff",
    },
  },
];

export function textPreset(id: TextPresetId): TextPreset {
  return TEXT_PRESETS.find((p) => p.id === id) ?? TEXT_PRESETS[0];
}

/** ロイヤリティフリー相当の内蔵ダミーBGM（WebAudioで生成、著作権フリー）。 */
export interface BgmTrack {
  id: string;
  name: string;
  mood: string;
}

export const BGM_TRACKS: BgmTrack[] = [
  { id: "kawaii-pop", name: "かわいいポップ", mood: "明るい・Vlog向け" },
  { id: "chill-lofi", name: "おしゃれLo-Fi", mood: "カフェ・まったり" },
  { id: "shopping", name: "うきうきお買い物", mood: "紹介・テンポ良い" },
  { id: "dreamy", name: "ゆめかわ", mood: "ふわふわ・エモい" },
];
