import { randomEmptyCell } from "./gameState.js";
import {
  POWER_FOOD_MIN_SCORE,
  POWER_FOOD_SPAWN_CHANCE,
  POWER_FOOD_EXPIRE_MS,
  pickRandomOtherColorIndex,
} from "./constants.js";

export function respawnFood(state) {
  const cell = randomEmptyCell(state);
  state.food = { ...cell, colorIndex: pickRandomOtherColorIndex(state.snake.colorIndex) };
}

export function maybeSpawnPowerFood(state, now) {
  if (state.powerFood) {
    if (now - state.powerFoodSpawnedAt > POWER_FOOD_EXPIRE_MS) {
      state.powerFood = null;
    }
    return;
  }
  if (state.score < POWER_FOOD_MIN_SCORE) return;
  if (Math.random() >= POWER_FOOD_SPAWN_CHANCE) return;

  state.powerFood = randomEmptyCell(state);
  state.powerFoodSpawnedAt = now;
}
