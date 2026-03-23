---
# minance2-x0j3
title: Simplify startup port wrapper
status: completed
type: task
priority: normal
created_at: 2026-03-21T03:27:12Z
updated_at: 2026-03-21T03:28:31Z
---

Simplify the recent startup port wrapper implementation without changing behavior.

- [x] Review the recent startup wrapper code for safe simplifications
- [x] Refactor the wrapper for readability without changing behavior
- [x] Run verification for the cleanup
- [x] Summarize and land the change

## Summary of Changes

- Simplified `scripts/run-with-open-ports.ts` by extracting a shared `PortAssignment` type and small helpers for preferred-port reservation and open-port assignment.
- Reduced the inline branching in `createStartupPlan()` by moving the port-selection flow into `resolveStartupPorts()`.
- Preserved the existing startup behavior, including the edge case where the API keeps `3001` when only the web preferred port is occupied.
- Verified the cleanup with `env NODE_ENV=test pnpm exec tsx --test scripts/run-with-open-ports.test.ts` and `pnpm check`.
