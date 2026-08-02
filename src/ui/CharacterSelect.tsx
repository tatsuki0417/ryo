import { useState } from "react";
import Mascot from "./Mascot";
import { CHARACTERS } from "../engine/characters";
import { getCoins, getSelectedId, isUnlocked, setSelectedCharacterId } from "../engine/profile";
import { sfx, unlockAudio } from "../engine/audio";

interface Props {
  onBack: () => void;
}

// きせかえ画面。えらんだどうぶつは全ゲームの分身に反映される。
// コインがたまるとロック(🔒)がはずれて えらべるようになる。
export default function CharacterSelect({ onBack }: Props) {
  const [selId, setSelId] = useState(getSelectedId());
  const coins = getCoins();

  const choose = (id: string): void => {
    unlockAudio();
    if (setSelectedCharacterId(id)) {
      setSelId(id);
      sfx.coin();
    } else {
      sfx.bad();
    }
  };

  return (
    <div className="overlay select-overlay">
      <h2>きせかえ</h2>
      <div className="coin-wallet big-wallet">🪙 {coins} まい</div>
      <div className="char-grid">
        {CHARACTERS.map((c) => {
          const unlocked = isUnlocked(c.id);
          const sel = c.id === selId;
          return (
            <button
              key={c.id}
              className={`char-cell${sel ? " sel" : ""}${unlocked ? "" : " locked"}`}
              onClick={() => choose(c.id)}
              aria-label={unlocked ? c.name : `${c.name}（ロック中）`}
            >
              <Mascot characterId={c.id} size={62} />
              <span className="char-name">{c.name}</span>
              {sel && <span className="char-badge">えらんでる</span>}
              {!unlocked && <span className="lock">🔒 {c.cost}</span>}
            </button>
          );
        })}
      </div>
      <p className="select-note">あそんでコインをためると えらべるどうぶつが ふえるよ！</p>
      <button className="btn" onClick={onBack}>
        もどる
      </button>
    </div>
  );
}
