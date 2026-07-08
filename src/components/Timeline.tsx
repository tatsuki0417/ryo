import { useRef } from "react";
import type { EditorApi } from "../useEditor";
import { clipLength } from "../types";
import { fmt } from "../format";

interface Props {
  api: EditorApi;
  selectedClipId: string | null;
  onSelectClip: (id: string) => void;
}

export function Timeline({ api, selectedClipId, onSelectClip }: Props) {
  const { project, total, currentTime, seek, toggle, playing } = api;
  const trackRef = useRef<HTMLDivElement | null>(null);

  const seekFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el || total === 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    seek(Math.max(0, Math.min(1, ratio)) * total);
  };

  const playheadPct = total > 0 ? (currentTime / total) * 100 : 0;

  return (
    <div className="timeline">
      <div className="timeline__head">
        <button className="transport" onClick={toggle} aria-label="再生/停止">
          {playing ? "⏸" : "▶"}
        </button>
        <span className="timeline__time">
          {fmt(currentTime)} <span className="timeline__total">/ {fmt(total)}</span>
        </span>
      </div>

      <div
        className="timeline__track"
        ref={trackRef}
        onPointerDown={(e) => seekFromEvent(e.clientX)}
      >
        {project.clips.length === 0 && (
          <div className="timeline__placeholder">クリップがここに並びます</div>
        )}
        {project.clips.map((c) => {
          const w = total > 0 ? (clipLength(c) / total) * 100 : 0;
          return (
            <button
              key={c.id}
              className={
                "clip-block" +
                (c.id === selectedClipId ? " clip-block--sel" : "")
              }
              style={{ width: `${w}%` }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSelectClip(c.id)}
            >
              <span className="clip-block__name">{c.name}</span>
              <span className="clip-block__len">{fmt(clipLength(c))}</span>
            </button>
          );
        })}

        {project.texts.length > 0 && (
          <div className="timeline__texttrack">
            {project.texts.map((t) => {
              const left = total > 0 ? (t.start / total) * 100 : 0;
              const w = total > 0 ? ((t.end - t.start) / total) * 100 : 0;
              return (
                <div
                  key={t.id}
                  className="text-chip"
                  style={{ left: `${left}%`, width: `${w}%` }}
                  title={t.text}
                >
                  T
                </div>
              );
            })}
          </div>
        )}

        {total > 0 && (
          <div className="timeline__playhead" style={{ left: `${playheadPct}%` }} />
        )}
      </div>
    </div>
  );
}
