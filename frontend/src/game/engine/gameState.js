import { GRID_W, GRID_H, PALETTE, pickRandomOtherColorIndex } from "./constants.js";

export function createInitialState() {
  const startX = Math.floor(GRID_W / 4);
  const startY = Math.floor(GRID_H / 2);

  const initialBody = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];

  const state = {
    snake: {
      body: initialBody,
      prevBody: initialBody,
      dir: { x: 1, y: 0 },
      pendingDir: { x: 1, y: 0 },
      colorIndex: 0,
    },
    enemies: [],
    food: null,
    powerFood: null,
    powerFoodSpawnedAt: 0,
    obstacles: [],
    effects: [],
    score: 0,
    level: 1,
    powerModeUntil: 0,
    gameOver: false,
    nextEnemyId: 1,
  };

  const foodCell = randomEmptyCell(state);
  state.food = { ...foodCell, colorIndex: pickRandomOtherColorIndex(state.snake.colorIndex) };
  return state;
}

export function occupiedCells(state) {
  const cells = [...state.snake.body, ...state.obstacles];
  for (const enemy of state.enemies) cells.push(...enemy.body);
  if (state.food) cells.push(state.food);
  if (state.powerFood) cells.push(state.powerFood);
  return cells;
}

export function randomEmptyCell(state, avoidNear = null) {
  const occupied = new Set(occupiedCells(state).map((c) => `${c.x},${c.y}`));
  let attempt = 0;
  while (attempt < 500) {
    const x = Math.floor(Math.random() * GRID_W);
    const y = Math.floor(Math.random() * GRID_H);
    attempt++;
    if (occupied.has(`${x},${y}`)) continue;
    if (avoidNear) {
      const dist = Math.abs(x - avoidNear.x) + Math.abs(y - avoidNear.y);
      if (dist < 6) continue;
    }
    return { x, y };
  }
  return { x: 0, y: 0 };
}

export function snakeColor(state) {
  return PALETTE[state.snake.colorIndex % PALETTE.length];
}
