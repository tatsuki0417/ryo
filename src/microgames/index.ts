import type { MicrogameDef } from "../engine/types";
import { CollectTargets } from "./CollectTargets";
import { DodgeObstacle } from "./DodgeObstacle";
import { JudgeColor } from "./JudgeColor";
import { SwipeArrow } from "./SwipeArrow";
import { TapFalling } from "./TapFalling";
import { TimingBar } from "./TimingBar";

// 全ミニゲームのレジストリ。ここに1行追加するだけで出題に加わる。
export const MICROGAMES: MicrogameDef[] = [
  { id: "tap-falling", make: () => new TapFalling() },
  { id: "swipe-arrow", make: () => new SwipeArrow() },
  { id: "timing-bar", make: () => new TimingBar() },
  { id: "dodge-obstacle", make: () => new DodgeObstacle() },
  { id: "collect-targets", make: () => new CollectTargets() },
  { id: "judge-color", make: () => new JudgeColor() },
];
