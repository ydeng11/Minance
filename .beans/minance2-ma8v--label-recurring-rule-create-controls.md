---
# minance2-ma8v
title: Label recurring rule create controls
status: completed
type: task
priority: normal
created_at: 2026-04-25T22:32:58Z
updated_at: 2026-04-25T22:33:47Z
---

Continue audit debt cleanup by adding explicit accessible names to the compact recurring rule creation controls and regression coverage.

Checklist:
- [x] Add explicit accessible names to recurring create controls
- [x] Add regression coverage for the label contract
- [x] Run focused and web verification
- [x] Complete bean and commit slice

## Summary of Changes
- Added explicit aria-label values to the compact recurring rule create name, cadence, amount, and direction controls.
- Added source-level coverage so the recurring create form keeps those accessible names while preserving the existing semantic-token checks.

## Verification
- env NODE_ENV=test pnpm exec tsx --test src/app/theme-foundation.test.ts
- git diff --check
- pnpm --filter @minance/web lint
- pnpm --filter @minance/web test
- pnpm --filter @minance/web build
