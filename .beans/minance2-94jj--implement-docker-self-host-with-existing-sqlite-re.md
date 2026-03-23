---
# minance2-94jj
title: Implement Docker self-host with existing SQLite reuse
status: completed
type: feature
priority: normal
created_at: 2026-03-23T01:31:46Z
updated_at: 2026-03-23T01:40:25Z
---

## Goal

Implement the approved Docker self-host plan so the stack builds, the API image includes sqlite3, and operators can reuse an existing host SQLite/runtime data directory via MINANCE_RUNTIME_DATA_SOURCE.

## Todo

- [x] Review git/worktree safety and current deployment files
- [x] Add failing coverage or reproducible red checks for Docker self-host gaps
- [x] Implement Docker, compose, and docs changes
- [x] Verify Docker builds and self-host stack against bind-mounted runtime data
- [x] Record summary and close the bean if all todos are complete

## Summary of Changes

- Replaced the legacy Docker ignore rules with a Node/Next workspace-safe `.dockerignore` that keeps source files in the build context while excluding secrets, caches, temp data, and `services/api/data`.
- Updated the API Docker image to install `sqlite3`, added `MINANCE_RUNTIME_DATA_SOURCE` support to the self-host compose stack, and documented how to bind-mount the existing runtime data directory and SQLite file.
- Fixed the web runtime Docker image to copy `apps/web/node_modules` so `pnpm --filter @minance/web start` can resolve `next` inside the container.
- Verified the API and web Docker images build successfully, the compose stack comes up healthy with the host SQLite directory bind-mounted, `/healthz` and `/readyz` return success, and the mounted database reports the same `users` row count before and after an API container restart.
