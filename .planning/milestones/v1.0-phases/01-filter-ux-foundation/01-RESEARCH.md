# Phase 1: Filter UX Foundation - Research

**Researched:** 2026-03-31
**Domain:** React Filter UI, URL State Management, Fuzzy Search, Debounce Patterns
**Confidence:** HIGH

## Summary

This phase delivers intuitive transaction filtering with clear visibility into active filters. Research confirms the codebase already has solid URL state synchronization patterns via `useSearchParams` + `useRouter` hooks, with well-tested filter parsing/building functions. The primary work involves consolidating duplicate search inputs, implementing fuzzy matching for the unified search, adding debounced input handling, and creating an ActiveFilterBadges component to display removable filter chips.

**Primary recommendation:** Build on existing patterns — extend the established URL state sync system, add Fuse.js for client-side fuzzy matching, implement use-debounce for 300ms input delay, and create a new ActiveFilterBadges component following the existing MultiSelectField styling patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single search input replacing both `query` and `merchant` inputs
- **D-02:** Fuzzy matching across merchant, description, notes, and tags fields
- **D-03:** Remove the duplicate "Filter by merchant" input from FilterSidebar.tsx (lines 98-106)
- **D-04:** Update placeholder text to indicate scope: "Search merchant, description, notes, tags..."
- **D-05:** Display removable filter badges outside filter panels
- **D-06:** Transactions: badges appear in CommandBar area, between search and Apply button
- **D-07:** Explorer: badges appear in sidebar header, below "Filters" title
- **D-08:** Each badge shows filter label with X button to remove
- **D-09:** Badge styling: pill-shaped, emerald accent, consistent with existing UI
- **D-10:** All filter state synced to URL search params
- **D-11:** Use Next.js `useSearchParams` and `useRouter` hooks
- **D-12:** Filters persist across page refresh and can be shared via URL
- **D-13:** Existing filter state objects (ExplorerFilterState, TransactionsFilterState) map to URL params
- **D-14:** 300ms debounce delay on search input changes
- **D-15:** Debounce at onChange handler level, not component level
- **D-16:** Use inline debounce or custom hook (researcher to recommend best approach)
- **D-17:** Applies to unified search input only; other filter changes immediate
- **D-18:** Clear all button visible only when filters are active
- **D-19:** Transactions: Add Clear all button to CommandBar, left of Apply button
- **D-20:** Explorer: Keep existing Clear all in sidebar header (lines 72-80)
- **D-21:** Clears all filters to default state (range: "90d" for Explorer, "all" for Transactions, others empty/default)

### Claude's Discretion

- Exact fuzzy matching algorithm/library choice
- Badge animation/transition details
- URL param naming conventions
- Error handling for URL state parsing
- Test coverage approach

### Deferred Ideas (OUT OF SCOPE)

- Date range presets (This Month, Last 30 Days, etc.) — Phase 2
- Multi-select for categories and accounts — Phase 2
- Visual polish (right-aligned amounts, color semantics) — Phase 2
- Loading states, empty states — Phase 2

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FILT-01 | Single unified search input replacing duplicate query/merchant inputs with fuzzy matching | Fuse.js 7.2.0 for fuzzy matching; consolidate FilterSidebar.tsx lines 89-106 into single input |
| FILT-02 | Active filter badges displayed outside filter panels with remove capability | Create ActiveFilterBadges component; existing activeFilterCount logic reusable; pill styling per D-09 |
| FILT-03 | URL state synchronization for all filters enabling shareable/bookmarkable filtered views | Existing `useSearchParams` + `useRouter` pattern confirmed in page.tsx files; `buildTransactionsFilterSearchParams` and `buildExplorerFilterSearchParams` functions exist |
| FILT-04 | Debounced search input (300ms delay) to reduce unnecessary API calls | use-debounce 2.8.9 recommended; `useDebouncedCallback` pattern for onChange handler |
| FILT-08 | Clear/reset all filters functionality | Existing `handleClearAll` in FilterSidebar.tsx (lines 42-57) provides pattern; add to TransactionsCommandBar per D-19 |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fuse.js | 7.2.0 | Fuzzy search for unified input | Industry standard for client-side fuzzy matching; threshold configurable; TypeScript support |
| use-debounce | 2.8.9 | Debounced input handling | Lightweight (<1KB); React-friendly hooks; SSR compatible; TypeScript types included |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.575.0 (existing) | Icons for badges (X button) | Already in project; consistent icon family |
| clsx + tailwind-merge (existing) | 2.1.1 + 3.5.0 | Badge styling utilities | Already used for conditional classes; `cn()` function exists |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fuse.js | MiniSearch 7.2.0 | MiniSearch more suited for full-text search with indexing; Fuse.js better for simple fuzzy matching on small datasets |
| use-debounce | Custom `setTimeout` hook | Custom hook avoids dependency but use-debounce handles edge cases (cancel, flush, maxWait) better |
| manual URL sync | nuqs 10.1.1 | nuqs provides type-safe URL state but adds 6KB; existing manual pattern already works and is tested |

**Installation:**
```bash
pnpm add fuse.js use-debounce --filter @minance/web
```

**Version verification:**
```
fuse.js: 7.2.0 (published 2025-09-16)
use-debounce: 2.8.9 (published 2026-02-27)
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── components/
│   └── filters/
│       ├── MultiSelectField.tsx      # (existing) Pattern reference
│       ├── AmountRangeControl.tsx    # (existing) Pattern reference
│       └── ActiveFilterBadges.tsx    # (NEW) Removable filter chips
│   └── ...
├── app/
│   ├── explorer/
│   │   ├── filters.ts                # ExplorerFilterState, URL builders
│   │   ├── components/
│   │   │   └── FilterSidebar.tsx     # Modify: consolidate search inputs
│   │   └── page.tsx                  # URL sync orchestration
│   └── transactions/
│   │   ├── filters.ts                # TransactionsFilterState, URL builders
│   │   ├── TransactionsCommandBar.tsx # Modify: add badges + Clear all
│   │   ├── TransactionsAdvancedFilters.tsx # Fix: "Rest" typo at line 214
│   │   └── page.tsx                  # URL sync orchestration
│   └── ...
└── hooks/
    └── useDebouncedSearch.ts         # (optional) Custom hook for search debounce
```

### Pattern 1: URL State Synchronization
**What:** All filter state stored in URL search params; page parses on load, updates on change
**When to use:** Shareable views, bookmark persistence, back-button compatibility
**Example:**
```typescript
// Source: apps/web/src/app/transactions/page.tsx (existing pattern)
const searchParams = useSearchParams();
const parsedFilters = useMemo(
  () => toValidFilterState(parseTransactionsFilterState(searchParams)),
  [searchParams]
);

// Sync to URL on filter change
const syncFilters = useCallback((nextFilters: TransactionsFilterState) => {
  const nextSearchParams = buildTransactionsFilterSearchParams(nextFilters);
  router.push(`/transactions?${nextSearchParams.toString()}`);
}, [router]);
```

### Pattern 2: Debounced Input Handling
**What:** Delay input-triggered actions to reduce API calls; immediate visual feedback
**When to use:** Search inputs, text filters where rapid typing triggers expensive operations
**Example:**
```typescript
// Source: use-debounce documentation, npm registry
import { useDebouncedCallback } from "use-debounce";

// In component:
const [query, setQuery] = useState("");
const debouncedOnChange = useDebouncedCallback(
  (value: string) => {
    // Trigger URL sync/API call after 300ms
    onChange({ query: value });
  },
  300
);

// Immediate local state, debounced parent update
<input
  value={query}
  onChange={(e) => {
    setQuery(e.target.value);       // Immediate UI feedback
    debouncedOnChange(e.target.value); // Debounced parent callback
  }}
/>
```

### Pattern 3: Fuzzy Search with Fuse.js
**What:** Multi-field fuzzy matching for unified search input
**When to use:** Single search box matching multiple text fields (merchant, description, notes, tags)
**Example:**
```typescript
// Source: Fuse.js docs (fusejs.io/api/options.html)
import Fuse from "fuse.js";

// Configure for moderate fuzzy matching
const fuse = new Fuse(transactions, {
  keys: ["merchant", "description", "notes", "tags"],
  threshold: 0.4,          // 0.4 = moderately strict (default 0.6)
  ignoreLocation: true,    // Match anywhere in string
  includeMatches: true,    // For highlighting matched text
  minMatchCharLength: 2    // Minimum 2 chars to match
});

// Search returns scored results
const results = fuse.search(query);
```

### Anti-Patterns to Avoid
- **Debouncing at component level:** Don't debounce the entire component render; debounce only the callback that triggers expensive operations (D-15)
- **Fuzzy threshold too loose:** Threshold above 0.6 returns too many irrelevant matches; finance users need precision
- **URL params not validated:** Invalid URL params must fall back gracefully (existing pattern in `toValidFilterState` handles this)
- **Badge state desync:** Badge count must match actual active filters; derive from filter state, not separate counter

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounce logic | Custom setTimeout/clearTimeout hook | use-debounce 2.8.9 | Edge cases (cancel, flush, maxWait), SSR compatibility, memory leak prevention |
| Fuzzy matching | String.includes() or regex | Fuse.js 7.2.0 | Configurable thresholds, multi-field search, scoring/ranking, TypeScript types |
| Badge animations | CSS keyframes manually | Tailwind CSS transitions (existing) | Project already uses Tailwind; `transition` class handles 150ms default |
| URL state parsing | Manual URLSearchParams parsing | Existing `parseTransactionsFilterState` / `parseExplorerFilterState` | Already tested, handles edge cases, validates values |

**Key insight:** The codebase has mature URL state patterns — extend rather than rebuild. Only new components are ActiveFilterBadges and the debounced search logic.

## Common Pitfalls

### Pitfall 1: Debounce Without Immediate Feedback
**What goes wrong:** User types but sees no visual response until debounce fires; feels laggy
**Why it happens:** Debouncing the entire state update, not just the expensive callback
**How to avoid:** Split into local state (immediate) + debounced parent callback (D-15 pattern)
**Warning signs:** Input value doesn't update until 300ms after typing stops

### Pitfall 2: Fuse.js Threshold Too Strict
**What goes wrong:** User searches "amazon" but "Amazon Prime" transaction not found
**Why it happens:** Threshold 0.0 requires perfect match; threshold 0.3 too strict for typos
**How to avoid:** Use threshold 0.4-0.5 for finance data; balance precision with tolerance
**Warning signs:** Users complain "search doesn't work" for obvious matches

### Pitfall 3: Badge State Desync
**What goes wrong:** Badge shows "3 filters" but clicking X removes wrong filter
**Why it happens:** Badge count stored separately from actual filter state
**How to avoid:** Derive badge list from filter state; remove callback updates state directly
**Warning signs:** Badge count different from actual applied filters

### Pitfall 4: URL State Lost on Clear
**What goes wrong:** Clear All sets state but URL still shows old params
**Why it happens:** Clear updates state but doesn't sync to URL
**How to avoid:** Clear All must call URL sync function (existing `syncFilters` pattern)
**Warning signs:** Refreshing page after Clear restores old filters

### Pitfall 5: Fuzzy Search on Empty Dataset
**What goes wrong:** Fuse.js crashes or returns undefined when transactions array empty
**Why it happens:** Fuse constructor expects non-empty array
**How to avoid:** Guard: `if (!transactions.length) return [];` before Fuse.search()
**Warning signs:** Console errors when page loads with no transactions

## Code Examples

Verified patterns from existing codebase and official docs:

### Unified Search Input with Debounce
```typescript
// Pattern: Immediate local state + debounced parent callback
// Source: use-debounce npm registry, D-15/D-16 decisions
import { useDebouncedCallback } from "use-debounce";

function UnifiedSearchInput({ filters, onChange }) {
  const [localQuery, setLocalQuery] = useState(filters.query);
  
  const debouncedOnChange = useDebouncedCallback(
    (value: string) => onChange({ query: value }),
    300
  );
  
  return (
    <input
      value={localQuery}
      onChange={(e) => {
        setLocalQuery(e.target.value);
        debouncedOnChange(e.target.value);
      }}
      placeholder="Search merchant, description, notes, tags..."
    />
  );
}
```

### ActiveFilterBadges Component
```typescript
// Pattern: Derive badges from filter state, pill styling
// Source: Existing MultiSelectField.tsx styling, D-05-D-09 decisions
interface ActiveFilterBadgesProps {
  filters: TransactionsFilterState | ExplorerFilterState;
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

function ActiveFilterBadges({ filters, onRemove, onClearAll }: ActiveFilterBadgesProps) {
  const activeFilters = useMemo(() => {
    const badges: Array<{ key: string; label: string }> = [];
    if (filters.query) badges.push({ key: "query", label: `Search: "${filters.query}"` });
    if (filters.categories.length) badges.push({ key: "categories", label: `${filters.categories.length} categories` });
    // ... derive all active filters
    return badges;
  }, [filters]);
  
  if (!activeFilters.length) return null;
  
  return (
    <div className="flex items-center gap-2">
      {activeFilters.map(({ key, label }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300"
        >
          {label}
          <button onClick={() => onRemove(key)} className="hover:text-emerald-100">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button onClick={onClearAll} className="text-xs text-neutral-400 hover:text-neutral-200">
        Clear all
      </button>
    </div>
  );
}
```

### URL State Sync (Existing Pattern)
```typescript
// Source: apps/web/src/app/transactions/filters.ts (verified)
export function buildTransactionsFilterSearchParams(filters: TransactionsFilterState): URLSearchParams {
  const defaults = createDefaultTransactionsFilterState();
  const searchParams = new URLSearchParams();

  if (filters.query) {
    searchParams.set("query", filters.query);
  }
  for (const category of filters.categories) {
    searchParams.append("category", category);
  }
  // ... all filter params
  return searchParams;
}

// In page.tsx:
const syncFilters = useCallback((nextFilters: TransactionsFilterState) => {
  const nextSearchParams = buildTransactionsFilterSearchParams(nextFilters);
  router.push(`/transactions?${nextSearchParams.toString()}`);
}, [router]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-select dropdowns for categories | MultiSelectField component | Already implemented | Users can filter by multiple categories |
| Filter count badge only | Active filter badges with remove buttons | This phase | Users see what's filtered, can dismiss individually |
| Separate query/merchant inputs | Unified fuzzy search input | This phase | Simpler UX, fewer inputs, smarter matching |
| Immediate search API calls | Debounced search (300ms) | This phase | Fewer API calls, better performance |

**Deprecated/outdated:**
- Duplicate search inputs in FilterSidebar.tsx lines 89-106: Remove, consolidate to single unified input
- "Rest" typo in TransactionsAdvancedFilters.tsx line 214: Fix to "Reset"

## Open Questions

1. **Fuzzy matching scope: client-side vs server-side**
   - What we know: D-02 specifies fuzzy matching across merchant, description, notes, tags
   - What's unclear: Should Fuse.js run on client (requires loading all transactions) or implement server-side fuzzy search?
   - Recommendation: Start with client-side Fuse.js for small datasets (<1000 transactions). If performance degrades, migrate to server-side matching in API layer.

2. **Badge animation timing**
   - What we know: D-09 specifies pill styling with emerald accent
   - What's unclear: Should badges animate on appear/disappear?
   - Recommendation: Use existing Tailwind `transition` class (150ms) for opacity changes. Avoid complex animations — finance UI favors clarity over motion.

3. **URL param naming for unified search**
   - What we know: Current params use `query` and `merchant` separately
   - What's unclear: Should unified search use `query` param name or new `search` param?
   - Recommendation: Keep `query` param name for backwards compatibility. Remove `merchant` param entirely.

## Environment Availability

> Phase has external dependencies for new libraries.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20+ | Runtime | Yes | 22 (CI), 20 (Docker) | — |
| pnpm 10.17.1 | Package manager | Yes | 10.17.1 | — |
| fuse.js | Fuzzy search | Needs install | — | Manual string matching (not recommended) |
| use-debounce | Input debounce | Needs install | — | Custom setTimeout hook (acceptable but less robust) |

**Missing dependencies with no fallback:**
- None blocking — both fuse.js and use-debounce are optional with manual alternatives

**Missing dependencies with fallback:**
- fuse.js → Manual `String.includes()` or regex (acceptable for MVP, loses fuzzy capability)
- use-debounce → Custom debounce hook (acceptable, loses edge-case handling)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner |
| Config file | None — uses `tsx --test` command |
| Quick run command | `pnpm test --filter @minance/web` |
| Full suite command | `pnpm test --filter @minance/web` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILT-01 | Unified search input replaces duplicate inputs | unit + visual | Manual verification | No — needs new test |
| FILT-01 | Fuzzy matching finds transactions across fields | unit | `tsx --test filters.test.ts` (extend existing) | Partial — filters.test.ts exists |
| FILT-02 | Active filter badges display outside panels | unit | Manual + component test | No — needs new test |
| FILT-02 | Badge X button removes individual filter | unit | Component test | No — needs new test |
| FILT-03 | URL state sync preserves filters | unit | `tsx --test filters.test.ts` (existing) | Yes — comprehensive tests exist |
| FILT-04 | Debounce delays search by 300ms | unit | Hook test | No — needs new test |
| FILT-08 | Clear all resets to defaults | unit | `tsx --test filters.test.ts` (extend) | Partial — existing tests cover defaults |

### Sampling Rate
- **Per task commit:** `pnpm test --filter @minance/web` (target <30s)
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/web/src/components/filters/ActiveFilterBadges.test.ts` — component rendering, remove behavior
- [ ] `apps/web/src/hooks/useDebouncedSearch.test.ts` — debounce timing, cancel/flush
- [ ] Extend `apps/web/src/app/explorer/filters.test.ts` — unified search param parsing
- [ ] Extend `apps/web/src/app/transactions/filters.test.ts` — unified search param parsing

## Sources

### Primary (HIGH confidence)
- [Codebase] `apps/web/src/app/transactions/filters.ts` — URL state patterns verified
- [Codebase] `apps/web/src/app/explorer/filters.ts` — URL state patterns verified
- [Codebase] `apps/web/src/components/filters/MultiSelectField.tsx` — Badge styling reference
- [npm registry] use-debounce 2.8.9 — API documentation
- [npm registry] fuse.js 7.2.0 — Version confirmed

### Secondary (MEDIUM confidence)
- [Fuse.js docs] fusejs.io/api/options.html — Configuration options (threshold, keys, includeMatches)
- [nuqs docs] nuqs.dev — URL state management patterns (considered, not selected)

### Tertiary (LOW confidence)
- None — all critical patterns verified from codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — fuse.js and use-debounce are mature libraries with stable APIs
- Architecture: HIGH — existing codebase patterns verified; extension not rewrite
- Pitfalls: HIGH — identified from codebase analysis and library documentation

**Research date:** 2026-03-31
**Valid until:** 90 days — libraries are stable, patterns are established