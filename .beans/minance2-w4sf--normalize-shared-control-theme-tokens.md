---
# minance2-w4sf
title: Normalize shared control theme tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-20T05:08:36Z
updated_at: 2026-04-20T05:10:50Z
---

Continue audit cleanup by moving shared navigation, filter, feedback, and recurring summary controls off hard-coded neutral/emerald dark palette classes so reusable UI remains legible in both selectable themes.\n\n## Checklist\n- [x] Add failing token contract test for shared controls\n- [x] Normalize command palette, filter controls, and status message tokens\n- [x] Normalize recurring summary/suggestion component tokens\n- [x] Run Code Simplifier pass on touched code\n- [x] Run targeted and full web verification\n- [x] Append summary of changes and complete bean

## Summary of Changes

- Added a theme foundation regression test for shared navigation, filter, feedback, and recurring controls.
- Replaced hard-coded neutral/emerald palette classes in the command palette, multi-select, active filter badges, amount range control, and status message with semantic tokens.
- Replaced hard-coded palette classes in recurring totals and suggestions components with semantic tokens.
- Verified with focused theme test plus `pnpm --filter @minance/web lint`, `pnpm --filter @minance/web test`, and `pnpm --filter @minance/web build`.
