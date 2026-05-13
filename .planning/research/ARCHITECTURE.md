# Architecture Patterns for UX Improvements

**Domain:** Personal Finance Application UX Component Architecture
**Researched:** 2026-03-31
**Confidence:** HIGH (verified from official docs, codebase analysis, and established patterns)

## Recommended Architecture

### Component Organization Strategy

**Pattern: Colocated Page Components + Shared Primitives**

```
apps/web/src/
├── components/
│   └── filters/               # Shared filter primitives (reusable)
│       ├── AmountRangeControl.tsx   # Dual-slider + input range
│       ├── MultiSelectField.tsx     # Dropdown multi-select with search
│       ├── DateRangePicker.tsx      # (to build) Preset + custom dates
│       └── ActiveFilterBadges.tsx   # (to build) Removable filter pills
│   └── ui/                    # shadcn/ui base components
│
├── app/
│   ├── explorer/
│   │   ├── filters.ts         # ExplorerFilterState type + URL parsing
│   │   └── components/
│   │       ├── FilterSidebar.tsx        # Persistent sidebar composition
│   │       ├── ExplorerCommandBar.tsx   # Compact toolbar
│   │       └── ExplorerAdvancedFilters.tsx
│   │   └── page.tsx           # Filter state orchestration
│   │
│   └── transactions/
│   │   ├── filters.ts         # TransactionsFilterState type + URL parsing
│   │   ├── TransactionsCommandBar.tsx   # Compact toolbar + apply
│   │   ├── TransactionsAdvancedFilters.tsx  # Modal composition
│   │   └── page.tsx           # Filter state orchestration
│   │
│   └── (marketing)/           # Route groups for different layouts
│
├── lib/
│   ├── sharedFilters.ts       # Cross-page shared filter utilities
│   ├── constants.ts           # RANGE_OPTIONS, etc.
│   └── utils.ts               # Formatting, validation helpers
```

**Why This Organization:**
- Private folders (`components/` inside route) colocate page-specific UI with the route
- Shared primitives in `components/filters/` enable reuse across pages
- Filter state types in `filters.ts` per-page maintain separation of concerns
- Next.js App Router supports this pattern (files not routable without `page.tsx`)

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `AmountRangeControl` | Dual-slider + text inputs for amount filtering | Parent filter composition via `onChange` callback |
| `MultiSelectField` | Dropdown multi-select with search, checkboxes | Parent filter composition via `onChange` callback |
| `FilterSidebar` | Composes primitives, shows active filter count | Page component via `filters` prop + `onChange` |
| `CommandBar` | Compact toolbar with search, quick filters, advanced button | Page component via `filters` prop + `onChange` |
| `AdvancedFilters` | Modal/drawer with full filter controls | Page component via filters, onChange, onApply, onClose |
| `filters.ts` | Filter state type, URL parsing/building, validation | Page component imports functions |
| `page.tsx` | Orchestrates filter state, URL sync, API calls | All filter components, API client |

### Data Flow Architecture

**URL-Driven Filter State Pattern:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              URL (Search Params)                              │
│   ?query=coffee&range=30d&category=Food&category= Dining                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ parseFilterState()
┌─────────────────────────────────────────────────────────────────────────────┐
│                           React State (FilterState)                          │
│   { query: "coffee", range: "30d", categories: ["Food", "Dining"], ... }    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
          Filter Components                   API Client
     (onChange → update state)           (toApiParams → fetch)
                    │                               │
                    └                               │
                    ▼ buildFilterSearchParams()    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              URL (Updated)                                    │
│   Browser history entry added (shallow routing)                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Principles:**
1. URL is the source of truth for persisted filter state
2. React state is derived from URL, not independent
3. Component onChange updates state, which updates URL (shallow)
4. API calls use derived params from state, not directly from URL

## Patterns to Follow

### Pattern 1: Shared Filter Primitives

**What:** Reusable filter controls that accept callbacks, not state.

**When:** Any filter control used across multiple pages (amount range, multi-select, date picker).

**Example:**
```typescript
// components/filters/MultiSelectField.tsx
interface MultiSelectFieldProps {
  selectedValues: string[];
  options: MultiSelectOption[];
  onChange: (nextValues: string[]) => void;  // Callback, not state setter
  emptyLabel: string;
  testId: string;
  isOpen: boolean;                           // Parent manages open state
  onOpenChange: (nextOpen: boolean) => void;
  searchable?: boolean;
}

// Usage in page-specific component
<MultiSelectField
  selectedValues={filters.categories}
  options={categoryOptions}
  onChange={(categories) => onChange({ categories })}
  emptyLabel="All categories"
  testId="txn-category-filter"
  isOpen={openMultiSelect === "category"}
  onOpenChange={(open) => setOpenMultiSelect(open ? "category" : null)}
/>
```

**Why Callbacks Over State Setters:**
- Parent controls when/how state updates (debouncing, validation)
- Enables consistent behavior across different page contexts
- Testing is simpler (mock callback, verify it's called)

### Pattern 2: Filter State Type + Utilities Per Page

**What:** Each page defines its own filter state interface with parsing/building functions.

**When:** Pages have different filter requirements (Explorer: perspective, compare; Transactions: pagination, recurring).

**Example:**
```typescript
// app/transactions/filters.ts
export interface TransactionsFilterState {
  query: string;
  categories: string[];
  accounts: string[];
  minAmount: string;
  maxAmount: string;
  range: string;
  start: string;
  end: string;
  categoryView: "granular" | "coarse";
  transactionTypes: TransactionTypeFilter[];
  tag: string;
  page: number;
  recurringRuleId: string;
  recurring: boolean;
}

// Parsing from URL
export function parseTransactionsFilterState(searchParams: SearchParamsLike): TransactionsFilterState;

// Building URL params
export function buildTransactionsFilterSearchParams(filters: TransactionsFilterState): URLSearchParams;

// Converting to API params
export function toTransactionsListApiParams(filters: TransactionsFilterState): TransactionsListApiParams;

// Validation/cleaning
export function toValidFilterState(filters: TransactionsFilterState): TransactionsFilterState;
```

**Why Per-Page Types:**
- Different pages have different filter dimensions
- Type safety prevents filter misuse
- Validation logic specific to page context
- Clear separation of what filters exist per page

### Pattern 3: Command Bar vs Sidebar vs Modal

**What:** Different filter UX patterns for different page contexts.

**When to use Command Bar:**
- Task-focused pages (Transactions: find specific transaction)
- Compact primary filters + advanced button
- Explicit "Apply" action (server-side filtering)
- User completes task and leaves

**When to use Filter Sidebar:**
- Exploratory pages (Explorer: browse analytics, discover patterns)
- Persistent visibility of filter state
- Real-time updates (no apply button, filters apply immediately)
- User spends extended time exploring

**When to use Modal/Drawer:**
- Advanced filters (many options, complex controls)
- Secondary to primary command bar
- Opens on demand, closes after configuration
- Contains full filter set with Apply action

**Current Implementation (Correct Pattern):**
- Explorer: `FilterSidebar` (persistent, exploratory) + `ExplorerCommandBar` (quick access)
- Transactions: `TransactionsCommandBar` (primary) + `TransactionsAdvancedFilters` (modal)

### Pattern 4: URL State Sync with Shallow Routing

**What:** Filter state lives in URL search params, updated via shallow routing.

**When:** Filters should be shareable, bookmarkable, browser-back-compatible.

**Implementation (Current Pattern):**
```typescript
// In page.tsx
import { useSearchParams, useRouter } from "next/navigation";

const searchParams = useSearchParams();
const router = useRouter();

// Parse from URL on mount
const filters = parseTransactionsFilterState(searchParams);

// Update URL when filters change (shallow - no server re-render)
function handleFilterChange(updates: Partial<TransactionsFilterState>) {
  const nextFilters = { ...filters, ...updates };
  const nextParams = buildTransactionsFilterSearchParams(nextFilters);
  router.replace(`?${nextParams.toString()}`, { scroll: false });
}
```

**Why Shallow Routing:**
- No server component re-render (stays fast)
- Browser back button works correctly
- URL is shareable with exact filter state
- Pagination state preserved

### Pattern 5: Active Filter Visibility

**What:** Show users what filters are active, provide clear/remove option.

**When:** Any page with filters (users need visibility).

**Current Pattern (Explorer FilterSidebar):**
```typescript
const activeFilterCount = useMemo(() => {
  let count = 0;
  if (filters.query) count++;
  if (filters.categories.length) count++;
  if (filters.account) count++;
  // ... check all filter dimensions
  return count;
}, [filters]);

// Show badge with count
{activeFilterCount > 0 && (
  <span className="badge">{activeFilterCount}</span>
)}

// Clear all button
<button onClick={handleClearAll}>Clear all</button>
```

**Recommended Enhancement (Filter Badges):**
```typescript
// components/filters/ActiveFilterBadges.tsx
interface ActiveFilterBadgesProps {
  filters: FilterState;
  onRemove: (key: string, value?: string) => void;
  onClearAll: () => void;
}

// Shows removable pills for each active filter
// "Coffee" [x]  "Food, Dining" [x]  "Last 30 days" [x]  "Clear all"
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Duplicate Search Inputs

**What:** Two search inputs on same page (e.g., "Search transactions" AND "Filter by merchant").

**Why bad:** Confuses users about which to use, creates redundant state, wastes screen space.

**Instead:** Single smart search that matches across relevant fields (merchant, description, notes, tags). Show search scope indicator.

**Current Issue (Explorer FilterSidebar):**
```typescript
// Two search inputs - confusing
<input placeholder="Search transactions..." />
<input placeholder="Filter by merchant..." />
```

**Fix:** Consolidate into single search with scope tooltip.

### Anti-Pattern 2: Implicit Filter Apply

**What:** Filters apply immediately on change without user confirmation.

**Why bad:** On task-focused pages (Transactions), every change triggers API call. Wasteful for multi-select, amount range, etc.

**Instead:** Explicit "Apply" button for server-side filtering. Real-time updates only for exploratory pages.

**Current Pattern (Transactions):**
```typescript
// Apply button in command bar - correct
<button onClick={onApply}>Apply</button>

// Advanced filters modal also has Apply - correct
<button onClick={onApply}>Apply filters</button>
```

### Anti-Pattern 3: Filter State in useState Only

**What:** Filter state stored in React useState, not synced to URL.

**Why bad:** Can't share filtered view, back button loses filters, refresh loses context.

**Instead:** URL as source of truth. React state derived from URL.

**Current Pattern (Correct):**
```typescript
// Parse from URL
const filters = parseTransactionsFilterState(searchParams);

// Update URL on change
router.replace(`?${buildSearchParams(filters)}`);
```

### Anti-Pattern 4: Inline Filter Controls in Table

**What:** Filter inputs embedded directly in table columns (column header filters).

**Why bad:** Crowds the table, hard to see all active filters at once, inconsistent with sidebar/modal pattern.

**Instead:** Separate filter toolbar/sidebar. Table shows filtered results, filters live outside.

**Current Pattern (Correct):**
- FilterSidebar separate from visualizations
- CommandBar separate from transactions table

### Anti-Pattern 5: Different Filter Styles Per Page

**What:** Explorer uses dark rounded cards, Transactions uses light flat inputs.

**Why bad:** Inconsistent UX, users confused when navigating between pages, feels like two different apps.

**Instead:** Consistent styling across all filter components. Use same primitives with same visual treatment.

**Current Status:** Mostly consistent (rounded-2xl, border-neutral-800, bg-neutral-950). Verify consistency across all pages.

## Scalability Considerations

| Concern | At 100 Transactions | At 10K Transactions | At 100K Transactions |
|---------|---------------------|---------------------|----------------------|
| Filter response time | Instant (client-side) | 50-100ms (server-side) | Debounce required, pagination |
| Search performance | String match | Indexed search | Full-text search (PostgreSQL) |
| Multi-select options | 10-20 items | 50-100 items | Searchable dropdown, virtualized list |
| Date range picker | Simple calendar | Preset + custom | Presets prominent, custom secondary |
| Active filter badges | 3-5 visible | 5-10, collapse extras | Show top 3, "more" dropdown |

**Recommendations:**
1. Always use searchable MultiSelectField for >10 options
2. Debounce search input at 300ms (current: immediate, needs fix)
3. Server-side pagination for >1000 results
4. Virtualized list for multi-select options >50

## Build Order Implications

Based on architecture patterns, recommended build order for UX improvements:

### Phase 1: Foundation (Filter State Architecture)
1. **Verify filter state types** (ExplorerFilterState, TransactionsFilterState) - already defined
2. **Verify URL parsing/building** (parseFilterState, buildSearchParams) - already defined
3. **Add debounced search** - currently immediate, needs 300ms debounce for performance

**Why first:** All components depend on consistent state flow. Debounce affects every search input.

### Phase 2: Shared Primitives Enhancement
1. **Verify AmountRangeControl** - already exists, review UX
2. **Verify MultiSelectField** - already exists, add count badges
3. **Build DateRangePicker** - preset dropdown + custom calendar (new)
4. **Build ActiveFilterBadges** - removable filter pills (new)

**Why second:** Primitives must work before compositions can use them.

### Phase 3: Page-Specific Compositions
1. **Explorer FilterSidebar** - consolidate duplicate search inputs
2. **Explorer CommandBar** - review quick filters, add active count
3. **Transactions CommandBar** - verify apply behavior
4. **Transactions AdvancedFilters** - verify modal UX

**Why third:** Compositions depend on primitives + state architecture.

### Phase 4: Consistency Polish
1. **Audit visual consistency** across all filter components (same styling)
2. **Add loading states** to filter-triggered data fetching
3. **Add empty state guidance** when filters produce no results

**Why last:** Polish after core functionality works.

## Key Architectural Decisions

| Decision | Chosen Approach | Rationale |
|----------|-----------------|-----------|
| Filter state location | URL search params (not useState) | Shareable, bookmarkable, back-button compatible |
| Filter primitive design | Callback-based props | Parent controls timing, validation, debouncing |
| Apply vs real-time | Apply for Transactions, real-time for Explorer | Task vs exploratory page contexts |
| Component organization | Page-specific compositions, shared primitives | Reuse without over-abstracting |
| State types | Per-page interfaces | Different filter dimensions, clear separation |

## Sources

- Next.js App Router project structure docs (nextjs.org/docs) — Colocation, private folders, route groups — HIGH confidence
- shadcn/ui Data Table patterns (ui.shadcn.com/docs/components/data-table) — Component composition, filter toolbar structure — HIGH confidence
- nuqs library docs (nuqs.dev) — URL state management, shallow routing, type-safe parsers — HIGH confidence
- React Hook Form + shadcn/ui patterns (ui.shadcn.com/docs/forms/react-hook-form) — Form composition, Controller pattern — HIGH confidence
- Codebase analysis (apps/web/src/) — Current patterns verified: MultiSelectField, AmountRangeControl, FilterSidebar, CommandBar — HIGH confidence
- TanStack Table patterns (WebSearch) — Filter state management, column filtering — MEDIUM confidence

---

*Architecture research for: Minance UX Improvements*
*Researched: 2026-03-31*