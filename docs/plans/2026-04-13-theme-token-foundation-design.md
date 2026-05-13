# Theme Token Foundation Design

## Goal

Address the third `/audit` recommendation by introducing a real semantic theme-token foundation with CSS custom properties, while keeping the visible application dark-only until more route-level surfaces are migrated.

## Scope

- Expand the global styling foundation into semantic CSS custom properties.
- Add dark and light token sets, but keep dark mode as the only active runtime theme in this pass.
- Migrate the shared shell surfaces and the audited theming hot spots away from hard-coded dark utilities and arbitrary gradient values.
- Keep the current UX and information architecture intact.

## Approved Approach

### Token foundation

- Define semantic tokens in [globals.css](/Users/ihelio/code/minance2/apps/web/src/app/globals.css:1) for:
  - app background
  - panel and elevated surface backgrounds
  - field background
  - primary, secondary, and muted foreground text
  - border and subtle ring colors
  - accent, accent-soft, and focus colors
  - named shared gradients and shadows
- Provide both dark and light token values so future theme expansion is structural rather than manual.

### Theme wiring

- Replace the hard-coded dark mode contract in [layout.tsx](/Users/ihelio/code/minance2/apps/web/src/app/layout.tsx:1) with a single `data-theme` source of truth.
- Keep that source pinned to dark in this pass.
- Update [AppProviders.tsx](/Users/ihelio/code/minance2/apps/web/src/components/providers/AppProviders.tsx:1) so shared overlays like the toaster align with the new theme source instead of assuming `"dark"` forever.

### Migration scope

- Normalize the shared shell surfaces first:
  - [Shell.tsx](/Users/ihelio/code/minance2/apps/web/src/components/layout/Shell.tsx:1)
  - [Sidebar.tsx](/Users/ihelio/code/minance2/apps/web/src/components/layout/Sidebar.tsx:1)
  - [BottomNav.tsx](/Users/ihelio/code/minance2/apps/web/src/components/layout/BottomNav.tsx:1)
  - [ViewDialog.tsx](/Users/ihelio/code/minance2/apps/web/src/components/view/ViewDialog.tsx:1)
- Normalize the audited hot spots next:
  - [ExplorerCard.tsx](/Users/ihelio/code/minance2/apps/web/src/app/explorer/components/ExplorerCard.tsx:1)
  - [TransactionsCommandBar.tsx](/Users/ihelio/code/minance2/apps/web/src/app/transactions/TransactionsCommandBar.tsx:1)
  - [TransactionsAdvancedFilters.tsx](/Users/ihelio/code/minance2/apps/web/src/app/transactions/TransactionsAdvancedFilters.tsx:1)
- Replace repeated `neutral-*`, `emerald-*`, and inline gradient recipes in those files with semantic token-backed styles.

## Testing Strategy

- Add source-level tests that confirm:
  - semantic tokens exist in `globals.css`
  - `layout.tsx` exposes a `data-theme` contract instead of forcing `.dark`
  - shared shell/themed hot-spot components consume token-backed classes
- Keep focused Playwright coverage on shell/view flows so the tokenized surfaces still render and interact correctly.
- Verify with `just build-web` and `just check`.

## Non-Goals

- No user-facing theme toggle yet.
- No full-app light theme rollout in this pass.
- No repo-wide replacement of every `neutral-*` and `emerald-*` utility.
- No broader visual-identity redesign beyond tokenizing the audited theming surfaces.
