# Explorer Heatmap Summary And Category Matrix Design

## Goal
Make Explorer heat analytics stable and useful across date ranges by replacing the Overview heatmap with a fixed weekday summary and moving deeper pattern analysis into the Category workspace.

## Problem
The current Overview heatmap is not telling a truthful story for longer ranges:
- the UI truncates the grid to seven week rows, so larger ranges are visually compressed
- the backend groups by a simple week-of-year bucket, which is especially misleading when the selected range crosses a year boundary
- the chart footprint and meaning both shift with the date filter, which makes the card hard to trust

The Category workspace is a better home for deeper pattern analysis, but its current category interactions immediately write the global category filter. That behavior would collapse any comparative category heatmap into a single-row view too easily.

## Decision
- Remove the week-by-week heatmap from the Overview perspective.
- Replace it with a fixed `Sun` through `Sat` weekday spend summary.
- Add a new Category perspective heatmap with `top 7 filtered categories x weekday`.
- Keep both views subject to the active Explorer filters.
- Change Category workspace category selection to be inspection-first, with an explicit action to apply a real Explorer category filter.

## Overview Weekday Summary
Overview should optimize for quick understanding, not long-range pattern archaeology.

The replacement card should:
- always render the same seven weekday columns
- aggregate filtered outflow spend by weekday
- normalize color intensity across the seven weekday totals for the current range
- show the weekday label directly in the card
- expose exact spend and transaction count in hover or accessible labels

This keeps the layout stable for `30d`, `90d`, and `365d` ranges while still answering a useful question: which weekdays are hottest within the current scope?

For this first iteration, the metric should stay aligned with the existing Explorer heat semantics and use aggregated spend, not a new average-per-day formula. The main problem to solve here is layout volatility and unclear meaning, not cross-range normalization of raw values.

## Category Weekday Matrix
The deeper pattern view should move into the Category perspective as a comparative matrix.

The new card should:
- render seven weekday columns (`Sun` through `Sat`)
- render up to seven category rows
- choose rows from the top seven categories by filtered spend
- compute rows from the same filtered transaction set the rest of Explorer uses
- show fewer rows when the current filters leave fewer than seven categories

Each row should include:
- category emoji and name
- total filtered spend for the row
- transaction count for the row
- seven weekday cells representing spend for that category on that weekday

Color should be normalized within each row, not across the whole matrix. That keeps smaller categories readable instead of washing them out next to large categories like groceries or rent. Row headers should carry the magnitude context so users can still compare category size while reading weekday shape.

## Filter Behavior
The matrix must honor active Explorer filters, including:
- date range or custom dates
- account
- merchant
- transaction type
- amount constraints
- tag
- category view mode (`granular` or `coarse`)

If the user explicitly applies a real Explorer category filter, the matrix should truthfully shrink to the matching category set, even if that means only one row remains.

The important distinction is between explicit filtering and local inspection:
- explicit filtering should keep working through the normal Explorer filter model
- local inspection inside the Category workspace should not immediately rewrite URL filters

## Category Interaction Model
To preserve comparison, Category workspace interactions should become inspection-first.

Recommended behavior:
- clicking a category tile in `Category Lens` sets a local inspected category
- clicking a matrix row also sets that same local inspected category
- local inspection updates detail copy and any category-specific companion content inside the Category workspace
- a dedicated action such as `Filter Explorer to Groceries` applies the actual `category` filter and updates the URL

This keeps the workspace comparative by default while still supporting drill-down when the user wants to commit to a narrower filter.

The local inspected category should be ephemeral:
- it should not be written into the URL
- it should not be stored in saved views
- when a real global category filter is present, the local inspected category should mirror that filtered category
- otherwise it can default to the first heatmap row or first available category card

## Data And API Design
The least disruptive backend path is to extend the Explorer analytics payload rather than overload the existing generic heatmap shape.

Recommended Explorer additions:

```ts
weekdaySummary: {
  items: ExplorerWeekdaySummaryItem[];
};
categoryWeekdayHeatmap: {
  items: ExplorerCategoryWeekdayHeatmapRow[];
};
```

With structures like:

```ts
interface ExplorerWeekdaySummaryItem {
  weekday: number;
  amount: number;
  count: number;
}

interface ExplorerCategoryWeekdayHeatmapCell {
  weekday: number;
  amount: number;
  count: number;
}

interface ExplorerCategoryWeekdayHeatmapRow {
  category: string;
  emoji?: string;
  coarseKey?: string;
  totalSpend: number;
  transactionCount: number;
  cells: ExplorerCategoryWeekdayHeatmapCell[];
}
```

Backend rules:
- derive both datasets from filtered outflow transactions
- group weekday summary by UTC weekday
- rank categories by filtered spend before taking the top seven rows
- build weekday cells only for those selected rows
- continue honoring the current Explorer category-view normalization logic

The existing `/v1/analytics/heatmap` endpoint can remain in place for now to avoid unnecessary collateral changes. Explorer should simply stop depending on the old week-based structure.

## Frontend Architecture
The frontend change should be explicit rather than trying to bend the current `SpendingHeatmap` component into two unrelated jobs.

Recommended component changes:
- replace the Overview `SpendingHeatmap` usage with a new `WeekdaySpendSummary` component
- add a new `CategoryWeekdayHeatmap` component inside `CategoryPerspective`
- manage inspected-category state inside `CategoryPerspective`, seeded from the real `filters.category` value when present

This keeps the new behavior local to Explorer and avoids spreading ephemeral inspection state through saved-view or filter utilities.

## Empty States
Overview weekday summary:
- if there is no filtered outflow spend, show a compact empty state such as `No spend data for range.`

Category matrix:
- if there are no filtered outflow categories, show a category-specific empty state
- if the current filters narrow the result to one or two categories, render those rows truthfully rather than padding fake rows

## Testing Strategy
Backend:
- add unit coverage for weekday summary grouping
- add unit coverage for top-seven category ranking under filters
- add unit coverage for category-weekday cell aggregation
- add regression coverage proving account, merchant, date, and category-view filters affect the new Explorer fields

Frontend:
- update Explorer API types for the new payload fields
- add component coverage for weekday headers, row labels, and empty states where practical

End-to-end:
- verify Overview shows exactly seven weekday summary cells for both default and `365d` ranges
- verify the Category matrix renders weekday headers and up to seven filtered rows
- verify account or merchant filters change the visible category rows
- verify clicking a category tile or matrix row inspects locally without changing the URL
- verify the explicit category-filter action updates the URL and narrows the workspace

## Non-Goals
- building a vertically expanding calendar-style heatmap
- introducing a toggle between total spend, share, and average-per-day
- redesigning non-Explorer analytics surfaces
- persisting local inspected-category state into saved views

## Recommendation
Implement a stable Overview weekday summary and a deeper Category weekday matrix as Explorer-specific analytics fields. This keeps Overview fast to read, moves comparative pattern analysis into the right workspace, and removes the misleading week-bucket behavior from the primary Explorer surface.
