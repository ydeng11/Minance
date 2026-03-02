# Transactions Tab Parity Inventory (`minance2-xdy.2`)

Captured on **March 1, 2026 (America/New_York)** using Playwright CLI against local Minance Next.

## Capture environment

- App runtime: `npm run dev` (`http://localhost:3000` web, `http://localhost:3001` API)
- Account used: `dev@minance.local`
- Playwright artifacts:
  - `output/playwright/parity/minance2-xdy.2/transactions-initial.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.2/after-create.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.2/search-transfer.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.2/after-edit.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.2/after-delete.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.2/filter-dining.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.2/coarse-stale-filter.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.2/coarse-after-apply.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.2/needs-review.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.2/network.log`
  - `output/playwright/parity/minance2-xdy.2/console.log`

## Lifecycle behavior observed in current Next UI

### Create manual transaction

- Supported via "Manual Transaction" form.
- Required validations observed:
  - `transaction_date` required
  - `description` required
  - `amount` numeric and required
- Form writes through `POST /v1/transactions` and refreshes categories/transactions/overview.
- After successful create, form resets to defaults and table updates.

### Edit transaction

- Row-level `Edit` loads selected transaction values into the same form.
- Submit button label switches from `Save` to `Update`.
- Update writes through `PUT /v1/transactions/:id` and reloads datasets.

### Delete transaction

- Row-level `Delete` calls `DELETE /v1/transactions/:id` (204 response observed).
- Table updates after delete and empty-state row appears when result set is empty.
- No confirmation modal is shown before destructive delete.

### Search and filters

- Merchant search box (`query`) applies with top-right filter button.
- Advanced filter panel supports:
  - category filter
  - range filter
  - category-view toggle (`granular|coarse`)
  - needs-review checkbox
- "Apply filters" button triggers `GET /v1/transactions` and `GET /v1/analytics/overview`.

### Category-view behavior

- Granular mode shows granular category label/emoji in table.
- Coarse mode switches category dimension and filter options to coarse values.
- Observed edge case:
  - switching from granular with category `Dining` to coarse mode issued request with stale category parameter (`category=Dining&category_view=coarse`), producing zero rows.
  - second apply without category restored expected rows.

### Needs-review behavior

- Setting `needs_category_review=true` returns no rows for manually created transactions (expected because manual creates set `needs_category_review=false`).

## Network contract observed from live session

Representative requests from `network.log`:

- `GET /v1/transactions?category_view=granular&range=all&limit=200`
- `GET /v1/transactions?query=Transfer&category_view=granular&range=all&limit=200`
- `POST /v1/transactions`
- `PUT /v1/transactions/:id`
- `DELETE /v1/transactions/:id`
- `GET /v1/transactions?category=Dining&category_view=granular&range=all&limit=200`
- `GET /v1/transactions?category=Dining&category_view=coarse&range=all&limit=200` (stale category edge case)
- `GET /v1/transactions?category_view=coarse&range=all&needs_category_review=true&limit=200`

## Server-side validation and persistence semantics (current `/v1` stack)

From `services/api/src/transactions.js` and `services/api/src/server.js`:

- `POST /v1/transactions`
  - normalizes manual input
  - creates account on-demand from `account_name` if missing
  - resolves category via category strategy resolver
  - forces `needs_category_review=false` for manual creates
- `PUT /v1/transactions/:id`
  - same normalization path as create
  - not-found throws error
  - updates dedupe fingerprint
  - may auto-create category rule after repeated correction patterns
- `DELETE /v1/transactions/:id`
  - removes user-owned transaction; not-found throws error
- `GET /v1/transactions`
  - supports `start,end,range,category_view,category,merchant,source_type,query,needs_category_review,limit,offset`
  - returns `{ total, items, meta }`

## Gaps against requested Copilot-style parity scope

Issue asks for parity across create/edit/delete, transfer handling, review state, category/tag assignment, search/filter, bulk actions, and error states.

Currently missing or incomplete in Transactions UI/API:

- Transfer-specific workflow semantics (paired transfers, linked account moves, validation) beyond category value `Transfer`.
- Tag assignment/edit controls and tag-based filtering.
- Bulk row selection/actions (batch review state changes, batch category/tag updates, multi-delete safeguards).
- Review workflow controls for manually toggling review/unreview state.
- Rich delete safety UX (confirmation/undo/idempotency messaging).
- Advanced error-state UX around failed mutations and partial refresh failures.

## Implementation-ready acceptance criteria for downstream tasks

1. Manual create/edit/delete paths remain functional with explicit success and failure UI states.
2. Transfer flow distinguishes true account-transfer operations from plain categorized transactions and enforces required linkage rules.
3. Transactions table supports tags end-to-end: create/edit, display, filter tokens, and API persistence.
4. Bulk workflow supports multi-select and batch operations for review/category/tag updates with optimistic state and rollback behavior.
5. Review lifecycle is first-class: user can mark/unmark review state and filter by it deterministically.
6. Filter model avoids stale parameter leakage across category-view mode changes.
7. Delete operation includes confirmation or undo semantics to reduce destructive mistakes.

