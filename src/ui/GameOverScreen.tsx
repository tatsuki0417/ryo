import Mascot from "./Mascot";

interface Props {
  score: number;
  highScore: number;
  isNewRecord: boolean;
  onRetry: () => void;
  onTitle: () => void;
}

export default function GameOverScreen({
  score,
  highScore,
  isNewRecord,
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
      <div className="select-note">ためたコインで「きせかえ」できるよ 🐾</div>
      <button className="btn" onClick={onRetry}>
        もういちど
      </button>
      <button className="btn secondary" onClick={onTitle}>
        タイトルへ
      </button>
    </div>
  );
}
