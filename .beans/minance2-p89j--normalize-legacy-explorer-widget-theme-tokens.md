---
# minance2-p89j
title: Normalize legacy explorer widget theme tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-21T00:11:44Z
updated_at: 2026-04-21T00:13:57Z
---

Continue audit cleanup by moving the older explorer breakdown and saved-view widgets off hard-coded neutral/emerald dark palette classes so they follow the shared light/dark theme tokens.

## Checklist
- [x] Add failing token contract coverage for explorer widgets
- [x] Normalize AccountBreakdown, CategoryBreakdown, and SavedViews surfaces and controls
- [x] Run Code Simplifier pass on touched code
- [x] Run targeted and full web verification
- [x] Append summary of changes and complete bean

## Summary of Changes

- Added theme-foundation regression coverage for AccountBreakdown, CategoryBreakdown, and SavedViews.
- Replaced legacy neutral/emerald classes with semantic surface, text, border, accent, shadow, and focus-ring tokens.
- Simplified repeated saved-view focus styles into a shared recipe.

Verification: env NODE_ENV=test pnpm exec tsx --test src/app/theme-foundation.test.ts; pnpm --filter @minance/web lint; pnpm --filter @minance/web test; pnpm --filter @minance/web build.
