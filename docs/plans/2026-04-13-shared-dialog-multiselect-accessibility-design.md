# Shared Dialog and Multiselect Accessibility Design

## Goal

Address the first `/audit` recommendation by hardening shared dialog and searchable multiselect accessibility without redesigning unrelated modal flows.

## Scope

- Add explicit accessible labels for searchable `MultiSelectField` inputs.
- Harden the shared shell `ViewDialog` so focus moves into the dialog on open and returns to the trigger on close.
- Harden `TransactionsAdvancedFilters` so the visible panel carries dialog semantics, receives initial focus, and restores focus on close.

## Approach

1. Keep the change centered on shared or high-impact filter components rather than refactoring every modal in the app.
2. Use test-first coverage:
   - static markup tests for dialog semantics and search input labeling
   - Playwright coverage for focus movement in the shared shell dialog
3. Implement the minimum behavior needed to satisfy the accessibility gaps called out in the audit.

## Non-Goals

- Refactoring all account/category modal dialogs in this pass
- Reworking dialog visuals or layout
- Broad accessibility audit changes beyond the first hardening recommendation
