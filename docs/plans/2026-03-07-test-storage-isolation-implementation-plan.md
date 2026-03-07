# Test Storage Isolation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make test runs use isolated storage paths while local development keeps using `.env.local` storage settings.

**Architecture:** Extract runtime env/path resolution into a small helper module, switch config to load `.env.test` in test mode, and update test entry points to set `NODE_ENV=test` and pass test-specific storage env vars.

**Tech Stack:** TypeScript, Node test runner (`pnpm exec tsx --test`), Playwright, pnpm scripts.

---

### Task 1: Lock runtime path resolution with failing tests

**Files:**
- Create: `services/api/test/runtime-env.test.ts`
- Create: `services/api/src/runtime-env.ts`

**Step 1: Write the failing test**

Cover three cases:

- test mode ignores `MINANCE_DATA_FILE` and `MINANCE_SQLITE_FILE`
- test mode honors `MINANCE_DATA_FILE_TEST` and `MINANCE_SQLITE_FILE_TEST`
- non-test mode uses `.env.local` plus the non-test env vars

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec tsx --test services/api/test/runtime-env.test.ts
```

**Step 3: Write minimal implementation**

Implement a helper that:

- maps `NODE_ENV=test` to `.env.test`
- resolves test storage to `*_TEST` vars or safe test defaults
- resolves non-test storage to the existing env vars and defaults

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec tsx --test services/api/test/runtime-env.test.ts
```

**Step 5: Commit**

```bash
git add services/api/src/runtime-env.ts services/api/test/runtime-env.test.ts
git commit -m "test: lock runtime storage isolation rules"
```

### Task 2: Wire runtime config to the new helper

**Files:**
- Modify: `services/api/src/config.ts`
- Modify: `.env.local`
- Create: `.env.test`
- Modify: `README.md`

**Step 1: Extend the failing test**

Add assertions for:

- `.env.test` being the active env file name in test mode
- `.env.local` being the active env file name outside test mode

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec tsx --test services/api/test/runtime-env.test.ts
```

**Step 3: Write minimal implementation**

Update `config.ts` to:

- load `.env.test` only in test mode
- load `.env.local` otherwise
- compute `DATA_FILE`, `SQLITE_FILE`, and `SQLITE_SCHEMA_FILE` from the helper

Add `.env.test` with safe test defaults and update docs/comments.

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec tsx --test services/api/test/runtime-env.test.ts
```

**Step 5: Commit**

```bash
git add services/api/src/config.ts .env.local .env.test README.md services/api/test/runtime-env.test.ts
git commit -m "feat: isolate test env storage paths"
```

### Task 3: Update test entry points to use test mode explicitly

**Files:**
- Modify: `package.json`
- Modify: `playwright.config.mjs`
- Modify: `services/api/test/api-contract.test.ts`

**Step 1: Write the failing verification**

Use the runtime-env test plus direct command inspection:

- `pnpm exec tsx --test services/api/test/runtime-env.test.ts`
- `pnpm exec tsx --test services/api/test/api-contract.test.ts`

Update the Playwright API server env wiring to use test-specific env names.

**Step 2: Run verification to confirm current mismatch**

Run:

```bash
pnpm exec tsx --test services/api/test/runtime-env.test.ts
pnpm exec tsx --test services/api/test/api-contract.test.ts
```

**Step 3: Write minimal implementation**

Set `NODE_ENV=test` in test scripts and move explicit test storage env in API contract/E2E wiring to `*_TEST`.

**Step 4: Run verification to confirm green**

Run:

```bash
pnpm exec tsx --test services/api/test/runtime-env.test.ts services/api/test/api-contract.test.ts
```

**Step 5: Commit**

```bash
git add package.json playwright.config.mjs services/api/test/api-contract.test.ts
git commit -m "chore: run tests with isolated storage env"
```

### Task 4: Final verification

**Files:**
- No new files

**Step 1: Run targeted tests**

```bash
pnpm exec tsx --test services/api/test/runtime-env.test.ts services/api/test/api-contract.test.ts services/api/test/migrate-json-to-sqlite.test.ts
```

**Step 2: Run direct config checks**

Verify:

- `pnpm dev:api` uses non-test paths
- `pnpm test` uses test paths

**Step 3: Report remaining risks**

Call out any direct ad hoc commands that still require explicitly setting `NODE_ENV=test` if they bypass package scripts.
