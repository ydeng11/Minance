---
# minance2-a14o
title: Expose spending heatmap cells as accessible summaries
status: completed
type: task
priority: normal
created_at: 2026-04-25T22:30:48Z
updated_at: 2026-04-25T22:31:28Z
---

Continue audit debt cleanup by making Explorer spending heatmap cells explicit accessible summaries instead of generic divs with potentially ignored aria-labels; add focused regression coverage and verify.



Checklist:
- [x] Identify spending heatmap generic aria-label gap
- [x] Add explicit accessible cell role/summary
- [x] Add focused source regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice



## Summary of Changes
- Added role="img" to Explorer spending heatmap cells so their existing aria-label summaries are exposed as accessible chart-cell summaries.
- Added source-level coverage to keep the heatmap cell role and label contract in place.

## Verification
- env NODE_ENV=test pnpm exec tsx --test src/app/theme-foundation.test.ts
- git diff --check
- pnpm --filter @minance/web lint
- pnpm --filter @minance/web test
- pnpm --filter @minance/web build
