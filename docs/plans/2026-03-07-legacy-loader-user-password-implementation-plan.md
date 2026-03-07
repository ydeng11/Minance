# Legacy Loader User Password Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow the legacy API loader to create or update the target auth account from an explicit `--user-email` and `--user-password` pair.

**Architecture:** Extend the existing legacy loader CLI and user-resolution helper rather than changing global auth behavior. The CLI will validate argument combinations, the loader will provision or update the target user before import, and focused tests will verify that the resulting account can log in.

**Tech Stack:** Node.js, TypeScript, Node test runner, existing auth/store utilities

---

### Task 1: Add failing tests for explicit migration account credentials

**Files:**
- Modify: `services/api/test/legacy-api-loader.test.ts`
- Test: `services/api/test/legacy-api-loader.test.ts`

**Step 1: Write the failing test**

Add a test that calls the legacy loader user-resolution path with:
- `userEmail: "dev@minance.local"`
- `userPassword: "12345678"`

Assert that:
- the user is created when missing
- `login("dev@minance.local", "12345678")` succeeds

Add a second test that:
- creates `dev@minance.local` with one explicit password
- reruns the same path with a different explicit password
- verifies the new password logs in and the old password fails

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm exec tsx --test services/api/test/legacy-api-loader.test.ts`

Expected: FAIL because the loader does not yet accept explicit passwords or update existing credentials.

**Step 3: Write minimal implementation**

Do not implement yet. This task ends after the failing tests are in place.

**Step 4: Commit**

```bash
git add services/api/test/legacy-api-loader.test.ts
git commit -m "test: cover legacy loader explicit user credentials"
```

### Task 2: Add failing CLI validation test

**Files:**
- Create or modify: `services/api/test/legacy-loader-cli.test.ts`
- Modify: `scripts/load-legacy-api.ts`

**Step 1: Write the failing test**

Add a focused test around CLI argument parsing that asserts:
- `--user-password` without `--user-email` throws a clear validation error

If a new CLI test file is unnecessary, cover this through an exported parser helper in the existing script test pattern.

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm exec tsx --test services/api/test/legacy-loader-cli.test.ts`

Expected: FAIL because the parser currently accepts no password flag or validation.

**Step 3: Write minimal implementation**

Do not implement yet. This task ends after the failing test is in place.

**Step 4: Commit**

```bash
git add services/api/test/legacy-loader-cli.test.ts
git commit -m "test: validate legacy loader password args"
```

### Task 3: Implement explicit user password support

**Files:**
- Modify: `scripts/load-legacy-api.ts`
- Modify: `services/api/src/legacy-api-loader.ts`
- Modify: `services/api/test/legacy-api-loader.test.ts`
- Modify: `services/api/test/legacy-loader-cli.test.ts`

**Step 1: Update CLI parsing**

Add:
- `--user-password <password>` to help text
- parser support for `userPassword`
- validation rejecting `--user-password` without `--user-email`

**Step 2: Extend loader user resolution**

Add an explicit password parameter to the user-resolution helper and `seedFromLegacyApiToStore()`:
- create missing users with the explicit password
- update `passwordHash`, `passwordSalt`, and `updatedAt` when the target email already exists and an explicit password is supplied
- fall back to `DEV_TEST_ACCOUNT_PASSWORD` only when no explicit password is supplied
- reject passwords shorter than 8 characters

**Step 3: Run focused tests**

Run: `env NODE_ENV=test pnpm exec tsx --test services/api/test/legacy-api-loader.test.ts services/api/test/legacy-loader-cli.test.ts`

Expected: PASS

**Step 4: Commit**

```bash
git add scripts/load-legacy-api.ts services/api/src/legacy-api-loader.ts services/api/test/legacy-api-loader.test.ts services/api/test/legacy-loader-cli.test.ts
git commit -m "feat: allow explicit legacy loader account credentials"
```

### Task 4: Verify the importer still behaves correctly

**Files:**
- Modify: `services/api/test/legacy-api-loader.test.ts`

**Step 1: Run regression coverage**

Run: `env NODE_ENV=test pnpm exec tsx --test services/api/test/legacy-api-loader.test.ts services/api/test/auth.test.ts`

Expected: PASS

**Step 2: Run one end-to-end CLI smoke check**

Run: `pnpm exec tsx scripts/load-legacy-api.ts --help`

Expected: output includes `--user-password <password>`

**Step 3: Commit**

```bash
git add services/api/test/legacy-api-loader.test.ts scripts/load-legacy-api.ts
git commit -m "test: verify legacy loader credential provisioning"
```
