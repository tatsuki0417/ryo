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

export const sfx = {
  tap(): void {
    tone(660, 0.06, { type: "triangle", gain: 0.12 });
  },
  good(): void {
    tone(880, 0.09, { type: "square", gain: 0.16 });
    tone(1320, 0.12, { type: "square", gain: 0.14, delay: 0.08 });
  },
  bad(): void {
    tone(200, 0.28, { type: "sawtooth", gain: 0.18, sweepTo: 80 });
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
