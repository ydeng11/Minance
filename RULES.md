# Repo Folder Guide

This repo contains the current pnpm workspace for Minance Next.

## Frontend library choices

- For table and data-grid work in `apps/web`, use `@tanstack/react-table`.
- Keep frontend implementation in `.tsx` with Tailwind classes only.

## Main folders

- `.github/`: CI workflows.
- `apps/`: current application entrypoints.
- `apps/web/`: current Next.js frontend.
- `config/`: repo-level configuration.
- `config/guardrails/`: inputs used by validation scripts.
- `deploy/`: deployment assets.
- `deploy/docker/`: Dockerfiles for the current web and API services.
- `docs/`: runbooks, parity notes, and architecture docs.
- `docs/plans/`: dated design and implementation plans.
- `e2e/`: Playwright end-to-end tests.
- `e2e/fixtures/`: fixture inputs for e2e flows.
- `e2e/specs/`: end-to-end scenarios.
- `openspec/`: spec-driven change tracking.
- `openspec/changes/`: proposals, designs, tasks, and spec updates.
- `packages/`: shared workspace packages.
- `packages/domain/`: shared domain constants and primitives.
- `scripts/`: seed, migration, validation, backup, and restore scripts.
- `services/`: backend services and integrations.
- `services/api/`: current TypeScript API.
- `services/agents/`: optional Python AI agent integration.

## Important subtrees

- `apps/web/src/app/`: route-level pages and feature screens.
- `apps/web/src/components/`: shared UI components.
- `apps/web/src/lib/`: frontend utilities, API client code, import/chat helpers.
- `services/api/src/`: API modules for auth, imports, transactions, analytics, AI, storage, and migrations.
- `services/api/src/llm/`: prompt and model-integration logic.
- `services/api/sql/`: SQLite schema/bootstrap SQL.
- `services/api/data/`: local JSON/SQLite data files and backups.
- `services/api/test/`: backend tests and fixtures.

## Usually not hand-edited

- `node_modules/`, `output/`, `playwright-report/`, `apps/web/.next/`: dependency, build, or test-output folders.
- `.playwright-cli/`: local Playwright debugging artifacts.
