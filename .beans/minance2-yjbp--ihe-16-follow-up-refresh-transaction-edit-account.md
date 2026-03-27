---
# minance2-yjbp
title: 'IHE-16 follow-up: Refresh transaction edit account selection after accounts load'
status: completed
type: bug
priority: high
created_at: 2026-03-27T02:03:36Z
updated_at: 2026-03-27T02:13:52Z
parent: minance2-f707
---

Residual follow-up from IHE-16.

If the transaction edit dialog opens before the stored accounts finish loading, the form can first-render the raw `account_key` instead of the expected dropdown selection. Users currently need to reopen the dialog to see the correct preselected account.

## Desired outcome
- refresh or reconcile the selected account once accounts finish loading
- preserve the correct persisted account value during edit
- cover the late-loading case with focused regression coverage

## Summary of Changes

- Added `reconcileDraftAccountName` so edit drafts can remap a raw fallback account value to the loaded account display name.
- Updated the transactions page account-loading flow to reconcile open edit drafts once accounts arrive, fixing the late-load dropdown preselection bug.
- Added regression coverage for the late-load reconciliation path in `apps/web/src/app/transactions/form.test.ts`.

## Verification

- `pnpm --filter @minance/web test -- src/app/transactions/form.test.ts`
- `just build-web`
- `pnpm --filter @minance/web test`
- `just check`
