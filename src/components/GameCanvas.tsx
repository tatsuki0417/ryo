import { useEffect, useRef } from "react";
import { GameEngine } from "../engine/GameEngine";
import { InputManager } from "../engine/InputManager";
import { MICROGAMES } from "../microgames";
import { computeViewport } from "../engine/util";

interface Props {
  onGameOver: (score: number) => void;
}

export default function GameCanvas({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overRef = useRef(onGameOver);
  overRef.current = onGameOver;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let vp = computeViewport(1, 1);

    const engine = new GameEngine(MICROGAMES, {
      onGameOver: (score) => overRef.current(score),
    });
    // 自動テスト用にエンジンを公開
    (window as unknown as { __engine?: GameEngine }).__engine = engine;

    const input = new InputManager(canvas);
    input.onEvent((e) => engine.handleInput(e));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      vp = computeViewport(rect.width, rect.height);
      input.setViewport(vp);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    engine.start();

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      engine.update(dt);
      // 論理座標 → デバイス座標（レターボックス考慮）
      ctx.setTransform(
        vp.scale * dpr,
        0,
        0,
        vp.scale * dpr,
        vp.offsetX * dpr,
        vp.offsetY * dpr
      );
      engine.render(ctx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      input.destroy();
      delete (window as unknown as { __engine?: GameEngine }).__engine;
    };
  }, []);

  return <canvas ref={canvasRef} className="game-canvas" />;
}
