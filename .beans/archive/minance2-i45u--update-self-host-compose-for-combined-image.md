---
# minance2-i45u
title: Update self-host compose for combined image
status: completed
type: task
priority: normal
created_at: 2026-03-23T02:36:50Z
updated_at: 2026-03-23T02:53:54Z
---

## Goal

Update `docker-compose.selfhost.yml` so it matches the intended self-host story after adding the combined nightly image.

## Todo

- [x] Confirm the desired combined-image compose behavior
- [x] Update compose and any directly affected docs
- [x] Run verification for the compose changes
- [x] Commit the source changes and bean metadata
- [x] Push the branch and update PR #21

## Summary of Changes

- Replaced the stock `docker-compose.selfhost.yml` stack with a single `app` service built from `deploy/docker/Dockerfile.combined`, preserving the existing SQLite runtime-data mount behavior while publishing only the web port.
- Updated the self-host env template and operator docs to remove the stock public API port story and to document Docker health plus public `/` and `/v1/system/storage` checks for the combined container.
- Verified the new compose flow with `docker compose -p minance-selfhost-prcheck -f docker-compose.selfhost.yml --env-file .env.selfhost up -d --build`, `docker compose ... ps`, `curl -I http://127.0.0.1:4302`, `curl -i http://127.0.0.1:4302/v1/system/storage`, `sqlite3` inside the running container, and `pnpm test:test-first` before tearing the stack back down.
