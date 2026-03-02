# Recurrings Tab Parity Inventory (`minance2-xdy.4`)

Captured on **March 1, 2026 (America/New_York)** using Playwright CLI against local Minance Next.

## Capture environment

- App runtime: `npm run dev` (`http://localhost:3000` web, `http://localhost:3001` API)
- Account used: `dev@minance.local`
- Playwright artifacts:
  - `output/playwright/parity/minance2-xdy.4/recurrings-page.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.4/network.log`
  - `output/playwright/parity/minance2-xdy.4/console.log`

## Actual behavior observed in current Next UI

1. `/recurrings` renders static sample rows (Rent, Streaming Bundle, Auto Insurance).
2. Rule statuses (`active`, `paused`) are visual-only badges.
3. No controls exist for create, edit, pause/resume, archive, delete, or linking.
4. No rule detail panel or linked transaction list is accessible.
5. Network capture shows no recurring API calls; only app-shell requests and RSC route fetch are present.

## Existing backend surface related to recurring behavior

- No `/v1/recurrings` (or equivalent recurring rule) endpoints are currently defined in `services/api/src/server.js`.
- Current backend derives "recurring spend" only as an analytics heuristic (`services/api/src/analytics.js`) from repeated merchants, not explicit user-managed recurring rules.

## Expected parity lifecycle scope (from issue requirements)

The parity task requires recurring rule lifecycle coverage for:

- rule creation
- rule-to-transaction linking/matching
- pause/resume state transitions
- archive/unarchive semantics
- delete semantics
- linked transaction visibility and association behavior
- timing semantics and edge-case handling

## Contract and behavior gaps

### UI gaps

- Missing recurring rule list backed by persisted rules.
- Missing add/edit recurring rule workflow.
- Missing row-level lifecycle actions (pause/resume/archive/delete).
- Missing detail view for linked transactions and matching diagnostics.

### API gaps

- Missing rule CRUD endpoints.
- Missing pause/resume/archive state mutation endpoints.
- Missing rule evaluation/match-preview endpoint.
- Missing endpoint for fetching linked transactions per rule.

### Semantics gaps

- No documented cadence/next-run calculation semantics.
- No timezone/day-boundary semantics for recurring evaluation.
- No explicit conflict/idempotency behavior for lifecycle mutations.

## Implementation-ready acceptance criteria for downstream tasks

1. Recurrings tab lists persisted recurring rules with status, cadence, amount/context, and last/next match metadata.
2. Users can create and edit rules with deterministic validation and clear error feedback.
3. Pause/resume/archive/delete actions are available and reflected immediately in UI state.
4. Each rule exposes linked transactions and why a transaction is or is not linked.
5. API provides explicit rule lifecycle endpoints and stable response envelopes for UI rendering.
6. Rule matching/evaluation is deterministic for a given timezone/date context and documented in contract tests.
7. Deletion and archive behaviors are safe and auditable (state transitions and side effects are explicit).

