---
# minance2-keq4
title: Expose explorer chart tooltips on keyboard focus
status: completed
type: task
priority: normal
created_at: 2026-04-25T14:45:21Z
updated_at: 2026-04-25T14:46:29Z
---

Continue audit debt cleanup by making Explorer heatmap and chart exact-value tooltip affordances visible for keyboard users, not just pointer hover; add focused regression coverage and verify.



Checklist:
- [x] Identify hover-only chart tooltip debt
- [x] Update focus-visible tooltip affordances without changing data flow
- [x] Add focused source regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice



## Summary of Changes
- Made Explorer Weekday Spend summary cells keyboard focus targets with role="img" accessible summaries and tokenized focus-visible rings.
- Updated the exact-value tooltip recipe to show on keyboard focus as well as pointer hover.
- Added source-level coverage for the focus-visible tooltip affordance and focusable summary cells.

## Verification
- env NODE_ENV=test pnpm exec tsx --test src/app/theme-foundation.test.ts
- git diff --check
- pnpm --filter @minance/web lint
- pnpm --filter @minance/web test
- pnpm --filter @minance/web build
