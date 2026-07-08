// ===================================================================
// share.js  ―  拡散の導線（URLコピー ＆ バナー画像）
// -------------------------------------------------------------------
// ・共有URLをコピー（ホムペは"リンクを渡す"のが主役）
// ・SNS投稿用に、昔のバナー(88x31の拡大版)風カード画像も作れる
// ===================================================================

import { buildShareUrl } from './data.js';

// テーマごとのバナー背景色（見た目のアクセント）
const THEME_COLOR = {
  star: '#101a3a', brick: '#7a3b2e', tile: '#2e6a4f',
  dot: '#c14d7a', sky: '#3a7bd5', note: '#6a5acd',
};

// 共有URLをクリップボードにコピー
export async function copyShareUrl(data) {
  const url = buildShareUrl(data);
  try {
    await navigator.clipboard.writeText(url);
    return { ok: true, url };
  } catch (e) {
    // クリップボードが使えない環境向けフォールバック
    return { ok: false, url };
  }
}

// スマホの共有シート（使える端末なら）
export async function shareUrl(data) {
  const url = buildShareUrl(data);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'マイホムペ', text: `${data.ownerName}のホームページ`, url });
      return true;
    } catch (e) { /* キャンセル時は下でコピーにフォールバック */ }
  }
  return false;
}

// SNS投稿用のレトロなバナー画像を作る
export function buildBanner(data) {
  const W = 600, H = 315; // OGP的な横長
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = THEME_COLOR[data.theme] || '#101a3a';
  ctx.fillRect(0, 0, W, H);

  // 二重の枠（昔のバナーっぽさ）
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.strokeStyle = '#ffe66d';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, W - 44, H - 44);

  ctx.textAlign = 'center';

  // サイト名
  ctx.fillStyle = '#ffe66d';
  ctx.font = "bold 30px 'MS PGothic', monospace";
  wrap(ctx, data.siteName, W / 2, 90, W - 80, 38);

  // 管理人
  ctx.fillStyle = '#fff';
  ctx.font = "20px 'MS PGothic', monospace";
  ctx.fillText(`管理人：${data.ownerName}`, W / 2, 175);

  // ひとこと
  ctx.font = "18px 'MS PGothic', monospace";
  wrap(ctx, `「${data.hitokoto}」`, W / 2, 210, W - 80, 26);

  // フッター（誘導）
  ctx.fillStyle = '#ffe66d';
  ctx.font = "bold 18px 'MS PGothic', monospace";
  ctx.fillText('▶ マイホムペ で自分のホームページを作ろう', W / 2, 285);

  return canvas;
}

// バナーを保存/共有
export async function shareBanner(data) {
  const canvas = buildBanner(data);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const file = new File([blob], 'myhomepe.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'マイホムペ' });
      return;
    } catch (e) { /* fall through */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'myhomepe.png';
  a.click();
  URL.revokeObjectURL(url);
}

// 長い文字を折り返して描くヘルパー
function wrap(ctx, text, cx, y, maxWidth, lineHeight) {
  const chars = [...String(text)];
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
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
}
