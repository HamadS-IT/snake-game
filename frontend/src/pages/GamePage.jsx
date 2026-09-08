import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import GameCanvas from "../game/GameCanvas";
import NavBar from "../components/NavBar";
import { api } from "../api/client";
import { isPowered } from "../game/engine/loop.js";
import { POWER_MODE_DURATION_MS } from "../game/engine/constants.js";
import { useIsMobile } from "../hooks/useIsMobile";

export default function GamePage() {
  const isMobile = useIsMobile();
  const [roundId, setRoundId] = useState(0);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [hud, setHud] = useState({ score: 0, level: 1, powerPct: 0 });

  const liveStateRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = liveStateRef.current;
      if (!state) return;
      const now = performance.now();
      const powered = isPowered(state, now);
      const remaining = powered ? state.powerModeUntil - now : 0;
      setHud({
        score: state.score,
        level: state.level,
        powerPct: powered ? Math.max(0, Math.min(1, remaining / POWER_MODE_DURATION_MS)) : 0,
      });
    }, 120);
    return () => clearInterval(interval);
  }, [roundId]);

  const handleGameOver = useCallback(async (score, level) => {
    setResult({ score, level, submitting: true });
    try {
      await api.submitScore(score, level);
      setResult({ score, level, submitting: false });
    } catch (err) {
      setSubmitError(err.message);
      setResult({ score, level, submitting: false });
    }
  }, []);

  function playAgain() {
    setResult(null);
    setSubmitError(null);
    setHud({ score: 0, level: 1, powerPct: 0 });
    setRoundId((id) => id + 1);
  }

  if (isMobile) {
    return (
      <div className="page">
        <NavBar active="game" />
        <div className="mobile-block">
          <span className="mobile-block-icon">🖥️</span>
          <h2>Desktop Only</h2>
          <p className="muted">
            Snake needs a keyboard and a bigger screen to play properly.
            Switch to a desktop or laptop browser to jump in — the
            leaderboard works great here in the meantime.
          </p>
          <Link to="/leaderboard">
            <button className="btn-primary">View Leaderboard</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">
      <div className="game-shell">
        <aside className="game-sidebar">
          <NavBar active="game" />

          <div className="hud-stack">
            <div className="hud-chip">
              <span className="hud-label">Score</span>
              <span className="hud-value">{hud.score}</span>
            </div>
            <div className="hud-chip">
              <span className="hud-label">Level</span>
              <span className="hud-value">{hud.level}</span>
            </div>
            <div className={`hud-power ${hud.powerPct > 0 ? "active" : ""}`}>
              <span className="hud-label">Power Mode</span>
              <div className="hud-power-track">
                <div className="hud-power-fill" style={{ width: `${hud.powerPct * 100}%` }} />
              </div>
            </div>
          </div>

          <p className="hint">Arrow keys / WASD to move</p>
        </aside>

        <div className="game-main">
          <div className="game-arena">
            <GameCanvas key={roundId} onGameOver={handleGameOver} liveStateRef={liveStateRef} />

            {result && (
              <div className="modal-backdrop">
                <div className="modal-card">
                  <h2>Game Over</h2>
                  <div className="modal-stats">
                    <div>
                      <span className="modal-stat-value">{result.score}</span>
                      <span className="modal-stat-label">Score</span>
                    </div>
                    <div>
                      <span className="modal-stat-value">{result.level}</span>
                      <span className="modal-stat-label">Level</span>
                    </div>
                  </div>
                  {result.submitting && <p className="muted">Saving score...</p>}
                  {submitError && <p className="error">Failed to save score: {submitError}</p>}
                  <div className="modal-actions">
                    <button className="btn-primary" onClick={playAgain}>
                      Play Again
                    </button>
                    <Link to="/leaderboard">
                      <button className="btn-secondary">View Leaderboard</button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
