## Why

Transaction management exists in the active Next.js app, but the current Transactions page still leans on a compact management layout and form placement that make review, filtering, and manual entry slower than they need to be. The requested changes point to a clearer product direction: a richer ledger-style transactions page with header-mounted filters and a faster top-level create flow.

## What Changes

- Add a dedicated Transactions ledger page and navigation entry so transaction management no longer competes with overview KPIs.
- Replace the compact transactions table presentation with a denser, more informative ledger that exposes more transaction fields and clearer row actions.
- Move filters into the page header and make them feel closer to Google Sheets filters, including a visible amount-range control for numeric filtering.
- Add a top-mounted `New transaction` button that opens a popup dialog, supports optional emoji selection for the transaction's person/counterparty marker, and places newly created transactions at the top of the ledger.
- Tighten related UX details such as newest-first ordering, responsive header layout, filter persistence/reset behavior, and a lighter Overview handoff into the ledger view.

## Capabilities

### New Capabilities
- `transactions-ledger`: A dedicated transaction-management experience with a detailed table, header-based filters, and a quick-create popup flow.

### Modified Capabilities
None.

## Impact

- Frontend routes and page layout in `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, and `apps/web/src/app/transactions/page.tsx`.
- Frontend transaction UI modules in `apps/web/src/app/transactions/*`, including filter state, form validation, and ledger rendering.
- Shared API client types and endpoints in `apps/web/src/lib/api/*`.
- Backend transaction retrieval and manual-create/update handling in `services/api/src/transactions.ts` plus the SQLite-backed store layer.
- A likely SQLite schema/storage change if counterparty emoji is persisted as a first-class transaction field instead of being derived from existing text fields.
