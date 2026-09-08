# DevOps Roadmap

The app itself (FastAPI + React + Postgres) is fully containerized and reads
all configuration from environment variables, so it's ready to deploy behind
real infrastructure without any code changes. This directory documents that
next phase — **as instructions to follow yourself**, not pre-built
scripts/pipelines — split into three parts, meant to be done in this order:

1. **[`terraform/README.md`](terraform/README.md)** — provision a real server
   (an AWS EC2 instance, security group, and networking) to run the app on.
2. **[`ansible/README.md`](ansible/README.md)** — configure that server
   (install Docker, pull the repo, run `docker compose up`) without SSHing in
   by hand every time.
3. **[`cicd/README.md`](cicd/README.md)** — automate the above with GitHub
   Actions, so pushing to `main` builds, tests, and deploys the app
   automatically.

## Why this order

Terraform's job is to create infrastructure (a server that boots but knows
nothing about this app). Ansible's job is to configure infrastructure that
already exists (it needs a real IP address to connect to, which is why it
comes after Terraform). CI/CD's job is to trigger both of the above
automatically on every push — which only makes sense once you've done them
manually at least once and understand what each step does.

## Prerequisites for all three

- An AWS account (or another cloud provider — the instructions use AWS/EC2 as
  the concrete example, but the same shape applies elsewhere) with billing
  enabled. **Provisioning real infrastructure costs money** — a small EC2
  instance (e.g. `t3.micro`/`t3.small`) is inexpensive but not free unless
  you're within the AWS free tier.
- The app's GitHub repository pushed to a remote (needed for Ansible to pull
  code onto the server, and for CI/CD to trigger on push).
- Familiarity with the existing `docker-compose.yml` and `.env.example` at
  the repo root — the deployed server ultimately just runs the same
  `docker compose up --build -d` you already use locally, against the same
  three services (`postgres`, `backend`, `frontend`).

## What stays the same in production

- The three Docker images (`backend`, `frontend`, `postgres`) — no
  Dockerfile changes needed.
- The `.env` variables (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
  `JWT_SECRET_KEY`) — same names, different (production) values.
- `nginx.conf`'s cache headers already assume it's the public-facing entry
  point.

## What changes in production (covered in the guides below)

- `docker-compose.yml`'s `frontend` service currently bakes
  `VITE_API_BASE_URL=http://localhost:8000` in as a build arg — in
  production this needs to be the server's real domain/IP, so the frontend
  image must be rebuilt with the correct value (the Ansible guide covers
  this).
- CORS: the backend's `CORS_ORIGINS` env var needs to include the real
  frontend origin, not just `localhost`.
- Secrets (`JWT_SECRET_KEY`, `POSTGRES_PASSWORD`) must be real random values,
  not the local dev placeholders, and must never be committed to git.
