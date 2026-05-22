---
# minance2-71lx
title: Restyle account delete confirmation
status: completed
type: bug
priority: normal
created_at: 2026-05-22T03:32:03Z
updated_at: 2026-05-22T15:22:37Z
---

Investigate and fix the account settings delete confirmation using a plain browser popover that does not align with app styling.\n\n- [x] Locate current account delete confirmation flow\n- [x] Replace plain confirmation with styled in-app UI\n- [x] Add or update targeted coverage\n- [x] Verify checks and browser behavior

## Summary of Changes\n\nMoved the account delete confirmation styling fix into the main repo. Replaced the native delete confirm with an in-modal danger confirmation panel, added source-level regression coverage, ran the focused accounts test from main, and verified against localhost:3000 that the styled panel appears without a native dialog.
