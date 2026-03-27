---
# minance2-tzgm
title: IHE-12 Fix CSV import reprocess action
status: completed
type: bug
priority: high
created_at: 2026-03-26T03:44:04Z
updated_at: 2026-03-26T03:46:07Z
---

## Goal

Fix the CSV import reprocess action so it actually reprocesses rows and refreshes the UI meaningfully.

## Todo

- [x] Reproduce the broken reprocess behavior
- [x] Identify root cause
- [x] Add failing test first (TDD)
- [x] Implement minimal fix
- [x] Run focused verification
- [x] Add summary and close if all done

## Summary of Changes

- Added a dedicated reprocess success message builder so the UI shows concrete reprocess results (rows included/excluded/invalid).
- Updated import-page reprocess flow to consume API reprocess response, refresh processed rows + import list, and surface a meaningful notice instead of silent/generic feedback.
- Added a regression test for the reprocess notice text helper to guard this UX behavior.
