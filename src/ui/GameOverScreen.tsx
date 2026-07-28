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
      <button className="btn" onClick={onRetry}>
        もういちど
      </button>
      <button className="btn secondary" onClick={onTitle}>
        タイトルへ
      </button>
    </div>
  );
}
