import { randomEmptyCell } from "./gameState.js";
import { wrapPosition } from "./constants.js";
import { hitsCell } from "./snake.js";

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const ENEMY_LENGTH = 3;

export function spawnEnemy(state) {
  const spawnCell = randomEmptyCell(state, state.snake.body[0]);
  const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
  const body = [];
  for (let i = 0; i < ENEMY_LENGTH; i++) {
    body.push({ x: spawnCell.x - dir.x * i, y: spawnCell.y - dir.y * i });
  }
  return {
    id: state.nextEnemyId++,
    body,
    prevBody: body,
    dir,
    ticksPerMove: Math.random() < 0.5 ? 1 : 2,
    tickCounter: 0,
  };
}

export function maybeSpawnEnemies(state, targetCount) {
  while (state.enemies.length < targetCount) {
    state.enemies.push(spawnEnemy(state));
  }
}

function isValidEnemyMove(state, enemy, cell, allEnemies) {
  if (hitsCell(cell, state.obstacles)) return false;
  if (hitsCell(cell, enemy.body.slice(0, -1))) return false;
  for (const other of allEnemies) {
    if (other === enemy) continue;
    if (hitsCell(cell, other.body)) return false;
  }
  return true;
}

function chooseDirection(state, enemy) {
  const head = enemy.body[0];
  const reverse = { x: -enemy.dir.x, y: -enemy.dir.y };

  const candidates = DIRS.filter((d) => !(d.x === reverse.x && d.y === reverse.y)).filter((d) =>
    isValidEnemyMove(state, enemy, wrapPosition({ x: head.x + d.x, y: head.y + d.y }), state.enemies)
  );

  if (candidates.length === 0) {
    const revCell = wrapPosition({ x: head.x + reverse.x, y: head.y + reverse.y });
    if (isValidEnemyMove(state, enemy, revCell, state.enemies)) return reverse;
    return enemy.dir;
  }

  const straightStillValid = candidates.some(
    (d) => d.x === enemy.dir.x && d.y === enemy.dir.y
  );
  if (straightStillValid && Math.random() < 0.7) return enemy.dir;

  if (Math.random() < 0.4) {
    const playerHead = state.snake.body[0];
    let best = candidates[0];
    let bestDist = Infinity;
    for (const d of candidates) {
      const cell = wrapPosition({ x: head.x + d.x, y: head.y + d.y });
      const dist = Math.abs(cell.x - playerHead.x) + Math.abs(cell.y - playerHead.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function stepEnemies(state) {
  for (const enemy of state.enemies) {
    enemy.tickCounter++;
    enemy.prevBody = enemy.body;
    if (enemy.tickCounter < enemy.ticksPerMove) continue;
    enemy.tickCounter = 0;

    enemy.dir = chooseDirection(state, enemy);
    const head = wrapPosition({ x: enemy.body[0].x + enemy.dir.x, y: enemy.body[0].y + enemy.dir.y });
    enemy.body = [head, ...enemy.body];
    enemy.body.pop();
  }
}

export function removeEnemy(state, enemyId) {
  state.enemies = state.enemies.filter((e) => e.id !== enemyId);
}
