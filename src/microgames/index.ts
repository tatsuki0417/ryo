import type { BossDef, Genre, Microgame, MicrogameDef } from "../engine/types";
import { CollectTargets } from "./CollectTargets";
import { DodgeObstacle } from "./DodgeObstacle";
import { JudgeColor } from "./JudgeColor";
import { SwipeArrow } from "./SwipeArrow";
import { TapFalling } from "./TapFalling";
import { TimingBar } from "./TimingBar";
import {
  AvoidBomb,
  BigButton,
  DontTap,
  PopBalloon,
  TapMash,
  TapReaction,
  TapSequence,
  WhackMole,
} from "./tap";
import { CleanScreen, JumpOver, OppositeSwipe, SliceFruit, SwatFlies, SwipeTwo } from "./swipe";
import { FillStop, StopNeedle, TrafficGo } from "./timing";
import { BiggerShape, CountTap, MathTrueFalse, OddOneOut, PickColor } from "./judge";
import { CatchBasket, FeedPet, PopStars, Soccer } from "./collect";
import { GoodBadFalling, MemoryFlash, SwatTap, TapMovingOnce } from "./tap2";
import { ArrowRush, DodgeBeam, SlingAim } from "./swipe2";
import { FlappyTap, PumpBalloon } from "./timing2";
import { HigherNumber, RockPaperScissors, Stroop } from "./judge2";
import {
  AlphabetOrder,
  ColorSampleMatch,
  CountMore,
  HiraganaFind,
  MathPick,
  NumberOrder,
  ShapeMatch,
} from "./learn";
import { BossArrowStorm, BossSurvive, BossWhackRush } from "./boss";

function def(id: string, genre: Genre, make: () => Microgame): MicrogameDef {
  return { id, genre, make };
}

// 全ミニゲームのレジストリ。ここに1行追加するだけで出題ローテーションに加わる。
export const MICROGAMES: MicrogameDef[] = [
  // --- 元祖6種 ---
  def("tap-falling", "action", () => new TapFalling()),
  def("swipe-arrow", "reflex", () => new SwipeArrow()),
  def("timing-bar", "timing", () => new TimingBar()),
  def("dodge-obstacle", "reflex", () => new DodgeObstacle()),
  def("collect-targets", "collect", () => new CollectTargets()),
  def("judge-color", "judge", () => new JudgeColor()),
  // --- タップ系 ---
  def("tap-reaction", "timing", () => new TapReaction()),
  def("whack-mole", "action", () => new WhackMole()),
  def("tap-mash", "action", () => new TapMash()),
  def("avoid-bomb", "judge", () => new AvoidBomb()),
  def("pop-balloon", "action", () => new PopBalloon()),
  def("big-button", "action", () => new BigButton()),
  def("dont-tap", "reflex", () => new DontTap()),
  def("tap-sequence", "judge", () => new TapSequence()),
  // --- スワイプ系 ---
  def("slice-fruit", "reflex", () => new SliceFruit()),
  def("swat-flies", "action", () => new SwatFlies()),
  def("jump-over", "reflex", () => new JumpOver()),
  def("swipe-two", "reflex", () => new SwipeTwo()),
  def("clean-screen", "action", () => new CleanScreen()),
  def("opposite-swipe", "judge", () => new OppositeSwipe()),
  // --- タイミング系 ---
  def("stop-needle", "timing", () => new StopNeedle()),
  def("traffic-go", "timing", () => new TrafficGo()),
  def("fill-stop", "timing", () => new FillStop()),
  // --- 判断/クイズ系 ---
  def("bigger-shape", "judge", () => new BiggerShape()),
  def("odd-one-out", "judge", () => new OddOneOut()),
  def("math-tf", "judge", () => new MathTrueFalse()),
  def("count-tap", "judge", () => new CountTap()),
  def("pick-color", "judge", () => new PickColor()),
  // --- 収集/スポーツ系 ---
  def("catch-basket", "collect", () => new CatchBasket()),
  def("feed-pet", "collect", () => new FeedPet()),
  def("soccer", "reflex", () => new Soccer()),
  def("pop-stars", "collect", () => new PopStars()),
  // --- 追加バッチ ---
  def("tap-moving-once", "action", () => new TapMovingOnce()),
  def("good-bad-falling", "action", () => new GoodBadFalling()),
  def("memory-flash", "judge", () => new MemoryFlash()),
  def("swat-tap", "action", () => new SwatTap()),
  def("arrow-rush", "reflex", () => new ArrowRush()),
  def("sling-aim", "reflex", () => new SlingAim()),
  def("dodge-beam", "reflex", () => new DodgeBeam()),
  def("pump-balloon", "timing", () => new PumpBalloon()),
  def("flappy-tap", "timing", () => new FlappyTap()),
  def("rock-paper-scissors", "judge", () => new RockPaperScissors()),
  def("higher-number", "judge", () => new HigherNumber()),
  def("stroop", "judge", () => new Stroop()),
  // --- 知育（子ども向け学習）系 ---
  def("hiragana-find", "learn", () => new HiraganaFind()),
  def("count-more", "learn", () => new CountMore()),
  def("add-pick", "learn", () => new MathPick(false)),
  def("sub-pick", "learn", () => new MathPick(true)),
  def("shape-match", "learn", () => new ShapeMatch()),
  def("color-match", "learn", () => new ColorSampleMatch()),
  def("number-order", "learn", () => new NumberOrder()),
  def("alphabet-order", "learn", () => new AlphabetOrder()),
];

// ボスゲーム（数レベルごとに1本）
export const BOSS_GAMES: BossDef[] = [
  { id: "boss-arrow-storm", make: () => new BossArrowStorm() },
  { id: "boss-whack-rush", make: () => new BossWhackRush() },
  { id: "boss-survive", make: () => new BossSurvive() },
];
