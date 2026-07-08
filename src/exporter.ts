import { clipLength, totalLength, type Clip, type Project, type TextClip, type TextPresetId } from "./types";
import { filterCss } from "./presets";

const OUT_W = 720;
const OUT_H = 1280; // 9:16

interface CanvasTextStyle {
  color: string;
  bg?: string;
  radius?: number;
  italic?: boolean;
  weight?: number;
  glow?: string;
}

const CANVAS_TEXT: Record<TextPresetId, CanvasTextStyle> = {
  pop: { color: "#fff", bg: "#ff5fa2", radius: 999, weight: 800 },
  cute: { color: "#ff6fb1", bg: "rgba(255,255,255,0.92)", radius: 14, weight: 700 },
  handwrite: { color: "#fff", italic: true, weight: 600, glow: "rgba(0,0,0,0.5)" },
  minimal: { color: "#fff", weight: 600, glow: "rgba(0,0,0,0.55)" },
  price: { color: "#222", bg: "#ffe14d", radius: 8, weight: 900 },
  neon: { color: "#fff", weight: 800, glow: "#ff5fa2" },
};

/** プレビュー相当の縦型動画を webm として書き出す。 */
export async function exportProject(
  project: Project,
  onProgress: (ratio: number) => void,
): Promise<Blob> {
  const clips = project.clips;
  if (clips.length === 0) throw new Error("クリップがありません");

  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const fps = 30;
  const stream = canvas.captureStream(fps);

  // オフスクリーン用の動画要素（プレビューとは別。音声をここから拾う）
  const ev = document.createElement("video");
  ev.playsInline = true;
  ev.muted = false;
  ev.crossOrigin = "anonymous";

  // 音声ミックス（クリップ音声 + BGM）
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  try {
    audioCtx.createMediaElementSource(ev).connect(dest);
  } catch {
    /* 音声トラックが無い場合は無視 */
  }
  let bgmEl: HTMLAudioElement | null = null;
  if (project.bgm) {
    bgmEl = new Audio(project.bgm.src);
    bgmEl.loop = true;
    try {
      const g = audioCtx.createGain();
      g.gain.value = project.bgm.volume;
      audioCtx.createMediaElementSource(bgmEl).connect(g).connect(dest);
    } catch {
      /* ignore */
    }
  }
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const finished = new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
  });

  rec.start();
  if (bgmEl) {
    bgmEl.currentTime = 0;
    await bgmEl.play().catch(() => {});
  }

  const total = totalLength(clips);
  let accBefore = 0;

  for (const clip of clips) {
    await playClip(ev, clip);
    await drawUntilEnd(ctx, ev, clip, project.texts, accBefore, total, onProgress);
    accBefore += clipLength(clip);
  }

  ev.pause();
  bgmEl?.pause();
  rec.stop();
  const blob = await finished;
  await audioCtx.close().catch(() => {});
  return blob;
}

function playClip(ev: HTMLVideoElement, clip: Clip): Promise<void> {
  return new Promise((resolve) => {
    ev.src = clip.src;
    const onReady = () => {
      ev.currentTime = clip.trimStart;
      ev.play().then(() => resolve()).catch(() => resolve());
    };
    ev.addEventListener("loadeddata", onReady, { once: true });
    ev.load();
  });
}

function drawUntilEnd(
  ctx: CanvasRenderingContext2D,
  ev: HTMLVideoElement,
  clip: Clip,
  texts: TextClip[],
  accBefore: number,
  total: number,
  onProgress: (r: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const draw = () => {
      if (ev.currentTime >= clip.trimEnd - 0.02 || ev.ended) {
        resolve();
        return;
      }
      const globalT = accBefore + (ev.currentTime - clip.trimStart);
      drawFrame(ctx, ev, clip, texts, globalT);
      onProgress(total > 0 ? globalT / total : 0);
      requestAnimationFrame(draw);
    };
    draw();
  });
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  ev: HTMLVideoElement,
  clip: Clip,
  texts: TextClip[],
  globalT: number,
) {
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  // object-fit: cover で 9:16 に敷き詰める
  ctx.filter = filterCss(clip.filter);
  const vw = ev.videoWidth || OUT_W;
  const vh = ev.videoHeight || OUT_H;
  const scale = Math.max(OUT_W / vw, OUT_H / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  ctx.drawImage(ev, (OUT_W - dw) / 2, (OUT_H - dh) / 2, dw, dh);
  ctx.filter = "none";

  for (const t of texts) {
    if (globalT < t.start || globalT > t.end) continue;
    drawText(ctx, t);
  }
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, t: TextClip) {
  const s = CANVAS_TEXT[t.preset];
  const fontPx = Math.round(t.scale * 0.052 * OUT_W);
  ctx.save();
  ctx.font = `${s.italic ? "italic " : ""}${s.weight ?? 700} ${fontPx}px sans-serif`;
  const cx = t.x * OUT_W;
  const cy = t.y * OUT_H;
  const text = t.text || " ";
  const w = ctx.measureText(text).width;
  const padX = fontPx * 0.5;
  const padY = fontPx * 0.35;

  if (s.bg) {
    ctx.fillStyle = s.bg;
    roundRect(
      ctx,
      cx - w / 2 - padX,
      cy - fontPx / 2 - padY,
      w + padX * 2,
      fontPx + padY * 2,
      s.radius ?? 8,
    );
    ctx.fill();
  }
  if (s.glow) {
    ctx.shadowColor = s.glow;
    ctx.shadowBlur = fontPx * 0.5;
  }
  ctx.fillStyle = s.color;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function pickMime(): string {
  const candidates = [
    "video/mp4;codecs=h264,aac",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return "";
}
