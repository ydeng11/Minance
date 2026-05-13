---
# minance2-4eyt
title: Hide decorative help menu icons
status: completed
type: task
priority: normal
created_at: 2026-04-25T22:34:39Z
updated_at: 2026-04-25T22:35:32Z
---

Continue audit debt cleanup by marking decorative Help menu icons aria-hidden and adding regression coverage.

Checklist:
- [x] Mark decorative Help menu icons aria-hidden
- [x] Add regression coverage for the Help menu icon contract
- [x] Run focused and web verification
- [x] Complete bean and commit slice

## Summary of Changes
- Marked decorative Help menu icons aria-hidden so labeled controls and menu items keep clean accessible names.
- Added source-level coverage for the Help menu decorative icon contract.

## Verification
- env NODE_ENV=test pnpm exec tsx --test src/app/flagship-polish-contract.test.ts
- git diff --check
- pnpm --filter @minance/web lint
- pnpm --filter @minance/web test
- pnpm --filter @minance/web build
