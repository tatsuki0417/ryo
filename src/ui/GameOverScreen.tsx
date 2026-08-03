import { useState } from "react";
import Mascot from "./Mascot";
import { REWARD_COINS, showRewardedAd } from "../engine/ads";
import { addCoins } from "../engine/profile";
import { unlockAudio, sfx } from "../engine/audio";

interface Props {
  score: number;
  highScore: number;
  isNewRecord: boolean;
  /** リワードでコインが増えたときに呼ぶ（タイトルの残高更新用） */
  onReward?: () => void;
  onRetry: () => void;
  onTitle: () => void;
}

type AdState = "idle" | "watching" | "done";

export default function GameOverScreen({
  score,
  highScore,
  isNewRecord,
  onReward,
  onRetry,
  onTitle,
}: Props) {
  const [adState, setAdState] = useState<AdState>("idle");

  const watchAd = async (): Promise<void> => {
    if (adState !== "idle") return;
    unlockAudio();
    setAdState("watching");
    const ok = await showRewardedAd();
    if (ok) {
      addCoins(REWARD_COINS);
      onReward?.();
      sfx.coin();
      setAdState("done");
    } else {
      setAdState("idle");
    }
  };

  return (
    <div className="overlay">
      <Mascot className="mascot" size={84} />
      <h2>ゲームオーバー</h2>
      <div className="score-line">
        スコア
        <span className="big">{score}</span>
      </div>
      {isNewRecord ? (
        <div className="new-record">ハイスコア更新！ 🎉</div>
      ) : (
        <div className="hi">ハイスコア {highScore}</div>
      )}
      <div className="coin-earn">🪙 コインを {score} まいゲット！</div>

      {adState === "done" ? (
        <div className="coin-earn">🎁 ボーナス 🪙+{REWARD_COINS} ゲット！</div>
      ) : (
        <button className="btn reward" onClick={watchAd} disabled={adState === "watching"}>
          {adState === "watching" ? "みています… 📺" : `🎬 動画をみて 🪙+${REWARD_COINS}`}
        </button>
      )}

      <button className="btn" onClick={onRetry}>
        もういちど
      </button>
      <button className="btn secondary" onClick={onTitle}>
        タイトルへ
      </button>
    </div>
  );
}
