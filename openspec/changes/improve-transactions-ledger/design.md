## Context

The active transaction-management experience lives in `apps/web/src/app/transactions/page.tsx`. The page already supports search, range filters, pagination, inline row editing, and a bottom-of-page manual transaction form, but it does not yet provide the requested top-mounted popup create flow, richer ledger presentation, or header filter treatment that feels like a spreadsheet filter row.

This change spans multiple frontend modules and touches the Node/SQLite API contract used by the Next.js app. The active stack is Next.js with Tailwind in `apps/web` and a TypeScript API service in `services/api`, so the design needs to preserve that stack and avoid redirecting implementation into the removed legacy Quarkus/React codepath.

## Goals / Non-Goals

**Goals:**
- Introduce a dedicated Transactions page that becomes the primary place for transaction CRUD and filtering.
- Move transaction filters into the page header and make them feel closer to spreadsheet-style filters than hidden grid menus.
- Expand the ledger to show richer transaction detail by default, with a clear newest-first scan order.
- Add a top-mounted `New transaction` dialog flow and let manual entry include an optional person/counterparty emoji marker.
- Keep the experience responsive on desktop and mobile without introducing non-Tailwind styling or abandoning the existing data/query stack.

**Non-Goals:**
- Rebuild the analytics/visualization pages or change their business logic beyond handing transaction management off to the new ledger route.
- Rebuild the transactions page around a new data-fetching or routing model.
- Redesign CSV import itself; import remains a separate flow.
- Introduce broad server-side search, saved views, or bulk-edit workflows beyond what is necessary for the requested ledger refresh.

## Decisions

### 1. Refocus the existing Transactions route around a ledger-style header and create flow

The existing `/transactions` route in `apps/web` will remain the transaction-management destination, but its page structure will be refocused so the filter controls and the `New transaction` action sit at the top of the page instead of being split between compact controls and an inline bottom form.

Rationale:
- The request explicitly describes a richer transactions page, and `apps/web` already provides the natural place to implement it.
- The repo already separates overview and transactions concerns in the Next app, so the remaining gap is presentation and workflow quality rather than routing existence.
- Page-specific header actions are the cleanest place to host the requested filters and top-level `New transaction` button.

Alternatives considered:
- Rebuild the feature in the removed legacy Quarkus/React stack: rejected because that is not the active app targeted by the root scripts and tests.
- Leave the current page structure intact and only restyle the table: rejected because it would not satisfy the top-mounted popup workflow or header filter request.

### 2. Keep the existing table stack, but drive it from explicit header filter state

The transactions page already uses explicit filter state in `apps/web/src/app/transactions/filters.ts` and URL search params. The user-facing filtering workflow will therefore stay page-state driven, but the controls will move into a top ledger header with a spreadsheet-style presentation and a visible amount-range bar.

Rationale:
- The existing `apps/web` page already has URL-synced filter state, so the safest change is to enhance that flow rather than replace it.
- A dedicated header treatment is lower risk than rebuilding the page around a new state model.
- Keeping the search-param model preserves pagination and drill-down link behavior already present in the route.

Alternatives considered:
- Move filtering into a sidebar: rejected because the request specifically calls for header placement.
- Keep the current flat control row: rejected because it does not create the requested Google Sheets-style filtering feel.

### 3. Implement the numeric filter as a visible amount-range bar

The header filter bar will include a visible amount-range control backed by page state. That state will map into the list API params and expose an active range summary so users can understand the filter without opening a secondary menu.

Rationale:
- The user specifically requested a bar for numeric filtering.
- A page-level range control is easier to discover and easier to reset than a hidden number menu.

Alternatives considered:
- Free-form min/max text fields only: rejected because it does not match the requested interaction model.
- Native AG Grid number filter popup only: rejected because it remains hidden behind per-column menus.

### 4. Replace the inline create form with a header-launched modal dialog

Manual transaction creation will move from the current inline page form to a `Dialog` opened by a `New transaction` button. The dialog will collect the required transaction fields plus optional detail fields and close on success. New rows will appear at the top of the ledger by making newest-first ordering explicit in both the API list ordering and the client-side display fallback.

Rationale:
- The user asked for the create action at the top and explicitly called for a popup.
- A modal isolates the create flow from the ledger and avoids forcing an inline editor to compete with filtering and scanning.

Alternatives considered:
- Inline blank row at the top of the table: rejected because it complicates sorting/filtering state and is harder to make responsive.
- Keep the existing inline form: rejected because the request explicitly calls for a top-mounted popup.

### 5. Persist emoji selection as a first-class optional transaction field

The manual-create flow will offer a curated set of person/counterparty emoji options. The selected value will be persisted as a nullable transaction attribute and rendered next to the description/person label in the ledger instead of being embedded into `description` or `memo`.

Rationale:
- Persisting the emoji separately keeps merchant/description text clean for analytics and search.
- A first-class field lets edit/create/table display stay consistent and avoids parsing hacks.

Alternatives considered:
- Prefix the emoji into `description`: rejected because it pollutes display/search text.
- Store the emoji in `memo`: rejected because it overloads an unrelated user-editable field and creates parsing ambiguity.
- Make emoji purely client-side: rejected because it would disappear after refetch or reload.

## Risks / Trade-offs

- [Shared header refactor affects every page] -> Mitigation: introduce page-specific header slots/components with safe defaults so non-transactions routes keep existing behavior.
- [Header filter state can drift from the URL-backed list state] -> Mitigation: keep one canonical filter model and continue deriving API params and pagination from it.
- [Newest-first ordering changes current table behavior] -> Mitigation: update tests and make the default ordering explicit in specs, design, and UI copy.
- [Emoji persistence adds schema and generated-model work] -> Mitigation: keep the new column nullable, additive, and backward-compatible so rollback only needs the UI path disabled.
- [More visible columns can overwhelm small screens] -> Mitigation: prioritize a stable desktop default and use horizontal scrolling/condensed cells on narrow viewports instead of removing critical controls.

## Migration Plan

1. Update the transactions page structure in `apps/web` so header controls and the `New transaction` action lead the page.
2. Expand the ledger row layout and filtering behavior while preserving the existing URL/search-param contract.
3. Update transaction retrieval/default sorting and expose any additional fields needed for the denser ledger.
4. If emoji persistence is implemented as designed, ship a nullable SQLite/storage change before wiring the dialog and ledger display.
5. Reduce the overview page to a lightweight recent-transactions preview and handoff into `/transactions`.
6. Rollback path: restore the inline create form and previous page layout while leaving any additive nullable storage field unused.

## Open Questions

- What curated emoji set best fits the intended "people" use case: household members, counterparties, or generic avatars?
- Should the CSV import button remain global in the shared header, or move into the Transactions page alongside `New transaction`?
- Which detailed columns belong in the default desktop view versus optional secondary columns?
- Should duplicate/import metadata always be visible, or only appear in a secondary detail column or row expander?
