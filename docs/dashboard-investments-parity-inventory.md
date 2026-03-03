# Dashboard + Investments Parity Inventory (`minance2-xdy.5`)

Captured on **March 3, 2026 (America/New_York)** using the current Playwright E2E suite and source-level route inspection for self-host Minance Next.

## Capture environment

- App runtime: `npm run dev` (`http://localhost:3000` web, `http://localhost:3001` API)
- Account used by E2E: `dev@minance.local`
- Playwright coverage used for parity capture:
  - `e2e/specs/assistant-and-analytics.spec.mjs`
  - `e2e/specs/full-user-flow.spec.mjs`
  - `e2e/specs/investments-layout-parity.spec.mjs`
  - `e2e/specs/readability-contrast.spec.mjs`

## Dashboard interaction inventory (current Next UI)

### Primary controls

- Date range selector (`data-testid="dashboard-range"`) with presets from `RANGE_OPTIONS`.
- Category view selector (`data-testid="dashboard-category-view"`) supporting `granular|coarse`.
- Saved view workflow:
  - create (`POST /v1/saved-views`)
  - apply (local filter state)
  - delete (`DELETE /v1/saved-views/:id`)

### Data modules rendered

- KPI card strip (`data-testid="dashboard-kpis"`) with net flow, spend, income, and recurring spend.
- Spending trend chart (`data-testid="dashboard-trend"`).
- Advanced insights panel (`data-testid="advanced-insights"`):
  - top categories (`data-testid="analytics-category-bars"`)
  - top merchants (`data-testid="analytics-merchant-bars"`)
  - heatmap (`data-testid="analytics-heatmap"`)
  - anomalies (`data-testid="analytics-anomalies"`)

### Loading/empty/error behavior

- Loading skeletons for trend chart while dashboard payload is in-flight.
- Empty-state strings for trend, heatmap, and anomalies when range returns no data.
- Auto-fallback behavior:
  - when selected non-`all` range has zero transactions but user has data bounds, UI auto-switches to `all` and emits a message.
- Message bar (`data-testid="global-message"`) surfaces API errors and saved-view actions.

### Drill-down and routing parity status

- **Not yet implemented**:
  - card-level click-through navigation from KPI/category/merchant widgets into filtered Transactions.
  - preserved filter state propagation across tab transitions for dashboard-originated drill-down actions.
- Current dashboard acts as read/inspect surface plus saved-view persistence only.

## Investments interaction inventory (current Next UI)

### Structural parity observed

From `e2e/specs/investments-layout-parity.spec.mjs` and `apps/web/src/app/investments/page.tsx`:

- Page shell and two-column desktop layout (`data-testid="investments-main-grid"`) are stable.
- Required panels are present:
  - `investments-overview-card`
  - `investments-security-card`
  - `investments-accounts-panel`
  - `investments-metrics-panel`
  - `investments-positions-panel`
- Snapshot-based visual check exists (`investments-layout-parity.png`) with bounded diff tolerance.

### Behavioral parity status

- Investments is currently UI-first/static-reference:
  - no live `/v1/investments*` API calls
  - timeframe and search controls are presentational (no backend query effects yet)
- Suitable as a structural parity baseline for follow-on API/data wiring tasks.

## Network contract inventory (observed and source-verified)

Dashboard requests emitted for active filters:

- `GET /v1/analytics/overview?range=<...>&category_view=<granular|coarse>`
- `GET /v1/analytics/heatmap?range=<...>&category_view=<granular|coarse>`
- `GET /v1/analytics/anomalies?range=<...>&category_view=<granular|coarse>`
- `GET /v1/saved-views`
- `POST /v1/saved-views`
- `DELETE /v1/saved-views/:id`

Investments requests:

- No dedicated investments API calls yet from `/investments`.

## Self-host execution constraints

- All captured dashboard behavior relies on local `/v1` endpoints and JSON/SQLite store abstractions in this repo.
- Investments parity baseline does not require third-party market-data integrations today.
- No proprietary SaaS dependency is required for reproducing the captured interaction map.

## Gaps against requested parity scope

1. Dashboard drill-down routing parity is missing (card-to-table transitions, preserved filter context).
2. Investments remains static and not wired to holdings/positions/performance APIs.
3. Cross-tab filter handoff behavior (Dashboard → Transactions/Investments) is not yet codified.
4. Explicit empty/error/loading parity for investments data modules is pending API integration.

## Implementation-ready acceptance criteria for downstream tasks

1. Dashboard cards and insights can open target tabs with equivalent filter tokens and deterministic state restoration.
2. Investments panels are backed by live APIs with loading, empty, and error states matching dashboard/transactions conventions.
3. Saved dashboard views can be applied and then consumed by downstream drill-down routes.
4. E2E coverage asserts both structure and interaction parity for dashboard and investments flows under self-host configuration.
