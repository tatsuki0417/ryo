// ===================================================================
// bgm.js  ―  ピコピコBGM（音声ファイルなしで鳴らす）
// -------------------------------------------------------------------
// 昔のホムペで勝手に流れたMIDIの雰囲気を、Web Audio APIで再現します。
// 音符データから四角い波（レトロなゲーム音）を鳴らすだけ。
// ※ブラウザの仕様で、音はユーザーが操作(クリック)してから鳴らせます。
// ===================================================================

// かんたんなメロディー（音名と長さ）。ここを書き換えると曲が変わる。
const MELODY = [
  ['E5', 1], ['G5', 1], ['A5', 2], ['G5', 1], ['E5', 1], ['D5', 2],
  ['C5', 1], ['D5', 1], ['E5', 2], ['G5', 1], ['A5', 1], ['G5', 2],
  ['E5', 1], ['D5', 1], ['C5', 2], ['D5', 2], ['E5', 2], ['C5', 2],
];

// 音名 → 周波数(Hz)
const NOTES = {
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
  G5: 783.99, A5: 880.0, B5: 987.77,
};

let ctx = null;      // AudioContext
let timer = null;    // 次の音を鳴らすためのタイマー
let playing = false;

const TEMPO = 180; // 1拍のミリ秒（小さいほど速い）

function playNote(freq, durationBeats) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';            // 四角い波＝レトロなピコピコ音
  osc.frequency.value = freq;
  // 音の始まりと終わりを少し丸めてプチプチ音を防ぐ
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (durationBeats * TEMPO) / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + (durationBeats * TEMPO) / 1000);
}

function loop(index) {
  if (!playing) return;
  const [note, dur] = MELODY[index % MELODY.length];
  if (NOTES[note]) playNote(NOTES[note], dur);
  timer = setTimeout(() => loop(index + 1), dur * TEMPO);
}

export const BGM = {
  toggle() {
    if (playing) {
      this.stop();
      return false;
    }
    // 初回だけ AudioContext を作る（ユーザー操作のタイミングで作るのがコツ）
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    playing = true;
    loop(0);
    return true;
  },
  stop() {
    playing = false;
    if (timer) clearTimeout(timer);
  },
  get isPlaying() {
    return playing;
  },
};
