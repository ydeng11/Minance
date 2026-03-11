# Allow Category Group Moves Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow categories managed from the categories page to be assigned to any group regardless of category type.

**Architecture:** Remove the shared category type versus group compatibility guard in the category API so both categories-page flows, inline move and modal save, use the same relaxed behavior. Update API tests to assert the newly allowed combinations and remove dead categories-page error handling that only existed for the old rejection path.

**Tech Stack:** TypeScript, Node test runner, Next.js app, pnpm workspace

---

### Task 1: Capture the new allowed API behavior in tests

**Files:**
- Modify: `services/api/test/categories.test.ts`
- Test: `services/api/test/categories.test.ts`

**Step 1: Write the failing tests**

- Replace the current rejection expectations for:
  - creating an `income` category in `essential`
  - creating an `income` category in `extra`
  - creating a `transfer` category in `essential`
  - moving an `income` category to `essential`
  - moving an `income` category to `extra`
- Assert the resulting category keeps the requested `coarseKey` and `type`.

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm exec tsx --test services/api/test/categories.test.ts`

Expected: FAIL on the old compatibility validation errors.

**Step 3: Write minimal implementation**

- Remove the compatibility validation in `services/api/src/categories.ts`.

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm exec tsx --test services/api/test/categories.test.ts`

Expected: PASS

### Task 2: Remove dead categories-page restriction handling

**Files:**
- Modify: `apps/web/src/app/categories/page.tsx`

**Step 1: Write the failing test**

- No dedicated page test exists for this branch of error mapping.
- Treat dead-code removal as follow-up cleanup after Task 1 turns green.

**Step 2: Write minimal implementation**

- Remove the `"for selected group"` error mapping branch from the categories page.

**Step 3: Run targeted verification**

Run: `env NODE_ENV=test pnpm exec tsx --test services/api/test/categories.test.ts`

Expected: PASS and no behavior regressions in the touched API path.

### Task 3: Verify branch outcome

**Files:**
- Review: `services/api/src/categories.ts`
- Review: `services/api/test/categories.test.ts`
- Review: `apps/web/src/app/categories/page.tsx`

**Step 1: Run targeted verification**

Run: `env NODE_ENV=test pnpm exec tsx --test services/api/test/categories.test.ts`

Expected: PASS

**Step 2: Inspect diff**

Run: `git diff -- services/api/src/categories.ts services/api/test/categories.test.ts apps/web/src/app/categories/page.tsx docs/plans/2026-03-11-allow-category-group-moves.md`

Expected: Only the planned relaxation and cleanup changes appear.
