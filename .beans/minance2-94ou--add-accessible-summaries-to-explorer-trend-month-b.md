---
# minance2-94ou
title: Add accessible summaries to explorer trend month buttons
status: completed
type: task
priority: normal
created_at: 2026-04-25T22:19:07Z
updated_at: 2026-04-25T22:19:57Z
---

Continue audit debt cleanup by giving Explorer trend month buttons descriptive aria-labels that include month, spend, income, and net values instead of relying on visual bars and title tooltips; add focused regression coverage and verify.



Checklist:
- [x] Identify trend month button accessible-name gap
- [x] Add descriptive aria-labels for month summary buttons
- [x] Add focused source regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice



## Summary of Changes
- Added descriptive aria-label summaries to Explorer trend month buttons, including month, spend, income, and net values.
- Added source-level coverage to keep the month summary label contract wired to each trend button.

## Verification
- env NODE_ENV=test pnpm exec tsx --test src/app/theme-foundation.test.ts
- git diff --check
- pnpm --filter @minance/web lint
- pnpm --filter @minance/web test
- pnpm --filter @minance/web build
