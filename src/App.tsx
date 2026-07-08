import { useRef, useState } from "react";
import { useEditor } from "./useEditor";
import { Preview } from "./components/Preview";
import { Timeline } from "./components/Timeline";
import { Panels, type Tab } from "./components/Panels";
import { exportProject } from "./exporter";

export default function App() {
  const api = useEditor();
  const [tab, setTab] = useState<Tab>("trim");
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const importRef = useRef<HTMLInputElement | null>(null);

  const hasClips = api.project.clips.length > 0;

  const onImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await api.addClips(files);
  };

  const runExport = async () => {
    if (!hasClips || exporting) return;
    api.pause();
    setExporting(true);
    setProgress(0);
    try {
      const blob = await exportProject(api.project, setProgress);
      const url = URL.createObjectURL(blob);
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const a = document.createElement("a");
      a.href = url;
      a.download = `kirakira-cut.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      alert("書き出しに失敗しました: " + (err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__logo">🎬</span>
          <span className="topbar__name">キラキラCut</span>
        </div>
        <div className="topbar__actions">
          <button className="btn btn--ghost" onClick={() => importRef.current?.click()}>
            ＋素材
          </button>
          <button
            className="btn btn--primary"
            onClick={runExport}
            disabled={!hasClips || exporting}
          >
            {exporting ? `書き出し中 ${Math.round(progress * 100)}%` : "書き出し"}
          </button>
        </div>
      </header>

      <input
        ref={importRef}
        type="file"
        accept="video/*"
        multiple
        hidden
        onChange={(e) => onImport(e.target.files)}
      />

      <main className="stage">
        {!hasClips ? (
          <Welcome onPick={() => importRef.current?.click()} />
        ) : (
          <Preview
            api={api}
            selectedTextId={selectedTextId}
            onSelectText={setSelectedTextId}
          />
        )}
      </main>

      <Timeline
        api={api}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
      />

      <Panels
        api={api}
        tab={tab}
        onTab={setTab}
        selectedClipId={selectedClipId}
        selectedTextId={selectedTextId}
        onSelectText={setSelectedTextId}
      />

      {/* BGM 再生用（プレビュー同期） */}
      {api.project.bgm && (
        <audio
          ref={api.audioRef}
          src={api.project.bgm.src}
          loop
          hidden
        />
      )}

      {exporting && (
        <div className="export-overlay">
          <div className="export-card">
            <div className="export-spin">🎬</div>
            <div className="export-title">動画を書き出し中…</div>
            <div className="export-bar">
              <div className="export-bar__fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="export-note">プレビューを最後まで再生して録画しています</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Welcome({ onPick }: { onPick: () => void }) {
  return (
    <div className="welcome">
      <div className="welcome__emoji">📱✨</div>
      <h1 className="welcome__title">キラキラCut</h1>
      <p className="welcome__sub">
        TikTok用の縦型動画を、スマホでかんたん編集。
        <br />
        女子Vlog・買い物紹介にぴったり🎀
      </p>
      <button className="btn btn--primary btn--big" onClick={onPick}>
        動画を選んではじめる
      </button>
      <ul className="welcome__feats">
        <li>✂️ いらない部分をカット</li>
        <li>🅣 かわいいテロップ</li>
        <li>🎨 映える色味フィルター</li>
        <li>🎵 BGMを追加</li>
      </ul>
    </div>
  );
}
