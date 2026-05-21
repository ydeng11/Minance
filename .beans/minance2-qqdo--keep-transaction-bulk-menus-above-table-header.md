---
# minance2-qqdo
title: Keep transaction bulk menus above table header
status: completed
type: bug
priority: normal
created_at: 2026-05-21T03:10:23Z
updated_at: 2026-05-21T03:12:50Z
---

Bulk action popovers on the transactions page should render above the sticky table header instead of being covered by it.

## Tasks\n\n- [x] Raise transaction bulk dropdowns above sticky table header\n- [x] Add focused regression coverage\n- [x] Verify with tests and browser

## Summary of Changes\n\nRaised the transaction bulk action bar and dropdown panel stacking levels so Category, Tags, and Review popovers render above the sticky table header. Added focused source-level regression coverage and verified with pnpm --filter @minance/web test -- filter-controls-ui plus an in-browser layer check on the Review dropdown.
