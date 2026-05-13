---
# minance2-anmt
title: Normalize explorer route shell tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-21T12:06:05Z
updated_at: 2026-04-21T12:07:33Z
---

Continue audit-debt cleanup by replacing hard-coded dark palette classes in the Explorer route header and active-filter strip with semantic theme tokens and focus-ring treatment.

## Checklist
- [x] Add theme-foundation coverage for Explorer route shell tokens
- [x] Normalize Explorer page header and active-filter strip classes
- [x] Run targeted and web verification
- [x] Append summary of changes and complete bean


## Summary of Changes

- Added theme-foundation coverage for Explorer route shell token usage.
- Normalized the Explorer page header icon, eyebrow, title, copy, active-filter panel, and filter removal chips to semantic tokens.
- Added focus-ring treatment to active filter removal chips.

Verification: env NODE_ENV=test pnpm exec tsx --test src/app/theme-foundation.test.ts; pnpm --filter @minance/web lint; pnpm --filter @minance/web test; pnpm --filter @minance/web build; git diff --check.
