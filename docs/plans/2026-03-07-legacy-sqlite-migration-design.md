# Legacy SQLite Migration Design

## Scope

Build a one-shot script that converts the legacy backup database `backup_2026-02-26_00-00-03.db` into the new database model used by this project and writes directly to `services/api/data/minance.sqlite`.

This migration is for a single legacy user. It does not need backward compatibility, multi-user reconciliation, or API-based enrichment.

## Goals

- Preserve all legacy transaction rows, including source duplicates
- Write canonical transaction-model data aligned with the new app design
- Make reruns idempotent by replacing previously migrated financial data for the target user
- Keep the migration traceable and auditable

## Inputs And Outputs

### Input

- Source backup SQLite file:
  - `backup_2026-02-26_00-00-03.db`
- Legacy tables used:
  - `accounts`
  - `transactions`
  - `minance_category`
  - `raw_category_to_minance_category`

### Output

- Target SQLite file:
  - `services/api/data/minance.sqlite`
- Target schema:
  - `services/api/sql/schema.sql`

## Source-Of-Truth Decision

The backup SQLite database is the only source of truth.

The old Minance HTTP API at `http://10.0.0.20:18080` is out of scope for this migration and should not be required by the script.

## Architecture

The migration should reuse the existing backend store abstraction so the script writes data in the same shape used by the API and SQLite repository.

The implementation should:

1. Resolve the target user
2. Initialize the target SQLite schema if needed
3. Remove the target user's previously migrated financial data
4. Read the legacy backup tables directly with `sqlite3`
5. Normalize accounts, categories, rules, and transactions into the new model
6. Persist the full migrated dataset into the target SQLite-backed store
7. Print a compact JSON summary report

The preferred implementation path is to tighten and reuse the existing legacy SQLite migration logic in `services/api/src/migration.ts`, then expose it through a dedicated CLI script.

## User Resolution

The migration script should support:

- `--user-email <email>`: use or create the requested user
- no `--user-email`:
  - if the target DB has exactly one user, use that user
  - otherwise use the existing dev-account seeding path

This keeps the script one-command in the current workspace while still allowing explicit targeting.

## Replace Semantics

Each run should replace previously migrated financial data for the target user.

Before importing new rows, clear the target user's:

- `accounts`
- `transactions`
- `categories`
- `category_strategies`
- `category_rules`

Do not delete:

- `users`
- `sessions`
- AI provider tables
- saved views
- unrelated audit history

This makes reruns deterministic and prevents duplicated full imports across runs.

## Account Mapping

Legacy `accounts.account_type` is not reliable enough to use directly. The backup shows mislabeled rows such as checking accounts marked as `CREDIT`.

The migration should infer target `accountType` from account name and institution:

- `checking` if the name contains `checking`
- `savings` if the name contains `saving` or `savings`
- `cash` for PayPal balance-style accounts
- `investment` for brokerage or investment keywords
- `loan` for loan keywords
- otherwise `credit_card`

Each account should use a stable normalized key derived from `bank_name + account_name`.

## Category Mapping

Every legacy transaction category should be resolved through `raw_category_to_minance_category`.

For this backup, mapping coverage is complete, so the migration does not need heuristic category guessing.

Canonical category rows should be created with rollup behavior as the source of truth:

- `spend`
  - `Automotive`
  - `Bills & Utilities`
  - `Dining`
  - `Entertainments & Growth`
  - `Fashion`
  - `Groceries`
  - `Health`
  - `Home`
  - `Merchandise`
  - `Miscellaneous`
  - `Mortgage & Loan`
  - `Pets`
  - `Subscriptions & Services`
  - `Travel`
- `income`
  - `Investment Income`
  - `Other Income`
  - `Salary`
- `transfer`
  - `Credit Card Payments`
  - `Transfer & Withdrawl`

Raw legacy categories should also be preserved as aliases or rules so future categorization remains deterministic.

## Transaction Mapping

The migrated transactions must align with the approved transaction model:

- `amount` is always stored as a positive numeric value
- `flow_direction` is explicit and derived from legacy sign
- category meaning drives reporting
- no canonical transaction-level `transaction_type`

Normalization rules:

- `amount = abs(legacy.amount)`
- `flow_direction = legacy.amount > 0 ? "outflow" : "inflow"`
- `category_raw = legacy.category`
- `category_final = mapped minance category`
- `description = legacy.description`
- `memo = legacy.memo`
- `transaction_date = legacy.transaction_date`
- `post_date = legacy.post_date`

The backup data supports this convention across account types:

- positive legacy amounts represent outflows
- negative legacy amounts represent inflows

This rule should be used consistently instead of relying on legacy `transaction_type` or legacy account type labels.

## Duplicate Preservation

The migration must preserve duplicate source rows.

The backup contains real duplicate transactions under the legacy uniqueness grain, so the importer must not content-dedupe rows.

Rules:

- every legacy transaction row becomes one target transaction row
- do not skip rows because their content fingerprint matches another row
- satisfy the target uniqueness index by deriving `dedupe_fingerprint` from the legacy row identity, for example:
  - `legacy-sqlite:<transaction_id>`

This preserves duplicates while keeping the target schema valid.

## Traceability

Each migrated row should remain traceable to its legacy source.

Store legacy provenance in payload data, including:

- legacy database origin
- legacy `transaction_id`
- legacy `account_id`
- original raw category
- migration run identifier

The migration report should include scanned, imported, invalid, and failed counts.

## Failure Handling

The migration should fail fast when:

- the source DB does not exist
- `sqlite3` is unavailable
- the target schema cannot be initialized
- required fields cannot be read
- account inference fails
- category resolution fails

The run should be all-or-nothing for the target user. If any step fails after the replacement phase starts, the write should be rolled back so the user is not left partially migrated.

No silent reclassification should be performed.

## Verification Strategy

Tests should lock the following behavior:

- account type inference comes from account naming rules, not legacy `account_type`
- migrated `amount` is always positive
- `flow_direction` is derived from source sign as `outflow` or `inflow`
- all categories resolve to canonical target categories with correct `rollupBehavior`
- duplicate source rows are preserved
- rerunning the migration replaces earlier migrated financial data instead of appending

The CLI should emit a compact JSON summary with counts and any warnings or failures.

## Summary

The migration is a direct legacy-SQLite-to-new-SQLite conversion.

It should preserve all source rows, replace prior migrated financial data on rerun, and write canonical transaction-model records where:

- account type lives on the account
- category rollup behavior drives reporting
- transactions store positive amounts plus explicit `outflow` or `inflow`
- source duplicates are retained
