# Balance Delta and Reporting Treatment Design

**Date:** 2026-06-17
**Status:** Draft for review

## Summary

Minance should keep one account-scoped transaction record per imported or manually entered account activity. It should not require linked transfer pairs or expose double-entry bookkeeping to users.

The core refactor is to separate three concerns:

- **Category:** user-facing label, such as `Dining`, `Credit Card Payments`, `Cash App`, or `Taxes`.
- **Reporting treatment:** financial meaning for dashboards: `expense`, `income`, `transfer`, or `balance_adjustment`.
- **Balance delta:** account-native balance change used for account balances.

This supersedes the earlier category-driven rollup direction in `docs/plans/2026-03-06-transaction-model-design.md`. Categories can still suggest defaults, but they must not be the source of reporting truth because users create and name categories freely.

## Goals

- Prevent credit card payments, account transfers, wallet reloads, and brokerage contributions from inflating spending or income.
- Make checking, savings, cash, wallet, credit card, loan, and investment accounts understandable under one balance model.
- Keep imports independent by account and compatible with the current CSV parsing/staging workflow.
- Let dashboards explain where money went without forcing users to model every counterparty account.
- Move sooner rather than later because the app is still a prototype.

## Non-Goals

- Do not introduce full double-entry bookkeeping.
- Do not merge two account-side transfer rows into one visible transaction.
- Do not require transfer linking to make reports correct.
- Do not create a separate merchant-history store in the first refactor.
- Do not add structured transfer context in v1; use tags and memo/comment instead.

## Canonical Fields

### Accounts

Accounts store both product vocabulary and calculation semantics.

```text
account_type:
  checking
  savings
  cash
  wallet
  credit_card
  loan
  investment
  other

account_nature:
  asset
  liability
```

Default mapping:

| Account type | Default nature |
|---|---|
| checking | asset |
| savings | asset |
| cash | asset |
| wallet | asset |
| investment | asset |
| other | asset |
| credit_card | liability |
| loan | liability |

Current `credit` accounts should migrate to `credit_card`.

### Transactions

Keep a single account-scoped `transactions` table.

Canonical fields:

```text
account_id
merchant_raw
merchant_normalized
description
category_final
balance_delta
reporting_treatment
tags
memo/comment
```

`reporting_treatment` values:

```text
expense
income
transfer
balance_adjustment
```

`direction` should be removed as a stored source of truth after dependent flows are migrated. `transaction_type` should be replaced by `reporting_treatment`.

## Balance Delta

`balance_delta` is account-native:

```text
balance_delta > 0 means the account's displayed balance increased
balance_delta < 0 means the account's displayed balance decreased
```

Examples:

| Event | Account | Nature | Balance delta | User meaning |
|---|---|---|---:|---|
| Paycheck | Checking | asset | +3000 | cash increased |
| Dinner with debit card | Checking | asset | -50 | cash decreased |
| Dinner with credit card | Credit card | liability | +50 | owed balance increased |
| Credit card payment from checking | Checking | asset | -500 | cash decreased |
| Credit card payment on card account | Credit card | liability | -500 | owed balance decreased |
| Loan payment from checking | Checking | asset | -1000 | cash decreased |
| Loan account payment row | Loan | liability | -1000 | owed balance decreased |

Raw `balance_delta` should be mostly invisible to users outside account activity and debug/API views.

## Derived Amounts

The backend should expose account-native and report-oriented amounts so frontend views do not duplicate sign rules.

Recommended derived fields:

```text
balance_delta
account_nature
net_worth_delta
report_amount
account_balance_change_label
report_amount_label
```

Derivation:

```text
account_nature_sign = asset ? +1 : -1
net_worth_delta = balance_delta * account_nature_sign
```

Report display rules:

| Treatment | Report amount |
|---|---|
| expense | `-abs(net_worth_delta)` |
| income | `+abs(net_worth_delta)` |
| transfer | neutral `abs(balance_delta)` |
| balance_adjustment | neutral adjustment amount |

Global transaction tables and spending dashboards show `report_amount`. Account pages show account-native balance change.

Example credit card dinner:

```text
stored balance_delta = +50
account_nature = liability
net_worth_delta = -50
global table = -$50 expense
credit card account page = +$50 owed
```

## Reporting Rules

Dashboards must filter by `reporting_treatment` before aggregating amounts.

| Dashboard area | Included treatments |
|---|---|
| Spending | `expense` |
| Income | `income` |
| Net cash-flow | `income` and `expense` |
| Money movement | `transfer` |
| Reconciliation/account audit | `balance_adjustment` |
| Budgets | `expense` by default |
| Recurring bills | `expense` |
| Recurring income | `income` |

Transfers should not disappear. They should appear in a separate money-movement section so users can explain account balance changes that are not spending.

Budgets and recurring detection should use `report_amount` plus `reporting_treatment`, not raw `balance_delta`.

## Category, Tags, and Memo

Categories are user-facing labels only. They may suggest a default reporting treatment, but every transaction stores its own actual `reporting_treatment`.

Tags and memo/comment carry context that does not need structured semantics in v1.

Good tags:

```text
credit-card-payment
wallet-reload
cash-withdrawal
brokerage-transfer
venmo
zelle
reimbursable
business
```

Tags must never drive cash-flow semantics. Reporting treatment is the semantic source of truth.

## Treatment Defaults

### Expense

Default `expense` cases:

- purchases
- bills
- rent
- taxes
- fees
- credit card interest
- loan interest
- loan payments
- mortgage payments
- Venmo/Zelle/Cash App payments when the purpose is rent, dinner, bills, or another real expense

Loan and mortgage payments are expenses from the personal cash-flow perspective. If a loan account is also imported, the liability-side debt-reduction row should not create a second spending total. It should be treated as account activity/money movement unless the user explicitly wants that account feed to drive expense reporting.

### Income

Default `income` cases:

- payroll
- interest earned
- refunds
- reimbursements
- statement credits
- credit card cashback/rewards

Refunds, reimbursements, and rewards start as income. Contra-expense behavior can be added later if budgeting needs it.

### Transfer

Default `transfer` cases:

- credit card payments
- checking/savings/account transfers
- wallet reloads and cashouts
- brokerage contributions and withdrawals
- ATM cash withdrawals
- cash deposits unless clearly income
- movement between tracked or untracked personal balances

P2P rails are not automatically transfers. Venmo, Zelle, PayPal, and Cash App are context-dependent and should use history, AI, or review.

### Balance Adjustment

Default `balance_adjustment` cases:

- opening balances
- manual reconciliation corrections
- balance reload/correction records that do not represent a real-world counterparty transaction

Real-world reloads, cashouts, and payments are transfers, not balance adjustments.

## Account-Specific Examples

### Dinner Paid From Checking

```text
account_type = checking
account_nature = asset
balance_delta = -50
reporting_treatment = expense
category = Dining
global table = -$50
account page = -$50 cash
```

### Dinner Paid With Credit Card

```text
account_type = credit_card
account_nature = liability
balance_delta = +50
reporting_treatment = expense
category = Dining
global table = -$50
account page = +$50 owed
```

### Credit Card Payment From Checking

```text
account_type = checking
account_nature = asset
balance_delta = -500
reporting_treatment = transfer
category = Credit Card Payments
tags = ["credit-card-payment"]
global cash-flow = excluded
money movement = $500
account page = -$500 cash
```

### Credit Card Payment On Card Statement

```text
account_type = credit_card
account_nature = liability
balance_delta = -500
reporting_treatment = transfer
category = Credit Card Payments
tags = ["credit-card-payment"]
global cash-flow = excluded
money movement = $500
account page = -$500 owed
```

Both rows may exist if both accounts are imported. They remain separate account-scoped transactions.

### Cash App Reload

If the user does not track Cash App as an account:

```text
account_type = checking
balance_delta = -100
reporting_treatment = transfer
category = Cash App
tags = ["wallet-reload"]
```

The reload is not spending by default. The dashboard shows it as money movement.

If the user tracks Cash App as a wallet account, later Cash App purchases can be imported or entered as expenses from that wallet.

### Loan Payment

Funding account row:

```text
account_type = checking
balance_delta = -1000
reporting_treatment = expense
category = Loan Payment
```

Loan account row, if imported:

```text
account_type = loan
account_nature = liability
balance_delta = -1000
reporting_treatment = transfer
category = Loan Payment
```

This prevents double counting when both the funding account and loan account are tracked. Principal/interest splits can be added later.

## Import Design

Reuse the current CSV parser, mapping templates, header detection, staging, and review flow. The refactor changes normalized output and commit semantics, not CSV parsing itself.

### Account Requirement

Final import preview requires account context.

- Single-account import: user selects or creates the target account before final balance-delta inference.
- Multi-account import: allowed only for same-bank files with a reliable account column.
- Multi-account rows must map to confirmed existing or new accounts before final preview.
- Rows without account assignment cannot commit.

Account nature is required because the same sign can mean different things for asset and liability accounts.

### Balance-Delta Inference

The importer should output `balance_delta`, not `amount + direction`.

Examples:

| Statement context | Account nature/type | Result |
|---|---|---|
| checking debit/purchase | asset | negative `balance_delta` |
| checking deposit | asset | positive `balance_delta` |
| credit card purchase/charge | liability | positive `balance_delta` |
| credit card payment/credit/refund | liability | negative `balance_delta` |

### Category and Treatment Inference

Inference order:

1. Hard structural signals, such as account type, statement column shape, and reliable debit/credit fields.
2. Explicit user rules.
3. Historical transactions for the same `merchant_normalized`, same account first.
4. Historical transactions for the same `merchant_normalized`, same account type or source institution.
5. Global historical transactions for the same `merchant_normalized`.
6. Deterministic aliases.
7. AI inference.
8. User review.

History source is existing transaction data. Do not create a separate history/examples table in v1.

History reuse rules:

- Use merchant/payee as the primary similarity key, not free-form description.
- Description is supporting evidence only.
- Prefer same-account most recent reviewed transaction.
- If same-account history is absent, use most frequent reviewed/high-confidence global match.
- Ignore unreviewed low-confidence transactions.
- User corrections become useful history because they update transactions.

AI should infer:

- category
- reporting treatment
- suggested tags
- confidence
- explanation/signals for review

Low confidence requires review. AI may suggest tags, but tags must not decide reporting treatment.

## Starting Balances and Snapshots

Keep the existing starting balance UI, but store the value as an opening `balance_adjustment` transaction.

After migration:

- `accounts` stores identity/settings and account nature/type.
- Current balance is derived from opening adjustment plus transaction `balance_delta` plus manual balance adjustments.
- `accounts.initialBalance` should stop being active calculation state.

Statement balance snapshots are reconciliation checkpoints, not primary balance source.

```text
calculated balance = sum(balance_delta)
statement snapshot = external checkpoint
difference accepted by user = balance_adjustment
```

## UI Rules

### Global Transaction Table

Show report-oriented fields:

- merchant/payee
- category
- reporting treatment label
- report amount
- account
- tags

Do not expose raw `balance_delta` as the main amount.

Plain-language treatment labels:

| Stored value | UI label |
|---|---|
| expense | Counts as spending |
| income | Counts as income |
| transfer | Money movement / transfer |
| balance_adjustment | Balance correction |

### Account Pages

Show account-native balance changes:

- checking: `-$50 cash`
- credit card: `+$50 owed`
- loan: `-$1000 owed`
- wallet: `-$20 balance`

### Dashboards

Recommended sections:

```text
Cash flow
  Income
  Expenses
  Net cash flow

Money movement
  Transfers

Balance corrections
  Opening balances
  Reconciliation adjustments
```

## Migration Plan

Use TDD for code changes. For this design doc, no runtime tests are required.

### Phase 1: Schema and Derivation Helpers

- Add `accounts.account_nature`.
- Add `transactions.balance_delta`.
- Add `transactions.reporting_treatment`.
- Keep old `amount`, `direction`, and `transaction_type` only as temporary compatibility fields.
- Add backend helpers for account nature, net-worth delta, report amount, and labels.
- Add tests for checking, credit card, wallet, and loan examples before changing UI.

### Phase 2: Data Migration

- Migrate account type `credit` to `credit_card`.
- Add `wallet` to supported account types.
- Infer `account_nature` from account type.
- Convert old `amount + direction` into `balance_delta`.
- Map old `transaction_type` to `reporting_treatment`.
- Convert account starting balances and manual adjustments into `balance_adjustment` transactions.

### Phase 3: Analytics

- Move dashboards to `reporting_treatment` plus derived report amounts.
- Add separate money-movement totals for transfers.
- Keep balance adjustments out of cash-flow.
- Update recurring rules and budgets to use report amount and reporting treatment.

### Phase 4: Import

- Require account assignment before final preview.
- Convert import normalized rows to output `balance_delta`.
- Reuse CSV parsing/mapping/staging.
- Add merchant-history reuse by `merchant_normalized`.
- Use AI only when rules/history are insufficient.
- Send low-confidence rows to review.

### Phase 5: UI

- Global transaction table uses report amount.
- Account pages use account-native balance change.
- Forms expose plain-language reporting treatment.
- Categories remain labels and optional default suggestions.
- Tags/comments carry context.

### Phase 6: Cleanup

- Remove stored `direction` as source of truth.
- Remove `transaction_type` from new contracts.
- Remove category-name-driven transfer semantics.
- Keep temporary adapters only where needed for old tests or migration boundaries.

## Open Risks

- Existing code is deeply based on `amount + direction`; remove it in phases.
- Loan and mortgage feeds can double count if both funding-account rows and liability-account rows are marked expense. Default liability-side debt-reduction rows to transfer unless the user explicitly chooses otherwise.
- Wallet reloads can hide real spending if users never track wallet purchases. Show transfers separately and make the first-time choice clear.
- Tags are flexible but not semantic. Do not use tags to decide dashboards.
- Multi-account import is risky without reliable account columns; keep it narrow.

## Success Criteria

- A credit card purchase increases the card owed balance but appears as negative spending in the global table.
- A credit card payment reduces checking cash and card owed balance, but does not count as spending or income.
- A Cash App reload defaults to money movement, not expense.
- Loan and mortgage payments count as expenses from funding accounts.
- Opening balances and reconciliation fixes affect account balances but not cash-flow.
- Spending, income, transfers, and balance adjustments are visible as separate dashboard concepts.
- Import preview cannot finalize balance-delta inference without account nature.
- Historical merchant reuse improves imports without a separate history store.
