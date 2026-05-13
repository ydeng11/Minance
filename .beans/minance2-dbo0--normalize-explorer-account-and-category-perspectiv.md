---
# minance2-dbo0
title: Normalize explorer account and category perspective tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-21T11:58:29Z
updated_at: 2026-04-21T12:00:44Z
---

Continue audit-debt cleanup by replacing hard-coded dark palette classes in Explorer account/category perspective cards with semantic theme tokens and focus-ring treatment.

## Checklist
- [x] Add theme-foundation regression coverage for account/category perspectives
- [x] Normalize AccountPerspective and CategoryPerspective classes
- [x] Run targeted and web verification
- [x] Append summary of changes and complete bean


## Summary of Changes

- Added theme-foundation regression coverage for Explorer account and category perspective token usage.
- Normalized AccountPerspective and CategoryPerspective away from hard-coded neutral/emerald/white/black palette classes.
- Added semantic focus-ring treatment to account/category perspective interactions.
- Ran the required Code Simplifier pass and kept the cleanup scoped to the recently touched components.

Verification: env NODE_ENV=test pnpm exec tsx --test src/app/theme-foundation.test.ts; pnpm --filter @minance/web lint; pnpm --filter @minance/web test; pnpm --filter @minance/web build; git diff --check.
