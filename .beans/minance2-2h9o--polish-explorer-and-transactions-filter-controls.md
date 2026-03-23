---
# minance2-2h9o
title: Polish Explorer and Transactions filter controls
status: completed
type: task
priority: normal
created_at: 2026-03-23T00:19:39Z
updated_at: 2026-03-23T00:26:43Z
---

## Goal
Implement the requested Explorer and Transactions filter UI polish.

## Todo
- [x] Inspect current Explorer and Transactions advanced filter components and existing tests
- [x] Add or update tests for the requested label and control changes
- [x] Implement the UI copy and layout updates
- [x] Run targeted verification and update the bean summary

## Summary of Changes
- Added a real Explorer recurring-only advanced filter and wired it through URL state, shared cross-page filters, Transactions drill-down, and analytics API params.
- Renamed the Transactions advanced reset action to "Rest", removed the Transactions command-bar Clear button, and constrained the command-bar search width on wide screens.
- Added regression coverage for Explorer recurring filter state, backend recurring-only analytics filtering, and the updated Transactions/Explorer UI controls; verified with `just build-web` and `just check`.
