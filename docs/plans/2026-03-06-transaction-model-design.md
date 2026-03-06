# Transaction Model Design

## Scope

This document defines the transaction model for the new app only.

Out of scope:

- migration from the legacy app
- backward compatibility with legacy field meanings

## Goals

- Make each transaction easy for users to understand in the UI
- Make aggregated numbers, especially `net_spend`, unambiguous
- Keep the model consistent across checking, savings, cash, credit card, and investment accounts
- Avoid duplicate concepts such as `transaction_type` and `semantic_type`

## Design Principles

1. Account type belongs to the account, not the transaction
2. Category carries the user-facing meaning of the transaction
3. Money flow should be explicit and separate from account balance behavior
4. Reporting behavior should be defined once and derived consistently

## Canonical Model

### Account

An account stores its own type.

- `account_type`: `checking | savings | cash | credit_card | investment | loan`

Legacy `debit` / `credit` card labels do not belong on transactions. They are account-level concepts.

### Category

Each category stores:

- `tier_1`
- `tier_2`
- `rollup_behavior`: `spend | income | transfer`

The category tells the user what the transaction is for.
The `rollup_behavior` tells the app how it should affect reporting.

Examples:

- `Groceries` => `spend`
- `Salary` => `income`
- `Other Income` => `income`
- `Credit Card Payment` => `transfer`
- `Investment Transfer` => `transfer`

### Transaction

Each transaction stores:

- `account_id`
- `amount`: always a positive numeric value
- `flow_direction`: `outflow | inflow`
- `category_tier_1`
- `category_tier_2`
- standard descriptive fields such as date, merchant, description, and memo

The transaction model does not store:

- `transaction_type`
- `semantic_type`

These meanings are derived from category and flow.

## Derived Meaning

Transaction meaning is derived from `rollup_behavior` and `flow_direction`.

| `rollup_behavior` | `flow_direction` | Meaning |
|---|---|---|
| `spend` | `outflow` | expense |
| `spend` | `inflow` | refund or reimbursement |
| `income` | `inflow` | income |
| `transfer` | `outflow` or `inflow` | transfer |

No extra label needs to be stored in the transaction model.

## Balance Semantics

`flow_direction` describes user-facing money movement. It does not directly describe how every account balance behaves.

Balance interpretation is derived from `account_type`.

### Asset accounts

Examples:

- `checking`
- `savings`
- `cash`
- most `investment` cash positions

Rules:

- `outflow` decreases balance
- `inflow` increases balance

### Liability accounts

Examples:

- `credit_card`
- `loan`

Rules:

- `outflow` increases amount owed
- `inflow` decreases amount owed

This keeps the transaction model consistent across both asset and liability accounts.

## Reporting Rules

### Spend

- `gross_spend = sum(spend + outflow)`
- `refunds = sum(spend + inflow)`
- `net_spend = gross_spend - refunds`

`net_spend` is the primary expense number shown to users.

### Income

- `income = sum(income + inflow)`

### Transfers

- all `transfer` categories are excluded from both spend and income totals

## UI Rules

- Amounts are displayed with a sign derived from `flow_direction`
- `outflow` displays as `-`
- `inflow` displays as `+`
- Category is the main user-facing explanation of the transaction
- No separate `transaction_type` or `semantic_type` is shown

If the UI exposes the flow field directly, it should use `Outflow / Inflow`, not `Debit / Credit`.

## Validation Rules

- `spend` categories may use both `outflow` and `inflow`
- `income` categories should normally use `inflow`
- `transfer` categories may use both `outflow` and `inflow`

Rows with invalid or unusual combinations should be sent to review instead of silently reclassified.

Example:

- `Salary + outflow` should be treated as invalid or review-required

## Edge Cases

### Refunds and reimbursements

- stay in the original spending category
- use `inflow`
- reduce `net_spend`

Examples:

- `Groceries + inflow` => grocery refund
- `Dining + inflow` => dining reimbursement

### Credit card payments

- category: `Credit Card Payment`
- `rollup_behavior = transfer`
- excluded from `net_spend`

Both sides of the payment remain transfers:

- checking side => `outflow`
- credit card side => `inflow`

### Transfers to savings, cash, or investments

- use transfer categories
- `rollup_behavior = transfer`
- excluded from `net_spend`

### Salary and other income

- use income categories
- usually `inflow`
- included in income totals

### Historical debt payoff

If the product wants to support budgeting for repayment of old debt, use a dedicated spend category such as `Debt Paydown`.

Rule:

- the outgoing payment from the funding account can count as spend
- the incoming credit-card-side leg remains a transfer

This should be treated as an explicit exception, not the default rule for credit card payments.

## Examples

- `Groceries` + `outflow` => expense
- `Groceries` + `inflow` => refund
- `Salary` + `inflow` => income
- `Credit Card Payment` + `outflow` => transfer
- `Credit Card Payment` + `inflow` => transfer
- `Investment Transfer` + `outflow` => transfer

## Summary

The model is intentionally small:

- account type lives on the account
- category carries meaning
- flow direction carries money movement
- reporting is driven by category `rollup_behavior`

This keeps transaction rows understandable to users and keeps `net_spend` clear and consistent.
