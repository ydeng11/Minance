---
# minance2-iiqd
title: Normalize emoji picker theme tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-20T05:13:09Z
updated_at: 2026-04-20T05:14:21Z
---

Continue audit cleanup by moving the shared EmojiPicker off hard-coded neutral/emerald dark palette classes so category and transaction forms stay legible in both selectable themes.\n\n## Checklist\n- [x] Add failing token contract test for EmojiPicker\n- [x] Normalize trigger, panel, empty selection, search, and group surfaces\n- [x] Run targeted and full web verification\n- [x] Append summary of changes and complete bean

## Summary of Changes

- Added a theme foundation regression test for the shared EmojiPicker.
- Replaced hard-coded neutral/emerald palette classes in the trigger, popover panel, empty selection row, search field, and picker group with semantic tokens.
- Added small local class constants for trigger and selected/unselected option states.
- Verified with focused theme test plus `pnpm --filter @minance/web lint`, `pnpm --filter @minance/web test`, and `pnpm --filter @minance/web build`.
