# Architecture

**Analysis Date:** 2026-03-31

## Pattern Overview

**Overall:** Pnpm Monorepo with Separated Frontend/Backend

**Key Characteristics:**
- Clear separation between web frontend (Next.js) and API backend (custom Node.js HTTP server)
- Domain logic isolated in shared `packages/domain` package
- Store abstraction supports both JSON file and SQLite backends
- No ORM - direct data access through repository pattern
- RESTful API with manual routing (no Express/Fastify)

## Layers

**Frontend (Presentation Layer):**
- Purpose: UI rendering, user interaction, client-side state management
- Location: `apps/web/`
- Contains: Next.js pages, React components, hooks, API client library
- Depends on: `@minance/domain` (for shared constants/account utilities), Backend API
- Used by: End users via browser

**Backend (API Layer):**
- Purpose: Business logic, data persistence, authentication, external integrations
- Location: `services/api/`
- Contains: HTTP server, route handlers, data modules, store operations
- Depends on: `@minance/domain`, SQLite/JSON storage, LLM providers
- Used by: Frontend via REST API calls

**Domain (Shared Layer):**
- Purpose: Shared business rules, constants, account utilities
- Location: `packages/domain/src/`
- Contains: Account type definitions, formatting utilities, domain constants
- Depends on: None (pure TypeScript)
- Used by: Both frontend and backend

## Data Flow

**Transaction Import Flow:**

1. User uploads CSV file via `apps/web/src/app/import/page.tsx`
2. Frontend calls `POST /v1/imports` with file content
3. Backend creates import job in `services/api/src/imports.ts`
4. Backend processes rows, detects direction (debit/credit), suggests accounts/categories
5. Frontend displays processed rows for review
6. User confirms mappings, frontend calls `POST /v1/imports/:id/commit`
7. Backend creates transactions in store

**Analytics Query Flow:**

1. Dashboard page requests overview data via `api.analytics.overview()`
2. Frontend hook `useApi.ts` delegates to `analyticsApi.overview()` in endpoints.ts
3. API client sends authenticated request to `/v1/analytics/overview`
4. Backend `analytics.ts` aggregates transactions from store
5. Response includes summary metrics, category rollups, merchant data

**State Management:**
- Session state: React Context (`SessionProvider`) with localStorage persistence
- Component state: React useState/useReducer for local state
- Server state: API calls via `useApi` hook - no global client cache
- Store cache: Backend in-memory cache with file mtime-based invalidation

## Key Abstractions

**Store (Repository Pattern):**
- Purpose: Abstract data persistence layer
- Examples: `services/api/src/store.ts`, `services/api/src/sqlite-store-repository.ts`
- Pattern: Single in-memory cache with JSON/SQLite backend toggle
- Operations: `loadStore()`, `saveStore()`, `withStore()` for mutations

**API Client:**
- Purpose: Type-safe HTTP client for frontend-backend communication
- Examples: `apps/web/src/lib/api/client.ts`, `apps/web/src/lib/api/endpoints.ts`
- Pattern: Factory function with token injection, error handling, retry logic
- Features: Automatic token refresh on 401, structured error responses

**Account Providers:**
- Purpose: Abstract external financial data sources (Plaid, manual, CSV)
- Examples: `services/api/src/account-providers.ts`, `services/api/src/accounts.ts`
- Pattern: Provider catalog with capability flags, link session management

## Entry Points

**Backend Server:**
- Location: `services/api/src/server.ts`
- Triggers: `pnpm dev:api` or `pnpm start:api` (via tsx)
- Responsibilities: HTTP routing, CORS/security, request handling, static file serving
- Pattern: Single file with conditional routing (if/else chains + matchPath helper)

**Next.js App:**
- Location: `apps/web/src/app/layout.tsx`
- Triggers: `pnpm dev:web` or `pnpm start:web`
- Responsibilities: Root layout, provider setup, auth gate
- Pattern: App Router with nested page.tsx files per route

## Error Handling

**Strategy:** Centralized API error handler with status-based classification

**Patterns:**
- Backend: `apiError()` function in server.ts classifies errors by message content
- Frontend: `ApiError` class with status code and payload preservation
- Error responses: JSON with `{ error: { message, code, details } }` structure
- Special codes: `AI_SETUP_REQUIRED`, `ACCOUNT_PROVIDER_ACTION_UNSUPPORTED` with remediation hints

## Cross-Cutting Concerns

**Logging:** Structured logging via `observability.ts` - `logStructuredEvent()` with request IDs

**Validation:** Inline validation in route handlers - no dedicated validation layer

**Authentication:** JWT-style tokens stored in localStorage, validated per request via `requireAuth()`

**Security:**
- CORS with configurable allowed origins (`security.ts`)
- Rate limiting per endpoint type (auth vs general)
- Idempotency keys for mutations via audit event replay
- Security headers applied via `applySecurityHeaders()`

---

*Architecture analysis: 2026-03-31*