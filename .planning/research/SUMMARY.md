# Project Research Summary

**Project:** Minance UX/Design Tooling
**Domain:** Personal Finance Application UX Polish
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

Minance is a personal finance web application built on Next.js 16 with React 19 and Tailwind CSS 4. Research across stack, features, architecture, and pitfalls reveals a clear path: the codebase has solid foundations but needs UX polish to feel production-ready. The primary pain points are filter UX inconsistencies (duplicate search inputs, hidden active filters, inconsistent apply patterns) and missing table stakes features (loading states, empty states, input validation).

The recommended approach is a phased implementation starting with filter UX architecture (URL state sync, debounced search, visible filter badges), followed by shared primitive enhancements (DateRangePicker, ActiveFilterBadges components), then page-specific compositions, and finally consistency polish. This order ensures foundational state management is correct before building UI on top of it.

Key risks include performance degradation at scale (need debouncing and server-side filtering), filter state confusion from inconsistent apply patterns between Explorer (immediate) and Transactions (explicit apply), and duplicate search inputs confusing users. Mitigation requires establishing consistent patterns early and validating with real user testing.

## Key Findings

### Recommended Stack

The codebase uses a modern, well-suited stack for finance app UX. Next.js 16 App Router provides excellent patterns for loading states and data fetching; React 19 supports concurrent features; Tailwind CSS 4 enables custom finance-specific design. The stack research recommends adding React Hook Form + Zod for form validation, TanStack Table for data tables with sorting/filtering, and Sonner for toast notifications.

**Core technologies:**
- Next.js 16.1.6 + React 19.2.3: Full-stack framework with App Router — excellent for loading states, error boundaries, and streaming
- Tailwind CSS 4.x: Styling framework — headless approach enables custom finance design patterns
- shadcn/ui: Component library — copy-paste components for forms, tables, dialogs without bundle overhead
- React Hook Form + Zod: Form management — critical for transaction editing UX with type-safe validation
- TanStack Table 8.x: Data tables — headless, supports sorting, filtering, pagination, row selection
- Sonner: Toast notifications — minimal, non-blocking feedback for save/delete actions

**Supporting additions:**
- cmdk: Command palette for keyboard-first navigation (power users)
- @tanstack/react-virtual: Virtual scrolling for 100+ transaction lists
- date-fns: Date manipulation for custom date range filtering

### Expected Features

Feature research identifies a clear distinction between table stakes (users expect these) and polish indicators (competitive differentiators). For MVP polish, focus on eight core features: visual hierarchy, responsive tables, inline validation, loading states, empty states, toast notifications, basic filters, and error recovery.

**Must have (table stakes):**
- Clear visual hierarchy — proper spacing, typography scale, section grouping
- Responsive data tables — sortable columns, clear row hover, mobile-friendly
- Inline form validation (on blur) — prevents errors on critical financial data entry
- Loading states — skeleton screens for tables, spinners for actions
- Empty states with guidance — illustrations, clear CTAs, explain what will appear
- Toast notifications — 3-5 second success/error feedback
- Basic filter UI — search, column filters, date range
- Error recovery — clear messages, preserve user input

**Should have (competitive):**
- Optimistic UI updates — actions feel instant, roll back on error
- URL state sync for filters — shareable links, browser back button works
- Active filter badges — see what's filtered at a glance with dismiss option
- Keyboard shortcuts — power users navigate faster (Cmd+K pattern)
- Bulk actions — select multiple rows, batch categorize/delete
- Undo functionality — 5-10 second window for accidental actions

**Defer (v2+):**
- Saved filter presets — repeat common searches
- Data export (CSV) — user data control
- Advanced faceted filters — complex queries

### Architecture Approach

The codebase follows a URL-driven filter state pattern with colocated page components and shared filter primitives. This is the correct approach: URL as source of truth enables shareable views and back-button compatibility; per-page filter types maintain separation of concerns; callback-based primitives enable parent control over timing and debouncing.

**Major components:**
1. **Shared Filter Primitives** (`components/filters/`) — AmountRangeControl, MultiSelectField, DateRangePicker (to build), ActiveFilterBadges (to build)
2. **Page-Specific Compositions** — FilterSidebar (Explorer), TransactionsCommandBar + TransactionsAdvancedFilters (Transactions)
3. **Filter State Types** (`filters.ts` per page) — TransactionsFilterState, ExplorerFilterState with parsing/building/validation functions
4. **Page Orchestration** (`page.tsx`) — manages URL sync, composes filter components, triggers API calls

**Key architectural decisions:**
- URL search params for filter state (shareable, bookmarkable, back-button compatible)
- Callback-based primitive props (parent controls timing, validation, debouncing)
- Apply for Transactions (task-focused, server-side filtering), real-time for Explorer (exploratory, immediate feedback)
- Draft + Apply pattern for complex filter changes, immediate for simple dropdowns

### Critical Pitfalls

The research identified 10 critical pitfalls in the current implementation, with specific codebase issues documented. The top issues are duplicate search inputs confusing users, hidden active filters (badge shows count but not values), and inconsistent apply behavior between pages.

1. **Duplicate Search Inputs** — FilterSidebar.tsx has two search inputs (query and merchant) with identical styling. Users don't know which to use. Fix: consolidate into single smart search with scope indicator.
2. **Hidden Active Filters** — Badge shows count (e.g., "3") but users cannot see WHAT filters are active. Fix: show removable chips for each active filter.
3. **Inconsistent Apply Behavior** — Transactions has explicit Apply button; Explorer applies immediately. Users confused about when filters take effect. Fix: establish one pattern per page type, never mix on same page.
4. **Filters Not in URL State** — Can't bookmark/share filtered views. Fix: sync filter state to URL search params with shallow routing.
5. **Single-Select for Multi-Value Fields** — Categories/accounts use single select when users want to see multiple. Fix: use MultiSelectField component (already exists).

**Codebase-specific issues found:**
- FilterSidebar.tsx lines 88-106: duplicate search inputs
- FilterSidebar.tsx lines 172-185, 231-240: single-select for array fields
- FilterSidebar.tsx lines 66-71: count badge without filter values
- TransactionsAdvancedFilters.tsx line 214: "Rest" typo instead of "Reset"

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: Filter UX Foundation
**Rationale:** All components depend on consistent state flow. Must establish URL state sync, debounced search, and visible filter badges before building UI on top. Most critical pain points (duplicate inputs, hidden filters) are in filter UX.
**Delivers:** Consistent, usable filter experience across all pages
**Addresses:** Table stakes features (basic filter UI, loading states), competitive features (URL state sync, active filter badges)
**Avoids:** Pitfalls 1-5 (duplicate inputs, hidden filters, inconsistent apply, URL state, single-select)

**Key tasks:**
- Consolidate duplicate search inputs in FilterSidebar
- Build ActiveFilterBadges component (removable pills)
- Add URL state sync to all filter pages (shallow routing)
- Add debounced search (300ms) to prevent API spam
- Ensure MultiSelectField used for categories/accounts
- Add loading indicators to filter-triggered data fetches
- Add empty state guidance when filters return no results

### Phase 2: Shared Primitives Enhancement
**Rationale:** Primitives must work before compositions can use them. Build missing components and enhance existing ones with UX patterns.
**Delivers:** Production-ready filter building blocks
**Uses:** React Hook Form, Zod, TanStack Table, shadcn/ui components

**Key tasks:**
- Build DateRangePicker component (preset + custom calendar)
- Enhance AmountRangeControl with visual grouping and validation
- Add count badges to MultiSelectField options
- Implement consistent styling across all filter components
- Add ARIA labels and keyboard navigation for accessibility

### Phase 3: Page-Specific Compositions
**Rationale:** Compositions depend on primitives + state architecture. Focus on making each page's filter UX polished and consistent.
**Delivers:** Polished filter experience per page context
**Implements:** Command Bar vs Sidebar vs Modal patterns from architecture

**Key tasks:**
- Explorer FilterSidebar: remove duplicate search, add active badges, ensure real-time apply
- Transactions CommandBar: verify apply behavior, add loading state
- Transactions AdvancedFilters: fix "Rest" typo, verify modal UX
- Add toast notifications for save/delete actions
- Implement inline form validation for transaction editing

### Phase 4: Visual and Interaction Polish
**Rationale:** Polish after core functionality works. Address table scannability, loading states, empty states, and visual consistency.
**Delivers:** Production-ready feel, competitive polish
**Avoids:** Pitfalls 6-10 (loading feedback, empty states, date UX, amount UX, table scannability)

**Key tasks:**
- Add data table scannability improvements (right-align numbers, zebra striping, sticky headers)
- Implement optimistic UI updates for common actions
- Add keyboard shortcuts for power users (Cmd+K command palette)
- Audit and ensure visual consistency across all pages
- Add bulk actions (multi-select rows, batch categorize)
- Performance optimization for large transaction lists

### Phase Ordering Rationale

- **Phase 1 first:** Filter UX is the primary pain point documented in PROJECT.md. Without consistent state architecture, UI changes will break. Most pitfalls (1-5) are filter-related.
- **Phase 2 second:** Primitives must exist before compositions can use them. Missing components (DateRangePicker, ActiveFilterBadges) block progress.
- **Phase 3 third:** Compositions depend on primitives. Must fix foundation before polishing pages.
- **Phase 4 last:** Visual polish, optimistic UI, and performance are valuable but not blocking. Address after core UX is correct.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Already well-documented patterns in STACK.md and ARCHITECTURE.md. Standard implementation.
- **Phase 2:** DateRangePicker and MultiSelectField enhancements have established shadcn/ui patterns. Standard implementation.
- **Phase 3:** Page-specific compositions may need UX research for edge cases (e.g., advanced filter modal behavior with many options).
- **Phase 4:** Optimistic UI and bulk actions have complexity; may need additional research for error handling patterns.

Phases with standard patterns (skip research-phase):
- **Phase 1:** URL state sync, debouncing, and visible filter badges are well-documented.
- **Phase 2:** Component patterns in shadcn/ui and TanStack Table are established.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Technologies verified from codebase package.json, official docs referenced |
| Features | MEDIUM | WebSearch-based research from multiple UX sources, validated against codebase patterns |
| Architecture | HIGH | Patterns verified from codebase analysis (FilterSidebar, CommandBar, filter types), official docs referenced |
| Pitfalls | HIGH | Specific codebase issues identified with line numbers, shadcn/ui docs HIGH confidence |

**Overall confidence:** HIGH

### Gaps to Address

- **Optimistic UI error handling:** Research mentions optimistic updates but specific rollback patterns for finance app (where data integrity matters) need validation during implementation.
- **Bulk action confirmation UX:** Research suggests confirmation dialogs vs undo patterns. Need to decide pattern before Phase 4 implementation.
- **Performance thresholds:** Research suggests 100+ items for virtualization, 500+ for server-side filtering. Actual thresholds depend on Minance's data distribution. Monitor during implementation.

## Sources

### Primary (HIGH confidence)
- shadcn/ui Data Table Documentation — ui.shadcn.com/docs/components/data-table — Column definitions, state management, TanStack integration
- TanStack Table documentation — Column filtering, pagination, sorting patterns
- Next.js App Router docs — nextjs.org/docs — Colocation, private folders, route groups, shallow routing
- nuqs library docs — nuqs.dev — URL state management, type-safe parsers
- Codebase analysis — apps/web/src/components/filters/, apps/web/src/app/transactions/, apps/web/src/app/explorer/ — Current patterns verified

### Secondary (MEDIUM confidence)
- Nielsen Norman Group — Toast notifications, confirmation dialogs, search UX patterns
- Smashing Magazine — Form validation UX, loading states, common UX mistakes
- WebSearch finance dashboard UX patterns — Transaction tables, status visibility, color semantics

### Tertiary (LOW confidence)
- General web search results for UX patterns — Validated against multiple sources before inclusion

---
*Research completed: 2026-03-31*
*Ready for roadmap: yes*