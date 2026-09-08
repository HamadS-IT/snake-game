import {
  PALETTE,
  FOOD_POINTS,
  POWER_FOOD_BONUS,
  ENEMY_KILL_BONUS,
  POWER_MODE_DURATION_MS,
  EFFECT_LIFETIME_MS,
  levelForScore,
  enemyCountForScore,
  obstaclesForLevel,
  wrapPosition,
} from "./constants.js";
import { respawnFood, maybeSpawnPowerFood } from "./food.js";
import { maybeSpawnEnemies, stepEnemies, removeEnemy } from "./enemies.js";
import { applyPendingDirection, computeHead, hitsCell, moveSnakeTo } from "./snake.js";

function sameCell(a, b) {
  return !!a && !!b && a.x === b.x && a.y === b.y;
}

export function isPowered(state, now) {
  return now < state.powerModeUntil;
}

function addEffect(state, cell, color, now, kind = "burst") {
  state.effects.push({ x: cell.x, y: cell.y, color, bornAt: now, kind });
}

export function tick(state, now) {
  const { snake } = state;

  snake.prevBody = snake.body;
  applyPendingDirection(snake);
  const head = wrapPosition(computeHead(snake));

  if (hitsCell(head, state.obstacles)) {
    state.gameOver = true;
    return state;
  }

  const ateFood = sameCell(head, state.food);
  const atePowerFood = sameCell(head, state.powerFood);

  const bodyToCheck = ateFood ? snake.body : snake.body.slice(0, -1);
  if (hitsCell(head, bodyToCheck)) {
    state.gameOver = true;
    return state;
  }

  const powered = isPowered(state, now);
  for (const enemy of state.enemies) {
    if (hitsCell(head, enemy.body)) {
      if (powered) {
        addEffect(state, enemy.body[0], "#ffffff", now, "kill");
        removeEnemy(state, enemy.id);
        state.score += ENEMY_KILL_BONUS;
      } else {
        state.gameOver = true;
        return state;
      }
    }
  }

  moveSnakeTo(snake, head, ateFood);

  if (ateFood) {
    const eatenColor = PALETTE[state.food.colorIndex % PALETTE.length];
    state.score += FOOD_POINTS;
    snake.colorIndex = state.food.colorIndex;
    addEffect(state, state.food, eatenColor, now, "food");
    respawnFood(state);
  }

  if (atePowerFood) {
    state.powerModeUntil = now + POWER_MODE_DURATION_MS;
    state.score += POWER_FOOD_BONUS;
    addEffect(state, state.powerFood, "#ffd700", now, "power");
    state.powerFood = null;
  }

  state.effects = state.effects.filter((e) => now - e.bornAt < EFFECT_LIFETIME_MS);

  stepEnemies(state);

  const newLevel = levelForScore(state.score);
  if (newLevel !== state.level) {
    state.level = newLevel;
    const occupied = new Set(
      [...state.snake.body, state.food, state.powerFood]
        .filter(Boolean)
        .map((c) => `${c.x},${c.y}`)
    );
    state.obstacles = obstaclesForLevel(newLevel).filter(
      (o) => !occupied.has(`${o.x},${o.y}`)
    );
  }

  maybeSpawnEnemies(state, enemyCountForScore(state.score));
  maybeSpawnPowerFood(state, now);

  return state;
}
