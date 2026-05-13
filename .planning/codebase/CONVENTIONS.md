# Coding Conventions

**Analysis Date:** 2026-03-31

## Naming Patterns

**Files:**
- TypeScript files: `camelCase.ts` (e.g., `accounts.ts`, `utils.ts`)
- React components: `PascalCase.tsx` (e.g., `Sidebar.tsx`, `AppGate.tsx`)
- Test files: co-located with source, `*.test.ts` suffix (e.g., `client.test.ts` alongside `client.ts`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useApi.ts`)
- Constants files: `camelCase.ts` (e.g., `constants.ts`)

**Functions:**
- Factory functions: `create[Name]` pattern (e.g., `createApiClient`, `createId`)
- Get/list functions: `get[Name]`, `list[Name]` (e.g., `getCategoryStrategyForUser`, `listCategories`)
- Action functions: verb-based names (e.g., `loadStore`, `saveStore`, `sendJson`, `parseJsonBody`)
- Helper/utility functions: descriptive action names (e.g., `normalizeText`, `parseDate`, `toDecimal`)
- React hooks: `use[Name]` prefix (e.g., `useApi`, `useSession`)
- React event handlers: inline or `handle[Action]` pattern

**Variables:**
- Constants: `UPPER_SNAKE_CASE` for module-level constants (e.g., `TOKEN_STORAGE_KEY`, `RANGE_OPTIONS`)
- Local variables: `camelCase`
- State variables in React: `camelCase` with setter as `set[Name]` (e.g., `[loading, setLoading]`)
- Private/helpers: `camelCase` without special prefixes

**Types/Interfaces:**
- Data shapes: `PascalCase` interfaces (e.g., `Account`, `Transaction`, `User`, `Tokens`)
- Response types: `[Name]Response` (e.g., `TransactionsResponse`, `OverviewResponse`)
- Request types: `[Name]Request` (e.g., `TransactionsBulkUpdateRequest`)
- Context/option types: `[Name]Context`, `[Name]Options` (e.g., `ApiClientContext`, `RequestOptions`)
- Error types: `[Name]Payload` or `[Name]Error` (e.g., `ApiErrorPayload`)

## Code Style

**Formatting:**
- ESLint: `eslint-config-next/core-web-vitals` (see `apps/web/eslint.config.ts`)
- TypeScript strict mode enabled
- No explicit Prettier config detected - relies on ESLint

**Indentation/Braces:**
- 2-space indentation
- Block statements with braces on same line

**Line Length:**
- No explicit limit detected; lines typically under 120 characters

## Import Organization

**Order:**
1. Node.js built-in modules with `node:` prefix (e.g., `import test from "node:test"`)
2. External package imports (e.g., `import { clsx } from "clsx"`)
3. Internal imports using `@/` path alias
4. Type imports using `import type { ... }`

**Path Aliases:**
- `@/*` maps to `./src/*` (defined in `apps/web/tsconfig.json`)
- Relative imports used within same directory or for test files

**Example:**
```typescript
// apps/web/src/lib/api/client.ts
import type { Tokens, ApiErrorPayload } from "@/lib/api/types";

// apps/web/src/app/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, CreditCard } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { RANGE_OPTIONS } from "@/lib/constants";
import { cn, money } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { OverviewResponse } from "@/lib/api/types";
```

## Error Handling

**Patterns:**
- Custom `ApiError` class extends `Error` with `status` and `payload` properties (see `apps/web/src/lib/api/client.ts`)
- Synchronous validation: `throw new Error("descriptive message")`
- Async operations: `try/catch/finally` pattern
- Error checking: `error instanceof ApiError` for typed error handling
- API responses: `throw new ApiError(message, status, payload)` for HTTP errors

**Example:**
```typescript
// apps/web/src/lib/api/client.ts
export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload | null;

  constructor(message: string, status: number, payload: ApiErrorPayload | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

// apps/web/src/app/page.tsx
try {
  const overviewData = await api.analytics.overview({ range: nextRange });
  setOverview(overviewData);
} catch (error) {
  if (error instanceof ApiError) {
    setMessage(error.message);
  } else {
    setMessage("Failed to load dashboard data.");
  }
} finally {
  setLoading(false);
}
```

**Validation Errors:**
```typescript
// services/api/src/categories.ts
function normalizeCategoryName(value) {
  const name = String(value || "").trim();
  if (name.length < 2) {
    throw new Error("Category name is required");
  }
  return name;
}
```

## Logging

**Framework:** Console-based logging

**Patterns:**
- Silent catches for non-critical operations: `catch { /* Ignore storage parse failures */ }`
- API request logging in test helpers via call tracking arrays
- No structured logging library detected

## Comments

**When to Comment:**
- TODO comments for future work: `// TODO(maybe-later): ...` (see `apps/web/src/components/layout/Sidebar.tsx`)
- JSDoc-style comments for exported utility functions
- Inline comments explaining non-obvious logic

**JSDoc/TSDoc:**
- Not extensively used
- Type annotations preferred over comment-based documentation

## Function Design

**Size:** Functions typically 10-50 lines; large functions (>100 lines) exist in page components

**Parameters:**
- Options objects for multiple parameters: `function createImportJob({ userId, fileName, csvText })`
- Default values via destructuring or explicit defaults
- Optional parameters marked with `?` in types

**Return Values:**
- Functions return typed values or throw errors
- Async functions return `Promise<T>`
- API calls return response types defined in `apps/web/src/lib/api/types.ts`

**Example:**
```typescript
// services/api/src/utils.ts
export function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

export function parseJsonBody(req, maxBytes = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => { resolve(JSON.parse(raw)); });
    req.on("error", (error) => { reject(error); });
  });
}
```

## Module Design

**Exports:**
- Named exports for utilities and components: `export function cn(...)`, `export function Sidebar()`
- Default exports for page components: `export default function TransactionsPage()`
- Factory function exports: `export function createApiClient(context)`
- Type exports: `export interface Tokens { ... }`

**Barrel Files:**
- `apps/web/src/lib/api/endpoints.ts` aggregates API endpoint functions
- `packages/domain/src/index.ts` exports domain module contents

**Example:**
```typescript
// apps/web/src/lib/api/endpoints.ts
import type { ... } from "./types";

export const categoriesApi = {
  list: (request) => request("/v1/categories"),
  getStrategy: (request) => request("/v1/categories/strategy"),
  add: (request, payload) => request("/v1/categories", { method: "POST", body: payload }),
  update: (request, id, payload) => request(`/v1/categories/${id}`, { method: "PUT", body: payload }),
  remove: (request, id) => request(`/v1/categories/${id}`, { method: "DELETE" })
};
```

## React/Next.js Patterns

**Client Components:**
- `"use client"` directive at file top for client-side components
- Used for pages, interactive components, providers

**Data Fetching:**
- `useApi()` hook wraps API calls with auth token management
- `useSession()` hook manages authentication state
- State hooks for local state: `useState`, `useMemo`, `useEffect`

**Component Structure:**
- Page components in `apps/web/src/app/*/page.tsx`
- Shared components in `apps/web/src/components/*/*.tsx`
- Layout components: `apps/web/src/app/layout.tsx`

**Example:**
```typescript
// apps/web/src/hooks/useApi.ts
"use client";

import { useMemo } from "react";
import { useSession } from "@/lib/session";
import { accountsApi, categoriesApi, transactionsApi } from "@/lib/api/endpoints";

export function useApi() {
  const { request } = useSession();
  return useMemo(() => ({
    categories: {
      list: () => categoriesApi.list(request),
      add: categoriesApi.add.bind(null, request)
    },
    transactions: {
      list: transactionsApi.list.bind(null, request),
      create: transactionsApi.create.bind(null, request)
    }
  }), [request]);
}
```

## Tailwind CSS Patterns

**Class Composition:**
- `cn(...inputs)` utility function combines `clsx` and `tailwind-merge` (see `apps/web/src/lib/utils.ts`)
- Conditional classes: `cn("base-class", isActive && "active-class")`

**Example:**
```typescript
// apps/web/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Test File Organization

**Location:**
- Unit tests: co-located with source files (e.g., `apps/web/src/lib/api/client.test.ts`)
- API tests: `services/api/test/*.test.ts` directory
- E2E tests: `e2e/specs/*.spec.ts`

**Naming:**
- Unit tests: `[source-file].test.ts`
- E2E tests: `[feature].spec.ts`

---

*Convention analysis: 2026-03-31*