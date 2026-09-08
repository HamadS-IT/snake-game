import { useEffect, useRef } from "react";
import { GRID_W, GRID_H, computeCellSize, getTickIntervalMs } from "./engine/constants.js";
import { createInitialState } from "./engine/gameState.js";
import { setDirection } from "./engine/snake.js";
import { tick } from "./engine/loop.js";
import { render } from "./render.js";

const KEY_TO_DIR = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

export default function GameCanvas({ onGameOver, liveStateRef }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const accumulatorRef = useRef(0);
  const lastTimeRef = useRef(null);
  const cellSizeRef = useRef(computeCellSize(640, 440));

  useEffect(() => {
    stateRef.current = createInitialState();
    if (liveStateRef) liveStateRef.current = stateRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function applySize() {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const cellSize = computeCellSize(wrap.clientWidth, wrap.clientHeight);
      cellSizeRef.current = cellSize;
      const w = GRID_W * cellSize;
      const h = GRID_H * cellSize;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    applySize();
    const resizeObserver = new ResizeObserver(applySize);
    if (wrapRef.current) resizeObserver.observe(wrapRef.current);

    function handleKeyDown(e) {
      const dir = KEY_TO_DIR[e.key];
      if (dir) {
        e.preventDefault();
        setDirection(stateRef.current.snake, dir);
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    function frame(timestamp) {
      const state = stateRef.current;
      if (lastTimeRef.current == null) lastTimeRef.current = timestamp;
      const dt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      accumulatorRef.current += dt;

      const tickMs = getTickIntervalMs(state.level);
      while (accumulatorRef.current >= tickMs && !state.gameOver) {
        tick(state, performance.now());
        accumulatorRef.current -= tickMs;
      }

      const alpha = state.gameOver ? 1 : Math.min(1, accumulatorRef.current / tickMs);
      render(ctx, state, performance.now(), alpha, cellSizeRef.current);

      if (!state.gameOver) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        onGameOver(state.score, state.level);
      }
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      resizeObserver.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="game-canvas-wrap">
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  );
}
