---
# minance2-4lyp
title: Discuss redesign direction for explorer and transactions filters
status: completed
type: task
priority: normal
created_at: 2026-04-08T16:03:29Z
updated_at: 2026-04-08T18:02:35Z
---

## Goal
Discuss a better visual and structural redesign for the Transactions and Explorer filters, including whether the date range should move into the filter popup and whether quick access should move into the global shell header near AI Assistant.

## Todo
- [ ] Review current shell header and page-level filter placement
- [x] Review existing transactions and explorer headers and filter controls
- [x] Propose redesign options with trade-offs
- [x] Capture the recommended direction and open questions

## Decision Notes
- Locked: use a quiet shell-header trigger labeled `View` with no inline date-range or filter-count text.
- Working direction: remove the page-level filter command bar, move date controls into the popup, and keep current filter state visible on the page itself.

## Approval Notes
- User approved the overall direction: quiet global `View` trigger in the shell, page-level active chips, and the filter popup owning date range plus the rest of the filter controls.

## Decision Notes
- Locked: active filter chips should be visually attached to the top edge of the main table/card shell instead of floating directly under the page header.

## Decision Notes
- Locked: do not show the default date scope in the attached chip rail; only non-default filters and non-default date scope should appear there.

## Decision Notes
- Locked: the `View` control opens a centered popup, not a right-side panel.

## Decision Notes
- Locked: the `View` popup uses draft-style controls with `Reset` and `Apply` rather than immediate live updates.

## Decision Notes
- Locked: simplify Transactions and Explorer page headers into slimmer title/action rows instead of large hero-style cards once `View` becomes the main lens control.

## Recommendation Notes
- Recommended: show the shell-level `View` trigger only on Transactions and Explorer. Rationale: the control is page-specific, and a disabled or irrelevant global control would add noise to the shared header.

## Decision Notes
- Locked: show the shell-level `View` trigger only on Transactions and Explorer.
- Locked: position `View` before `AI Assistant` in the shell header.

## Summary of Changes
- Discussed a redesign for Transactions and Explorer view controls without implementation.
- Locked a quiet shell-header `View` trigger that appears only on Transactions and Explorer, positioned before `AI Assistant`.
- Locked a centered draft-style popup with `Reset` and `Apply`, with date range moved into the popup as part of the full view/filter form.
- Locked slimmer page headers, with active filter chips visually attached to the top edge of the table/card shell.
- Locked that the chip rail stays hidden for the default view and only appears for non-default state.
