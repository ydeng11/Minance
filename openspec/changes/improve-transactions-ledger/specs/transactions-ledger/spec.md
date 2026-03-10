## ADDED Requirements

### Requirement: Transactions have a dedicated management page
The system SHALL provide a dedicated Transactions page in primary navigation, and that page SHALL be the main destination for transaction review, filtering, and manual entry.

#### Scenario: Open the transactions ledger
- **WHEN** the user selects the Transactions item from primary navigation
- **THEN** the system SHALL render a transactions page whose primary content is the ledger table and its management controls

#### Scenario: Overview hands off to the ledger
- **WHEN** the user is on the overview page and needs full transaction management
- **THEN** the system SHALL direct that workflow into the dedicated Transactions page instead of keeping the overview card as the primary management surface

### Requirement: Transactions filters live in the page header
The system SHALL expose ledger filters in the transactions page header, and active filters SHALL be visible without requiring users to inspect hidden grid menus.

#### Scenario: Spreadsheet-style filter controls are visible
- **WHEN** the transactions page loads
- **THEN** the page header SHALL show filter controls for text/search and common ledger dimensions such as category, account, and transaction type

#### Scenario: Numeric filtering uses a range bar
- **WHEN** the user adjusts the amount filter
- **THEN** the system SHALL provide a visible range-bar control and filter the ledger to rows within the selected amount range

#### Scenario: Date range changes clear stale hidden filters
- **WHEN** the user changes the shared date range while viewing the transactions page
- **THEN** the ledger SHALL refresh against the new date range and reconcile header filters so stale hidden filter state does not persist unnoticed

### Requirement: The transactions ledger shows detailed transaction context
The system SHALL render a denser ledger view than the current compact overview table so users can review transaction details without excessive drilling.

#### Scenario: Desktop ledger shows expanded columns
- **WHEN** the ledger renders on desktop-width viewports
- **THEN** each row SHALL expose at least transaction date, post date, description, category, transaction type, bank, account, amount, and row actions

#### Scenario: Supplemental detail remains discoverable
- **WHEN** a transaction contains memo, location, duplicate, upload, or emoji metadata
- **THEN** the ledger SHALL surface that detail in the row or an immediately adjacent detail affordance without requiring raw JSON inspection or off-page navigation

#### Scenario: Mobile layout stays operable
- **WHEN** the ledger renders on smaller viewports
- **THEN** the user SHALL still be able to scroll or condense the table content without losing access to the page header filters or the create action

### Requirement: New transactions are created from a top-mounted popup
The system SHALL provide a `New transaction` button at the top of the transactions page, and the button SHALL open a popup dialog for manual transaction entry.

#### Scenario: User opens the manual transaction popup
- **WHEN** the user clicks the `New transaction` button
- **THEN** the system SHALL open a dialog that contains the required manual transaction fields before save

#### Scenario: User selects a person/counterparty emoji
- **WHEN** the user is filling out the manual transaction dialog
- **THEN** the system SHALL offer a curated emoji selector for the transaction's person/counterparty marker and preserve the chosen value with the transaction

#### Scenario: Successful create returns the user to the ledger
- **WHEN** the user submits a valid manual transaction
- **THEN** the system SHALL persist the transaction, provide success feedback, and return focus to the ledger workflow without leaving stale create state behind

### Requirement: Newly created transactions appear first
The system SHALL place new manual transactions at the top of the ledger when they match the active filter set.

#### Scenario: Newly created transaction matches current filters
- **WHEN** a manual transaction is created successfully and it satisfies the current date range and active filters
- **THEN** the ledger SHALL show that transaction at the top of the visible result set

#### Scenario: Newly created transaction falls outside the current filters
- **WHEN** a manual transaction is created successfully but does not satisfy the current filters
- **THEN** the system SHALL preserve the current filtered result set and clearly indicate that the new transaction was created outside the active view
