import { useEffect, useRef } from "react";
import { getCharacter } from "../engine/characters";
import { getSelectedCharacter } from "../engine/profile";

interface Props {
  /** 表示するキャラID。省略時はいま選んでいるキャラ */
  characterId?: string;
  /** 表示サイズ(px) */
  size?: number;
  className?: string;
}

// タイトル・ゲームオーバー・きせかえに出すマスコット。
// ゲーム中と同じ canvas 描画のどうぶつを、小さなキャンバスにスナップショットする。
export default function Mascot({ characterId, size = 96, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const character = characterId ? getCharacter(characterId) : getSelectedCharacter();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    // 耳やくちばしが切れないよう、体はやや小さめ＆すこし下に
    const r = size * 0.32;
    character.draw(ctx, size / 2, size * 0.56, r, {});
  }, [character, size]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label={character.name}
    />
  );
}
