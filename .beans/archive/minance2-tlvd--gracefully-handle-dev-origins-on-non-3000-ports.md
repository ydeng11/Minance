---
# minance2-tlvd
title: Gracefully handle dev origins on non-3000 ports
status: completed
type: bug
priority: normal
created_at: 2026-03-22T04:14:38Z
updated_at: 2026-03-22T04:21:04Z
---

Origin checks reject local dev requests when the frontend runs on a port other than 3000.

## Tasks
- [x] Explore current origin validation and config flow
- [x] Confirm desired dev-only behavior and design
- [x] Add a failing test that reproduces the bug
- [x] Implement the minimal fix
- [x] Run targeted verification and summarize changes

## Summary of Changes
- Allowed `http://localhost` and `http://127.0.0.1` development origins on any port when `MINANCE_ALLOWED_ORIGINS` is not explicitly configured.
- Kept explicit `MINANCE_ALLOWED_ORIGINS` values authoritative so configured environments still use exact origin matching.
- Added regression coverage for arbitrary localhost dev ports and the explicit-override case, then verified with `env NODE_ENV=test pnpm exec tsx --test services/api/test/security.test.ts` and `just check`.
