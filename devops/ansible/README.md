# Ansible: Configure the Server

Goal: take the bare Ubuntu EC2 instance from the Terraform step and turn it
into a running copy of the app — Docker installed, the repo checked out,
`.env` populated with production secrets, and `docker compose up -d`
running — repeatably, without hand-typing the same SSH commands every time
you deploy.

## 1. Prerequisites

- [Install Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)
  locally (`ansible --version` to confirm).
- The EC2 instance's public IP from the Terraform step, and the SSH private
  key used there.
- This repo pushed to a Git remote (GitHub) that the server can `git clone`
  or `git pull` from.

## 2. Directory layout to create

Inside `devops/ansible/`, create:

```
devops/ansible/
├── inventory.ini      # the server(s) to configure — gitignored, has a real IP
├── ansible.cfg        # points Ansible at inventory.ini + your SSH key
├── playbook.yml       # the actual steps, described below
└── templates/
    └── env.j2         # a template for the production .env file
```

## 3. `inventory.ini`

```ini
[snakegame]
<public_ip> ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/snakegame-key
```

Replace `<public_ip>` with Terraform's output. Add this file to
`.gitignore` — it's environment-specific and arguably sensitive (server IP).

## 4. `ansible.cfg`

```ini
[defaults]
inventory = inventory.ini
host_key_checking = False
```

## 5. `playbook.yml` — steps to define

Write one play targeting the `snakegame` group, `become: true` (root), with
tasks in this order:

1. **Update apt cache** (`apt: update_cache=yes`).
2. **Install prerequisites**: `ca-certificates`, `curl`, `git`.
3. **Install Docker Engine + the Compose plugin** — follow Docker's official
   apt-repo instructions
   (https://docs.docker.com/engine/install/ubuntu/); the short version is:
   add Docker's GPG key and apt repository, then
   `apt: name=docker-ce,docker-ce-cli,containerd.io,docker-compose-plugin`.
4. **Add the `ubuntu` user to the `docker` group** (so you don't need `sudo`
   for every docker command) — `user: name=ubuntu groups=docker append=yes`.
5. **Create the app directory first, owned by `ubuntu`** — e.g.
   `file: path=/opt/snakegame state=directory owner=ubuntu group=ubuntu` —
   **before** cloning. `/opt` itself is root-owned, so if you skip this and
   go straight to `git clone` as the `ubuntu` user, it fails with
   `Permission denied` trying to create the work tree dir. Creating the
   directory as root (the play's default `become` user) and handing
   ownership to `ubuntu` first fixes it.
6. **Clone or update the repo** into that directory using the `git` module
   (`repo`, `dest`, `version: main`, run as `become_user: ubuntu` since it
   now owns the directory) — this needs the repo to be public, or a deploy
   key set up for private repos.
7. **Render the production `.env` file** from `templates/env.j2` (below)
   into `/opt/snakegame/.env` using the `template` module, with real
   secrets passed in as Ansible variables (never hardcode them in the
   playbook or template — see step 7 below).
8. **Rebuild the frontend image with the real API URL**: run
   `docker compose build --build-arg VITE_API_BASE_URL=http://<public_ip>:8000 frontend`
   via the `command` or `shell` module inside `/opt/snakegame` (swap in your
   real domain once you have one, and https once TLS is set up).
9. **Bring the stack up**:
   `docker compose up -d` (also via `command`/`shell`, `chdir: /opt/snakegame`).

## 6. `templates/env.j2`

Mirror the root `.env.example`, but with Jinja placeholders:

```
POSTGRES_USER=snake
POSTGRES_PASSWORD={{ postgres_password }}
POSTGRES_DB=snakegame
JWT_SECRET_KEY={{ jwt_secret_key }}
```

## 7. Keep secrets out of the playbook

Don't write real passwords into any committed file. Options, easiest first:

- Pass them on the command line: `ansible-playbook playbook.yml -e postgres_password=... -e jwt_secret_key=...`
  (fine for a one-off manual run, but they'll linger in your shell history).
- Put them in a local `secrets.yml` (gitignored) and load it with
  `-e @secrets.yml`.
- For anything beyond solo/hobby use, use
  [`ansible-vault`](https://docs.ansible.com/ansible/latest/vault_guide/index.html)
  to encrypt `secrets.yml` so it's safe to commit.

Generate a real random `JWT_SECRET_KEY` rather than reusing the local dev
value, e.g. `openssl rand -hex 32`. **Generate `postgres_password` the same
way** (`openssl rand -hex 16`), rather than picking your own password with
special characters — see the troubleshooting note below for why.

## 8. Run it

```bash
cd devops/ansible
ansible-playbook playbook.yml -e @secrets.yml
```

## 9. Verify

```bash
curl http://<public_ip>:8000/health
# {"status":"ok"}
```

Then visit `http://<public_ip>:3000` in a browser.

## 10. Re-running / redeploying

The playbook is written to be safe to re-run: `git pull` picks up new
commits, `docker compose build` picks up code changes, and
`docker compose up -d` restarts only the containers whose images changed.
Running the whole playbook again after every push is exactly what the
CI/CD guide automates.

## Troubleshooting

**Backend crashes on startup with something like
`could not translate host name "!something@postgres" to address`** — your
`postgres_password` contains a URL-special character (`!`, `@`, `:`, `/`,
etc.), which corrupts the `postgresql://user:password@host/db` connection
string the backend builds from it. Typing a password with `!` at an
interactive shell prompt can also trigger bash's history expansion and
mangle the value before it even reaches Ansible. Avoid the whole class of
bug by generating secrets as pure hex (`openssl rand -hex 16`) instead of
picking your own password.

If you hit this after Postgres already started once with the bad value,
changing `postgres_password` and re-running the playbook **won't** fix it
by itself — Postgres only sets its superuser password at first
initialization (`initdb`), which already happened and persisted to the
`postgres` Docker volume. You need to wipe that volume and let it
reinitialize with the new (valid) password:
```bash
ssh -i ~/.ssh/snakegame-key ubuntu@<public_ip>
cd /opt/snakegame && docker compose down -v   # -v also removes the postgres volume
```
Then re-run the playbook with the new password from your local machine.

## Notes

- This puts the app straight on ports 3000/8000 for simplicity, matching
  local dev. For a real deployment, add an nginx (or Caddy) reverse proxy on
  the host in front of both, terminate TLS there (e.g. with
  [Certbot](https://certbot.eff.org/)), and only expose 80/443 — that's a
  natural next addition to this playbook once the basic flow works.
- If the repo is private, set up a
  [deploy key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
  on the server rather than using a personal SSH key.
