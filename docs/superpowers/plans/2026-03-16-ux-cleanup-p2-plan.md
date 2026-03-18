# UX Cleanup P2 Tasks Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 P2 UX cleanup tasks: change dashboard trend to net flow, remove redundant UI from Explorer and Settings, and add tooltips to weekday spend components.

**Architecture:** Straightforward UI modifications across 4 files. Each task is independent and can be implemented in sequence. Tasks 3 and 4 both modify settings/page.tsx and should be done together.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript

---

## File Structure

| File | Task | Change Type |
|------|------|-------------|
| `apps/web/src/app/page.tsx` | Task 1 (nbh.2) | Modify |
| `apps/web/src/app/explorer/components/CategoryPerspective.tsx` | Task 2 (nbh.4) | Modify |
| `apps/web/src/app/settings/page.tsx` | Tasks 3 & 4 (nbh.6, nbh.8) | Modify |
| `apps/web/src/app/explorer/components/WeekdaySpendSummary.tsx` | Task 5 (nbh.9) | Modify |
| `apps/web/src/app/explorer/components/CategoryWeekdayHeatmap.tsx` | Task 5 (nbh.9) | Modify |

---

## Chunk 1: Dashboard Net Flow Trend

### Task 1: Change Dashboard spending trend metric to net flow (nbh.2)

**Files:**
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Update trendBars calculation**

Replace the `trendBars` useMemo (around line 129-137) to use `net` instead of `spend`:

```tsx
const trendBars = useMemo(() => {
  return (overview?.trend || []).slice(-6).map((entry) => {
    const maxAbsNet = Math.max(1, ...(overview?.trend || []).map((item) => Math.abs(item.net)));
    return {
      ...entry,
      barHeight: Math.max(14, Math.round((Math.abs(entry.net) / maxAbsNet) * 120)),
      isPositive: entry.net >= 0
    };
  });
}, [overview]);
```

- [ ] **Step 2: Update section title**

Change line ~260 from:
```tsx
<h3 className="text-sm font-medium text-neutral-300">Spending Trend</h3>
```
to:
```tsx
<h3 className="text-sm font-medium text-neutral-300">Net Flow Trend</h3>
```

- [ ] **Step 3: Update bar rendering**

Replace the bar rendering (around lines 270-275) to use `barHeight` and conditional coloring:

```tsx
{trendBars.map((item) => (
  <div key={item.month} className="flex flex-col items-center gap-2">
    <div
      className={cn(
        "w-full rounded-md",
        item.isPositive ? "bg-emerald-500/80" : "bg-rose-500/80"
      )}
      style={{ height: item.barHeight }}
      title={`${item.month}: ${money(item.net)}`}
    />
    <div className="text-[11px] text-neutral-400">{item.month.slice(5)}</div>
  </div>
))}
```

- [ ] **Step 4: Add cn import if not present**

If `cn` is not imported, add it:
```tsx
import { cn, money } from "@/lib/utils";
```

- [ ] **Step 5: Verify TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat(dashboard): change spending trend to net flow"
```

---

## Chunk 2: Explorer Category Perspective Cleanup

### Task 2: Remove Categories chart from Explorer category workspace (nbh.4)

**Files:**
- Modify: `apps/web/src/app/explorer/components/CategoryPerspective.tsx`

- [ ] **Step 1: Remove CategoryBreakdown import**

Remove line 7:
```tsx
import { CategoryBreakdown } from "./CategoryBreakdown";
```

- [ ] **Step 2: Remove CategoryBreakdown usage**

Remove line 215:
```tsx
<CategoryBreakdown overview={overview} onCategoryClick={setInspectedCategory} loading={loading} />
```

- [ ] **Step 3: Simplify layout**

Replace the grid wrapper (around line 206-216) from:
```tsx
<div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
  <div data-testid="explorer-category-trend">
    <TrendChart
      overview={overview}
      trend={trend}
      onApplyMonthFilter={onApplyMonthFilter}
      loading={loading}
    />
  </div>
  <CategoryBreakdown overview={overview} onCategoryClick={setInspectedCategory} loading={loading} />
</div>
```
to:
```tsx
<div data-testid="explorer-category-trend">
  <TrendChart
    overview={overview}
    trend={trend}
    onApplyMonthFilter={onApplyMonthFilter}
    loading={loading}
  />
</div>
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/explorer/components/CategoryPerspective.tsx
git commit -m "refactor(explorer): remove redundant CategoryBreakdown from category perspective"
```

---

## Chunk 3: Settings Page Cleanup

### Task 3 & 4: Remove Profile/Preferences and Copilot Strategy from Settings (nbh.6, nbh.8)

**Files:**
- Modify: `apps/web/src/app/settings/page.tsx`

- [ ] **Step 1: Remove unused imports**

Remove from the lucide-react import (line ~5-14):
- `ShieldCheck`
- `UserRound`

The import should become:
```tsx
import {
  ArrowRight,
  Bot,
  Download,
  FileSpreadsheet,
  LifeBuoy,
  Loader2
} from "lucide-react";
```

- [ ] **Step 2: Remove unused type imports**

Remove unused types from the import (line ~19-25):
- `CategoryStrategyCoarse`
- `CategoryStrategyGranular`

- [ ] **Step 3: Remove unused state variables**

Remove (lines ~46-48):
```tsx
const [coarseDraft, setCoarseDraft] = useState<CategoryStrategyCoarse[]>([]);
const [granularDraft, setGranularDraft] = useState<CategoryStrategyGranular[]>([]);
const [storageStatus, setStorageStatus] = useState<StorageStatusResponse["storage"] | null>(null);
```

- [ ] **Step 4: Remove newCategoryCoarseKey state**

Remove (line ~52):
```tsx
const [newCategoryCoarseKey, setNewCategoryCoarseKey] = useState("");
```

- [ ] **Step 5: Update loadSettings function**

Replace the `loadSettings` function to remove strategy and storage loading:

```tsx
async function loadSettings() {
  try {
    const [categoryData] = await Promise.all([
      api.categories.list()
    ]);

    const nextCategories = categoryData.categories;
    setCategories(nextCategories);
    setRuleCategory(nextCategories[0]?.name || "");
  } catch (error) {
    setMessage(error instanceof ApiError ? error.message : "Failed to load settings.");
  }
}
```

- [ ] **Step 6: Remove saveStrategy function**

Remove the entire `saveStrategy` function (lines ~201-212).

- [ ] **Step 7: Update addCategory function**

Remove `coarseKey` parameter from the API call:

```tsx
async function addCategory() {
  if (!newCategory.trim()) {
    return;
  }

  try {
    await api.categories.add({
      name: newCategory.trim(),
      emoji: newCategoryEmoji.trim() || undefined
    });
    setNewCategory("");
    setNewCategoryEmoji("");
    setMessage("Category added.");
    await loadSettings();
  } catch (error) {
    setMessage(error instanceof ApiError ? error.message : "Failed to add category.");
  }
}
```

- [ ] **Step 8: Remove Section Map link to Profile & Preferences**

Remove the link from the Section Map (around lines 250-255):
```tsx
<a
  href="#settings-profile-prefs"
  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-900"
>
  Profile &amp; preferences
  <ArrowRight className="h-4 w-4 text-neutral-400" />
</a>
```

- [ ] **Step 9: Remove Profile & Preferences section**

Remove the entire section with id `settings-profile-prefs` (around lines 342-366).

- [ ] **Step 10: Remove Coarse bucket selector from New category form**

Remove the coarse bucket label and select (around lines 392-405):
```tsx
<label className="grid gap-1 text-sm text-neutral-300">
  Emoji
  ...
</label>

<label className="grid gap-1 text-sm text-neutral-300">
  Coarse bucket
  ...
</label>
```

Update the grid to 3 columns instead of 4:
```tsx
<div className="mt-3 grid gap-2 md:grid-cols-[1fr_120px_auto]">
```

- [ ] **Step 11: Remove Copilot Two-Category Strategy section**

Remove the entire section with testid `category-strategy` (around lines 453-574).

- [ ] **Step 12: Update EmojiPicker usage**

Remove EmojiPicker import and usage if no longer needed. Check if `EmojiPicker` is still used elsewhere in the file. If not, remove the import:
```tsx
import { EmojiPicker } from "@/components/EmojiPicker";
```

Note: EmojiPicker is still used for `newCategoryEmoji`, so keep that import.

- [ ] **Step 13: Verify TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 14: Commit**

```bash
git add apps/web/src/app/settings/page.tsx
git commit -m "refactor(settings): remove Profile/Preferences and Copilot Strategy sections"
```

---

## Chunk 4: Weekday Spend Tooltips

### Task 5: Implement hover details for Explorer Weekday Spend capsules (nbh.9)

**Files:**
- Modify: `apps/web/src/app/explorer/components/WeekdaySpendSummary.tsx`
- Modify: `apps/web/src/app/explorer/components/CategoryWeekdayHeatmap.tsx`

- [ ] **Step 1: Add cn import to WeekdaySpendSummary.tsx**

Add `cn` to the imports if not present:
```tsx
import { cn, money } from "@/lib/utils";
```

- [ ] **Step 2: Update WeekdaySpendSummary bucket rendering**

Replace the bucket rendering (around lines 58-74) with tooltip-enabled version:

```tsx
{hasSpend ? (
  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
    {buckets.map((entry) => (
      <div key={entry.weekday} className="group relative">
        <div
          className={cn(
            "flex min-h-[132px] items-end rounded-3xl py-4",
            getWeekdayHeatToneClassName(entry.amount, maxAmount)
          )}
          data-testid="explorer-weekday-summary-cell"
          title={`${WEEKDAY_LABELS[entry.weekday]} • ${money(entry.amount)} • ${entry.count} transactions`}
          aria-label={`${WEEKDAY_LABELS[entry.weekday]} ${money(entry.amount)} ${entry.count} transactions`}
        >
          <div className="w-full min-w-0 px-1 text-center text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-white">
            {WEEKDAY_LABELS[entry.weekday]}
          </div>
        </div>

        {/* Tooltip */}
        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm whitespace-nowrap group-hover:block">
          <div className="font-medium text-neutral-100">{WEEKDAY_LABELS[entry.weekday]}</div>
          <div className="text-neutral-300">{money(entry.amount)}</div>
          <div className="text-xs text-neutral-400">{entry.count} transactions</div>
        </div>
      </div>
    ))}
  </div>
) : (
  <p className="mt-6 text-sm text-neutral-400">No spend data for range.</p>
)}
```

- [ ] **Step 3: Update CategoryWeekdayHeatmap cell rendering**

In `CategoryWeekdayHeatmap.tsx`, find the cell rendering (around lines 104-117) and wrap each cell with the tooltip:

Replace:
```tsx
{row.cells.map((cell) => (
  <div
    key={cell.weekday}
    className={cn(
      "flex min-h-[56px] items-center justify-center rounded-2xl px-2",
      getWeekdayHeatToneClassName(cell.amount, maxAmount)
    )}
    title={`${row.category} • ${WEEKDAY_LABELS[cell.weekday]} • ${money(cell.amount)} • ${cell.count} transactions`}
    aria-label={`${row.category} ${WEEKDAY_LABELS[cell.weekday]} ${money(cell.amount)} ${cell.count} transactions`}
  >
    <span className="text-xs font-medium text-neutral-200">
      {cell.count > 0 ? money(cell.amount) : ""}
    </span>
  </div>
))}
```

With:
```tsx
{row.cells.map((cell) => (
  <div key={cell.weekday} className="group relative">
    <div
      className={cn(
        "flex min-h-[56px] items-center justify-center rounded-2xl px-2",
        getWeekdayHeatToneClassName(cell.amount, maxAmount)
      )}
      title={`${row.category} • ${WEEKDAY_LABELS[cell.weekday]} • ${money(cell.amount)} • ${cell.count} transactions`}
      aria-label={`${row.category} ${WEEKDAY_LABELS[cell.weekday]} ${money(cell.amount)} ${cell.count} transactions`}
    >
      <span className="text-xs font-medium text-neutral-200">
        {cell.count > 0 ? money(cell.amount) : ""}
      </span>
    </div>

    {/* Tooltip */}
    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm whitespace-nowrap group-hover:block">
      <div className="font-medium text-neutral-100">{WEEKDAY_LABELS[cell.weekday]}</div>
      <div className="text-neutral-300">{money(cell.amount)}</div>
      <div className="text-xs text-neutral-400">{cell.count} transactions</div>
    </div>
  </div>
))}
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/explorer/components/WeekdaySpendSummary.tsx apps/web/src/app/explorer/components/CategoryWeekdayHeatmap.tsx
git commit -m "feat(explorer): add tooltips to weekday spend capsules"
```

---

## Final Verification

**Note:** Branch `ux-cleanup-p2-tasks` should already be created. If not, run:
```bash
git checkout main && git pull && git checkout -b ux-cleanup-p2-tasks
```

- [ ] **Step 1: Run full TypeScript check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run linting**

Run: `cd apps/web && npm run lint`
Expected: No errors

- [ ] **Step 3: Manual browser testing**

1. Dashboard: Verify Net Flow Trend shows with conditional colors
2. Explorer Category perspective: Verify no CategoryBreakdown visible
3. Settings: Verify Profile/Preferences and Copilot Strategy sections removed
4. Explorer: Hover over weekday spend capsules to verify tooltips appear

- [ ] **Step 4: Update bd task status**

```bash
bd update minance2-nbh.2 --status done
bd update minance2-nbh.4 --status done
bd update minance2-nbh.6 --status done
bd update minance2-nbh.8 --status done
bd update minance2-nbh.9 --status done
```

- [ ] **Step 5: Push changes**

```bash
git push origin ux-cleanup-p2-tasks
```