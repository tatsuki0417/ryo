import { useCallback, useState } from "react";
import GameCanvas from "./components/GameCanvas";
import TitleScreen from "./ui/TitleScreen";
import GameOverScreen from "./ui/GameOverScreen";
import CharacterSelect from "./ui/CharacterSelect";
import { isMuted, setMuted, unlockAudio } from "./engine/audio";
import { addCoins, getCoins } from "./engine/profile";
import type { AnimalCharacter } from "./engine/characters";

type Screen = "title" | "playing" | "gameover" | "select";

const HS_KEY = "minige-matsuri.highscore";

function loadHighScore(): number {
  try {
    const v = Number(localStorage.getItem(HS_KEY));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0; // ストレージが使えない環境（サンドボックス等）でも動くように
  }
}

function saveHighScore(v: number): void {
  try {
    localStorage.setItem(HS_KEY, String(v));
  } catch {
    /* 保存できなくてもゲームは続行 */
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(loadHighScore);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [coins, setCoins] = useState<number>(getCoins);
  const [newlyUnlocked, setNewlyUnlocked] = useState<AnimalCharacter[]>([]);

  const toggleMute = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    setMutedState(next);
    unlockAudio();
  }, []);

  const start = useCallback(() => {
    unlockAudio();
    setIsNewRecord(false);
    setNewlyUnlocked([]);
    setScreen("playing");
  }, []);

  const handleGameOver = useCallback(
    (finalScore: number) => {
      setScore(finalScore);
      const record = finalScore > highScore;
      if (record) {
        setHighScore(finalScore);
        saveHighScore(finalScore);
      }
      setIsNewRecord(record);
      // スコアぶんのコインをためて、あらたなアンロックがあれば祝う
      const unlocked = addCoins(finalScore);
      setCoins(getCoins());
      setNewlyUnlocked(unlocked);
      setScreen("gameover");
    },
    [highScore]
  );

  const openCustomize = useCallback(() => {
    unlockAudio();
    setScreen("select");
  }, []);

  const backToTitle = useCallback(() => {
    setCoins(getCoins());
    setScreen("title");
  }, []);

  return (
    <div className="stage">
      <button
        className="mute-btn"
        onClick={toggleMute}
        aria-label={muted ? "音を出す" : "消音する"}
      >
        {muted ? "🔇" : "🔊"}
      </button>
      {screen === "playing" && <GameCanvas onGameOver={handleGameOver} />}
      {screen === "title" && (
        <TitleScreen
          highScore={highScore}
          coins={coins}
          onStart={start}
          onCustomize={openCustomize}
        />
      )}
      {screen === "select" && <CharacterSelect onBack={backToTitle} />}
      {screen === "gameover" && (
        <GameOverScreen
          score={score}
          highScore={highScore}
          isNewRecord={isNewRecord}
          unlocked={newlyUnlocked}
          onRetry={start}
          onTitle={backToTitle}
        />
      )}
    </div>
  );
}
