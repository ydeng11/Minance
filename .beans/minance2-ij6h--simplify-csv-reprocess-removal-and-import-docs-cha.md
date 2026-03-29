---
# minance2-ij6h
title: Simplify CSV reprocess removal and import docs changes
status: completed
type: task
priority: normal
created_at: 2026-03-29T19:34:21Z
updated_at: 2026-03-29T19:34:56Z
---

Run a behavior-preserving cleanup pass on the recent CSV reprocess removal and import API docs changes.

- [x] Simplify the recent frontend and docs test code without changing behavior
- [x] Re-run targeted verification for the simplified code
- [x] Summarize the cleanup

## Summary of Changes

Simplified the recent cleanup-focused test code by directly importing `ProcessedRecordsToolbar` in the web regression test and directly importing `renderImportApiMarkdown` in the import API docs drift test, removing unnecessary module indirection and fallback branching. Also simplified the Markdown renderer assembly to build endpoint sections with a straightforward join while preserving exact output. Verified with targeted frontend and API-doc test runs.
