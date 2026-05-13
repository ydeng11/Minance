# Phase 2: Visual Consistency & Table Polish - Research

**Researched:** 2026-04-03
**Domain:** UI/UX polish, table visual hierarchy, loading states, empty states
**Confidence:** HIGH

## Summary

This phase focuses on visual polish for transaction tables and filter components. The codebase already has established patterns for loading indicators (Loader2 with animate-spin), multi-select filters (MultiSelectField), and badge styling (ActiveFilterBadges from Phase 01). Key changes needed: expense amount color change from neutral-100 to rose-400, skeleton loading for table rows, helpful empty state messaging, sticky table headers, and expansion of date range presets.

**Primary recommendation:** Extend existing patterns rather than introducing new component libraries. MultiSelectField already handles FILT-06/FILT-07 requirements. Loader2 pattern established for loading indicators.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Amount Color Semantics (VISL-01)
- **D-01:** Right-aligned amounts — already implemented, preserve
- **D-02:** Income amounts: emerald-400 (green) — already implemented, preserve
- **D-03:** Expense amounts: rose-400 (red) — change from neutral-100
- **D-04:** Apply to Transactions page table (page.tsx line 1208)
- **D-05:** Apply to Explorer cards if amounts displayed (check ExplorerCard.tsx)

#### Date Range Presets (FILT-05)
- **D-06:** Expand RANGE_OPTIONS in `apps/web/src/lib/constants.ts` to include:
  - "This Month" (current month, 1st to today)
  - "Last 30 Days" (exists as "30d")
  - "Last 90 Days" (exists as "90d")
  - "This Year" (Jan 1 to today)
  - "Custom" (triggers date picker)
- **D-07:** Presets apply to both Explorer and Transactions filter sidebars
- **D-08:** Custom range triggers existing date picker UI

#### Multi-Select Filters (FILT-06, FILT-07)
- **D-09:** Reuse existing `MultiSelectField` component for categories filter
- **D-10:** Reuse existing `MultiSelectField` component for accounts filter
- **D-11:** Replace single-select dropdowns in:
  - Transactions: `TransactionsAdvancedFilters.tsx`
  - Explorer: `ExplorerAdvancedFilters.tsx`
- **D-12:** Maintain URL state sync for multi-select values (array of strings)

#### Loading States (VISL-02, UFBK-03)
- **D-13:** Add skeleton placeholders for transaction table rows during load
- **D-14:** Skeleton style: dark neutral background, subtle pulse animation
- **D-15:** Show skeleton in table body while `loading === true`
- **D-16:** Preserve existing `loading` state variable pattern
- **D-17:** Add spinner to Apply/Save buttons during async operations

#### Empty State Messaging (VISL-03)
- **D-18:** Replace basic "No transactions found" with helpful guidance
- **D-19:** Empty state message structure:
  - Title: "No transactions found"
  - Guidance: "Try adjusting your filters or add a new transaction"
  - Action: Link/button to create transaction or clear filters
- **D-20:** Apply to both Transactions table and Explorer views

#### Sticky Table Headers (VISL-05)
- **D-21:** Make `<thead>` sticky with `position: sticky; top: 0`
- **D-22:** Add subtle shadow or border to indicate stickiness
- **D-23:** Ensure z-index above table content
- **D-24:** Apply to Transactions page table (primary table view)

#### Consistent Spacing (VISL-04)
- **D-25:** Audit spacing patterns across pages (Explorer, Transactions, Categories)
- **D-26:** Standardize padding/margins using Tailwind spacing scale
- **D-27:** Focus on filter sections, table cells, and page headers

#### Disabled States (UFBK-04)
- **D-28:** Existing pattern: `disabled:opacity-60` — preserve
- **D-29:** Add visual indication for unavailable actions (grayed out, cursor-not-allowed)
- **D-30:** Ensure disabled buttons have `aria-disabled` for accessibility

### Claude's Discretion

- Skeleton row count (show 5-10 rows during loading)
- Exact wording for empty state guidance
- Shadow style for sticky headers (box-shadow vs border)
- Transition timing for loading state changes

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FILT-05 | Date range presets (This Month, Last 30 Days, Last 90 Days, This Year, Custom) | RANGE_OPTIONS constant extensible; existing presets pattern |
| FILT-06 | Multi-select dropdowns for categories filter | MultiSelectField component already implemented and used |
| FILT-07 | Multi-select dropdowns for accounts filter | MultiSelectField component already implemented and used |
| VISL-01 | Consistent table styling with right-aligned amounts and color semantics | Amount rendering at line 1208; emerald-400/rose-400 pattern |
| VISL-02 | Loading states during data operations with appropriate spinners/skeletons | Loader2 + animate-spin pattern; `loading` state exists |
| VISL-03 | Empty state messaging when no transactions match filters | Current: "No transactions found" at line 1313 |
| VISL-04 | Consistent spacing and visual hierarchy across all pages | Tailwind spacing scale; audit needed |
| VISL-05 | Sticky table headers for improved scannability when scrolling | `<thead>` at line 1124; add sticky CSS |
| UFBK-03 | Loading indicators during async operations | Loader2 pattern established; buttons need spinner |
| UFBK-04 | Disabled states for unavailable actions with visual indication | `disabled:opacity-60` pattern exists; add cursor-not-allowed |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lucide-react | 0.575.0 (project) / 1.7.0 (npm latest) | Icons including Loader2 spinner | Established pattern in codebase |
| clsx | 2.1.1 | Class merging utility | Used by cn() helper |
| tailwind-merge | 3.5.0 | Tailwind class deduplication | Used by cn() helper |
| Tailwind CSS | 4.0 | Styling framework | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| use-debounce | 10.1.1 | Debounce hooks | Already used for search (Phase 01) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom skeleton | shadcn/ui Skeleton | Not installed; CSS pulse is simpler for table rows |
| Custom empty state | shadcn/ui patterns | Project has custom styling; match existing dark theme |

**Installation:**
No new packages required. All implementations use existing libraries.

**Version verification:** Versions match project package.json. lucide-react npm latest (1.7.0) is newer but project uses 0.575.0 — maintain project version for consistency.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── components/
│   ├── filters/
│   │   ├── MultiSelectField.tsx      # Already exists - reuse for FILT-06/07
│   │   └── ActiveFilterBadges.tsx    # Phase 01 - reuse pattern
│   └── ui/                           # Could add Skeleton here if needed
├── lib/
│   ├── constants.ts                  # RANGE_OPTIONS - extend for FILT-05
│   └── utils.ts                      # cn(), money() - existing helpers
├── app/
│   ├── transactions/
│   │   ├── page.tsx                  # Primary table - VISL-01/02/03/05
│   │   ├── TransactionsAdvancedFilters.tsx  # Already uses MultiSelectField
│   │   └── filters.test.ts          # Test patterns to follow
│   └── explorer/
│   │   ├── components/
│   │   │   ├── ExplorerAdvancedFilters.tsx  # Already uses MultiSelectField
│   │   │   └── ExplorerCard.tsx     # Card styling reference
```

### Pattern 1: Amount Color Semantics
**What:** Apply semantic colors to transaction amounts based on direction
**When to use:** All amount displays in tables and cards
**Example:**
```tsx
// Source: apps/web/src/app/transactions/page.tsx line 1208 (current)
<span className={txn.direction === "inflow" ? "text-emerald-400" : "text-neutral-100"}>
  {txn.direction === "inflow" ? "+" : "-"}
  {money(Math.abs(txn.amount))}
</span>

// Change expense from neutral-100 to rose-400:
<span className={txn.direction === "inflow" ? "text-emerald-400" : "text-rose-400"}>
```

### Pattern 2: Loading Indicator with Spinner
**What:** Use Loader2 icon with animate-spin class for loading feedback
**When to use:** Buttons during async operations, table loading states
**Example:**
```tsx
// Source: apps/web/src/app/import/page.tsx (established pattern)
import { Loader2 } from "lucide-react";

<button className="inline-flex items-center gap-2 ...">
  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
  Save changes
</button>

// For skeleton rows in table:
{loading ? (
  <>
    {[...Array(5)].map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td className="px-5 py-5"><div className="h-4 bg-neutral-800 rounded" /></td>
        {/* ... more skeleton cells */}
      </tr>
    ))}
  </>
) : (
  // actual rows
)}
```

### Pattern 3: MultiSelectField Usage
**What:** Reusable multi-select component with search capability
**When to use:** Categories and accounts filters (FILT-06, FILT-07)
**Example:**
```tsx
// Source: apps/web/src/app/transactions/TransactionsAdvancedFilters.tsx
<MultiSelectField
  selectedValues={filters.categories}
  options={categoryOptions}
  onChange={(categories) => onChange({ categories })}
  emptyLabel="All categories"
  testId="txn-category-filter"
  isOpen={openMultiSelect === "category"}
  onOpenChange={handleMultiSelectOpen("category")}
  ariaLabel="Filter transactions by category"
  searchable
  searchPlaceholder="Search category"
/>
```

### Pattern 4: Sticky Table Header
**What:** Sticky positioning for table headers with visual indicator
**When to use:** Tables with many rows requiring scroll
**Example:**
```tsx
// Current (line 1124):
<thead className="bg-neutral-900/60 text-neutral-300">

// Add sticky positioning:
<thead className="sticky top-0 z-10 bg-neutral-900/80 text-neutral-300 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
```

### Pattern 5: Empty State with Guidance
**What:** Helpful empty state with title, guidance, and action
**When to use:** When no data matches filters
**Example:**
```tsx
// Current (line 1310-1315):
{!loading && ledgerTransactions.length === 0 ? (
  <tr>
    <td colSpan={8} className="px-5 py-10 text-center text-sm text-neutral-400">
      No transactions found.
    </td>
  </tr>
) : null}

// Enhanced:
{!loading && ledgerTransactions.length === 0 ? (
  <tr>
    <td colSpan={8} className="px-5 py-10 text-center">
      <div className="text-neutral-300 font-medium">No transactions found</div>
      <div className="mt-2 text-sm text-neutral-500">
        Try adjusting your filters or add a new transaction
      </div>
      <button
        onClick={handleClearFilters}
        className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
      >
        Clear filters
      </button>
    </td>
  </tr>
) : null}
```

### Anti-Patterns to Avoid
- **Hardcoded colors outside Tailwind:** Use Tailwind semantic colors (emerald-400, rose-400)
- **Custom spinner components:** Use Loader2 from lucide-react
- **Layout property animations:** Never animate width/height — use transform/opacity only
- **Pure gray (#f5f5f5) backgrounds:** Add subtle tint per frontend-design skill

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-select dropdown | Custom dropdown component | MultiSelectField | Already exists, tested, handles search |
| Loading spinner | Custom CSS animation | Loader2 + animate-spin | lucide-react pattern established |
| Badge styling | Custom badge CSS | ActiveFilterBadges pattern | Phase 01 established emerald pill pattern |
| Class merging | String concatenation | cn() utility | Handles Tailwind conflicts correctly |

**Key insight:** The codebase has mature patterns from Phase 01. Extend these rather than introducing new UI component libraries.

## Common Pitfalls

### Pitfall 1: Inconsistent Amount Colors
**What goes wrong:** Expense amounts use neutral-100, not clearly indicating money leaving
**Why it happens:** Original implementation used neutral for all non-income amounts
**How to avoid:** Change to rose-400 for semantic clarity (VISL-01)
**Warning signs:** Amounts that don't visually distinguish income vs expense

### Pitfall 2: Empty State Without Guidance
**What goes wrong:** Users see "No transactions found" without knowing what to do
**Why it happens:** Minimal empty state implementation
**How to avoid:** Add guidance text and action button (VISL-03)
**Warning signs:** Empty state text shorter than 3 words

### Pitfall 3: Missing Loading Feedback
**What goes wrong:** Buttons appear clickable during async operations
**Why it happens:** No spinner or disabled state during loading
**How to avoid:** Add Loader2 spinner and disabled:opacity-60 (UFBK-03)
**Warning signs:** Button click during save causes duplicate action

### Pitfall 4: Table Headers Not Sticky
**What goes wrong:** Headers scroll away on long tables, losing context
**Why it happens:** No sticky positioning on `<thead>`
**How to avoid:** Add sticky top-0 with z-index and shadow (VISL-05)
**Warning signs:** Users scroll down and forget column meanings

### Pitfall 5: Skeleton Rows Don't Match Layout
**What goes wrong:** Skeleton rows have different dimensions than actual rows
**Why it happens:** Skeleton dimensions hardcoded differently
**How to avoid:** Use same padding/height classes as actual rows
**Warning signs:** Layout shift when loading completes

## Code Examples

Verified patterns from existing codebase:

### Amount Rendering with Color Semantics
```tsx
// Source: apps/web/src/app/transactions/page.tsx lines 1207-1211
<td className="px-5 py-5 text-right font-medium">
  <span className={txn.direction === "inflow" ? "text-emerald-400" : "text-rose-400"}>
    {txn.direction === "inflow" ? "+" : "-"}
    {money(Math.abs(txn.amount))}
  </span>
</td>
```

### Loading Spinner Pattern
```tsx
// Source: apps/web/src/app/categories/page.tsx
import { Loader2 } from "lucide-react";

{isLoading ? (
  <span className="inline-flex items-center gap-2">
    <Loader2 className="h-4 w-4 animate-spin" />
    Loading categories...
  </span>
) : (
  // actual content
)}
```

### Sticky Header CSS
```tsx
<thead className="sticky top-0 z-10 bg-neutral-900/80 shadow-[0_2px_8px_rgba(0,0,0,0.3)] text-neutral-300">
```

### Date Range Preset Extension
```tsx
// Source: apps/web/src/lib/constants.ts
export const RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "this_month", label: "This Month" },  // NEW
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "this_year", label: "This Year" },     // NEW
  { value: "365d", label: "Last 12 months" },
  { value: "ytd", label: "Year to date" },
  { value: "custom", label: "Custom" }            // NEW
] as const;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual debounce | use-debounce library | Phase 01 | Standard hook pattern |
| Single-select filters | MultiSelectField | Phase 01 (partial) | FILT-06/07 completed in Phase 02 |
| Basic empty state | Helpful guidance | Phase 02 | Better UX when no results |

**Deprecated/outdated:**
- neutral-100 for expense amounts: Change to rose-400 for semantic meaning

## Open Questions

1. **Skeleton row count**
   - What we know: Loading state exists, simple text "Loading..." in accounts page
   - What's unclear: Optimal number of skeleton rows (5-10 range)
   - Recommendation: Start with 5 rows, matches typical visible rows in viewport

2. **Sticky header shadow style**
   - What we know: Shadow indicates stickiness visually
   - What's unclear: box-shadow intensity vs border approach
   - Recommendation: Use subtle shadow `shadow-[0_2px_8px_rgba(0,0,0,0.3)]` — matches card shadows in project

3. **Empty state exact wording**
   - What we know: Title + guidance + action structure defined
   - What's unclear: Precise guidance text
   - Recommendation: "Try adjusting your filters or add a new transaction" — covers both paths

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified)

All changes are CSS/component modifications using existing Tailwind CSS and lucide-react. No new runtime dependencies required.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner |
| Config file | none — inline in package.json |
| Quick run command | `pnpm test` (runs `tsx --test "src/**/*.test.ts"` in apps/web) |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILT-05 | Date presets resolve correctly | unit | `tsx --test apps/web/src/lib/constants.test.ts` | ❌ Wave 0 — create for RANGE_OPTIONS |
| FILT-06 | MultiSelectField categories | unit | Existing MultiSelectField tested via integration | ✅ (via filter tests) |
| FILT-07 | MultiSelectField accounts | unit | Existing MultiSelectField tested via integration | ✅ (via filter tests) |
| VISL-01 | Amount color semantics | visual | Manual verification in browser | ❌ Manual-only (CSS) |
| VISL-02 | Skeleton loading state | visual | Manual verification in browser | ❌ Manual-only (CSS) |
| VISL-03 | Empty state messaging | visual | Manual verification in browser | ❌ Manual-only (UI) |
| VISL-04 | Spacing consistency | visual | Manual audit across pages | ❌ Manual-only (CSS) |
| VISL-05 | Sticky table headers | visual | Manual verification in browser | ❌ Manual-only (CSS) |
| UFBK-03 | Button loading spinner | visual | Manual verification in browser | ❌ Manual-only (CSS) |
| UFBK-04 | Disabled button states | visual | Manual verification in browser | ❌ Manual-only (CSS) |

### Sampling Rate
- **Per task commit:** `pnpm test` (if JS logic changes)
- **Per wave merge:** Visual review in browser
- **Phase gate:** Full visual QA pass before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/web/src/lib/constants.test.ts` — test RANGE_OPTIONS structure (FILT-05)
- [ ] Most VISL requirements are CSS-only — manual visual verification required
- Visual-only changes don't have unit tests — verify in browser at wave merge

**Note:** Phase 02 is primarily CSS/UI polish. Unit tests cover filter logic (FILT-05/06/07). Visual requirements (VISL-01 through VISL-05, UFBK-03/04) require manual browser verification.

## Sources

### Primary (HIGH confidence)
- Existing codebase patterns verified via Read tool
- `apps/web/src/components/filters/MultiSelectField.tsx` — component structure
- `apps/web/src/components/filters/ActiveFilterBadges.tsx` — badge styling pattern
- `apps/web/src/app/transactions/page.tsx` — amount rendering, table structure, empty state

### Secondary (MEDIUM confidence)
- `.agents/skills/polish/SKILL.md` — polish checklist for interaction states
- `.agents/skills/colorize/SKILL.md` — semantic color application (emerald/rose)
- `.agents/skills/animate/SKILL.md` — loading state animations, timing guidelines

### Tertiary (LOW confidence)
- npm registry version checks — lucide-react npm latest differs from project version

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All patterns exist in codebase, verified via Read
- Architecture: HIGH — MultiSelectField already used, Loader2 pattern established
- Pitfalls: HIGH — Identified from existing code analysis (amount colors, empty state)

**Research date:** 2026-04-03
**Valid until:** 30 days — stable patterns unlikely to change