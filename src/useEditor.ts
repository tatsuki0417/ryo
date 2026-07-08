import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clipLength,
  totalLength,
  type Bgm,
  type Clip,
  type FilterId,
  type Project,
  type TextClip,
  type TextPresetId,
} from "./types";

const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export interface Located {
  index: number;
  clip: Clip | null;
  /** 元動画基準のローカル時刻（秒） */
  localTime: number;
  /** クリップ開始のタイムライン時刻（秒） */
  clipStart: number;
}

/** タイムラインのグローバル時刻から、対象クリップとローカル時刻を求める。 */
export function locate(clips: Clip[], t: number): Located {
  let acc = 0;
  for (let i = 0; i < clips.length; i++) {
    const len = clipLength(clips[i]);
    if (t < acc + len || i === clips.length - 1) {
      return {
        index: i,
        clip: clips[i],
        localTime: clips[i].trimStart + Math.max(0, t - acc),
        clipStart: acc,
      };
    }
    acc += len;
  }
  return { index: -1, clip: null, localTime: 0, clipStart: 0 };
}

export function useEditor() {
  const [project, setProject] = useState<Project>({
    clips: [],
    texts: [],
    bgm: null,
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  // ループ内で最新値を読むための ref
  const projectRef = useRef(project);
  projectRef.current = project;

  const total = useMemo(() => totalLength(project.clips), [project.clips]);
  const located = useMemo(
    () => locate(project.clips, currentTime),
    [project.clips, currentTime],
  );
  const activeClipId = located.clip?.id ?? null;

  // アクティブなクリップが変わったら video の src を差し替えて頭出しする
  useEffect(() => {
    const video = videoRef.current;
    const clip = located.clip;
    if (!video || !clip) return;
    if (video.dataset.clipId !== clip.id) {
      video.dataset.clipId = clip.id;
      video.src = clip.src;
      const onReady = () => {
        video.currentTime = located.localTime;
        if (playing) void video.play();
      };
      video.addEventListener("loadeddata", onReady, { once: true });
      video.load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClipId]);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // 再生ループ：video の再生位置からグローバル時刻を更新し、クリップ末尾で次へ送る
  useEffect(() => {
    if (!playing) {
      stopLoop();
      videoRef.current?.pause();
      audioRef.current?.pause();
      return;
    }
    const video = videoRef.current;
    if (video) void video.play();
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = currentTimeRef.current;
      void audio.play().catch(() => {});
    }

    const tick = () => {
      const v = videoRef.current;
      const clips = projectRef.current.clips;
      if (!v || clips.length === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const loc = locate(clips, currentTimeRef.current);
      const clip = loc.clip;
      if (!clip) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (v.currentTime >= clip.trimEnd - 0.03) {
        // 現クリップ終了 → 次のクリップ or 全体終了
        const nextGlobal = loc.clipStart + clipLength(clip) + 0.001;
        const tot = totalLength(clips);
        if (nextGlobal >= tot) {
          setPlaying(false);
          setCurrentTime(tot);
          return;
        }
        setCurrentTime(nextGlobal);
      } else {
        setCurrentTime(loc.clipStart + (v.currentTime - clip.trimStart));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return stopLoop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // currentTime の最新値をループから参照するための ref
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const play = useCallback(() => {
    setCurrentTime((t) => (t >= total - 0.05 ? 0 : t));
    setPlaying(true);
  }, [total]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);

  const seek = useCallback(
    (t: number) => {
      const clamped = Math.max(0, Math.min(total, t));
      setCurrentTime(clamped);
      const loc = locate(projectRef.current.clips, clamped);
      const video = videoRef.current;
      if (video && loc.clip && video.dataset.clipId === loc.clip.id) {
        video.currentTime = loc.localTime;
      }
      if (audioRef.current) audioRef.current.currentTime = clamped;
    },
    [total],
  );

  // BGM の音量を反映
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = project.bgm?.volume ?? 1;
    }
  }, [project.bgm?.volume, project.bgm?.src]);

  // --- 素材操作 -----------------------------------------------------------

  const addClips = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    const loaded = await Promise.all(list.map(readVideoFile));
    setProject((p) => ({ ...p, clips: [...p.clips, ...loaded] }));
  }, []);

  const removeClip = useCallback((id: string) => {
    setProject((p) => {
      const target = p.clips.find((c) => c.id === id);
      if (target) URL.revokeObjectURL(target.src);
      return { ...p, clips: p.clips.filter((c) => c.id !== id) };
    });
    setCurrentTime(0);
    setPlaying(false);
  }, []);

  const updateClip = useCallback((id: string, patch: Partial<Clip>) => {
    setProject((p) => ({
      ...p,
      clips: p.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const moveClip = useCallback((id: string, dir: -1 | 1) => {
    setProject((p) => {
      const i = p.clips.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.clips.length) return p;
      const next = [...p.clips];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...p, clips: next };
    });
  }, []);

  const setClipFilter = useCallback(
    (id: string, filter: FilterId) => updateClip(id, { filter }),
    [updateClip],
  );

  const addText = useCallback(
    (preset: TextPresetId) => {
      const start = currentTimeRef.current;
      const t: TextClip = {
        id: uid(),
        text: "タップして編集",
        preset,
        x: 0.5,
        y: 0.75,
        start,
        end: Math.min(total, start + 3),
        scale: 1,
      };
      setProject((p) => ({ ...p, texts: [...p.texts, t] }));
      return t.id;
    },
    [total],
  );

  const updateText = useCallback((id: string, patch: Partial<TextClip>) => {
    setProject((p) => ({
      ...p,
      texts: p.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const removeText = useCallback((id: string) => {
    setProject((p) => ({ ...p, texts: p.texts.filter((t) => t.id !== id) }));
  }, []);

  const setBgm = useCallback((bgm: Bgm | null) => {
    setProject((p) => ({ ...p, bgm }));
  }, []);

  return {
    project,
    total,
    currentTime,
    playing,
    located,
    videoRef,
    audioRef,
    play,
    pause,
    toggle,
    seek,
    addClips,
    removeClip,
    updateClip,
    moveClip,
    setClipFilter,
    addText,
    updateText,
    removeText,
    setBgm,
  };
}

export type EditorApi = ReturnType<typeof useEditor>;

/** File を読み込んで長さを取得し Clip 化する。 */
function readVideoFile(file: File): Promise<Clip> {
  return new Promise((resolve) => {
    const src = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = src;
    probe.onloadedmetadata = () => {
      const duration = Number.isFinite(probe.duration) ? probe.duration : 0;
      resolve({
        id: uid(),
        name: file.name.replace(/\.[^.]+$/, ""),
        src,
        duration,
        trimStart: 0,
        trimEnd: duration,
        filter: "none",
      });
    };
    probe.onerror = () =>
      resolve({
        id: uid(),
        name: file.name,
        src,
        duration: 0,
        trimStart: 0,
        trimEnd: 0,
        filter: "none",
      });
  });
}
