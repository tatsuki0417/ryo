interface Props {
  /** 表示サイズ(px) */
  size?: number;
  /** 体の色 */
  color?: string;
  className?: string;
}

// タイトル等に出すマスコットキャラ（ゲーム中のキャラと同じ顔）。
export default function Mascot({ size = 96, color = "#ffd63d", className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="マスコット"
    >
      <circle cx="50" cy="52" r="40" fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth="4" />
      {/* ほっぺ */}
      <circle cx="32" cy="60" r="7" fill="rgba(255,120,150,0.55)" />
      <circle cx="68" cy="60" r="7" fill="rgba(255,120,150,0.55)" />
      {/* 目 */}
      <circle cx="37" cy="46" r="9" fill="#fff" />
      <circle cx="63" cy="46" r="9" fill="#fff" />
      <circle cx="39" cy="47" r="4.5" fill="#1b1030" />
      <circle cx="65" cy="47" r="4.5" fill="#1b1030" />
      {/* 口 */}
      <path
        d="M40 62 Q50 72 60 62"
        fill="none"
        stroke="#1b1030"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
