# Minance

**A privacy-first personal finance workspace you can run yourself.**

Minance turns local transaction data into a clear money story: review cash flow, trace insights back to ledger rows, manage accounts and card perks, import bank exports, and ask questions with your own AI provider keys.

No bank connection or AI subscription is required for the core experience.

## 🎬 Product tour

![Minance product tour showing the financial dashboard, transaction drill-down, account and credit-card benefit management, CSV import review, Explorer analytics, recurring commitments, and BYOK assistant](docs/assets/minance-demo.gif)

The tour covers the main workflow:

1. Read the dashboard and drill into the transactions behind a number.
2. Manage bank and credit-card accounts.
3. Track annual fees, renewal dates, and consumable card benefits.
4. Review a bank export before committing imported transactions.
5. Explore spending patterns, categories, and recurring commitments.
6. Open the optional bring-your-own-key assistant.

## ✨ Highlights

| Area | What Minance provides |
| --- | --- |
| **Dashboard & Explorer** | Cash-flow summaries, trends, spend composition, category and account filters, saved views, heatmaps, merchants, and anomalies. |
| **Transactions** | Search, filtering, manual entry, inline editing, bulk actions, categorization review, and drill-down from analytics. |
| **Accounts & benefits** | Bank and card account management, balance history, manual adjustments, annual fees, renewal cycles, and a benefit tracker that can reset consumable perks each cycle. |
| **Imports** | Staged CSV, OFX, and QFX ingestion with mapping suggestions, diagnostics, normalization, duplicate detection, row editing, and account reconciliation. |
| **Categories & recurrings** | Custom categories and rules plus recurring-item lifecycle controls for evaluating, pausing, resuming, archiving, and deleting commitments. |
| **Optional AI** | BYOK support for OpenAI, OpenRouter, Anthropic, and Google; configurable provider order; assisted categorization; and explainable chat responses with transaction filters. |
| **Privacy & operations** | Local SQLite storage, email/password sessions, database backup and restore, responsive UI, and a single-container Docker profile. |

## 🚀 Quick start

### Requirements

- Node.js
- [pnpm 10.17.1](https://pnpm.io/)
- `sqlite3`
- [`just`](https://just.systems/) for the recommended development commands

### Run with deterministic demo data

```bash
pnpm install
just dev
```

Open [http://localhost:3000](http://localhost:3000). The API runs on [http://localhost:3001](http://localhost:3001).

Use the development account:

```text
Email:    dev@minance.local
Password: devpassword123
```

`just dev` rebuilds `services/api/data/development-minance.sqlite` from the deterministic fixture before starting both services. To start without refreshing that fixture, run `pnpm dev`.

## 🧰 Common commands

| Command | Purpose |
| --- | --- |
| `just dev` | Prepare demo data and start the web and API services. |
| `just check` | Run repository guardrails and the full test suite. |
| `just e2e` | Run Playwright end-to-end tests. |
| `just e2e-headed` | Run Playwright with a visible browser. |
| `just e2e-a11y` | Run accessibility-focused end-to-end tests. |
| `just build-web` | Create the production web build. |
| `just docs-api` | Regenerate the import API reference. |

Direct pnpm equivalents include `pnpm test`, `pnpm check`, `pnpm e2e`, `pnpm e2e:headed`, and `pnpm build:web`.

### Seed a standalone fixture

```bash
pnpm seed:fixture -- --target services/api/test/fixtures/deterministic-financial-store.json
pnpm seed:fixture -- --dry-run
```

## 📦 Install

Minance ships as a single Docker image. The reference configuration is [`docker-compose.selfhost.yml`](docker-compose.selfhost.yml).

### 1. Prepare environment

Copy and secure the environment file:

```bash
cp .env.selfhost.example .env.selfhost
chmod 600 .env.selfhost
```

Edit `.env.selfhost` and set at minimum:

- `AI_CREDENTIAL_SECRET` — a strong random secret for encrypting AI provider keys
- `MINANCE_ALLOWED_ORIGINS` — the origin (host + port) where users will access Minance

### 2. Choose data storage

The compose file mounts a volume at `/var/lib/minance` inside the container. Two modes:

- **Docker volume (default):** Docker manages a named `minance_data` volume. No host path to manage.
- **Host bind mount:** Set `MINANCE_RUNTIME_DATA_SOURCE=./services/api/data` in `.env.selfhost` to store SQLite data directly in the repository directory. Useful for backup scripts and manual inspection.

### 3. Pull and start

```bash
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost pull
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d
```

The combined app (API + web) listens on port `3000` by default. Override with `MINANCE_WEB_PORT` in `.env.selfhost`.

### 4. Open and register

Visit [http://localhost:3000](http://localhost:3000) (or your chosen origin) and create your first account.

### Production data

Data is stored as `production-minance.sqlite`. Storage status and metrics are available to authenticated users at `/v1/system/storage` and `/v1/system/metrics` through the web origin.

### Backup, upgrades, and hardening

For production operation, follow the [self-host operations runbook](docs/self-host-operations-runbook.md) and [security checklist](docs/self-host-security-hardening-checklist.md).

## 🔐 Data and AI

- **Local by default:** development, test, and production use separate environment-prefixed SQLite files.
- **Portable:** create, download, upload, and restore database backups from Settings or the self-host scripts.
- **AI is optional:** imports, transactions, categories, accounts, recurrings, and analytics remain usable without a model provider.
- **Keys stay under your control:** configured provider credentials are encrypted with `AI_CREDENTIAL_SECRET`.
- **No mandatory bank linking:** manual accounts and file imports are the supported self-host path.

## 🧱 Project structure

```text
minance/
├── apps/web/          # Next.js frontend
├── services/api/      # Node.js API and SQLite runtime
├── services/agents/   # Optional CrewAI analysis agent
├── packages/domain/   # Shared domain logic
├── scripts/           # Build, seed, migration, and operations tools
├── deploy/docker/     # Container definitions
└── docs/              # Runbooks, API reference, audits, and design plans
```

## 🧭 Current boundaries

- Direct bank aggregation is not bundled; use manual accounts or CSV, OFX, and QFX imports.
- AI features require a user-supplied provider key and degrade gracefully when no provider is configured.
- The dedicated Investments page is deferred and currently redirects to the dashboard.
- Full exchange-rate-aware multi-currency reporting is planned; native transaction currencies are retained today.

## 📄 License

Minance is available under the [MIT License](LICENSE).
