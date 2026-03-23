---
# minance2-zdax
title: Switch self-host compose to nightly image
status: completed
type: task
priority: normal
created_at: 2026-03-23T03:01:38Z
updated_at: 2026-03-23T03:07:48Z
---

## Goal

Update `docker-compose.selfhost.yml` to run the published `ydeng11/minance:nightly` image instead of building the combined image locally.

## Todo

- [x] Confirm the desired compose pull behavior
- [x] Update compose and directly affected docs
- [x] Run verification for the new image-based compose flow
- [x] Commit the source changes and bean metadata
- [x] Push the branch and update PR #21

## Summary of Changes

- Switched the stock `docker-compose.selfhost.yml` app service from a local `build:` configuration to the published image `ydeng11/minance:nightly` while keeping the existing SQLite mount, web port, and healthcheck behavior unchanged.
- Updated the self-host README and operator docs to replace `up -d --build` with the published-image flow: `docker compose ... pull` followed by `docker compose ... up -d`.
- Verified the published-image operator path with `docker compose -p minance-selfhost-nightly ... pull`, `docker compose ... up -d`, `docker compose ... ps`, `curl -I http://127.0.0.1:4304`, `curl -i http://127.0.0.1:4304/v1/system/storage`, `sqlite3` inside the running container, and `pnpm test:test-first` after teardown.
