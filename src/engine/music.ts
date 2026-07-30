// 明るくノリのよいループBGM。ドラム(キック/スネア/ハイハット)＋ベース＋メロディを
// I–V–vi–IV のコード進行で。レベルが上がるとテンポアップ。ミュート中は無音。
import { isMuted, sharedContext } from "./audio";

// 4小節（各8ステップ=8分音符 → 計32ステップ）のコード進行 C→G→Am→F
interface Bar {
  bass: number;
  tones: number[];
}
const BARS: Bar[] = [
  { bass: 65.41, tones: [261.63, 329.63, 392.0] }, // C:  C E G
  { bass: 98.0, tones: [392.0, 493.88, 587.33] }, // G:  G B D
  { bass: 110.0, tones: [440.0, 523.25, 659.25] }, // Am: A C E
  { bass: 87.31, tones: [349.23, 440.0, 523.25] }, // F:  F A C
];
// 各小節内(8ステップ)のメロディ音（tones の添字、-1は休符）
const MEL = [0, -1, 1, 2, 0, 2, 1, -1];

let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let bpm = 116;
let running = false;

function env(
  ctx: AudioContext,
  freq: number,
  t: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  sweepTo?: number
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

let nb: AudioBuffer | null = null;
function hit(ctx: AudioContext, t: number, dur: number, gain: number, freq: number): void {
  if (!nb) {
    nb = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = nb;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(hp).connect(g).connect(ctx.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function playStep(): void {
  const ctx = sharedContext();
  if (ctx && !isMuted()) {
    const t = ctx.currentTime + 0.02;
    const barIdx = Math.floor(step / 8) % BARS.length;
    const s = step % 8; // 小節内ステップ
    const bar = BARS[barIdx];

    // ドラム
    if (s === 0 || s === 4) env(ctx, 150, t, 0.14, "sine", 0.18, 50); // キック
    if (s === 2 || s === 6) hit(ctx, t, 0.12, 0.12, 1500); // スネア
    hit(ctx, t, 0.03, s % 2 === 0 ? 0.05 : 0.03, 8000); // ハイハット

    // ベース（1・3拍）
    if (s === 0 || s === 4) env(ctx, bar.bass, t, 0.26, "sawtooth", 0.06);

    // メロディ
    const mi = MEL[s];
    if (mi >= 0) env(ctx, bar.tones[mi] * 2, t, 0.16, "triangle", 0.05);
  }
  step = (step + 1) % (BARS.length * 8);
}

function schedule(): void {
  if (timer) clearInterval(timer);
  const interval = (60 / bpm / 2) * 1000; // 8分音符
  timer = setInterval(playStep, interval);
}

export function startMusic(): void {
  if (running) return;
  running = true;
  step = 0;
  bpm = 116;
  schedule();
}

export function setMusicLevel(level: number): void {
  bpm = Math.min(184, 116 + (level - 1) * 6);
  if (running) schedule();
}

export function stopMusic(): void {
  running = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
