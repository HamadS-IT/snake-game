export function setDirection(snake, dir) {
  // Reject direct 180-degree reversals; buffered and applied next tick.
  const isReverse = dir.x === -snake.dir.x && dir.y === -snake.dir.y;
  if (!isReverse) {
    snake.pendingDir = dir;
  }
}

export function applyPendingDirection(snake) {
  snake.dir = snake.pendingDir;
}

export function computeHead(snake) {
  const head = snake.body[0];
  return { x: head.x + snake.dir.x, y: head.y + snake.dir.y };
}

export function hitsCell(pos, cells) {
  return cells.some((cell) => cell.x === pos.x && cell.y === pos.y);
}

export function moveSnakeTo(snake, head, grew) {
  snake.body = [head, ...snake.body];
  if (!grew) snake.body.pop();
}
