// シンプルなループBGM。ペンタトニックのメロディ＋ベースを一定間隔で鳴らす。
// レベルが上がるとテンポアップ。ミュート時はタイミングだけ進めて無音にする。
import { isMuted, sharedContext } from "./audio";

// Cメジャー・ペンタトニック
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
const MELODY = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 5, 4, 2, 1, 0];
const BASS = [130.81, 0, 0, 0, 98.0, 0, 0, 0, 110.0, 0, 0, 0, 98.0, 0, 0, 0];

let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let bpm = 104;
let running = false;

function playStep(): void {
  const ctx = sharedContext();
  if (ctx && !isMuted()) {
    const t = ctx.currentTime + 0.02;
    const mi = MELODY[step % MELODY.length];
    voice(ctx, SCALE[mi], t, 0.14, "triangle", 0.05);
    const bf = BASS[step % BASS.length];
    if (bf) voice(ctx, bf, t, 0.24, "sawtooth", 0.045);
    if (step % 4 === 0) voice(ctx, 1400, t, 0.03, "square", 0.02); // 軽いハイハット風
  }
  step = (step + 1) % 64;
}

function voice(
  ctx: AudioContext,
  freq: number,
  t: number,
  dur: number,
  type: OscillatorType,
  gain: number
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
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
  bpm = 104;
  schedule();
}

export function setMusicLevel(level: number): void {
  bpm = Math.min(180, 104 + (level - 1) * 7);
  if (running) schedule();
}

export function stopMusic(): void {
  running = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
