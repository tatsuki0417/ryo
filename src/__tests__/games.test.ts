import { beforeAll, describe, expect, it } from "vitest";
import { BOSS_GAMES, MICROGAMES } from "../microgames";
import type { BossDef, InputEvent, Microgame, MicrogameApi, MicrogameDef } from "../engine/types";

// 全メソッド no-op の 2D コンテキスト（描画呼び出しが例外を投げないか確認するため）
function stubCtx(): CanvasRenderingContext2D {
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "createLinearGradient" || prop === "createRadialGradient") {
          return () => ({ addColorStop() {} });
        }
        if (prop === "canvas") return { width: 360, height: 640 };
        return () => {};
      },
      set() {
        return true;
      },
    }
  ) as unknown as CanvasRenderingContext2D;
}

const api: MicrogameApi = {
  w: 360,
  h: 640,
  speed: 1.4,
  duration: 4,
  rand: () => Math.random(),
  range: (a, b) => a + Math.random() * (b - a),
  sfx: { tap() {}, good() {}, bad() {}, pop() {}, coin() {}, swipe() {}, jump() {} },
  burst() {},
};

const INPUTS: InputEvent[] = [
  { type: "tap", x: 180, y: 300 },
  { type: "tap", x: 60, y: 500 },
  { type: "swipe", dir: "up", x: 180, y: 320 },
  { type: "swipe", dir: "left", x: 180, y: 320 },
  { type: "swipe", dir: "right", x: 180, y: 320 },
  { type: "swipe", dir: "down", x: 180, y: 320 },
];

const ALL: MicrogameDef[] = [
  ...MICROGAMES,
  ...BOSS_GAMES.map((b) => ({ id: b.id, genre: "action" as const, make: b.make })),
];

describe("microgames lifecycle", () => {
  it("registry has a healthy number of games", () => {
    expect(MICROGAMES.length).toBeGreaterThanOrEqual(50);
    expect(BOSS_GAMES.length).toBeGreaterThanOrEqual(1);
  });

  for (const def of ALL) {
    it(`${def.id}: init/update/render/input never throws`, () => {
      const ctx = stubCtx();
      const g: Microgame = def.make();
      expect(() => {
        g.init(api);
        for (let i = 0; i < 150; i++) {
          g.update(1 / 60);
          g.render(ctx);
        }
      }).not.toThrow();
      // 各入力（別インスタンス）でも例外なし
      for (const e of INPUTS) {
        const fresh = def.make();
        fresh.init(api);
        expect(() => {
          fresh.onInput(e);
          fresh.update(1 / 60);
          fresh.render(ctx);
        }).not.toThrow();
      }
      expect(typeof g.command).toBe("string");
      expect(g.command.length).toBeGreaterThan(0);
    });
  }
});

describe("characters + profile store", () => {
  it("has at least 8 distinct animals whose draw() never throws", async () => {
    const { CHARACTERS } = await import("../engine/characters");
    expect(CHARACTERS.length).toBeGreaterThanOrEqual(8);
    const ids = new Set(CHARACTERS.map((c) => c.id));
    expect(ids.size).toBe(CHARACTERS.length); // ID重複なし
    const ctx = stubCtx();
    for (const c of CHARACTERS) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(() => {
        c.draw(ctx, 60, 60, 22, {});
        c.draw(ctx, 60, 60, 22, { happy: false, look: -1 });
      }).not.toThrow();
    }
  });

  it("locks characters until enough coins, then unlocks & selects", async () => {
    const p = await import("../engine/profile");
    // 初期状態：コイン0、デフォルトはコスト0のキャラ
    expect(p.getCoins()).toBe(0);
    expect(p.getSelectedCharacter().cost).toBe(0);
    expect(p.isUnlocked(p.getSelectedId())).toBe(true);

    // コスト>0のキャラを探す（最初はロックされている）
    const { CHARACTERS } = await import("../engine/characters");
    const paid = CHARACTERS.filter((c) => c.cost > 0).sort((a, b) => a.cost - b.cost);
    expect(paid.length).toBeGreaterThan(0);
    const target = paid[paid.length - 1]; // 一番高いキャラ
    expect(p.isUnlocked(target.id)).toBe(false);
    expect(p.setSelectedCharacterId(target.id)).toBe(false); // ロック中は選べない

    // コインをためるとアンロックされ、選べるようになる
    const newly = p.addCoins(target.cost);
    expect(newly.map((c) => c.id)).toContain(target.id);
    expect(p.isUnlocked(target.id)).toBe(true);
    expect(p.setSelectedCharacterId(target.id)).toBe(true);
    expect(p.getSelectedId()).toBe(target.id);

    // すでにアンロック済みなら再度たしても新規アンロックは無し
    expect(p.addCoins(1)).toEqual([]);
  });
});

// 常に即クリア／即ミスするスタブで、エンジンの遷移を検証
function stubDef(id: string, result: "cleared" | "failed"): MicrogameDef {
  return {
    id,
    genre: "action",
    make: () => ({
      command: "test",
      timeoutResult: "fail",
      status: "playing",
      init() {},
      update() {
        this.status = result;
      },
      render() {},
      onInput() {},
    }),
  };
}
const stubBoss: BossDef[] = [
  {
    id: "boss",
    make: () => ({
      command: "boss",
      timeoutResult: "fail",
      status: "playing",
      init() {},
      update() {
        this.status = "cleared";
      },
      render() {},
      onInput() {},
    }),
  },
];

describe("GameEngine progression", () => {
  beforeAll(() => {
    // window.AudioContext が無いので音声は自動的に no-op になる
    (globalThis as unknown as { window?: unknown }).window ??= {};
  });

  it("levels up, spawns a boss, tracks combo (all-clear)", async () => {
    const { GameEngine } = await import("../engine/GameEngine");
    const eng = new GameEngine([stubDef("a", "cleared")], stubBoss, { onGameOver() {} });
    eng.start();
    let sawBoss = false;
    let maxCombo = 0;
    let maxLevel = 1;
    for (let i = 0; i < 3000; i++) {
      eng.update(0.05);
      const s = eng.debugState();
      if (s.boss && s.phase === "play") sawBoss = true;
      maxCombo = Math.max(maxCombo, s.combo);
      maxLevel = Math.max(maxLevel, s.level);
    }
    expect(sawBoss).toBe(true);
    expect(maxLevel).toBeGreaterThan(1);
    expect(maxCombo).toBeGreaterThan(3);
  });

  it("ends in game over after enough misses (all-miss)", async () => {
    const { GameEngine } = await import("../engine/GameEngine");
    const eng = new GameEngine([stubDef("a", "failed")], stubBoss, { onGameOver() {} });
    eng.start();
    let over = false;
    for (let i = 0; i < 2000; i++) {
      eng.update(0.05);
      if (eng.debugState().phase === "gameover") {
        over = true;
        break;
      }
    }
    expect(over).toBe(true);
    expect(eng.debugState().lives).toBe(0);
  });
});
