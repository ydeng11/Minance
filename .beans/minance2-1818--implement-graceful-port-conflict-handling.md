---
# minance2-1818
title: Implement graceful port conflict handling
status: completed
type: bug
priority: normal
created_at: 2026-03-21T03:05:59Z
updated_at: 2026-03-21T03:21:47Z
---

Implement graceful handling when dev/start ports are already occupied.

- [x] Decide the desired port-conflict behavior
- [x] Add failing coverage for the chosen behavior
- [x] Implement graceful port-conflict handling
- [x] Verify the startup behavior and run required checks
- [x] Summarize and land the change

## Design Notes

- Approved approach: add a small TypeScript startup wrapper that auto-increments from ports 3000 and 3001, prints warnings, and feeds the resolved API origin into the web process.
- Design doc: docs/plans/2026-03-20-graceful-port-conflict-design.md
- Implementation plan: docs/plans/2026-03-20-graceful-port-conflict-implementation-plan.md

## Summary of Changes

- Added `scripts/run-with-open-ports.ts` to choose open ports for the combined startup flow, warn when defaults are occupied, and pass the resolved API origin into the web process.
- Updated `just dev` and `just start` to use the new startup wrapper while leaving direct single-service commands unchanged.
- Added focused tests covering free-port startup, overlapping occupied defaults, preservation of the API preferred port, and real occupied-port probing.
- Verified `just dev` manually with both `3000` and `3001` occupied and with only `3000` occupied; in both cases the app started cleanly on reassigned ports and the web rewrite still reached the API.
- Verified the final code with `pnpm check`.
