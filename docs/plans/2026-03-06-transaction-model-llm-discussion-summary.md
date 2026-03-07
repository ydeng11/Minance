# Transaction Model and LLM Processing Discussion Summary

## Scope of this note

This note summarizes the current discussion around:

1. Whether the transaction model should be refactored, and how.
2. To what extent LLM should be used to process imported transactions.

This is a design summary, not an implementation plan.

## Current model

The current system already carries several different concepts on a transaction:

- First-tier category: coarse grouping such as `Essential`, `Extra`, `Neutral`, `Other`.
- Second-tier category: granular category such as `Groceries`, `Dining`, `Salary`, `Credit Card Payments`.
- `direction`: `debit` or `credit`, relative to the account.
- `transaction_type`: currently `expense`, `income`, or `transfer`.

The discussion identified that these fields do not yet give users a fully clear picture of the true economic meaning of many transactions such as:

- merchant purchase
- refund
- credit card payment
- salary
- reimbursement
- internal transfer
- external transfer
- investment transfer
- other income

## Recommendation: refactor the model, but do it as a layered clarification, not a full rewrite

The recommendation is to refactor the transaction model because the current model mixes together:

- budgeting category
- account movement direction
- accounting truth
- real-world transaction meaning

The recommended target model is:

- `category_coarse`: first-tier budgeting bucket
- `category_final`: second-tier detailed category
- `direction`: money movement relative to the current account
- `transaction_type`: coarse accounting truth, kept as `expense | income | transfer`
- `semantic_type`: more specific meaning of the transaction

Examples:

- grocery card swipe:
  - `direction=debit`
  - `transaction_type=expense`
  - `semantic_type=merchant_purchase`
- salary deposit:
  - `direction=credit`
  - `transaction_type=income`
  - `semantic_type=salary`
- payment sent to credit card:
  - `direction=debit` on checking
  - `transaction_type=transfer`
  - `semantic_type=credit_card_payment`
- internal movement to brokerage:
  - `transaction_type=transfer`
  - `semantic_type=internal_transfer` or `investment_transfer`

## Recommendation: do not collapse `transaction_type` and `semantic_type`

The discussion concluded that these two fields should stay separate.

Reason:

- `transaction_type` is the coarse accounting axis needed for balances, spending/income truth, filters, and high-level analytics.
- `semantic_type` is the more human-readable explanation of what the transaction actually represents.

If only one field is kept, it becomes overloaded and harder to use consistently for reporting and user understanding.

Recommended rule:

- keep `transaction_type` small and stable
- let `semantic_type` carry richer labels such as:
  - `merchant_purchase`
  - `refund`
  - `credit_card_payment`
  - `salary`
  - `reimbursement`
  - `interest`
  - `other_income`
  - `internal_transfer`
  - `external_transfer`
  - `investment_transfer`
  - `fee`

## Open design point

One issue is still unresolved and materially affects the accounting model:

- How should `refund` be treated in canonical reporting?

Possible policies:

- treat refund as negative expense / contra-expense
- treat refund as income
- treat refund as its own canonical class and derive reporting views from it

Current recommendation:

- refunds should likely reduce expense rather than count as income, because that better preserves the ground truth of spending and earnings

This still needs explicit product confirmation before implementation.

## Recommendation: use LLM heavily for classification, but not for raw parsing

The user direction is that categorization and semantic understanding should rely on LLM.

The recommended boundary is:

- Use deterministic code for:
  - file parsing
  - header mapping
  - amount parsing
  - date parsing
  - currency parsing
  - sign extraction
  - row normalization
  - dedupe and validation
- Use LLM as the primary decision-maker for:
  - second-tier category selection
  - semantic transaction meaning
  - coarse accounting classification where needed

In practice:

- LLM should decide `category_final`
- LLM should decide `semantic_type`
- `transaction_type` should either:
  - be directly returned by the LLM and validated, or
  - be deterministically derived from `semantic_type`

Recommended preference:

- let the LLM output both `semantic_type` and `transaction_type`
- validate the result against hard invariants
- send contradictory or uncertain rows to review instead of silently overriding them

## Recommendation: prefer batch LLM classification over pure row-by-row classification

The discussion recommended batch-oriented LLM processing for better consistency and robustness.

Reason:

- many meanings depend on neighboring rows and repeated patterns
- credit card payments, transfers, payroll, and refunds are easier to understand in file context
- the same merchant should classify consistently within the same import

Recommended LLM workflow:

1. Parse and normalize the import deterministically.
2. Group rows into manageable chunks with surrounding import context.
3. Ask the LLM to classify rows using:
   - the imported batch
   - existing historical transactions
   - known account context
   - the category taxonomy
4. Store:
   - `category_final`
   - `semantic_type`
   - `transaction_type`
   - confidence / rationale
5. Apply validation and send low-confidence or contradictory rows to review.

## Recommended LLM guardrails

Even in an LLM-first design, the system should keep hard non-LLM safeguards:

- schema validation
- allowed enum validation
- account-aware contradiction checks
- transfer symmetry checks where possible
- confidence thresholds and review queues
- deterministic reconciliation and balance math

The recommendation is:

- LLM should be authoritative for classification
- code should be authoritative for parsing, invariants, and safety

## Summary recommendation

Yes, the transaction model should be refactored.

Recommended direction:

- preserve category tiers
- preserve `direction`
- keep `transaction_type` as coarse accounting truth
- add `semantic_type` for detailed real-world meaning

Recommended LLM scope:

- LLM-primary for classification
- deterministic for parsing and safety
- batch context preferred over isolated row-by-row labeling

Main remaining product decision:

- finalize canonical refund treatment before implementation
