// ===================================================================
// themes.js  ―  背景テーマの一覧
// -------------------------------------------------------------------
// 実際の見た目（背景の柄）は css/style.css の [data-theme="..."] で
// 定義しています。ここは「選べるテーマの名前」を並べるだけ。
// ★テーマを増やしたいときは、ここに1行足して、CSSに背景を書きます。
//   （限定テーマを課金アイテムにするのもここが起点になります）
// ===================================================================

export const THEMES = [
  { id: 'star',   label: '星空', premium: false },
  { id: 'brick',  label: 'レンガ', premium: false },
  { id: 'tile',   label: 'チェック', premium: false },
  { id: 'dot',    label: '水玉', premium: false },
  { id: 'sky',    label: '青空', premium: false },
  { id: 'note',   label: 'ノート', premium: false },
  { id: 'sakura', label: 'さくら', premium: false },
  { id: 'lame',   label: 'ラメ', premium: false },
  { id: 'matrix', label: 'マトリックス', premium: false },
  // 例：将来の課金テーマ（premium: true にして販売）
  // { id: 'galaxy', label: 'ギャラクシー✨', premium: true },
];

export function themeLabel(id) {
  const t = THEMES.find((x) => x.id === id);
  return t ? t.label : '星空';
}
