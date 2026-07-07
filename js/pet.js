// ===================================================================
// pet.js  ―  ペットの「状態」と「ルール」
// -------------------------------------------------------------------
// ここはゲームの心臓部です。見た目(canvas)とは切り離して、
// 「お腹」「きげん」「げんき」などの数値と、そのルールだけを扱います。
// こうやって役割を分けておくと、後から改造・拡張がとても楽になります。
// ===================================================================

const SAVE_KEY = 'pipotchi-save-v1'; // localStorage に保存するときの名前

// ステータスの上限
const MAX = 4; // ハート4つ表示に合わせて 0〜4

// ゲームのバランス調整用の設定（ここをいじると難易度が変わる）
const CONFIG = {
  // 何ミリ秒ごとに1段階お腹が減る/きげんが下がるか
  hungerDropMs: 1000 * 60 * 30,   // 30分で空腹1段階
  moodDropMs: 1000 * 60 * 40,     // 40分できげん1段階
  // うんちが出る間隔
  poopEveryMs: 1000 * 60 * 60 * 2, // 2時間に1回
  // 成長にかかる時間
  eggToBabyMs: 1000 * 60 * 3,          // たまご→こども：3分（すぐ孵る楽しさ）
  babyToAdultMs: 1000 * 60 * 60 * 24,  // こども→おとな：24時間
};

// 新しいペットの初期状態を作る
function freshPet() {
  const now = Date.now();
  return {
    name: 'ぴぽ',
    bornAt: now,        // 生まれた時刻
    stage: 'egg',       // egg -> baby -> adult
    hunger: MAX,        // 満腹度（高い＝お腹いっぱい）
    mood: MAX,          // きげん
    energy: MAX,        // げんき
    poop: 0,            // 転がっているうんちの数
    isSleeping: false,
    isDead: false,
    lastFed: now,
    lastPlayed: now,
    lastPoopAt: now,
    lastUpdate: now,    // 最後に時間経過を計算した時刻
    careMisses: 0,      // お世話をサボった回数（多いと病気→死亡）
  };
}

// 経過時間ぶんだけ状態を進める（放置している間も進む）
// これが「開いていない間もペットが生きている」感覚を生みます。
function applyElapsed(pet) {
  const now = Date.now();
  const dt = now - pet.lastUpdate;
  if (dt <= 0) return pet;

  // --- 成長 ---
  const age = now - pet.bornAt;
  if (pet.stage === 'egg' && age >= CONFIG.eggToBabyMs) {
    pet.stage = 'baby';
  } else if (pet.stage === 'baby' && age >= CONFIG.babyToAdultMs) {
    pet.stage = 'adult';
  }

  // たまごの間はお世話不要（減らない）
  if (pet.stage !== 'egg' && !pet.isDead) {
    // --- 空腹・きげんの自然減少 ---
    const hungerDrop = Math.floor((now - pet.lastFed) / CONFIG.hungerDropMs);
    pet.hunger = clamp(MAX - hungerDrop);

    const moodDrop = Math.floor((now - pet.lastPlayed) / CONFIG.moodDropMs);
    pet.mood = clamp(MAX - moodDrop);

    // --- うんち ---
    const poops = Math.floor((now - pet.lastPoopAt) / CONFIG.poopEveryMs);
    if (poops > 0) {
      pet.poop = Math.min(4, pet.poop + poops);
      pet.lastPoopAt = now;
    }

    // --- げんき：お腹が空いてる/汚いと減る ---
    if (pet.hunger === 0 || pet.poop >= 3) {
      pet.careMisses += 1;
    }
    pet.energy = clamp(MAX - Math.floor(pet.careMisses / 2));

    // --- 死亡判定：げんきが尽きたら旅立ち ---
    if (pet.energy <= 0) {
      pet.isDead = true;
    }
  }

  pet.lastUpdate = now;
  return pet;
}

// 0〜MAX の範囲におさめる
function clamp(v) {
  return Math.max(0, Math.min(MAX, v));
}

// -------------------------------------------------------------------
// お世話アクション（UIのボタンから呼ばれる）
// -------------------------------------------------------------------
const actions = {
  feed(pet) {
    if (pet.isDead || pet.stage === 'egg') return 'まだたまごだよ';
    pet.hunger = MAX;
    pet.lastFed = Date.now();
    return 'もぐもぐ…おいしい！';
  },
  play(pet) {
    if (pet.isDead || pet.stage === 'egg') return 'まだたまごだよ';
    pet.mood = MAX;
    pet.lastPlayed = Date.now();
    return 'あそんでたのしい！';
  },
  clean(pet) {
    if (pet.isDead) return '';
    if (pet.poop === 0) return 'きれいだよ！';
    pet.poop = 0;
    return 'ピカピカになった！';
  },
  sleep(pet) {
    if (pet.isDead || pet.stage === 'egg') return '';
    pet.isSleeping = !pet.isSleeping;
    if (!pet.isSleeping) {
      pet.energy = MAX;
      pet.careMisses = 0;
    }
    return pet.isSleeping ? 'おやすみ…zzz' : 'おはよう！げんき回復！';
  },
  revive(pet) {
    // 旅立ってしまったら、新しい子を迎える
    const n = freshPet();
    Object.assign(pet, n);
    return 'あたらしい子がうまれた！';
  },
};

// -------------------------------------------------------------------
// 保存・読み込み（localStorage）
// -------------------------------------------------------------------
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshPet();
    const pet = JSON.parse(raw);
    return applyElapsed(pet); // 前回からの経過を反映
  } catch (e) {
    return freshPet();
  }
}

function save(pet) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(pet));
}

// 何日いっしょにいるか（シェアカードなどに使う）
function ageInDays(pet) {
  return Math.floor((Date.now() - pet.bornAt) / (1000 * 60 * 60 * 24));
}

export const Pet = { freshPet, applyElapsed, actions, load, save, ageInDays, MAX, CONFIG };
