import Mascot from "./Mascot";
import type { AnimalCharacter } from "../engine/characters";

interface Props {
  score: number;
  highScore: number;
  isNewRecord: boolean;
  /** このプレイであらたにアンロックしたどうぶつ */
  unlocked: AnimalCharacter[];
  onRetry: () => void;
  onTitle: () => void;
}

export default function GameOverScreen({
  score,
  highScore,
  isNewRecord,
  unlocked,
  onRetry,
  onTitle,
}: Props) {
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
      {unlocked.length > 0 && (
        <div className="unlock-banner">
          🎁 あたらしいどうぶつ！
          <div className="unlock-row">
            {unlocked.map((c) => (
              <span key={c.id} className="unlock-chip">
                <Mascot characterId={c.id} size={44} />
                {c.name}
              </span>
            ))}
          </div>
        </div>
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
