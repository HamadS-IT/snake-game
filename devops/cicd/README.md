# CI/CD: GitHub Actions

Goal: on every push to `main`, automatically run the backend tests, build
both Docker images to confirm they still build, and (optionally) deploy to
the EC2 instance from the Terraform/Ansible guides — so deploying stops
being a manual `ssh` + `git pull` + `docker compose up` routine.

## 1. Prerequisites

- The Terraform and Ansible steps done at least once manually, so you have a
  running server and understand what the pipeline will be automating.
- This repo hosted on GitHub (GitHub Actions is GitHub-native; a different
  host would need an equivalent like GitLab CI).

## 2. Directory layout to create

```
.github/
└── workflows/
    └── ci.yml
```

(`.github/workflows/` is a fixed location GitHub Actions looks for — it
must live at the repo root, not under `devops/`.)

## 3. Trigger

```yaml
on:
  push:
    branches: [main]
  pull_request:
```

Run tests on every PR too, not just pushes to `main` — deploy only happens
on `main` (see the job condition in step 6).

## 4. Job: backend tests

Steps: check out the repo (`actions/checkout@v4`), set up Python
(`actions/setup-python@v5`, matching the version in `backend/Dockerfile`),
`pip install -e ".[test]"` inside `backend/`, spin up a Postgres service
container for the test DB (GitHub Actions supports a `services:` block with
a `postgres` image — or just let the existing SQLite-based test fixtures in
`backend/tests/conftest.py` run as-is, since they don't need a real
Postgres), then run `pytest`.

## 5. Job: build images

Steps: check out, then `docker build ./backend` and `docker build ./frontend`
(the frontend build needs a `VITE_API_BASE_URL` build-arg — a placeholder
value is fine here since this job is just proving the images build, not
deploying them). This job catches Dockerfile breakage before it reaches the
server.

## 6. Job: deploy (only on push to `main`, after the above jobs pass)

```yaml
deploy:
  needs: [backend-tests, build-images]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  runs-on: ubuntu-latest
```

Two common ways to implement the actual deploy step — pick one:

**Option A — SSH + docker compose directly** (simplest, no Ansible
dependency in CI): use an action like `appleboy/ssh-action` to SSH into the
server and run `cd /opt/snakegame && git pull && docker compose up -d
--build`.

**Option B — re-run the Ansible playbook from CI**: set up Python +
Ansible on the runner, write the SSH private key and inventory to disk from
secrets, and run `ansible-playbook` exactly as you did manually. More setup,
but keeps one source of truth (the playbook) for both manual and automated
deploys.

Either way, the server needs the workflow's SSH key added as an authorized
key (`~/.ssh/authorized_keys` on the server) — this can be a separate
deploy-only key pair from the one you use personally.

## 7. Secrets to add in GitHub

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret name       | Value                                         |
| ------------------ | ---------------------------------------------- |
| `SSH_PRIVATE_KEY`  | The private key for SSHing into the EC2 host   |
| `SSH_HOST`         | The EC2 instance's public IP or domain          |
| `SSH_USER`         | `ubuntu`                                        |

Never put these values directly in `ci.yml` — reference them as
`${{ secrets.SSH_PRIVATE_KEY }}` etc.

## 8. Verify

Push a trivial commit to `main` (or open a PR first to check the test/build
jobs alone) and watch it run under the repo's **Actions** tab. Confirm the
deploy job actually updated the server by checking
`curl http://<host>:8000/health` right after the workflow finishes, or by
watching `docker compose ps` on the server for a new container start time.

## Notes

- Keep the deploy job's blast radius small at first — it's fine (and safer
  while iterating on the pipeline) to leave deploy manual (just the
  test + build jobs automated) until you trust the pipeline, then add the
  deploy job.
- Consider adding a `frontend` job too (`npm ci && npm run build` inside
  `frontend/`) alongside the backend tests, so a broken frontend build also
  fails CI before it reaches `main`.
