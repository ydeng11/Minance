# Dark Theme Contrast Audit (2026-03-02)

## Scope

- Surfaces audited:
  - Desktop sidebar
  - Major tabs: Dashboard, Transactions, Accounts, Categories, Recurrings, Investments, Import, Settings
  - Assistant sidebar panel
- Automated suite: `e2e/specs/readability-contrast.spec.ts`
- Token focus: visible text nodes using `text-neutral-500` and `text-neutral-600`
- Target threshold: standard text contrast `>= 4.5:1`

## Objective Findings (Before Fix)

- `text-neutral-600` on `bg-neutral-950`: `2.53:1` (fail)
  - Sidebar footer: `Reference parity mode`
- `text-neutral-500` on `bg-neutral-950`: `4.18:1` (fail)
  - Accounts provider labels (`Sample Bank`, `Sample Card`)
  - Categories helper note (3 cards)
  - Recurrings cadence labels (`Monthly`, `Quarterly`)
  - Assistant sidebar subtitle (`Ask questions about your spending patterns.`)
- Total initial failures in audit run: `10`

## Remediation Applied

- Promoted failing text tokens from `text-neutral-500/600` to `text-neutral-400` on affected dark surfaces:
  - `apps/web/src/components/layout/Sidebar.tsx`
  - `apps/web/src/app/accounts/page.tsx`
  - `apps/web/src/app/categories/page.tsx`
  - `apps/web/src/app/recurrings/page.tsx`
  - `apps/web/src/components/assistant/AssistantConversation.tsx`
- Added guardrail regression suite:
  - `e2e/specs/readability-contrast.spec.ts`
  - Asserts no low-contrast `text-neutral-500/600` text usages across major tabs in dark theme.

## Validation

- `pnpm e2e -- e2e/specs/readability-contrast.spec.ts` -> pass
