---
# minance2-f707
title: IHE-16 Use account dropdowns in edit and import flows
status: completed
type: feature
priority: normal
created_at: 2026-03-26T03:30:14Z
updated_at: 2026-03-26T04:03:59Z
parent: minance2-nccz
---

## Goal

Replace free-text account inputs with stored-account dropdowns in the specified edit/import flows.

## Todo

- [x] Inspect current account input surfaces
- [x] Reuse existing account option loading where possible
- [x] Add failing coverage for dropdown behavior
- [x] Implement the UI updates
- [x] Verify the affected workflows

## Linear

- Issue: IHE-16
- URL: https://linear.app/ihelio/issue/IHE-16/prioritize-dropdown-instead-of-text-input-for-transactions-edit-and-import

## Summary of Changes

- Replaced free-text account field in the import processed rows editor with a stored-account dropdown keyed by account names and labeled with `displayIdentifier` when available.
- Updated import batch/reconciliation account selectors to display the richer account identifier labels for disambiguation.
- Replaced free-text account field in transaction create/edit forms with account dropdown options derived from stored accounts.
- Added helper coverage for dropdown option construction in import and transaction form tests, including unknown legacy account fallback values.
- Verified all web tests pass after the dropdown changes.


## Follow-up Fix (2026-03-25)

- [x] Add failing tests for dropdown preselection with account_key and normalized account names
- [x] Fix transaction edit draft account value mapping to stored displayName
- [x] Fix import account option matching by normalized account identity
- [x] Run focused web tests and update summary

### Follow-up Summary

- `buildDraftFromTransaction` now resolves stored accounts by `account_id` and normalized `account_key` identity, so edit mode preselects the persisted account display name instead of raw keys.
- Import row account dropdowns now match current values by normalized identity (`displayName` and `normalizedKey`) before deciding whether to add an unknown fallback option.
- Added focused tests covering both regressions and preserved display labels via `displayIdentifier`.
- Focused verification passed: `pnpm --filter @minance/web test -- src/app/import/accountAssignment.test.ts src/app/transactions/form.test.ts` (106 passed, 0 failed).
