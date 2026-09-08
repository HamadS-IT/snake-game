export const GRID_W = 32;
export const GRID_H = 22;

// The canvas is sized to fill its container (see GameCanvas.jsx), so the
// cell size is computed at runtime from the available space rather than
// fixed. These bounds keep it from becoming illegibly small or absurdly
// large on very small or ultra-wide screens.
export const MIN_CELL_SIZE = 16;
export const MAX_CELL_SIZE = 44;

export function computeCellSize(availableWidth, availableHeight) {
  const fit = Math.floor(Math.min(availableWidth / GRID_W, availableHeight / GRID_H));
  return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, fit));
}

// The arena is a torus: going off one edge brings you back on the opposite
// edge, for both the player snake and enemy snakes. Only obstacles and
// bodies are fatal to collide with.
export function wrapPosition(pos) {
  return {
    x: ((pos.x % GRID_W) + GRID_W) % GRID_W,
    y: ((pos.y % GRID_H) + GRID_H) % GRID_H,
  };
}

// Sourced from Color Hunt's curated "neon" / "neon black white" palettes:
// colorhunt.co/palettes/neon and colorhunt.co/palettes/neon-black-white
export const PALETTE = [
  "#08CB00",
  "#43D8C9",
  "#FF0B55",
  "#9929EA",
  "#FFEB00",
  "#FF5F5F",
];

export const EFFECT_LIFETIME_MS = 500;

// Picks a palette color for the next food spawn, different from the snake's
// current color so eating it always produces a visible color change.
export function pickRandomOtherColorIndex(excludeIndex) {
  if (PALETTE.length <= 1) return 0;
  let idx;
  do {
    idx = Math.floor(Math.random() * PALETTE.length);
  } while (idx === excludeIndex);
  return idx;
}

// Lower base tick = snappier movement and less perceived input lag (a
// direction change can only take effect at the next tick boundary, so tick
// length is effectively the worst-case delay between a keypress and a turn).
export const BASE_TICK_MS = 100;
export const MIN_TICK_MS = 40;
export const TICK_STEP_PER_LEVEL = 6;

export const FOOD_POINTS = 10;
export const POWER_FOOD_BONUS = 5;
export const ENEMY_KILL_BONUS = 50;

export const POWER_MODE_DURATION_MS = 6000;
export const POWER_FOOD_MIN_SCORE = 30;
export const POWER_FOOD_SPAWN_CHANCE = 0.006;
export const POWER_FOOD_EXPIRE_MS = 8000;

export const ENEMY_MAX_COUNT = 6;
export const ENEMY_MIN_SCORE = 50;
export const ENEMY_SCORE_STEP = 200;

export const LEVEL_SCORE_STEP = 100;
export const OBSTACLE_LEVEL_STEP = 3;

export function levelForScore(score) {
  return 1 + Math.floor(score / LEVEL_SCORE_STEP);
}

export function getTickIntervalMs(level) {
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - (level - 1) * TICK_STEP_PER_LEVEL);
}

export function enemyCountForScore(score) {
  if (score < ENEMY_MIN_SCORE) return 0;
  const extra = Math.floor((score - ENEMY_MIN_SCORE) / ENEMY_SCORE_STEP);
  return Math.min(ENEMY_MAX_COUNT, 1 + extra);
}

// Deterministic obstacle pattern: every OBSTACLE_LEVEL_STEP levels adds one
// symmetric pair of wall segments, positioned away from the board edges and
// center spawn area so the player always has room to move.
export function obstaclesForLevel(level) {
  const pairs = Math.floor(level / OBSTACLE_LEVEL_STEP);
  const obstacles = [];
  const midY = Math.floor(GRID_H / 2);

  for (let i = 0; i < pairs; i++) {
    const offset = 3 + i * 3;
    const y = (midY + offset) % GRID_H;
    const segLen = 4;
    for (let dx = 0; dx < segLen; dx++) {
      obstacles.push({ x: 4 + dx, y });
      obstacles.push({ x: GRID_W - 5 - dx, y });
    }
  }
  return obstacles;
}
