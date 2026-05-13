---
# minance2-9mb3
title: Normalize accounts page theme tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-20T03:06:24Z
updated_at: 2026-04-20T03:09:00Z
---

Continue audit cleanup by moving the accounts route off hard-coded neutral/emerald dark palette classes so it remains legible in both selectable themes.\n\n## Checklist\n- [x] Add failing token contract test for accounts route\n- [x] Replace accounts surfaces, forms, cards, and dialogs with semantic tokens\n- [x] Run Code Simplifier pass on touched code\n- [x] Run targeted and full web verification\n- [x] Append summary of changes and complete bean

## Summary of Changes

- Added a theme foundation regression test for the accounts route.
- Replaced hard-coded neutral/emerald palette classes across accounts route headers, panels, cards, dialogs, forms, and primary actions with semantic tokens.
- Consolidated repeated accounts dialog, field, and button class recipes into local constants.
- Verified with focused theme test plus `pnpm --filter @minance/web lint`, `pnpm --filter @minance/web test`, and `pnpm --filter @minance/web build`.
