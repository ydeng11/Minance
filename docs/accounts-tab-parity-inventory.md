# Accounts Tab Parity Inventory (`minance2-xdy.3`)

Captured on **March 1, 2026 (America/New_York)** using Playwright CLI against local Minance Next.

## Capture environment

- App runtime: `pnpm dev` (`http://localhost:3000` web, `http://localhost:3001` API)
- Account used: `dev@minance.local`
- Playwright artifacts:
  - `output/playwright/parity/minance2-xdy.3/accounts-page.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.3/add-account-click.snapshot.yml`
  - `output/playwright/parity/minance2-xdy.3/network.log`
  - `output/playwright/parity/minance2-xdy.3/console.log`

## Actual behavior observed in current Next UI

1. `/accounts` renders static placeholder cards (sample connected accounts).
2. "Add account" button is present but does not open a wizard/modal.
3. No account creation/edit/delete controls exist.
4. No account detail route/drilldown exists from accounts list cards.
5. No account API traffic is emitted when viewing/interacting with Accounts tab.

Observed network calls for Accounts navigation are limited to app-shell/dashboard requests plus `GET /accounts?_rsc=...`.

## Expected parity behavior from legacy account implementation

Reference implementation source: legacy account-management UI captured before the Quarkus/React stack was removed from this repo.

### Account list and actions

- Accounts table with columns:
  - bank
  - account name
  - account type
  - starting balance
- Row actions menu:
  - modify account
  - delete account
- Loading and error surfaces:
  - skeleton state (`accounts-skeleton`)
  - inline error panel (`accounts-error`)

### Add/modify dialog flow

- Dialog modes:
  - create (`Add New Account`)
  - edit (`Modify Account`)
- Form fields:
  - bank (select)
  - account name (text)
  - account type (select)
  - starting balance (numeric)
- Required validations:
  - bank required
  - account name required
  - account type required
- Submit behavior:
  - create mode submits full payload
  - edit mode disables submit when form unchanged

### Delete behavior

- Delete action from row menu calls account delete endpoint.
- Legacy backend supports two delete selectors:
  - by `account-id`
  - by (`bank-name`, `account-name`)

## Legacy account API contract (reference)

Legacy base path: `/1.0/minance/account`

- `POST /create`
  - Body: account object (`bankName`, `accountName`, `accountType`, `initBalance`, optional IDs)
  - Response: created account payload
- `PUT /update`
  - Body: account object including `accountId`
  - Response: updated account payload
- `DELETE /delete?account-id=...` or `DELETE /delete?bank-name=...&account-name=...`
- `GET /listAll`
  - Response: account array
- `GET /listAccountsForBank?bank-name=...`
  - Response: account array for selected bank
- `GET /supportedBanks`
  - Response: supported bank enums
- `GET /supportedAccountTypes`
  - Response: supported type enums

## Current `/v1` Next stack gap summary

- No dedicated `/v1/accounts` CRUD endpoints are currently exposed.
- Account entities are created implicitly by transactions/import flows (via account name normalization) rather than explicit account management APIs.
- No account settings/state endpoints for reconnect, archive/disable, or detail updates.
- No account onboarding wizard (provider/manual branching) in current UI.

## Implementation-ready acceptance criteria for downstream tasks

1. Accounts tab supports explicit account list retrieval from `/v1` API and removes static placeholders.
2. Add-account flow supports at least manual path with required validation and clear success/failure states.
3. Edit flow supports rename/type/balance updates with optimistic reload and deterministic conflict/error handling.
4. Delete/archive flow includes user confirmation and safe handling of related transactions/balance history.
5. API contracts cover:
  - list accounts
  - create account
  - update account
  - delete/archive account
  - supported institutions/account types (if provider flow remains in scope)
6. UI exposes account detail/settings actions and reflects backend state transitions (connected/manual, active/archived, reconnect-needed).
7. Accounts tab emits account-specific network traffic for core operations; parity capture artifacts can assert route usage.
