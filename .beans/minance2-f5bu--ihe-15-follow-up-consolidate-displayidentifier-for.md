---
# minance2-f5bu
title: 'IHE-15 follow-up: Consolidate displayIdentifier formatting contract'
status: completed
type: task
priority: low
created_at: 2026-03-27T02:03:35Z
updated_at: 2026-03-27T02:46:51Z
parent: minance2-e541
---

Residual follow-up from IHE-15.

`displayIdentifier` formatting currently has API-side generation plus a UI fallback path. That duplication raises the chance of drift if we change identifier rules later.

## Desired outcome
- define a single formatting contract for account display identifiers
- remove or minimize duplicated fallback logic between API and web code
- keep account labels consistent across account lists and dropdowns

## Summary of Changes
- Added shared account display identifier and account type label formatters in `packages/domain/src/accounts.ts`.
- Updated the API account response builder and the accounts page fallback to use the shared formatter contract.
- Added frontend regression coverage for account identifier fallback behavior and account-type label formatting.

## Verification
- `pnpm --filter @minance/web test -- src/app/accounts/wizard.test.ts`
- `env NODE_ENV=test pnpm exec tsx --test services/api/test/api-contract.test.ts`
- `just build-web`
- `just check`
