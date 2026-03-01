# Product Requirements Document (PRD): Minance Next

## Document Control
- Version: v0.3 (Draft)
- Date: February 25, 2026
- Owner: Product Management
- Status: Proposed

## 1. Product Summary
Minance Next is a privacy-first personal finance app that helps users aggregate and understand spending **without connecting bank accounts**. Users upload transaction files (CSV and CSV-like exports), and AI normalizes, deduplicates, and categorizes data to power advanced analytics and a conversational finance assistant.

AI features are **BYOK (Bring Your Own Key)**: users provide their own API key(s) and can choose from multiple supported AI providers.

This product is a successor to `../minance` and preserves its core value (manual import, no bank credential sharing) while adding:
- Copilot Money-inspired user experience.
- Responsive web access across desktop and mobile browsers.
- AI-first ingestion for arbitrary CSV formats.
- Advanced analytics and visual storytelling.
- Natural-language Q&A on personal transaction history.

## 2. Problem Statement
Current finance tools frequently require account linking, create privacy concerns, and fail on non-standard exports. Existing Minance supports several bank templates but is not designed for arbitrary CSVs, mobile-first use, or conversational AI insights.

Users need a secure way to consolidate spending from any source, quickly clean and categorize data, and ask plain-language questions about where money goes.

## 3. Goals and Non-Goals

### Goals
- Enable users to aggregate spending data with **zero account connections**.
- Support upload and processing of diverse CSV formats with high success rate.
- Deliver premium analytics UX inspired by Copilot Money patterns.
- Provide a mobile-friendly web experience across desktop and mobile browsers.
- Provide trustworthy AI categorization and question answering.
- Support multiple AI providers using user-managed API keys.
- Offer straightforward migration from existing `../minance` data.

### Non-Goals (MVP)
- Real-time direct account synchronization (Plaid, MX, Yodlee, etc.).
- Bill pay, transfers, or banking operations.
- Tax filing workflows.
- Shared family budgeting with multi-user editing (single-user only in MVP).

## 4. Target Users
- Privacy-conscious individuals who avoid connecting financial accounts.
- Users with multiple cards/accounts who can export statement/activity files.
- Existing Minance users who want AI-enhanced analytics with mobile-friendly web access.

## 5. Product Principles
- Privacy first: no bank credentials required.
- AI assists, user controls: every AI decision is editable and reversible.
- Fast onboarding: value within first 10 minutes.
- Explainability: AI categorization and insights show confidence and rationale.
- Cross-device consistency: same core workflows on desktop and mobile browsers.

## 6. Scope

### In Scope (MVP + V1)
- User authentication and personal workspace.
- CSV upload (single and batch), schema inference, normalization.
- AI categorization with confidence labels and correction flow.
- Manual single transaction create/edit/delete.
- Dashboard, trends, categories, merchants, cash-flow analytics.
- AI assistant for question answering and insight generation.
- AI provider settings with user-managed API keys (BYOK) and multi-provider support.
- Data migration wizard from `../minance`.

### Out of Scope (MVP + V1)
- Direct account connection/sync.
- Investment portfolio tracking.
- Household shared accounts and role-based collaboration.

## 7. Experience Direction (Copilot Money-Inspired)
The interface should feel premium, calm, and insight-first:
- Card-based dashboard with concise monthly narratives.
- Visual hierarchy focused on net spend, recurring spend, and category shifts.
- Smooth transitions and deep drill-downs by time, merchant, category, and source.
- High information density without clutter.

Note: "Inspired by" means similar product quality and interaction patterns, not copying proprietary branding/assets.

## 8. User Journeys

### Journey A: New User Onboarding and First Insight
1. User signs up on web (desktop or mobile browser).
2. User uploads one or more CSV files from any source.
3. AI auto-detects columns, normalizes records, and predicts categories.
4. User reviews low-confidence transactions.
5. Dashboard appears with first insights and trends.

### Journey B: Ongoing Monthly Use
1. User uploads latest CSV exports.
2. System auto-merges with historical data and flags duplicates.
3. AI updates spending insights and anomalies.
4. User asks assistant questions ("How much did I spend on dining this quarter?").

### Journey C: Legacy Minance Migration
1. User selects "Migrate from Minance".
2. User imports old SQLite DB file or uses local migration tool from old instance.
3. System validates and previews accounts, transactions, and category mappings.
4. User confirms import; idempotent migration runs; reconciliation report shown.

## 9. Functional Requirements

### FR-1: Web Access with Mobile-Friendly Experience
- Responsive web app with full feature parity for core flows on desktop and mobile browsers.
- Shared design system and consistent navigation model across breakpoints.
- Native mobile apps are out of scope.

Acceptance criteria:
- A user can complete onboarding, import, manual add, and ask AI from desktop and mobile browsers.
- Mobile usability score >= 90 for key workflows (internal QA rubric).

### FR-2: CSV Ingestion for Arbitrary Formats
- Accept `.csv` uploads from common banks/wallets and custom exports.
- Detect delimiter, header row, date/amount sign conventions, and encoding.
- AI-assisted column mapping to canonical schema:
  - date
  - merchant/description
  - amount
  - currency
  - account/source
  - category (optional raw field)
  - memo (optional)
- Pre-import preview with mapping edits.
- Duplicate detection on normalized fingerprint.

Acceptance criteria:
- >= 95% of uploads parse successfully for supported encodings and common formats.
- Median import-to-ready time <= 30 seconds for 5,000 rows.
- User can edit mappings before final commit.

### FR-3: AI Categorization and Data Processing
- Categorize each transaction into a user-facing taxonomy.
- Confidence score per prediction.
- Low-confidence review queue.
- User corrections retrain personalized rules (rules layer + model prompts).
- Merchant normalization (e.g., "SQ *COFFEE123" -> "Coffee Shop").
- Requires a valid user-configured AI provider API key.

Acceptance criteria:
- Initial top-1 categorization accuracy >= 85% on benchmark set.
- Accuracy improves over time for active users through corrections.
- Every AI-assigned category is manually overridable.
- If no valid AI key is configured, the user is prompted to set up a provider before AI categorization runs.

### FR-4: Advanced Visualization and Analytics
- Dashboard KPIs: total spend, net flow, recurring spend, top categories, top merchants.
- Time-series trends: weekly/monthly/quarterly.
- Category/merchant deep dives with filtering and comparisons.
- Advanced visuals:
  - category decomposition
  - spending heatmap by day/week
  - merchant concentration analysis
  - anomaly detection panel
- Saved views/bookmarks for frequent analyses.

Acceptance criteria:
- All charts are interactive and filter-aware.
- Any filter action updates visualizations in <= 1.5 seconds for standard datasets (<= 100k records/user).

### FR-5: Conversational AI Assistant
- Natural-language Q&A over user transaction data.
- Examples:
  - "How much did I spend on groceries in January?"
  - "What changed the most compared to last month?"
  - "Show unusual merchants in the past 60 days."
- AI responses include:
  - concise answer
  - supporting numbers
  - linked drill-down query/view
  - confidence/uncertainty indication when relevant
- Requires a valid user-configured AI provider API key.

Acceptance criteria:
- >= 90% of tested queries return numerically correct answers.
- Responses include traceable basis (query/filter summary).
- If no valid AI key is configured, assistant requests are blocked with a clear setup flow.

### FR-6: Manual Single Transaction Record
- User can add one transaction manually (required fields + optional metadata).
- Edit/delete supported.
- Manual records are tagged as `manual` source.

Acceptance criteria:
- Create/edit/delete transaction works across desktop and mobile browsers.
- Manual records are included in analytics and AI Q&A.

### FR-7: Migration from `../minance`
Legacy Minance currently stores data in SQLite with key tables:
- `banks`
- `accounts`
- `transactions`
- `minance_category`
- `raw_category_to_minance_category`

Migration requirements:
- Support import from old SQLite DB (`data.db`) and/or exported CSV bundle.
- Preserve account metadata, transactions, and category mappings.
- Keep historical timestamps (`upload_time`) when available.
- Produce migration report:
  - records scanned
  - records imported
  - duplicates skipped
  - unmapped/invalid rows
- Idempotent behavior: safe re-run without duplicate creation.

Acceptance criteria:
- >= 99.5% valid legacy rows migrated in test datasets.
- Duplicate-safe re-import verified.
- User receives reconciliation summary post-import.

### FR-8: AI Provider Configuration (BYOK + Multi-Provider)
- Users can add and manage their own API key(s) for supported AI providers.
- Support at least 3 providers at launch (for example: OpenAI, Anthropic, Google).
- Users can select a default provider/model and optional per-feature provider (import mapping, categorization, assistant).
- System validates API keys at setup time and on demand.
- Users can rotate, disable, or delete keys at any time.
- System can fail over to another configured provider if the preferred provider is unavailable (if user enables failover).

Acceptance criteria:
- A user can successfully configure at least one provider key and run AI features.
- A user with multiple configured providers can switch default provider without redeploy or admin help.
- API keys are never exposed in plaintext after initial save and are masked in UI.
- Provider outages do not break the app; AI features surface graceful errors or configured fallback behavior.

## 10. Data Requirements

### Canonical Transaction Schema (V1)
- `transaction_id` (UUID)
- `user_id`
- `account_id` (nullable)
- `source_type` (`imported`, `manual`, `migrated`)
- `source_file_id` (nullable)
- `transaction_date`
- `post_date` (nullable)
- `merchant_raw`
- `merchant_normalized`
- `description`
- `amount`
- `currency`
- `direction` (`debit`, `credit`)
- `category_raw` (nullable)
- `category_final`
- `category_confidence` (0-1)
- `memo` (nullable)
- `dedupe_fingerprint`
- `created_at`, `updated_at`

### Supporting Entities
- User category taxonomy.
- Category mapping/rules history.
- Import jobs and parse diagnostics.
- Assistant query logs (privacy-preserving).
- AI provider credentials (encrypted) and provider preference settings.

## 11. Non-Functional Requirements

### Performance
- First meaningful dashboard load <= 2.5s on broadband for median user.
- Import pipeline handles 100k rows/user without timeout.

### Reliability
- 99.9% API uptime target (post-beta).
- Import jobs retryable with deterministic states.

### Security and Privacy
- Encryption in transit and at rest.
- No storage of bank credentials (by design).
- Tenant isolation by user/account.
- Data deletion/export self-service.
- User-provided AI API keys encrypted at rest, masked in UI, and excluded from logs/telemetry.

### Accessibility
- WCAG 2.1 AA baseline.
- Keyboard navigation and screen reader compatibility for key workflows.

### Auditability
- Track AI decisions, user overrides, and migration events for debugging/trust.

## 12. Technical Approach (High Level)
- Frontend:
  - Responsive web app (desktop + mobile browser) with component library and shared tokens.
- Backend:
  - Ingestion service (file parsing, schema inference, normalization).
  - Categorization service (rules + model inference + feedback loop).
  - Analytics query service.
  - Assistant orchestration service (NL -> structured query -> answer).
  - AI provider abstraction layer for multi-provider routing using user-managed keys.
- Data:
  - Relational transactional store.
  - Analytics-friendly aggregates/materialized views for speed.
  - Object storage for uploaded source files (optional retention policy).

## 13. Release Plan

### Phase 0: Discovery and Design (2-4 weeks)
- Validate IA and interaction patterns.
- Finalize taxonomy and analytics definitions.
- Build data contract for canonical schema.

### Phase 1: MVP Foundation (6-8 weeks)
- Auth, workspace setup.
- CSV upload + manual mapping UI.
- Core dashboard and manual transaction CRUD.
- AI provider/key settings (BYOK) baseline.
- Basic migration from Minance.

### Phase 2: AI Ingestion and Categorization (4-6 weeks)
- AI schema inference.
- AI categorization with confidence and review queue.
- Personalized correction learning.
- Multi-provider routing and provider-specific reliability handling.

### Phase 3: Advanced Analytics + Assistant (4-6 weeks)
- Advanced charts and anomaly insights.
- Conversational AI with explainable outputs.
- Mobile-browser optimization for key flows.

### Phase 4: Hardening and GA (2-4 weeks)
- Performance tuning at large datasets.
- Security, accessibility, and reliability hardening.
- Rollout controls and monitoring.

## 14. Success Metrics

### Adoption
- Activation rate: % of new users who upload at least one file within Day 1.
- Time to first insight: median minutes from signup to first dashboard insight.

### Quality
- Import success rate.
- Categorization accuracy.
- AI answer correctness on benchmark questions.

### Engagement
- Monthly active users.
- Upload recurrence (users importing monthly).
- Assistant query usage per active user.

### Trust and Retention
- Low complaint rate on incorrect categories.
- 30-day retention.

## 15. Risks and Mitigations
- Risk: Highly irregular CSV formats reduce parse reliability.
  - Mitigation: explicit mapping UI fallback + reusable mapping templates.
- Risk: AI misclassification reduces user trust.
  - Mitigation: confidence labels, easy bulk correction, rapid learning loop.
- Risk: Cross-platform parity increases complexity.
  - Mitigation: shared product surface prioritization and staged parity.
- Risk: Legacy migration inconsistencies.
  - Mitigation: dry-run preview, reconciliation report, idempotent imports.

## 16. Open Questions
- Should AI processing be fully cloud-based, or offer local/on-device processing mode for high-privacy users?
- What default category taxonomy should be shipped for best first-run accuracy?
- Should users be able to import non-CSV formats directly (XLSX, OFX) in V1?
- Which providers are in the initial launch set beyond the minimum 3-provider requirement?

## 17. Appendix: Legacy Minance Baseline
Observed in `../minance`:
- Backend supports transaction upload/create/update/delete and account/category management.
- CSV import is template-based for known institutions, with fallback to Minance template.
- Data store uses SQLite with schema centered on banks/accounts/transactions/category mapping.
- Web UI includes overview, visualization, categories, and accounts screens but is desktop-first.

Minance Next should preserve the proven flows above, then extend with AI-first ingestion, conversational analytics, and a high-quality responsive web UX.
