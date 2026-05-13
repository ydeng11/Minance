---
# minance2-urmr
title: Fix transactions filter data reload
status: completed
type: bug
priority: normal
created_at: 2026-05-12T03:31:47Z
updated_at: 2026-05-12T03:34:06Z
---

Filtering on /transactions updates the URL/filter state but requires a full page refresh before the filtered transaction data appears.\n\n- [x] Reproduce stale data after applying a filter\n- [x] Fix filter commits to refresh ledger data immediately\n- [x] Verify in browser\n- [x] Run focused tests/checks\n- [x] Summarize changes

## Summary of Changes

Filter commits now explicitly reload transactions immediately after updating the URL, so the ledger data updates without a manual page refresh. Added a regression assertion for the commit path and verified the browser updates from all transactions to range=90d in place.
