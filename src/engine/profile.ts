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
