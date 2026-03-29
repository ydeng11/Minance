---
status: fixing
trigger: "Investigate issue: account-type-consistency-across-app-flows"
created: 2026-03-28T02:19:45Z
updated: 2026-03-28T02:39:24Z
---

## Current Focus

hypothesis: The prioritized inconsistency is rooted in transaction helpers, not the account APIs: transaction filters were using a local label builder that discarded displayIdentifier, and transaction-form account identity matching was narrower than the import flow.
test: Verify the newly added regression tests now pass, then run broader relevant checks and decide whether the remaining accounts-page fallback/validation drift also needs to be fixed to satisfy the original objective.
expecting: The focused transaction tests should stay green with displayIdentifier-aware matching and filter-label construction, while any remaining inconsistency should now be isolated to accounts-page contract handling.
next_action: Run adjacent transaction/import verification and then evaluate whether the accounts-page account-type fallback/validation drift remains in scope for this session.

## Symptoms

expected: A single canonical Account Type contract is used everywhere in the product surface named by the user, including matching enum/domain values, labels, option ordering, and validation behavior.
actual: The user suspects Account Type usage has drifted across transaction filters, transaction creation, CSV import flows, and the accounts page. We need to audit the current behavior, identify the inconsistencies, and fix them where appropriate.
errors: No specific runtime error reported; issue is behavioral inconsistency.
reproduction: Inspect shared/domain Account Type definitions and trace their usage through the web app, especially filters, transaction creation forms, CSV import flows, and the accounts page. Compare option sources, display labels, parsing, and server/client contracts.
started: Existing drift in current codebase; not tied to a newly reported regression.

## Eliminated

## Evidence

- timestamp: 2026-03-28T02:21:10Z
  checked: .planning/debug/knowledge-base.md
  found: No debug knowledge base file or prior match exists for this issue pattern.
  implication: There is no known historical diagnosis to bias the first hypothesis; the audit should proceed from direct code evidence.

- timestamp: 2026-03-28T02:21:10Z
  checked: repo-wide search for "AccountType" and "account type"
  found: Canonical-looking account-type handling appears concentrated in packages/domain/src/accounts.ts, services/api/src/accounts.ts, and accounts page consumers, with transaction/import surfaces reachable through transaction and import app files.
  implication: The likely contract boundary is narrow enough to audit directly by tracing these files end to end.

- timestamp: 2026-03-28T02:28:52Z
  checked: packages/domain/src/accounts.ts and services/api/src/accounts.ts
  found: Shared domain code only formats account-type labels/identifiers, while services/api/src/accounts.ts owns the supported canonical values, aliases, default type, and server-side normalization for account types.
  implication: The product lacks a single shared account-type contract for value lists and validation; frontend consumers can drift if they reimplement account-type behavior locally.

- timestamp: 2026-03-28T02:28:52Z
  checked: apps/web/src/app/accounts/page.tsx and apps/web/src/app/accounts/wizard.ts
  found: The accounts page falls back to a hard-coded type list ["checking", "savings", "credit", "loan", "investment", "cash"], which omits "depository", and both manual/settings validators only require a non-empty accountType instead of validating against supported types.
  implication: Accounts-page option ordering/coverage and client-side validation can diverge from the server contract, especially if the supported type API changes or returns "depository".

- timestamp: 2026-03-28T02:28:52Z
  checked: apps/web/src/app/transactions/form.ts, apps/web/src/app/transactions/page.tsx, apps/web/src/app/import/accountAssignment.ts, and apps/web/src/app/import/page.tsx
  found: Transaction creation and import assignment use account.displayIdentifier labels, but transaction filters build labels from account.displayName/normalizedKey only.
  implication: Account-type information is preserved in create/import/account surfaces but dropped in transaction filter labels and active chips, creating a visible cross-flow inconsistency.

- timestamp: 2026-03-28T02:34:21Z
  checked: apps/web/src/app/transactions/form.ts versus apps/web/src/app/import/accountAssignment.ts
  found: transactions/form.ts only matches account identities against displayName and normalizedKey, while import/accountAssignment.ts also matches displayIdentifier.
  implication: A transaction-flow value that contains the canonical displayIdentifier label can be resolved in import flows but not in transaction editing/creation helpers, so account-type-bearing labels are not handled consistently across app flows.

- timestamp: 2026-03-28T02:34:21Z
  checked: user-provided local audit against current code
  found: The local audit's two reported mismatches exactly match the current transaction filter and transaction form implementations.
  implication: These are confirmed root causes for the prioritized cross-flow inconsistency and should be fixed before broader account-page cleanup.

- timestamp: 2026-03-28T02:39:24Z
  checked: pnpm --filter web exec tsx --test src/app/transactions/form.test.ts before implementation
  found: The new regression tests failed because reconcileDraftAccountName left displayIdentifier values unchanged and no shared transaction filter option builder existed for displayIdentifier labels.
  implication: The failing tests directly reproduced the confirmed transaction-flow drift and established a reliable RED baseline for the fix.

- timestamp: 2026-03-28T02:39:24Z
  checked: apps/web/src/app/transactions/form.ts and apps/web/src/app/transactions/page.tsx after implementation
  found: Transaction account identity matching now considers displayIdentifier, and transaction filter options are built through a shared helper that keeps normalized-key values while using displayIdentifier labels when available.
  implication: Transaction creation, filter labels, and import/account assignment flows now share the same account label contract for type-bearing display identifiers.

## Resolution

root_cause: Transaction flows had two independent local implementations that bypassed the canonical account display identifier contract: the transaction filters derived labels from displayName/normalizedKey only, and the transaction form's account identity matcher did not accept displayIdentifier values even though the import flow did.
fix: Added displayIdentifier-aware account matching in apps/web/src/app/transactions/form.ts and introduced a shared transaction filter option builder that preserves normalized-key filter values while rendering displayIdentifier labels; updated apps/web/src/app/transactions/page.tsx to use that shared helper.
verification:
files_changed:
  - apps/web/src/app/transactions/form.ts
  - apps/web/src/app/transactions/form.test.ts
  - apps/web/src/app/transactions/page.tsx
