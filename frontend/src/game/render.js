import { GRID_W, GRID_H, PALETTE, EFFECT_LIFETIME_MS } from "./engine/constants.js";
import { isPowered } from "./engine/loop.js";

// Set once per render() call from the caller's current cell size, so the
// arena can be resized to fill its container without touching game logic
// (which operates purely in grid-cell coordinates).
let CELL_SIZE = 24;

function centerOf(cell) {
  return { x: cell.x * CELL_SIZE + CELL_SIZE / 2, y: cell.y * CELL_SIZE + CELL_SIZE / 2 };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// A segment that just crossed the wrap-around edge would otherwise appear
// to streak across the whole canvas as it "interpolates" from one side to
// the other; detect that and snap straight to the final cell instead, fading
// it in over the tick so it materializes smoothly rather than popping in.
function interpolatedPoints(body, prevBody, alpha) {
  return body.map((cell, i) => {
    const prev = prevBody[i] || prevBody[prevBody.length - 1] || cell;
    const wrapped = Math.abs(cell.x - prev.x) > GRID_W / 2 || Math.abs(cell.y - prev.y) > GRID_H / 2;
    const gx = wrapped ? cell.x : lerp(prev.x, cell.x, alpha);
    const gy = wrapped ? cell.y : lerp(prev.y, cell.y, alpha);
    return {
      x: gx * CELL_SIZE + CELL_SIZE / 2,
      y: gy * CELL_SIZE + CELL_SIZE / 2,
      wrapped,
      fadeAlpha: wrapped ? alpha : 1,
    };
  });
}

function drawTaperedBody(ctx, points, color, minScale = 0.5) {
  const n = points.length;
  if (n < 2) return;
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  for (let i = n - 1; i > 0; i--) {
    // Leave a gap right at the seam instead of drawing a line clear across
    // the canvas between a point that just wrapped and its neighbor.
    if (points[i].wrapped || points[i - 1].wrapped) continue;
    const t = 1 - i / n;
    ctx.lineWidth = CELL_SIZE * (minScale + (1 - minScale) * t);
    ctx.beginPath();
    ctx.moveTo(points[i].x, points[i].y);
    ctx.lineTo(points[i - 1].x, points[i - 1].y);
    ctx.stroke();
  }
}

let gridPatternCanvas = null;
let gridPatternSize = null;
function getGridPattern(w, h) {
  if (gridPatternCanvas && gridPatternSize?.w === w && gridPatternSize?.h === h) {
    return gridPatternCanvas;
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const gctx = c.getContext("2d");
  gctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let x = 0; x <= GRID_W; x++) {
    for (let y = 0; y <= GRID_H; y++) {
      gctx.fillRect(x * CELL_SIZE - 0.5, y * CELL_SIZE - 0.5, 1, 1);
    }
  }
  gridPatternCanvas = c;
  gridPatternSize = { w, h };
  return c;
}

function drawBackground(ctx, w, h) {
  const bg = ctx.createRadialGradient(w / 2, h * 0.15, 0, w / 2, h * 0.15, Math.max(w, h) * 0.9);
  bg.addColorStop(0, "#141414");
  bg.addColorStop(0.55, "#0a0a0a");
  bg.addColorStop(1, "#000000");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(getGridPattern(w, h), 0, 0);
}

function drawObstacles(ctx, obstacles) {
  for (const o of obstacles) {
    const px = o.x * CELL_SIZE + 2;
    const py = o.y * CELL_SIZE + 2;
    const size = CELL_SIZE - 4;
    ctx.save();
    ctx.fillStyle = "rgba(153, 41, 234, 0.14)";
    ctx.strokeStyle = "#9929EA";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#9929EA";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(px, py, size, size, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawFood(ctx, food, now) {
  if (!food) return;
  const color = PALETTE[food.colorIndex % PALETTE.length];
  const c = centerOf(food);
  const bob = Math.sin(now / 220) * 2;
  const pulse = 0.85 + Math.sin(now / 260) * 0.15;

  ctx.save();
  ctx.translate(0, bob);
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(c.x, c.y, (CELL_SIZE / 2 - 4) * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(c.x - 3, c.y - 4, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPowerFood(ctx, powerFood, now) {
  if (!powerFood) return;
  const c = centerOf(powerFood);
  const pulse = Math.abs(Math.sin(now / 150));

  ctx.save();
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 18 + pulse * 10;
  ctx.fillStyle = `rgba(255, 215, 0, ${0.75 + pulse * 0.25})`;
  ctx.beginPath();
  ctx.arc(c.x, c.y, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 243, 160, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.x, c.y, CELL_SIZE / 2 + 3 + pulse * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEffects(ctx, effects, now) {
  for (const e of effects) {
    const progress = (now - e.bornAt) / EFFECT_LIFETIME_MS;
    if (progress >= 1) continue;
    const c = centerOf(e);
    const radius = CELL_SIZE * (0.3 + progress * 1.4);
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemy(ctx, enemy, points, powered, flash) {
  const color = powered ? (flash ? "#ffffff" : "#43D8C9") : "#FF5F5F";
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  drawTaperedBody(ctx, points, color, 0.55);
  ctx.restore();

  const head = points[0];
  ctx.save();
  ctx.globalAlpha = head.fadeAlpha;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(head.x, head.y, CELL_SIZE * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSnake(ctx, snake, points) {
  const color = PALETTE[snake.colorIndex % PALETTE.length];
  const dir = snake.dir;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  drawTaperedBody(ctx, points, color, 0.5);
  ctx.restore();

  const head = points[0];
  ctx.save();
  ctx.globalAlpha = head.fadeAlpha;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(head.x, head.y, CELL_SIZE * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9 * head.fadeAlpha;
  ctx.beginPath();
  ctx.arc(head.x, head.y, CELL_SIZE * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const perp = { x: -dir.y, y: dir.x };
  const eyeOffset = CELL_SIZE * 0.16;
  const eyeForward = CELL_SIZE * 0.12;
  ctx.save();
  ctx.globalAlpha = head.fadeAlpha;
  ctx.fillStyle = "#000000";
  for (const side of [-1, 1]) {
    const ex = head.x + dir.x * eyeForward + perp.x * eyeOffset * side;
    const ey = head.y + dir.y * eyeForward + perp.y * eyeOffset * side;
    ctx.beginPath();
    ctx.arc(ex, ey, CELL_SIZE * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function render(ctx, state, now, alpha = 1, cellSize) {
  CELL_SIZE = cellSize;
  const w = GRID_W * CELL_SIZE;
  const h = GRID_H * CELL_SIZE;

  drawBackground(ctx, w, h);
  drawObstacles(ctx, state.obstacles);
  drawFood(ctx, state.food, now);
  drawPowerFood(ctx, state.powerFood, now);

  const powered = isPowered(state, now);
  const flash = Math.floor(now / 150) % 2 === 0;
  for (const enemy of state.enemies) {
    const points = interpolatedPoints(enemy.body, enemy.prevBody, alpha);
    drawEnemy(ctx, enemy, points, powered, flash);
  }

  const snakePoints = interpolatedPoints(state.snake.body, state.snake.prevBody, alpha);
  drawSnake(ctx, state.snake, snakePoints);

  drawEffects(ctx, state.effects, now);
}
