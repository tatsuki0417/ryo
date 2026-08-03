import Mascot from "./Mascot";
import { getSelectedId, type DailyBonus } from "../engine/profile";
import { CHARACTERS } from "../engine/characters";

interface Props {
  highScore: number;
  coins: number;
  bonus?: DailyBonus | null;
  onStart: () => void;
  onCustomize: () => void;
}

export default function TitleScreen({ highScore, coins, bonus, onStart, onCustomize }: Props) {
  // 中央はいま選んでいるどうぶつ。両どなりはちがうどうぶつをそえて にぎやかに。
  const selId = getSelectedId();
  const others = CHARACTERS.filter((c) => c.id !== selId).slice(0, 2);

  return (
    <div className="overlay">
      <div className="mascot-row">
        <Mascot className="mascot bounce delay" characterId={others[0]?.id} size={64} />
        <Mascot className="mascot bounce" characterId={selId} size={92} />
        <Mascot className="mascot bounce delay2" characterId={others[1]?.id} size={70} />
      </div>
      <h1>ミニゲー祭り</h1>
      <p className="sub">
        テンポよく出題される
        <br />
        オールジャンル<strong>50種類以上</strong>の
        <br />
        ミニゲーム集！
      </p>
      <div className="title-stats">
        {highScore > 0 && <span className="hi">ハイスコア {highScore}</span>}
        <span className="coin-wallet">🪙 {coins}</span>
      </div>
      {bonus && bonus.amount > 0 && (
        <div className="bonus-banner">
          🎁 {bonus.first ? "はじめてボーナス" : "ログインボーナス"} 🪙+{bonus.amount}！
        </div>
      )}
      <button className="btn" onClick={onStart}>
        スタート
      </button>
      <button className="btn secondary" onClick={onCustomize}>
        きせかえ 🐾
      </button>
      <div className="hint-list">
        タップ・スワイプで操作
        <br />
        指示どおりに、すばやく反応しよう
      </div>
    </div>
  );
}
