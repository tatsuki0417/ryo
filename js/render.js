// ===================================================================
// render.js  ―  ホムペのデータを「レトロなページ」に描く
// -------------------------------------------------------------------
// 編集中のプレビューでも、共有リンクで開いた閲覧ページでも、
// この関数ひとつで同じ見た目を作ります（＝二度書きしなくて済む）。
// ===================================================================

// 文字列を安全にHTMLに埋め込む（タグの誤動作・いたずら防止）
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 改行を <br> に
function nl2br(s) {
  return esc(s).replace(/\n/g, '<br>');
}

// 今日の運勢（占い）。日付で固定＝日替わりで同じ結果になる
const FORTUNES = [
  { rank: '大吉', msg: 'サイコーの一日！思いきって更新しちゃおう' },
  { rank: '中吉', msg: 'いいことありそう。相互リンク申請が吉' },
  { rank: '小吉', msg: 'まったりが吉。BGMを聴いてリラックス' },
  { rank: '末吉', msg: 'あせらずマイペースに。キリ番を狙え！' },
  { rank: '吉',   msg: '訪問者ノートに書き込むと運気アップ' },
  { rank: '凶',   msg: '今日はROM専でOK。ネットは優しく' },
];
function getFortune(seedStr) {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const idx = (day + (seedStr || '').length) % FORTUNES.length;
  return FORTUNES[idx];
}

// data を受け取り、container(DOM要素) の中にホムペを描く
//   opts.hitCount : アクセスカウンターの数字
//   opts.guestbook: 訪問者ノートの配列 [{name, text}]
export function renderHomepage(container, data, opts = {}) {
  const p = data.parts || {};
  const hit = opts.hitCount ?? 0;
  const guest = opts.guestbook ?? [];
  const clapCount = opts.clapCount ?? 0;
  const fortune = getFortune(data.ownerName);

  container.setAttribute('data-theme', data.theme || 'star');

  // プロフィール画像（プリ画像）＋飾り枠
  const avatarHtml = data.avatar
    ? `<div class="hp-avatar frame-${esc(data.avatarFrame || 'simple')}">
         <img src="${esc(data.avatar)}" alt="プロフィール画像">
       </div>`
    : '';

  container.innerHTML = `
    ${data.marquee ? `<div class="hp-marquee"><span>${esc(data.marquee)}</span></div>` : ''}

    <div class="hp-inner">
      <h1 class="hp-title title-${esc(data.titleStyle || 'rainbow')}">${esc(data.siteName)}</h1>

      ${p.construction ? `
        <div class="hp-construction">
          <span class="blink">🚧</span> ただいま工事中！ <span class="blink">🚧</span>
        </div>` : ''}

      <div class="hp-box hp-profile">
        <div class="hp-box-head">▼ 管理人プロフィール ▼</div>
        ${avatarHtml}
        <p><b>なまえ：</b>${esc(data.ownerName)}</p>
        <p><b>ひとこと：</b>${esc(data.hitokoto)}</p>
      </div>

      ${p.fortune ? `
        <div class="hp-box hp-fortune">
          <div class="hp-box-head">▼ きょうの運勢 ▼</div>
          <div class="hp-fortune-rank">${esc(fortune.rank)}</div>
          <p>${esc(fortune.msg)}</p>
        </div>` : ''}

      <div class="hp-box">
        <div class="hp-box-head">▼ じこしょうかい ▼</div>
        <p class="hp-bio">${nl2br(data.bio)}</p>
      </div>

      ${(p.news && data.news) ? `
        <div class="hp-box">
          <div class="hp-box-head">▼ 更新履歴（What's New） ▼</div>
          <p class="hp-bio">${nl2br(data.news)}</p>
        </div>` : ''}

      ${(data.links && data.links.some((l) => l.title)) ? `
        <div class="hp-box">
          <div class="hp-box-head">▼ リンク ▼</div>
          <ul class="hp-links">
            ${data.links.filter((l) => l.title).map((l) => `
              <li>🔗 ${l.url
                ? `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a>`
                : esc(l.title)}</li>`).join('')}
          </ul>
        </div>` : ''}

      ${p.guestbook ? `
        <div class="hp-box">
          <div class="hp-box-head">▼ 訪問者ノート ▼</div>
          <div class="hp-guestbook">
            ${guest.length ? guest.map((g) => `
              <div class="hp-guest-item">
                <b>${esc(g.name || 'ななし')}</b>：${esc(g.text)}
              </div>`).join('') : '<p class="hp-dim">まだ書き込みがありません。一番のりどうぞ！</p>'}
          </div>
          <div class="hp-guest-form">
            <input class="gb-name" placeholder="なまえ" maxlength="12">
            <input class="gb-text" placeholder="ひとことどうぞ" maxlength="60">
            <button class="gb-send">かきこむ</button>
          </div>
        </div>` : ''}

      ${p.clap ? `
        <div class="hp-clap">
          <button class="hp-clap-btn">👏 Web拍手を送る</button>
          <span class="hp-clap-count">${clapCount} 拍手</span>
        </div>` : ''}

      ${p.counter ? `
        <div class="hp-counter">
          あなたは <span class="hp-counter-digits">${String(hit).padStart(6, '0')}</span> 人目のお客様です
        </div>` : ''}

      <div class="hp-footer">
        Since 2026 ／ Powered by <b>マイホムペ</b>
      </div>
    </div>
  `;
}
