---
# minance2-1zjz
title: Document and plan view-based filter redesign
status: completed
type: task
priority: normal
created_at: 2026-04-08T18:06:03Z
updated_at: 2026-04-08T18:08:40Z
---

## Goal
Capture the approved View-based redesign for Transactions and Explorer filters in design and implementation plan docs.

## Todo
- [x] Review related prior filter design docs
- [ ] Write a new design doc for the approved View-based redesign
- [ ] Write a new implementation plan for the redesign
- [x] Summarize outputs and complete the bean

## Summary of Changes
- Wrote a new design doc capturing the approved shell-level `View` control, centered popup, slimmer page headers, and content-attached chip rail.
- Wrote a detailed implementation plan covering shared shell/page coordination, route-aware `View` registration, Transactions and Explorer migration steps, and targeted Playwright plus unit verification.
- Reused the existing app structure and real e2e spec paths so the plan reflects the current codebase instead of the earlier command-bar redesign assumptions.
