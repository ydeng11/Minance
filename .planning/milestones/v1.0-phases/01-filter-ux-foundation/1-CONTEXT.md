# Phase 1: Filter UX Foundation - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can filter transactions intuitively with clear visibility into active filters. This phase delivers: single unified search input, active filter badges, URL state sync, debounced search, and clear all functionality.

**Scope anchor:** FILT-01, FILT-02, FILT-03, FILT-04, FILT-08
**Out of scope:** Date range presets, multi-select dropdowns (Phase 2), visual polish, interaction patterns

</domain>

<decisions>
## Implementation Decisions

### Unified Search Input

- **D-01:** Single search input replacing both `query` and `merchant` inputs
- **D-02:** Fuzzy matching across merchant, description, notes, and tags fields
- **D-03:** Remove the duplicate "Filter by merchant" input from FilterSidebar.tsx (lines 98-106)
- **D-04:** Update placeholder text to indicate scope: "Search merchant, description, notes, tags..."

### Active Filter Badges

- **D-05:** Display removable filter badges outside filter panels
- **D-06:** Transactions: badges appear in CommandBar area, between search and Apply button
- **D-07:** Explorer: badges appear in sidebar header, below "Filters" title
- **D-08:** Each badge shows filter label with X button to remove
- **D-09:** Badge styling: pill-shaped, emerald accent, consistent with existing UI

### URL State Synchronization

- **D-10:** All filter state synced to URL search params
- **D-11:** Use Next.js `useSearchParams` and `useRouter` hooks
- **D-12:** Filters persist across page refresh and can be shared via URL
- **D-13:** Existing filter state objects (ExplorerFilterState, TransactionsFilterState) map to URL params

### Debounced Search

- **D-14:** 300ms debounce delay on search input changes
- **D-15:** Debounce at onChange handler level, not component level
- **D-16:** Use inline debounce or custom hook (researcher to recommend best approach)
- **D-17:** Applies to unified search input only; other filter changes immediate

### Clear All Functionality

- **D-18:** Clear all button visible only when filters are active
- **D-19:** Transactions: Add Clear all button to CommandBar, left of Apply button
- **D-20:** Explorer: Keep existing Clear all in sidebar header (lines 72-80)
- **D-21:** Clears all filters to default state (range: "90d", others empty/default)

### Claude's Discretion

- Exact fuzzy matching algorithm/library choice
- Badge animation/transition details
- URL param naming conventions
- Error handling for URL state parsing
- Test coverage approach

</decisions>

<specifics>
## Specific Ideas

- Research identified duplicate search inputs as primary UX pain point
- Existing activeFilterCount logic can be reused for badge display
- MultiSelectField component already exists — pattern established for multi-value filters (Phase 2)
- Fix "Rest" typo to "Reset" in TransactionsAdvancedFilters.tsx line 214 (discovered during codebase scout)

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — FILT-01 through FILT-08 acceptance criteria
- `.planning/PROJECT.md` — Core value and constraints

### Research
- `.planning/research/SUMMARY.md` — Key research findings on filter UX patterns
- `.planning/research/PITFALLS.md` — Duplicate inputs, hidden filters, URL state issues
- `.planning/research/ARCHITECTURE.md` — URL-driven filter state pattern, component organization

### Existing Code
- `apps/web/src/app/explorer/components/FilterSidebar.tsx` — Current Explorer filter implementation
- `apps/web/src/app/transactions/TransactionsCommandBar.tsx` — Current Transactions command bar
- `apps/web/src/app/explorer/filters.ts` — Explorer filter state and URL handling
- `apps/web/src/app/transactions/filters.ts` — Transactions filter state and URL handling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MultiSelectField` component (`apps/web/src/components/filters/MultiSelectField.tsx`): Already implements multi-select dropdown with search — can be used for Phase 2 multi-select filters
- `activeFilterCount` logic in FilterSidebar.tsx (lines 27-40): Count calculation already exists
- `handleClearAll` function in FilterSidebar.tsx (lines 42-57): Clear all logic pattern established

### Established Patterns
- URL-driven filter state: Both Explorer and Transactions use `useSearchParams` for range/date filters
- Controlled inputs with onChange callbacks: Standard pattern across filter components
- Tailwind CSS styling: Dark theme with emerald accent, consistent border/focus patterns

### Integration Points
- Explorer page: `apps/web/src/app/explorer/page.tsx` — uses FilterSidebar component
- Transactions page: `apps/web/src/app/transactions/page.tsx` — uses TransactionsCommandBar
- Filter state types: `ExplorerFilterState` and `TransactionsFilterState` in respective filters.ts files

### Known Issues
- Duplicate search inputs in FilterSidebar (lines 89-106) — to be consolidated
- "Rest" typo instead of "Reset" in TransactionsAdvancedFilters.tsx line 214
- Active filter count shown as number badge, but values not visible to user

</code_context>

<deferred>
## Deferred Ideas

- Date range presets (This Month, Last 30 Days, etc.) — Phase 2
- Multi-select for categories and accounts — Phase 2
- Visual polish (right-aligned amounts, color semantics) — Phase 2
- Loading states, empty states — Phase 2

</deferred>

---

*Phase: 01-filter-ux-foundation*
*Context gathered: 2026-04-02*