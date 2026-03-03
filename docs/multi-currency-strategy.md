# Multi-Currency Strategy and Constraints (`minance2-xdy.21`)

Defined on **March 3, 2026 (America/New_York)** for self-host Minance Next.

## Goal

Provide deterministic rules for storing, converting, and displaying financial data when accounts and transactions span multiple currencies, without requiring proprietary services.

## Current Baseline (as of 2026-03-03)

- Transactions and accounts already persist `currency` as ISO-4217 (3-letter uppercase).
- Core analytics and dashboard rollups currently sum nominal amounts and therefore assume a single reporting currency.
- No exchange-rate ledger is currently persisted.

## Scope

### In scope

- Canonical storage model for native and converted values.
- Exchange-rate source assumptions and fallback behavior.
- API and UI display rules for mixed-currency datasets.
- Self-host operational constraints and defaults.

### Out of scope

- Live brokerage/bank FX feeds that require managed SaaS contracts.
- Intraday trading-grade precision guarantees.
- Auto-hedging/rebalancing logic.

## Canonical Data Model

1. Keep native values immutable:
   - Every transaction/position remains authoritative in its source `currency` and native `amount`.
2. Introduce reporting currency at user level:
   - Add `reporting_currency` to user preferences (default `USD`).
3. Add optional daily exchange-rate table:
   - Key: (`date`, `base_currency`, `quote_currency`)
   - Fields: `rate`, `source`, `imported_at`
4. Derive converted amounts on read (or cache as snapshot):
   - `amount_reporting = amount_native * rate(base=native, quote=reporting, date=valuation_date)`

## Exchange-Rate Source Policy

1. Primary source: operator-provided rates (CSV/JSON import) under source control or mounted volume.
2. Optional source: pluggable HTTP provider behind explicit config.
3. If no valid rate exists for a requested date pair:
   - Do not invent values.
   - Return null converted amount with explicit `rate_missing` metadata.
   - UI shows native amount only plus a missing-rate badge.

## Conversion Semantics

1. Transaction conversion date: `transaction_date`.
2. Daily rollups use each row's date-specific rate.
3. Portfolio valuation conversion date: snapshot valuation date.
4. Rounding:
   - Internal math: full precision decimal.
   - API/UI display: 2 decimal places for fiat, with unrounded value retained in payload where needed.

## API Contract Guidance

For endpoints that emit monetary totals after this strategy is implemented, include:

- Native fields: `amount_native`, `currency_native`
- Reporting fields: `amount_reporting`, `currency_reporting`
- Metadata: `rate_date`, `rate_source`, `rate_missing`

Backward-compatibility rule:

- Existing single-value `amount` fields remain supported during transition, and represent reporting currency once enabled.

## UI Behavior Rules

1. List/detail rows show native amount and currency exactly as imported.
2. Aggregate cards/charts are rendered in reporting currency when conversion is available.
3. When mixed-currency rows have missing rates:
   - Show partial aggregate warning.
   - Keep per-row native amounts visible.
4. User can change reporting currency; recalculation is deterministic from stored rates.

## Self-Host Constraints

1. Baseline deployment must work without any external FX API.
2. Deterministic replay requirement:
   - Given fixed input data and fixed rate files, outputs are reproducible.
3. Missing-rate handling must be explicit and auditable (no silent fallbacks).
4. Data-export/import flows must preserve native amounts and currencies losslessly.

## Delivery Plan (Follow-On)

1. Add `reporting_currency` preference and exchange-rate persistence primitives.
2. Add rate import endpoint + validation and conflict policy.
3. Update analytics/investments rollups to emit dual-currency payloads.
4. Update dashboard/transactions/investments UI to render dual-currency and missing-rate states.
5. Add contract + regression tests for mixed-currency, missing-rate, and reproducibility scenarios.

## Acceptance Criteria

1. Strategy defines storage, conversion source, and fallback behavior with no hidden dependencies.
2. UI/API expectations are explicit for both converted and missing-rate states.
3. Rules are implementable in self-host mode using only local operator-managed data.
