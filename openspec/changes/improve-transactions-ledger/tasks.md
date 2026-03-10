## 1. Shell and page structure

- [x] 1.1 Refocus the existing `apps/web/src/app/transactions/page.tsx` route around a top-ledger layout and ensure navigation/entry points route users there.
- [x] 1.2 Refactor the transactions page header area so it can host page-specific filter controls and a top-mounted `New transaction` action.
- [x] 1.3 Reduce the current overview transaction card to a preview/hand-off pattern instead of the full management surface.

## 2. Ledger and filter experience

- [x] 2.1 Replace the current compact transactions table treatment in `apps/web/src/app/transactions/page.tsx` with a richer ledger that defaults to newest-first ordering and more visible detail.
- [x] 2.2 Add page-level filter state for search, category, account, transaction type, and amount range, and synchronize it with the ledger and date-range updates.
- [x] 2.3 Build Google Sheets-style filter affordances plus a visible numeric range bar using the existing Tailwind/Radix component patterns only.
- [x] 2.4 Ensure the ledger remains usable on smaller viewports through horizontal scrolling or condensed cell rendering without losing header controls.

## 3. Manual create flow and emoji support

- [x] 3.1 Add storage/API support in `services/api` for an optional person/counterparty emoji field if it is persisted separately from existing transaction text fields.
- [x] 3.2 Extend frontend transaction types, queries, and mutations to send/receive the emoji field and any additional detailed ledger fields.
- [x] 3.3 Build the top-mounted `New transaction` dialog with required validation, emoji selection, and success/error feedback.
- [x] 3.4 Make successful manual creates appear at the top of the ledger when they match active filters, and show a clear notice when they do not.

## 4. Verification

- [x] 4.1 Add or update frontend tests for routing, header filters, amount-range behavior, dialog create flow, and newest-first ledger ordering.
- [x] 4.2 Add or update `services/api` tests for detailed transaction retrieval ordering and emoji-field persistence.
- [x] 4.3 Run focused frontend and backend verification plus a manual responsive smoke test for the Transactions page.
