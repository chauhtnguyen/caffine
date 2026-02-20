# Run AFFiNE in Docker with local PostgreSQL 17

Use this when the app and Redis run in Docker but PostgreSQL runs on your machine (Postgres 17 + pgvector).

## 1. Install PostgreSQL 17 and pgvector (macOS)

If Homebrew permissions fail, fix then retry:

```bash
sudo chown -R $(whoami) /opt/homebrew /opt/homebrew/Cellar "$HOME/Library/Logs/Homebrew"
brew install postgresql@17
brew install pgvector
# If link fails because pgvector is already present: brew link --overwrite pgvector
```

Start PostgreSQL:

```bash
brew services start postgresql@17
```

Ensure `psql` is on your PATH (e.g. add to shell profile):

```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## 2. Create database and enable pgvector

From this directory (`.docker/selfhost/`), run:

**macOS (Homebrew):** the default superuser is your macOS user. Connect to the default `postgres` database first:

```bash
psql -d postgres -f init-external-db.sql
```

**Linux (often has `postgres` role):**

```bash
psql -U postgres -d postgres -f init-external-db.sql
```

This creates user **caffine**, password **caffine**, database **caffine**, and enables the `vector` extension.

## 3. Configure and run Docker

Copy the example env and set `DATABASE_URL` to point at your local Postgres 17:

```bash
cp .env.external-postgres.example .env
# Edit .env if you changed user/password/database or port
```

From inside Docker, the host is reachable as `host.docker.internal` (Mac/Windows). The example uses:

`DATABASE_URL=postgresql://caffine:caffine@host.docker.internal:5432/caffine`

### Option A: Custom Caffine branch (this repo)

Use the same Node version as upstream (see `.nvmrc`, e.g. Node 22). If you use nvm or fnm, run `nvm use` or `fnm use` in the repo; the build script will try to switch automatically.

Build the image from the repo root, then start:

```bash
# From repo root (caffine branch)
.docker/selfhost/build-caffine-image.sh
# .env should have AFFINE_IMAGE=caffine:latest (default in .env.external-postgres.example)
cd .docker/selfhost
docker compose -f compose.external-postgres.yml up -d
```

### Option B: Upstream AFFiNE image

In `.env` comment out or remove `AFFINE_IMAGE` so the compose uses `ghcr.io/toeverything/affine:stable`. Then:

```bash
docker compose -f compose.external-postgres.yml up -d
```

Server will be at `http://localhost:3010` (or your `PORT`).

## 4. Stop

```bash
docker compose -f compose.external-postgres.yml down
```

PostgreSQL keeps running on your machine; only the AFFiNE and Redis containers stop.

---

## Workaround: Run migrations on the host (if P1010 persists)

If the migration container keeps failing with **P1010** and you can't get pg_hba.conf to allow Docker, run migrations once on your Mac and start the app without the migration container:

**1. Run migrations on the host** (from the repo root):

```bash
cd /Users/chau_nguyen/Documents/Dev_Playground/caffine
DATABASE_URL=postgresql://caffine:caffine@localhost:5432/caffine yarn workspace @affine/server prisma migrate deploy
```

**2. Start the stack without the migration service:**

```bash
cd .docker/selfhost
docker compose -f compose.external-postgres-no-migration.yml up -d
```

Use `compose.external-postgres-no-migration.yml` instead of `compose.external-postgres.yml` from now on for this setup. Only run step 1 again when you pull new AFFiNE/caffine changes that add migrations.

---

## Troubleshooting: "User was denied access" (P1010)

If the migration container fails with **P1010: User was denied access**, the app can reach Postgres but the user is rejected. Fix:

**1. Check credentials from the host**

```bash
psql 'postgresql://caffine:caffine@localhost:5432/caffine' -c 'SELECT 1'
```

If this fails, fix the password or user in Postgres and in `.env` (`DATABASE_URL`).

**2. Allow TCP connections and the Docker client**

- **listen_addresses:** In `postgresql.conf` (e.g. under `/opt/homebrew/var/postgresql@17/` or `$(brew --prefix)/var/postgresql@17`) set `listen_addresses = 'localhost'` or `'*'` so Postgres accepts TCP (not only socket).
- **pg_hba.conf:** Add a line so the user can connect. For Docker Desktop on Mac, connections from the container to the host often appear as `127.0.0.1`. Add:
  - `host caffine caffine 127.0.0.1/32 scram-sha-256`  
  or, for local dev only:  
  - `host all all 127.0.0.1/32 scram-sha-256`
- Restart Postgres: `brew services restart postgresql@17`
- Retry: `docker compose -f compose.external-postgres.yml up -d`

---

## Uninstall PostgreSQL 16 (if you switched to 17)

Stop the service, unlink, and remove the formula and data:

```bash
brew services stop postgresql@16
brew unlink postgresql@16
brew uninstall postgresql@16
```

Optional: remove data directory (only if you don’t need any existing DBs):

```bash
rm -rf /opt/homebrew/var/postgresql@16
```
