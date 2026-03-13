# Remove Counterparty Emoji Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Delete the obsolete `counterparty_emoji` transaction field from the web app, API contract, normalization logic, and regression suite.

**Architecture:** Remove the field from the shared transaction form model and ledger rendering first, then delete the API-side normalization and manual transaction plumbing that still reads or returns it. Keep the cleanup narrow by updating only the current TypeScript frontend, Playwright coverage, and `services/api` code paths that still reference the field.

**Tech Stack:** TypeScript, Next.js app router, React 19, Tailwind CSS, Node API server, Node test runner (`tsx --test`), Playwright, pnpm.

---

### Task 1: Remove the field from frontend form state and types

**Files:**
- Modify: `apps/web/src/app/transactions/form.ts`
- Modify: `apps/web/src/app/transactions/form.test.ts`
- Modify: `apps/web/src/lib/api/types.ts`

**Step 1: Write the failing test**

Update `apps/web/src/app/transactions/form.test.ts` so it no longer expects `counterparty_emoji` in draft defaults, edit mapping, or normalized payloads.

**Step 2: Run test to verify it fails**

Run from `apps/web`:

```bash
env NODE_ENV=test ./node_modules/.bin/tsx --test src/app/transactions/form.test.ts
```

Expected: failures because the draft and payload still include `counterparty_emoji`.

**Step 3: Write minimal implementation**

- remove `counterparty_emoji` from `TransactionFormDraft`
- remove `counterparty_emoji` from `TransactionFormPayload`
- stop reading/writing the field in `createInitialTransactionDraft`, `buildDraftFromTransaction`, and `validateTransactionDraft`
- delete `counterparty_emoji` from the frontend `Transaction` type

**Step 4: Run test to verify it passes**

Run from `apps/web`:

```bash
env NODE_ENV=test ./node_modules/.bin/tsx --test src/app/transactions/form.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/form.ts apps/web/src/app/transactions/form.test.ts apps/web/src/lib/api/types.ts
git commit -m "refactor: remove counterparty emoji form state"
```

### Task 2: Remove the obsolete UI controls and ledger display

**Files:**
- Modify: `apps/web/src/app/transactions/TransactionEditorFields.tsx`
- Modify: `apps/web/src/app/transactions/page.tsx`
- Modify: `e2e/specs/helpers.ts`
- Modify: `e2e/specs/import-and-transactions.spec.ts`
- Modify: `e2e/specs/transactions-ledger-header-controls.spec.ts`

**Step 1: Write the failing tests**

Update the Playwright helpers/specs so they no longer set `counterpartyEmoji` and no longer expect emoji text in ledger rows.

**Step 2: Run tests to verify they fail**

Run from the repo root:

```bash
env NODE_ENV=test pnpm exec playwright test e2e/specs/import-and-transactions.spec.ts e2e/specs/transactions-ledger-header-controls.spec.ts --project=chromium
```

Expected: failures because the helper still tries to interact with the removed control or the UI still renders emoji text in the Details cell.

**Step 3: Write minimal implementation**

- remove the `Person emoji` select and its option list
- remove the Details-cell emoji badge from the transactions table
- delete the Playwright helper branch that selects `txn-create-counterparty-emoji`
- keep the rest of the manual transaction create flow unchanged

**Step 4: Run tests to verify they pass**

Run from the repo root:

```bash
env NODE_ENV=test pnpm exec playwright test e2e/specs/import-and-transactions.spec.ts e2e/specs/transactions-ledger-header-controls.spec.ts --project=chromium
```

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/TransactionEditorFields.tsx apps/web/src/app/transactions/page.tsx e2e/specs/helpers.ts e2e/specs/import-and-transactions.spec.ts e2e/specs/transactions-ledger-header-controls.spec.ts
git commit -m "refactor: remove counterparty emoji transaction ui"
```

### Task 3: Delete API-side normalization and contract plumbing

**Files:**
- Modify: `services/api/src/transactions.ts`
- Modify: `services/api/test/transactions-normalization.test.ts`
- Modify: `apps/web/src/app/transactions/ledger.test.ts`

**Step 1: Write the failing tests**

Update `services/api/test/transactions-normalization.test.ts` so manual transaction create/list coverage asserts that `counterparty_emoji` is absent from normalized records and API responses.

**Step 2: Run tests to verify they fail**

Run from the repo root:

```bash
env NODE_ENV=test ./apps/web/node_modules/.bin/tsx --test services/api/test/transactions-normalization.test.ts apps/web/src/app/transactions/ledger.test.ts
```

Expected: failures because the API still normalizes and returns `counterparty_emoji`.

**Step 3: Write minimal implementation**

- remove `COUNTERPARTY_EMOJI_MAX_LENGTH`
- delete `normalizeCounterpartyEmoji`
- remove `counterparty_emoji` from `normalizeTransactionRecord`
- remove the field from `resolveManualContractFields`
- stop writing it during create/update
- update any residual ledger fixtures/types that still mention the field

**Step 4: Run tests to verify they pass**

Run from the repo root:

```bash
env NODE_ENV=test ./apps/web/node_modules/.bin/tsx --test services/api/test/transactions-normalization.test.ts apps/web/src/app/transactions/ledger.test.ts
```

**Step 5: Commit**

```bash
git add services/api/src/transactions.ts services/api/test/transactions-normalization.test.ts apps/web/src/app/transactions/ledger.test.ts
git commit -m "refactor: remove counterparty emoji api contract"
```

### Task 4: Run focused verification for the removal

**Files:**
- No code changes expected

**Step 1: Run the focused unit suite**

Run:

```bash
env NODE_ENV=test ./apps/web/node_modules/.bin/tsx --test services/api/test/transactions-normalization.test.ts
cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/app/transactions/form.test.ts src/app/transactions/ledger.test.ts
```

Expected: all targeted unit tests pass with zero failures.

**Step 2: Run the focused browser regression**

Run:

```bash
env NODE_ENV=test pnpm exec playwright test e2e/specs/import-and-transactions.spec.ts e2e/specs/transactions-ledger-header-controls.spec.ts --project=chromium
```

Expected: manual transaction creation and ledger display still pass without any counterparty emoji behavior.

**Step 3: Commit**

```bash
git status --short
```

Confirm only the intended removal changes remain before any final integration step.
