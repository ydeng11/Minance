# AI-Led Taxonomy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current coarse/granular strategy model with an AI-led category taxonomy where categories are primary, groups carry reporting policy, and imports learn from corrections without forcing taxonomy setup during review.

**Architecture:** Cut over the API and web app to canonical `groups -> categories -> transactions` relationships, add taxonomy-review metadata for AI fallback, and move the UX to category-first review with group-derived analytics. Because the product is pre-launch, prefer clean replacements over compatibility shims unless a short-lived adapter materially reduces implementation risk.

**Tech Stack:** TypeScript, Next.js app router, Node API server, JSON/SQLite-backed store, Node test runner (`pnpm exec tsx --test`), Playwright, pnpm.

---

### Task 1: Lock the target taxonomy contract with failing tests

**Files:**
- Create: `services/api/test/taxonomy-contract.test.ts`
- Modify: `apps/web/src/lib/api/types.ts`
- Modify: `apps/web/src/lib/api/endpoints.ts`
- Test: `services/api/test/taxonomy-contract.test.ts`

**Step 1: Write the failing test**

Cover:

- groups expose `reporting_mode`
- categories expose `group_id`
- transactions expose `group_resolution` and `needs_taxonomy_review`
- analytics requests use an explicit dimension field instead of the old coarse/granular mental model

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec tsx --test services/api/test/taxonomy-contract.test.ts
```

Expected: failures for missing fields and request params.

**Step 3: Write minimal implementation**

Update shared API types and endpoint builders to describe the target contract:

- `CategoryGroup`
- `Category`
- `Transaction.group_resolution`
- `Transaction.needs_taxonomy_review`
- analytics dimension params such as `dimension=category|group`

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec tsx --test services/api/test/taxonomy-contract.test.ts
```

**Step 5: Commit**

```bash
git add services/api/test/taxonomy-contract.test.ts apps/web/src/lib/api/types.ts apps/web/src/lib/api/endpoints.ts
git commit -m "test: lock ai-led taxonomy API contract"
```

### Task 2: Replace store-level taxonomy structures with canonical groups and category parent links

**Files:**
- Modify: `services/api/src/store.ts`
- Modify: `services/api/src/categories.ts`
- Modify: `services/api/src/category-strategy.ts`
- Modify: `services/api/test/categories.test.ts`
- Modify: `services/api/test/category-strategy.test.ts`
- Test: `services/api/test/categories.test.ts`
- Test: `services/api/test/category-strategy.test.ts`

**Step 1: Extend the failing tests**

Add coverage for:

- default groups: `Essential`, `Discretionary`, `Income`, `Excluded`, `Unassigned`
- `reporting_mode=exclude` on excluded groups
- every category requiring a `group_id`
- deleting a group requiring reassignment or replacement

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec tsx --test services/api/test/categories.test.ts services/api/test/category-strategy.test.ts
```

**Step 3: Write minimal implementation**

Refactor taxonomy storage to:

- store canonical groups separately from categories
- remove the parallel coarse/granular strategy dependence
- enforce single-parent category-to-group links
- provide helpers to create, update, reorder, and delete groups safely

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec tsx --test services/api/test/categories.test.ts services/api/test/category-strategy.test.ts
```

**Step 5: Commit**

```bash
git add services/api/src/store.ts services/api/src/categories.ts services/api/src/category-strategy.ts services/api/test/categories.test.ts services/api/test/category-strategy.test.ts
git commit -m "feat: add canonical taxonomy groups and category parents"
```

### Task 3: Teach categorization to be taxonomy-first with AI fallback for missing group links

**Files:**
- Modify: `services/api/src/categorization.ts`
- Modify: `services/api/src/llm/categorize.ts`
- Modify: `services/api/src/llm/prompts.ts`
- Modify: `services/api/src/training.ts`
- Modify: `services/api/test/categorization.test.ts`
- Create: `services/api/test/taxonomy-fallback.test.ts`
- Test: `services/api/test/categorization.test.ts`
- Test: `services/api/test/taxonomy-fallback.test.ts`

**Step 1: Write the failing tests**

Cover:

- known category derives its group from taxonomy without AI group prediction
- missing category-group relationship asks AI for a provisional group
- low-confidence AI group fallback routes to `Unassigned`
- fallback marks `group_resolution=ai_fallback` and `needs_taxonomy_review=true`

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec tsx --test services/api/test/categorization.test.ts services/api/test/taxonomy-fallback.test.ts
```

**Step 3: Write minimal implementation**

Update categorization flow to:

- keep category as the primary AI output
- derive group from taxonomy first
- only ask AI for group when taxonomy lookup is missing
- treat low-confidence group fallback as `Unassigned`
- extend prompt/training context to include canonical group names and accepted fallback examples

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec tsx --test services/api/test/categorization.test.ts services/api/test/taxonomy-fallback.test.ts
```

**Step 5: Commit**

```bash
git add services/api/src/categorization.ts services/api/src/llm/categorize.ts services/api/src/llm/prompts.ts services/api/src/training.ts services/api/test/categorization.test.ts services/api/test/taxonomy-fallback.test.ts
git commit -m "feat: add taxonomy-first categorization fallback"
```

### Task 4: Refactor import processing to use category-first review and taxonomy review flags

**Files:**
- Modify: `services/api/src/imports.ts`
- Modify: `services/api/test/imports.test.ts`
- Modify: `services/api/test/import-direction-llm.test.ts`
- Create: `services/api/test/import-taxonomy-review.test.ts`
- Test: `services/api/test/imports.test.ts`
- Test: `services/api/test/import-taxonomy-review.test.ts`

**Step 1: Write the failing tests**

Cover:

- imports do not ask for group creation or manual group assignment
- low category confidence sets `needs_category_review=true`
- missing taxonomy relationship sets `needs_taxonomy_review=true`
- AI fallback group is provisional, not silently canonical

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec tsx --test services/api/test/imports.test.ts services/api/test/import-taxonomy-review.test.ts
```

**Step 3: Write minimal implementation**

Refactor import processing so that:

- category correction remains the primary row-level action
- taxonomy fallback creates a provisional group assignment only
- taxonomy review state is stored distinctly from category review
- import completion is not blocked by missing group mapping

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec tsx --test services/api/test/imports.test.ts services/api/test/import-taxonomy-review.test.ts
```

**Step 5: Commit**

```bash
git add services/api/src/imports.ts services/api/test/imports.test.ts services/api/test/import-direction-llm.test.ts services/api/test/import-taxonomy-review.test.ts
git commit -m "feat: add taxonomy review to import processing"
```

### Task 5: Make reporting policy drive transaction and analytics behavior

**Files:**
- Modify: `services/api/src/transactions.ts`
- Modify: `services/api/src/analytics.ts`
- Modify: `services/api/src/server.ts`
- Modify: `services/api/test/analytics.test.ts`
- Modify: `services/api/test/api-contract.test.ts`
- Test: `services/api/test/analytics.test.ts`
- Test: `services/api/test/api-contract.test.ts`

**Step 1: Write the failing tests**

Cover:

- excluded groups are omitted from spend/income rollups by default
- transactions return derived group metadata
- analytics endpoints accept explicit `dimension=category|group`
- drill-down filters still work for both dimensions

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec tsx --test services/api/test/analytics.test.ts services/api/test/api-contract.test.ts
```

**Step 3: Write minimal implementation**

Update reads to:

- derive group metadata from category relationships
- use `reporting_mode` instead of ad hoc coarse exclusion flags
- expose group-aware analytics and filters
- remove or retire old coarse/granular internals once tests are green

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec tsx --test services/api/test/analytics.test.ts services/api/test/api-contract.test.ts
```

**Step 5: Commit**

```bash
git add services/api/src/transactions.ts services/api/src/analytics.ts services/api/src/server.ts services/api/test/analytics.test.ts services/api/test/api-contract.test.ts
git commit -m "feat: drive analytics from taxonomy reporting policy"
```

### Task 6: Cut over web filters and dashboard/explorer views to category/group dimensions

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/explorer/page.tsx`
- Modify: `apps/web/src/app/explorer/filters.ts`
- Modify: `apps/web/src/app/explorer/components/FilterSidebar.tsx`
- Modify: `apps/web/src/app/transactions/page.tsx`
- Modify: `apps/web/src/app/transactions/filters.ts`
- Modify: `apps/web/src/app/transactions/filters.test.ts`
- Modify: `e2e/specs/transactions-category-view-filter.spec.ts`
- Test: `apps/web/src/app/transactions/filters.test.ts`

**Step 1: Write the failing tests**

Cover:

- filters use `dimension=category|group`
- drill-down URLs do not leak stale category/group params across dimension changes
- dashboard and explorer toggles read as category/group, not granular/coarse

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec tsx --test apps/web/src/app/transactions/filters.test.ts
```

**Step 3: Write minimal implementation**

Cut over web filters to:

- replace coarse/granular terminology with category/group
- derive group options from canonical group data
- preserve drill-down behavior for dashboards and explorer
- keep excluded groups hidden from default spend views unless explicitly included

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec tsx --test apps/web/src/app/transactions/filters.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/explorer/page.tsx apps/web/src/app/explorer/filters.ts apps/web/src/app/explorer/components/FilterSidebar.tsx apps/web/src/app/transactions/page.tsx apps/web/src/app/transactions/filters.ts apps/web/src/app/transactions/filters.test.ts e2e/specs/transactions-category-view-filter.spec.ts
git commit -m "feat: cut over web filters to category and group dimensions"
```

### Task 7: Simplify transaction entry and build power-user taxonomy controls

**Files:**
- Modify: `apps/web/src/app/transactions/form.ts`
- Modify: `apps/web/src/app/transactions/form.test.ts`
- Modify: `apps/web/src/app/categories/page.tsx`
- Modify: `apps/web/src/app/categories/categoryTaxonomy.ts`
- Modify: `apps/web/src/app/categories/categoryTaxonomy.test.ts`
- Modify: `apps/web/src/app/settings/page.tsx`
- Test: `apps/web/src/app/transactions/form.test.ts`
- Test: `apps/web/src/app/categories/categoryTaxonomy.test.ts`

**Step 1: Write the failing tests**

Cover:

- manual transaction entry requires category only, not group
- tags stay optional under advanced controls
- group editing supports create/rename/delete/reorder/reporting mode
- moving categories between groups warns when reporting totals change

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec tsx --test apps/web/src/app/transactions/form.test.ts apps/web/src/app/categories/categoryTaxonomy.test.ts
```

**Step 3: Write minimal implementation**

Update UI to:

- keep transaction entry category-first
- keep taxonomy administration in settings/categories
- expose `Exclude from rollups` as a group policy control
- allow power users to manage groups and category placement without leaking that burden into import or entry

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec tsx --test apps/web/src/app/transactions/form.test.ts apps/web/src/app/categories/categoryTaxonomy.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/form.ts apps/web/src/app/transactions/form.test.ts apps/web/src/app/categories/page.tsx apps/web/src/app/categories/categoryTaxonomy.ts apps/web/src/app/categories/categoryTaxonomy.test.ts apps/web/src/app/settings/page.tsx
git commit -m "feat: simplify entry and expand taxonomy controls"
```

### Task 8: Add taxonomy review and learning surfaces

**Files:**
- Modify: `services/api/src/server.ts`
- Modify: `services/api/src/categories.ts`
- Modify: `services/api/src/imports.ts`
- Modify: `apps/web/src/app/import/page.tsx`
- Modify: `apps/web/src/app/settings/page.tsx`
- Create: `services/api/test/taxonomy-review-api.test.ts`
- Test: `services/api/test/taxonomy-review-api.test.ts`

**Step 1: Write the failing tests**

Cover:

- taxonomy review items can be listed
- accepted group corrections persist for future imports
- repeated corrections can surface rule or taxonomy suggestions

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec tsx --test services/api/test/taxonomy-review-api.test.ts
```

**Step 3: Write minimal implementation**

Add:

- review APIs or handlers for unresolved taxonomy mappings
- persistence for accepted group corrections
- UI hooks in import/settings to surface taxonomy review without interrupting import flow

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec tsx --test services/api/test/taxonomy-review-api.test.ts
```

**Step 5: Commit**

```bash
git add services/api/src/server.ts services/api/src/categories.ts services/api/src/imports.ts apps/web/src/app/import/page.tsx apps/web/src/app/settings/page.tsx services/api/test/taxonomy-review-api.test.ts
git commit -m "feat: add taxonomy review and learning workflow"
```

### Task 9: Final verification and cleanup

**Files:**
- Modify: `README.md`
- Modify: `docs/transaction-category-operator-runbook.md`
- Modify: `docs/transactions-tab-parity-inventory.md`
- Modify: `docs/categories-tab-parity-inventory.md`

**Step 1: Run targeted API tests**

```bash
pnpm exec tsx --test services/api/test/taxonomy-contract.test.ts services/api/test/categories.test.ts services/api/test/category-strategy.test.ts services/api/test/categorization.test.ts services/api/test/taxonomy-fallback.test.ts services/api/test/imports.test.ts services/api/test/import-taxonomy-review.test.ts services/api/test/analytics.test.ts services/api/test/api-contract.test.ts services/api/test/taxonomy-review-api.test.ts
```

**Step 2: Run targeted web tests**

```bash
pnpm exec tsx --test apps/web/src/app/transactions/filters.test.ts apps/web/src/app/transactions/form.test.ts apps/web/src/app/categories/categoryTaxonomy.test.ts
```

**Step 3: Run focused E2E coverage**

```bash
pnpm exec playwright test e2e/specs/transactions-category-view-filter.spec.ts e2e/specs/import-and-transactions.spec.ts e2e/specs/assistant-and-analytics.spec.ts
```

**Step 4: Update docs**

Document:

- category/group terminology
- excluded-group reporting behavior
- taxonomy review workflow
- pre-launch cutover assumptions

**Step 5: Commit**

```bash
git add README.md docs/transaction-category-operator-runbook.md docs/transactions-tab-parity-inventory.md docs/categories-tab-parity-inventory.md
git commit -m "docs: update taxonomy and review workflow docs"
```
