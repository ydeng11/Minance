<!-- GSD:project-start source:PROJECT.md -->
## Project

**Minance**

A personal finance tracking application for managing transactions, accounts, and categories. Built with Next.js and Prisma, designed for personal use with open source availability. Currently focused on polishing UX/quality for a release-ready experience.

**Core Value:** A polished, reliable personal finance tracker you can trust with your financial data — clean interactions, clear feedback, and intuitive layouts.

### Constraints

- **Tech stack:** Next.js + Prisma + PostgreSQL (existing, not changing)
- **Design system:** Tailwind + shadcn/ui (existing patterns to follow)
- **Timeline:** No hard deadline, polish incrementally
- **Scope:** UX/quality focus only, no new feature development
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5 - Used throughout the codebase for frontend (`apps/web/src/`) and backend (`services/api/src/`). Strict mode enabled in tsconfig.
- JavaScript - Used for configuration files (`playwright.config.mjs`, `postcss.config.mjs`)
- Python 3 - Used for AI agents (`services/agents/`) and CSV processing scripts (`scripts/process_csv.py`)
## Runtime
- Node.js 20 (production Docker) / Node.js 22 (CI)
- ESM modules throughout (`"type": "module"` in all package.json files)
- pnpm 10.17.1
- Lockfile: `pnpm-lock.yaml` (present)
- Monorepo: pnpm workspace with 3 packages
## Frameworks
- Next.js 16.1.6 - Frontend React framework with Turbopack
- React 19.2.3 - UI library with React DOM
- Node.js http module - Custom API server without Express (see `services/api/src/server.ts`)
- Playwright 1.56.1 - E2E testing with Chromium
- Node.js built-in test runner - Unit tests via `tsx --test`
- axe-core 4.11.0 - Accessibility testing
- Tailwind CSS 4 - Styling with PostCSS
- tsx 4.21.0 - TypeScript execution for scripts and tests
- ESLint 9 with eslint-config-next - Linting
## Key Dependencies
- csv-parse 5.6.0 - CSV import parsing for financial transactions
- lucide-react 0.575.0 - Icon library
- clsx 2.1.1 + tailwind-merge 3.5.0 - CSS class utilities
- concurrently 9.2.1 - Running dev servers in parallel
- @ferrucc-io/emoji-picker 0.0.48 - Emoji selection for categories
- OpenAI API - GPT models for categorization
- OpenRouter API - Multi-provider LLM routing
- Anthropic API - Claude models
- Google AI API - Gemini models
- CrewAI (Python) - Agent-based analysis
## Configuration
- Environment variables loaded from `.env.test`, `.env.selfhost.example`
- Config resolution in `services/api/src/config.ts` and `services/api/src/runtime-env.ts`
- Key configs: `MINANCE_STORE_BACKEND`, `MINANCE_SQLITE_FILE`, `AI_CREDENTIAL_SECRET`
- `apps/web/next.config.ts` - Next.js configuration with API rewrites
- `apps/web/tsconfig.json` - TypeScript configuration
- `apps/web/postcss.config.mjs` - Tailwind CSS PostCSS plugin
- `apps/web/eslint.config.ts` - ESLint with Next.js core web vitals
## Platform Requirements
- Node.js 20+ or 22
- pnpm 10.17.1
- sqlite3 CLI (for SQLite backend)
- Python 3 (optional, for AI agents)
- Docker container (`ydeng11/minance:nightly`)
- SQLite database file
- Environment secrets for AI providers
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- TypeScript files: `camelCase.ts` (e.g., `accounts.ts`, `utils.ts`)
- React components: `PascalCase.tsx` (e.g., `Sidebar.tsx`, `AppGate.tsx`)
- Test files: co-located with source, `*.test.ts` suffix (e.g., `client.test.ts` alongside `client.ts`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useApi.ts`)
- Constants files: `camelCase.ts` (e.g., `constants.ts`)
- Factory functions: `create[Name]` pattern (e.g., `createApiClient`, `createId`)
- Get/list functions: `get[Name]`, `list[Name]` (e.g., `getCategoryStrategyForUser`, `listCategories`)
- Action functions: verb-based names (e.g., `loadStore`, `saveStore`, `sendJson`, `parseJsonBody`)
- Helper/utility functions: descriptive action names (e.g., `normalizeText`, `parseDate`, `toDecimal`)
- React hooks: `use[Name]` prefix (e.g., `useApi`, `useSession`)
- React event handlers: inline or `handle[Action]` pattern
- Constants: `UPPER_SNAKE_CASE` for module-level constants (e.g., `TOKEN_STORAGE_KEY`, `RANGE_OPTIONS`)
- Local variables: `camelCase`
- State variables in React: `camelCase` with setter as `set[Name]` (e.g., `[loading, setLoading]`)
- Private/helpers: `camelCase` without special prefixes
- Data shapes: `PascalCase` interfaces (e.g., `Account`, `Transaction`, `User`, `Tokens`)
- Response types: `[Name]Response` (e.g., `TransactionsResponse`, `OverviewResponse`)
- Request types: `[Name]Request` (e.g., `TransactionsBulkUpdateRequest`)
- Context/option types: `[Name]Context`, `[Name]Options` (e.g., `ApiClientContext`, `RequestOptions`)
- Error types: `[Name]Payload` or `[Name]Error` (e.g., `ApiErrorPayload`)
## Code Style
- ESLint: `eslint-config-next/core-web-vitals` (see `apps/web/eslint.config.ts`)
- TypeScript strict mode enabled
- No explicit Prettier config detected - relies on ESLint
- 2-space indentation
- Block statements with braces on same line
- No explicit limit detected; lines typically under 120 characters
## Import Organization
- `@/*` maps to `./src/*` (defined in `apps/web/tsconfig.json`)
- Relative imports used within same directory or for test files
## Error Handling
- Custom `ApiError` class extends `Error` with `status` and `payload` properties (see `apps/web/src/lib/api/client.ts`)
- Synchronous validation: `throw new Error("descriptive message")`
- Async operations: `try/catch/finally` pattern
- Error checking: `error instanceof ApiError` for typed error handling
- API responses: `throw new ApiError(message, status, payload)` for HTTP errors
## Logging
- Silent catches for non-critical operations: `catch { /* Ignore storage parse failures */ }`
- API request logging in test helpers via call tracking arrays
- No structured logging library detected
## Comments
- TODO comments for future work: `// TODO(maybe-later): ...` (see `apps/web/src/components/layout/Sidebar.tsx`)
- JSDoc-style comments for exported utility functions
- Inline comments explaining non-obvious logic
- Not extensively used
- Type annotations preferred over comment-based documentation
## Function Design
- Options objects for multiple parameters: `function createImportJob({ userId, fileName, csvText })`
- Default values via destructuring or explicit defaults
- Optional parameters marked with `?` in types
- Functions return typed values or throw errors
- Async functions return `Promise<T>`
- API calls return response types defined in `apps/web/src/lib/api/types.ts`
## Module Design
- Named exports for utilities and components: `export function cn(...)`, `export function Sidebar()`
- Default exports for page components: `export default function TransactionsPage()`
- Factory function exports: `export function createApiClient(context)`
- Type exports: `export interface Tokens { ... }`
- `apps/web/src/lib/api/endpoints.ts` aggregates API endpoint functions
- `packages/domain/src/index.ts` exports domain module contents
## React/Next.js Patterns
- `"use client"` directive at file top for client-side components
- Used for pages, interactive components, providers
- `useApi()` hook wraps API calls with auth token management
- `useSession()` hook manages authentication state
- State hooks for local state: `useState`, `useMemo`, `useEffect`
- Page components in `apps/web/src/app/*/page.tsx`
- Shared components in `apps/web/src/components/*/*.tsx`
- Layout components: `apps/web/src/app/layout.tsx`
## Tailwind CSS Patterns
- `cn(...inputs)` utility function combines `clsx` and `tailwind-merge` (see `apps/web/src/lib/utils.ts`)
- Conditional classes: `cn("base-class", isActive && "active-class")`
## Test File Organization
- Unit tests: co-located with source files (e.g., `apps/web/src/lib/api/client.test.ts`)
- API tests: `services/api/test/*.test.ts` directory
- E2E tests: `e2e/specs/*.spec.ts`
- Unit tests: `[source-file].test.ts`
- E2E tests: `[feature].spec.ts`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Clear separation between web frontend (Next.js) and API backend (custom Node.js HTTP server)
- Domain logic isolated in shared `packages/domain` package
- Store abstraction supports both JSON file and SQLite backends
- No ORM - direct data access through repository pattern
- RESTful API with manual routing (no Express/Fastify)
## Layers
- Purpose: UI rendering, user interaction, client-side state management
- Location: `apps/web/`
- Contains: Next.js pages, React components, hooks, API client library
- Depends on: `@minance/domain` (for shared constants/account utilities), Backend API
- Used by: End users via browser
- Purpose: Business logic, data persistence, authentication, external integrations
- Location: `services/api/`
- Contains: HTTP server, route handlers, data modules, store operations
- Depends on: `@minance/domain`, SQLite/JSON storage, LLM providers
- Used by: Frontend via REST API calls
- Purpose: Shared business rules, constants, account utilities
- Location: `packages/domain/src/`
- Contains: Account type definitions, formatting utilities, domain constants
- Depends on: None (pure TypeScript)
- Used by: Both frontend and backend
## Data Flow
- Session state: React Context (`SessionProvider`) with localStorage persistence
- Component state: React useState/useReducer for local state
- Server state: API calls via `useApi` hook - no global client cache
- Store cache: Backend in-memory cache with file mtime-based invalidation
## Key Abstractions
- Purpose: Abstract data persistence layer
- Examples: `services/api/src/store.ts`, `services/api/src/sqlite-store-repository.ts`
- Pattern: Single in-memory cache with JSON/SQLite backend toggle
- Operations: `loadStore()`, `saveStore()`, `withStore()` for mutations
- Purpose: Type-safe HTTP client for frontend-backend communication
- Examples: `apps/web/src/lib/api/client.ts`, `apps/web/src/lib/api/endpoints.ts`
- Pattern: Factory function with token injection, error handling, retry logic
- Features: Automatic token refresh on 401, structured error responses
- Purpose: Abstract external financial data sources (Plaid, manual, CSV)
- Examples: `services/api/src/account-providers.ts`, `services/api/src/accounts.ts`
- Pattern: Provider catalog with capability flags, link session management
## Entry Points
- Location: `services/api/src/server.ts`
- Triggers: `pnpm dev:api` or `pnpm start:api` (via tsx)
- Responsibilities: HTTP routing, CORS/security, request handling, static file serving
- Pattern: Single file with conditional routing (if/else chains + matchPath helper)
- Location: `apps/web/src/app/layout.tsx`
- Triggers: `pnpm dev:web` or `pnpm start:web`
- Responsibilities: Root layout, provider setup, auth gate
- Pattern: App Router with nested page.tsx files per route
## Error Handling
- Backend: `apiError()` function in server.ts classifies errors by message content
- Frontend: `ApiError` class with status code and payload preservation
- Error responses: JSON with `{ error: { message, code, details } }` structure
- Special codes: `AI_SETUP_REQUIRED`, `ACCOUNT_PROVIDER_ACTION_UNSUPPORTED` with remediation hints
## Cross-Cutting Concerns
- CORS with configurable allowed origins (`security.ts`)
- Rate limiting per endpoint type (auth vs general)
- Idempotency keys for mutations via audit event replay
- Security headers applied via `applySecurityHeaders()`
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
