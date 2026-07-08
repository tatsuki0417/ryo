// ===================================================================
// app.js  ―  メイン（すべてをつなぐ）
// -------------------------------------------------------------------
// 2つのモードがあります：
//   ・編集モード（ふつうに開いたとき）… 自分のホムペを作る
//   ・閲覧モード（#view=... 付きのリンクで開いたとき）… 人のホムペを見る
// ===================================================================

import * as Data from './data.js';
import { THEMES } from './themes.js';
import { renderHomepage } from './render.js';
import { BGM } from './bgm.js';
import * as Share from './share.js';

const $ = (sel) => document.querySelector(sel);
const preview = $('#preview');

// --- モード判定：URLに #view=... があれば「閲覧モード」 ---
const hash = location.hash;
const viewMatch = hash.match(/view=([^&]+)/);
const isViewMode = !!viewMatch;

// 表示するデータを決める
let data = isViewMode ? (Data.decodeFromUrl(viewMatch[1]) || Data.defaultData())
                      : Data.load();

// -------------------------------------------------------------------
// アクセスカウンター（この端末で開いた回数。昔のカウンターの再現）
// 「ずっと運営してる感」を出すため、少し大きめの数から始めます。
// -------------------------------------------------------------------
const HITS_KEY = isViewMode ? 'myhomepe-hits-view' : 'myhomepe-hits';
function bumpHits() {
  let n = parseInt(localStorage.getItem(HITS_KEY) || '12340', 10);
  n += 1;
  localStorage.setItem(HITS_KEY, String(n));
  return n;
}
const hitCount = bumpHits();

// キリ番（00で終わる／ゾロ目）だったらお祝いを出す
function isKiriban(n) {
  return n % 100 === 0 || /^(\d)\1+$/.test(String(n));
}

// -------------------------------------------------------------------
// 訪問者ノート（Phase 1 はこの端末内だけに保存）
// -------------------------------------------------------------------
const GB_KEY = isViewMode ? 'myhomepe-gb-view' : 'myhomepe-gb';
function loadGuestbook() {
  try {
    const raw = localStorage.getItem(GB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // 初期サンプル
  return [
    { name: 'あきら', text: 'はじめまして！相互リンクしましょう〜' },
    { name: 'ゆめ', text: 'カウンターのキリ番踏んだので記念カキコ✎' },
  ];
}
function saveGuestbook(list) {
  localStorage.setItem(GB_KEY, JSON.stringify(list));
}
let guestbook = loadGuestbook();

// -------------------------------------------------------------------
// プレビュー（＝ホムペ本体）を描き直す
// -------------------------------------------------------------------
function rerender() {
  renderHomepage(preview, data, { hitCount, guestbook });
}
rerender();

// キリ番のお祝いトースト
if ((data.parts || {}).counter && isKiriban(hitCount)) {
  showToast(`🎉 キリ番 ${hitCount} ゲット！記念カキコどうぞ 🎉`);
}

// 訪問者ノートへの書き込み（プレビューは描き直されるのでイベント委譲で拾う）
preview.addEventListener('click', (e) => {
  if (!e.target.classList.contains('gb-send')) return;
  const box = e.target.closest('.hp-guest-form');
  const name = box.querySelector('.gb-name').value.trim();
  const text = box.querySelector('.gb-text').value.trim();
  if (!text) return;
  guestbook = [{ name, text }, ...guestbook].slice(0, 30);
  saveGuestbook(guestbook);
  rerender();
  showToast('かきこみました！');
});

// ===================================================================
// ここから下は「編集モード」だけの処理
// ===================================================================
if (isViewMode) {
  // 閲覧モード：編集パネルを隠し、「自分も作る」導線を出す
  document.body.classList.add('view-mode');
} else {
  buildEditor();
}

// -------------------------------------------------------------------
// 編集フォームを組み立てて、入力のたびにプレビューへ反映
// -------------------------------------------------------------------
function buildEditor() {
  // テキスト系の入力をデータにつなぐ
  bindInput('#in-siteName', 'siteName');
  bindInput('#in-ownerName', 'ownerName');
  bindInput('#in-hitokoto', 'hitokoto');
  bindInput('#in-bio', 'bio');
  bindInput('#in-marquee', 'marquee');
  bindInput('#in-link1-title', null, (v) => (data.links[0].title = v));
  bindInput('#in-link1-url', null, (v) => (data.links[0].url = v));

  // テーマ選択チップを生成
  const themeWrap = $('#theme-chips');
  THEMES.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (data.theme === t.id ? ' active' : '');
    b.textContent = t.label;
    b.addEventListener('click', () => {
      data.theme = t.id;
      themeWrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
      persist();
    });
    themeWrap.appendChild(b);
  });

  // パーツのON/OFF
  bindCheck('#pt-construction', 'construction');
  bindCheck('#pt-counter', 'counter');
  bindCheck('#pt-guestbook', 'guestbook');

  // 初期値をフォームに反映
  $('#in-siteName').value = data.siteName;
  $('#in-ownerName').value = data.ownerName;
  $('#in-hitokoto').value = data.hitokoto;
  $('#in-bio').value = data.bio;
  $('#in-marquee').value = data.marquee;
  $('#in-link1-title').value = data.links[0]?.title || '';
  $('#in-link1-url').value = data.links[0]?.url || '';
  $('#pt-construction').checked = !!data.parts.construction;
  $('#pt-counter').checked = !!data.parts.counter;
  $('#pt-guestbook').checked = !!data.parts.guestbook;
}

// input と data のプロパティをつなぐ小さなヘルパー
function bindInput(sel, key, custom) {
  const el = $(sel);
  if (!el) return;
  el.addEventListener('input', () => {
    if (custom) custom(el.value);
    else data[key] = el.value;
    persist();
  });
}
function bindCheck(sel, partKey) {
  const el = $(sel);
  if (!el) return;
  el.addEventListener('change', () => {
    data.parts[partKey] = el.checked;
    persist();
  });
}

// データを保存してプレビュー更新
function persist() {
  Data.save(data);
  rerender();
}

// ===================================================================
// 下部のアクションバー（BGM・共有）
// ===================================================================
$('#btn-bgm').addEventListener('click', (e) => {
  const on = BGM.toggle();
  e.currentTarget.classList.toggle('on', on);
  e.currentTarget.textContent = on ? '♪ BGM ちゅう' : '♪ BGM';
});

const shareUrlBtn = $('#btn-share-url');
if (shareUrlBtn) {
  shareUrlBtn.addEventListener('click', async () => {
    // スマホの共有シートを試し、だめならコピー
    const shared = await Share.shareUrl(data);
    if (shared) return;
    const res = await Share.copyShareUrl(data);
    showToast(res.ok ? '共有URLをコピーしました！SNSに貼ってね' : 'URL: ' + res.url);
  });
}

const bannerBtn = $('#btn-share-banner');
if (bannerBtn) {
  bannerBtn.addEventListener('click', () => Share.shareBanner(data));
}

// 閲覧モードの「自分も作る」ボタン
const makeBtn = $('#btn-make-own');
if (makeBtn) {
  makeBtn.addEventListener('click', () => {
    location.href = location.origin + location.pathname; // ハッシュを外して編集モードへ
  });
}

// -------------------------------------------------------------------
// 画面下にふわっと出るメッセージ
// -------------------------------------------------------------------
let toastTimer = null;
function showToast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
