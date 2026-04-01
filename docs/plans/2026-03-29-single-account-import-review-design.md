# Single-Account Import Review Design

## Scope

Redesign the import review experience around the assumption that most CSV, OFX, and QFX imports represent a single account export.

The new flow should ask the user to choose one import account once during review, apply that account to the staged import by default, and reserve reconciliation for exception handling instead of giving it equal weight on every import.

## Goals

- Make single-account imports feel fast and obvious
- Replace duplicated account-assignment controls with one primary account choice
- Preserve row-level editing for exceptions and messy files
- Hide reconciliation unless the import actually has issues worth escalating
- Keep the implementation aligned with the existing staged-row import model

## Non-Goals

- Remove row-level account editing entirely
- Remove reconciliation support for discrepancies or multi-account files
- Change backend transaction commit semantics
- Add schema changes or new server endpoints unless the implementation proves they are necessary

## Current Problem

The current import page presents the Processed Records Editor and Reconciliation as two peer tools. That creates three UX problems:

1. The user can assign accounts in multiple places
2. Reconciliation is visually heavyweight even when nothing is wrong
3. The page implies that grouping by account is the normal review task, even though most imports are already account-specific exports

The current code also confirms this overlap. Both the processed-editor batch assignment and the reconciliation assignment path ultimately write staged `account_name` overrides before commit.

## Product Model

Treat each import as a single-account import by default.

That means the main review question becomes:

`Which account should this import go into?`

Everything else becomes secondary:

- row editing for bad data
- row-level account exceptions
- reconciliation when the import contains unusual account structure or balance discrepancies

## Proposed User Flow

### 1. Upload And Parse

The user uploads a CSV, OFX, or QFX file and the app analyzes it exactly as it does today.

### 2. Choose Import Account

At the top of the review screen, show a primary `Import into account` selector.

Behavior:

- Required before commit
- Applies to the staged import as the default account choice
- Shows a compact status such as `Applied to 128 rows`

### 3. Review Rows

Show the processed rows table as the main workspace.

The default row-review surface should emphasize:

- include/exclude
- invalid rows
- duplicate rows
- amount/direction/category fixes

The Account column should be treated as advanced exception handling:

- hidden by default when all rows follow the import default
- revealed when the user chooses `Show account column`
- automatically revealed when account conflicts or multi-account structure are detected

### 4. Resolve Issues

Show an `Issues found` summary only when something requires attention:

- invalid rows
- duplicate rows
- low-confidence direction rows
- multiple account groups
- missing account match
- reconciliation discrepancy

Each issue should open the smallest relevant tool:

- row-quality issues open filtered row review
- account-group issues reveal account exception tools
- discrepancy issues reveal reconciliation detail and adjustment actions

### 5. Commit Import

If there are no blocking issues, the user commits the import.

If row-level account exceptions exist, show a small summary before commit such as `3 rows use a different account`.

## Account Assignment Rules

The top-level import account is a default, not a destructive overwrite.

Rules:

- Choosing an import account assigns that account to staged rows that do not already have an explicit row-level override
- Editing a row's account in the table marks that row as an exception
- Changing the import-level account later updates only rows that still inherit the default
- Exception rows keep their explicit account choice
- Exception rows should show a subtle `Custom account` treatment in the row table

This preserves flexibility without forcing the user to reason about account mapping on every row.

## Reconciliation Rules

Reconciliation should no longer appear as a full peer panel for every import.

It should be:

- hidden when the import is clean and single-account
- surfaced when multiple account buckets are detected
- surfaced when no account match can be resolved
- surfaced when there is a meaningful discrepancy against the ledger window

When shown, reconciliation should be framed as issue resolution, not a default workflow.

Recommended framing:

- section title: `Account issues` or `Reconciliation issues`
- short explanation of why it is visible
- only reveal the current detailed account summary table when there is an actual discrepancy or multi-account conflict

## UI Structure

Recommended page hierarchy:

1. Mapping Review
2. Import Review
3. Issues found (conditional)
4. Commit summary

Within `Import Review`:

- import account selector and status
- row review table
- optional `Show account column` control

Within `Issues found`:

- invalid rows count
- duplicate rows count
- account conflict count
- discrepancy count

Only the relevant issue details expand.

## Data Model Alignment

This design should build on the existing staged-row override model rather than replacing it.

Current alignment:

- processed-row edits already persist as overrides
- reconciliation already derives its summary from staged processed rows
- commit already resolves the final account from the staged row account identity

That means the preferred implementation path is to add import-level default-account behavior on top of the current row-override system, not to invent a separate import-account storage model first.

## Failure Handling

- If no import account is selected, disable commit and show an inline prompt
- If the import appears to contain multiple account groups, show a warning and reveal account exception tools
- If the chosen account cannot be resolved cleanly, escalate into the account-issue state
- If a discrepancy exists, reveal reconciliation detail without blocking basic row editing
- If the import is clean, keep the page quiet and low-friction

## Verification Scenarios

- Single-account CSV with no issues: choose account once, commit without seeing reconciliation
- Single-account CSV with invalid rows: choose account once, fix rows, commit
- Single-account CSV with discrepancy: reconciliation appears only when discrepancy is detected
- Multi-account CSV: account issue state appears and account exception tools are revealed
- Row-level exception case: changing the import-level account does not overwrite explicit row overrides
- Existing-account import: chosen import account still resolves to the canonical stored account identity

## Recommendation

Implement the guided single-account review flow.

Do not fully merge the Processed Records Editor and Reconciliation into one generic tool. Instead:

- keep row editing as the primary review surface
- replace duplicated batch account assignment with one import-level account selector
- demote reconciliation into a conditional exception-handling surface

This preserves power for edge cases while making the default path match how people actually import files.
