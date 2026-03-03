# Transaction Date and Day-Boundary Semantics (`minance2-xdy.22`)

Defined on **March 3, 2026 (America/New_York)** for self-host Minance Next.

## Purpose

Prevent off-by-one date errors across imports, recurring evaluation, and analytics rollups by defining one canonical date model and one boundary policy.

## Canonical Date Model

1. `transaction_date` is a date-only ledger key in `YYYY-MM-DD` format.
2. Date-only values are authoritative and are not shifted by host timezone.
3. Timestamp inputs are normalized to a ledger date deterministically:
   - If input begins with `YYYY-MM-DD`, that date portion is preserved.
   - Otherwise, parsed timestamps are converted using UTC calendar components.
4. Invalid calendar dates (for example `2026-02-30`) are rejected.

## Day-Boundary Policy

1. Range computations use UTC day boundaries.
2. Relative ranges (`30d`, `90d`, `365d`, `ytd`) are evaluated against UTC "today".
3. Date-range filtering is inclusive for both `start` and `end`.

## Enforcement Points

- Shared date normalization: `services/api/src/utils.js` (`parseDate`)
- Shared range computation: `services/api/src/utils.js` (`computeDateRange`, `startOfToday`)
- Consumers now aligned through shared helpers:
  - imports normalization
  - recurring rule evaluation windows
  - analytics/dashboard rollups
  - transaction list filtering

## Examples

- `2026-02-14T23:30:00-05:00` => `2026-02-14` (explicit date portion preserved)
- `2/5/2026` => `2026-02-05`
- `2/30/2026` => invalid

## Compatibility Notes

1. Existing persisted `YYYY-MM-DD` transaction dates are already compliant.
2. Existing APIs continue accepting date-like inputs; normalization is now stricter for impossible dates.
3. Any client relying on host-local midnight behavior should switch to explicit `YYYY-MM-DD` values to avoid ambiguity.

## Acceptance Checklist

1. Imports, recurring matching, and analytics all consume normalized `YYYY-MM-DD` dates.
2. Range boundaries are deterministic across deployment timezones.
3. Test coverage asserts UTC boundaries, offset timestamp handling, and invalid-date rejection.
