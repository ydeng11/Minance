---
status: investigating
trigger: "Investigate issue: legacy-api-seeded-credentials-failing-login"
created: 2026-03-28T00:23:19Z
updated: 2026-03-28T00:32:25Z
---

## Current Focus

hypothesis: HEAD was broken because SQLite-backed API processes cached users in memory and did not notice external seed writes; the local uncommitted store.ts changes appear to add the missing SQLite refresh path.
test: Reproduce the multi-process flow with a running API server plus a separate legacy seed CLI against a temp SQLite database and verify login succeeds without restarting the server.
expecting: If the uncommitted store.ts fix is sufficient, the running server will accept the newly seeded password immediately after the CLI finishes.
next_action: Start isolated local API and mock legacy servers, run pnpm seed:legacy-api with explicit credentials, then log in over HTTP before and after seeding.

## Symptoms

expected: The explicitly seeded credentials should authenticate successfully in the app and through the API login function.
actual: After seeding with `--user-email dev@minance.local --user-password 12345678`, login for that email/password fails.
errors: Likely an invalid-credentials style failure during login; verify exact failure mode.
reproduction: In `/Users/ihelio/code/minance2`, run `pnpm seed:legacy-api -- --user-email dev@minance.local --user-password 12345678`, then attempt to log in with those credentials via the app or auth API.
started: Reported on 2026-03-27/28. There are existing tests in `services/api/test/legacy-api-loader.test.ts` that expect this flow to work.

## Eliminated

## Evidence

- timestamp: 2026-03-28T00:27:56Z
  checked: services/api/test/legacy-api-loader.test.ts
  found: The existing explicit-credentials regression test only calls resolveLegacyLoaderUserId(...) and login(...) in one process; it does not exercise the CLI seed script against a running server.
  implication: Passing unit coverage here would not prove the real app/API flow works after an external seed process updates the store.

- timestamp: 2026-03-28T00:27:56Z
  checked: services/api/src/runtime-env.ts, services/api/src/server.ts, services/api/src/store.ts
  found: Non-test runtime always uses SQLite, handleApiRequest calls refreshStoreCacheIfChanged() on every request, and refreshStoreCacheIfChanged() currently returns false immediately for any non-JSON backend.
  implication: In production-like/dev runtime, an already-running API process appears unable to observe external SQLite writes from scripts like pnpm seed:legacy-api.

- timestamp: 2026-03-28T00:27:56Z
  checked: services/api/test/store.test.ts
  found: There is already a test named "sqlite runtime refresh picks up externally seeded users before login" that expects refreshStoreCacheIfChanged() to return true and login() to succeed after an external SQLite write.
  implication: The intended behavior is explicit; if this test fails, the root cause is very likely SQLite cache refresh logic rather than password hashing.

- timestamp: 2026-03-28T00:32:25Z
  checked: git diff for services/api/src/store.ts and services/api/test/store.test.ts
  found: The working tree already contains uncommitted changes that add SQLite file mtime tracking plus a new regression test for externally seeded users before login.
  implication: The likely fix exists locally but is not part of HEAD; the remaining job is to verify that this exact change resolves the reported multi-process seed/login failure.

## Resolution

root_cause:
fix:
verification:
files_changed: []
