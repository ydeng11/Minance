---
# minance2-cely
title: Normalize recurrings page theme tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-20T03:09:27Z
updated_at: 2026-04-20T03:11:48Z
---

Continue audit cleanup by moving the Recurrings route off hard-coded neutral/emerald/slate dark palette classes so it remains legible in both selectable themes.\n\n## Checklist\n- [x] Add failing token contract test for Recurrings route\n- [x] Replace recurring list/detail surfaces and controls with semantic tokens\n- [x] Run Code Simplifier pass on touched code\n- [x] Run targeted and full web verification\n- [x] Append summary of changes and complete bean

## Summary of Changes

- Added a theme foundation regression test for the Recurrings route.
- Replaced hard-coded neutral, emerald, and slate palette classes in recurring list/detail surfaces, controls, rows, and linked transaction panels with semantic tokens.
- Consolidated recurring control, panel, button, and label class recipes into local constants.
- Verified with focused theme test plus `pnpm --filter @minance/web lint`, `pnpm --filter @minance/web test`, and `pnpm --filter @minance/web build`.
