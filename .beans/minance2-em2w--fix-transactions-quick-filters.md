---
# minance2-em2w
title: Fix transactions Quick Filters
status: completed
type: bug
priority: normal
created_at: 2026-05-12T03:20:25Z
updated_at: 2026-05-12T03:24:20Z
---

Investigate and fix Quick Filters on /transactions?range=90d.

- [x] Reproduce the issue in the browser
- [x] Identify the broken filter behavior
- [x] Implement the fix
- [x] Verify with browser and tests
- [x] Summarize changes

## Summary of Changes

Quick Filters now clear applied filters instead of only changing draft filter state. The command bar badges are derived from the applied URL filters, Clear all commits the default filter state immediately, and individual badge removal commits the corresponding cleared filter. Verified with browser interactions and project checks.
