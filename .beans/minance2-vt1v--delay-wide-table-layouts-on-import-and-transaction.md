---
# minance2-vt1v
title: Delay wide table layouts on import and transactions
status: completed
type: bug
priority: normal
created_at: 2026-04-19T18:52:31Z
updated_at: 2026-04-19T18:54:27Z
---

Address the remaining audit finding that dense desktop tables activate too early on smaller viewports and split-screen widths.

## Checklist
- [x] Review current responsive table behavior and existing coverage
- [x] Add failing tests for the updated responsive table contracts
- [x] Adjust transactions and import layouts to keep compact mobile or tablet treatments longer
- [x] Run targeted and full web verification
- [x] Append summary of changes and complete bean

## Summary of Changes

- Delayed the import processed-rows and reconciliation tables from `md` to `lg`, keeping the mobile card presentations active on tablet-sized widths for longer.
- Delayed the transactions ledger wide-table breakpoint and column expansion from `md` to `lg`, preserving the more compact row treatment on smaller desktops and split-screen widths.
- Added responsive contract tests for both routes and verified the changes with targeted tests plus `pnpm --filter @minance/web lint`, `pnpm --filter @minance/web test`, and `pnpm --filter @minance/web build`.
