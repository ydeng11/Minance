# Full Explorer Upgrade Design

## Goal
Turn Explorer into the primary analytics workspace for Minance: spacious, visually rich, pleasant to use, and capable of answering spending questions from both category and account perspectives.

## Problem
The current Explorer page feels cramped and visually flat. The filter rail takes too much width, charts are basic, several modules have equal weight even when they should not, and the account view is a placeholder instead of a real analysis surface. The page exposes more controls than the backend currently honors, which makes some of the experience feel decorative rather than trustworthy.

## Design Principles
- Give the analysis canvas room to breathe.
- Make the first screen explain the financial story quickly.
- Support both category and account perspectives without resetting the user’s filter context.
- Prefer high-signal, composable visual modules over a large number of weak widgets.
- Keep the experience clean and comfortable in the app’s existing dark visual language.
- Ensure every visible control meaningfully affects the returned analytics.

## User Experience

### Layout
Explorer becomes a two-zone workspace:
- A compact, sticky filter rail on the left for desktop.
- A wide analysis canvas on the right for charts, comparison, and saved views.

On mobile, filters move into a drawer and modules stack in a deliberate order. The page should keep the same mental model across breakpoints.

### Summary Band
The top of the analysis canvas contains a summary band with:
- Total spend
- Total income
- Net flow
- Recurring spend
- Transaction count

These cards orient the user quickly and provide comparison deltas when comparison mode is active, but they do not replace the deeper analytics modules below.

### Perspective Switching
Below the summary band, Explorer adds a perspective switcher:
- Overview
- Category
- Account

The selected perspective reorganizes the main canvas while preserving the current filters and URL state.

### Perspective Modules

#### Overview
Overview answers, "What is happening overall?"
- Dominant monthly trend visualization
- Category mix and ranked category list
- Top merchants
- Spending heatmap
- Anomalies
- Comparison summary

#### Category
Category answers, "Where is my money going?"
- Ranked categories with share and count
- Category share or composition over time
- Merchant mix within the selected category scope
- Concentration indicators
- Category-specific anomalies and drill-down actions

#### Account
Account answers, "Which accounts are driving this behavior?"
- Ranked account totals and share
- Per-account trend over time
- Inflow vs outflow split
- Category mix inside an account
- Merchant mix inside an account
- Account-specific drill-down actions

### Saved Views
Saved views move into the top action area and behave like workspace presets. A saved view stores:
- Filter state
- Active perspective
- Category view choice

This lets users keep common workflows like an all-account overview or a specific credit-card analysis.

## Data and API Design

### Current Gaps
The current analytics surface provides summary totals, trend, top categories, top merchants, heatmap, and anomalies, but it does not provide real account analytics. Some filters also exist in the UI without being consistently applied in analytics responses.

### Required Analytics Expansion
Explorer should be backed by richer, perspective-aware analytics data:
- `summary`
- `comparison`
- `trend`
- `categories`
- `accounts`
- `merchants`
- `heatmap`
- `anomalies`

This can be returned from either a richer overview payload or a dedicated Explorer analytics endpoint. The important requirement is that the frontend stops inventing placeholder data and can render each module from real backend results.

### Account Analytics
Add real account analytics derived from transactions:
- Totals by account
- Share of outflow by account
- Inflow and outflow split
- Monthly series by account
- Category and merchant distribution within each account

### Category Analytics
Extend category analytics so the frontend can render richer visuals and comparisons:
- Ranked list with amount, count, share, and emoji
- Monthly series by category
- Concentration metrics
- Merchant rollups scoped to the active category

### Filter Coverage
Explorer analytics must consistently honor:
- Date range
- Custom start and end dates
- Category
- Account
- Direction
- Amount constraints
- Search and merchant scope where applicable
- Category view mode

Controls that cannot be honored should not appear as active analytics filters.

## Frontend Architecture

### Explorer Shell
The page should be restructured into reusable sections:
- Header and actions
- Summary band
- Perspective navigation
- Responsive filter rail or drawer
- Module grid for the active perspective

### Reusable Analytics Cards
Each visualization module should share a common card shell with:
- Title
- Optional subtitle or context
- Action slot
- Loading state
- Empty state
- Error state

This keeps the page cohesive even as the set of modules expands.

### Visual Hierarchy
Explorer should stop treating every card as equally important. Each perspective should have one or two dominant visualizations, supported by smaller companion modules. This addresses the current squeezed feeling and makes the page easier to scan.

## Interaction Design
- Filters update the entire workspace and persist in the URL.
- Perspective changes do not clear filters.
- Chart interactions either refine Explorer state or open Transactions with matching filters.
- Comparison mode derives the prior period from the currently selected range and surfaces deltas in the summary band and key modules.
- Empty states explain why no data is available for the active scope.

## Error Handling
- Partial failures should not blank the entire page.
- Missing account analytics should show a truthful unavailable state rather than a fake placeholder.
- Narrow filters with no results should feel informative, not broken.

## Testing Strategy

### Backend
- Add unit coverage for account rollups, category series, and comparison calculations.
- Add filter-coverage tests to ensure supported filters are honored consistently.

### API Client
- Expand endpoint tests for the richer analytics contract and query params.

### Frontend
- Add component and page tests for perspective switching, filter persistence, and empty states.
- Validate saved views with perspective-aware state.

### End-to-End
- Verify Explorer loads imported data.
- Switch across Overview, Category, and Account perspectives.
- Apply filters and confirm analytics update.
- Save and reapply a perspective-specific view.
- Confirm account and category modules render real scoped data.

## Non-Goals
- Building a fully user-customizable dashboard system in this first pass
- Adding exotic visualizations that do not improve understanding
- Redesigning unrelated pages beyond the Explorer-specific integration points

## Recommendation
Implement the upgrade as a durable Explorer v1 rather than a quick facelift. This provides immediate UX improvement while creating the backend and component foundations needed for future analytics expansion.
