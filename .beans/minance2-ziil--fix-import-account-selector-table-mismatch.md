---
# minance2-ziil
title: Fix import account selector table mismatch
status: completed
type: bug
priority: normal
created_at: 2026-05-21T13:29:41Z
updated_at: 2026-05-21T13:30:57Z
---

Changing the Import into account selector can leave processed-row account cells showing the previous account, making the commit source ambiguous.\n\n- [x] Confirm current row update behavior\n- [x] Make import account selection update processed row account values consistently\n- [x] Add focused regression coverage\n- [x] Run validation

## Summary of Changes\n\nChanged the Import into account selector to bulk-update every processed row for the import, so the processed table's Account column matches the selected account before commit. Added a regression assertion in the import page tests and verified with the focused web test plus just check.
