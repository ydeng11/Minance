---
# minance2-nqqy
title: Remove RTK from Codex home config
status: completed
type: task
priority: normal
created_at: 2026-03-27T20:36:29Z
updated_at: 2026-03-27T20:37:39Z
---

Remove RTK-specific instructions and related top-level files from ~/.codex so Codex no longer loads RTK guidance.

- [x] Inspect live ~/.codex references to RTK
- [x] Remove the active RTK include/config
- [x] Verify no remaining top-level RTK hooks in ~/.codex
- [x] Summarize changes and complete bean

## Summary of Changes

- Removed the `@RTK.md` include from `~/.codex/AGENTS.md`.
- Deleted `~/.codex/RTK.md`, which contained the RTK shell-prefix instructions.
- Verified `~/.codex` no longer has a top-level RTK markdown file or active AGENTS hook.
