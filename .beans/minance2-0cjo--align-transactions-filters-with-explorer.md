---
# minance2-0cjo
title: Align Transactions filters with Explorer
status: completed
type: feature
priority: normal
created_at: 2026-03-22T04:35:38Z
updated_at: 2026-03-22T14:56:25Z
---

Match the Transactions page filter bar to the Explorer page filter UI and behavior as closely as the current codebase allows.

## Checklist
- [x] Compare Explorer and Transactions filter implementations
- [x] Confirm design approach for sharing or matching the filter bar
- [x] Implement Transactions filter bar updates
- [x] Verify behavior with targeted checks
- [x] Summarize changes and close bean if complete

## Summary of Changes

- Rebuilt the Transactions filter surface into an Explorer-style command bar plus advanced-filters modal.
- Added active filter chips so applied Transactions filters can be cleared inline from the page surface.
- Kept Transactions-specific behavior intact, including multi-account filters, amount range, recurring-only, category view, and custom dates.
- Updated Playwright coverage for the new modal-driven filter flow and verified the relevant Transactions and parity specs.
- Wrote the design and implementation plan in docs/plans and resolved a stale generated .next-e2e build artifact before the final web build verification.
