---
# minance2-zcvg
title: Fix Explorer duplicate search and investigate Transactions labels
status: completed
type: bug
priority: normal
created_at: 2026-03-22T15:43:34Z
updated_at: 2026-03-22T15:53:25Z
---

## Scope
- [x] Trace the duplicate search field in Explorer
- [x] Trace where `Reviewed` is rendered in Transactions category cells
- [x] Trace the source of `Legacy_API` in Transactions metadata
- [x] Trace why multiple dates render in Transactions date cells
- [x] Apply agreed UI/data fixes and verify behavior

## Summary of Changes
- Removed the Explorer advanced-filters merchant field so the main command-bar search is the only search entry point.
- Updated Transactions rows to show only `transaction_date`, hide `source_type`, and remove the review-status label from the category cell.
- Added focused Playwright coverage for both UI changes and verified the branch with `just build-web` and `just check`.
