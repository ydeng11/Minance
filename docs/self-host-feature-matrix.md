# Self-Hosted Feature Matrix and Fallbacks

This document defines how Minance Next maps Copilot-style product expectations to self-hosted, OSS-safe behavior.

## Scope and Principles

- Self-host first: the app must run with local storage and no mandatory SaaS dependency.
- Graceful degradation: AI-assisted workflows are optional; deterministic workflows remain available.
- Explicit boundaries: anything requiring proprietary integrations must have a clear fallback or be scoped out.

## Decision Matrix

| Area | Copilot-style expectation | Self-host decision | Current implementation (2026-03-03) | Fallback / Notes |
|---|---|---|---|---|
| Authentication and sessions | Email/password auth, session refresh, user profile | Supported | `POST /v1/auth/signup`, `POST /v1/auth/login`, `POST /v1/auth/refresh`, `GET/DELETE /v1/users/me` | Local session/token storage in SQLite runtime data. |
| Canonical data store | Durable relational storage | Supported | SQLite runtime store (`services/api/data/minance.sqlite`) is active, with foundation/bootstrap status exposed at `GET /v1/system/storage` | JSON fixtures remain only for explicit test or fixture-import flows; see [JSON-to-SQLite runbook](./json-to-sqlite-migration-runbook.md). |
| CSV import and mapping | Bank CSV ingestion with review, mapping, diagnostics | Supported | Implemented import workflow (`/v1/imports*`) with processed-row editor and dedupe | Deterministic parser + manual mapping/editing when heuristics/AI confidence is low. |
| Legacy Minance migration | Import from legacy Minance SQLite DB | Supported | `POST /v1/migrations/minance/sqlite` and migration report endpoint are implemented | Requires host `sqlite3` CLI. If unavailable, operator uses CSV import path. |
| Transactions lifecycle | Create/edit/delete and filter transactions | Partially supported | Manual CRUD and query filters are implemented (`/v1/transactions*`) with canonical day-boundary semantics documented in [`transaction-date-day-boundary-semantics.md`](./transaction-date-day-boundary-semantics.md) | Bulk operations, review workflows, and parity details tracked by open parity tasks. |
| Categories and rules | Category CRUD, strategy tuning, mapping rules | Partially supported | Category list/create/update/delete, rules create, strategy get/update implemented | Group/type/budget parity and full Categories-tab parity are tracked separately. |
| Accounts workflows | Dedicated accounts onboarding/settings flows | Partially supported | Accounts API create/update/list, supported-type, balance-history, and manual-adjustment endpoints are implemented (`/v1/accounts*`), while the Accounts tab UI is still placeholder | Manual/CSV provider fallback remains default; deeper account UX/settings/archive flows are tracked by open tasks. |
| Multi-currency reporting | Mixed-currency ledgers with deterministic aggregate reporting | Strategy defined; implementation pending | Canonical strategy documented in [`multi-currency-strategy.md`](./multi-currency-strategy.md); transactions/accounts already persist native `currency` | Baseline remains native-currency storage and nominal rollups until exchange-rate and reporting-currency layers are implemented. |
| Recurring rules | Recurring lifecycle and transaction linkage | Supported | Recurring lifecycle APIs (`/v1/recurrings*`) and list/detail lifecycle UI (pause/resume/archive/delete/evaluate) are implemented | Linkage behavior remains deterministic and local-only; no managed scheduler dependency required. |
| Investments | Portfolio analytics backed by data model and APIs | Supported | Investments domain + API (`/v1/investments*`) and live investments UI panels are implemented | Uses local holdings snapshots and deterministic calculations; no mandatory third-party market feed. |
| Dashboard and analytics | Summary, trends, category/merchant/heatmap/anomaly views | Supported | `/v1/analytics/*` + dashboard UI implemented | Uses local transaction corpus only; no external analytics service required. |
| AI provider config (BYOK) | Add/rotate keys, choose default/failover providers | Supported | `/v1/ai/providers`, `/v1/ai/credentials*`, `/v1/ai/preferences` implemented | Keys are user-provided; no platform-managed key service required. |
| AI categorization and assistant | Model-assisted enrichment and chat Q&A | Optional feature | Categorization + assistant endpoints implemented | If keys/providers are missing/unavailable, API returns setup-required or graceful errors; deterministic rules/import remain usable. |
| Saved views | Persist reusable filters | Supported | `/v1/saved-views*` implemented | Local persistence; portable through data backup/restore. |
| SaaS subscription/billing surfaces | Subscription plans, hosted billing states | Scoped out for self-host | Not implemented | Replace with self-host diagnostics/docs/help content. |
| Proprietary account aggregation providers | Plaid-like managed integrations | Scoped out by default with explicit abstraction | Account-provider registry endpoints implemented (`/v1/accounts/providers*`) with `manual_csv` self-host default | Direct aggregation actions return explicit unsupported-action errors with remediation to manual/CSV flows. |

## External Dependency Policy

- Required runtime dependencies:
  - Node.js runtime for web/API.
- Optional dependencies:
  - `sqlite3` CLI for legacy migration flow and SQLite foundation bootstrap/validation.
  - AI provider APIs (OpenAI/OpenRouter/Anthropic/Google) only when the operator/user configures BYOK keys.
- Explicitly non-required for baseline operation:
  - Proprietary bank-link providers.
  - Hosted billing/subscription services.
  - Hosted observability vendors.

## Default Self-Host Behavior

- Runtime SQLite defaults:
  - `MINANCE_SQLITE_FILE=services/api/data/minance.sqlite`
  - `MINANCE_SQLITE_SCHEMA_FILE=services/api/sql/schema.sql`
  - startup auto-init enabled unless `MINANCE_SQLITE_AUTO_INIT=false`
- JSON fixture override exists only for explicit migration/setup flows:
  - `MINANCE_DATA_FILE=services/api/test/fixtures/deterministic-financial-store.json`
- Reference self-host stack:
  - `docker-compose.selfhost.yml`
  - `.env.selfhost.example`
  - [`self-host-operations-runbook.md`](./self-host-operations-runbook.md)
  - [`self-host-breaking-migration-guide.md`](./self-host-breaking-migration-guide.md)
- App remains usable without any AI keys:
  - import, manual transaction CRUD, analytics, categories, and migration UI continue to function.
- Development defaults:
  - optional dev/test account seeding (can be disabled via env).

## Open Follow-On Tracks from This Matrix

- SQLite baseline and migration/cutover completion.
- Accounts UX refinements plus advanced recurring/reconciliation workflows.
- Multi-currency reporting and exchange-rate layer rollout.
