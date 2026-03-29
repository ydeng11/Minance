---
# minance2-l6ck
title: Investigate legacy-api seeded credentials failing login
status: completed
type: bug
priority: high
created_at: 2026-03-28T00:22:12Z
updated_at: 2026-03-28T00:29:19Z
---

## Goal

Find why `pnpm seed:legacy-api -- --user-email dev@minance.local --user-password 12345678` produces credentials that cannot log in, then fix the root cause.

## Todo

- [x] Reproduce the seeded login failure locally
- [x] Identify whether the issue is in seeding, persistence, or auth verification
- [x] Add or update a failing automated test that captures the bug
- [x] Implement the minimal fix
- [x] Verify the seed flow and login flow end-to-end

## Summary of Changes

Root cause: the running API cached the SQLite-backed store in memory, but `refreshStoreCacheIfChanged()` only handled the JSON backend. When `pnpm seed:legacy-api` updated the user password from a separate process, the already-running API continued serving stale auth data until restart.

Changes made:
- Added SQLite file mtime tracking in `services/api/src/store.ts` so `refreshStoreCacheIfChanged()` reloads cache after external SQLite writes and `saveStore()` keeps the cached mtime in sync after local writes.
- Added a regression test in `services/api/test/store.test.ts` that simulates an external SQLite user seed and verifies login succeeds after refresh.
- Verified the real flow with an isolated API on port 3101: before seeding, `dev@minance.local` + `12345678` returned 400; after running `pnpm seed:legacy-api` against the same SQLite file, the same running API returned 200 without restart.
