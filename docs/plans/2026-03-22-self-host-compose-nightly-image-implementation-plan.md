# Self-Host Compose Nightly Image Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Point the stock self-host Docker Compose stack at the published `ydeng11/minance:nightly` image and update the operator docs to match.

**Architecture:** Keep the existing single-service `app` compose shape, but stop building the image locally. The stock compose workflow will pull the published nightly image, start it with the existing SQLite runtime-data mount, and rely on the same internal readiness-based healthcheck.

**Tech Stack:** Docker Compose, Docker Hub images, Node/Next runtime container, SQLite

---

### Task 1: Switch compose from local build to published image

**Files:**
- Modify: `docker-compose.selfhost.yml`

**Step 1: Remove the local build configuration**

- Delete the `build:` block from the `app` service.
- Keep the `app` service environment, volumes, ports, and healthcheck unchanged.

**Step 2: Point the stock stack at the published image**

- Set the `app` service image to `ydeng11/minance:nightly`.

### Task 2: Update the self-host docs

**Files:**
- Modify: `README.md`
- Modify: `docs/self-host-operations-runbook.md`
- Modify: `docs/self-host-breaking-migration-guide.md`

**Step 1: Update the operator launch flow**

- Replace `docker compose ... up -d --build` with:
  - `docker compose ... pull`
  - `docker compose ... up -d`

**Step 2: Update the stock image story**

- Document that the stock self-host stack runs `ydeng11/minance:nightly`.
- Keep the local Dockerfile references only as implementation/source details where helpful.

### Task 3: Verify the image-based compose flow

**Files:**
- Modify: `.beans/minance2-zdax--switch-self-host-compose-to-nightly-image.md`

**Step 1: Pull the published image**

Run:

```bash
docker compose -p minance-selfhost-nightly -f docker-compose.selfhost.yml --env-file .env.selfhost pull
```

Expected: Docker pulls `ydeng11/minance:nightly`.

**Step 2: Start the stock stack**

Run:

```bash
docker compose -p minance-selfhost-nightly -f docker-compose.selfhost.yml --env-file .env.selfhost up -d
```

Expected: one `app` container starts from the published image.

**Step 3: Verify runtime behavior**

Run:

```bash
docker compose -p minance-selfhost-nightly -f docker-compose.selfhost.yml --env-file .env.selfhost ps
curl -I -fsS http://127.0.0.1:${MINANCE_WEB_PORT:-3000}
curl -i -sS http://127.0.0.1:${MINANCE_WEB_PORT:-3000}/v1/system/storage | sed -n '1,20p'
docker exec <app-container> sqlite3 /var/lib/minance/minance.sqlite "SELECT COUNT(*) FROM users;"
```

Expected:
- `app` reports `healthy`
- `/` returns `200 OK`
- `/v1/system/storage` returns `401 Unauthorized` without credentials
- the mounted SQLite file remains readable

**Step 4: Stop the verification stack**

Run:

```bash
docker compose -p minance-selfhost-nightly -f docker-compose.selfhost.yml --env-file .env.selfhost down
```

Expected: the verification stack is removed cleanly.
