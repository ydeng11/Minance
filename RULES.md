# Repo Folder Guide

This repo contains a current pnpm workspace app stack and an older legacy stack kept for migration/reference.

## Frontend library choices

- For table and data-grid work in the current app (`apps/web`), use `@tanstack/react-table`.
- Keep table presentation in `.tsx` with Tailwind classes; do not introduce new AG Grid usage in `apps/web`.
- Treat `src/main/webui/` AG Grid implementations as legacy/reference code unless a task explicitly targets that legacy frontend.

## Main folders

- `.github/`: CI/CD workflows.
- `.mvn/`: Maven wrapper files for the legacy Java build.
- `apps/`: current application entrypoints.
- `apps/web/`: current Next.js frontend.
- `config/`: repo-level configuration.
- `config/guardrails/`: guardrail inputs used by validation scripts.
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
- `packages/domain/`: shared domain constants/primitives.
- `scripts/`: seed, migration, validation, backup, restore, and release scripts.
- `services/`: backend services and integrations.
- `services/api/`: current TypeScript API.
- `services/agents/`: optional Python AI agent integration.
- `src/`: legacy Quarkus application and old frontend.

## Important subtrees

- `apps/web/src/app/`: route-level pages and feature screens.
- `apps/web/src/components/`: shared UI components.
- `apps/web/src/lib/`: frontend utilities, API client code, import/chat helpers.
- `services/api/src/`: API modules for auth, imports, transactions, analytics, AI, storage, and migrations.
- `services/api/src/llm/`: prompt and model-integration logic.
- `services/api/sql/`: SQLite schema/bootstrap SQL.
- `services/api/data/`: local JSON/SQLite data files and backups.
- `services/api/test/`: backend tests and fixtures.

## Legacy tree

- `src/main/java/`: legacy Java backend.
- `src/main/resources/`: legacy config and Flyway migrations.
- `src/main/webui/`: old Vite/React frontend bundled with the Quarkus app.
- `src/test/`: legacy Java and UI tests.

## Usually not hand-edited

- `node_modules/`, `target/`, `output/`, `playwright-report/`, `apps/web/.next/`: dependency, build, or test-output folders.
- `.playwright-cli/`: local Playwright debugging artifacts.
