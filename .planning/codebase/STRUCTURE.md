# Codebase Structure

**Analysis Date:** 2026-03-31

## Directory Layout

```
minance2/
├── apps/                   # Application packages
│   └── web/                # Next.js frontend application
├── packages/               # Shared packages
│   └── domain/             # Domain logic (account types, constants)
├── services/               # Backend services
│   └── api/                # REST API server
├── config/                 # Configuration files
│   └── guardrails/         # Project guardrails rules
├── docs/                   # Documentation
├── e2e/                    # End-to-end Playwright tests
├── scripts/                # Utility scripts
├── deploy/                 # Deployment configurations
│   └── docker/             # Docker files for self-hosting
├── output/                 # Generated output files
├── .planning/              # Planning documents
├── package.json            # Root package.json (workspace scripts)
├── pnpm-workspace.yaml     # Workspace definition
├── justfile                # Task runner commands
├── playwright.config.mjs   # E2E test configuration
└── README.md               # Project documentation
```

## Directory Purposes

**`apps/web/`:**
- Purpose: Next.js frontend application
- Contains: Pages, components, hooks, styles, configuration
- Key files: `src/app/layout.tsx` (root), `src/app/page.tsx` (dashboard)

**`services/api/`:**
- Purpose: Backend REST API server
- Contains: Route handlers, business logic, data modules, tests
- Key files: `src/server.ts` (entry), `src/store.ts` (data layer)

**`packages/domain/`:**
- Purpose: Shared domain logic
- Contains: Account utilities, constants, type definitions
- Key files: `src/accounts.ts`, `src/constants.ts`

**`e2e/`:**
- Purpose: End-to-end test specifications
- Contains: Playwright test files, fixtures, helpers
- Key files: `specs/*.spec.ts`, `fixtures/`

**`scripts/`:**
- Purpose: Utility scripts for operations
- Contains: Migration scripts, seeding, validation, guardrails runner
- Key files: `migrate-json-to-sqlite.ts`, `seed-deterministic-fixture.ts`

**`docs/`:**
- Purpose: Project documentation
- Contains: Design docs, runbooks, parity inventories, API docs
- Key files: `api/` directory for generated API documentation

## Key File Locations

**Entry Points:**
- `services/api/src/server.ts`: Backend HTTP server entry
- `apps/web/src/app/layout.tsx`: Next.js root layout
- `apps/web/src/app/page.tsx`: Dashboard page

**Configuration:**
- `pnpm-workspace.yaml`: Monorepo workspace definition
- `apps/web/next.config.ts`: Next.js configuration
- `services/api/src/config.ts`: Backend configuration (ports, paths, security)
- `apps/web/tsconfig.json`: Frontend TypeScript config
- `justfile`: Task runner commands (just CLI)

**Core Logic:**
- `services/api/src/store.ts`: Data persistence abstraction
- `services/api/src/transactions.ts`: Transaction CRUD operations
- `services/api/src/accounts.ts`: Account management
- `services/api/src/imports.ts`: Import job handling
- `services/api/src/analytics.ts`: Analytics aggregation

**Frontend Architecture:**
- `apps/web/src/hooks/useApi.ts`: API client hook
- `apps/web/src/lib/api/client.ts`: HTTP client implementation
- `apps/web/src/lib/api/endpoints.ts`: API endpoint definitions
- `apps/web/src/lib/session.tsx`: Session context/provider
- `apps/web/src/components/layout/Shell.tsx`: App shell layout

**Testing:**
- `services/api/test/*.test.ts`: Backend unit/integration tests
- `apps/web/src/**/*.test.ts`: Frontend unit tests (co-located)
- `e2e/specs/*.spec.ts`: End-to-end tests

## Naming Conventions

**Files:**
- React components: PascalCase with `.tsx` extension (e.g., `Shell.tsx`, `Sidebar.tsx`)
- TypeScript modules: camelCase with `.ts` extension (e.g., `transactions.ts`, `analytics.ts`)
- Tests: Same name as source with `.test.ts` suffix (e.g., `transactions.test.ts`)
- E2E specs: kebab-case with `.spec.ts` (e.g., `import-and-transactions.spec.ts`)

**Directories:**
- Feature directories: lowercase plural (e.g., `transactions/`, `accounts/`)
- Component directories: lowercase (e.g., `layout/`, `filters/`)
- App routes: lowercase, hyphenated (e.g., `app/import/`, `app/explorer/`)

**Exports:**
- Components: Named exports matching filename (e.g., `export function Shell`)
- Utilities: Named exports for functions (e.g., `export function cn`, `export function money`)
- Types: Named type exports (e.g., `export interface Transaction`)

## Where to Add New Code

**New Feature:**
- Primary frontend code: `apps/web/src/app/{feature}/page.tsx`
- Supporting components: `apps/web/src/components/{feature}/`
- API endpoints: `services/api/src/{feature}.ts`
- Backend tests: `services/api/test/{feature}.test.ts`

**New Component/Module:**
- UI component: `apps/web/src/components/{category}/{ComponentName}.tsx`
- Backend module: `services/api/src/{moduleName}.ts`
- Domain constant/utility: `packages/domain/src/{name}.ts`

**Utilities:**
- Frontend helpers: `apps/web/src/lib/utils.ts` (add to existing)
- Backend helpers: `services/api/src/utils.ts` (add to existing)
- Shared domain utilities: `packages/domain/src/` (new file, export from index.ts)

**New API Endpoint:**
1. Add handler in `services/api/src/server.ts` (if/else routing block)
2. Create business logic in `services/api/src/{module}.ts`
3. Add frontend endpoint in `apps/web/src/lib/api/endpoints.ts`
4. Add type definitions in `apps/web/src/lib/api/types.ts`
5. Expose via `useApi` hook in `apps/web/src/hooks/useApi.ts`

## Special Directories

**`services/api/data/`:**
- Purpose: JSON/SQLite data storage (development)
- Generated: No (user data)
- Committed: No (in .gitignore)

**`services/api/tmp/`:**
- Purpose: Temporary files during processing
- Generated: Yes
- Committed: No

**`apps/web/.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No

**`output/playwright/`:**
- Purpose: Playwright test artifacts (reports, traces)
- Generated: Yes
- Committed: No

**`config/guardrails/`:**
- Purpose: Custom project guardrails rules
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-31*