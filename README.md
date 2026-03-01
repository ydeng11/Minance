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
- Legacy Minance SQLite migration endpoint and reconciliation report
- Responsive web UI covering dashboard, imports, transactions, analytics, assistant, settings, and migration
- Saved views/bookmarks

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Development services:
- Frontend (Next.js): `http://localhost:3000`
- API server: `http://localhost:3001`

## Test

```bash
npm test
```

`npm test` now includes a frontend test-first guard:
- If files under `apps/web/src/**/*.tsx` change, at least one frontend/e2e test file must change in the same changeset.
- Accepted test paths: `apps/web/src/**/*.test.ts(x)` and `e2e/specs/**/*.spec.*`.

## E2E (Playwright)

```bash
npm run e2e
```

Useful variants:
- `npm run e2e:headed` for local debugging.
- `npm run e2e:ci` for CI-style execution and HTML report output.

## Notes
- Data persists in `services/api/data/store.json`.
- E2E runs use isolated storage via `MINANCE_DATA_FILE=services/api/tmp/e2e-store.json`.
- API now reads `.env.local` automatically for local development settings.
- Dev/test account is auto-seeded when `NODE_ENV` is not `production`:
  - Email: `dev@minance.local` (override with `DEV_TEST_ACCOUNT_EMAIL`)
  - Password: `devpassword123` (override with `DEV_TEST_ACCOUNT_PASSWORD`)
  - Disable seeding with `MINANCE_SEED_TEST_ACCOUNT=false`
- If `.env.local` contains `OPENROUTER_API_KEY`, the dev account is auto-seeded with an OpenRouter credential and default provider preference.
- Set `IMPORT_PROCESSING_LOGS_ENABLED=true` in `.env.local` to print import-processing logs (including whether LLM categorization was attempted/succeeded/failed).
- AI key encryption uses `AI_CREDENTIAL_SECRET` (set in environment for non-local use).
- Categorization training can load backup priors from `backup_2026-02-26_00-00-03.db` (or `MINANCE_TRAINING_DB_PATH`).
- CrewAI analysis agent script lives at `services/agents/crewai_analysis_agent.py` (enable/disable with `AI_CREW_ANALYSIS_ENABLED`; install Python deps from `services/agents/requirements.txt`).
- SQLite migration requires `sqlite3` CLI installed on the host machine.
