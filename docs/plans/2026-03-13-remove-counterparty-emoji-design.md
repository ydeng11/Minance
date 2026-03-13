# Remove Counterparty Emoji Design

## Scope

Remove `counterparty_emoji` from the active Minance transaction codebase so the field no longer appears in the web UI, frontend types, API normalization paths, manual transaction create/update flows, or automated tests.

## Goals

- Delete the `Person emoji` control from the transaction editor.
- Remove the Details-cell counterparty emoji badge from the transactions ledger.
- Stop reading, storing, normalizing, and returning `counterparty_emoji` in the TypeScript API stack.
- Remove test helpers and assertions that still depend on the field.

## Non-Goals

- Rework unrelated transaction metadata fields such as `memo`, `tags`, or `recurring_rule_id`.
- Introduce a broader unknown-field validation layer for the API.
- Migrate or rewrite historical legacy Java code that does not reference this field.

## Decisions

### 1. Delete the field end-to-end instead of hiding it

The field is obsolete in the product model, not just visually unused. Leaving it in request/response types or form state would keep dead behavior alive and make future cleanup harder.

### 2. Keep the removal focused on the current TypeScript app and API

The trace showed `counterparty_emoji` only in the current Next.js frontend, Playwright tests, and `services/api` TypeScript transaction logic. The legacy Java stack does not need code changes for this cleanup.

### 3. Strip the field from normalized transaction responses

Older stored records may still physically contain `counterparty_emoji`. The API normalization layer should stop copying that property into returned transaction objects so the field disappears from the contract immediately without a data migration.

### 4. Update the regression net alongside the deletion

The existing tests explicitly assert that counterparty emoji survives manual transaction creation and listing. Those tests should be rewritten to assert the new contract instead of silently removing coverage.

## Architecture

### Frontend

- Remove `counterparty_emoji` from `apps/web/src/app/transactions/form.ts`.
- Remove the shared editor select and option list from `apps/web/src/app/transactions/TransactionEditorFields.tsx`.
- Remove the Details-cell emoji badge from `apps/web/src/app/transactions/page.tsx`.
- Delete the field from the frontend `Transaction` type in `apps/web/src/lib/api/types.ts`.

### API

- Delete the counterparty emoji normalization helper and related constant from `services/api/src/transactions.ts`.
- Remove counterparty emoji handling from transaction normalization and manual create/update contract resolution.
- Ensure returned transaction objects no longer include the field.

### Tests

- Update frontend unit tests for draft creation, draft mapping, and payload validation.
- Update API normalization tests so manual transactions no longer preserve or return `counterparty_emoji`.
- Update Playwright helpers and specs that currently set or expect the emoji in transaction rows.

## Data Flow

1. New and edited manual transactions no longer collect a counterparty emoji value in the form.
2. Frontend payloads omit `counterparty_emoji`.
3. API create/update logic ignores the field because it no longer exists in the normalization contract.
4. Listed transactions return merchant, description, memo, tags, and category metadata without `counterparty_emoji`.

## Error Handling

- No new runtime error paths are required.
- Requests that include stale `counterparty_emoji` data will effectively be ignored because the server will stop reading that key.

## Testing Strategy

- Frontend unit tests for transaction form defaults, edit mapping, and normalized payload creation.
- API unit tests for manual transaction normalization and list/create response shape.
- Playwright coverage for manual transaction creation and ledger display without emoji-specific controls or assertions.

## Risks

- Existing persisted records may still contain the property on disk.
  Mitigation: remove it during normalization so the active API contract stays clean.

- Shared create/edit transaction UI may hide coupled assumptions.
  Mitigation: keep tests on both draft creation and editing paths so the shared component remains stable after field deletion.
