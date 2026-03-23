# Combined Nightly Image Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and publish a single Docker image that runs the Minance Next web app and API together as `ydeng11/minance:nightly`.

**Architecture:** Add a dedicated combined Dockerfile and a small startup script that launches both existing Node runtimes inside one container. The web app will proxy API requests to `127.0.0.1:3001`, while the image exposes only port `3000` publicly.

**Tech Stack:** Docker, Node 20, pnpm workspaces, Next.js 16, tsx, shell entrypoint scripting

---

### Task 1: Capture the missing combined-image regression

**Files:**
- Create: `docs/plans/2026-03-22-combined-nightly-image-design.md`
- Create: `docs/plans/2026-03-22-combined-nightly-image-implementation-plan.md`

**Step 1: Verify the combined image does not exist yet**

Run:

```bash
docker build -f deploy/docker/Dockerfile.combined -t minance-next-combined:test .
```

Expected: FAIL because `deploy/docker/Dockerfile.combined` does not exist yet.

**Step 2: Record the approved design**

Write the approved design doc and this implementation plan to `docs/plans/`.

**Step 3: Re-run the missing-image check**

Run:

```bash
docker build -f deploy/docker/Dockerfile.combined -t minance-next-combined:test .
```

Expected: still FAIL until the Dockerfile is implemented.

### Task 2: Implement the combined runtime image

**Files:**
- Create: `deploy/docker/Dockerfile.combined`
- Create: `deploy/docker/start-combined.sh`

**Step 1: Add a combined Dockerfile**

Build the web app with:

```dockerfile
ARG MINANCE_API_ORIGIN=http://127.0.0.1:3001
ENV MINANCE_API_ORIGIN=${MINANCE_API_ORIGIN}
```

Use a runtime image that includes:
- `sqlite3`
- root `node_modules`
- `apps/web/node_modules`
- workspace files needed by both runtimes
- built `apps/web/.next`

Expose only:

```dockerfile
EXPOSE 3000
```

**Step 2: Add a startup script**

Create a shell script that:
- starts the API with `PORT=3001`
- starts the web app with `PORT=3000` and `MINANCE_API_ORIGIN=http://127.0.0.1:3001`
- traps `INT` and `TERM`
- stops both child processes cleanly when the container exits

**Step 3: Build the combined image**

Run:

```bash
docker build -f deploy/docker/Dockerfile.combined -t minance-next-combined:test .
```

Expected: PASS

### Task 3: Verify runtime behavior and publish

**Files:**
- Modify: `.beans/minance2-2jid--publish-docker-image-to-ydeng11minancenightly.md`

**Step 1: Run the combined image locally**

Run:

```bash
docker run --rm -d \
  --name minance-combined-test \
  -p 4300:3000 \
  -e AI_CREDENTIAL_SECRET=selfhost-verification-secret-change-me-1234567890 \
  -v /Users/ihelio/code/minance2/services/api/data:/var/lib/minance \
  minance-next-combined:test
```

**Step 2: Verify the combined container**

Run:

```bash
docker inspect --format '{{.State.Health.Status}}' minance-combined-test
curl -I -fsS http://127.0.0.1:4300/
curl -i -sS http://127.0.0.1:4300/v1/system/storage | sed -n '1,20p'
```

Expected:
- container health reports `healthy`
- `/` returns `200 OK`
- `/v1/system/storage` reaches the internal API and returns `401 Unauthorized` without credentials

**Step 3: Publish the nightly image**

Run:

```bash
docker tag minance-next-combined:test ydeng11/minance:nightly
docker push ydeng11/minance:nightly
docker buildx imagetools inspect ydeng11/minance:nightly
```

Expected: push succeeds and the inspect output reports the published digest.

**Step 4: Clean up local verification container**

Run:

```bash
docker rm -f minance-combined-test
```

**Step 5: Commit**

```bash
git add deploy/docker/Dockerfile.combined deploy/docker/start-combined.sh docs/plans/2026-03-22-combined-nightly-image-design.md docs/plans/2026-03-22-combined-nightly-image-implementation-plan.md .beans/minance2-2jid--publish-docker-image-to-ydeng11minancenightly.md
git commit -m "feat: add combined nightly docker image"
```
