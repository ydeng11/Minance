# Self-Host Compose Combined Image Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the stock self-host Docker Compose stack with the new combined Minance image and update operator docs to match.

**Architecture:** The stock self-host path will run a single `app` container from `deploy/docker/Dockerfile.combined`. The container will publish only the web port while the internal API remains on `127.0.0.1:3001`, with Docker health reflecting the API readiness probe.

**Tech Stack:** Docker Compose, Docker multistage builds, Node 20, pnpm, Next.js, SQLite

---

### Task 1: Replace the stock compose stack

**Files:**
- Modify: `docker-compose.selfhost.yml`

**Step 1: Rewrite the compose services block**

- Replace the separate `api` and `web` services with one `app` service.
- Build from `deploy/docker/Dockerfile.combined`.
- Keep `/var/lib/minance` mounted from `${MINANCE_RUNTIME_DATA_SOURCE:-minance_data}`.
- Publish only `${MINANCE_WEB_PORT:-3000}:3000`.

**Step 2: Keep stock runtime defaults explicit**

- Set the combined container env values for:
  - `MINANCE_STORE_BACKEND=sqlite`
  - `MINANCE_DATA_FILE=/var/lib/minance/store.json`
  - `MINANCE_SQLITE_FILE=/var/lib/minance/minance.sqlite`
  - `MINANCE_SQLITE_SCHEMA_FILE=/app/services/api/sql/schema.sql`
  - `MINANCE_SQLITE_AUTO_INIT=true`
  - `MINANCE_SEED_TEST_ACCOUNT=false`
  - `MINANCE_API_ORIGIN=http://127.0.0.1:3001`
  - `MINANCE_INTERNAL_API_PORT=3001`

**Step 3: Keep Docker health wired to readiness**

- Ensure the service healthcheck succeeds only when the internal API readiness endpoint returns `200`.

### Task 2: Update the self-host operator docs

**Files:**
- Modify: `.env.selfhost.example`
- Modify: `README.md`
- Modify: `docs/self-host-operations-runbook.md`
- Modify: `docs/self-host-breaking-migration-guide.md`
- Modify: `docs/self-host-security-hardening-checklist.md`

**Step 1: Remove the stock public API port story**

- Remove `MINANCE_API_PORT` from `.env.selfhost.example`.
- Update docs to describe a single published web port with an internal-only API.

**Step 2: Update compose and verification instructions**

- Change compose log commands from `api web` to `app`.
- Change health guidance to container health plus public `/` and `/v1/system/storage` checks.

**Step 3: Keep SQLite reuse guidance intact**

- Preserve the existing `MINANCE_RUNTIME_DATA_SOURCE=./services/api/data` bind-mount story.
- Keep backup/restore guidance aligned with the same host data directory.

### Task 3: Verify the new compose flow

**Files:**
- Modify: `.beans/minance2-i45u--update-self-host-compose-for-combined-image.md`

**Step 1: Build and start the stock self-host stack**

Run:

```bash
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d --build
```

Expected: one `app` container starts.

**Step 2: Verify container health and public checks**

Run:

```bash
docker compose -f docker-compose.selfhost.yml ps
curl -I -fsS http://127.0.0.1:${MINANCE_WEB_PORT:-3000}
curl -i -sS http://127.0.0.1:${MINANCE_WEB_PORT:-3000}/v1/system/storage | sed -n '1,20p'
docker exec <app-container> sqlite3 /var/lib/minance/minance.sqlite "SELECT COUNT(*) FROM users;"
```

Expected:
- compose reports `app` as healthy
- `/` returns `200 OK`
- `/v1/system/storage` reaches the internal API and returns `401 Unauthorized` without credentials
- the mounted SQLite file remains readable

**Step 3: Stop the verification stack**

Run:

```bash
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost down
```

Expected: the stock self-host stack is cleaned up after verification.
