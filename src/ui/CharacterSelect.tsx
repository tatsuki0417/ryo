import { useState } from "react";
import Mascot from "./Mascot";
import { CHARACTERS } from "../engine/characters";
import {
  buyCharacter,
  getCoins,
  getSelectedId,
  isUnlocked,
  setSelectedCharacterId,
} from "../engine/profile";
import { sfx, unlockAudio } from "../engine/audio";

interface Props {
  onBack: () => void;
}

// きせかえ画面。えらんだどうぶつは全ゲームの分身に反映される。
// 🔒のどうぶつは タップして コインでこうかん(購入)するとアンロックされる。
export default function CharacterSelect({ onBack }: Props) {
  const [selId, setSelId] = useState(getSelectedId());
  const [coins, setCoins] = useState(getCoins());
  const [msg, setMsg] = useState<string>("");

  const choose = (id: string): void => {
    unlockAudio();
    if (isUnlocked(id)) {
      // もう持っている → えらぶ
      setSelectedCharacterId(id);
      setSelId(id);
      setMsg("");
      sfx.coin();
      return;
    }
    // 持っていない → コインでこうかん
    if (buyCharacter(id)) {
      setSelectedCharacterId(id);
      setSelId(id);
      setCoins(getCoins());
      setMsg("こうかんできた！ 🎉");
      sfx.good();
    } else {
      setMsg("コインが たりないよ 🪙");
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
          const affordable = coins >= c.cost;
          return (
            <button
              key={c.id}
              className={`char-cell${sel ? " sel" : ""}${unlocked ? "" : " locked"}`}
              onClick={() => choose(c.id)}
              aria-label={unlocked ? c.name : `${c.name}（🪙${c.cost}でこうかん）`}
            >
              <Mascot characterId={c.id} size={62} />
              <span className="char-name">{c.name}</span>
              {sel && <span className="char-badge">えらんでる</span>}
              {!unlocked && (
                <span className={`lock${affordable ? " ok" : ""}`}>🪙 {c.cost}</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="select-note">
        {msg || "🔒のどうぶつは タップして コインでこうかん！"}
      </p>
      <button className="btn" onClick={onBack}>
        もどる
      </button>
    </div>
  );
}
