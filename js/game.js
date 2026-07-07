// ===================================================================
// game.js  ―  ゲームのメイン（すべてをつなぐ司令塔）
// -------------------------------------------------------------------
// ・状態(pet.js) を読み込み
// ・見た目(canvas) を毎フレーム描く
// ・ボタン操作を受け取ってお世話する
// ・状態を保存する
// ===================================================================

import { SPRITES, drawSprite, DOT } from './pixel.js';
import { Pet } from './pet.js';
import { pickPhrase } from './phrases.js';
import { shareCard } from './share.js';

// --- HTML の部品を取得 ---
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const messageEl = document.getElementById('message');
const nameEl = document.getElementById('petName');
const dayEl = document.getElementById('dayCount');

// ステータスバー
const bars = {
  hunger: document.getElementById('bar-hunger'),
  mood: document.getElementById('bar-mood'),
  energy: document.getElementById('bar-energy'),
};

// --- ペットを読み込む ---
let pet = Pet.load();

// 一時メッセージ（「もぐもぐ…」など）を出すための変数
let tempMessage = '';
let tempMessageUntil = 0;

function flash(msg) {
  tempMessage = msg;
  tempMessageUntil = Date.now() + 2500; // 2.5秒表示
}

// -------------------------------------------------------------------
// 今の状態に合ったスプライトを選ぶ
// -------------------------------------------------------------------
function currentSprite() {
  if (pet.isDead) return SPRITES.sick;
  if (pet.stage === 'egg') return SPRITES.egg;
  if (pet.isSleeping) return pet.stage === 'adult' ? SPRITES.adult : SPRITES.baby;
  if (pet.hunger <= 1 || pet.energy <= 1) return SPRITES.sick;

  const happy = pet.mood >= 4 && pet.hunger >= 4;
  if (pet.stage === 'adult') return happy ? SPRITES.adultHappy : SPRITES.adult;
  return happy ? SPRITES.babyHappy : SPRITES.baby;
}

// -------------------------------------------------------------------
// 画面を描く（毎フレーム呼ばれる）
// -------------------------------------------------------------------
let frame = 0;
function draw() {
  frame++;

  // 経過時間を反映（放置ぶんの空腹などをここで計算）
  Pet.applyElapsed(pet);

  // LCD背景をクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ぴょこぴょこアニメ（0.5秒ごとに上下2pxゆれる）
  const bounce = pet.isSleeping || pet.isDead ? 0 : (Math.floor(frame / 30) % 2 === 0 ? 0 : 2);

  // 中央に配置するためのオフセット
  ctx.save();
  const spritePx = (canvas.width - 16 * DOT) / 2;
  const spritePy = (canvas.height - 16 * DOT) / 2 - 4;
  ctx.translate(spritePx, spritePy);
  drawSprite(ctx, currentSprite(), bounce);
  ctx.restore();

  // うんちを右下のすみに小さく描く（ペットに重ならないように）
  if (pet.poop > 0 && !pet.isDead) {
    const poopScale = 0.5;                 // 16*8*0.5 = 64px の大きさ
    const poopSize = 16 * DOT * poopScale; // 実際の描画サイズ
    ctx.save();
    // translate は scale の前に効くので、右下の座標をそのまま指定してよい
    ctx.translate(canvas.width - poopSize - 2, canvas.height - poopSize - 2);
    ctx.scale(poopScale, poopScale);
    drawSprite(ctx, SPRITES.poop, 0);
    ctx.restore();
  }

  // ねてるときは Zzz
  if (pet.isSleeping) {
    ctx.fillStyle = '#2b3a1a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('Zzz', canvas.width - 60, 40);
  }

  // メッセージ更新
  if (Date.now() < tempMessageUntil) {
    messageEl.textContent = tempMessage;
  } else {
    messageEl.textContent = pickPhrase(pet);
  }

  // ステータスUIを更新
  updateStatus();

  requestAnimationFrame(draw);
}

// -------------------------------------------------------------------
// ステータスバー・名前・日数の表示を更新
// -------------------------------------------------------------------
function updateStatus() {
  nameEl.textContent = pet.name;
  dayEl.textContent = `${Pet.ageInDays(pet)}日目`;
  renderBar(bars.hunger, pet.hunger);
  renderBar(bars.mood, pet.mood);
  renderBar(bars.energy, pet.energy);
}

// ハート（■）でステータスを表示
function renderBar(el, value) {
  const full = '■'.repeat(value);
  const empty = '□'.repeat(Pet.MAX - value);
  el.textContent = full + empty;
}

// -------------------------------------------------------------------
// ボタンの操作をつなぐ
// -------------------------------------------------------------------
function doAction(name) {
  const msg = Pet.actions[name](pet);
  if (msg) flash(msg);
  Pet.save(pet);
  updateStatus();
}

// ごはんボタン：旅立ったあとは「新しい子を迎える」ボタンに変わる
document.getElementById('btn-feed').addEventListener('click', () => {
  doAction(pet.isDead ? 'revive' : 'feed');
});
document.getElementById('btn-play').addEventListener('click', () => doAction('play'));
document.getElementById('btn-clean').addEventListener('click', () => doAction('clean'));
document.getElementById('btn-sleep').addEventListener('click', () => doAction('sleep'));

// シェアボタン
document.getElementById('btn-share').addEventListener('click', async () => {
  await shareCard(pet, pickPhrase(pet));
});

// 名前を変えられるようにする（クリックで編集）
nameEl.addEventListener('click', () => {
  const newName = prompt('なまえをつけてね（8文字まで）', pet.name);
  if (newName) {
    pet.name = newName.slice(0, 8);
    Pet.save(pet);
  }
});

// こまめに保存（タブを閉じても状態が残るように）
setInterval(() => Pet.save(pet), 10000);
window.addEventListener('beforeunload', () => Pet.save(pet));

// ゲーム開始！
draw();
