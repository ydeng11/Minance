# Account Provider Abstraction (Self-Host First)

This document defines the account-connectivity provider boundary used by the API.

## Goals

- Keep self-host operation functional without proprietary bank-link services.
- Expose a stable provider registry so future connectors can be added without changing route contracts.
- Make fallback and failure behavior explicit when direct aggregation is unavailable.

## API Surface

- `GET /v1/accounts/providers`
  - Returns available providers and `defaultProviderId`.
- `GET /v1/accounts/providers/:providerId`
  - Returns full provider contract (capabilities, adapter boundary, fallback metadata).
- `POST /v1/accounts/providers/:providerId/link-session`
  - Starts direct-link flow when supported.
  - For self-host default provider (`manual_csv`), returns `409 ACCOUNT_PROVIDER_ACTION_UNSUPPORTED` with remediation.

## Provider Contract

Each provider entry includes:

- Identity: `id`, `name`, `status`, `source`, `selfHostDefault`
- Capability map:
  - `manualAccountCreate`
  - `csvImport`
  - `directAggregation`
  - `institutionLookup`
  - `backgroundSync`
  - `reconnect`
- Action support map:
  - `begin_link_session`
  - `refresh_connection`
- Adapter boundary:
  - `ingestRoute`
  - `manualEntryRoute`
- Fallback policy:
  - `strategy`
  - `remediation`
  - `recommendedSteps`

## Current Default Provider

- `manual_csv`
  - Self-host default.
  - Supports manual account creation and CSV import.
  - Does not support direct aggregation/link tokens.
  - Explicitly guides clients to use manual and CSV workflows.

## Failure Handling

- Unknown provider IDs return `404` (`Unknown account provider`).
- Unsupported provider actions return `409` with details:
  - `code=ACCOUNT_PROVIDER_ACTION_UNSUPPORTED`
  - `providerId`
  - `action`
  - `remediation`

This keeps integration behavior deterministic for UI and automation clients.
