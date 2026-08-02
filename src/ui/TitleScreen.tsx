import Mascot from "./Mascot";

interface Props {
  highScore: number;
  onStart: () => void;
}

export default function TitleScreen({ highScore, onStart }: Props) {
  return (
    <div className="overlay">
      <div className="mascot-row">
        <Mascot className="mascot bounce" color="#ffd63d" />
        <Mascot className="mascot bounce delay" color="#e94078" size={72} />
        <Mascot className="mascot bounce delay2" color="#39d98a" size={80} />
      </div>
      <h1>ミニゲー祭り</h1>
      <p className="sub">
        テンポよく出題される
        <br />
        オールジャンル<strong>50種類以上</strong>の
        <br />
        ミニゲーム集！
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
