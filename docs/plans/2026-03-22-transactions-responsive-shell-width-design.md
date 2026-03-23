# Transactions Responsive Shell Width Design

**Date:** 2026-03-22

## Goal

Make the Transactions page use browser width proportionally while preserving good scanability for a dense ledger workflow.

## Current State

- `apps/web/src/components/layout/Shell.tsx` already gives the shell container `w-full`, centered layout, and responsive padding.
- `apps/web/src/components/layout/shellWidth.ts` currently returns the same `max-w-6xl` cap for all routes.
- Transactions is a data-dense route with filters, actions, status summary, and a ledger table, so it benefits from a wider working area than narrative-style pages.

## Approved Direction

- Use a fluid-with-cap shell for `/transactions` routes.
- Keep standard pages on `max-w-6xl`.
- Restore a wider Transactions cap of `max-w-[96rem]`.

## Rationale

- The shell is already fluid because the container uses `w-full`; the width only stops growing when `max-w-*` caps it.
- A wider cap gives the Transactions ledger more room on laptop and desktop screens without forcing full-width layouts on ultrawide monitors.
- Pure full-width layouts increase scan distance across rows and controls.
- Percentage-based `vw` sizing would duplicate behavior the shell already gets from `w-full` and would add extra layout complexity without improving UX.

## Behavior Requirements

- `/transactions` and nested Transactions routes should expand with browser width until they reach the wider cap.
- Non-Transactions pages should keep the standard app width.
- Mobile and small-screen behavior should remain effectively unchanged because `w-full` still governs narrow viewports.
- The change should stay isolated to the shell width helper rather than adding page-local width overrides.

## Testing Direction

- Update `apps/web/src/components/layout/shellWidth.test.ts` so Transactions routes expect `max-w-[96rem]` and standard pages still expect `max-w-6xl`.
- Keep the implementation limited to `apps/web/src/components/layout/shellWidth.ts`.
- Verify with:
  - `pnpm --filter @minance/web test src/components/layout/shellWidth.test.ts`
  - `just build-web`
  - `just check`
