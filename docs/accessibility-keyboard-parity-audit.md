# Accessibility and Keyboard Navigation Parity Audit (`minance2-xdy.12`)

Captured on **March 2, 2026 (America/New_York)**.

## Scope

Audit target:

- Major tabs (`Dashboard`, `Transactions`, `Accounts`, `Categories`, `Recurrings`, `Investments`, `Import`, `Settings`)
- Global shell/navigation and assistant panel
- Keyboard navigation, focus behavior, semantic labeling, and form/table accessibility

## Baseline Findings (Before Fixes)

### Global shell and navigation

1. No skip link to jump directly to main content.
2. Desktop/mobile nav links did not expose active-route semantics (`aria-current`).
3. Help popover used menu semantics without menu keyboard behavior parity.
4. Assistant panel close flow did not consistently restore focus to the launcher.

### Transactions tab

1. Search field relied on placeholder text only (no explicit label).
2. Icon-only apply-filters button lacked an accessible name.
3. Transactions table lacked a caption and explicit column scope.
4. Row action buttons lacked contextual accessible labels.

### Import tab

1. Status filter lacked an explicit associated label.
2. Preview/processed tables lacked captions and column scope semantics.
3. Processed-row editor controls had no per-control labels.

### Investments tab

1. Timeframe segmented controls had no pressed-state semantics.
2. Positions search field relied on placeholder text only.

### Settings tab

1. Category strategy table lacked caption/scope semantics.
2. Row-level emoji and coarse-bucket controls lacked specific labels.

### Assistant panel

1. Question input relied on placeholder text only.
2. Send icon button lacked an explicit accessible name.

## Fixes Landed in This Issue

### Shared shell/nav

- Added skip link to main content target in app layout.
- Added `aria-current` and keyboard-visible focus styles for desktop/mobile navigation and settings subnav links.
- Added explicit nav labels for primary and settings navigation landmarks.
- Updated assistant panel open/close behavior to restore focus to launcher and added dialog control linkage (`aria-controls`/`aria-expanded`).
- Added route live-region announcement in shell main landmark.
- Updated help popover semantics to disclosure-style popup (removed menu-role mismatch) and ensured first-item focus on open.

### Tab/page controls

- Transactions: labeled search input, labeled apply button, table caption/column scopes, contextual row-action labels.
- Import: labeled status filter, table captions/column scopes, explicit per-row input/select/checkbox labels, contextual import-open button labels.
- Investments: `aria-pressed` on timeframe toggles and labeled positions search field.
- Settings: strategy table caption/column scopes and explicit row-control labels.
- Assistant: labeled input and labeled send button.

## Remaining Production Readiness Gaps

1. Add automated accessibility checks (axe or equivalent) to CI for critical routes and dialogs.
2. Validate full keyboard trap behavior in the assistant side panel for tab-cycling edge cases.
3. Add page-level heading/focus regression tests to ensure future parity changes preserve skip-link and route-focus behavior.
4. Expand contrast audit (especially neutral text on dark backgrounds) with objective tooling and tracked thresholds.

## Files Updated for This Audit/Fix Pass

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/transactions/page.tsx`
- `apps/web/src/app/import/page.tsx`
- `apps/web/src/app/investments/page.tsx`
- `apps/web/src/app/settings/page.tsx`
- `apps/web/src/components/layout/Shell.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/layout/BottomNav.tsx`
- `apps/web/src/components/layout/HelpMenu.tsx`
- `apps/web/src/components/settings/SettingsMenu.tsx`
- `apps/web/src/components/assistant/AssistantConversation.tsx`
