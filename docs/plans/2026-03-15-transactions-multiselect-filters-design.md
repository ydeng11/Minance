# Transactions Multiselect Filters Design

## Goal
Refactor the Transactions filter bar so `Category`, `Account`, and `Type` support the same custom multiselect interaction style as Explorer, with array-native filter state and repeated query params all the way through the stack.

## Problem
The Transactions page still treats its main semantic filters as single-value controls:
- `Category` is a native select that only allows one value.
- `Account` is a native select that only allows one value.
- `Type` is a native select with an `"all"` sentinel instead of a true set of allowed types.

That makes routine ledger analysis slower than it needs to be. Users cannot:
- compare multiple categories in one pass
- limit the ledger to a subset of accounts without rerunning the same search
- combine multiple transaction types while keeping the rest of the filters intact

The current implementation also encodes those single-select assumptions through the whole stack:
- `TransactionsFilterState` stores scalar `category`, `account`, and `transactionType`
- URL parsing and serialization only read and write one value per filter
- the client list endpoint accepts scalar `category`, `account`, and `transaction_type`
- the `/v1/transactions` server route still reads those values with `searchParams.get(...)`
- transactions filtering supports multiple transaction types internally, but account handling is still scalar and the transactions route never forwards repeated values

## Recommended Approach
Perform a clean array-native refactor for the three multiselect filters instead of layering a UI shim on top of scalar internals.

This keeps Transactions consistent with Explorer and avoids a second round of cleanup later. The refactor should cover:
- frontend filter state
- URL parsing and serialization
- client API request params
- server request parsing
- backend transaction filtering semantics
- filter UI rendering
- end-to-end behavior

## Filter Semantics

### Intra-Filter Logic
Selections inside one multiselect are an `OR` relationship.

Examples:
- `Categories = [Dining, Groceries]` means match transactions in `Dining` or `Groceries`
- `Accounts = [checking, travel-card]` means match transactions from either account
- `Types = [expense, transfer]` means match expense or transfer rows

### Inter-Filter Logic
Different filter groups combine with `AND`.

Example:
- `Categories = [Dining, Groceries]`
- `Accounts = [checking, travel-card]`
- `Types = [expense, transfer]`

This means a transaction must:
- be in `Dining` or `Groceries`
- and be in `checking` or `travel-card`
- and be an `expense` or `transfer`

Empty multiselects mean "no constraint" for that filter group.

## UI Behavior

### Shared Multiselect Interaction
Transactions should use the same visual interaction style as Explorer:
- button-like trigger with summary text
- popover panel with checklist options
- selected rows highlighted with a checkmark
- click again to remove a selected value

To keep both surfaces aligned, the current Explorer-local `MultiSelectField` should be extracted into a shared component and reused in both pages.

### Field-Specific Rules
- `Category` uses the shared multiselect with search enabled.
- `Account` uses the shared multiselect with search enabled.
- `Type` uses the shared multiselect without search.
- `Category View` remains a normal single select.
- `Amount`, `Range`, `Tag`, and `Search` keep their current transactions-page behavior.

### Category View Switching
When `Category View` changes between `Granular` and `Coarse`, all selected categories are cleared immediately.

This is intentionally destructive and matches the user-approved behavior. It prevents stale granular selections from leaking into coarse mode and vice versa.

### Trigger Summaries
Transactions should follow the same summary rules as Explorer:
- no selections: `All categories`, `All accounts`, `All types`
- one or two selections: show the selected labels directly
- more than two selections: show the first two labels followed by `+N`

### Option Validity
Category options still depend on the active `Category View`:
- granular view uses the category catalog
- coarse view uses the coarse categories present in the current ledger data

If category or account option lists change because data reloads, selections should be pruned down to values that are still available. The special case is `Category View` switching, which clears all category selections instead of pruning.

## Data Model Changes

### Frontend State
Refactor `TransactionsFilterState` to replace scalar fields with arrays:
- `categories: string[]`
- `accounts: string[]`
- `transactionTypes: Array<"expense" | "income" | "transfer">`

Keep these scalar fields:
- `query`
- `minAmount`
- `maxAmount`
- `range`
- `start`
- `end`
- `categoryView`
- `tag`
- `page`

`"all"` should be removed from the transaction-type state model. An empty `transactionTypes` array becomes the new unfiltered state.

### URL Contract
Transactions URLs should use repeated params:
- `category=Dining&category=Groceries`
- `account=checking&account=travel-card`
- `type=expense&type=transfer`

Missing params map to empty arrays. There is no backward-compatibility layer for legacy scalar filter encoding.

### Client API Contract
`transactionsApi.list` should accept arrays for:
- `category`
- `account`
- `transaction_type`

`buildQuery` already supports repeated params, so the work here is mostly typing and call-site alignment.

### Server API Contract
`/v1/transactions` should read repeated params with `searchParams.getAll(...)` for:
- `category`
- `account`
- `transaction_type`

Those arrays should flow unchanged into the transaction filtering layer.

## Backend Filtering Changes

### Category Filtering
`filterUserTransactions` already normalizes `filters.category` into a list before matching, so Transactions can reuse that behavior once the route starts forwarding arrays.

Category matching rules remain:
- resolve the transaction category in the active `category_view`
- include the transaction if the resolved category is in the selected category array

### Account Filtering
`applySharedTransactionFilters` currently treats `filters.account` as a single value. It should be updated to normalize account filters into a deduplicated array and match a transaction when any selected account matches its `account_key` or `account_id`.

### Transaction Type Filtering
`applySharedTransactionFilters` already normalizes repeated `transaction_type` values. Transactions should rely on that array behavior directly instead of a frontend `"all"` sentinel.

## Shared Component Strategy
Extract the current Explorer `MultiSelectField` into a shared component, likely under:
- `apps/web/src/components/filters/MultiSelectField.tsx`

The shared component should keep the interaction contract Explorer already uses:
- `selectedValues`
- `options`
- `onChange`
- `emptyLabel`
- `testId`
- `searchable`
- controlled open state

Explorer should be updated to consume the shared component so Transactions does not fork the UI implementation.

## Scope

### In Scope
- array-native transactions filter state for categories, accounts, and types
- repeated query params for transactions URLs and API requests
- `/v1/transactions` server parsing updates
- backend account filtering updates for repeated values
- shared multiselect extraction from Explorer
- transactions filter bar UI replacement with the shared multiselect
- category-view switch behavior that clears category selections
- targeted unit, contract, and Playwright coverage

### Out of Scope
- changing tag into a multiselect
- moving Transactions filters into a modal
- changing Explorer filter behavior beyond shared component extraction
- preserving legacy scalar transactions filter URLs or saved view payloads
- redesigning unrelated ledger interactions

## Testing Strategy

### Frontend Unit Tests
- verify repeated `category`, `account`, and `type` params parse into arrays
- verify URL builders emit repeated params for each selected value
- verify validation trims, deduplicates, and prunes empty entries
- verify empty arrays serialize as omitted query params

### Client API Tests
- verify `transactionsApi.list` appends repeated category, account, and transaction-type params
- keep existing coverage for range, amount, and review flags

### API Contract Tests
- verify `/v1/transactions` accepts repeated category, account, and transaction-type params
- verify `OR` within each multiselect and `AND` across filter groups
- verify empty arrays behave as no constraint

### End-To-End Tests
- verify the transactions page can select multiple categories, accounts, and types
- verify the URL contains repeated params after applying filters
- verify category-view switching clears all selected categories
- keep the amount-bar transactions test as a regression check
- run Explorer e2e regression coverage after the shared multiselect extraction

## Non-Goals
- introducing a generic filtering framework for every page
- changing transaction creation or editing flows
- changing backend category resolution rules
- turning every transactions control into a multiselect
