import { useRef } from "react";
import type { EditorApi } from "../useEditor";
import { BGM_TRACKS, FILTERS, TEXT_PRESETS, textPreset } from "../presets";
import { fmt } from "../format";
import type { TextPresetId } from "../types";

export type Tab = "trim" | "text" | "filter" | "bgm";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "trim", label: "カット", icon: "✂️" },
  { id: "text", label: "テロップ", icon: "🅣" },
  { id: "filter", label: "フィルター", icon: "🎨" },
  { id: "bgm", label: "音楽", icon: "🎵" },
];

interface PanelsProps {
  api: EditorApi;
  tab: Tab;
  onTab: (t: Tab) => void;
  selectedClipId: string | null;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
}

export function Panels({
  api,
  tab,
  onTab,
  selectedClipId,
  selectedTextId,
  onSelectText,
}: PanelsProps) {
  return (
    <div className="panels">
      <div className="panel-body">
        {tab === "trim" && <TrimPanel api={api} selectedClipId={selectedClipId} />}
        {tab === "text" && (
          <TextPanel
            api={api}
            selectedTextId={selectedTextId}
            onSelectText={onSelectText}
          />
        )}
        {tab === "filter" && <FilterPanel api={api} selectedClipId={selectedClipId} />}
        {tab === "bgm" && <BgmPanel api={api} />}
      </div>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"tabbar__btn" + (t.id === tab ? " tabbar__btn--on" : "")}
            onClick={() => onTab(t.id)}
          >
            <span className="tabbar__icon">{t.icon}</span>
            <span className="tabbar__label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ---------------- カット / トリミング ---------------- */
function TrimPanel({
  api,
  selectedClipId,
}: {
  api: EditorApi;
  selectedClipId: string | null;
}) {
  const clip =
    api.project.clips.find((c) => c.id === selectedClipId) ??
    api.located.clip ??
    null;

  if (!clip) {
    return <Hint>下のタイムラインでクリップを選ぶと、いらない部分をカットできます。</Hint>;
  }

  return (
    <div className="panel">
      <div className="panel__title">✂️ {clip.name} をカット</div>
      <Slider
        label="開始"
        value={clip.trimStart}
        min={0}
        max={clip.duration}
        step={0.1}
        display={fmt(clip.trimStart)}
        onChange={(v) =>
          api.updateClip(clip.id, {
            trimStart: Math.min(v, clip.trimEnd - 0.2),
          })
        }
      />
      <Slider
        label="終了"
        value={clip.trimEnd}
        min={0}
        max={clip.duration}
        step={0.1}
        display={fmt(clip.trimEnd)}
        onChange={(v) =>
          api.updateClip(clip.id, {
            trimEnd: Math.max(v, clip.trimStart + 0.2),
          })
        }
      />
      <div className="row">
        <button className="btn" onClick={() => api.moveClip(clip.id, -1)}>
          ◀ 前へ
        </button>
        <button className="btn" onClick={() => api.moveClip(clip.id, 1)}>
          後へ ▶
        </button>
        <button className="btn btn--danger" onClick={() => api.removeClip(clip.id)}>
          削除
        </button>
      </div>
    </div>
  );
}

/* ---------------- テロップ ---------------- */
function TextPanel({
  api,
  selectedTextId,
  onSelectText,
}: {
  api: EditorApi;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
}) {
  const selected = api.project.texts.find((t) => t.id === selectedTextId) ?? null;

  const add = (preset: TextPresetId) => {
    const id = api.addText(preset);
    onSelectText(id);
  };

  return (
    <div className="panel">
      <div className="panel__title">🅣 テロップを追加</div>
      <div className="preset-scroll">
        {TEXT_PRESETS.map((p) => (
          <button key={p.id} className="text-preset" onClick={() => add(p.id)}>
            <span style={{ ...p.style, fontSize: 13, display: "inline-block" }}>
              {p.sample}
            </span>
            <span className="text-preset__name">{p.label}</span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="panel__sub">
          <input
            className="text-input"
            value={selected.text}
            placeholder="文字を入力"
            onChange={(e) => api.updateText(selected.id, { text: e.target.value })}
          />
          <Slider
            label="大きさ"
            value={selected.scale}
            min={0.5}
            max={2.5}
            step={0.05}
            display={`${selected.scale.toFixed(2)}x`}
            onChange={(v) => api.updateText(selected.id, { scale: v })}
          />
          <Slider
            label="表示開始"
            value={selected.start}
            min={0}
            max={api.total}
            step={0.1}
            display={fmt(selected.start)}
            onChange={(v) =>
              api.updateText(selected.id, {
                start: Math.min(v, selected.end - 0.2),
              })
            }
          />
          <Slider
            label="表示終了"
            value={selected.end}
            min={0}
            max={api.total}
            step={0.1}
            display={fmt(selected.end)}
            onChange={(v) =>
              api.updateText(selected.id, {
                end: Math.max(v, selected.start + 0.2),
              })
            }
          />
          <div className="row">
            <span className="preset-name">
              スタイル: {textPreset(selected.preset).label}
            </span>
            <button
              className="btn btn--danger"
              onClick={() => {
                api.removeText(selected.id);
                onSelectText(null);
              }}
            >
              削除
            </button>
          </div>
        </div>
      ) : (
        <Hint>スタイルを選ぶと文字が追加されます。プレビュー上でドラッグして移動できます。</Hint>
      )}
    </div>
  );
}

/* ---------------- フィルター ---------------- */
function FilterPanel({
  api,
  selectedClipId,
}: {
  api: EditorApi;
  selectedClipId: string | null;
}) {
  const clip =
    api.project.clips.find((c) => c.id === selectedClipId) ??
    api.located.clip ??
    null;

  if (!clip) return <Hint>クリップを選ぶと色味フィルターを変えられます。</Hint>;

  return (
    <div className="panel">
      <div className="panel__title">🎨 {clip.name} の色味</div>
      <div className="filter-grid">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={
              "filter-chip" + (clip.filter === f.id ? " filter-chip--on" : "")
            }
            onClick={() => api.setClipFilter(clip.id, f.id)}
          >
            <span className="filter-chip__swatch" style={{ background: f.swatch }} />
            <span className="filter-chip__label">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- BGM ---------------- */
function BgmPanel({ api }: { api: EditorApi }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const bgm = api.project.bgm;

  return (
    <div className="panel">
      <div className="panel__title">🎵 BGM</div>
      <div className="preset-scroll">
        {BGM_TRACKS.map((t) => (
          <button
            key={t.id}
            className="bgm-track"
            onClick={() => fileRef.current?.click()}
          >
            <span className="bgm-track__name">{t.name}</span>
            <span className="bgm-track__mood">{t.mood}</span>
          </button>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          api.setBgm({
            id: `${Date.now()}`,
            name: file.name,
            src: URL.createObjectURL(file),
            volume: 0.8,
          });
        }}
      />

      <button className="btn btn--primary block" onClick={() => fileRef.current?.click()}>
        端末から音源を追加
      </button>

      {bgm ? (
        <div className="panel__sub">
          <div className="bgm-current">♪ {bgm.name}</div>
          <Slider
            label="音量"
            value={bgm.volume}
            min={0}
            max={1}
            step={0.05}
            display={`${Math.round(bgm.volume * 100)}%`}
            onChange={(v) => api.setBgm({ ...bgm, volume: v })}
          />
          <button className="btn btn--danger" onClick={() => api.setBgm(null)}>
            BGMを外す
          </button>
        </div>
      ) : (
        <Hint>
          プリセット名は雰囲気の目安です。お好みの音源ファイルを選ぶとBGMになります（著作権にご注意）。
        </Hint>
      )}
    </div>
  );
}

/* ---------------- 共通パーツ ---------------- */
function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="slider">
      <span className="slider__label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider__val">{display}</span>
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="hint">{children}</p>;
}
