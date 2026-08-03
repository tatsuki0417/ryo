// プレイヤーのプロフィール（えらんだキャラ・ためたコイン・かったキャラ）を localStorage に保存する。
// コインは「つかう」方式：あそんでためたコインで、すきなどうぶつを こうかん(購入)してアンロックする。
// App.tsx と同じく、ストレージが使えない環境でも動くよう try/catch でガードする。
import {
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  getCharacter,
  type AnimalCharacter,
  type DrawOpts,
} from "./characters";

const SEL_KEY = "minige-matsuri.character";
const COIN_KEY = "minige-matsuri.coins";
const OWN_KEY = "minige-matsuri.owned";
const BONUS_KEY = "minige-matsuri.lastbonus";

const FIRST_BONUS = 30; // はじめてボーナス（すぐ うさぎ を買える額）
const DAILY_BONUS = 20; // 毎日のログインボーナス

function loadStr(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function loadNum(key: string): number {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}
function loadOwned(): Set<string> {
  try {
    const raw = localStorage.getItem(OWN_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === "string"));
    }
  } catch {
    /* こわれた/使えない場合は空 */
  }
  return new Set();
}
function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 保存できなくてもゲームは続行 */
  }
}

let coins = loadNum(COIN_KEY);
// こうにゅう済みキャラ（無料キャラ cost=0 は最初から所有）
const owned = loadOwned();
let selectedId = loadStr(SEL_KEY, DEFAULT_CHARACTER_ID);
// 保存されていたキャラを持っていなければデフォルトに戻す
if (!isUnlocked(selectedId)) selectedId = DEFAULT_CHARACTER_ID;

export function getCoins(): number {
  return coins;
}

/** 無料キャラ or こうにゅう済みなら true */
export function isUnlocked(id: string): boolean {
  return getCharacter(id).cost <= 0 || owned.has(id);
}

/** 所有(＝えらべる)キャラ一覧 */
export function unlockedCharacters(): AnimalCharacter[] {
  return CHARACTERS.filter((c) => isUnlocked(c.id));
}

/** コインをためる（あそんだごほうび）。 */
export function addCoins(n: number): void {
  if (!Number.isFinite(n) || n <= 0) return;
  coins += Math.floor(n);
  save(COIN_KEY, String(coins));
}

export interface DailyBonus {
  /** もらったコイン数（0なら今日はもう受け取り済み） */
  amount: number;
  /** はじめてのボーナスか */
  first: boolean;
}

/**
 * 1日1回のログインボーナス。初回は多め。今日すでに受け取っていれば amount=0。
 * 起動時に呼ぶ。
 */
export function claimDailyBonus(): DailyBonus {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const last = loadStr(BONUS_KEY, "");
  if (last === today) return { amount: 0, first: false };
  const first = last === "";
  const amount = first ? FIRST_BONUS : DAILY_BONUS;
  addCoins(amount);
  save(BONUS_KEY, today);
  return { amount, first };
}

/**
 * コインをつかってキャラをこうかん(購入)する。
 * 成功したら true（コインを消費してアンロック）。所有済み or コイン不足なら false。
 */
export function buyCharacter(id: string): boolean {
  const c = getCharacter(id);
  if (isUnlocked(id)) return false; // すでに持っている
  if (coins < c.cost) return false; // コインがたりない
  coins -= c.cost;
  owned.add(id);
  save(COIN_KEY, String(coins));
  save(OWN_KEY, JSON.stringify([...owned]));
  return true;
}

export function getSelectedId(): string {
  return selectedId;
}

export function getSelectedCharacter(): AnimalCharacter {
  return getCharacter(selectedId);
}

/** 所有しているときだけ選択を切りかえる。成功したら true */
export function setSelectedCharacterId(id: string): boolean {
  if (!isUnlocked(id)) return false;
  selectedId = id;
  save(SEL_KEY, id);
  return true;
}

/** いま選んでいるキャラを描く。プレイヤーの分身として各ミニゲームから呼ぶ。 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  opts: DrawOpts = {}
): void {
  getSelectedCharacter().draw(ctx, x, y, r, opts);
}
