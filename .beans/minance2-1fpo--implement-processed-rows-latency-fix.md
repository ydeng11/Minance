---
# minance2-1fpo
title: Implement processed rows latency fix
status: completed
type: bug
priority: normal
created_at: 2026-05-21T02:10:35Z
updated_at: 2026-05-21T02:16:36Z
---

Implement the processed rows latency fix plan: move runtime SQLite repository operations to node:sqlite, add targeted processed-row queries, avoid duplicate processed-row reads in backend/frontend, update docs, run Code Simplifier and verification.\n\n- [x] Replace runtime SQLite repository operations with node:sqlite\n- [x] Add targeted processed-row read helpers and wire endpoint\n- [x] Avoid duplicate frontend processed-row fetches\n- [x] Update tests and docs\n- [x] Run Code Simplifier cleanup\n- [x] Run targeted and full verification

## Summary of Changes\n\nImplemented the processed rows latency fix. Runtime SQLite repository reads/writes now use node:sqlite DatabaseSync instead of spawning sqlite3 subprocesses. Added SQL-targeted processed-row listing with ownership checks, pagination/status filtering, ordered rows, and aggregate summaries, plus an index on import_id,row_index. The processed-rows endpoint uses the targeted helper for SQLite and avoids duplicate summary scans in JSON mode. The server skips pre-route full-store refresh for the targeted processed-rows GET so the fast path is not defeated by cache hydration. The import page now reuses the visible processed-row response for small imports instead of fetching all rows twice. Added repository and frontend regression coverage, updated self-host docs, ran Code Simplifier cleanup, targeted tests, and just check.
