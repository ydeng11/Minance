# Transactions Workspace Refresh Design

## Scope

Refresh the `/transactions` page so it feels wider, calmer, and easier to scan inside the existing Minance shell. The redesign should keep the current dark visual language, preserve all current transaction-management features, and reduce the "squeezed" feeling caused by the current stacked filter cards and narrow ledger workspace.

## Goals

- Make the transactions route feel roomier without changing the rest of the app's layout system.
- Keep every existing feature on the page: search, filters, amount range, create dialog, inline edit, delete, pagination, and URL-backed state.
- Improve visual comfort with cleaner spacing, softer contrast, and more deliberate column sizing.
- Preserve the current Minance aesthetic instead of introducing a separate light-theme or off-brand design treatment.

## Non-Goals

- Rebuild the transactions API or filter semantics.
- Remove explicit `Apply filters` and `Clear` controls.
- Replace the create dialog or inline edit flow with a new interaction model.
- Introduce custom CSS, non-TSX frontend files, or a parallel design system.

## Decisions

### 1. Give `/transactions` a roomier shell container

The app shell currently caps all pages at `max-w-6xl`, which makes the transactions page compete for width with both a dense filter surface and a wide ledger table. The redesign will add a route-aware shell width rule so `/transactions` can expand beyond the default container while the rest of the application keeps the current max width.

This is the lowest-risk way to make the page feel less squeezed because it does not require new navigation structure, a side rail, or hidden controls.

### 2. Replace the heavy hero treatment with a compact workspace header

The current transactions header reads like a marketing hero followed by a second, larger filter surface. The redesign should compress the route title, supporting copy, row-count summary, and `New transaction` CTA into a cleaner workspace header that uses less height and less visual weight.

The page should still open with clear orientation, but the ledger should become the primary focal point instead of the header block.

### 3. Consolidate filters into a calmer two-row control surface

The redesign will keep all current filters visible, but place them into a more deliberate two-row layout:

- primary row: search, category, account, type, view
- secondary row: range, tag, amount filter, apply, clear

When the date range is set to `Custom`, the start and end date inputs should appear inline within the filter surface without forcing the entire layout to collapse. When a preset range is selected, the current filler helper cards should be removed and replaced with a lighter single-line explanation plus the active-filter count.

This keeps the page functional for users who want visible controls, while reducing the feeling that every control is trapped inside an equally weighted card.

### 4. Rebalance the ledger around scan-friendly column widths

The ledger should remain the main transaction review surface, but the table should use more intentional column sizing:

- `Details` becomes the flex column with the most room.
- `Dates`, `Type`, `Amount`, and `Actions` become narrower, more disciplined columns.
- `Category` and `Account` retain enough width for chips and labels without expanding unpredictably.

The visual treatment should stay dark, but with subtler borders, slightly softer surface contrast, more padding, and cleaner spacing between dense row elements. Rich row content such as emoji markers, notes, tags, source chips, category badges, and inline edit rows should all remain.

### 5. Keep behavior and data flow intact

The redesign is layout-first, not behavior-first. Existing logic for:

- filter state
- URL synchronization
- transaction loading
- modal create
- inline edit
- delete
- pagination

should remain intact unless a tiny supporting refactor is needed to make the new layout easier to maintain.

### 6. Prefer honest responsive overflow over hidden features

On smaller screens, the filter surface should stack cleanly, and the ledger should remain horizontally scrollable. The redesign should not hide key controls behind a secondary drawer or collapse primary actions into menus unless absolutely necessary.

The responsive goal is "still fully usable" rather than "visually identical to desktop."

## Architecture

### Frontend

- `apps/web/src/components/layout/Shell.tsx` will gain a small route-aware width decision so `/transactions` can use a wider content container without affecting other routes.
- `apps/web/src/app/transactions/page.tsx` will remain the route-level orchestrator for data loading, form state, filter state, mutations, and rendering.
- Small route-local constants or helper functions may be extracted only if they make the layout easier to reason about; no component split is required unless the JSX becomes too difficult to maintain.

### Backend

No backend or API changes are expected for this redesign.

## Data Flow

The page's data flow should remain unchanged:

1. URL search params are parsed into transaction filter state.
2. The page loads transactions using the current filter state.
3. Filter changes stay local until `Apply filters` is used.
4. Applying filters resets pagination to page 1 and syncs the URL.
5. Create, edit, and delete operations refresh the same ledger view with existing success and error messaging.

## Error Handling And State Integrity

- Validation rules for custom dates and amount ranges should remain exactly as they are today.
- Empty results should continue to render a clear no-results state inside the ledger.
- Loading and saving states should continue to disable actions where appropriate.
- Layout changes must not break inline-edit protection, such as preventing new manual creation while an inline edit is active.

## Testing Strategy

- Preserve the existing transaction filter unit tests unless a small helper extraction makes additional unit coverage worthwhile.
- Extend Playwright coverage to confirm the redesigned page still supports:
  - opening the transactions route from the dashboard
  - creating a transaction from the top CTA
  - filtering via the amount controls
  - keeping key controls visible in the refreshed layout
- Add a responsive smoke check for the transactions route so stacked filters and ledger overflow remain usable on narrower viewports.

## Risks

- A wider shell container could accidentally affect other routes if the width rule is too broad.
  Mitigation: isolate the width override to `/transactions` only and cover the helper with a focused unit test.

- Rebalancing column widths could make the table feel cleaner on desktop but harder to use on smaller screens.
  Mitigation: keep mobile behavior explicit, allow horizontal overflow, and verify the route at a narrow viewport in Playwright.

- Refactoring a large JSX block inside `page.tsx` can accidentally drop behaviors or test selectors.
  Mitigation: preserve existing `data-testid` hooks where possible and expand regression coverage before the layout refactor.
