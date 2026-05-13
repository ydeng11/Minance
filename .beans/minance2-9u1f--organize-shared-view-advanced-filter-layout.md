---
# minance2-9u1f
title: Organize shared View advanced filter layout
status: completed
type: task
priority: normal
created_at: 2026-05-12T13:58:24Z
updated_at: 2026-05-12T14:14:57Z
---

Improve the shared View advanced filter UI so controls align cleanly in rows and the Transactions dialog no longer has staggered dropdowns.\n\n- [x] Adjust shared advanced filter layout\n- [x] Update UI tests\n- [x] Verify in browser\n- [x] Run relevant checks



## Summary of Changes

- Reworked the shared View advanced filter block into an organized layout: dropdown controls align in a dedicated top grid, amount range sits in its own band, and recurring/tag controls sit below.
- Added labels for the category and type multi-select controls so all dropdowns share the same vertical structure.
- Updated UI tests for Transactions and Explorer shared View layouts.
- Verified the Transactions dialog with browser automation: category, category view, and type controls all render at the same y-coordinate with equal heights.
- Ran pnpm --filter @minance/web test, just check, and just build-web.
