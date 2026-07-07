// ===================================================================
// share.js  ―  シェア用カード画像の生成
// -------------------------------------------------------------------
// バズの仕掛けの本体。ペットの姿・名前・いっしょにいる日数・今日の
// 一言を1枚のカード画像にして、保存＆SNSシェアできるようにします。
// 「見た人が自分もやりたくなる」導線がここです。
// ===================================================================

import { SPRITES, drawSprite } from './pixel.js';
import { Pet } from './pet.js';

// ペットの今の見た目スプライトを返す（game.js と同じ判定）
function spriteFor(pet) {
  if (pet.isDead || pet.stage === 'egg') return SPRITES.egg;
  if (pet.energy <= 1 || pet.hunger <= 1) return SPRITES.sick;
  const base = pet.stage === 'adult' ? 'adult' : 'baby';
  return SPRITES[base];
}

// シェアカードを描いて、canvas要素を返す
export function buildShareCard(pet, phrase) {
  const W = 600, H = 800;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 背景（レトロ液晶グリーンのグラデ）
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#c5d64b');
  grad.addColorStop(1, '#9bbb3a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 外枠
  ctx.strokeStyle = '#2b3a1a';
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  // タイトル
  ctx.fillStyle = '#2b3a1a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px monospace';
  ctx.fillText('ぴぽっち', W / 2, 90);

  // ペットを中央に大きく描く（16x16 を約22倍に拡大）
  const sprite = spriteFor(pet);
  const scale = 22;
  const spriteW = 16 * scale;
  ctx.save();
  ctx.translate((W - spriteW) / 2, 150);
  ctx.scale(scale / 8, scale / 8); // pixel.js の DOT=8 に合わせて調整
  drawSprite(ctx, sprite, 0, '#2b3a1a');
  ctx.restore();

  // 名前と日数
  ctx.font = 'bold 34px monospace';
  ctx.fillText(`${pet.name}`, W / 2, 560);
  ctx.font = '26px monospace';
  ctx.fillText(`いっしょに ${Pet.ageInDays(pet)}日目`, W / 2, 600);

  // 今日のひとこと（吹き出し風）
  ctx.fillStyle = '#f7f7e8';
  roundRect(ctx, 60, 640, W - 120, 90, 16);
  ctx.fill();
  ctx.strokeStyle = '#2b3a1a';
  ctx.lineWidth = 4;
  roundRect(ctx, 60, 640, W - 120, 90, 16);
  ctx.stroke();

  ctx.fillStyle = '#2b3a1a';
  ctx.font = '24px monospace';
  wrapText(ctx, `「${phrase}」`, W / 2, 690, W - 160, 30);

  // フッター（拡散導線：ハッシュタグ）
  ctx.font = '20px monospace';
  ctx.fillText('#ぴぽっち で育成記録をシェア', W / 2, 765);

  return canvas;
}

// 角丸四角のヘルパー
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 長い文字を折り返して描く
function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const chars = [...text];
  let line = '';
  const lines = [];
  for (const ch of chars) {
    if (ctx.measureText(line + ch).width > maxWidth) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
}

// カードを画像として保存・共有する
export async function shareCard(pet, phrase) {
  const canvas = buildShareCard(pet, phrase);

  // Blob（画像データ）にする
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const file = new File([blob], 'pipotchi.png', { type: 'image/png' });

  // スマホなどで Web Share API が使えるなら、そのまま共有シートを出す
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'ぴぽっち',
        text: `${pet.name}と いっしょに ${Pet.ageInDays(pet)}日目！ #ぴぽっち`,
      });
      return;
    } catch (e) {
      // キャンセルされた場合は下のダウンロードにフォールバック
    }
  }

  // 使えない環境ではダウンロードさせる
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pipotchi.png';
  a.click();
  URL.revokeObjectURL(url);
}
