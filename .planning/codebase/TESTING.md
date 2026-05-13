# Testing Patterns

**Analysis Date:** 2026-03-31

## Test Framework

**Runner:**
- Unit tests: Node.js built-in test runner (`node:test`)
- Assertion library: `node:assert/strict`
- E2E tests: Playwright (`@playwright/test`)

**Run Commands:**
```bash
# Unit tests (root)
pnpm test                              # Run test-first checks + unit tests

# Unit tests (web app)
pnpm --filter @minance/web test        # Run web app unit tests
tsx --test "src/**/*.test.ts"          # Direct tsx runner

# Unit tests (API)
env NODE_ENV=test tsx --test services/api/test/**/*.test.ts

# E2E tests
pnpm e2e                               # Run all E2E tests
pnpm e2e:headed                        # Run E2E tests with UI
pnpm e2e:ci                            # Run E2E tests for CI
pnpm e2e:a11y                          # Run accessibility tests only
```

## Test File Organization

**Location:**
- Frontend unit tests: co-located with source (e.g., `apps/web/src/lib/api/client.test.ts`)
- API unit tests: centralized in `services/api/test/*.test.ts`
- E2E tests: `e2e/specs/*.spec.ts`
- E2E helpers: `e2e/specs/helpers.ts`
- E2E fixtures: `e2e/fixtures/`
- E2E global setup: `e2e/global-setup.ts`

**Naming:**
- Unit tests: `*.test.ts` suffix
- E2E tests: `*.spec.ts` suffix
- Test file mirrors source file name: `client.test.ts` tests `client.ts`

**Structure:**
```
apps/web/src/
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── client.test.ts        # Co-located unit test
│   │   ├── endpoints.ts
│   │   ├── endpoints.test.ts
│   │   └── types.ts
│   ├── import/
│   │   ├── reducer.ts
│   │   └── reducer.test.ts
│   └── session.tsx
│   └── session.test.ts

services/api/
├── src/
│   ├── categories.ts
│   ├── imports.ts
├── test/
│   ├── categories.test.ts        # Centralized unit tests
│   ├── imports.test.ts
│   ├── llm/
│   │   ├── client.test.ts
│   │   └── agent.test.ts
│   ├── migrations/
│   │   ├── recurring-scan-init.test.ts

e2e/
├── global-setup.ts
├── fixtures/
│   ├── transactions.csv
│   ├── positive-expense-inference.csv
├── specs/
│   ├── helpers.ts
│   ├── import-and-transactions.spec.ts
│   ├── transactions-bulk-delete.spec.ts
```

## Test Structure

**Unit Test Pattern:**
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { functionUnderTest } from "./sourceFile";
import { resetStoreForTests } from "../src/store.ts";

const EMPTY_STORE = {
  users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  accounts: [],
  transactions: [],
  categories: []
};

test("description of expected behavior", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));
  
  const result = functionUnderTest("input");
  
  assert.equal(result.property, "expected value");
  assert.ok(result.id.startsWith("prefix_"));
  assert.equal(result.createdAt, "expected date");
});

test("function throws error for invalid input", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));
  
  assert.throws(
    () => functionUnderTest({ invalid: "data" }),
    /expected error message/
  );
});

test("async function handles success case", async () => {
  const result = await asyncFunctionUnderTest({ valid: "data" });
  assert.equal(result.status, "completed");
});

test("async function rejects on failure", async () => {
  await assert.rejects(
    () => asyncFunctionUnderTest({ invalid: "data" }),
    { message: "expected error" }
  );
});
```

**API Test Pattern with Mock Store:**
```typescript
// services/api/test/categories.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { resetStoreForTests } from "../src/store.ts";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../src/categories.ts";

const EMPTY_STORE = {
  users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  sessions: [],
  accounts: [],
  transactions: [],
  categories: [],
  categoryStrategies: [],
  categoryRules: []
};

test("listCategories returns empty array when no categories exist", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));
  ensureCategoryStrategyForUser("user_1");

  const categories = listCategories("user_1");
  assert.equal(categories.length, 0);
});

test("createCategory creates a new category with valid data", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));
  ensureCategoryStrategyForUser("user_1");

  const category = createCategory("user_1", {
    name: "Test Category",
    emoji: "test",
    coarseKey: "essential",
    type: "expense"
  });

  assert.equal(category.name, "Test Category");
  assert.ok(category.id.startsWith("cat_"));
  assert.ok(category.createdAt);
});
```

## Mocking

**Framework:** Manual mocking via `globalThis.fetch` replacement

**Patterns:**
```typescript
// apps/web/src/lib/api/client.test.ts
test("api client refreshes token on 401 and retries request", async () => {
  const calls: string[] = [];

  let currentTokens: Tokens | null = {
    accessToken: "access-1",
    accessExpiresAt: "2026-01-01T00:00:00.000Z",
    refreshToken: "refresh-1"
  };

  const client = createApiClient({
    getTokens: () => currentTokens,
    setTokens: (next) => { currentTokens = next; },
    onAuthFailure: () => { currentTokens = null; }
  });

  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method || "GET"} ${url}`);

    if (url.endsWith("/v1/data")) {
      const auth = init?.headers instanceof Headers ? init.headers.get("Authorization") : null;
      if (auth === "Bearer access-1") {
        return new Response(JSON.stringify({ error: { message: "Unauthorized" } }), { status: 401 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (url.endsWith("/v1/auth/refresh")) {
      return new Response(JSON.stringify({ accessToken: "access-2" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: { message: "Unknown route" } }), { status: 404 });
  }) as typeof fetch;

  try {
    const result = await client.request<{ ok: boolean }>("/v1/data");
    assert.equal(result.ok, true);
    assert.deepEqual(calls, ["GET /v1/data", "POST /v1/auth/refresh", "GET /v1/data"]);
  } finally {
    globalThis.fetch = originalFetch;  // Always restore
  }
});
```

**What to Mock:**
- `globalThis.fetch` for API client tests
- Store state via `resetStoreForTests(EMPTY_STORE)` for API tests
- Date/time functions when testing time-dependent logic

**What NOT to Mock:**
- Internal utility functions (test them directly)
- Database operations in API tests (use test store instead)
- React hooks (test their behavior, not implementation)

## Fixtures and Factories

**Test Data:**
```typescript
// services/api/test/categories.test.ts
const EMPTY_STORE = {
  users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  sessions: [],
  accounts: [],
  transactions: [],
  categories: [],
  categoryStrategies: [],
  categoryRules: [],
  imports: [],
  importRowsRaw: [],
  importRowsProcessed: [],
  importRowDiagnostics: [],
  aiProviderCredentials: [],
  aiProviderPreferences: [],
  assistantQueries: [],
  savedViews: [],
  migrationRuns: [],
  auditEvents: []
};

// Clone before each test to ensure isolation
resetStoreForTests(structuredClone(EMPTY_STORE));
```

**CSV Fixture Files:**
- `e2e/fixtures/transactions.csv` - Standard transaction data
- `e2e/fixtures/positive-expense-inference.csv` - Positive expense amounts

**Location:**
- API fixtures: defined inline in test files as `EMPTY_STORE`
- E2E fixtures: `e2e/fixtures/*.csv`

## Coverage

**Requirements:** None explicitly enforced in configuration

**Coverage Check:**
```bash
# Not currently configured - tests run without coverage reporting
pnpm test
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, modules, utilities
- Approach: Direct import and invocation with assertions
- Location: `apps/web/src/**/*.test.ts`, `services/api/test/**/*.test.ts`

**Integration Tests:**
- Scope: API endpoints, store operations, data flows
- Approach: Reset store state, invoke multiple functions, verify combined behavior
- Location: `services/api/test/*.test.ts`

**E2E Tests:**
- Scope: Full user flows, UI interactions, cross-component behavior
- Approach: Playwright browser automation with `data-testid` selectors
- Location: `e2e/specs/*.spec.ts`

## E2E Test Patterns

**Test Structure:**
```typescript
// e2e/specs/import-and-transactions.spec.ts
import { test, expect } from "@playwright/test";
import { createManualTransaction, loginWithSeedAccount, searchTransactions, uploadAndCommitFixtureCsv } from "./helpers.ts";

test("@core upload CSV then create/edit/delete a manual transaction", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);

  await searchTransactions(page, "Coffee Shop");
  await expect(page.locator('[data-testid="txn-table"] tr', { hasText: "Coffee Shop" }).first()).toBeVisible();

  const manualMerchant = `PW Manual ${Date.now()}`;
  await createManualTransaction(page, {
    merchant: manualMerchant,
    memo: "Created by E2E",
    tags: "coffee, monthly"
  });

  const firstLedgerRow = page.locator('[data-testid="txn-table"] tbody > tr').first();
  await expect(firstLedgerRow).toContainText(manualMerchant);
});
```

**Helper Functions:**
```typescript
// e2e/specs/helpers.ts
export const SEED_ACCOUNT = {
  email: "dev@minance.local",
  password: "devpassword123"
};

export async function loginWithSeedAccount(page) {
  await page.goto("/");
  await page.getByTestId("auth-email").fill(SEED_ACCOUNT.email);
  await page.getByTestId("auth-password").fill(SEED_ACCOUNT.password);
  await page.getByTestId("auth-submit").click();
  
  const appShell = page.getByTestId("app-shell");
  await expect(appShell).toBeVisible();
}

export async function gotoView(page, viewName) {
  if (viewName === "transactions") {
    await page.getByTestId("nav-transactions").click();
    await expect(page.getByTestId("transactions-page")).toBeVisible();
  }
}
```

**Selector Pattern:**
- Use `data-testid` attributes for stable selectors
- Example: `page.getByTestId("txn-table")`, `page.getByTestId("auth-submit")`
- Avoid CSS class selectors for test stability

## Common Patterns

**Async Testing:**
```typescript
test("async function returns expected result", async () => {
  const result = await asyncFunction({ input: "data" });
  assert.equal(result.status, "success");
});

test("async function rejects with error", async () => {
  await assert.rejects(
    () => asyncFunction({ invalid: "input" }),
    /Expected error message/
  );
});
```

**Error Testing:**
```typescript
test("function throws for invalid input", () => {
  assert.throws(
    () => createCategory("user_1", { name: "", coarseKey: "essential" }),
    /Category name is required/
  );
});

test("function throws for duplicate name", () => {
  createCategory("user_1", { name: "Duplicate Test" });
  
  assert.throws(
    () => createCategory("user_1", { name: "Duplicate Test" }),
    /already exists/
  );
});
```

**E2E Poll Pattern:**
```typescript
// Use expect.poll for retry assertions
await expect.poll(async () => await manualRow.count()).toBe(1);

// Wait for response before proceeding
await page.waitForResponse(response => 
  response.url().includes("/v1/transactions") && 
  response.request().method() === "GET"
);
```

**Test Isolation:**
```typescript
// Reset store before each test
test("independent test case", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));  // Fresh state
  // ... test code
});

// Restore globals after mocking
const originalFetch = globalThis.fetch;
globalThis.fetch = mockFetch;
try {
  // ... test code
} finally {
  globalThis.fetch = originalFetch;  // Always restore
}
```

## Playwright Configuration

**Config File:** `playwright.config.mjs`

**Key Settings:**
- Test directory: `e2e/specs`
- Workers: 1 (sequential execution)
- Timeout: 60 seconds per test
- Retries: 2 in CI, 0 locally
- Browser: Chromium
- Base URL: `http://localhost:4173`
- Trace/Screenshot/Video: `retain-on-failure`
- Global setup: `e2e/global-setup.ts`
- Web servers: API (port 4174) and web (port 4173)

---

*Testing analysis: 2026-03-31*