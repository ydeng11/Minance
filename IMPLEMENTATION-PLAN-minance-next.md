# Minance Next Implementation Plan

## Document Control
- Version: v1.1
- Date: February 25, 2026
- Source PRD: `PRD-minance-next.md` (v0.3)
- Audience: Product, Engineering, Design, QA, Data, Security, Operations

## 1. Executive Summary
This plan translates the PRD into a full delivery program to build Minance Next as a privacy-first personal finance product with:
- Responsive web access across desktop and mobile browsers.
- AI-assisted import and categorization for arbitrary CSV formats.
- Advanced analytics and visualizations.
- Conversational AI assistant.
- BYOK AI configuration with multi-provider support.
- Manual transaction CRUD.
- Migration from legacy `../minance`.

Recommended timeline is **26 weeks** across 5 phases with two-week sprints, ending in GA after beta validation.

## 2. Scope Lock

### 2.1 MVP (required before external beta)
- Authentication and user workspace.
- CSV upload with parser + mapping UI fallback.
- Core transaction model and dedupe.
- Manual transaction create/edit/delete.
- Dashboard basics (spend trend, top categories, top merchants).
- AI provider/key settings baseline (BYOK).
- Legacy Minance migration v1 (SQLite import).

### 2.2 V1 (required before GA)
- AI schema inference and categorization with confidence.
- Low-confidence review queue and learning loop.
- Advanced analytics views (heatmaps, decomposition, anomalies, concentration).
- Conversational AI assistant with explainable responses.
- Multi-provider AI routing and optional failover.
- Mobile-browser optimization for key workflows.

### 2.3 Explicitly Excluded
- Direct bank account linking.
- Payments/transfers/bill-pay.
- Investment tracking.
- Shared multi-user household collaboration.

## 3. Delivery Model and Timeline

### 3.1 Phase Timeline
- Phase 0 Discovery and Architecture: Weeks 1-3
- Phase 1 MVP Foundation: Weeks 4-11
- Phase 2 AI Ingestion and Categorization: Weeks 12-17
- Phase 3 Advanced Analytics and Assistant: Weeks 18-23
- Phase 4 Hardening, Beta, GA: Weeks 24-26

### 3.2 Milestones
- M0 Architecture sign-off and backlog baseline: End Week 3
- M1 Internal alpha (core import + dashboard + manual CRUD + migration): End Week 11
- M2 AI ingestion + categorization beta-ready: End Week 17
- M3 Feature-complete RC (assistant + advanced analytics + responsive-web optimization): End Week 23
- M4 GA release: End Week 26

## 4. Team Plan

### 4.1 Core Team
- 1 Product Manager
- 1 Engineering Manager
- 1 Staff/Principal Engineer (architecture + critical path)
- 2 Backend Engineers
- 2 Web Frontend Engineers
- 1 ML/AI Engineer
- 1 Data Engineer/Analytics Engineer
- 1 Product Designer
- 1 QA Automation Engineer
- 1 DevOps/SRE (shared)
- 1 Security Engineer (shared, part-time)

### 4.2 RACI Summary
- Product scope and prioritization: PM (A), EM (R), Tech Leads (C)
- Architecture and standards: Principal Engineer (A/R), Leads (C)
- Implementation: Engineering squads (R)
- QA and release sign-off: QA (R), EM (A)
- Security and privacy compliance: Security Engineer (A), Backend/Platform (R)

## 5. Recommended Technical Strategy

### 5.1 Platform Baseline
Use `../minance` as a baseline and evolve into a modular monorepo:
- `apps/web`: responsive web app.
- `services/api`: backend API and orchestration.
- `services/ai-worker`: asynchronous AI processing jobs.
- `packages/ui`: shared design system.
- `packages/domain`: shared types, validation contracts, API clients.

### 5.2 Reuse Strategy from Legacy
- Reuse domain knowledge from legacy transaction/account/category logic.
- Reuse CSV template rules as deterministic fallback engine.
- Replace template-only parsing with AI + mapping pipeline.
- Add tenancy and modern auth to transition from local single-user model.

### 5.3 Core Architecture
- API layer: user auth, transaction CRUD, analytics APIs, migration endpoints.
- Async processing layer: file ingestion, schema inference, categorization jobs.
- Data layer:
  - OLTP relational schema for canonical transactions.
  - Aggregated analytics tables/materialized views.
  - Optional object storage for uploaded source files.
- AI layer:
  - Provider abstraction (adapter interface) for multiple AI providers.
  - BYOK credential vault and provider preference resolver.
  - Column mapping inference.
  - Categorization model pipeline.
  - NL query planner + answer synthesis with guardrails.

## 6. Workstreams and Epics

## WS-0 Program Setup and Governance
### Epic E0.1 Project Bootstrap
- Repository structure and branch strategy.
- CI baseline for web, backend, and shared packages.
- Environments: local, dev, staging, prod.
- Feature flag framework.

### Epic E0.2 Delivery Governance
- Sprint cadence and release calendar.
- Definition of Ready and Definition of Done.
- Cross-functional ceremonies and decision log.

## WS-1 UX, Design System, and Product Flows
### Epic E1.1 Product IA and Core Navigation
- Information architecture for dashboard, imports, transactions, analytics, assistant, settings.
- Responsive navigation and layout behavior across breakpoints.

### Epic E1.2 Design System
- Tokens, color, typography, spacing, chart styles, motion patterns.
- Accessible components for forms, tables, dialogs, charts.

### Epic E1.3 Journey Completion
- Onboarding flow.
- Import review and correction flow.
- Migration wizard flow.
- Assistant interaction flow.

## WS-2 Identity, Security, and Workspace
### Epic E2.1 Authentication and Authorization
- Email/password and social auth support (if chosen).
- Session management and token lifecycle.
- User-scoped authorization middleware.

### Epic E2.2 Security Baseline
- Encryption at rest and in transit.
- Secrets management.
- Audit trail for critical events.

### Epic E2.3 Privacy Controls
- Data export and delete endpoints.
- AI data retention policy controls.

### Epic E2.4 AI Credential Management (BYOK)
- Provider catalog and model catalog support.
- User API key create/validate/rotate/delete flows.
- Encrypted storage, masking, and audit events.

## WS-3 Data Model, Storage, and Migration
### Epic E3.1 Canonical Schema
- Transaction schema from PRD.
- Account/source entities.
- Category taxonomy and user rules.
- Import jobs and diagnostics schema.
- Assistant query logs schema.

### Epic E3.2 Aggregations and Query Performance
- Precomputed daily/monthly tables.
- Merchant/category rollups.
- Anomaly baseline features.

### Epic E3.3 Legacy Migration
- SQLite parser for `banks`, `accounts`, `transactions`, `minance_category`, `raw_category_to_minance_category`.
- Idempotent import engine.
- Reconciliation report generation.

## WS-4 Ingestion Pipeline and Manual Entry
### Epic E4.1 Upload and File Management
- CSV upload API.
- File validation and metadata storage.
- Async job orchestration with status tracking.

### Epic E4.2 Schema Inference and Mapping
- Delimiter/header/encoding detection.
- AI column mapping suggestions.
- Mapping editor and validation.

### Epic E4.3 Normalization and Dedupe
- Date parsing with locale handling.
- Amount direction normalization.
- Merchant normalization.
- Dedupe fingerprint strategy and collision handling.

### Epic E4.4 Manual Transaction CRUD
- Create/edit/delete endpoints and responsive web UI.
- Source tagging and history tracking.

## WS-5 AI Categorization
### Epic E5.1 Category Taxonomy and Rule Engine
- Default taxonomy.
- User-defined categories.
- Rule priority strategy.

### Epic E5.2 Categorization Model Pipeline
- Multi-stage inference:
  - deterministic rules
  - merchant-memory lookup
  - model inference fallback
- Confidence scoring and thresholds.

### Epic E5.3 Feedback Learning Loop
- Capture user corrections.
- Rule auto-suggestions from repeated edits.
- Periodic model/rule refresh jobs.

## WS-6 Analytics and Visualization
### Epic E6.1 Core Dashboard
- Total spend, net flow, recurring spend, top merchants/categories.
- Time range controls and comparison periods.

### Epic E6.2 Advanced Visualizations
- Category decomposition.
- Spending heatmap.
- Merchant concentration chart.
- Anomaly view with explainers.

### Epic E6.3 Saved Views
- Save named filters and chart configurations.

## WS-7 Conversational AI Assistant
### Epic E7.1 Query Understanding and Planning
- Intent classification and date-range/entity extraction.
- Structured query generation with guardrails.

### Epic E7.2 Answer Generation
- Numerical result synthesis.
- Drill-down links to filtered transaction views.
- Confidence and uncertainty messaging.

### Epic E7.3 Safety and Observability
- Prompt injection defenses.
- Query limits and rate limiting.
- Hallucination monitoring with offline benchmark suite.

## WS-8 Responsive Web Experience
### Epic E8.1 Responsive Foundation
- Breakpoint system and adaptive layout behavior.
- Touch-friendly interactions and controls.

### Epic E8.2 Key Workflow Mobile-Browser Experience
- Upload/import progress on small screens.
- Manual entry on small screens.
- Dashboard and key analytics on small screens.
- Assistant chat flow on small screens.

### Epic E8.3 Cross-Browser and Device QA Hardening
- Device/browser matrix testing (mobile browsers + desktop browsers).
- Performance and accessibility tuning across breakpoints.

## WS-9 Quality Engineering and Operations
### Epic E9.1 Automated Test Strategy
- Unit tests for parsing/categorization/business rules.
- Integration tests for APIs and data flow.
- E2E for web critical journeys across desktop and mobile browsers.

### Epic E9.2 SRE and Observability
- Metrics, tracing, logs, and alerting.
- SLO dashboards and error budget policy.

### Epic E9.3 Release Controls
- Beta cohort flags.
- Progressive rollout and rollback playbooks.

## 7. Detailed Sprint Plan (13 Sprints)

## Sprint 1 (Weeks 1-2)
- Finalize architecture decision record.
- Bootstrap monorepo and CI.
- Define canonical schema draft.
- Define BYOK provider adapter contract and key vault schema.
- Create design system foundations.
- Exit criteria:
  - CI green for all packages.
  - Schema and API contract draft reviewed.

## Sprint 2 (Weeks 3-4)
- Implement auth and user workspace scaffolding.
- Implement BYOK provider settings API/UI skeleton (add key, validate key, set default provider).
- Build upload endpoint and job model skeleton.
- Create dashboard shell and navigation.
- Begin migration parser spike for SQLite.
- Exit criteria:
  - User can sign in and reach app shell.
  - Upload job can be created and tracked.

## Sprint 3 (Weeks 5-6)
- Implement CSV parser baseline (deterministic rules).
- Build mapping editor UI.
- Implement manual transaction create/edit/delete API + web UI.
- Add source tags and audit logs.
- Exit criteria:
  - User can upload a CSV and map required fields.
  - User can CRUD one transaction.

## Sprint 4 (Weeks 7-8)
- Implement normalization + dedupe pipeline.
- Build category taxonomy CRUD.
- Build dashboard v1 cards and trend chart.
- Implement migration import for accounts and transactions.
- Exit criteria:
  - End-to-end import with dedupe works on test dataset.
  - Migration dry-run report available.

## Sprint 5 (Weeks 9-10)
- Improve dashboard and filter interactions.
- Add top merchants/categories views.
- Complete migration mapping for category linkage tables.
- Build reconciliation and idempotency checks.
- Exit criteria:
  - Internal alpha for core non-AI features.

## Sprint 6 (Weeks 11-12)
- Add AI schema inference service for column mapping.
- Add mapping confidence and user correction capture.
- Implement low-confidence import review queue skeleton.
- Implement provider adapter abstraction and per-user provider/model resolution.
- Exit criteria:
  - AI mapping suggestions shown in upload flow.

## Sprint 7 (Weeks 13-14)
- Implement multi-stage AI categorization pipeline.
- Add confidence scores and manual override UX.
- Add feedback capture for corrected categories.
- Exit criteria:
  - Categorization enabled for newly imported datasets.

## Sprint 8 (Weeks 15-16)
- Implement merchant normalization improvements.
- Add personalized rule generation from corrections.
- Build categorization benchmark harness and reporting.
- Exit criteria:
  - Accuracy report available against benchmark corpus.

## Sprint 9 (Weeks 17-18)
- Build advanced analytics APIs and aggregates.
- Implement heatmap and decomposition views.
- Implement anomaly and concentration features.
- Exit criteria:
  - Advanced analytics functional in web app.

## Sprint 10 (Weeks 19-20)
- Implement assistant query planner and SQL guardrails.
- Implement answer composer with drill-down links.
- Add observability and correctness benchmark for assistant.
- Add multi-provider fallback and provider error handling for assistant and categorization APIs.
- Exit criteria:
  - Assistant answers top benchmark intents with traceable basis.

## Sprint 11 (Weeks 21-22)
- Implement responsive optimization for import status, dashboard, manual CRUD on small screens.
- Implement assistant UI optimizations for small screens.
- Cross-breakpoint performance and accessibility pass.
- Exit criteria:
  - Key mobile-browser journeys are complete.

## Sprint 12 (Weeks 23-24)
- Load/performance testing and query optimization.
- Security hardening and privacy controls completion.
- Beta release with feature flags.
- Exit criteria:
  - Beta SLO dashboard active and stable.

## Sprint 13 (Weeks 25-26)
- Fix beta findings and polish UX.
- GA readiness review.
- Production rollout with staged exposure.
- Exit criteria:
  - GA criteria met and release signed off.

## 8. Detailed Requirements Traceability

| PRD Requirement | Epics | Primary Deliverables | Validation |
|---|---|---|---|
| FR-1 Web Access with Mobile-Friendly Experience | E1.1, E8.1, E8.2 | Responsive web journeys across desktop and mobile browsers | Web E2E on desktop/mobile browsers, usability scoring |
| FR-2 Any CSV format | E4.1, E4.2, E4.3 | Parser + AI mapping + preview + dedupe | Import success metrics and integration tests |
| FR-3 AI categorization | E5.1, E5.2, E5.3 | Multi-stage categorization with confidence and learning loop | Accuracy benchmark + override audit |
| FR-4 Advanced analytics | E6.1, E6.2, E3.2 | Dashboard and advanced visualizations | Query latency and correctness tests |
| FR-5 AI assistant | E7.1, E7.2, E7.3 | NL query to answer pipeline with drill-down links | Numeric correctness benchmark |
| FR-6 Manual record | E4.4 | Transaction CRUD with source tracking | API tests + UI E2E |
| FR-7 Migration from minance | E3.3 | SQLite import and reconciliation report | Migration test suite with idempotency checks |
| FR-8 AI BYOK + Multi-provider | E2.4, E5.2, E7.3 | API key management, provider routing, fallback behavior | Security tests + provider failover tests |

## 9. Data Model Implementation Details

### 9.1 Core Tables (minimum)
- `users`
- `workspaces` (if multi-workspace is needed later)
- `accounts`
- `transactions`
- `categories`
- `category_rules`
- `imports`
- `import_rows_raw`
- `import_row_diagnostics`
- `ai_provider_credentials`
- `ai_provider_preferences`
- `assistant_queries`
- `saved_views`

### 9.2 Transaction Indexing and Partitioning
- Index on `(user_id, transaction_date)`.
- Index on `(user_id, category_final, transaction_date)`.
- Index on `(user_id, merchant_normalized, transaction_date)`.
- Unique key on `(user_id, dedupe_fingerprint)`.
- Optional monthly partitioning by transaction date if dataset grows.

### 9.3 Legacy Mapping Details

| Legacy Table/Field | New Target | Transformation |
|---|---|---|
| `banks.bank_name` | `accounts.source_institution` | direct |
| `accounts.account_name` | `accounts.display_name` | direct |
| `accounts.account_type` | `accounts.account_type` | normalize enum |
| `transactions.transaction_date` | `transactions.transaction_date` | direct parse |
| `transactions.post_date` | `transactions.post_date` | nullable parse |
| `transactions.description` | `transactions.description` | direct |
| `transactions.category` | `transactions.category_raw` | direct |
| `transactions.amount` | `transactions.amount` | decimal normalization |
| `transactions.transaction_type` | `transactions.direction` | mapped rule |
| `transactions.memo` | `transactions.memo` | direct |
| `transactions.upload_time` | `transactions.created_at` | parse fallback to migration time |
| `minance_category` | `categories` | user taxonomy seed |
| `raw_category_to_minance_category` | `category_rules` | map raw to canonical |

### 9.4 Dedupe Fingerprint
- Fingerprint components:
  - `user_id`
  - normalized account identifier
  - normalized merchant/description
  - `amount`
  - transaction date
  - optional memo hash
- Hash algorithm: stable deterministic hash (for example SHA-256).
- Collision policy:
  - Flag as potential duplicate and keep conflict record in diagnostics.
  - Never silently drop without audit entry.

## 10. API Contract Plan

### 10.1 Auth and User
- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/users/me`
- `DELETE /v1/users/me` (data deletion workflow)

### 10.2 Import and Migration
- `POST /v1/imports` (create upload job)
- `GET /v1/imports/{id}` (status/progress)
- `POST /v1/imports/{id}/mapping` (save column mapping)
- `POST /v1/imports/{id}/commit`
- `POST /v1/migrations/minance/sqlite`
- `GET /v1/migrations/{id}/report`

### 10.3 Transactions
- `GET /v1/transactions`
- `POST /v1/transactions` (manual create)
- `PUT /v1/transactions/{id}`
- `DELETE /v1/transactions/{id}`

### 10.4 Analytics
- `GET /v1/analytics/overview`
- `GET /v1/analytics/categories`
- `GET /v1/analytics/merchants`
- `GET /v1/analytics/heatmap`
- `GET /v1/analytics/anomalies`

### 10.5 Assistant
- `POST /v1/assistant/query`
- `GET /v1/assistant/query/{id}` (result and trace)

### 10.6 AI Provider Settings (BYOK)
- `GET /v1/ai/providers` (supported providers/models)
- `GET /v1/ai/credentials` (masked list only)
- `POST /v1/ai/credentials` (add key + validate)
- `PUT /v1/ai/credentials/{id}` (rotate key)
- `DELETE /v1/ai/credentials/{id}`
- `PUT /v1/ai/preferences` (default provider/model + optional failover)

## 11. AI Implementation Details

### 11.0 Provider and Key Policy
- AI features require a valid user-provided API key.
- Support at least 3 providers at launch through a shared adapter interface.
- Provider routing is resolved in order:
  - explicit per-feature override
  - user default provider
  - optional failover provider list
- If no valid key exists, AI actions return a setup-required response with remediation details.

### 11.1 CSV Schema Inference
- Input: file sample rows + header candidates.
- Output:
  - mapped canonical fields
  - confidence per mapping
  - warning list for ambiguous columns
- Fallback:
  - deterministic parser heuristics
  - user-driven manual mapping.

### 11.2 Categorization Pipeline
- Stage 1: exact/regex rule match from user rule set.
- Stage 2: merchant memory lookup from prior confirmed transactions.
- Stage 3: model-based inference using normalized text and metadata.
- Stage 4: if confidence below threshold, push to review queue.

### 11.3 Confidence Policy
- High confidence >= 0.85: auto-apply.
- Medium confidence 0.60-0.84: auto-apply but highlight in review feed.
- Low confidence < 0.60: require user review before finalization.

### 11.4 Assistant Guardrails
- Strict query sandbox:
  - read-only generated queries
  - allowed tables/views only
  - row and runtime limits
- Output constraints:
  - numeric answer with basis summary
  - no unsupported claims
  - uncertainty annotation when data is sparse or ambiguous.

## 12. Quality Plan

### 12.1 Testing Matrix
- Unit tests:
  - parser, normalization, dedupe, rule engine, assistant planner.
- Integration tests:
  - import pipeline end-to-end in API.
  - migration engine with fixture SQLite files.
  - AI provider key management and multi-provider failover behavior.
- E2E tests:
  - web critical flows.
  - responsive flows on mobile browsers.
- Non-functional tests:
  - load tests for 100k rows/user.
  - security scans and dependency checks.
  - accessibility audits for WCAG 2.1 AA.

### 12.2 Exit Gates per Milestone
- M1 gate:
  - Import + manual CRUD + migration all pass critical E2E.
- M2 gate:
  - Categorization benchmark >= 85% top-1 accuracy.
- M3 gate:
  - Assistant benchmark >= 90% numerical correctness.
- M4 gate:
  - SLOs stable for 14-day beta window.

## 13. Observability and SLO Plan

### 13.1 Key SLOs
- API availability: 99.9% (post-beta).
- P95 import completion (5,000 rows): <= 30 sec.
- P95 analytics query latency: <= 1.5 sec.
- P95 dashboard first meaningful paint: <= 2.5 sec.
- Assistant correctness benchmark: >= 90%.

### 13.2 Monitoring
- Service health dashboards by endpoint and job type.
- Error budget tracking.
- Data quality dashboards:
  - parse failures
  - duplicate rates
  - low-confidence category share
  - assistant abstain rate.

## 14. Security and Privacy Implementation
- Multi-tenant row-level access checks.
- PII-safe logging and redaction.
- Encryption keys managed by secrets service.
- User AI API keys encrypted with application-managed KMS envelope encryption.
- Keys are masked in UI and never returned in plaintext after creation.
- Data retention policy for uploads and assistant logs.
- User-driven export/delete flows.
- Security reviews:
  - threat modeling in Phase 0.
  - penetration testing in Phase 4.

## 15. Release Strategy

### 15.1 Environments
- `dev`: rapid integration.
- `staging`: production-like validation.
- `prod`: phased rollout only.

### 15.2 Rollout Stages
- Internal dogfood: engineering and PM only.
- Private beta: invited legacy Minance users.
- Public beta: waitlist users.
- GA: phased 10% -> 50% -> 100% rollout over one week, with rollback switch.

### 15.3 Rollback Criteria
- Availability < 99.5% sustained for 1 hour.
- Import failure rate > 10% in 30 minutes.
- Critical data corruption signal.

## 16. Risks, Dependencies, and Mitigation Plan

### 16.1 Critical Dependencies
- AI model/provider selection and cost envelope.
- Provider API terms, limits, and supported auth/key formats.
- Responsive-web architecture decisions finalized by Week 2.
- Data storage and analytics engine final selection by Week 3.
- Security and legal review for data handling before beta.

### 16.2 Top Risks
- Variable CSV quality reduces import reliability.
- AI misclassification erodes trust.
- Invalid/expired user API keys degrade AI feature availability.
- Single-provider outages can break AI workflows if failover is not configured.
- Query planner errors can impact assistant correctness.
- Migration edge cases in legacy datasets.

### 16.3 Mitigations
- Mandatory mapping fallback and diagnostics.
- Confidence thresholds with easy correction UX.
- Key validation on save + periodic health checks + setup prompts.
- Multi-provider routing with user-configurable failover.
- Deterministic query guardrails and benchmark gating.
- Migration dry-run mode + reconciliation report + idempotent import.

## 17. Resourcing and Capacity Estimate

### 17.1 Effort Distribution (rough)
- Platform/auth/security: 15%
- Data model/migration: 20%
- Ingestion and categorization: 25%
- Analytics and assistant: 25%
- Responsive UX hardening: 15%

### 17.2 Contingency Buffer
- Reserve 15% sprint capacity for unknowns and production issues.
- Reserve one stabilization sprint before GA if beta defect density is high.

## 18. Operational Runbooks to Create
- Import job stuck/failed remediation.
- Migration rollback and replay guide.
- User API key invalid/expired remediation flow.
- AI provider outage fallback behavior.
- Assistant degraded-mode operation.
- Data incident response and user communication templates.

## 19. Definition of Done (Global)
- Feature behind flag with telemetry.
- Unit/integration tests added and passing.
- E2E coverage for critical paths updated.
- Accessibility and performance checks pass targets.
- Security review complete for sensitive changes.
- Documentation and runbooks updated.

## 20. Immediate Next Steps (Next 10 Business Days)
1. Lock architecture and responsive-web implementation decisions.
2. Finalize canonical schema and API contract v1, including BYOK provider settings endpoints.
3. Build repo scaffolding and CI/CD baseline.
4. Start Sprint 1 implementation with auth shell, import job skeleton, and BYOK provider settings foundations.
5. Prepare benchmark datasets for import accuracy, categorization accuracy, and assistant correctness.

## 21. Detailed Backlog (Execution-Ready)

### 21.1 Story Format Standard
- Story ID format: `MNX-<area>-<number>`.
- Each story includes:
  - requirement linkage
  - owner role
  - dependencies
  - acceptance criteria
  - estimate (story points)

### 21.2 Foundation and Platform Stories
- `MNX-PLT-001`: Monorepo scaffold and package boundaries.
  - Links: FR-1, NFR performance/reliability
  - Owner: Principal Engineer + Platform
  - Depends on: none
  - Acceptance:
    - Workspace builds all apps/services from root command.
    - Shared lint/test/typecheck pipeline passes.
  - Estimate: 5
- `MNX-PLT-002`: CI matrix for web/api/shared packages.
  - Links: all FRs
  - Owner: Platform
  - Depends on: `MNX-PLT-001`
  - Acceptance:
    - Per-package jobs run on PR.
    - Blocking checks enforced on protected branch.
  - Estimate: 5
- `MNX-PLT-003`: Environment promotion flow (dev -> staging -> prod).
  - Links: NFR reliability
  - Owner: DevOps
  - Depends on: `MNX-PLT-002`
  - Acceptance:
    - Automated deploy pipeline exists for each env.
    - Rollback command verified in staging.
  - Estimate: 3
- `MNX-SEC-001`: Secret management and key rotation baseline.
  - Links: NFR security
  - Owner: Security + Platform
  - Depends on: `MNX-PLT-003`
  - Acceptance:
    - Secrets removed from repo and env configs.
    - Rotation runbook validated.
  - Estimate: 3

### 21.3 Authentication and Workspace Stories
- `MNX-AUTH-001`: Signup/login and token session handling.
  - Links: FR-1
  - Owner: Backend
  - Depends on: `MNX-PLT-002`
  - Acceptance:
    - User can sign up and log in.
    - Session refresh works and expired session behavior is handled.
  - Estimate: 8
- `MNX-AUTH-002`: User profile and `/me` endpoint.
  - Links: FR-1
  - Owner: Backend
  - Depends on: `MNX-AUTH-001`
  - Acceptance:
    - Authenticated profile endpoint returns user-scoped data.
  - Estimate: 3
- `MNX-AUTH-003`: Authorization middleware for all tenant-scoped endpoints.
  - Links: NFR security/privacy
  - Owner: Backend
  - Depends on: `MNX-AUTH-001`
  - Acceptance:
    - Cross-tenant access attempts are rejected.
    - Authorization test suite covers all major endpoints.
  - Estimate: 5

### 21.3A AI Provider and BYOK Stories
- `MNX-AIKEY-001`: Provider catalog and model catalog endpoint.
  - Links: FR-8
  - Owner: Backend
  - Depends on: `MNX-PLT-002`
  - Acceptance:
    - Supported providers/models returned via API and consumable by web settings screens.
  - Estimate: 3
- `MNX-AIKEY-002`: User API key management (add/validate/rotate/delete) with masked retrieval.
  - Links: FR-8
  - Owner: Backend + Web
  - Depends on: `MNX-AIKEY-001`, `MNX-AUTH-003`
  - Acceptance:
    - Users can manage keys per provider.
    - Keys are validated and never returned in plaintext after save.
  - Estimate: 8
- `MNX-AIKEY-003`: Provider preferences and failover configuration.
  - Links: FR-8
  - Owner: Backend + Web
  - Depends on: `MNX-AIKEY-002`
  - Acceptance:
    - Users can set default provider/model and optional failover chain.
    - AI requests resolve provider according to user preferences.
  - Estimate: 5

### 21.4 Data Model and Migration Stories
- `MNX-DATA-001`: Canonical schema migrations (`users`, `accounts`, `transactions`, `categories`, `rules`, `imports`).
  - Links: FR-2, FR-3, FR-6, FR-7
  - Owner: Backend/Data
  - Depends on: `MNX-PLT-001`
  - Acceptance:
    - Migration scripts run idempotently in local and staging.
    - Schema matches PRD canonical fields.
  - Estimate: 8
- `MNX-DATA-002`: Transaction indexing and query plan validation.
  - Links: FR-4, NFR performance
  - Owner: Data Engineer
  - Depends on: `MNX-DATA-001`
  - Acceptance:
    - Indexes present and query benchmarks documented.
  - Estimate: 5
- `MNX-MIG-001`: Legacy Minance SQLite file ingestion parser.
  - Links: FR-7
  - Owner: Backend
  - Depends on: `MNX-DATA-001`
  - Acceptance:
    - Parses all required legacy tables and surfaces validation errors.
  - Estimate: 8
- `MNX-MIG-002`: Legacy-to-canonical field mapping implementation.
  - Links: FR-7
  - Owner: Backend/Data
  - Depends on: `MNX-MIG-001`
  - Acceptance:
    - Field mapping table implemented exactly as section 9.3.
    - Date/amount normalization logic verified on fixtures.
  - Estimate: 8
- `MNX-MIG-003`: Idempotent migration and reconciliation report.
  - Links: FR-7
  - Owner: Backend
  - Depends on: `MNX-MIG-002`
  - Acceptance:
    - Re-running migration does not duplicate rows.
    - Report includes scanned/imported/duplicates/unmapped counts.
  - Estimate: 5

### 21.5 Import and Normalization Stories
- `MNX-IMP-001`: File upload API and import job state machine.
  - Links: FR-2
  - Owner: Backend
  - Depends on: `MNX-DATA-001`
  - Acceptance:
    - Upload produces job with statuses `received`, `processing`, `needs_review`, `completed`, `failed`.
  - Estimate: 8
- `MNX-IMP-002`: Deterministic parser for CSV baseline.
  - Links: FR-2
  - Owner: Backend
  - Depends on: `MNX-IMP-001`
  - Acceptance:
    - Delimiter/header/encoding detection works for benchmark files.
  - Estimate: 8
- `MNX-IMP-003`: Mapping editor API + web UI.
  - Links: FR-2
  - Owner: Web + Backend
  - Depends on: `MNX-IMP-002`
  - Acceptance:
    - User can review/edit field mappings before commit.
  - Estimate: 8
- `MNX-IMP-004`: Date/amount normalization and direction inference.
  - Links: FR-2
  - Owner: Backend
  - Depends on: `MNX-IMP-002`
  - Acceptance:
    - Dates and amount signs normalized to canonical representation.
  - Estimate: 5
- `MNX-IMP-005`: Dedupe fingerprint and duplicate handling UX.
  - Links: FR-2
  - Owner: Backend + Web
  - Depends on: `MNX-IMP-004`
  - Acceptance:
    - Duplicate candidates are surfaced and auditable.
  - Estimate: 5

### 21.6 Manual Transaction Stories
- `MNX-TXN-001`: Manual transaction create endpoint.
  - Links: FR-6
  - Owner: Backend
  - Depends on: `MNX-DATA-001`
  - Acceptance:
    - Creates a transaction with source `manual`.
  - Estimate: 3
- `MNX-TXN-002`: Manual transaction edit/delete endpoints.
  - Links: FR-6
  - Owner: Backend
  - Depends on: `MNX-TXN-001`
  - Acceptance:
    - Edits and deletes are reflected in analytics queries.
  - Estimate: 3
- `MNX-TXN-003`: Responsive web manual transaction forms.
  - Links: FR-1, FR-6
  - Owner: Web
  - Depends on: `MNX-TXN-002`
  - Acceptance:
    - Forms validate required fields and support edit mode on desktop and mobile browsers.
  - Estimate: 5

### 21.7 AI Mapping and Categorization Stories
- `MNX-AI-001`: AI column mapping inference service.
  - Links: FR-2
  - Owner: ML + Backend
  - Depends on: `MNX-IMP-001`, `MNX-AIKEY-003`
  - Acceptance:
    - Returns mapped canonical fields with confidence scores.
  - Estimate: 8
- `MNX-AI-002`: Low-confidence mapping review queue.
  - Links: FR-2
  - Owner: Web + Backend
  - Depends on: `MNX-AI-001`
  - Acceptance:
    - Imports with ambiguous mapping require user confirmation.
  - Estimate: 5
- `MNX-AI-003`: Categorization rule engine.
  - Links: FR-3
  - Owner: Backend
  - Depends on: `MNX-DATA-001`
  - Acceptance:
    - Rule precedence and override behavior documented and tested.
  - Estimate: 5
- `MNX-AI-004`: Merchant normalization service.
  - Links: FR-3
  - Owner: Backend/ML
  - Depends on: `MNX-IMP-004`
  - Acceptance:
    - Known merchant variants normalize to single merchant ID/name.
  - Estimate: 5
- `MNX-AI-005`: Model-based categorization fallback.
  - Links: FR-3
  - Owner: ML + Backend
  - Depends on: `MNX-AI-003`, `MNX-AI-004`, `MNX-AIKEY-003`
  - Acceptance:
    - Multi-stage inference returns category + confidence.
  - Estimate: 8
- `MNX-AI-006`: Category correction capture and learning loop.
  - Links: FR-3
  - Owner: ML + Backend
  - Depends on: `MNX-AI-005`
  - Acceptance:
    - User corrections feed rule suggestions and future prediction improvement.
  - Estimate: 8
- `MNX-AI-007`: Categorization benchmark harness.
  - Links: FR-3
  - Owner: ML + QA
  - Depends on: `MNX-AI-005`
  - Acceptance:
    - Benchmark report generated per build with top-1 metric.
  - Estimate: 5

### 21.8 Analytics Stories
- `MNX-ANL-001`: Overview analytics API (spend, net flow, comparisons).
  - Links: FR-4
  - Owner: Backend/Data
  - Depends on: `MNX-DATA-002`
  - Acceptance:
    - API supports date range and comparison windows.
  - Estimate: 5
- `MNX-ANL-002`: Category and merchant rollup APIs.
  - Links: FR-4
  - Owner: Backend/Data
  - Depends on: `MNX-ANL-001`
  - Acceptance:
    - Rollups return correct grouped results with filters.
  - Estimate: 5
- `MNX-ANL-003`: Advanced analytics API (heatmap, anomalies, concentration).
  - Links: FR-4
  - Owner: Backend/Data
  - Depends on: `MNX-ANL-002`
  - Acceptance:
    - APIs meet P95 latency target in staging benchmark.
  - Estimate: 8
- `MNX-ANL-004`: Web analytics visualizations (advanced charts).
  - Links: FR-4
  - Owner: Web
  - Depends on: `MNX-ANL-003`
  - Acceptance:
    - Interactive charts with filter sync and drill-down.
  - Estimate: 8
- `MNX-ANL-005`: Saved views/bookmarks.
  - Links: FR-4
  - Owner: Web + Backend
  - Depends on: `MNX-ANL-004`
  - Acceptance:
    - Users can save/load/delete named filtered views.
  - Estimate: 5

### 21.9 Assistant Stories
- `MNX-ASST-001`: Intent parser and query planner service.
  - Links: FR-5
  - Owner: ML + Backend
  - Depends on: `MNX-ANL-002`, `MNX-AIKEY-003`
  - Acceptance:
    - Top intents parse into valid structured query plans.
  - Estimate: 8
- `MNX-ASST-002`: Guardrailed execution layer (read-only, allowlist tables/views).
  - Links: FR-5
  - Owner: Backend
  - Depends on: `MNX-ASST-001`
  - Acceptance:
    - Rejected unsafe queries are logged and surfaced gracefully.
  - Estimate: 5
- `MNX-ASST-003`: Answer synthesis with evidence summary and drill-down link.
  - Links: FR-5
  - Owner: ML + Web
  - Depends on: `MNX-ASST-002`
  - Acceptance:
    - Responses include answer, numbers, and applied filters.
  - Estimate: 8
- `MNX-ASST-004`: Assistant correctness benchmark suite.
  - Links: FR-5
  - Owner: ML + QA
  - Depends on: `MNX-ASST-003`
  - Acceptance:
    - Benchmark automation reports correctness >= 90% before release.
  - Estimate: 5

### 21.10 Responsive Web Experience Stories
- `MNX-RWD-001`: Responsive shell, navigation, and touch-target optimization.
  - Links: FR-1
  - Owner: Web
  - Depends on: `MNX-AUTH-001`
  - Acceptance:
    - Navigation and layout work cleanly across desktop and mobile browser breakpoints.
  - Estimate: 8
- `MNX-RWD-002`: Responsive dashboard and filter behavior.
  - Links: FR-1, FR-4
  - Owner: Web
  - Depends on: `MNX-ANL-001`, `MNX-RWD-001`
  - Acceptance:
    - Core dashboard widgets and filters are fully usable on small screens.
  - Estimate: 8
- `MNX-RWD-003`: Responsive import/review and manual transaction workflows.
  - Links: FR-1, FR-2, FR-6
  - Owner: Web
  - Depends on: `MNX-IMP-003`, `MNX-TXN-003`, `MNX-RWD-001`
  - Acceptance:
    - Import/review and manual CRUD are fully usable on mobile browsers.
  - Estimate: 8
- `MNX-RWD-004`: Responsive assistant interaction and result drill-down.
  - Links: FR-1, FR-5
  - Owner: Web
  - Depends on: `MNX-ASST-003`, `MNX-RWD-001`
  - Acceptance:
    - Assistant flow and linked results are fully usable on mobile browsers.
  - Estimate: 5

### 21.11 QA and Operations Stories
- `MNX-QA-001`: Test fixtures for import and migration (realistic CSV and SQLite corpus).
  - Links: FR-2, FR-7
  - Owner: QA + Data
  - Depends on: `MNX-MIG-001`
  - Acceptance:
    - Fixture repo includes edge cases and expected outcomes.
  - Estimate: 5
- `MNX-QA-002`: Web E2E critical path suite.
  - Links: all FRs
  - Owner: QA + Web
  - Depends on: `MNX-TXN-003`, `MNX-IMP-003`
  - Acceptance:
    - Onboarding, import, manual CRUD, migration, analytics, assistant run in CI.
  - Estimate: 8
- `MNX-QA-003`: Responsive web E2E critical path suite (mobile browsers).
  - Links: FR-1
  - Owner: QA + Web
  - Depends on: `MNX-RWD-003`, `MNX-RWD-004`
  - Acceptance:
    - Core mobile-browser journeys run in CI with responsive viewport coverage.
  - Estimate: 8
- `MNX-SRE-001`: Observability dashboards and alerting.
  - Links: NFR reliability
  - Owner: DevOps/SRE
  - Depends on: `MNX-PLT-003`
  - Acceptance:
    - Import, analytics, and assistant service dashboards live.
  - Estimate: 5
- `MNX-SRE-002`: Performance/load test automation.
  - Links: NFR performance
  - Owner: QA + SRE
  - Depends on: `MNX-ANL-003`, `MNX-IMP-005`
  - Acceptance:
    - Automated load tests track regression thresholds.
  - Estimate: 5

## 22. Dependency and Critical Path Map
- Critical path chain 1 (data ingestion to value):
  - `MNX-DATA-001` -> `MNX-IMP-001` -> `MNX-IMP-002` -> `MNX-IMP-003` -> `MNX-IMP-004` -> `MNX-IMP-005`
- Critical path chain 2 (AI categorization):
  - `MNX-AIKEY-001` -> `MNX-AIKEY-002` -> `MNX-AIKEY-003` -> `MNX-AI-001` -> `MNX-AI-002` and `MNX-AI-003` -> `MNX-AI-005` -> `MNX-AI-006` -> `MNX-AI-007`
- Critical path chain 3 (assistant):
  - `MNX-ANL-002` + `MNX-AIKEY-003` -> `MNX-ASST-001` -> `MNX-ASST-002` -> `MNX-ASST-003` -> `MNX-ASST-004`
- Critical path chain 4 (migration readiness):
  - `MNX-MIG-001` -> `MNX-MIG-002` -> `MNX-MIG-003`
- Release blockers:
  - Any unresolved security finding severity high or critical.
  - Missing benchmark gate for categorization or assistant.
  - SLO non-compliance in beta.

## 23. Release Readiness Checklist
- Product readiness:
  - All FR acceptance criteria verified.
  - No P0 or P1 defects open.
- Engineering readiness:
  - Regression suite stable for 5 consecutive runs.
  - On-call rotation and runbooks staffed.
- Data readiness:
  - Migration dry-run success >= 99.5% valid row import rate.
  - Data quality dashboard within thresholds.
- Security readiness:
  - Threat model complete and signed.
  - External penetration test findings addressed.
- GTM readiness:
  - Beta feedback triage process active.
  - Support playbooks and known-issues docs published.
