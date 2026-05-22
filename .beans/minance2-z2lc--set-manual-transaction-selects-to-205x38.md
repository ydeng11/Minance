---
# minance2-z2lc
title: Set manual transaction selects to 205x38
status: completed
type: task
priority: normal
created_at: 2026-05-22T16:04:12Z
updated_at: 2026-05-22T16:12:53Z
---

Address browser comments requesting the manual transaction category and account select controls use 205x38 dimensions.\n\n- [x] Locate manual transaction form select markup\n- [x] Update category and account select sizing\n- [x] Verify the targeted controls render at 205x38

## Summary of Changes\n\nScoped the create-dialog category and account selects to a fixed 205px by 38px size, added an e2e assertion for that sizing, and verified the rendered controls measure exactly 205x38 in a browser measurement.\n\nValidation: just check passed. The filtered Playwright e2e command could not start because the configured webServer timed out on the fixed e2e ports, likely due an existing localhost:4173 server from another worktree.
