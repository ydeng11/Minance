---
# minance2-jfg5
title: Label recurring suggestions callout action
status: completed
type: task
priority: normal
created_at: 2026-04-25T22:28:17Z
updated_at: 2026-04-25T22:28:59Z
---

Continue audit debt cleanup by giving the recurring suggestions callout an explicit accessible action name instead of relying on terse visible count copy and a title tooltip; add focused regression coverage and verify.



Checklist:
- [x] Identify recurring suggestions callout accessible-name gap
- [x] Add explicit accessible action label
- [x] Add focused source regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice



## Summary of Changes
- Added an explicit actionLabel to the recurring suggestions callout so assistive technology announces the full review action and recurring item count.
- Kept the browser tooltip aligned to the same label and added source-level coverage for the aria-label contract.

## Verification
- env NODE_ENV=test pnpm exec tsx --test src/app/theme-foundation.test.ts
- git diff --check
- pnpm --filter @minance/web lint
- pnpm --filter @minance/web test
- pnpm --filter @minance/web build
