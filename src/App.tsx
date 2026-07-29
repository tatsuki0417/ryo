import { useCallback, useState } from "react";
import GameCanvas from "./components/GameCanvas";
import TitleScreen from "./ui/TitleScreen";
import GameOverScreen from "./ui/GameOverScreen";
import { isMuted, setMuted, unlockAudio } from "./engine/audio";

type Screen = "title" | "playing" | "gameover";

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

  const toggleMute = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    setMutedState(next);
    unlockAudio();
  }, []);

  const start = useCallback(() => {
    unlockAudio();
    setIsNewRecord(false);
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
      setScreen("gameover");
    },
    [highScore]
  );

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
      {screen === "title" && <TitleScreen highScore={highScore} onStart={start} />}
      {screen === "gameover" && (
        <GameOverScreen
          score={score}
          highScore={highScore}
          isNewRecord={isNewRecord}
          onRetry={start}
          onTitle={() => setScreen("title")}
        />
      )}
    </div>
  );
}
