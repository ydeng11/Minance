# Phase 2: Visual Consistency & Table Polish - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can scan and understand transaction data quickly with clear visual hierarchy. This phase delivers: consistent amount styling (right-aligned, green income, red expense), loading states with skeletons, helpful empty state messaging, sticky table headers, date range presets, and multi-select for categories/accounts.

**Scope anchor:** FILT-05, FILT-06, FILT-07, VISL-01, VISL-02, VISL-03, VISL-04, VISL-05, UFBK-03, UFBK-04
**Out of scope:** Interaction patterns (Phase 3), error handling improvements (Phase 4)

</domain>

<decisions>
## Implementation Decisions

### Amount Color Semantics (VISL-01)

- **D-01:** Right-aligned amounts — already implemented, preserve
- **D-02:** Income amounts: emerald-400 (green) — already implemented, preserve
- **D-03:** Expense amounts: rose-400 (red) — change from neutral-100
- **D-04:** Apply to Transactions page table (page.tsx line 1208)
- **D-05:** Apply to Explorer cards if amounts displayed (check ExplorerCard.tsx)

### Date Range Presets (FILT-05)

- **D-06:** Expand RANGE_OPTIONS in `apps/web/src/lib/constants.ts` to include:
  - "This Month" (current month, 1st to today)
  - "Last 30 Days" (exists as "30d")
  - "Last 90 Days" (exists as "90d")
  - "This Year" (Jan 1 to today)
  - "Custom" (triggers date picker)
- **D-07:** Presets apply to both Explorer and Transactions filter sidebars
- **D-08:** Custom range triggers existing date picker UI

### Multi-Select Filters (FILT-06, FILT-07)

- **D-09:** Reuse existing `MultiSelectField` component for categories filter
- **D-10:** Reuse existing `MultiSelectField` component for accounts filter
- **D-11:** Replace single-select dropdowns in:
  - Transactions: `TransactionsAdvancedFilters.tsx`
  - Explorer: `ExplorerAdvancedFilters.tsx`
- **D-12:** Maintain URL state sync for multi-select values (array of strings)

### Loading States (VISL-02, UFBK-03)

- **D-13:** Add skeleton placeholders for transaction table rows during load
- **D-14:** Skeleton style: dark neutral background, subtle pulse animation
- **D-15:** Show skeleton in table body while `loading === true`
- **D-16:** Preserve existing `loading` state variable pattern
- **D-17:** Add spinner to Apply/Save buttons during async operations

### Empty State Messaging (VISL-03)

- **D-18:** Replace basic "No transactions found" with helpful guidance
- **D-19:** Empty state message structure:
  - Title: "No transactions found"
  - Guidance: "Try adjusting your filters or add a new transaction"
  - Action: Link/button to create transaction or clear filters
- **D-20:** Apply to both Transactions table and Explorer views

### Sticky Table Headers (VISL-05)

- **D-21:** Make `<thead>` sticky with `position: sticky; top: 0`
- **D-22:** Add subtle shadow or border to indicate stickiness
- **D-23:** Ensure z-index above table content
- **D-24:** Apply to Transactions page table (primary table view)

### Consistent Spacing (VISL-04)

- **D-25:** Audit spacing patterns across pages (Explorer, Transactions, Categories)
- **D-26:** Standardize padding/margins using Tailwind spacing scale
- **D-27:** Focus on filter sections, table cells, and page headers

### Disabled States (UFBK-04)

- **D-28:** Existing pattern: `disabled:opacity-60` — preserve
- **D-29:** Add visual indication for unavailable actions (grayed out, cursor-not-allowed)
- **D-30:** Ensure disabled buttons have `aria-disabled` for accessibility

### Claude's Discretion

- Skeleton row count (show 5-10 rows during loading)
- Exact wording for empty state guidance
- Shadow style for sticky headers (box-shadow vs border)
- Transition timing for loading state changes

</decisions>

<specifics>
## Specific Ideas

- Existing `money()` utility in `apps/web/src/lib/utils.ts` formats amounts — color semantics applied at render site
- `MultiSelectField` component already supports searchable multi-select with searchPlaceholder prop
- Amount styling change: line 1208 in transactions/page.tsx — change `text-neutral-100` to `text-rose-400` for outflow
- RANGE_OPTIONS constant in `apps/web/src/lib/constants.ts` — extend with new presets

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — FILT-05, FILT-06, FILT-07, VISL-01 through VISL-05, UFBK-03, UFBK-04 acceptance criteria
- `.planning/PROJECT.md` — Core value and constraints

### Prior Phase Context
- `.planning/phases/01-filter-ux-foundation/1-CONTEXT.md` — Filter patterns, MultiSelectField, badge styling

### Existing Code
- `apps/web/src/lib/constants.ts` — RANGE_OPTIONS constant for date presets
- `apps/web/src/lib/utils.ts` — money() formatting utility
- `apps/web/src/components/filters/MultiSelectField.tsx` — Reusable multi-select component
- `apps/web/src/app/transactions/page.tsx` — Transaction table with amount rendering
- `apps/web/src/app/explorer/components/ExplorerCard.tsx` — Explorer card component
- `apps/web/src/app/transactions/TransactionsAdvancedFilters.tsx` — Transactions advanced filters
- `apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx` — Explorer advanced filters

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MultiSelectField` component: Full multi-select with search, selection summary, dropdown UI — ready for categories/accounts filters
- `money()` utility: Formats amounts as `$X.XX` — apply color at render site
- `loading` state pattern: Already tracks async operations — extend with visual indicators
- `RANGE_OPTIONS` array: Extensible structure for date presets

### Established Patterns
- Amount rendering: `<span className={direction === "inflow" ? "text-emerald-400" : "text-neutral-100"}>` — change neutral to rose for expenses
- Empty state: `<td colSpan={8}>No transactions found.</td>` — expand with guidance
- Table header: `<thead className="bg-neutral-900/60">` — add sticky positioning

### Integration Points
- Transactions page: `apps/web/src/app/transactions/page.tsx` — primary table view
- Explorer page: `apps/web/src/app/explorer/page.tsx` — secondary view (cards, not table)
- Filter components: Advanced filters in both pages use single-select — convert to MultiSelectField

### Known Issues
- Expense amounts use neutral-100, not rose/red (VISL-01 gap)
- No visual loading indicators (spinners/skeletons) during data fetch
- Empty state message is minimal, no guidance
- Table headers not sticky — difficult to scan long lists
- Single-select for categories/accounts limits filtering flexibility

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-visual-consistency-table-polish*
*Context gathered: 2026-04-03*