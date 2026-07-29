import type { Microgame, MicrogameDef } from "../engine/types";
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
import {
  CleanScreen,
  JumpOver,
  OppositeSwipe,
  SliceFruit,
  SwatFlies,
  SwipeTwo,
} from "./swipe";
import { FillStop, StopNeedle, TrafficGo } from "./timing";
import { BiggerShape, CountTap, MathTrueFalse, OddOneOut, PickColor } from "./judge";
import { CatchBasket, FeedPet, PopStars, Soccer } from "./collect";

function def(id: string, make: () => Microgame): MicrogameDef {
  return { id, make };
}

// 全ミニゲームのレジストリ。ここに1行追加するだけで出題ローテーションに加わる。
export const MICROGAMES: MicrogameDef[] = [
  // --- 元祖6種 ---
  def("tap-falling", () => new TapFalling()),
  def("swipe-arrow", () => new SwipeArrow()),
  def("timing-bar", () => new TimingBar()),
  def("dodge-obstacle", () => new DodgeObstacle()),
  def("collect-targets", () => new CollectTargets()),
  def("judge-color", () => new JudgeColor()),
  // --- タップ系 ---
  def("tap-reaction", () => new TapReaction()),
  def("whack-mole", () => new WhackMole()),
  def("tap-mash", () => new TapMash()),
  def("avoid-bomb", () => new AvoidBomb()),
  def("pop-balloon", () => new PopBalloon()),
  def("big-button", () => new BigButton()),
  def("dont-tap", () => new DontTap()),
  def("tap-sequence", () => new TapSequence()),
  // --- スワイプ系 ---
  def("slice-fruit", () => new SliceFruit()),
  def("swat-flies", () => new SwatFlies()),
  def("jump-over", () => new JumpOver()),
  def("swipe-two", () => new SwipeTwo()),
  def("clean-screen", () => new CleanScreen()),
  def("opposite-swipe", () => new OppositeSwipe()),
  // --- タイミング系 ---
  def("stop-needle", () => new StopNeedle()),
  def("traffic-go", () => new TrafficGo()),
  def("fill-stop", () => new FillStop()),
  // --- 判断/クイズ系 ---
  def("bigger-shape", () => new BiggerShape()),
  def("odd-one-out", () => new OddOneOut()),
  def("math-tf", () => new MathTrueFalse()),
  def("count-tap", () => new CountTap()),
  def("pick-color", () => new PickColor()),
  // --- 収集/スポーツ系 ---
  def("catch-basket", () => new CatchBasket()),
  def("feed-pet", () => new FeedPet()),
  def("soccer", () => new Soccer()),
  def("pop-stars", () => new PopStars()),
];
