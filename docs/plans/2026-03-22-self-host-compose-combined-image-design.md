# Self-Host Compose Combined Image Design

**Date:** 2026-03-22

## Goal

Align the stock `docker-compose.selfhost.yml` deployment with the new combined Minance image so self-host operators run one container instead of separate `api` and `web` services.

## Approved Direction

- Replace the stock self-host compose stack with a single `app` service built from `deploy/docker/Dockerfile.combined`.
- Keep the current runtime-data mount behavior:
  - default Docker-managed volume: `minance_data`
  - optional bind mount: `MINANCE_RUNTIME_DATA_SOURCE=./services/api/data`
- Publish only the web port on the host.
- Keep the internal API bound to `127.0.0.1:3001` inside the container.

## Operator Experience

- `docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d --build` should start one `app` container.
- Operators continue setting `AI_CREDENTIAL_SECRET` and optionally `MINANCE_RUNTIME_DATA_SOURCE`.
- `MINANCE_WEB_PORT` remains the only stock host port.
- `MINANCE_API_PORT` is removed from the stock compose path because the API is no longer exposed directly on the host.

## Runtime and Health Model

- The combined image continues using SQLite at `/var/lib/minance/minance.sqlite`.
- Docker container health should reflect the internal API readiness check (`/readyz`) so SQLite foundation issues still surface in `docker compose ps`.
- Public smoke checks should use:
  - `GET /` on the published web port
  - `GET /v1/system/storage` through the same web origin

## Directly Affected Files

- `docker-compose.selfhost.yml`
- `.env.selfhost.example`
- `README.md`
- `docs/self-host-operations-runbook.md`
- `docs/self-host-breaking-migration-guide.md`
- `docs/self-host-security-hardening-checklist.md`
