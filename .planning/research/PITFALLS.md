# Pitfalls Research

**Domain:** Personal Finance App UX Polish
**Researched:** 2026-03-31
**Confidence:** MEDIUM (WebSearch findings verified with codebase analysis; shadcn/ui docs HIGH confidence)

## Critical Pitfalls

### Pitfall 1: Duplicate Search Inputs

**What goes wrong:**
Two search inputs appear side-by-side (e.g., "Search transactions..." and "Filter by merchant...") with similar styling and icons. Users don't understand which to use, leading to confusion and incorrect filtering expectations.

**Why it happens:**
Developers implement multiple search dimensions independently without considering the user's mental model. "Query" searches description/notes, "Merchant" searches merchant field - but users see them as redundant search boxes.

**How to avoid:**
- Single prominent search input that searches across all relevant fields
- If multiple search dimensions needed, use clear labels differentiating scope (e.g., "Search all fields" vs "Find specific merchant")
- Consider combining into one input with search scope selector dropdown

**Warning signs:**
- Multiple inputs with same icon and similar placeholder text
- Users asking "which search box should I use?"
- Feedback that search "doesn't work" when they typed in wrong box

**Phase to address:**
Phase 1 (Filter UX Improvements) - Immediate pain point identified in PROJECT.md

---

### Pitfall 2: Hidden Active Filters

**What goes wrong:**
A badge shows filter count (e.g., "3") but users cannot see WHAT filters are active without opening the filter panel. They wonder why results look different than expected.

**Why it happens:**
Developers implement filter count badge but stop there - forgetting users need to see the actual filter values to understand their data view.

**How to avoid:**
- Show active filters as visible chips/tags near the data display
- Each chip should be dismissable (click to remove that filter)
- Group chips by category (Date: Last 30 days, Category: Groceries)
- Always show "Clear all" option

**Warning signs:**
- Badge showing just a number without filter names visible
- Users surprised by empty results when filters are active
- Support requests asking "where are my transactions?"

**Phase to address:**
Phase 1 (Filter UX Improvements) - Core to making filters usable

---

### Pitfall 3: Inconsistent Apply Behavior

**What goes wrong:**
Some pages have explicit "Apply" buttons, others apply filters immediately on change. Users don't know whether to click Apply or wait. They either make unintended filter changes or wait for nothing to happen.

**Why it happens:**
Different pages implemented by different developers or at different times. No unified interaction pattern established. React state updates naturally trigger immediate changes, but developers add Apply buttons inconsistently.

**How to avoid:**
- Establish one clear pattern across ALL pages
- For complex filters (multiple fields): Use draft + Apply pattern (changes staged until Apply clicked)
- For simple filters (single dropdown): Immediate apply is acceptable
- Never mix patterns on the same page

**Warning signs:**
- Apply button present on one page, absent on similar page
- Users clicking Apply when it's unnecessary (immediate apply pages)
- Users waiting for results after filter changes (Apply button pages)

**Phase to address:**
Phase 1 (Filter UX Improvements) - Must be consistent across Explorer and Transactions

---

### Pitfall 4: Filters Not in URL State

**What goes wrong:**
Filter state lives only in React component state. Users cannot bookmark a filtered view, share links to specific queries, or return to their filter state after browser refresh.

**Why it happens:**
React state is easier to implement than URL synchronization. Developers underestimate the importance of shareable/sharable views in finance apps where users have recurring queries.

**How to avoid:**
- Store filter state in URL query parameters (e.g., `?range=90d&category=Groceries`)
- Use Next.js router to sync URL with component state
- On page load, parse URL params into initial filter state
- When filters change, update URL without full page navigation

**Warning signs:**
- Users complaining they "lost their filters" after refresh
- Bookmarks not preserving the filtered view
- No way to share specific transaction query with spouse/accountant

**Phase to address:**
Phase 2 (Visual/Layout Polish) - URL state affects broader UX, not just filters

---

### Pitfall 5: Single-Select for Multi-Value Fields

**What goes wrong:**
Fields that should accept multiple values (e.g., categories, accounts) are implemented as single-select dropdowns. Users can only pick one category when they want to see transactions from multiple categories.

**Why it happens:**
HTML `<select>` is simpler to implement than multi-select. Developer assumes users only need one filter at a time without consulting UX requirements.

**How to avoid:**
- Use multi-select component (shadcn/ui has MultiSelectField pattern)
- Show selected values as chips inside the dropdown trigger
- Allow "All" option to clear selections
- Consider faceted filter UI where multiple checkboxes are visible

**Warning signs:**
- Dropdown for field that logically should accept multiple values
- Users asking "how do I see transactions from two accounts?"
- Category filter resetting previous category when new one selected

**Phase to address:**
Phase 1 (Filter UX Improvements) - Already partially addressed (MultiSelectField exists), need to ensure consistency

---

### Pitfall 6: No Filter Loading Feedback

**What goes wrong:**
When user changes filters, data reloads silently. No loading indicator, no "updating..." message. Page appears frozen or stale while data fetches. Users click again, causing duplicate requests.

**Why it happens:**
Developers focus on filter state management and forget the visual feedback loop. Loading states feel like extra work for "quick" filter changes.

**How to avoid:**
- Show loading spinner or skeleton during data fetch
- Disable Apply button while request pending
- Use optimistic UI for immediate feedback, show spinner for server confirmation
- Consider debouncing rapid filter changes

**Warning signs:**
- No visual change when filters applied
- Users clicking multiple times
- Delay between filter change and data update

**Phase to address:**
Phase 3 (Interaction Pattern Refinements) - Loading feedback applies broadly

---

### Pitfall 7: Empty Results Without Explanation

**What goes wrong:**
Filters return zero results. Page shows empty table with no explanation. Users wonder if it's a bug, if data is missing, or if their filters are too restrictive.

**Why it happens:**
Developers handle "data loaded successfully" but forget the "no data matched filters" edge case. Empty state feels like an afterthought.

**How to avoid:**
- Clear message: "No transactions match your filters"
- Show active filters summary in empty state
- Suggest actions: "Try adjusting date range" or "Clear filters"
- For truly empty data (new user): Different message "Add your first transaction"

**Warning signs:**
- Empty table with no message
- Users thinking the app is broken
- Support tickets asking "where's my data?"

**Phase to address:**
Phase 1 (Filter UX Improvements) - Empty states are core to filter UX

---

### Pitfall 8: Custom Date Range UX Gap

**What goes wrong:**
Date range dropdown has "Custom Range" option. Selecting it reveals two bare date inputs with no guidance. Users don't know which is start/end, make errors, get confused results.

**Why it happens:**
Developer adds custom option without UX consideration. HTML date inputs are generic - no labels, no validation feedback.

**How to avoid:**
- Clear labels: "From [start date]" and "To [end date]"
- Validate: end date must be >= start date
- Show error message if invalid range selected
- Consider date picker component with visual calendar
- Default to sensible range (e.g., last 30 days to today)

**Warning signs:**
- Date inputs with just "Start" / "End" placeholders
- No validation when end < start
- Users entering wrong dates and getting unexpected results

**Phase to address:**
Phase 1 (Filter UX Improvements) - Date filtering is critical for finance apps

---

### Pitfall 9: Amount Range Input UX

**What goes wrong:**
Min and Max amount inputs are side-by-side with no visual connection. No indication they work together. Users enter only one value and don't understand results.

**Why it happens:**
Two separate inputs feel "cleaner" to developers than a combined range slider or explicit "between X and Y" UX.

**How to avoid:**
- Visual grouping: bracket around both inputs, or labeled "Between"
- Single slider with min/max handles (for approximate filtering)
- Show "$" prefix to clarify it's money
- Validate: max >= min
- Allow "no max" / "no min" states clearly

**Warning signs:**
- Two separate inputs with no grouping
- No currency symbol
- No validation when max < min

**Phase to address:**
Phase 1 (Filter UX Improvements) - Amount filtering needs polish

---

### Pitfall 10: Data Table Scannability Issues

**What goes wrong:**
Tables lack visual hierarchy. No zebra striping, inconsistent alignment (numbers should be right-aligned), too many columns. Users lose their place while scanning transaction lists.

**Why it happens:**
Developers focus on getting data displayed, not on readability. CSS styling feels secondary to functionality.

**How to avoid:**
- Right-align numbers (amounts, balances)
- Left-align text (descriptions, categories)
- Use subtle row separation (zebra striping or borders)
- Sticky headers for scrolling
- Limit columns shown; use expandable rows or tooltips for details
- Consistent spacing and padding

**Warning signs:**
- Amounts left-aligned with text
- No visual row separation
- Headers scroll away
- 10+ columns cramped into view

**Phase to address:**
Phase 2 (Visual/Layout Polish) - Table styling is core visual polish

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Filter state in React only | Faster to implement | Users lose filters on refresh, can't share/bookmark views | Never for finance apps |
| Single `<select>` for multi-value | Simpler component | Users frustrated they can't multi-select | MVP only, replace before release |
| Skip empty state handling | Less code to write | Users think app is broken when filters empty results | Never |
| No loading indicators | Cleaner initial render | Users confused during data fetch, click multiple times | Never |
| Inline filter styles | Quick styling | Inconsistent appearance, hard to maintain | Never - use Tailwind/shadcn patterns |
| Skip URL sync | Less state management code | No sharable views, bookmarks broken | Never for views users want to save |

## Integration Gotchas

Common mistakes when using shadcn/ui and TanStack Table.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| shadcn/ui DataTable | Over-abstracting into one monolithic component | Build per-use-case, extract patterns only when reused |
| TanStack Table | Client-side filtering for large datasets | Server-side filtering with API params for real data |
| TanStack Table | Forgetting getSortedRowModel() | Include all needed row models in useReactTable config |
| shadcn/ui MultiSelect | Not handling isOpen state properly | Track open state, close others when one opens (prevent overlap) |
| shadcn/ui Dialog | Using for filters instead of inline panel | Inline panel for frequent adjustments, dialog for advanced/occasional filters |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Client-side filtering on all data | Slow render, laggy search | Server-side filtering with API params | 500+ transactions |
| No debouncing on search input | Excessive re-renders, API spam | Debounce onChange, use useDeferredValue or setTimeout | Any live search |
| Re-rendering entire table on filter change | Sluggish UI | Use React.memo on rows, memoize filtered data | 100+ visible rows |
| No pagination (showing all rows) | Long scroll, slow render | Pagination with 25-50 rows per page | 200+ transactions |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Financial data in URL params (full amounts) | Visible in browser history, bookmarks | Use IDs or ranges in URL, not exact values |
| Filter values from URL without sanitization | XSS via crafted URLs | Parse and validate URL params, never render raw |
| Stored filter views without auth check | User A sees User B's saved filters | Associate saved views with authenticated user |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Two similar search inputs | Confusion about which to use | Single search input or clearly differentiated scope |
| Badge count without filter names | Can't see what's filtered | Chips showing each active filter |
| Apply button inconsistently | Uncertainty about when filters take effect | Consistent pattern: draft+Apply for complex, immediate for simple |
| No empty state message | Think app is broken | Clear "No results" + suggestions |
| Date inputs without labels | Enter wrong dates, get wrong results | "From" / "To" labels + validation |
| Amount inputs not grouped | Don't realize they work together | "Between X and Y" visual grouping |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Filter Sidebar:** Often missing active filter chips visible outside panel - verify users can see what's filtered without opening panel
- [ ] **Search Input:** Often missing debouncing - verify rapid typing doesn't spam updates
- [ ] **Apply Button:** Often missing loading state - verify button shows spinner/disabled during fetch
- [ ] **Empty Results:** Often missing explanation - verify "No results" message appears, not just blank table
- [ ] **URL State:** Often missing entirely - verify filters persist in URL after page refresh
- [ ] **Multi-select:** Often missing for category/account fields - verify multiple selections possible
- [ ] **Date Custom:** Often missing validation - verify end >= start enforced
- [ ] **Amount Range:** Often missing validation - verify max >= min enforced
- [ ] **Accessibility:** Often missing ARIA labels - verify screen reader can navigate filters

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate search inputs | LOW | Combine into single input, remove duplicate |
| Hidden active filters | MEDIUM | Add chips component, integrate with filter state |
| Inconsistent Apply | MEDIUM | Unify pattern across pages, update interaction model |
| No URL state | HIGH | Implement URL sync retroactively, handle param parsing |
| Single-select for multi-value | MEDIUM | Replace with MultiSelectField, update filter state shape |
| No loading feedback | LOW | Add spinner/skeleton to data loading state |
| Empty state missing | LOW | Add conditional rendering for empty results |
| Date UX gap | LOW | Add labels, validation to existing inputs |
| Amount UX gap | LOW | Add grouping, validation to existing inputs |
| Table scannability | MEDIUM | Restyling, may require layout changes |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Duplicate search inputs | Phase 1 (Filter UX) | Walkthrough: single search input on each page |
| Hidden active filters | Phase 1 (Filter UX) | Test: apply filters, see chips without opening panel |
| Inconsistent Apply | Phase 1 (Filter UX) | Test: same interaction pattern on Explorer and Transactions |
| Single-select for multi-value | Phase 1 (Filter UX) | Test: select multiple categories, see all results |
| Empty state missing | Phase 1 (Filter UX) | Test: restrictive filters, see "No results" message |
| Custom date UX gap | Phase 1 (Filter UX) | Test: custom range, clear labels and validation |
| Amount range UX gap | Phase 1 (Filter UX) | Test: amount filter, visual grouping present |
| No URL state | Phase 2 (Visual/Layout) | Test: bookmark filtered view, reload preserves filters |
| Table scannability | Phase 2 (Visual/Layout) | Visual review: alignment, spacing, headers sticky |
| No loading feedback | Phase 3 (Interactions) | Test: apply filter, see loading indicator |

## Codebase-Specific Findings

Analysis of current Minance implementation reveals these specific issues:

### FilterSidebar.tsx Issues
1. **Two search inputs** (lines 88-106): `query` and `merchant` inputs with identical styling - users won't know which to use
2. **Single-select for categories** (lines 172-185): Uses `<select>` but categories is an array field
3. **Single-select for transactionTypes** (lines 231-240): Same issue
4. **Active filter count badge** (lines 66-71): Shows number but NOT filter values visible

### TransactionsCommandBar.tsx Issues
1. **Has Apply button** (lines 63-69): Explicit Apply pattern
2. **Filter count badge** (line 79-83): Shows count but not filter names

### ExplorerCommandBar.tsx Issues
1. **No Apply button**: Filters apply immediately on change (inconsistent with Transactions)
2. **Compare toggle** (lines 68-79): Interesting pattern but different from other filter buttons

### TransactionsAdvancedFilters.tsx Issues
1. **"Rest" button typo** (line 214): Button says "Rest" instead of "Reset"
2. **Custom date inputs** (lines 186-205): Bare inputs with minimal labels

### Positive Patterns Found
1. **MultiSelectField component exists**: Used in advanced filters for categories/accounts
2. **AmountRangeControl component exists**: Dedicated component for amount filtering
3. **Test IDs present**: Good testing discipline with data-testid attributes
4. **ARIA labels on inputs**: Accessibility considered
5. **Draft pattern in ExplorerAdvancedFilters**: Changes staged until Apply clicked

## Sources

- shadcn/ui Data Table Documentation (HIGH confidence): https://ui.shadcn.com/docs/components/data-table
- NN/g Search Interface Mistakes (MEDIUM confidence): https://www.nngroup.com/articles/search-visible-and-simple/
- WebSearch data table UX patterns (LOW confidence - general web search results)
- Codebase analysis of Minance filter components (HIGH confidence - direct file reading)
- PROJECT.md and CONCERNS.md project context (HIGH confidence - project files)

---
*Pitfalls research for: Personal Finance App UX Polish*
*Researched: 2026-03-31*