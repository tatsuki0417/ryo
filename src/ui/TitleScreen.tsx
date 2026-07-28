interface Props {
  highScore: number;
  onStart: () => void;
}

export default function TitleScreen({ highScore, onStart }: Props) {
  return (
    <div className="overlay">
      <h1>ミニゲー祭り</h1>
      <p className="sub">
        テンポよく出題される
        <br />
        オールジャンルのミニゲーム集！
      </p>
      {highScore > 0 && <div className="hi">ハイスコア {highScore}</div>}
      <button className="btn" onClick={onStart}>
        スタート
      </button>
      <div className="hint-list">
        タップ・スワイプで操作
        <br />
        指示どおりに、すばやく反応しよう
      </div>
    </div>
  );
}
