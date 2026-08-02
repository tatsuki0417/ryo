// プレイヤーのプロフィール（えらんだキャラ・ためたコイン）を localStorage に保存する。
// コインはるいけい制。あそぶほどたまり、しきい値に達したキャラが自動でアンロックされる。
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
function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 保存できなくてもゲームは続行 */
  }
}

let coins = loadNum(COIN_KEY);
let selectedId = loadStr(SEL_KEY, DEFAULT_CHARACTER_ID);
// 保存されていたキャラがアンロック条件を満たしていなければデフォルトに戻す
if (coins < getCharacter(selectedId).cost) selectedId = DEFAULT_CHARACTER_ID;

export function getCoins(): number {
  return coins;
}

export function isUnlocked(id: string): boolean {
  return coins >= getCharacter(id).cost;
}

/** るいけいコインに応じてアンロック済みのキャラ一覧 */
export function unlockedCharacters(): AnimalCharacter[] {
  return CHARACTERS.filter((c) => coins >= c.cost);
}

/** コインをたす。あらたにアンロックされたキャラの配列を返す（演出用） */
export function addCoins(n: number): AnimalCharacter[] {
  if (!Number.isFinite(n) || n <= 0) return [];
  const before = coins;
  coins += Math.floor(n);
  save(COIN_KEY, String(coins));
  return CHARACTERS.filter((c) => before < c.cost && coins >= c.cost);
}

export function getSelectedId(): string {
  return selectedId;
}

export function getSelectedCharacter(): AnimalCharacter {
  return getCharacter(selectedId);
}

/** アンロック済みのときだけ選択を切りかえる。成功したら true */
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
