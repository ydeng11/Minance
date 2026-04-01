# Single-Account Import Review Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign import review so users choose one import account once, review row exceptions in the staged editor, and only see reconciliation when the import actually needs escalation.

**Architecture:** Keep the existing staged-row override model and layer an import-level default account on top of it in the web app. The import page should derive a quiet single-account review state by default, while revealing account exceptions and reconciliation detail only when staged rows indicate problems.

**Tech Stack:** Next.js app router, React 19, TypeScript, existing import page helpers and tests, Playwright end-to-end specs

---

### Task 1: Add import review state helpers for default-account and issue escalation

**Files:**
- Modify: `apps/web/src/app/import/accountAssignment.ts`
- Modify: `apps/web/src/app/import/accountAssignment.test.ts`

**Step 1: Write the failing tests**

Add focused helper tests for:

- deriving whether all visible rows share one account identity
- identifying rows that inherit the import default versus rows with explicit account exceptions
- deciding when reconciliation/issues should be visible

Use tests shaped like:

```ts
test("detects row-level account exceptions against the import default", () => {
  const result = summarizeImportAccountUsage(rows, "Main Checking");
  assert.equal(result.defaultMatches, 2);
  assert.equal(result.exceptionRows.length, 1);
});

test("shows reconciliation only for account conflicts or discrepancies", () => {
  assert.equal(shouldShowReconciliationSummary({
    multipleAccountGroups: false,
    hasMissingAccount: false,
    hasDiscrepancy: false
  }), false);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @minance/web test -- src/app/import/accountAssignment.test.ts`
Expected: FAIL because the new helpers do not exist yet.

**Step 3: Write minimal implementation**

Add helpers that:

- normalize staged row account usage
- compare row account values with the chosen import default
- produce summary metadata for the page

Prefer helpers like:

```ts
export function summarizeImportAccountUsage(rows: ProcessedRow[], importAccountName: string) {
  // returns counts plus explicit exception row ids
}

export function shouldShowImportIssues(summary: {
  invalidRows: number;
  duplicateRows: number;
  lowDirectionConfidenceRows: number;
  multipleAccountGroups: boolean;
  hasMissingAccount: boolean;
  hasDiscrepancy: boolean;
}) {
  return (
    summary.invalidRows > 0
    || summary.duplicateRows > 0
    || summary.lowDirectionConfidenceRows > 0
    || summary.multipleAccountGroups
    || summary.hasMissingAccount
    || summary.hasDiscrepancy
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @minance/web test -- src/app/import/accountAssignment.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/import/accountAssignment.ts apps/web/src/app/import/accountAssignment.test.ts
git commit -m "feat: add single-account import review helpers"
```

### Task 2: Replace duplicate account assignment UI with one import-level selector

**Files:**
- Modify: `apps/web/src/app/import/page.tsx`
- Modify: `apps/web/src/app/import/accountAssignment.ts`
- Modify: `apps/web/src/app/import/accountAssignment.test.ts`

**Step 1: Write the failing test**

Add UI-focused assertions for:

- a top-level `Import into account` selector
- removal of the processed-editor batch account assignment toolbar
- preservation of row-level account editing as an exception path

If existing unit coverage is insufficient, add a page-level render test or helper-level assertions that describe the intended UI state.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @minance/web test -- src/app/import/accountAssignment.test.ts`
Expected: FAIL because the page still exposes batch assignment and lacks the new import-default flow.

**Step 3: Write minimal implementation**

In `page.tsx`:

- add state for the chosen import-level account
- apply that account to staged rows through the existing processed-row update path
- remove the `Select visible`, `Assign account`, and `Assign to N selected` toolbar
- keep the row-level Account column available for exception handling

Drive the default-assignment path through the existing staged-row patching logic rather than adding a second persistence path.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @minance/web test -- src/app/import/accountAssignment.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/import/page.tsx apps/web/src/app/import/accountAssignment.ts apps/web/src/app/import/accountAssignment.test.ts
git commit -m "feat: add import-level account selection"
```

### Task 3: Make issues and reconciliation conditional instead of always-primary

**Files:**
- Modify: `apps/web/src/app/import/page.tsx`
- Modify: `apps/web/src/app/import/accountAssignment.ts`
- Test: `apps/web/src/app/import/accountAssignment.test.ts`

**Step 1: Write the failing test**

Add coverage for:

- no reconciliation panel on clean single-account imports
- issues summary appearing when invalid rows, duplicates, multiple account groups, or discrepancies exist
- reconciliation detail appearing only for discrepancy/account-conflict scenarios

Use helper-level assertions if page-level rendering is still hard to test directly.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @minance/web test -- src/app/import/accountAssignment.test.ts`
Expected: FAIL because reconciliation is still treated as a primary peer panel.

**Step 3: Write minimal implementation**

Update `page.tsx` to:

- compute a compact issue summary from processed rows plus reconciliation data
- show an `Issues found` block only when needed
- hide or collapse reconciliation when the import is clean
- reveal detailed reconciliation only when discrepancy or account-group issues exist

Keep the existing discrepancy resolution action, but move it under the conditional issue state.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @minance/web test -- src/app/import/accountAssignment.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/import/page.tsx apps/web/src/app/import/accountAssignment.ts apps/web/src/app/import/accountAssignment.test.ts
git commit -m "feat: make import reconciliation issue-driven"
```

### Task 4: Add end-to-end coverage for the single-account default path and issue escalation

**Files:**
- Modify: `e2e/specs/import-existing-account-transactions.spec.ts`
- Modify: `e2e/specs/imports-upload-process.spec.ts`
- Modify: `e2e/specs/helpers.ts`
- Add: `e2e/fixtures/import-single-account-clean.csv` (if a balanced single-account fixture is needed to prove the quiet path)

**Step 1: Write the failing test**

Add or update Playwright coverage for:

- choosing one account once and committing a clean import
- not showing reconciliation for a clean import
- revealing issue state when import problems exist

Prefer extending the existing import specs instead of creating parallel redundant coverage.

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/import-existing-account-transactions.spec.ts`
Expected: FAIL because the old selectors and page flow are still in place.

**Step 3: Write minimal implementation**

Update e2e helpers and assertions to target:

- the new top-level import account selector
- the absence of reconciliation on clean imports
- the continued ability to commit and verify imported transactions
- if existing fixtures cannot produce a balanced single-account import, add a tiny balanced CSV fixture for the quiet-path coverage

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/import-existing-account-transactions.spec.ts`
Expected: PASS

Then run a second focused spec:

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/imports-upload-process.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add e2e/specs/import-existing-account-transactions.spec.ts e2e/specs/imports-upload-process.spec.ts e2e/specs/helpers.ts e2e/fixtures/import-single-account-clean.csv
git commit -m "test: cover single-account import review flow"
```

### Task 5: Run full verification and update documentation references

**Files:**
- Modify: `docs/plans/2026-03-29-single-account-import-review-design.md` (only if implementation details materially change)
- Modify: `docs/plans/2026-03-29-single-account-import-review-implementation-plan.md` (only if execution changes)

**Step 1: Run focused unit coverage**

Run: `pnpm --filter @minance/web test -- src/app/import/accountAssignment.test.ts src/lib/import/reducer.test.ts`
Expected: PASS

**Step 2: Run focused e2e coverage**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/import-existing-account-transactions.spec.ts e2e/specs/imports-upload-process.spec.ts`
Expected: PASS

**Step 3: Run app verification**

Run: `just build-web`
Expected: successful production build

Run: `just check`
Expected: repo checks pass or any existing unrelated failures are documented

**Step 4: Update docs if implementation deviated**

If execution changed the approved UX, update the design and plan docs to match reality before handoff.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-29-single-account-import-review-design.md docs/plans/2026-03-29-single-account-import-review-implementation-plan.md
git commit -m "docs: finalize single-account import review plan"
```
