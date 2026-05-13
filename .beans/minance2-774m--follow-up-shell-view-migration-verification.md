---
# minance2-774m
title: Follow up shell view migration verification
status: completed
type: task
priority: normal
created_at: 2026-04-13T03:18:48Z
updated_at: 2026-04-13T03:22:49Z
---

Continue the in-progress shell View migration workspace by stabilizing Explorer verification, simplifying the large diff where needed, and updating bean/test status based on the current dirty tree.

## Summary of Changes

- Re-ran the focused shell View verification suites against the current dirty workspace.
- Confirmed the shared shell View flow is stable for Explorer and Transactions with the migrated dialog-based controls.
- Verified the previously noted Explorer shell expectation mismatch is no longer reproducing in the focused suite.

## Verification

- `cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/components/view/viewRoutes.test.ts src/app/explorer/view-layout.test.ts src/app/transactions/filter-controls-ui.test.ts`
- `pnpm exec playwright test e2e/specs/view-control-placement.spec.ts e2e/specs/explorer-upgrade.spec.ts e2e/specs/cross-tab-parity.spec.ts`
