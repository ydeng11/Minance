# Transactions Workspace Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `/transactions` feel wider, calmer, and easier to scan while preserving every existing filter, dialog, inline edit, delete action, pagination control, and URL-backed behavior.

**Architecture:** Keep transaction data loading and CRUD logic in `apps/web/src/app/transactions/page.tsx`, add a tiny route-aware shell width helper so only `/transactions` gets more room, and reshape the page into a compact workspace header, a two-row filter surface, and a rebalanced ledger table. Verification should rely on focused unit coverage for shell-width logic plus Playwright regression coverage for filters, create flow, inline edit, and responsive overflow.

**Tech Stack:** TypeScript, Next.js app router, React 19, Tailwind CSS, Node test runner (`tsx`), Playwright, pnpm.

---

### Task 1: Restore the shared `tsx` test runner in this branch

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Step 1: Capture the failing baseline check**

Run:

```bash
pnpm exec tsx --version
pnpm test:test-first
```

Expected: failure with `Command "tsx" not found` or `env: tsx: No such file or directory`.

**Step 2: Add the missing dev dependency**

Update the root `devDependencies` block so it includes `tsx`:

```json
{
  "devDependencies": {
    "@playwright/test": "^1.56.1",
    "axe-core": "^4.11.0",
    "concurrently": "^9.2.1",
    "tsx": "^4.20.6"
  }
}
```

Then refresh the lockfile:

```bash
pnpm install
```

**Step 3: Re-run the baseline check**

Run:

```bash
pnpm exec tsx --version
pnpm test:test-first
```

Expected: `tsx` prints a version and the test-first guard passes.

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: restore tsx test runner"
```

### Task 2: Add a route-aware shell width helper for `/transactions`

**Files:**
- Create: `apps/web/src/components/layout/shellWidth.ts`
- Create: `apps/web/src/components/layout/shellWidth.test.ts`
- Modify: `apps/web/src/components/layout/Shell.tsx`

**Step 1: Write the failing test**

Add a focused test like:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { getShellContentWidthClass } from "./shellWidth";

test("getShellContentWidthClass widens only the transactions route", () => {
  assert.equal(getShellContentWidthClass("/transactions"), "max-w-[96rem]");
  assert.equal(getShellContentWidthClass("/transactions/history"), "max-w-[96rem]");
  assert.equal(getShellContentWidthClass("/accounts"), "max-w-6xl");
  assert.equal(getShellContentWidthClass("/"), "max-w-6xl");
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
pnpm exec tsx --test apps/web/src/components/layout/shellWidth.test.ts
```

Expected: failure because `shellWidth.ts` does not exist yet.

**Step 3: Write the minimal implementation**

Create the helper:

```ts
export function getShellContentWidthClass(pathname: string | null) {
  return pathname?.startsWith("/transactions") ? "max-w-[96rem]" : "max-w-6xl";
}
```

Wire it into `Shell.tsx`:

```ts
import { getShellContentWidthClass } from "@/components/layout/shellWidth";

const shellContentWidthClass = getShellContentWidthClass(pathname);
```

Use it in the content wrapper:

```tsx
<div className={`mx-auto w-full p-4 md:p-8 ${shellContentWidthClass}`}>
```

**Step 4: Run the test to verify it passes**

Run:

```bash
pnpm exec tsx --test apps/web/src/components/layout/shellWidth.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/components/layout/shellWidth.ts apps/web/src/components/layout/shellWidth.test.ts apps/web/src/components/layout/Shell.tsx
git commit -m "feat: widen shell for transactions workspace"
```

### Task 3: Refresh the transactions workspace header and filter surface

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx`
- Create: `e2e/specs/transactions-workspace-layout.spec.ts`

**Step 1: Write the failing Playwright test**

Cover the refreshed layout contract:

```ts
test("@core transactions workspace header keeps filters visible", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "transactions");

  await expect(page.getByTestId("txn-workspace-header")).toBeVisible();
  await expect(page.getByTestId("txn-filter-surface")).toBeVisible();
  await expect(page.getByTestId("txn-filter-primary-row")).toBeVisible();
  await expect(page.getByTestId("txn-filter-secondary-row")).toBeVisible();
  await expect(page.getByTestId("txn-create-open")).toBeVisible();
  await expect(page.getByTestId("txn-amount-filter")).toBeVisible();
  await expect(page.getByText("Date preset applies across the ledger and drill-down links.")).toHaveCount(0);
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-workspace-layout.spec.ts --project=chromium
```

Expected: failure because the new workspace test ids and simplified filter surface do not exist yet.

**Step 3: Write the minimal implementation**

In `page.tsx`:

- replace the heavy hero framing with a compact workspace header
- add stable wrappers such as `txn-workspace-header`, `txn-filter-surface`, `txn-filter-primary-row`, and `txn-filter-secondary-row`
- keep existing filter controls and data-testid values intact
- remove the two filler helper cards and replace them with one lighter supporting line plus the active-filter count
- keep `Apply filters` and `Clear` explicit and easy to reach

Aim for a structure like:

```tsx
<header data-testid="txn-workspace-header" className="...">
  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
    ...
  </div>
</header>

<section data-testid="txn-filter-surface" className="...">
  <div data-testid="txn-filter-primary-row" className="grid gap-3 xl:grid-cols-[minmax(320px,1.5fr)_repeat(4,minmax(150px,0.85fr))]">
    ...
  </div>
  <div data-testid="txn-filter-secondary-row" className="grid gap-3 xl:grid-cols-[minmax(170px,0.8fr)_minmax(170px,0.8fr)_minmax(340px,1.7fr)_auto]">
    ...
  </div>
</section>
```

**Step 4: Run the test to verify it passes**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-workspace-layout.spec.ts --project=chromium
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx e2e/specs/transactions-workspace-layout.spec.ts
git commit -m "feat: refresh transactions workspace header"
```

### Task 4: Rebalance ledger density without losing row actions

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx`
- Modify: `e2e/specs/transactions-ledger-header-controls.spec.ts`

**Step 1: Extend the failing regression test**

Add assertions to the existing ledger spec so it verifies the redesigned table still preserves row behavior:

```ts
await expect(page.getByTestId("txn-ledger-shell")).toBeVisible();
await expect(page.getByTestId("txn-table-scroll")).toBeVisible();

await page.getByTestId(`txn-edit-${newTransactionId}`).click();
await expect(page.getByTestId(`txn-inline-form-${newTransactionId}`)).toBeVisible();
await page.getByTestId(`txn-inline-cancel-${newTransactionId}`).click();
await expect(page.getByTestId(`txn-inline-form-${newTransactionId}`)).toHaveCount(0);
```

Also assert the row still shows:

- merchant text
- category chip
- signed amount
- `Edit` and `Delete` actions

**Step 2: Run the test to verify it fails**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-ledger-header-controls.spec.ts --project=chromium
```

Expected: failure because the new ledger wrapper test ids and updated row assertions do not match yet.

**Step 3: Write the minimal implementation**

In `page.tsx`:

- add `txn-ledger-shell` to the table section and `txn-table-scroll` to the horizontal overflow wrapper
- use a `colgroup` or disciplined width classes so `Details` gets the most room while `Dates`, `Type`, `Amount`, and `Actions` stay compact
- increase row padding slightly and soften borders/backgrounds for easier scanning
- keep all existing row chips, inline edit rows, and action buttons wired exactly as they work now

Use a column structure like:

```tsx
<table className="min-w-[1100px] w-full text-left text-sm" data-testid="txn-table">
  <colgroup>
    <col className="w-[132px]" />
    <col />
    <col className="w-[190px]" />
    <col className="w-[220px]" />
    <col className="w-[120px]" />
    <col className="w-[130px]" />
    <col className="w-[144px]" />
  </colgroup>
```

**Step 4: Run the test to verify it passes**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-ledger-header-controls.spec.ts --project=chromium
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx e2e/specs/transactions-ledger-header-controls.spec.ts
git commit -m "feat: rebalance transactions ledger density"
```

### Task 5: Add a narrow-viewport regression for stacked filters and horizontal ledger overflow

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx`
- Create: `e2e/specs/transactions-ledger-responsive.spec.ts`

**Step 1: Write the failing Playwright test**

Add a responsive smoke test:

```ts
test("@core transactions remains usable on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginWithSeedAccount(page);
  await gotoView(page, "transactions");

  await expect(page.getByTestId("txn-create-open")).toBeVisible();
  await expect(page.getByTestId("txn-filter-primary-row")).toBeVisible();
  await expect(page.getByTestId("txn-filter-secondary-row")).toBeVisible();

  const overflowsHorizontally = await page.getByTestId("txn-table-scroll").evaluate((node) => {
    return node.scrollWidth > node.clientWidth;
  });

  expect(overflowsHorizontally).toBe(true);
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-ledger-responsive.spec.ts --project=chromium
```

Expected: failure until the refreshed layout reliably stacks and the ledger exposes the scroll wrapper with the new test id.

**Step 3: Write the minimal implementation**

Tighten responsive classes in `page.tsx` so:

- the top workspace header wraps cleanly instead of crushing the summary and CTA
- primary and secondary filter rows collapse to one-column or two-column stacks as width shrinks
- the ledger keeps `overflow-x-auto` and does not clip actions or amounts

**Step 4: Run the test to verify it passes**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-ledger-responsive.spec.ts --project=chromium
```

Expected: PASS.

**Step 5: Run the focused regression set**

Run:

```bash
pnpm exec tsx --test apps/web/src/app/transactions/filters.test.ts apps/web/src/components/layout/shellWidth.test.ts
pnpm exec playwright test e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/transactions-ledger-header-controls.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts --project=chromium
```

Expected: all targeted tests pass.

**Step 6: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx e2e/specs/transactions-ledger-responsive.spec.ts
git commit -m "test: cover transactions responsive workspace"
```
