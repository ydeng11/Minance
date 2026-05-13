---
phase: 01-filter-ux-foundation
plan: 02
subsystem: frontend
tags: [filter-ux, explorer, search-consolidation, badges, url-sync, debounce]
requires: [01-01]
provides: [Explorer unified search, Explorer ActiveFilterBadges integration]
affects: [Explorer]
tech-stack:
  added: []
  patterns:
    - spread filter objects for Record<string, unknown> type compatibility
    - debounced onChange pattern for search inputs
key-files:
  created: []
  modified:
    - apps/web/src/app/explorer/components/FilterSidebar.tsx
    - apps/web/src/app/explorer/filters.ts
decisions:
  - Merchant field kept in ExplorerFilterState but no longer synced to URL
  - Unified search placeholder indicates scope (merchant, description, notes, tags)
  - ActiveFilterBadges rendered below Filters title in sidebar header
metrics:
  duration: 5 minutes
  completed_date: 2026-04-03
---

# Phase 01 Plan 02: Explorer Search Consolidation & Badge Integration Summary

**One-liner:** Consolidated duplicate Explorer search inputs into single unified debounced search, integrated ActiveFilterBadges component for removable filter chips, and removed merchant from URL sync for cleaner state management.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Consolidate search inputs in FilterSidebar.tsx | b23f2e5 | FilterSidebar.tsx |
| 2 | Integrate ActiveFilterBadges into FilterSidebar | b23f2e5 | FilterSidebar.tsx |
| 3 | Verify URL state sync for Explorer filters | 3284d67 | filters.ts |

## Verification Results

### Search Consolidation
- Removed duplicate "Filter by merchant" input (lines 97-106)
- Updated placeholder: "Search merchant, description, notes, tags..."
- Integrated useDebouncedSearch hook with 300ms delay
- Removed merchant from activeFilterCount calculation

### ActiveFilterBadges Integration
- Added ActiveFilterBadges import from "@/components/filters/ActiveFilterBadges"
- Rendered badges below Filters title in sidebar header
- Implemented handleRemoveFilter with switch statement for all filter keys
- Spread filters object for Record<string, unknown> type compatibility

### URL State Sync
- Removed merchant param from buildExplorerFilterSearchParams
- Removed merchant URL parsing from parseExplorerFilterState
- Merchant field kept in state but defaults to empty, never synced to URL
- Verified syncFilters callback in page.tsx updates URL on filter change

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Fixed ActiveFilterBadges type compatibility**
- **Found during:** Task 2 TypeScript verification
- **Issue:** ExplorerFilterState not assignable to Record<string, unknown> (no index signature)
- **Fix:** Spread filters object when passing to ActiveFilterBadges: `filters={{ ...filters }}`
- **Files modified:** FilterSidebar.tsx
- **Commit:** b23f2e5

None otherwise - plan executed as written.

## Deferred Issues

Pre-existing TypeScript error in TransactionsCommandBar.tsx (line 115) - similar type compatibility issue. Logged to deferred-items.md for plan 01-03.

## Files Created/Modified

### Created
- `.planning/phases/01-filter-ux-foundation/deferred-items.md` (tracked pre-existing issue)

### Modified
- `apps/web/src/app/explorer/components/FilterSidebar.tsx` (56 insertions, 14 deletions)
- `apps/web/src/app/explorer/filters.ts` (1 insertion, 4 deletions)

## Requirements Addressed

- **FILT-01**: Single unified search input replacing duplicate query/merchant inputs - Explorer implementation complete
- **FILT-02**: Active filter badges with remove capability - Explorer integration complete (component created in 01-01)
- **FILT-03**: URL state synchronization - Verified working, merchant param removed from sync
- **FILT-04**: Debounced search input (300ms) - Explorer implementation complete (hook created in 01-01)

## Known Stubs

None - all functionality fully implemented.

## Self-Check: PASSED

- [x] FilterSidebar.tsx has single unified search input
- [x] Placeholder text updated to indicate search scope
- [x] useDebouncedSearch hook integrated
- [x] ActiveFilterBadges imported and rendered
- [x] handleRemoveFilter implemented for all filter keys
- [x] Merchant removed from URL sync in filters.ts
- [x] TypeScript compiles for modified files (pre-existing errors in unrelated files)
- [x] Commit b23f2e5 verified
- [x] Commit 3284d67 verified

---

*Completed: 2026-04-03*