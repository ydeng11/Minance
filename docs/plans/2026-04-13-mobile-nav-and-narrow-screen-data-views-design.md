# Mobile Nav and Narrow-Screen Data Views Design

## Goal

Address the second `/audit` recommendation by restoring mobile route parity for Explorer and making the Transactions and Import experiences workable on phones without depending on wide horizontal table scrolling.

## Scope

- Replace the current mobile nav overflow strip with a tighter primary bar that keeps high-frequency destinations within thumb reach.
- Restore first-class mobile access to `Explorer`.
- Adapt the Transactions ledger so narrow screens remain usable without requiring horizontal panning.
- Adapt Import review and reconciliation for phones while preserving the current desktop table experience.

## Approved Approach

### Mobile navigation

- Use a fixed five-slot bottom bar: `Home`, `Explorer`, `Transactions`, `Import`, and `More`.
- Move lower-frequency destinations (`Accounts`, `Categories`, `Recurrings`, `Settings`) into a mobile `More` surface.
- Keep desktop sidebar navigation unchanged.

### Transactions

- Preserve the existing ledger table for desktop and tablet layouts.
- On narrow screens, rely on the existing stacked details cell and hidden secondary columns rather than forcing users to pan across the table.
- Tighten row actions and metadata grouping so the mobile row fits naturally within the viewport width.

### Import

- Preserve the current editable table layouts for larger screens.
- Introduce mobile-only stacked card renderers for processed rows and reconciliation entries.
- Keep the same fields, actions, and status information available on mobile, but present them in a vertical editing flow instead of an `1100px` table.

## Testing Strategy

- Add or update static tests for the mobile nav structure and route coverage.
- Add Playwright coverage for mobile navigation access to `Explorer` and the `More` destinations.
- Replace the current narrow-screen Transactions assertion that expects horizontal overflow with one that verifies in-viewport usability.
- Add narrow-screen Import coverage for the new mobile card layouts.

## Non-Goals

- Redesigning desktop navigation or desktop information architecture.
- Reworking the underlying Transactions or Import business logic.
- Changing tablet or desktop layouts beyond the minimum needed to preserve responsive correctness.
