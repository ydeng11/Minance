---
# minance2-1up5
title: Finish final audit polish
status: completed
type: task
priority: normal
created_at: 2026-05-12T03:03:18Z
updated_at: 2026-05-12T03:06:24Z
---

Resolve the remaining P3 post-remediation audit item by reducing residual repeated gradient shell usage, then rerun checks.\n\n- [x] Inspect gradient shell usage\n- [x] Normalize remaining framed tool surfaces\n- [x] Run verification\n- [x] Complete audit polish

## Summary of Changes\n\nRemoved the remaining gradient-panel utility usage from app and component surfaces while preserving shell-only gradient chrome. Updated the theme foundation contract to assert semantic panel surfaces instead of gradient panels. Verified with eslint, the @minance/web unit suite, production build, and focused Playwright accessibility/contrast/responsive specs.
