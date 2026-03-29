---
# minance2-jqzg
title: Remove RTK from Cursor home config
status: completed
type: task
priority: normal
created_at: 2026-03-27T20:38:32Z
updated_at: 2026-03-27T20:38:59Z
---

Remove RTK-specific instructions or hook references from ~/.cursor so Cursor no longer carries RTK-specific local setup.

- [x] Inspect live ~/.cursor references to RTK
- [x] Remove active or local backup RTK config/hooks
- [x] Verify no remaining top-level/local RTK hooks in ~/.cursor
- [x] Summarize changes and complete bean

## Summary of Changes

- Confirmed the live Cursor hooks config in `~/.cursor/hooks.json` already had an empty `preToolUse` list.
- Deleted `~/.cursor/hooks.json.bak`, which still referenced `./hooks/rtk-rewrite.sh`.
- Verified there are no remaining RTK references in the non-cache top-level files under `~/.cursor`.
