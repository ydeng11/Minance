---
# minance2-yhss
title: Unify transactions and explorer filter layout
status: completed
type: task
priority: normal
created_at: 2026-04-08T15:22:52Z
updated_at: 2026-04-08T15:26:10Z
---

## Goal
Remove the duplicate search boxes from Transactions and Explorer filter UIs and replace the current inconsistent layouts with a clearer shared filter arrangement.

## Todo
- [ ] Inspect current Transactions and Explorer filter components
- [ ] Choose a shared layout that works for both pages without the search box
- [x] Implement the new filter layout and remove search fields where needed
- [ ] Run targeted verification for affected UI behavior
- [x] Summarize changes and close the bean if all todos are done

## Summary of Changes
- Removed the top-level search input from both Transactions and Explorer command bars.
- Reworked both command bars into matching quick-filter shelves with clearer headings, grouped controls, and in-context active filter pills.
- Normalized Explorer advanced filters to use the same wider drawer shell and action labels as Transactions.
- Added UI tests covering the new filter shelf markup and verified the full repo with just check.
