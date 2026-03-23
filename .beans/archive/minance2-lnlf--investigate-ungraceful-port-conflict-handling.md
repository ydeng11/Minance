---
# minance2-lnlf
title: Investigate ungraceful port conflict handling
status: completed
type: bug
priority: normal
created_at: 2026-03-21T03:02:19Z
updated_at: 2026-03-21T03:04:05Z
---

Investigate why the app cannot handle occupied ports gracefully during startup.

- [x] Reproduce the occupied-port failure path
- [x] Trace the startup code and identify the root cause
- [x] Summarize findings and any follow-up work

## Summary of Changes

- Reproduced `pnpm dev:api` failing with an uncaught `EADDRINUSE` when port 3001 is already occupied.
- Reproduced `pnpm dev:web` failing immediately when port 3000 is already occupied.
- Confirmed the root cause is a combination of fixed port bindings plus no graceful port-conflict handling, with `concurrently -k` also terminating the sibling dev process when either side exits.
