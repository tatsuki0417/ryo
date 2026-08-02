// ノリ重視のループBGM。4つ打ちキック＋クラップ＋ハイハットのドラム、
// うごくベースライン、おぼえやすいメロディ、そして少しのスウィングで踊れるグルーヴに。
// 8小節(A/Bの2バリエーション)でループするので、単調になりにくい。
// レベルが上がるとテンポアップ。ミュート中は無音。CPU にやさしい短い発振で構成。
import { isMuted, sharedContext } from "./audio";

// コード進行（4小節）Am → F → C → G。ポップで前向きな王道進行。
// bass: 小節の基音(ルート)。tones: メロディ・ハモリで使うコード構成音。
interface Bar {
  root: number;
  fifth: number;
}
const BARS: Bar[] = [
  { root: 110.0, fifth: 164.81 }, // Am (A2 - E3)
  { root: 87.31, fifth: 130.81 }, // F  (F2 - C3)
  { root: 130.81, fifth: 196.0 }, // C  (C3 - G3)
  { root: 98.0, fifth: 146.83 }, // G  (G2 - D3)
];

// Aマイナー・ペンタトニック2オクターブ（メロディの音階）
const SCALE = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

// 1小節=16ステップ(16分)。1 が発音、0 が休符。
// 4つ打ちキック＋おかず
const KICK = [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0];
// 2・4拍のクラップ＋シンコペ
const CLAP = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0];
// 8分ハイハット＋裏拍アクセント
const HAT = [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1];
// ベース（-1休符 / 0=ルート / 1=5度 / 2=オクターブ上）
const BASS = [0, -1, 2, 0, 1, -1, 2, 0, 0, -1, 2, 1, 1, -1, 0, 2];
// メロディ2種（SCALE の添字、-1休符）。8小節でAとBが入れかわる。
const RIFF_A = [5, -1, 7, 5, 8, -1, 7, 5, 4, -1, 5, 7, 5, -1, -1, -1];
const RIFF_B = [8, 7, 5, -1, 7, 5, 4, -1, 5, 7, 8, 10, 8, -1, 7, -1];

let timer: ReturnType<typeof setInterval> | null = null;
let step = 0; // 0..(4小節*16-1)
let cycle = 0; // 何回 4小節をまわったか（A/B切りかえ用）
let bpm = 128;
let running = false;

let masterCtx: AudioContext | null = null;
let master: GainNode | null = null;
function bus(ctx: AudioContext): GainNode {
  if (master && masterCtx === ctx) return master;
  master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);
  masterCtx = ctx;
  return master;
}

function voice(
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
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(bus(ctx));
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// ベースは軽くローパスして丸く太い音に
function bassVoice(ctx: AudioContext, freq: number, t: number, dur: number, gain: number): void {
  const osc = ctx.createOscillator();
  const lp = ctx.createBiquadFilter();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, t);
  lp.type = "lowpass";
  lp.frequency.value = 620;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(lp).connect(g).connect(bus(ctx));
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

let nb: AudioBuffer | null = null;
function noiseHit(ctx: AudioContext, t: number, dur: number, gain: number, hp: number): void {
  if (!nb) {
    nb = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = nb;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus(ctx));
  src.start(t);
  src.stop(t + dur + 0.02);
}

function playStep(): void {
  const ctx = sharedContext();
  const s = step % 16;
  const barIdx = Math.floor(step / 16) % BARS.length;
  const bar = BARS[barIdx];

  if (ctx && !isMuted()) {
    const spb = 60 / bpm / 4; // 16分1つ分の秒数
    // スウィング：裏の16分をわずかに後ろへずらしてハネさせる
    const swing = s % 2 === 1 ? spb * 0.32 : 0;
    const t = ctx.currentTime + 0.04 + swing;

    // --- ドラム ---
    if (KICK[s]) voice(ctx, 145, t, 0.16, "sine", 0.5, 48);
    if (CLAP[s]) {
      noiseHit(ctx, t, 0.11, 0.4, 1400);
      noiseHit(ctx, t + 0.012, 0.09, 0.28, 1700);
    }
    if (HAT[s]) {
      const open = s === 14; // 小節おわりだけオープンハット
      noiseHit(ctx, t, open ? 0.14 : 0.035, s % 4 === 2 ? 0.24 : 0.16, 8500);
    }

    // --- ベース（うごくライン） ---
    const bv = BASS[s];
    if (bv >= 0) {
      const f = bv === 0 ? bar.root : bv === 1 ? bar.fifth : bar.root * 2;
      bassVoice(ctx, f, t, s % 2 === 0 ? 0.16 : 0.12, 0.5);
    }

    // --- メロディ ---
    const riff = cycle % 2 === 0 ? RIFF_A : RIFF_B;
    const mi = riff[s];
    if (mi >= 0) {
      voice(ctx, SCALE[mi], t, 0.16, "square", 0.14);
      // 5度上のうっすらハモリで厚みを出す
      voice(ctx, SCALE[mi] * 1.5, t, 0.12, "triangle", 0.05);
    }

    // --- 8小節ごとのフィル（ラスト1拍でスネアロール） ---
    if (cycle % 2 === 1 && barIdx === 3 && s >= 12) {
      noiseHit(ctx, t, 0.06, 0.22, 1500);
    }
  }

  step += 1;
  if (step >= BARS.length * 16) {
    step = 0;
    cycle += 1;
  }
}

function schedule(): void {
  if (timer) clearInterval(timer);
  const interval = (60 / bpm / 4) * 1000; // 16分音符
  timer = setInterval(playStep, interval);
}

export function startMusic(): void {
  if (running) return;
  running = true;
  step = 0;
  cycle = 0;
  bpm = 128;
  schedule();
}

export function setMusicLevel(level: number): void {
  bpm = Math.min(190, 128 + (level - 1) * 6);
  if (running) schedule();
}

export function stopMusic(): void {
  running = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
