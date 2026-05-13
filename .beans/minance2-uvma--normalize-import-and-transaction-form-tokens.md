---
# minance2-uvma
title: Normalize import and transaction form tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-20T05:11:24Z
updated_at: 2026-04-20T05:12:42Z
---

Continue audit cleanup by moving transaction editor and import helper form controls off hard-coded neutral/emerald dark palette classes so these shared form surfaces stay legible in both selectable themes.\n\n## Checklist\n- [x] Add failing token contract test for import and transaction form helpers\n- [x] Normalize transaction editor field controls\n- [x] Normalize import account selectors and processed toolbar\n- [x] Run targeted and full web verification\n- [x] Append summary of changes and complete bean

## Summary of Changes

- Added a theme foundation regression test for transaction editor and import helper form controls.
- Replaced hard-coded neutral/emerald palette classes in TransactionEditorFields with semantic field, label, text, border, and accent tokens.
- Replaced hard-coded neutral/emerald palette classes in import account selectors and the processed-records toolbar with semantic tokens.
- Verified with focused theme test plus `pnpm --filter @minance/web lint`, `pnpm --filter @minance/web test`, and `pnpm --filter @minance/web build`.
