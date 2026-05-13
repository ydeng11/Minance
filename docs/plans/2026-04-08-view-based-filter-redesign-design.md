# View-Based Filter Redesign Design

## Scope

Redesign the filter and date-range entry points for the `Transactions` and `Explorer` pages so both pages use a shared shell-level `View` action instead of page-level filter command bars.

The redesign changes control placement, page hierarchy, and filter-state presentation. It does not add new filter capabilities or change the underlying URL-driven filter semantics already shipped in v1.0.

## Goals

- Give users one stable place to open view controls on both `Transactions` and `Explorer`.
- Reduce visual clutter inside page bodies by removing the extra filter command-bar layer.
- Keep applied state visible without forcing users to reopen the popup to understand the current view.
- Preserve explicit draft-style filter editing with `Reset` and `Apply`.
- Keep the default state visually calm.

## Non-Goals

- Add new filter types, saved views, or smart-search behavior.
- Expose `View` on pages outside `Transactions` and `Explorer`.
- Change the current URL-sync contracts in `apps/web/src/app/explorer/filters.ts` or `apps/web/src/app/transactions/filters.ts`.
- Turn the `View` surface into a live-updating panel with immediate filter application.
- Redesign `AI Assistant` or merge view controls into the assistant side panel.

## Approved Decisions

### 1. Replace page-level filter entry with a shell-level `View` action

- The global shell header in `apps/web/src/components/layout/Shell.tsx` gets a quiet `View` button.
- `View` appears only on `Transactions` and `Explorer`.
- `View` is positioned before `AI Assistant`.
- The button label stays minimal: `View`.
- The button does not show filter count, date range, or active-state text inline.

This keeps the entry point stable across the two analytics-heavy surfaces without polluting the shell on unrelated routes.

### 2. Use a centered popup, not a right-side panel

- `View` opens a centered popup.
- The popup uses draft semantics with `Reset` and `Apply`.
- The popup owns all editing for date range and advanced filters.

This keeps the interaction lightweight and distinct from the `AI Assistant` side panel, which is longer-lived and conversational.

### 3. Move date range into the popup

- Date range becomes the first section in the popup.
- Presets and custom start/end inputs live in the same modal as the rest of the view controls.
- There is no separate on-page date select once the redesign lands.

This makes the mental model simpler: all view-shaping controls live in one place.

### 4. Slim down the page headers

- The large Transactions hero card in `apps/web/src/app/transactions/page.tsx` becomes a slimmer title-and-actions header.
- The Explorer top section in `apps/web/src/app/explorer/page.tsx` becomes a slimmer title-and-actions header as well.
- Page headers continue to show page identity, top actions, and compact summary context.

Once `View` moves into the shell, the page should not also dedicate a full section to filter chrome.

### 5. Attach active chips to the content shell

- Active filter chips no longer float between the header and content.
- Chips attach visually to the top edge of the ledger shell on `Transactions`.
- Chips attach visually to the top edge of the summary/cards shell on `Explorer`.
- The chip rail appears only when something non-default is active.
- Default date scope does not appear as a chip.

This keeps state visibility close to the content being affected and avoids creating a second toolbar.

### 6. Keep the default state visually quiet

- If the current view is fully default, the chip rail disappears entirely.
- The page subtitle can still describe the default context in low-emphasis copy.
- The shell button remains the discovery point for changing the view.

This reduces noise and prevents the page from implying that a meaningful filter is active when it is not.

## Page Anatomy

### Transactions

```text
Shell header
  Help | View | AI Assistant | Log out

Slim page header
  Transactions | showing X-Y of Z | New transaction | Export CSV
  short subtitle

Content shell
  [chips only when non-default]
  ledger table
```

### Explorer

```text
Shell header
  Help | View | AI Assistant | Log out

Slim page header
  Explorer | Saved views
  short subtitle

Content shell
  [chips only when non-default]
  summary band / charts / perspective content
```

## Popup Information Architecture

The popup should share one structure across both pages, with one page-specific section near the bottom.

### Shared section order

1. Date range
2. Accounts
3. Categories
4. Transaction types
5. Tag
6. Amount range

### Transactions-specific items

- Category view
- Recurring only

### Explorer-specific items

- Category view
- Direction
- Compare
- Recurring only

The popup should feel like the same component on both pages, not two unrelated dialogs.

## Interaction Model

1. The page registers its current applied state and page-specific form content with a shared view controller.
2. The shell shows `View` only when the current route has a registered view configuration.
3. Clicking `View` opens the centered popup with a draft copy of the current page state.
4. `Reset` returns the draft to page defaults.
5. `Apply` commits through the page’s existing filter application flow.
6. Closing without applying discards draft edits.
7. Applied, non-default state renders as chips attached to the top of the page’s main content shell.

## Architecture Direction

The cleanest implementation path is a route-aware shared controller instead of hard-wiring page logic into `Shell`.

### Recommended structure

- A shared provider wraps the authenticated app shell.
- Pages register a page-specific `View` configuration when mounted.
- The shell consumes only the shared controller state:
  - is `View` available on this route
  - open/close state
  - button label
  - rendered popup content
- Each page remains responsible for:
  - filter defaults
  - draft shape
  - apply/reset semantics
  - URL sync
  - active-chip derivation

This preserves the existing page-owned filter logic and keeps the shell generic.

## Accessibility

- `View` must be keyboard reachable in the shell action row.
- The centered popup should use dialog semantics and initial focus management similar to the current modals.
- `Escape` closes the popup when safe.
- `Apply` and `Reset` labels should be explicit and route-independent.
- Chips remain individually removable with clear labels.

## Testing Strategy

- Add shell-level end-to-end assertions for `View` visibility on `Transactions` and `Explorer`, and absence elsewhere.
- Update Transactions and Explorer Playwright flows to open view controls via the shell instead of page command bars.
- Preserve focused filter-behavior tests for URL sync, repeated params, chip removal, and custom-date behavior.
- Add unit coverage for any route-availability or shared view-controller utilities introduced to support the shell-level entry point.

## Risks

### Cross-boundary state between shell and pages

The biggest implementation risk is the shell needing page-specific popup content and callbacks.

Mitigation: use an explicit shared controller/provider instead of prop drilling or pathname-only conditionals.

### Discoverability of current scope

Removing the inline command bar could make active state feel hidden if the chip rail is too subtle.

Mitigation: visually attach chips to the content shell and keep non-default state easy to clear.

### Layout churn across two mature pages

Both pages already have shipped patterns and Playwright coverage.

Mitigation: migrate in small steps, keep existing filter semantics unchanged, and update route-specific tests alongside each page conversion.
