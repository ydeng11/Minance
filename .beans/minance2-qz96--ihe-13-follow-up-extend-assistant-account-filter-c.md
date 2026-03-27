---
# minance2-qz96
title: 'IHE-13 follow-up: Extend assistant account-filter coverage across summary tools'
status: completed
type: task
priority: normal
created_at: 2026-03-27T02:03:35Z
updated_at: 2026-03-27T02:36:02Z
parent: minance2-nccz
---

Residual follow-up from IHE-13 (`minance2-f0kf`).

Account-filter regression coverage currently centers on `list_transactions`. We still need focused coverage for the summary tools that should honor the same account filter behavior.

## Desired outcome
- add regression coverage for `get_overview`
- add regression coverage for `get_category_breakdown`
- add regression coverage for `get_merchant_breakdown`
- add regression coverage for `get_anomalies`

## Summary of Changes

- Added regression coverage for account-scoped execution on `get_overview`, `get_category_breakdown`, `get_merchant_breakdown`, and `get_anomalies`.
- Added reusable scoped-store and scoped-transaction helpers to keep the new coverage readable without changing production code.
- Confirmed the existing IHE-13 implementation already honors account filters across the summary tools; no production change was required.

## Verification

- `env NODE_ENV=test pnpm exec tsx --test services/api/test/llm/tool-executor.test.ts`
- `just check`
