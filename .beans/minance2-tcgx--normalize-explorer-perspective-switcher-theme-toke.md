---
# minance2-tcgx
title: Normalize explorer perspective switcher theme tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-21T03:28:44Z
updated_at: 2026-04-21T03:29:47Z
---

Continue audit cleanup by moving ExplorerPerspectiveTabs and the mini sparkline default off hard-coded neutral/emerald palette classes.

## Checklist
- [x] Add failing token contract coverage for perspective controls
- [x] Normalize ExplorerPerspectiveTabs and ExplorerMiniSparkline token usage
- [x] Run targeted and full web verification
- [x] Append summary of changes and complete bean

## Summary of Changes

- Added theme-foundation regression coverage for ExplorerPerspectiveTabs and ExplorerMiniSparkline.
- Replaced the perspective switcher shell, tab states, icon chips, description text, and sparkline default stroke with semantic theme tokens.
- Re-verified the original command palette and local-font review fixes remain present.

Verification: env NODE_ENV=test pnpm exec tsx --test src/app/theme-foundation.test.ts; pnpm --filter @minance/web lint; pnpm --filter @minance/web test; pnpm --filter @minance/web build.
