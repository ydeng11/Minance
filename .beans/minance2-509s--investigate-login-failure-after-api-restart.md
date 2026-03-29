---
# minance2-509s
title: Investigate login failure after API restart
status: completed
type: bug
priority: high
created_at: 2026-03-27T23:53:58Z
updated_at: 2026-03-28T00:13:30Z
---

## Context

User reports they can no longer log in after the recent API restart during account/import bugfix work. Need to reproduce, identify root cause, and fix without guessing.

## Todo

- [x] Reproduce the login failure and capture the exact error
- [x] Trace auth state in the live dev database and running API
- [x] Implement the minimal fix for the verified root cause
- [x] Verify login works again and update the bean summary

## Summary of Changes

- Restarted the local dev stack after confirming the API on port 3001 had been interrupted, which was causing app-wide login failures.
- Fixed `login()` to return `Invalid credentials` when a user record is missing `passwordHash` or `passwordSalt`, instead of leaking a raw crypto type error.
- Updated runtime test-environment detection so `tsx --test` and Node test-runner signals use isolated test storage even when `NODE_ENV` is unset.
- Added regression tests for malformed auth users and test-runner runtime detection, then verified with targeted auth/runtime tests, live curl login checks, and `just check`.
- Confirmed the live dev account can currently log in with `dev@minance.local` / `devpassword123`.

## Notes

- The current live dev SQLite file still contains the previously overwritten fixture-like dataset. If we need the pre-overwrite user data restored, that should be handled as a separate recovery task.

## Follow-up Fix (Legacy Seed Login)

- Verified the user's `pnpm seed:legacy-api -- --user-email dev@minance.local --user-password 12345678` workflow against the live SQLite file.
- Confirmed the real issue was request-time stale SQLite cache in the running API: external DB rewrites could leave the server serving old credentials until restart.
- Added `invalidateStoreCache()` in the store layer and now clear the SQLite cache at the start of each API request so external seed/migration writes are picked up on the next request.
- Added a focused regression in `services/api/test/store.test.ts` covering external password changes plus cache invalidation.
- Re-verified the live app stack after restart: `dev@minance.local` / `12345678` succeeds, and the old password now fails.
- Verified with targeted API tests, browser login reproduction, and `just check`.

## Current Login State

- Local app is running again on `http://localhost:3000`.
- Local API is running again on `http://127.0.0.1:3001`.
- Working credentials: `dev@minance.local` / `12345678`.
