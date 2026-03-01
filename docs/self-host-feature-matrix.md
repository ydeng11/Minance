# Self-Hosted Feature Matrix and Fallbacks

This document defines how Minance Next maps Copilot-style product expectations to self-hosted, OSS-safe behavior.

## Scope and Principles

- Self-host first: the app must run with local storage and no mandatory SaaS dependency.
- Graceful degradation: AI-assisted workflows are optional; deterministic workflows remain available.
- Explicit boundaries: anything requiring proprietary integrations must have a clear fallback or be scoped out.

## Decision Matrix

| Area | Copilot-style expectation | Self-host decision | Current implementation (2026-03-01) | Fallback / Notes |
|---|---|---|---|---|
| Authentication and sessions | Email/password auth, session refresh, user profile | Supported | `POST /v1/auth/signup`, `POST /v1/auth/login`, `POST /v1/auth/refresh`, `GET/DELETE /v1/users/me` | Local session/token storage in app data file. |
| Canonical data store | Durable relational storage | Supported (migration in progress) | JSON store (`services/api/data/store.json`) is active | Planned default backend is SQLite; see [JSON-to-SQLite runbook](./json-to-sqlite-migration-runbook.md). |
| CSV import and mapping | Bank CSV ingestion with review, mapping, diagnostics | Supported | Implemented import workflow (`/v1/imports*`) with processed-row editor and dedupe | Deterministic parser + manual mapping/editing when heuristics/AI confidence is low. |
| Legacy Minance migration | Import from legacy Minance SQLite DB | Supported | `POST /v1/migrations/minance/sqlite` and migration report endpoint are implemented | Requires host `sqlite3` CLI. If unavailable, operator uses CSV import path. |
| Transactions lifecycle | Create/edit/delete and filter transactions | Partially supported | Manual CRUD and query filters are implemented (`/v1/transactions*`) | Bulk operations, review workflows, and parity details tracked by open parity tasks. |
| Categories and rules | Category CRUD, strategy tuning, mapping rules | Partially supported | Category create/list, rules create, strategy get/update implemented | Group/type/budget parity and full Categories-tab parity are tracked separately. |
| Accounts workflows | Dedicated accounts onboarding/settings flows | OSS fallback (for now) | No dedicated accounts tab/API yet | Accounts are auto-created from imports/manual transactions; deeper account UX/API tracked by open tasks. |
| Recurring rules | Recurring lifecycle and transaction linkage | Not yet implemented | No recurring routes/endpoints yet | Scoped to future parity work; no hidden/proprietary dependency required. |
| Investments | Portfolio analytics backed by data model and APIs | Partially supported (UI-first) | `/investments` page is currently static/reference UI | Live investments domain/API is tracked as follow-on work. |
| Dashboard and analytics | Summary, trends, category/merchant/heatmap/anomaly views | Supported | `/v1/analytics/*` + dashboard UI implemented | Uses local transaction corpus only; no external analytics service required. |
| AI provider config (BYOK) | Add/rotate keys, choose default/failover providers | Supported | `/v1/ai/providers`, `/v1/ai/credentials*`, `/v1/ai/preferences` implemented | Keys are user-provided; no platform-managed key service required. |
| AI categorization and assistant | Model-assisted enrichment and chat Q&A | Optional feature | Categorization + assistant endpoints implemented | If keys/providers are missing/unavailable, API returns setup-required or graceful errors; deterministic rules/import remain usable. |
| Saved views | Persist reusable filters | Supported | `/v1/saved-views*` implemented | Local persistence; portable through data backup/restore. |
| SaaS subscription/billing surfaces | Subscription plans, hosted billing states | Scoped out for self-host | Not implemented | Replace with self-host diagnostics/docs/help content. |
| Proprietary account aggregation providers | Plaid-like managed integrations | Scoped out by default | Not implemented | Default path is CSV/manual ingestion; provider abstraction can be added later. |

## External Dependency Policy

- Required runtime dependencies:
  - Node.js runtime for web/API.
- Optional dependencies:
  - `sqlite3` CLI for legacy migration flow and upcoming SQLite operations.
  - AI provider APIs (OpenAI/OpenRouter/Anthropic/Google) only when the operator/user configures BYOK keys.
- Explicitly non-required for baseline operation:
  - Proprietary bank-link providers.
  - Hosted billing/subscription services.
  - Hosted observability vendors.

## Default Self-Host Behavior

- Data path defaults to `services/api/data/store.json` (`MINANCE_DATA_FILE` can override).
- App remains usable without any AI keys:
  - import, manual transaction CRUD, analytics, categories, and migration UI continue to function.
- Development defaults:
  - optional dev/test account seeding (can be disabled via env).

## Open Follow-On Tracks from This Matrix

- SQLite baseline and migration/cutover completion.
- Accounts/Recurring dedicated APIs and tabs.
- Investments live data model + API wiring.
- Self-host operator docs for deploy/backup/security/observability hardening.
