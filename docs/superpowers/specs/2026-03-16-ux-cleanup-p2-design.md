# UX Cleanup P2 Tasks Design

**Date:** 2026-03-16
**Epic:** minance2-nbh
**Priority:** P2

## Overview

This design covers 5 P2 UX cleanup tasks for the minance2 application:

1. **nbh.2**: Change Dashboard spending trend metric to net flow
2. **nbh.4**: Remove Categories chart from Explorer category workspace
3. **nbh.6**: Remove Profile and Preferences from Settings
4. **nbh.8**: Remove Copilot Two-Category Strategy from Settings
5. **nbh.9**: Implement hover details for Explorer Compressed Weekday Spend capsules

## Task 1: Change Dashboard spending trend metric to net flow (nbh.2)

### File
`apps/web/src/app/page.tsx`

### Changes

1. **Update `trendBars` calculation** (lines 129-137):
   - Change from `spend` to `net` (income - spend)
   - Use absolute value for height calculation to handle negative net flow
   - Add `isPositive` flag for conditional styling

2. **Update section title** (line 260):
   - Change "Spending Trend" to "Net Flow Trend"

3. **Update bar rendering** (lines 270-275):
   - Use `net` instead of `spend`
   - Apply conditional color: emerald for positive, rose for negative

### Implementation

```tsx
const trendBars = useMemo(() => {
  return (overview?.trend || []).slice(-6).map((entry) => {
    const maxAbsNet = Math.max(1, ...(overview?.trend || []).map((item) => Math.abs(item.net)));
    return {
      ...entry,
      barHeight: Math.max(14, Math.round((Math.abs(entry.net) / maxAbsNet) * 120)),
      isPositive: entry.net >= 0
    };
  });
}, [overview]);
```

## Task 2: Remove Categories chart from Explorer category workspace (nbh.4)

### File
`apps/web/src/app/explorer/components/CategoryPerspective.tsx`

### Changes

1. **Remove import** (line 7):
   - Remove `CategoryBreakdown` import

2. **Remove component usage** (line 215):
   - Remove `<CategoryBreakdown overview={overview} onCategoryClick={setInspectedCategory} loading={loading} />`

3. **Adjust layout** (line 206):
   - Remove the grid wrapper entirely
   - TrendChart takes full width (remove the two-column grid)
   - This simplifies the layout after removing CategoryBreakdown

### Rationale
The "Category Lens" section already displays top categories with spend/income breakdown, making the separate `CategoryBreakdown` component redundant.

## Task 3: Remove Profile and Preferences from Settings (nbh.6)

### File
`apps/web/src/app/settings/page.tsx`

### Changes

1. **Remove Section Map link** (lines 250-255):
   - Remove the link to `#settings-profile-prefs`

2. **Remove Profile & Preferences section** (lines 342-366):
   - Delete the entire `<section id="settings-profile-prefs">` block

3. **Remove unused imports** (line 13):
   - Remove `ShieldCheck`, `UserRound`

4. **Remove unused state** (line 48):
   - Remove `storageStatus` state variable

5. **Update `loadSettings` function** (line 76):
   - Remove storage status loading

## Task 4: Remove Copilot Two-Category Strategy from Settings (nbh.8)

### File
`apps/web/src/app/settings/page.tsx`

### Changes

1. **Remove the entire section** (lines 453-574):
   - Delete the "Copilot Two-Category Strategy" section including the coarse/granular strategy editor

2. **Remove unused state** (lines 46-47):
   - Remove `coarseDraft`, `granularDraft`

3. **Remove unused function** (lines 201-212):
   - Remove `saveStrategy` function

4. **Update `loadSettings` function** (lines 70-71, 75):
   - Remove strategy data loading
   - Remove `newCategoryCoarseKey` default from strategy

5. **Remove related UI elements**:
   - Remove the "Coarse bucket" selector from "New category" form (lines 392-405)
   - Remove `newCategoryCoarseKey` state (line 52)
   - Update `addCategory` to not send `coarseKey` (line 171)

## Task 5: Hover details for Explorer Compressed Weekday Spend capsules (nbh.9)

### Files
- `apps/web/src/app/explorer/components/WeekdaySpendSummary.tsx`
- `apps/web/src/app/explorer/components/CategoryWeekdayHeatmap.tsx`

### Design

Create a tooltip using Tailwind CSS `group` and `group-hover:` utilities. No raw CSS required.

### Implementation Pattern

```tsx
<div className="group relative">
  {/* The capsule */}
  <div className={cn(
    "flex min-h-[132px] items-end rounded-3xl py-4",
    getWeekdayHeatToneClassName(entry.amount, maxAmount)
  )}>
    <div className="w-full min-w-0 px-1 text-center text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-white">
      {WEEKDAY_LABELS[entry.weekday]}
    </div>
  </div>

  {/* Tooltip */}
  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm whitespace-nowrap group-hover:block">
    <div className="font-medium text-neutral-100">{WEEKDAY_LABELS[entry.weekday]}</div>
    <div className="text-neutral-300">{money(entry.amount)}</div>
    <div className="text-xs text-neutral-400">{entry.count} transactions</div>
  </div>
</div>
```

### Changes to WeekdaySpendSummary.tsx

1. Wrap each weekday bucket in a `group relative` container
2. Add tooltip div inside the container with `group-hover:block`
3. Keep existing `title` attribute for accessibility fallback

### Changes to CategoryWeekdayHeatmap.tsx

1. Each cell is already inside a `<button>` element
2. Add `group relative` class to the cell wrapper `<div>` (line ~104-117)
3. Add tooltip div inside the cell wrapper with `group-hover:block`
4. Show: weekday, category, amount, transaction count
5. The `pointer-events-none` on tooltip prevents click interference with the button

## Testing

- Manual testing in browser for visual changes
- Verify no TypeScript errors after removing unused imports/state
- Verify tooltip positioning works on mobile and desktop viewports
- Test tooltips don't overflow viewport on edge cases (first/last weekday, small screens)

## Acceptance Criteria

- [ ] Dashboard trend shows net flow instead of spending
- [ ] Explorer category perspective no longer shows redundant Categories chart
- [ ] Settings page no longer shows Profile & Preferences section
- [ ] Settings page no longer shows Copilot Two-Category Strategy section
- [ ] Weekday spend capsules show styled tooltips on hover
- [ ] Category weekday heatmap cells show styled tooltips on hover