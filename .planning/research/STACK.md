# Stack Research

**Domain:** Personal Finance Application UX/Design Tooling
**Researched:** 2026-03-31
**Confidence:** HIGH (patterns verified from official docs and codebase analysis)

## Recommended Stack

### Core Technologies (Already Established)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1.6 | Full-stack React framework | App Router provides excellent UX patterns for loading states, error handling, and data fetching |
| React | 19.2.3 | UI library | Latest version with improved concurrent features and form handling |
| Tailwind CSS | 4.x | Styling framework | Headless styling approach enables custom finance-specific design patterns |
| lucide-react | 0.575.0 | Icon library | Finance-appropriate icons ( DollarSign, Calendar, Filter, TrendingUp, etc.) |

### Recommended Additions for UX Polish

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| shadcn/ui | latest | Component library | Copy-paste components that integrate with Tailwind - provides consistent form, table, dialog, and toast patterns without bundle overhead |
| React Hook Form | 7.x | Form state management | Reduces re-renders, handles complex validation, integrates with Zod - critical for transaction editing UX |
| Zod | 3.x | Schema validation | Type-safe validation with excellent error messages - transaction amounts, dates, categories need strict validation |
| TanStack Table | 8.x | Headless table library | Sorting, filtering, pagination, row selection - essential for transaction ledger UX |
| Sonner | 1.x | Toast notifications | Minimal, non-blocking notifications for save/delete feedback - better than modal alerts |

### Supporting Libraries for UX Patterns

| Library | Purpose | When to Use |
|---------|---------|-------------|
| cmdk | Command palette component | For keyboard-first navigation (Cmd+K pattern) - power users expect quick actions |
| @tanstack/react-virtual | Virtual scrolling | When transaction lists exceed 100+ items - prevents performance degradation |
| date-fns | Date manipulation | For custom date range filtering and formatting - lighter than moment.js |

### Development Tools for UX Testing

| Tool | Purpose | Notes |
|------|---------|-------|
| Playwright | E2E testing | Test user flows: create transaction, edit, delete, filter, export |
| Storybook | Component isolation | Document filter components, form patterns, table variants visually |
| axe-core | Accessibility testing | Finance apps require WCAG compliance for color contrast, keyboard navigation |

## Installation

```bash
# UX/Design additions
npm install react-hook-form @hookform/resolvers zod @tanstack/react-table sonner

# Optional for advanced patterns
npm install cmdk @tanstack/react-virtual date-fns

# Development tools for UX testing
npm install -D @playwright/test
npx playwright install
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| shadcn/ui | Radix UI primitives | If you want lower-level primitives without the copy-paste approach - shadcn/ui uses Radix internally |
| shadcn/ui | Headless UI | If using Tailwind UI commercial templates - but shadcn/ui integrates better with existing Tailwind v4 |
| Sonner | react-hot-toast | If you prefer toast positioning flexibility - Sonner is more minimal and React 19 compatible |
| TanStack Table | AG Grid | Only for enterprise requirements (pivot tables, Excel-like features) - TanStack is lighter and headless |
| React Hook Form | Formik | If team has Formik expertise - RHF has better performance and React 19 support |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Material UI / Ant Design | Design system conflicts with finance app aesthetics (rounded cards, dark mode) and increases bundle size | shadcn/ui + Tailwind - maintains your existing aesthetic |
| Redux for form state | Over-engineering for local form state - causes unnecessary complexity | React Hook Form's built-in state management |
| moment.js | Deprecated, large bundle, mutable API | date-fns - immutable, modular, smaller bundle |
| Custom form validation | Error-prone, hard to maintain, lacks TypeScript inference | Zod - schema validation with type inference |
| Manual pagination logic | Complexity grows with sorting/filtering | TanStack Table's getPaginationRowModel |

## UX Patterns for Finance Apps

### Data Table Patterns

**Pattern:** Transaction Ledger with Row Actions
- Use TanStack Table's `rowSelection` for bulk operations
- Place actions in right-most column (Edit, Delete icons)
- Sticky header for scrolling long lists
- Amount column: right-aligned, green for income, red for expenses

**Pattern:** Column Visibility Toggle
- Allow hiding columns (Notes, Tags) for focused view
- Use TanStack's `columnVisibility` state
- Provide preset views (Compact, Full, Analysis)

### Filter/Search Patterns

**Pattern:** Command Bar (Current Implementation)
- Primary search input with icon
- Quick filters (Date Range dropdown)
- Advanced Filters button with count badge
- Apply button for explicit filter execution (good for server-side)

**Recommendation:** Consolidate redundant search inputs
- Merge "Search transactions" and "Filter by merchant" into single smart search
- Use fuzzy matching across merchant, description, notes, tags
- Show search scope indicator (e.g., "Searching: merchant, notes, tags")

**Pattern:** Filter Sidebar vs Modal
- Explorer page: Sidebar appropriate (persistent, exploratory)
- Transactions page: Modal appropriate (task-focused, apply once)
- Keep consistent component styling between both

### Form UX Patterns

**Pattern:** Inline Validation with Progressive Disclosure
```typescript
const form = useForm({
  resolver: zodResolver(schema),
  mode: "onBlur", // Validate after user leaves field
});
```
- Show errors only after user interaction (touched)
- Error messages below field, not inline
- Use Zod's `.message()` for helpful guidance

**Pattern:** Amount Input UX
- Allow negative values for expenses
- Show live formatting (e.g., "-50.00" as "-$50.00")
- Validate reasonable bounds (not -$1M for personal finance)

**Pattern:** Date Picker UX
- Preset ranges for common selections (This Month, Last 30 Days)
- Custom range with validation (start before end)
- Disable future dates for historical transactions

### Feedback/Notification Patterns

**Pattern:** Toast Notifications
- Success: "Transaction saved" (disappears in 3s)
- Error: "Failed to save - amount required" (persistent with retry)
- Use Sonner's positioning (bottom-right for non-intrusive)

**Pattern:** Loading States
- Skeleton for table loading (row placeholders)
- Spinner for save operations
- Disable inputs during save to prevent duplicate submissions

**Pattern:** Confirmation Dialogs
- Delete: "Delete this transaction? This cannot be undone."
- Bulk actions: "Categorize 5 transactions as 'Food'?"
- Use shadcn/ui AlertDialog for accessible modal

## Stack Patterns by Page

**Transactions Page:**
- Command Bar + Advanced Filters Modal
- TanStack Table with row selection, sorting, pagination
- Inline edit with form validation
- Bulk action toolbar (when selection active)

**Explorer Page:**
- Filter Sidebar (persistent)
- Visualization components (charts, heatmaps)
- Summary band with key metrics

**Create/Edit Forms:**
- React Hook Form + Zod validation
- shadcn/ui Form components (FormField, FormMessage)
- Amount picker with live formatting
- Category/account dropdowns with search

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| React Hook Form 7.x | React 19 | Fully compatible, tested |
| shadcn/ui | Tailwind v4 | Use npx shadcn@latest add - works with v4 |
| Sonner 1.x | React 19 | Latest version required |
| TanStack Table 8.x | React 19 | Compatible with manual mode for server-side |

## Sources

- shadcn/ui Data Table docs (ui.shadcn.com/docs/components/data-table) — Column definitions, state management, TanStack integration patterns — HIGH confidence
- TanStack Table patterns (WebSearch verified) — Server-side filtering, debounced inputs, manual mode — HIGH confidence
- React Hook Form + Zod patterns (WebSearch verified) — Form validation, inline errors, progressive disclosure — HIGH confidence
- Finance dashboard UX patterns (WebSearch) — Transaction tables, status visibility, color semantics — MEDIUM confidence
- Codebase analysis (apps/web/src/components/filters/, apps/web/src/app/transactions/) — Current patterns: MultiSelectField, AmountRangeControl, FilterSidebar — HIGH confidence

---
*Stack research for: Minance UX/Design Tooling*
*Researched: 2026-03-31*