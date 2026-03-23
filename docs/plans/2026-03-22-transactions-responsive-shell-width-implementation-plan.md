# Transactions Responsive Shell Width Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore a fluid-with-cap shell width for Transactions so the page scales with browser width without becoming fully unbounded.

**Architecture:** Reuse the existing shared shell-width helper instead of introducing page-local layout overrides. The shell container already uses `w-full`, so the implementation only needs to restore a wider `max-w-[96rem]` cap for `/transactions` routes and keep the regression test aligned with that route-specific behavior.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Node `node:test` via `tsx`

---

### Task 1: Reintroduce the Transactions width regression

**Files:**
- Modify: `apps/web/src/components/layout/shellWidth.test.ts`

**Step 1: Write the failing test**

Update the existing shell width test so it asserts:

```ts
assert.equal(getShellContentWidthClass("/transactions"), "max-w-[96rem]");
assert.equal(getShellContentWidthClass("/transactions/history"), "max-w-[96rem]");
assert.equal(getShellContentWidthClass("/accounts"), "max-w-6xl");
```

Keep the existing `/` and `null` assertions.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @minance/web test src/components/layout/shellWidth.test.ts`

Expected: FAIL because the helper currently returns `max-w-6xl` for every route.

**Step 3: Write minimal implementation**

Do not change implementation in this step. Only leave the updated failing expectation in place.

**Step 4: Run test to verify it still fails for the intended reason**

Run: `pnpm --filter @minance/web test src/components/layout/shellWidth.test.ts`

Expected: FAIL with an assertion diff showing `/transactions` returned `max-w-6xl` instead of `max-w-[96rem]`.

**Step 5: Commit**

```bash
git add apps/web/src/components/layout/shellWidth.test.ts
git commit -m "test: restore transactions width regression"
```

### Task 2: Restore the Transactions fluid-with-cap shell width

**Files:**
- Modify: `apps/web/src/components/layout/shellWidth.ts`
- Modify: `apps/web/src/components/layout/shellWidth.test.ts`

**Step 1: Write the minimal implementation**

Update the helper so:

```ts
export function getShellContentWidthClass(pathname: string | null) {
  return pathname?.startsWith("/transactions") ? "max-w-[96rem]" : "max-w-6xl";
}
```

Do not add new helper branches or extra `vw` math.

**Step 2: Run test to verify it passes**

Run: `pnpm --filter @minance/web test src/components/layout/shellWidth.test.ts`

Expected: PASS

**Step 3: Run focused frontend verification**

Run: `just build-web`

Expected: successful production build for `@minance/web`

**Step 4: Run full handoff verification**

Run: `just check`

Expected: exit code `0`

**Step 5: Commit**

```bash
git add apps/web/src/components/layout/shellWidth.ts apps/web/src/components/layout/shellWidth.test.ts docs/plans/2026-03-22-transactions-responsive-shell-width-design.md docs/plans/2026-03-22-transactions-responsive-shell-width-implementation-plan.md
git commit -m "fix: restore responsive transactions shell width"
```
