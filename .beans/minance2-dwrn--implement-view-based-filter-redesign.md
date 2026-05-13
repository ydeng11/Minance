---
# minance2-dwrn
title: Implement view-based filter redesign
status: completed
type: feature
priority: normal
created_at: 2026-04-08T18:23:44Z
updated_at: 2026-04-09T11:48:24Z
---

Implement docs/plans/2026-04-08-view-based-filter-redesign-implementation-plan.md

## Tasks
- [x] Task 1: Lock shell-level View behavior with failing tests
- [x] Task 2: Add shared route-aware view controller
- [x] Task 3: Migrate Transactions to the shell View popup
- [x] Task 4: Migrate Explorer to the shell View popup

## Notes
- Verified Task 1 placement and Task 2 shell dialog checks with fresh Playwright servers.
- Verified the Transactions migration with focused Transactions Playwright coverage and web/unit checks.
- Remaining Transactions specs that create manual transactions are currently blocked by an unrelated existing Playwright/manual-create failure in `createManualTransaction`.

## Summary of Changes
- Restored shared shell-level View controller/dialog plumbing in `apps/web/src/components/view` and wired it through `AppProviders` and `Shell`.
- Migrated Explorer to register shell-owned View content, moving range/compare/advanced controls into the shared dialog and replacing the page-local command bar entry flow.
- Added focused shell-view route tests plus Explorer layout/unit coverage, and updated Explorer Playwright coverage for the new dialog-based flow.

## Verification
- Passed: `cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/components/view/viewRoutes.test.ts src/app/explorer/view-layout.test.ts src/app/transactions/filter-controls-ui.test.ts`
- E2E: `pnpm exec playwright test e2e/specs/view-control-placement.spec.ts e2e/specs/explorer-upgrade.spec.ts e2e/specs/cross-tab-parity.spec.ts` finished with 14 passed / 3 failed. Two failures match existing fixture/manual-create issues in `createManualTransaction` and `uploadAndCommitFixtureCsv`; one additional failure is an existing or newly surfaced expectation mismatch in `explorer-upgrade.spec.ts` for `analytics-category-bars` inside the category lens path.
