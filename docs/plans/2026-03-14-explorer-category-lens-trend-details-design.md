# Explorer Category Lens And Trend Details Design

## Goal
Make the Explorer category perspective more investigative by turning `Category Lens` into a true category drill-down card and adding click-to-inspect composition details to `Spending Trend`.

## Problem
The current category perspective has two cards that largely tell the same story:
- `Category Lens` shows a grid of top categories with amount and share.
- `Categories` shows a ranked list of those same categories with bars.

That duplication wastes valuable space in the category perspective and does not help users understand how spend and income behave inside each category.

The `Spending Trend` card also lacks composition detail. Users can see monthly spend and income movement, but they cannot quickly answer:
- what drove spending in a specific month
- how income was composed in that month
- whether a spike came from one category or a broader mix

## Recommended Approach
Keep `Categories` as the compact ranking card and repurpose `Category Lens` into a richer inspection surface.

### Category Lens
`Category Lens` should still surface a selectable set of category tiles, but each tile should show both `Spend` and `Income` so the card immediately communicates more than the ranked `Categories` list.

When a category is selected, the card should reveal a detail panel that shows:
- spend
- income
- net
- transaction count
- spend share within the active filter range
- income share within the active filter range
- top merchants for the selected category when available

This makes the card useful for understanding category behavior rather than simply restating category order.

### Spending Trend
The main chart should keep the existing monthly spend and income bars, but clicking a month should no longer immediately rewrite the Explorer filters.

Instead, clicking a month should:
- visually highlight the selected month
- reveal a month-detail panel directly under the chart
- show the selected month's spend, income, and net totals
- show spend composition as the top categories for that month
- show income composition as the top categories for that month

The detail panel should include an explicit action such as `Filter Explorer to March` so users can decide when to turn inspection into a drill-down.

### Default State
When trend data exists, the most recent month in the visible trend should be selected by default so the user sees composition detail immediately without an extra click.

## Data Model Changes
The current Explorer analytics payload is too outflow-centric for this design.

### Category Data
Expand Explorer category items to include:
- `spend`
- `income`
- `net`
- `transactionCount`
- `spendShare`
- `incomeShare`
- an optional short merchant summary for the selected category detail panel

The existing outflow ranking behavior can remain derived from `spend`.

### Trend Data
Expand each Explorer trend item to include a bounded monthly composition summary:
- top spend categories for the month
- top income categories for the month

Each composition entry should include category name, amount, share, and optional emoji.

This allows the frontend to open the month-detail panel instantly without issuing a second request.

## Scope

### In Scope
- Explorer analytics payload updates required for richer category and trend inspection
- Explorer frontend type updates for the new category and trend structures
- `Category Lens` redesign in the category perspective
- month-selection detail panel in `Spending Trend`
- explicit month filter action from the trend detail panel
- frontend and end-to-end coverage for the new behavior

### Out of Scope
- redesigning the standalone `Categories` ranking card beyond any copy or minor alignment needed for contrast
- changing overview or account perspectives except where shared trend-card plumbing is required
- adding new routes or standalone drill-down pages
- changing how Transactions filtering works beyond opening the existing page with a chosen month

## Interaction Rules

### Category Rules
- `Categories` remains a compact ranked summary card.
- `Category Lens` is the only category card in this view that exposes spend and income side by side.
- Selecting a category updates the category filter as today and also updates the lens detail panel content.
- If there is no income for a category, show `Income $0` instead of hiding the field.

### Trend Rules
- A month click selects the month for inspection first.
- The selected month must stay visible through clear visual treatment in the chart.
- Month inspection must not automatically overwrite the Explorer date filter.
- Filtering the workspace to that month requires an explicit secondary action.
- If a selected month has no income composition, show a short empty-state message in the income section.

## Testing Strategy

### API Tests
- verify Explorer category rollups include spend, income, net, and share values
- verify Explorer trend items include per-month spend and income composition summaries

### Frontend Tests
- verify the trend card opens month detail for the latest month by default
- verify clicking another month changes the detail panel without changing the URL immediately
- verify the explicit month-filter action updates the Explorer range

### End-To-End Tests
- verify category perspective shows a richer `Category Lens` than the ranked `Categories` card
- verify clicking a trend month reveals spend and income composition details
- verify the explicit month drill-down action moves Explorer to that month's range

## Non-Goals
- adding arbitrarily deep nested category drill-downs
- adding merchant composition to every month row
- introducing a second API call per trend interaction
