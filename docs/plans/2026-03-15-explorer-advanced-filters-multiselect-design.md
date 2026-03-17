# Explorer Advanced Filters Multiselect Design

## Goal
Refactor Explorer advanced filters so users can select multiple categories and transaction types, use the transactions-style amount bar, and get tag autosuggestions without carrying legacy single-select filter assumptions through the stack.

## Problem
The current Explorer advanced filters are too limited for exploratory analysis:
- `Category` only allows one value at a time.
- `Transaction type` only allows one value at a time.
- `Minimum amount` and `Maximum amount` are plain number inputs instead of the richer range control already used on the transactions page.
- `Tag` is a freeform input with no guidance from known tags.

Those constraints force users to repeatedly reopen the modal and re-run similar searches when they want to answer common questions such as:
- compare food and travel together
- see expenses and transfers in one pass
- narrow results by an amount range without guessing values
- reuse an existing tag without remembering exact spelling

The current data model also encodes these controls as scalar values, which makes the UI, URL state, analytics filtering, and saved views all reflect single-select assumptions that no longer fit the desired behavior.

## Recommended Approach
Perform a clean refactor of Explorer filter state and analytics filtering so multi-select is a first-class concept instead of an additive compatibility layer.

### Filter Semantics
`Category` and `Transaction type` become array-based selections.

The selection rule is:
- multi-select choices inside one filter are an `OR` relationship
- different filters combine as an `AND` relationship

Example:
- `Categories = [Food, Travel]`
- `Transaction types = [Expense, Transfer]`

This means:
- include transactions in `Food` or `Travel`
- and also include only transactions that are `Expense` or `Transfer`

An empty multi-select means that filter group does not constrain results.

### Advanced Filters UI
Replace the native single-value selects with custom multi-select controls:
- `Category` uses a searchable checklist popover because the option set can be large.
- `Transaction type` uses the same checklist interaction without search because the option set is small.
- `Category view` remains a single select because it controls aggregation mode rather than a set-based filter.

Selected values should be visible in the trigger as compact pills or a summarized label so the user can understand the active state without reopening the menu.

### Amount Control
Replace the separate `Minimum amount` and `Maximum amount` rows with the amount bar pattern from the transactions page:
- dual range sliders
- highlighted selected track
- synchronized min and max text inputs below the slider
- bounded values derived from Explorer metadata

This keeps the interaction consistent across Explorer and Transactions while reducing guesswork.

### Tag Autosuggest
Keep `Tag` as a single-value filter, but add autosuggestions while the user types.

The field should:
- suggest known tags from the current Explorer dataset or metadata
- narrow suggestions as the user types
- still allow arbitrary valid tag input

Suggestions are assistive only and do not change the underlying filter semantics.

## Data Model Changes

### Frontend State
Refactor `ExplorerFilterState` to use:
- `categories: string[]`
- `transactionTypes: Array<"expense" | "income" | "transfer">`

Keep these scalar fields:
- `categoryView`
- `tag`
- `direction`
- `minAmount`
- `maxAmount`

Explorer page logic, active filter chips, saved views, and drill-down helpers should all consume the new array-native shape directly.

### URL Contract
Use repeated query params for array filters:
- `category=Food&category=Travel`
- `type=expense&type=transfer`

Missing params map to empty arrays.

This keeps URLs readable and matches native `URLSearchParams` behavior more cleanly than comma-delimited encoding.

### Analytics API Contract
Explorer analytics should accept repeated category and transaction-type params and normalize them into arrays before filtering.

Filtering rules:
- category matches if the resolved category is included in the selected category array
- transaction type matches if the resolved type is included in the selected type array
- both filter groups combine with the rest of the filter set using `AND`

### Metadata
Explorer analytics metadata should expose:
- `amountBounds`
- `availableTags`

`amountBounds` powers the shared amount bar.
`availableTags` powers tag autosuggest without requiring a second client request.

## Interaction Rules

### Multi-Select Controls
- Clicking a selected option removes it.
- Clicking an unselected option adds it.
- `Reset` clears all advanced-filter selections back to defaults.
- `Apply` commits the entire modal draft in one update.
- Closing the modal with `Cancel` discards draft changes.

### Chart And Card Drill-Down
Explorer charts and cards already expose click-to-filter affordances. Those should stay simple:
- clicking a category card or chart point replaces the current category selection with exactly that one category
- clicking a merchant or account keeps its existing single-value overwrite behavior

This prevents drill-down gestures from unpredictably appending to a multi-select set.

### Category Perspective
The category perspective currently has a single-category detail state.

After the refactor:
- if exactly one category is selected, show the detailed category lens state for that category
- if multiple categories are selected, show the broader multi-category state and do not imply one category is primary
- if no category is selected, keep the current unselected overview behavior

### Transactions Drill-Down
Explorer links into Transactions should remain predictable:
- forward a category only when exactly one category is selected
- forward a transaction type only when exactly one transaction type is selected
- omit those fields when multiple values are selected

Other scalar filters such as range, amount, account, and tag continue to flow through normally.

## Scope

### In Scope
- Explorer advanced-filter UI refactor for multi-select category and transaction-type controls
- shared amount bar extraction or reuse from transactions-page behavior
- Explorer filter state refactor from scalar to array-based fields
- URL parsing and building updates for repeated params
- Explorer analytics filtering updates for array semantics
- metadata additions for amount bounds and tag suggestions
- active filter chip updates for grouped selections
- frontend, API, and end-to-end coverage for the new interactions

### Out of Scope
- converting `Tag` into a multi-select filter
- changing `Category view` into a multi-select control
- redesigning the main command bar outside of any changes needed to reflect active filters
- adding a separate metadata endpoint solely for tags or amount bounds
- preserving legacy Explorer saved-view or scalar filter payload shapes

## Testing Strategy

### Frontend Tests
- verify repeated query params parse into category and transaction-type arrays
- verify filter state builds repeated query params correctly
- verify advanced-filter draft apply, cancel, and reset behavior
- verify category and transaction-type multi-select controls render and toggle correctly
- verify the amount bar keeps slider and text inputs synchronized
- verify active filter chips summarize grouped selections
- verify the category perspective only shows single-category detail when exactly one category is active
- verify tag autosuggestions render and narrow based on typed input

### API Tests
- verify Explorer analytics accepts repeated category and transaction-type params
- verify intra-filter matching uses `OR`
- verify inter-filter matching uses `AND`
- verify empty arrays behave as no constraint
- verify Explorer metadata includes `amountBounds` and `availableTags`

### End-To-End Tests
- verify multi-select category filtering changes Explorer results as expected
- verify multi-select transaction-type filtering changes Explorer results as expected
- verify combining categories and transaction types follows `OR` within a filter and `AND` across filters
- verify the amount bar can narrow Explorer results with both sliders and manual inputs
- verify typing in the tag field surfaces suggestions and applying a suggestion filters Explorer

## Non-Goals
- introducing a generalized shared filter framework for the entire app
- changing transaction tagging rules or validation
- turning every Explorer click interaction into additive multi-select behavior
