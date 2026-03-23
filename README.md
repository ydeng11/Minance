# Minance Next

Minance Next is a privacy-first personal finance web app built from the PRD/implementation plan in this repository.

## What is implemented
- Auth (`signup`, `login`, `refresh`, `/me`, user delete)
- CSV import flow with mapping suggestions, diagnostics, normalization, and dedupe
- Manual transaction CRUD
- AI BYOK settings with 4 providers (OpenAI, OpenRouter, Anthropic, Google), encrypted key storage, preferences, and failover order
- Multi-stage categorization (rules -> merchant memory -> model fallback) with confidence thresholds
- Dashboard + analytics APIs (overview, categories, merchants, heatmap, anomalies)
- Conversational assistant endpoint with explainable output and drill-down filters
- Legacy Minance API loader script for dev database seeding
- Responsive web UI covering dashboard, imports, transactions, analytics, assistant, and settings
- Saved views/bookmarks

## Under consideration
- Banking provider support for direct bank connections (beyond manual CSV).
- Expanded investments feature coverage.

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Development services:
- Frontend (Next.js): `http://localhost:3000`
- API server: `http://localhost:3001`

## Test

```bash
pnpm test
```

`pnpm test` now includes a frontend test-first guard:
- If files under `apps/web/src/**/*.tsx` change, at least one frontend/e2e test file must change in the same changeset.
- Accepted test paths: `apps/web/src/**/*.test.ts(x)` and `e2e/specs/**/*.spec.*`.

## E2E (Playwright)

```bash
pnpm e2e
```

Useful variants:
- `pnpm e2e:headed` for local debugging.
- `pnpm e2e:ci` for CI-style execution and HTML report output.
- Seed deterministic financial fixture for parity flows:
  - `E2E_SEED_DATASET=deterministic-financial pnpm e2e`

## Deterministic fixture seed

Create a repeatable baseline dataset (accounts/categories/transactions/recurring/investments):

```bash
pnpm seed:fixture -- --target services/api/test/fixtures/deterministic-financial-store.json
```

Dry-run summary:

```bash
pnpm seed:fixture -- --dry-run
```

## Legacy API seed (dev)

Load accounts + transactions from legacy Minance API into the current dev database (mapped category as tier-2, inferred tier-1 group):

```bash
pnpm seed:legacy-api -- --base-url http://10.0.0.20:18080 --start 2024-01-01 --end 2026-12-31
```

Fixture source of truth:
- `services/api/test/fixtures/deterministic-financial-fixture.js`
- `services/api/test/fixtures/deterministic-financial-store.json`

## Self-host profile

Reference deployment and operations profile:
- `docker-compose.selfhost.yml`
- `.env.selfhost.example`
- `docs/self-host-operations-runbook.md`
- `docs/self-host-breaking-migration-guide.md`
- `docs/self-host-security-hardening-checklist.md`
- `docs/transaction-category-operator-runbook.md`
- `scripts/selfhost-backup.sh`
- `scripts/selfhost-restore.sh`

`.env.selfhost.example` is for the Docker self-host stack. Local `pnpm dev` uses `.env.local`. Test runs use `.env.test`.

Quick start for reusing the current runtime data directory and SQLite file:

```bash
cp .env.selfhost.example .env.selfhost
chmod 600 .env.selfhost
```

Set these values in `.env.selfhost` before launching:
- `AI_CREDENTIAL_SECRET=<strong-random-secret>`
- `MINANCE_RUNTIME_DATA_SOURCE=./services/api/data`

Then pull and start the stock nightly image:

```bash
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost pull
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d
```

## Notes
- Runtime data uses SQLite at `services/api/data/minance.sqlite`.
- SQLite foundation bootstrap is active at startup:
  - runtime uses SQLite in non-test execution
  - `MINANCE_SQLITE_FILE` selects the SQLite file path (default `services/api/data/minance.sqlite`)
  - `MINANCE_SQLITE_SCHEMA_FILE` selects the schema file (default `services/api/sql/schema.sql`)
  - `MINANCE_SQLITE_AUTO_INIT=false` disables startup schema initialization
- The stock `docker-compose.selfhost.yml` stack already sets the combined app container's internal SQLite paths. Only add `MINANCE_SQLITE_FILE` or `MINANCE_SQLITE_SCHEMA_FILE` to `.env.selfhost` if you customize that compose file or run Minance outside the stock stack.
- The stock self-host stack runs the published Docker image `ydeng11/minance:nightly`.
- `MINANCE_RUNTIME_DATA_SOURCE` controls how `/var/lib/minance` is mounted in the app container:
  - unset: Docker-managed named volume `minance_data`
  - `./services/api/data`: bind-mount the repo runtime data directory and reuse the existing `services/api/data/minance.sqlite`
- The backup and restore scripts already target `services/api/data` by default, so no script changes are required when using `MINANCE_RUNTIME_DATA_SOURCE=./services/api/data`.
- Authenticated storage status can be inspected via `GET /v1/system/storage`.
- Authenticated metrics snapshot can be inspected via `GET /v1/system/metrics`.
- The stock self-host compose stack publishes only `MINANCE_WEB_PORT`. Docker container health uses the internal API readiness probe, while `/v1/system/storage` and `/v1/system/metrics` remain reachable through the published web origin.
- E2E runs use isolated storage via `MINANCE_SQLITE_FILE_TEST=services/api/tmp/e2e-minance.sqlite`.
- API reads `.env.local` for non-test local development and `.env.test` for `NODE_ENV=test`.
- Test-mode storage uses isolated SQLite files under `services/api/tmp/` unless a suite overrides `MINANCE_SQLITE_FILE_TEST`.
- JSON fixtures are retained only for explicit migration/import setup tests, with the committed fixture at `services/api/test/fixtures/deterministic-financial-store.json`.
- Dev/test account is auto-seeded when `NODE_ENV` is not `production`:
  - Email: `dev@minance.local` (override with `DEV_TEST_ACCOUNT_EMAIL`)
  - Password: `devpassword123` (override with `DEV_TEST_ACCOUNT_PASSWORD`)
  - Disable seeding with `MINANCE_SEED_TEST_ACCOUNT=false`
- If `.env.local` contains `OPENROUTER_API_KEY`, the dev account is auto-seeded with an OpenRouter credential and default provider preference.
- Set `IMPORT_PROCESSING_LOGS_ENABLED=true` in `.env.local` to print import-processing logs (including whether LLM categorization was attempted/succeeded/failed).
- AI key encryption uses `AI_CREDENTIAL_SECRET` (set in environment for non-local use).
- Account provider abstraction is exposed via `GET /v1/accounts/providers` and `GET /v1/accounts/providers/:providerId` (self-host default provider is `manual_csv`; direct-link actions return explicit unsupported-action errors).
- Categorization training can load backup priors from `backup_2026-02-26_00-00-03.db` (or `MINANCE_TRAINING_DB_PATH`).
- CrewAI analysis agent script lives at `services/agents/crewai_analysis_agent.py` (enable/disable with `AI_CREW_ANALYSIS_ENABLED`; install Python deps from `services/agents/requirements.txt`).
- SQLite migration requires `sqlite3` CLI installed on the host machine.
