# Page Responsibility Redesign Plan

## Goal
Eliminate duplicate functionality across Dashboard, Explorer, and Transactions pages by clearly defining distinct responsibilities for each.

## Current Problems
1. **KPI Cards**: Duplicated on Dashboard and Explorer
2. **Trend Charts**: Present on all three pages
3. **Category Breakdowns**: Present on Dashboard, Explorer, and Transactions
4. **Unclear User Flow**: Users don't know when to use Explorer vs Dashboard

## Proposed Page Responsibilities

### 1. Dashboard → "Financial Overview" (At-a-Glance)
**Purpose**: Quick health check. Answer "How am I doing financially?" in 5 seconds.

**Features**:
- 4 KPI cards (Net Flow, Spent, Income, Recurring) - clickable to drill down to Transactions
- Simple spending trend sparkline (6 months, no interaction)
- Top 5 categories list
- Top 5 merchants list
- Recent transactions preview (last 5)
- Quick action buttons (Add Transaction, Import CSV)

**Remove**:
- Saved views (move to Explorer)
- Heatmap (move to Explorer)
- Anomalies (move to Explorer)
- Detailed trend chart

### 2. Explorer → "Analytics & Insights" (Deep Dive)
**Purpose**: Answer specific financial questions through flexible analysis.

**Features**:
- Full filter sidebar with all options (date range, accounts, categories, tags, merchants, amount range)
- Interactive visualizations with drill-down:
  - Trend chart (click month to filter)
  - Category breakdown (click to filter)
  - Account breakdown
  - Merchant analysis
  - Spending heatmap (from Dashboard)
  - Anomalies detection (from Dashboard)
- Saved views with name and filter state
- Export to CSV
- Period comparison mode

**Remove**:
- KPI cards (redundant, Dashboard is the KPI view)

### 3. Transactions → "Transaction Management" (The Ledger)
**Purpose**: CRUD operations on individual transactions. The detailed record view.

**Features**:
- Transaction table with pagination
- Simple filters (search, date range, type, category, account)
- Bulk actions (review status, delete, edit category/tags)
- Inline editing
- Quick-add transaction form

**Remove**:
- Spending trend chart
- Category breakdown bars

## Implementation Phases

### Phase 1: Simplify Transactions Page
**Goal**: Remove analytics widgets, focus on table management.

**Changes**:
1. Remove trend chart section from `apps/web/src/app/transactions/page.tsx`
2. Remove category breakdown section from `apps/web/src/app/transactions/page.tsx`
3. Keep: transaction table, filters, bulk actions, inline editing

**Files to modify**:
- `apps/web/src/app/transactions/page.tsx`

**Estimated effort**: 1-2 hours
**Breaking changes**: None (visual only)

---

### Phase 2: Consolidate Analytics into Explorer
**Goal**: Make Explorer the single source for advanced analysis.

**Changes**:
1. Move spending heatmap from Dashboard to Explorer
   - Create `apps/web/src/app/explorer/components/SpendingHeatmap.tsx`
   - Add to VisualizationGrid
2. Move anomalies from Dashboard to Explorer
   - Create `apps/web/src/app/explorer/components/Anomalies.tsx`
   - Add to VisualizationGrid
3. Move saved views from Dashboard to Explorer
   - Create `apps/web/src/app/explorer/components/SavedViews.tsx`
   - Add to Explorer page layout
4. Remove KPI cards from Explorer (visualization focus only)

**Files to modify**:
- `apps/web/src/app/explorer/page.tsx`
- `apps/web/src/app/explorer/components/VisualizationGrid.tsx`
- `apps/web/src/app/explorer/components/KpiCards.tsx` (delete)
- Create new components

**Estimated effort**: 4-6 hours
**Breaking changes**: Saved views will move URLs (from Dashboard to Explorer)

---

### Phase 3: Refocus Dashboard as Overview
**Goal**: Streamline Dashboard to be a quick-glance summary.

**Changes**:
1. Simplify trend chart to sparkline style (smaller, non-interactive)
2. Add Recent Transactions preview section (last 5 transactions)
3. Add Quick Actions section (Add Transaction, Import CSV buttons)
4. Remove saved views section
5. Remove heatmap section
6. Remove anomalies section
7. Keep: KPI cards (make them more prominent), Top categories, Top merchants

**Files to modify**:
- `apps/web/src/app/page.tsx`

**Estimated effort**: 3-4 hours
**Breaking changes**: None (visual reorganization only)

---

### Phase 4: Update Navigation & Labels
**Goal**: Make page purposes clearer through navigation.

**Changes**:
1. Update Sidebar labels if needed:
   - Consider "Analytics" instead of "Explorer" (optional)
2. Add descriptive subtitles to each page header
3. Ensure drill-down links work correctly:
   - Dashboard KPIs → Transactions (filtered)
   - Explorer visualizations → Transactions (filtered)

**Files to modify**:
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/explorer/page.tsx`
- `apps/web/src/app/transactions/page.tsx`

**Estimated effort**: 1 hour
**Breaking changes**: None

---

### Phase 5: Testing & Verification
**Goal**: Ensure all functionality still works after consolidation.

**Test Plan**:
1. Dashboard loads and shows KPIs correctly
2. Dashboard drill-down links navigate to Transactions with correct filters
3. Explorer shows all visualizations
4. Explorer filters work and sync to URL
5. Explorer saved views create/load/delete correctly
6. Transactions table loads and filters correctly
7. Transaction inline editing works
8. Bulk actions work

**Files to check**:
- E2E tests in `e2e/specs/` may need updates

**Estimated effort**: 2-3 hours

## Migration Notes

### Saved Views Migration
- Saved views stored in database have filter states
- These will continue to work as they store `range` and `categoryView`
- URL-based view loading will need to redirect from `/` to `/explorer`

### Drill-Down Links
- Dashboard KPI cards use `buildTransactionsDrillDownUrl()` → stays the same
- Explorer will need similar drill-down functions → create `buildTransactionsUrlFromExplorer()`

## Total Estimated Effort
- Phase 1: 1-2 hours
- Phase 2: 4-6 hours
- Phase 3: 3-4 hours
- Phase 4: 1 hour
- Phase 5: 2-3 hours
- **Total: 11-16 hours**

## Success Criteria
1. Each page has a clearly distinct purpose with no overlapping widgets
2. Users can articulate when to use each page
3. Navigation between pages feels natural (Overview → Analyze → Manage)
4. All existing functionality is preserved (just reorganized)
5. No 404s or broken drill-down links
