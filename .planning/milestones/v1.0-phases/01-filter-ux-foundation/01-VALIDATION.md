# Phase 01: Filter UX Foundation - Validation Strategy

**Phase:** 01-filter-ux-foundation
**Created:** 2026-04-02
**Status:** Pending execution

## Wave 0: Test Foundation

Create test files BEFORE implementation to enable TDD workflow.

### Required Test Files

| File | Purpose | Priority |
|------|---------|----------|
| `apps/web/src/components/filters/ActiveFilterBadges.test.ts` | Unit tests for badge rendering, removal | P1 |
| `apps/web/src/hooks/useDebouncedSearch.test.ts` | Unit tests for debounce timing, callback | P1 |

### Test Framework

Per CLAUDE.md:
- Framework: Node.js built-in test runner
- Run command: `pnpm test --filter @minance/web`
- Quick run: `tsx --test` for individual files

## Validation Dimensions

### 1. Requirement Coverage

| Requirement | Test Strategy | Verification |
|-------------|---------------|--------------|
| FILT-01 | Manual + E2E | Single search input visible, fuzzy search works |
| FILT-02 | Unit + E2E | ActiveFilterBadges renders correct pills, remove works |
| FILT-03 | E2E | URL params update on filter change, shareable links work |
| FILT-04 | Unit | useDebouncedSearch delays callback by 300ms |
| FILT-08 | E2E | Clear all resets all filters to default |

### 2. Integration Points

- Explorer FilterSidebar → ExplorerFilterState → URL params
- Transactions CommandBar → TransactionsFilterState → URL params
- ActiveFilterBadges → parent onChange callback

### 3. Edge Cases

- Empty filter state (no badges shown)
- All filters active (many badges, overflow handling)
- Rapid search input (debounce coalesces calls)
- Invalid URL params (graceful fallback)

## Sampling Rate

Target: 80% coverage for new components
- ActiveFilterBadges: 100% (new component, critical UX)
- useDebouncedSearch: 100% (new hook, timing-sensitive)
- Modified components: Verify via existing E2E suite

## Verification Checklist

After execution:
- [ ] All unit tests pass: `pnpm test --filter @minance/web`
- [ ] TypeScript compiles: `pnpm tsc --noEmit --filter @minance/web`
- [ ] E2E tests pass: `pnpm test:e2e`
- [ ] Manual verification of FILT-01 through FILT-08 in browser

---
*Generated: 2026-04-02*
*Phase: 01-filter-ux-foundation*