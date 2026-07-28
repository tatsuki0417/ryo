import { useCallback, useState } from "react";
import GameCanvas from "./components/GameCanvas";
import TitleScreen from "./ui/TitleScreen";
import GameOverScreen from "./ui/GameOverScreen";
import { unlockAudio } from "./engine/audio";

type Screen = "title" | "playing" | "gameover";

const HS_KEY = "minige-matsuri.highscore";

function loadHighScore(): number {
  const v = Number(localStorage.getItem(HS_KEY));
  return Number.isFinite(v) ? v : 0;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(loadHighScore);
  const [isNewRecord, setIsNewRecord] = useState(false);

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
        localStorage.setItem(HS_KEY, String(finalScore));
      }
      setIsNewRecord(record);
      setScreen("gameover");
    },
    [highScore]
  );

  return (
    <div className="stage">
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
