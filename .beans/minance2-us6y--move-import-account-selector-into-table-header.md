---
# minance2-us6y
title: Move import account selector into table header
status: completed
type: task
priority: normal
created_at: 2026-05-21T14:43:10Z
updated_at: 2026-05-22T01:49:14Z
---

Move the import-level account selector from its separate panel into the Account column header while preserving row-level account exception edits.\n\n- [x] Inspect processed records editor structure\n- [x] Move account selector into Account header\n- [x] Update tests and validate

## Summary of Changes

Moved the import-level account selector into the Account table header on desktop, kept a compact mobile fallback for the card layout, and preserved row-level account selects for exceptions. Updated the selector test contract and validated with browser inspection plus just check.

## Follow-up

Refine the Account header integration from an embedded select to a cleaner icon-triggered popover.\n\n- [x] Replace embedded header select with label and icon trigger\n- [x] Add compact popover selector anchored to Account header\n- [x] Validate tests; browser auth blocked before visual pass

## Follow-up Summary

Replaced the embedded Account header select with a compact WalletCards icon trigger and an anchored popover selector. Kept the mobile selector fallback and selected-account chip behavior. Focused import tests and just check passed; browser automation reached an unauthenticated local session before visual confirmation.

## Follow-up 2

Remove the selected-account chip from the Account header so the header stays compact.\n\n- [x] Remove Account header chip\n- [x] Validate focused import tests

## Follow-up 2 Summary

Removed the selected-account chip from the Account table header and left only the Account label plus wallet popover trigger. Focused import tests passed.

## Follow-up 3

Tighten the Account header trigger width so it matches neighboring table headers.\n\n- [x] Remove forced Account header min-width\n- [x] Validate focused import tests

## Follow-up 3 Summary

Removed the forced min-width from the Account header wrapper so the header fits to the Account label and wallet trigger like neighboring headers. Focused import tests passed.

## Follow-up 4

Set the Account table column width to match neighboring headers at 123px.\n\n- [x] Apply fixed Account column width\n- [x] Validate focused import tests

## Follow-up 4 Summary

Pinned the Account column to 123px with a colgroup width and matching Account header cell class so the header no longer expands beyond neighboring columns. Focused import tests passed.

## Follow-up 5

Center processed table header labels within their th cells.\n\n- [x] Center th label content\n- [x] Validate focused import tests

## Follow-up 5 Summary

Centered the processed table header row labels and centered the Account label/icon wrapper inside its fixed-width th. Focused import tests passed.

## Follow-up 6

Move processed status filter from the panel toolbar into the Review table header with an icon popover.\n\n- [x] Move desktop status filter into Review header\n- [x] Keep mobile fallback outside hidden table\n- [x] Validate focused import tests

## Follow-up 6 Summary

Moved the processed status filter into a Review header icon popover on desktop, kept the existing toolbar select as a mobile fallback, and preserved the same status-filter/openImport behavior. Focused import tests passed.

## Follow-up 7

Tighten the Review status filter popover so it stays inside the table and avoids the left navigation.\n\n- [x] Make Review status popover compact and inward-opening\n- [x] Validate focused import tests

## Follow-up 7 Summary

Gave the Review status filter its own compact, left-anchored popover so it opens inward from the first table column and no longer overlaps the left navigation. Focused import tests passed.

## Follow-up 8

Refine the table-header popover controls after visual review.\n\n- [x] Swap Review header to a smaller filter/selector icon\n- [x] Reposition header popovers for easier viewing\n- [x] Validate focused import tests

## Follow-up 8 Summary

Swapped the Review header control to a smaller Funnel icon, reduced both header trigger icons, and moved the Review and Account popovers above the table header so they are easier to view and no longer cover the table body. Focused import tests passed.

## Follow-up 9

Make the Review filter popover visible when opened above the table header.\n\n- [x] Prevent the upward filter popover from being clipped\n- [x] Validate focused import tests

## Follow-up 9 Summary

Changed the table header popovers from clipped in-table absolute panels to fixed viewport overlays positioned from the trigger button, keeping them above the header while preventing the table scroll container from hiding them. Focused import tests passed.

## Follow-up 10

Make table-header popovers close with common menu behavior.\n\n- [x] Close popovers on outside click and Escape\n- [x] Validate focused import tests

## Follow-up 10 Summary

Added common popover dismissal behavior for the table header controls: outside pointer clicks and Escape now close the active Review or Account popover, while clicks inside the popover or on its trigger remain interactive. Focused import tests passed.

## Follow-up 11

Dismiss fixed header popovers when the page or table scrolls.\n\n- [x] Close active header popover on scroll and resize\n- [x] Validate focused import tests

## Follow-up 11 Summary

Added scroll and resize dismissal to the fixed header popovers, including capture-phase scroll handling so page scrolling and table scrolling both close the active popover instead of letting it drift away from the trigger. Focused import tests passed.
