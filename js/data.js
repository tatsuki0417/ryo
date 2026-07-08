// ===================================================================
// data.js  ―  ホムペの「中身」を管理する
// -------------------------------------------------------------------
// ・初期データ（サンプルのホムペ）
// ・localStorage への保存／読み込み
// ・ページ全体をURLに埋め込む／取り出す（★サーバー不要で共有する仕組み）
// ===================================================================

const SAVE_KEY = 'myhomepe-data-v1';

// ホムペの初期状態（新規の人に見せるサンプル）
export function defaultData() {
  return {
    siteName: 'ようこそ！わたしのホームページへ',
    ownerName: '管理人',
    hitokoto: 'はじめまして！ゆっくりしていってね(*^^*)',
    bio: 'ここに自己紹介を書いてね。\nすきなもの、さいきんハマってること、なんでもOK！\n\n相互リンク募集中です♪',
    theme: 'star',           // 背景テーマ（themes.js 参照）
    marquee: '☆★ ようこそマイホームページへ ★☆　更新がんばってます！　キリ番踏んだら教えてね〜',
    links: [
      { title: '相互リンク募集中！', url: '' },
      { title: 'お気に入りのサイト', url: '' },
    ],
    parts: {
      construction: true,  // 工事中バナー
      counter: true,       // アクセスカウンター
      bgm: true,           // BGMボタン
      guestbook: true,     // 訪問者ノート
    },
  };
}

// --- 保存・読み込み ---
export function save(data) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? { ...defaultData(), ...JSON.parse(raw) } : defaultData();
  } catch (e) {
    return defaultData();
  }
}

// -------------------------------------------------------------------
// ★共有のキモ：ホムペのデータをまるごとURLに詰め込む
// これで「サーバーなし」でも、リンクを開くだけで相手にホムペが見えます。
// -------------------------------------------------------------------

// 日本語も扱えるように工夫した base64 エンコード
function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function base64ToUtf8(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

// データ → URLに付ける文字列
export function encodeToUrl(data) {
  return utf8ToBase64(JSON.stringify(data));
}

// URLの文字列 → データ（失敗したら null）
export function decodeFromUrl(str) {
  try {
    return { ...defaultData(), ...JSON.parse(base64ToUtf8(str)) };
  } catch (e) {
    return null;
  }
}

// 共有用のフルURLを作る（今のページURL＋#view=データ）
export function buildShareUrl(data) {
  const base = location.origin + location.pathname;
  return `${base}#view=${encodeToUrl(data)}`;
}
