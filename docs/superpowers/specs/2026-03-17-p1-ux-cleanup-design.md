# P1 UX Cleanup Tasks Design Spec

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 P1 UX cleanup tasks: move export to Transactions, remove Taxonomy/Rules from Settings, make dashboard bar count dynamic, and sync filters between Explorer and Transactions.

**Architecture:** UI modifications across 4 files with a new shared filter utility module.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript

---

## Task 1: Move Export to Transactions (nbh.1)

### Overview
Remove non-functional Export button from Explorer and add a working CSV export to Transactions page that respects current filters.

### Changes

**File: `apps/web/src/app/explorer/components/ExplorerCommandBar.tsx`**
- Remove the Export button (lines 90-96)

**File: `apps/web/src/app/transactions/page.tsx`**
- Add Export button to the header actions area
- Implement `exportTransactionsToCsv()` function that:
  1. Fetches all transactions matching current filters (using pagination to get all)
  2. Converts to CSV format with headers: `date,merchant,category,amount,account,notes,type,tag`
  3. Triggers browser download

### CSV Export Logic
```typescript
async function exportTransactionsToCsv() {
  setIsExporting(true);
  try {
    // Fetch all matching transactions (paginated)
    const allTransactions = await fetchAllTransactions(filters);

    // Convert to CSV
    const headers = ['date', 'merchant', 'category', 'amount', 'account', 'notes', 'type', 'tag'];
    const rows = allTransactions.map(t => [
      t.date,
      t.merchant,
      t.category,
      t.amount.toString(),
      t.account,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.type,
      t.tag || ''
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    setIsExporting(false);
  }
}
```

---

## Task 2: Remove Taxonomy & Rules from Settings (nbh.3)

### Overview
Remove the "Taxonomy & Rules" section from Settings page, including category and rule input forms. Categorization is handled by LLM inference, not manual rules.

### Changes

**File: `apps/web/src/app/settings/page.tsx`**

1. Remove state variables:
   - `rulePattern`
   - `ruleCategory`
   - Keep `categories` and category-related state for display purposes

2. Remove `addRule()` function

3. Remove Section Map link to "Taxonomy & rules"

4. Remove the entire `<section id="settings-taxonomy-rules">` element

5. Keep only:
   - Data Controls section (import/export)
   - Integrations section (AI settings, help)

### Simplified Settings Layout
After removal, Settings will have:
- Section Map (2 links: Data import/export, Integrations)
- Data Controls (CSV Import, Export Snapshot)
- Integrations (AI provider settings, Help & support)

---

## Task 3: Dynamic Dashboard Bar Count (nbh.5)

### Overview
Make the dashboard trend chart bar count respond to the selected date range instead of being fixed at 6 bars.

### Bar Count Logic

| Range | Periods | Granularity |
|-------|---------|-------------|
| `7d` | 7 | Daily |
| `14d` | 14 | Daily |
| `30d` | 4 | Weekly |
| `90d` | 3 | Monthly |
| `180d` | 6 | Monthly |
| `1y` | 12 | Monthly |
| `all` | All available (max 24) | Monthly |

### Changes

**File: `apps/web/src/app/page.tsx`**

1. Replace hardcoded `slice(-6)` with dynamic logic:

```typescript
const trendBars = useMemo(() => {
  const trend = overview?.trend || [];
  const barCount = getBarCountForRange(range, trend.length);

  return trend.slice(-barCount).map((entry) => {
    // ... existing bar calculation
  });
}, [overview, range]);

function getBarCountForRange(range: string, availableLength: number): number {
  const rangeToCount: Record<string, number> = {
    '7d': 7,
    '14d': 14,
    '30d': 4,
    '90d': 3,
    '180d': 6,
    '1y': 12,
    'all': Math.min(availableLength, 24)
  };
  return rangeToCount[range] || 6;
}
```

**Note:** This assumes the backend returns monthly data. For daily/weekly granularity, backend changes may be needed. For now, use slice logic to show appropriate number of bars from monthly data.

---

## Task 4: Filter Sync Between Explorer and Transactions (nbh.7)

### Overview
Persist and share filter state between Explorer and Transactions pages so navigating between them preserves the user's filtering context.

### Shared Filter State

Create a shared filter utility that both pages use.

**New File: `apps/web/src/lib/sharedFilters.ts`**

```typescript
export interface SharedFilterState {
  range: string;
  start: string;
  end: string;
  categories: string[];
  accounts: string[];
  query: string;
  tag: string;
  transactionTypes: string[];
  categoryView: 'granular' | 'coarse';
}

const SHARED_FILTERS_KEY = 'minance:shared-filters';

export function getSharedFilters(): SharedFilterState {
  // Read from sessionStorage
}

export function setSharedFilters(filters: Partial<SharedFilterState>): void {
  // Write to sessionStorage
}

export function clearSharedFilters(): void {
  // Reset to defaults
}
```

### Integration

**Explorer (`apps/web/src/app/explorer/page.tsx`):**
- On filter change, call `setSharedFilters()` with common fields
- On mount, read `getSharedFilters()` and apply to local state
- Keep page-specific filters (`perspective`, `compare`, `direction`, `merchant`, `minAmount`, `maxAmount`) local

**Transactions (`apps/web/src/app/transactions/page.tsx`):**
- On filter change, call `setSharedFilters()` with common fields
- On mount, merge URL params with `getSharedFilters()` (URL params take precedence)
- Keep page-specific filters (`page`, `minAmount`, `maxAmount`) local

### Shared vs Local Filters

| Filter | Shared | Notes |
|--------|--------|-------|
| `range` | Yes | Date range preset |
| `start` / `end` | Yes | Custom date range |
| `categories` | Yes | Selected categories |
| `accounts` | Yes | Selected accounts |
| `query` | Yes | Search text |
| `tag` | Yes | Tag filter |
| `transactionTypes` | Yes | Expense/income/transfer |
| `categoryView` | Yes | Granular vs coarse |
| `perspective` | No | Explorer-only |
| `compare` | No | Explorer-only |
| `direction` | No | Explorer-only |
| `merchant` | No | Explorer-only |
| `page` | No | Transactions-only |

---

## Implementation Order

1. **Task 2: Remove Taxonomy/Rules** - Simplest, removes code
2. **Task 1: Export to Transactions** - Adds export functionality
3. **Task 3: Dynamic Dashboard Bars** - UI logic change
4. **Task 4: Filter Sync** - Most complex, affects multiple files

---

## Files Modified

| File | Task | Change Type |
|------|------|-------------|
| `apps/web/src/app/settings/page.tsx` | nbh.3 | Modify (remove section) |
| `apps/web/src/app/explorer/components/ExplorerCommandBar.tsx` | nbh.1 | Modify (remove button) |
| `apps/web/src/app/transactions/page.tsx` | nbh.1, nbh.7 | Modify (add export, filter sync) |
| `apps/web/src/app/page.tsx` | nbh.5 | Modify (dynamic bars) |
| `apps/web/src/app/explorer/page.tsx` | nbh.7 | Modify (filter sync) |
| `apps/web/src/lib/sharedFilters.ts` | nbh.7 | Create (new utility) |

---

## Verification

- [ ] TypeScript compiles: `cd apps/web && npx tsc --noEmit`
- [ ] Lint passes: `cd apps/web && npm run lint`
- [ ] Manual testing:
  - Export button removed from Explorer
  - Export button works in Transactions (downloads CSV)
  - Taxonomy/Rules section removed from Settings
  - Dashboard bars change count with range selection
  - Filters persist when navigating between Explorer and Transactions