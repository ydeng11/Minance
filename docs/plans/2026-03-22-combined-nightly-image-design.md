# Combined Nightly Image Design

**Date:** 2026-03-22

## Goal

Produce a single Docker image for Minance Next that runs the full app and can be published as `ydeng11/minance:nightly`.

## Current State

- The repo currently builds two separate runtime images:
  - `deploy/docker/Dockerfile.api`
  - `deploy/docker/Dockerfile.web`
- The web app expects API traffic to be routed through `MINANCE_API_ORIGIN`.
- The API runtime requires the `sqlite3` CLI at startup for SQLite foundation readiness.
- The existing local `ydeng11/minance:edge` image is a legacy Quarkus artifact and is not compatible with the current Node/Next stack.

## Approved Direction

- Add a new combined Docker image instead of repurposing the existing `api` or `web` images.
- Keep the existing self-host `api` and `web` images unchanged for Docker Compose deployments.
- Run both services inside one container:
  - API on container port `3001`
  - Web on container port `3000`
- Expose only port `3000` from the combined image.
- Configure the web build/runtime to proxy `/v1/*` traffic to `http://127.0.0.1:3001`.

## Runtime Behavior

- The combined image should include:
  - root workspace dependencies
  - `apps/web/node_modules`
  - web build output
  - API source/runtime files
  - `sqlite3`
- A lightweight startup script should launch both processes and forward shutdown signals to both.
- SQLite/runtime-data behavior should remain compatible with the current API environment model so bind-mounted runtime data directories continue to work.

## Verification Direction

- Verify the combined Dockerfile builds successfully.
- Run the combined container locally with a mounted runtime data directory.
- Confirm:
  - `GET /` succeeds on the published port
  - `GET /v1/system/storage` reaches the internal API through the published port
  - the container health check reports healthy after SQLite readiness succeeds
- Publish the resulting image as `ydeng11/minance:nightly` and record the pushed digest.
