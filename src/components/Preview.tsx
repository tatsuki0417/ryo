import { useRef } from "react";
import type { EditorApi } from "../useEditor";
import { filterCss, textPreset } from "../presets";

interface Props {
  api: EditorApi;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
}

export function Preview({ api, selectedTextId, onSelectText }: Props) {
  const { project, currentTime, located, videoRef, toggle, playing } = api;
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string } | null>(null);

  const activeFilter = located.clip ? filterCss(located.clip.filter) : "none";
  const visibleTexts = project.texts.filter(
    (t) => currentTime >= t.start && currentTime <= t.end,
  );

  const onPointerDownText = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    onSelectText(id);
    dragRef.current = { id };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    api.updateText(dragRef.current.id, {
      x: Math.max(0.02, Math.min(0.98, x)),
      y: Math.max(0.04, Math.min(0.96, y)),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="preview">
      <div
        className="preview__frame"
        ref={boxRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => onSelectText(null)}
      >
        {project.clips.length === 0 ? (
          <div className="preview__empty">
            <span className="preview__empty-emoji">🎬</span>
            動画を読み込んでね
          </div>
        ) : (
          <video
            ref={videoRef}
            className="preview__video"
            style={{ filter: activeFilter }}
            playsInline
            muted={false}
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          />
        )}

        {visibleTexts.map((t) => {
          const p = textPreset(t.preset);
          return (
            <div
              key={t.id}
              className={
                "overlay-text" +
                (t.id === selectedTextId ? " overlay-text--sel" : "")
              }
              style={{
                left: `${t.x * 100}%`,
                top: `${t.y * 100}%`,
                fontSize: `${t.scale * 5.2}vw`,
                ...p.style,
              }}
              onPointerDown={(e) => onPointerDownText(e, t.id)}
            >
              {t.text || " "}
            </div>
          );
        })}

        {project.clips.length > 0 && !playing && (
          <button
            className="preview__play"
            onClick={(e) => {
              e.stopPropagation();
              api.play();
            }}
            aria-label="再生"
          >
            ▶
          </button>
        )}

        <div className="preview__badge">9:16</div>
      </div>
    </div>
  );
}
