---
# minance2-0t3q
title: Clarify AI training profile unavailable state
status: completed
type: bug
priority: normal
created_at: 2026-05-13T02:17:55Z
updated_at: 2026-05-13T02:20:44Z
---

Address review comment on Settings > AI categorization training card: explain what the training profile status means without exposing raw internal error codes like training_db_missing.\n\n- [x] Locate status rendering and API shape\n- [x] Replace internal-code copy with user-facing explanation\n- [x] Add or update focused coverage\n- [x] Verify relevant checks

## Summary of Changes\n\n- Clarified the Categorization Training panel with a short explanation of what the training profile does.\n- Replaced raw internal reason-code rendering with user-facing unavailable-state copy.\n- Added focused coverage for missing training database copy and active training profile copy.\n- Verified with @minance/web test, just build-web, and just check.\n\nNote: A headless browser launch for visual verification was attempted, but Chromium was blocked by the macOS sandbox permission error.
