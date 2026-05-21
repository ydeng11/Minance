---
# minance2-3z1d
title: Center bulk delete dialog close icon
status: completed
type: bug
priority: normal
created_at: 2026-05-21T03:01:09Z
updated_at: 2026-05-21T03:01:51Z
---

Fix the bulk delete dialog cancel/close circular button so its X icon is visually centered.

## Tasks\n\n- [x] Center close icon in transaction dialog circular buttons\n- [x] Run focused verification

## Summary of Changes\n\nUpdated the shared transaction dialog close button class to use a fixed 44px square inline-flex layout with centered contents, fixing the off-center X icon in the bulk delete dialog. Verified with the focused web test command: pnpm --filter @minance/web test -- filter-controls-ui.
