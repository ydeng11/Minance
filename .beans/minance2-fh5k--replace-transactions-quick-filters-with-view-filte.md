---
# minance2-fh5k
title: Replace transactions quick filters with view filter
status: completed
type: task
priority: normal
created_at: 2026-05-12T03:45:29Z
updated_at: 2026-05-12T03:48:17Z
---

Replace the transactions quick filters panel with the Explorer-style view filter control from the Explorer page.\n\n- [x] Inspect Explorer view filter implementation\n- [x] Implement Transactions view filter replacement\n- [x] Update tests\n- [x] Verify in browser/tests\n- [x] Summarize changes

## Summary of Changes

Replaced the transactions quick-filters intro panel with an Explorer-style view filter layout. The panel now exposes Range, Filters, Apply view, Current range, Clear all, and active badges without the old Quick filters heading or explanatory copy. Verified with the in-app browser and the web test suite.
