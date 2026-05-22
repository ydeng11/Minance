---
# minance2-845v
title: Investigate live Costco transaction create error
status: completed
type: bug
priority: normal
created_at: 2026-05-22T15:48:17Z
updated_at: 2026-05-22T15:52:44Z
---

Use the in-app browser at localhost:3000/transactions?range=90d to create a new transaction with account Costco (CITI | Credit), capture the error, and identify the focused cause.\n\n- [x] Reproduce the live create flow\n- [x] Capture the visible/API error\n- [x] Identify focused cause\n- [x] Recommend or implement focused fix

## Summary of Findings\n\nBrowser form remained open without surfacing a useful visible error. Directly posting the same transaction contract created txn_13f36005-9f95-48a8-b98c-edff1fdd54e1, but linked it to newly created account acct_097504bb-3427-479e-8d69-3daa1744f4d5 with normalizedKey costco instead of the existing Costco/CITI account acct_b990431d-49f7-4a68-82f3-8293d15b3441 with normalizedKey citi costco. Focused cause: the running API process was started before the account-identity fix and still uses the old manual transaction matcher. Focused solution: use the already-applied code fix from minance2-5lwe and restart the local API/dev server so localhost:3000 runs the updated resolver. Note: the API repro intentionally created a test transaction/account in local data.
