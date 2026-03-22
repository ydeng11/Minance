# Transactions Explorer Filter Bar Design

**Date:** 2026-03-22

## Goal

Make the Transactions page filter experience match the Explorer page pattern: a compact command bar, active filter chips, and an advanced-filters modal.

## Current State

- `apps/web/src/app/transactions/page.tsx` renders a dense two-row inline filter surface.
- `apps/web/src/app/explorer/page.tsx` uses `ExplorerCommandBar`, active-filter chips, and `ExplorerAdvancedFilters`.
- Transactions currently supports behavior that Explorer does not expose directly, including multi-account selection and a recurring-only filter.

## Approved Direction

- Replace the Transactions inline filter surface with an Explorer-style command bar.
- Keep the command bar focused on quick filters:
  - search
  - date range
  - `+ Filter` entry point
- Move the rest of the Transactions filters into a modal patterned after `ExplorerAdvancedFilters`.
- Add active-filter chips below the command bar so users can clear applied filters directly.

## Behavior Requirements

- Preserve existing Transactions filter semantics.
- Preserve draft editing and explicit apply behavior for Transactions filters.
- Preserve URL syncing and page reset behavior.
- Preserve multi-account filtering by keeping it in the advanced modal.
- Preserve transaction-specific filters:
  - categories
  - accounts
  - transaction types
  - category view
  - amount range
  - tag
  - recurring only
  - custom start and end dates when range is `custom`

## Component Direction

- Extract the Transactions filter UI into dedicated components instead of keeping the full implementation in `page.tsx`.
- Mirror Explorer styling closely, but keep Transactions-specific labels and controls where needed.
- Reuse shared controls that already exist:
  - `MultiSelectField`
  - `AmountRangeControl`

## Testing Direction

- Update Playwright coverage to assert the new command-bar and modal structure.
- Keep existing filter-behavior coverage passing, including category view and multi-select filtering.
- Add or adjust tests for:
  - opening advanced filters
  - applying filters from the modal
  - displaying active filter chips
  - showing custom date fields only when the range is `custom`
