---
# minance2-g3g7
title: Keep transaction dialog close button circular
status: completed
type: bug
priority: normal
created_at: 2026-05-21T03:17:40Z
updated_at: 2026-05-21T03:22:01Z
---

Prevent the bulk delete dialog close button from shrinking into an oval; it should remain a circular 44px icon button.

## Tasks\n\n- [x] Prevent transaction dialog close buttons from flex-shrinking\n- [x] Add focused regression coverage\n- [x] Verify with focused tests; browser click automation timed out during modal setup

## Summary of Changes\n\nAdded shrink-0 to the shared transaction dialog close button class so the 44px circular target cannot compress into an oval inside the dialog header. Added focused source-level regression coverage and verified with pnpm --filter @minance/web test -- filter-controls-ui. Browser automation reached the page but timed out while clicking row checkboxes to reopen the modal for measurement.
