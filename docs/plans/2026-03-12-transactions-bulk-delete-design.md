# Transactions Bulk Delete Design

## Scope

Add a clean multi-select and bulk delete workflow to the `/transactions` ledger. The workflow should let users select rows from the currently visible page, review a clear destructive confirmation, and delete those selected transactions in one action without disturbing the rest of the transactions page behavior.

## Goals

- Let users select multiple transactions from the currently visible ledger page.
- Provide a clear, low-noise bulk action surface that appears only when rows are selected.
- Reuse the existing transaction delete semantics so bulk delete behaves like repeated single-row deletes.
- Clear selection whenever the visible ledger changes, so users never unknowingly delete rows from a stale or hidden selection set.

## Non-Goals

- Preserve selection across pages, filters, or refreshes.
- Add “select all matching results” across the full filtered dataset.
- Add undo, trash-bin browsing, or restore-from-bulk-delete UX in this pass.
- Change transaction creation, inline edit, filter semantics, or pagination behavior.
- Redesign the `counterparty_emoji` field in this task.

## Decisions

### 1. Selection is limited to the current visible page

Bulk delete should only operate on rows currently rendered in the ledger table. Selection is not persistent across pagination, filter changes, route refresh, or refetches. This keeps the mental model simple: if a row is no longer visible, it is no longer selected.

### 2. Use inline row checkboxes plus a header “select visible” control

The ledger will gain a leading selection column with:

- one checkbox per transaction row
- one header checkbox that selects or clears all currently visible rows

This is the most familiar batch-action pattern for tabular data and does not require a separate selection mode.

### 3. Show bulk actions only when the user has selected rows

When zero rows are selected, the ledger should look normal. When one or more rows are selected, a compact bulk action bar should appear above the table surface and show:

- selected count
- `Clear selection`
- `Delete selected`

The action bar should feel attached to the ledger rather than the page header so the action stays visually tied to the selected rows.

### 4. Confirm bulk delete explicitly

Clicking `Delete selected` should open a confirmation dialog that states exactly how many selected transactions will be deleted. The dialog copy should make it clear that:

- only the currently selected visible rows are affected
- the selection will clear after delete

The primary destructive action should be visually distinct, and the cancel path should be easy to reach.

### 5. Reuse the bulk transactions endpoint instead of inventing a separate delete route

The backend already supports `/v1/transactions/bulk` for multi-row transaction changes. Bulk delete should extend that existing path with an explicit delete operation rather than introducing an entirely new endpoint shape. This keeps transaction batch mutation behavior centralized.

### 6. Keep failure behavior predictable

If any selected transaction id is invalid or no longer available, the bulk delete request should fail clearly instead of partially succeeding silently. After a successful delete, the client should:

- clear selection
- refresh the current ledger
- show a success message such as `3 transactions deleted.`

## Architecture

### Frontend

- `apps/web/src/app/transactions/page.tsx` remains the route-level owner of selection state, delete confirmation state, and ledger refresh.
- Row selection helpers may be added in the transactions route if they make checkbox state transitions easier to test.
- `apps/web/src/lib/api/types.ts` and `apps/web/src/lib/api/endpoints.ts` will extend the existing transactions bulk mutation contract to support delete.

### Backend

- `services/api/src/server.ts` continues to route `/v1/transactions/bulk`.
- `services/api/src/transactions.ts` extends the bulk transaction mutation logic to accept a delete operation and soft-delete the selected records.
- Existing single-row delete semantics stay unchanged.

## Data Flow

1. The ledger renders the visible page of transactions.
2. The user selects one or more visible rows.
3. The page derives selected ids from the current visible ledger rows.
4. The user confirms bulk delete.
5. The client sends the selected ids to the bulk transactions endpoint with an explicit delete operation.
6. The API soft-deletes those transactions.
7. The client clears selection, reloads the current ledger view, and shows a success message.

## Error Handling

- If the bulk request is invalid, the page should show the returned error message and keep the selection so the user can retry or clear it.
- If filters or pagination change, the page should clear selection immediately instead of attempting to preserve stale ids.
- Opening inline edit or the create dialog should clear selection so destructive batch actions do not compete with active form state.

## Testing Strategy

- API contract tests for bulk delete success and error cases.
- Frontend tests for selection helpers and visible-page-only behavior if helpers are extracted.
- Playwright coverage for:
  - selecting individual rows
  - selecting all visible rows
  - clearing selection
  - confirming bulk delete
  - clearing selection when pagination or filters change
  - verifying deleted rows disappear after refresh

## Risks

- Batch delete can feel scary if the selected scope is unclear.
  Mitigation: keep selection visible-page only, show exact counts, and require confirmation.

- Selection state can drift if rows change underneath the page.
  Mitigation: clear selection on any ledger reload trigger such as filter apply, pagination, or manual refresh.

- Extending the existing bulk endpoint could accidentally blur different mutation shapes.
  Mitigation: make delete an explicit, validated operation and reject mixed or ambiguous payloads.
