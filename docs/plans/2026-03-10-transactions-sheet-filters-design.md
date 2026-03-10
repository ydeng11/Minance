# Transactions Sheet Filters Design

## Scope

Refresh the `/transactions` page so the ledger behaves more like Google Sheets while staying inside the current `apps/web` stack. The page should use `@tanstack/react-table`, place filter controls in table headers, keep numeric filtering as a dual-ended range control, and move the primary `New transaction` action into a toolbar directly above the table while retaining the popup create flow.

## Goals

- Replace the current card-style filter panels with column-scoped header filters.
- Use `@tanstack/react-table` as the ledger foundation in `apps/web`.
- Support type-specific filtering:
  - string columns: operators such as `contains`, `starts with`, `ends with`, `equals`, plus optional multi-select values
  - date columns: `before`, `after`, `between`
  - numeric columns: dual-ended amount range
- Keep URL-backed filter state so filtered ledger views remain shareable.
- Preserve row actions, inline edit, pagination, and the modal create flow.

## Non-Goals

- Rebuild the entire transaction data model.
- Replace the existing create/edit validation rules.
- Add bulk edit, column drag-reorder, or spreadsheet cell editing.
- Move the feature into the legacy `src/main/webui` stack.

## Decisions

### 1. Use TanStack Table with manual filtering and pagination

`@tanstack/react-table` will own the ledger column definitions, header rendering, row rendering, and table state wiring. Filtering and pagination will remain server-backed rather than client-only because the current page already pages data, and page-local filtering would produce incomplete results and misleading multi-select options.

### 2. Model filters per column instead of as one flat form

The current filter model in `apps/web/src/app/transactions/filters.ts` is a flat object optimized for a toolbar form. The redesigned ledger needs a typed column-filter model that can represent:

- text operators and value input
- optional selected distinct values for text columns
- date operator plus start/end values
- numeric min/max bounds

The frontend will keep this as typed state and serialize it into URL search params and transaction-list API params.

### 3. Add an additive structured filter contract to the transactions API

The current `/v1/transactions` contract only supports simple flat params such as `query`, `category`, `account`, `min_amount`, and `max_amount`. That is not enough for Sheets-style operators. The API should accept an additive structured filter payload, validate it, apply it before pagination, and return facet metadata needed to populate the string-column multi-select lists.

Legacy flat params should continue to work so other callers do not break while the transactions page migrates.

### 4. Render filters as header-triggered popovers

Each table header cell will render:

- column label
- filter trigger icon/button
- compact summary badge when the column is filtered

The trigger opens a small popover anchored to the header cell. The popover content depends on the column type:

- text columns: operator selector, text input, searchable checklist of distinct values
- date column: operator selector plus one or two date inputs
- amount column: summary, dual-ended slider, min/max inputs

This keeps the header visually compact while matching the Google Sheets mental model better than a permanently visible second filter row.

### 5. Move the create CTA into a grid toolbar above the table

The current route already has a top-level create dialog. The redesign should keep the modal form but move the `New transaction` button into a ledger toolbar directly above the table surface so the action reads as part of the grid workflow instead of part of a page hero.

### 6. Keep inline row edit and existing transaction display richness

The redesigned table should preserve row edit/delete actions and the richer transaction cells already present on the page. The primary change is layout and filter interaction, not a reduction in visible transaction context.

## Architecture

### Frontend

- `page.tsx` becomes a route-level orchestrator for data loading, mutation handlers, modal state, and URL synchronization.
- A route-local TanStack table component owns column definitions and header filter rendering.
- Typed filter utilities translate between:
  - URL search params
  - API request params
  - TanStack column filter state
  - compact UI summaries shown in header badges

### Backend

- `services/api/src/server.ts` accepts the additive structured filter input on `/v1/transactions`.
- `services/api/src/transactions.ts` validates structured filters, applies them before pagination, and computes facet metadata for relevant string columns from the filtered dataset.

## Data Flow

1. URL search params are parsed into typed column filter state.
2. The transactions page sends the structured filter payload to the list endpoint.
3. The API returns paginated rows plus filter metadata such as amount bounds and string facets.
4. TanStack Table renders the rows and exposes header-level filter UI using the same typed state.
5. When a filter changes, the page resets to page 1, syncs the URL, and refetches the ledger.

## Error Handling

- Invalid filter shapes from the URL or API params should be ignored or normalized back to safe defaults instead of crashing the page.
- Unsupported operators should return validation errors from the API rather than silently mis-filtering.
- Empty facet sets should still render usable filter popovers with operator inputs and clear/reset actions.

## Testing Strategy

- Frontend unit tests for filter parsing, serialization, and URL/API param translation.
- Backend tests for structured string/date/amount filtering and facet generation.
- Playwright coverage for:
  - header filter popovers
  - text/date/amount filtering
  - toolbar placement of `New transaction`
  - modal create flow still working with the new table shell

## Risks

- Facet generation can become expensive if computed naively on every request.
  Mitigation: compute facets only for the filterable columns used by the page and base them on the already filtered transaction set before pagination.

- TanStack migration can tangle rendering and route state if all logic stays in `page.tsx`.
  Mitigation: split the table shell, column definitions, and filter UI into route-local components.

- URL encoding for typed column filters can become hard to debug.
  Mitigation: keep the encoding explicit and covered by tests instead of burying logic inside the component layer.
