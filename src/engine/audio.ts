// WebAudio によるプログラム生成の効果音。アセット不要で軽量。
let ctx: AudioContext | null = null;
let muted = false;

function ensureCtx(): AudioContext | null {
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** 効果音・BGM共通の AudioContext（ミュートに関わらず存在させ、タイミングは維持） */
export function sharedContext(): AudioContext | null {
  return ensureCtx();
}

function ac(): AudioContext | null {
  if (muted) return null;
  return ensureCtx();
}

/** 初回のユーザー操作時に呼び、AudioContext を起こす */
export function unlockAudio(): void {
  const c = ensureCtx();
  if (c && c.state === "suspended") void c.resume();
}

export function setMuted(m: boolean): void {
  muted = m;
}

export function isMuted(): boolean {
  return muted;
}

function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; sweepTo?: number; delay?: number } = {}
): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.sweepTo) osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + dur);
  const vol = opts.gain ?? 0.18;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// ホワイトノイズを一度だけ生成して使い回す（スワイプ音などに使用）
let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function noise(dur: number, opts: { gain?: number; freq?: number; sweepTo?: number } = {}): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(opts.freq ?? 1200, t0);
  if (opts.sweepTo) bp.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + dur);
  const g = c.createGain();
  const vol = opts.gain ?? 0.12;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export const sfx = {
  tap(): void {
    tone(660, 0.06, { type: "triangle", gain: 0.12 });
  },
  good(): void {
    // 明るい上昇アルペジオ
    tone(784, 0.09, { type: "square", gain: 0.15 });
    tone(988, 0.09, { type: "square", gain: 0.15, delay: 0.07 });
    tone(1319, 0.14, { type: "square", gain: 0.15, delay: 0.14 });
  },
  bad(): void {
    tone(200, 0.28, { type: "sawtooth", gain: 0.18, sweepTo: 80 });
  },
  pop(): void {
    tone(880, 0.05, { type: "sine", gain: 0.16, sweepTo: 1600 });
    noise(0.06, { gain: 0.08, freq: 2200 });
  },
  coin(): void {
    tone(988, 0.05, { type: "square", gain: 0.14 });
    tone(1319, 0.12, { type: "square", gain: 0.14, delay: 0.05 });
  },
  swipe(): void {
    noise(0.16, { gain: 0.1, freq: 700, sweepTo: 2600 });
  },
  jump(): void {
    tone(360, 0.16, { type: "square", gain: 0.13, sweepTo: 900 });
  },
  powerUp(): void {
    tone(523, 0.07, { type: "square", gain: 0.13 });
    tone(659, 0.07, { type: "square", gain: 0.13, delay: 0.06 });
    tone(784, 0.07, { type: "square", gain: 0.13, delay: 0.12 });
    tone(1047, 0.14, { type: "square", gain: 0.14, delay: 0.18 });
  },
  combo(n: number): void {
    // コンボ数が上がるほど高い音（爽快感）
    const base = 660 * Math.pow(1.0595, Math.min(n, 18));
    tone(base, 0.09, { type: "triangle", gain: 0.15 });
  },
  levelUp(): void {
    tone(523, 0.1, { type: "square", gain: 0.15 });
    tone(659, 0.1, { type: "square", gain: 0.15, delay: 0.09 });
    tone(1047, 0.18, { type: "square", gain: 0.16, delay: 0.18 });
  },
  boss(): void {
    tone(147, 0.5, { type: "sawtooth", gain: 0.2 });
    tone(220, 0.5, { type: "square", gain: 0.12, delay: 0.02 });
  },
  gameOver(): void {
    tone(392, 0.18, { type: "sawtooth", gain: 0.16 });
    tone(294, 0.18, { type: "sawtooth", gain: 0.16, delay: 0.16 });
    tone(196, 0.4, { type: "sawtooth", gain: 0.18, sweepTo: 120, delay: 0.32 });
  },
  tick(): void {
    tone(1200, 0.04, { type: "triangle", gain: 0.08 });
  },
};
