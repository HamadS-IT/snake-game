# 🐍 Snake

A neon-themed browser Snake game with a color-shifting snake, hunting enemy
snakes, a Pac-Man-style power mode, wrap-around edges, and level-based
difficulty scaling — backed by a FastAPI + PostgreSQL API for authentication
and a global leaderboard.

<p align="center">
  <img src="docs/screenshots/login.jpg" alt="Login screen" width="49%" />
  <img src="docs/screenshots/gameplay.jpg" alt="Gameplay" width="49%" />
</p>
<p align="center">
  <img src="docs/screenshots/leaderboard.jpg" alt="Leaderboard" width="98%" />
</p>

## Features

- **JWT authentication** — register / login, passwords hashed with bcrypt.
- **Color-shifting snake** — food previews the color the snake becomes when
  eaten.
- **Enemy snakes** — start roaming the board once your score passes ~50,
  ending the game on contact.
- **Power mode** — a pulsing gold pickup makes enemies vulnerable for a few
  seconds; eating them instead grants bonus points.
- **Wrap-around arena** — the board is a torus: exit one edge, re-enter the
  opposite one. Obstacles, your own body, and enemies (outside power mode)
  are still fatal.
- **Rising difficulty** — speed, enemy count, and obstacles all scale with
  score/level.
- **Global leaderboard** — top 10 distinct players ranked by personal best,
  plus your own full (paginated) score history.
- **Desktop-first** — the game itself requires a keyboard and is disabled on
  small/mobile screens; the leaderboard stays fully available everywhere.

## Stack

- **Backend**: FastAPI, SQLAlchemy, Alembic, PostgreSQL, JWT auth
- **Frontend**: React (Vite), HTML5 Canvas game engine, plain CSS
- **Local dev**: Docker Compose

## Project structure

```
snakeGame/
├── backend/            FastAPI app, SQLAlchemy models, Alembic migrations, tests
├── frontend/            React app: pages, game engine (engine/ + render.js), design system
├── devops/              Instructions for the infra layer (Terraform, Ansible, CI/CD) — see below
├── docs/screenshots/    Images used in this README
└── docker-compose.yml   Local dev stack: postgres + backend + frontend
```

## Quick start (Docker)

```bash
cp .env.example .env   # fill in POSTGRES_PASSWORD and JWT_SECRET_KEY
docker compose up --build
```

- Frontend: http://localhost:3000 (also proxies API calls at `/api/*` to the
  backend, so the frontend never needs to know the backend's host/port)
- Backend API: http://localhost:8000 directly (interactive docs at `/docs`)

In production (see [`devops/`](devops/README.md)), the frontend's nginx
serves everything on port 80 and proxies `/api/*` to the backend
internally — the app is reachable at just `http://<server-ip>`, no port or
separate backend host needed.

## Running without Docker

**Backend**

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -e ".[test]"
# requires a local Postgres; set DATABASE_URL accordingly, e.g.:
export DATABASE_URL=postgresql://snake:snake@localhost:5432/snakegame
export JWT_SECRET_KEY=dev-secret
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

## Gameplay

- Arrow keys / WASD to move.
- Eating food grows the snake, adds points, and changes its color to the
  color the food was showing.
- Once your score passes ~50, enemy snakes start appearing and roaming the
  board — touching one normally ends the game.
- A pulsing gold power food occasionally spawns; eating it makes enemies
  vulnerable for a few seconds — touching them then destroys them for bonus
  points instead of ending the game.
- Going off the edge of the board wraps you around to the opposite side —
  only obstacles, your own body, and non-vulnerable enemies end the game.
- As your score/level rises, movement speeds up, more enemies spawn, and
  obstacles are added to the board.
- On game over your score is saved automatically; check the leaderboard for
  the global top 10 (one entry per player, their personal best) and your own
  best score/full history.
- The game requires a desktop-sized screen and a keyboard; on narrow/mobile
  viewports it's replaced with a message pointing to the leaderboard, which
  remains fully usable on any device.

## API overview

All endpoints are under the backend root when hitting it directly (default
`http://localhost:8000`), or under `/api` when going through the frontend's
nginx proxy (e.g. `/api/auth/login`) — both reach the same routes:

| Method | Path                  | Auth | Description                          |
| ------ | --------------------- | ---- | ------------------------------------- |
| POST   | `/auth/register`      | No   | Create an account                     |
| POST   | `/auth/login`         | No   | Get a JWT access token                |
| POST   | `/scores`             | Yes  | Submit a finished game's score        |
| GET    | `/scores/leaderboard` | Yes  | Top N players by personal-best score  |
| GET    | `/scores/me`          | Yes  | Your best score + paginated history   |
| GET    | `/health`             | No   | Health check                          |

Full interactive schema at `/docs` when the backend is running.

## Tests

```bash
cd backend
.venv/bin/pytest
```

## DevOps / infrastructure

Docker Compose (above) covers local development. Provisioning a real server
(Terraform), configuring it (Ansible), and automating build/deploy (CI/CD)
are documented as step-by-step guides rather than pre-built here — see
**[`devops/README.md`](devops/README.md)** for the full roadmap and links to
each part.
