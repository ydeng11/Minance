# SQLite-Only Runtime Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make SQLite the only runtime persistence backend, keep `store.json` only for explicit test fixture conversion flows, and update tests/docs so the repository has one consistent storage story.

**Architecture:** Non-test execution always boots and persists through `services/api/data/minance.sqlite`. Test execution defaults to isolated temporary SQLite files, while JSON fixture files remain allowed only when a test intentionally exercises JSON-to-SQLite setup or import-style conversion. Docs and helper scripts are updated to describe SQLite as the runtime source of truth.

**Tech Stack:** TypeScript, Node.js test runner, Next.js, Playwright, SQLite CLI, pnpm.

---

### Task 1: Enforce SQLite-only runtime behavior

**Files:**
- Modify: `services/api/src/config.ts`
- Modify: `services/api/src/runtime-env.ts`
- Modify: `services/api/src/store.ts`
- Modify: `services/api/src/server.ts`
- Modify: `services/api/src/observability.ts`
- Modify: `services/api/test/runtime-env.test.ts`
- Modify: `services/api/test/api-contract.test.ts`
- Modify: `apps/web/src/lib/api/types.ts`

**Step 1: Write the failing tests**

Cover:

- non-test runtime resolves SQLite as the effective backend even if `MINANCE_STORE_BACKEND=json` is present
- `/v1/system/storage` reports SQLite for normal runtime execution
- frontend API typing still matches the storage status payload after the backend semantics narrow

**Step 2: Run the focused tests to verify RED**

Run:

```bash
pnpm exec tsx --test services/api/test/runtime-env.test.ts services/api/test/api-contract.test.ts
```

Expected: failures showing that non-test mode still honors JSON backend selection or still reports the old dual-backend semantics.

**Step 3: Implement the minimal runtime change**

- Introduce an explicit effective runtime backend helper that returns SQLite outside `NODE_ENV=test`.
- Keep test-mode path overrides intact for isolated fixtures and temporary databases.
- Update `store.ts` so non-test runtime always loads and saves through SQLite-backed repository functions.
- Update storage status/logging paths so runtime reporting is consistent with SQLite-only behavior.
- Narrow frontend/API types only as far as needed to reflect the new runtime contract.

**Step 4: Run the focused tests to verify GREEN**

Run:

```bash
pnpm exec tsx --test services/api/test/runtime-env.test.ts services/api/test/api-contract.test.ts
```

Expected: all targeted tests pass.

**Step 5: Commit**

```bash
git add services/api/src/config.ts services/api/src/runtime-env.ts services/api/src/store.ts services/api/src/server.ts services/api/src/observability.ts services/api/test/runtime-env.test.ts services/api/test/api-contract.test.ts apps/web/src/lib/api/types.ts
git commit -m "refactor: make sqlite the only runtime backend"
```

### Task 2: Convert regular test and E2E flows to temporary SQLite

**Files:**
- Modify: `.env.test`
- Modify: `playwright.config.mjs`
- Modify: `e2e/global-setup.ts`
- Modify: `services/api/test/deterministic-fixture.test.ts`
- Modify: `services/api/test/store.test.ts`
- Modify: `services/api/test/auth.test.ts`
- Modify: `services/api/test/analytics.test.ts`
- Modify: `services/api/test/categories.test.ts`
- Modify: `services/api/test/imports.test.ts`
- Modify: `services/api/test/investments.test.ts`
- Modify: `services/api/test/legacy-api-loader.test.ts`
- Modify: `services/api/test/legacy-loader-cli.test.ts`
- Modify: `services/api/test/performance-50k.test.ts`
- Modify: `services/api/test/recurrings.test.ts`
- Modify: `services/api/test/transactions-normalization.test.ts`
- Modify: `services/api/test/category-strategy.test.ts`

**Step 1: Write the failing tests**

Cover:

- `.env.test` defaults regular test runtime to SQLite temp files rather than JSON
- E2E setup seeds a temporary SQLite file instead of a temporary JSON runtime store
- in-process unit suites that rely on `resetStoreForTests` still produce isolated, deterministic results with SQLite-backed persistence

**Step 2: Run the focused tests to verify RED**

Run:

```bash
pnpm exec tsx --test services/api/test/store.test.ts services/api/test/auth.test.ts services/api/test/deterministic-fixture.test.ts
pnpm exec tsx --test services/api/test/analytics.test.ts services/api/test/categories.test.ts services/api/test/imports.test.ts services/api/test/transactions-normalization.test.ts
```

Expected: failures caused by JSON-backed assumptions or test setup that still points at `store.json`.

**Step 3: Implement the minimal test-harness changes**

- Change `.env.test` to SQLite-first test defaults.
- Update Playwright API boot to pass a temp SQLite file path instead of a temp JSON store path.
- Update E2E global setup so fixture seeding writes JSON only as an intermediate input when a test intentionally requests migration/setup flow; otherwise it prepares SQLite directly.
- Adjust helper-driven unit tests only where SQLite-backed `resetStoreForTests` reveals hidden JSON assumptions.

**Step 4: Run the focused tests to verify GREEN**

Run:

```bash
pnpm exec tsx --test services/api/test/store.test.ts services/api/test/auth.test.ts services/api/test/deterministic-fixture.test.ts
pnpm exec tsx --test services/api/test/analytics.test.ts services/api/test/categories.test.ts services/api/test/imports.test.ts services/api/test/transactions-normalization.test.ts
pnpm exec tsx --test services/api/test/api-contract.test.ts
pnpm e2e:ci
```

Expected: focused unit/API suites pass and Chromium E2E passes against temporary SQLite storage.

**Step 5: Commit**

```bash
git add .env.test playwright.config.mjs e2e/global-setup.ts services/api/test
git commit -m "test: run app and e2e flows on sqlite"
```

### Task 3: Restrict JSON fixtures to conversion-oriented tests only

**Files:**
- Modify: `scripts/migrate-json-to-sqlite.ts`
- Modify: `scripts/validate-json-vs-sqlite.ts`
- Modify: `scripts/seed-deterministic-fixture.ts`
- Modify: `services/api/test/migrate-json-to-sqlite.test.ts`
- Modify: `services/api/test/legacy-loader-cli.test.ts`
- Move: `services/api/data/store.json` to `services/api/test/fixtures/store-fixture.json`
- Modify: `services/api/test/fixtures/store-fixture.json` (or replace with a smaller valid conversion fixture)

**Step 1: Write the failing tests**

Cover:

- migration/validation scripts default to test-fixture JSON locations instead of live runtime data directories
- the retained JSON fixture can be migrated into SQLite without duplicate-key failures
- legacy/import-oriented tests still have an explicit JSON input path when they need one

**Step 2: Run the focused tests to verify RED**

Run:

```bash
pnpm exec tsx --test services/api/test/migrate-json-to-sqlite.test.ts services/api/test/legacy-loader-cli.test.ts
MINANCE_STORE_BACKEND=json pnpm migrate:sqlite -- --db /tmp/minance-plan-check.sqlite
MINANCE_STORE_BACKEND=json pnpm validate:sqlite -- --db /tmp/minance-plan-check.sqlite
```

Expected: failures caused by old default paths, fixture placement, or duplicate IDs in the current JSON store fixture.

**Step 3: Implement the minimal fixture cleanup**

- Move the large JSON fixture out of `services/api/data/`.
- Either repair the duplicate transaction IDs in the moved fixture or replace it with a smaller, purpose-built conversion fixture that is easy to validate.
- Update CLI help text and fallback paths so JSON fixture usage is clearly test-oriented.
- Keep legacy/import tests explicit about when they are feeding JSON into SQLite setup.

**Step 4: Run the focused tests to verify GREEN**

Run:

```bash
pnpm exec tsx --test services/api/test/migrate-json-to-sqlite.test.ts services/api/test/legacy-loader-cli.test.ts
MINANCE_STORE_BACKEND=json pnpm migrate:sqlite -- --db /tmp/minance-plan-check.sqlite
MINANCE_STORE_BACKEND=json pnpm validate:sqlite -- --db /tmp/minance-plan-check.sqlite
```

Expected: migration tests pass and the retained fixture migrates/validates cleanly.

**Step 5: Commit**

```bash
git add scripts/migrate-json-to-sqlite.ts scripts/validate-json-vs-sqlite.ts scripts/seed-deterministic-fixture.ts services/api/test/migrate-json-to-sqlite.test.ts services/api/test/legacy-loader-cli.test.ts services/api/test/fixtures services/api/data/store.json
git commit -m "test: scope json fixtures to migration setup"
```

### Task 4: Rewrite docs and operator guidance around SQLite as the runtime source of truth

**Files:**
- Modify: `README.md`
- Modify: `docs/json-to-sqlite-migration-runbook.md`
- Modify: `docs/self-host-feature-matrix.md`
- Modify: `docs/self-host-breaking-migration-guide.md`
- Modify: `docs/self-host-operations-runbook.md`
- Modify: `scripts/selfhost-backup.sh`
- Modify: `scripts/selfhost-restore.sh`

**Step 1: Write the failing docs/contract checks**

Cover:

- repository guidance no longer claims JSON is the active runtime store
- self-host docs present SQLite as the durable runtime database
- backup/restore help text describes `store.json` as optional fixture/input data rather than a peer runtime source

**Step 2: Run the focused checks to verify RED**

Run:

```bash
rg -n "JSON persistence at|JSON store is active|current JSON store|MINANCE_STORE_BACKEND=json" README.md docs scripts
```

Expected: matches showing outdated JSON-primary wording.

**Step 3: Implement the documentation rewrite**

- Update runtime docs to describe SQLite-only application storage.
- Keep migration/import docs only where JSON is intentionally used as a fixture or one-off conversion input.
- Adjust script usage text so operators understand `minance.sqlite` is the runtime source of truth.

**Step 4: Run the focused checks to verify GREEN**

Run:

```bash
rg -n "JSON persistence at|JSON store is active|current JSON store|MINANCE_STORE_BACKEND=json" README.md docs scripts
pnpm test
pnpm e2e:ci
```

Expected: outdated runtime wording is gone, the full test suite passes, and E2E still passes.

**Step 5: Commit**

```bash
git add README.md docs/json-to-sqlite-migration-runbook.md docs/self-host-feature-matrix.md docs/self-host-breaking-migration-guide.md docs/self-host-operations-runbook.md scripts/selfhost-backup.sh scripts/selfhost-restore.sh
git commit -m "docs: describe sqlite as the runtime store"
```
