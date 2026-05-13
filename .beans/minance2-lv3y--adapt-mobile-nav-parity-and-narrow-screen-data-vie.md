---
# minance2-lv3y
title: Adapt mobile nav parity and narrow-screen data views
status: completed
type: bug
priority: high
created_at: 2026-04-13T12:41:50Z
updated_at: 2026-04-13T13:08:01Z
---

Follow up the audit's responsive findings by restoring mobile access to Explorer and reducing reliance on wide horizontal scrolling for key data-heavy screens.

## Tasks
- [x] Explore current mobile navigation and narrow-screen table constraints
- [x] Propose responsive adaptation approaches and confirm the design
- [x] Save the approved design doc and implementation plan
- [x] Implement the chosen changes with failing tests first
- [x] Verify responsive behavior and document the outcome

## Summary of Changes

- Reworked the mobile bottom navigation into a fixed five-slot bar with direct Explorer access and a More sheet for secondary destinations.
- Added focused tests for mobile nav parity and updated the narrow-screen transactions regression to assert the current non-overflow contract.
- Added mobile-only processed-row and reconciliation card layouts on the Import page while preserving desktop tables.
- Verified the changes with just build-web, just check, and focused Playwright coverage for mobile nav, transactions focus restore, narrow-screen transactions, and mobile import review.
