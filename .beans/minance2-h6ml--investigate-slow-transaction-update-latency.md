---
# minance2-h6ml
title: Investigate slow transaction update latency
status: completed
type: bug
priority: normal
created_at: 2026-05-22T02:31:40Z
updated_at: 2026-05-22T03:13:22Z
---

Investigate why PUT /v1/transactions/:id takes about 5 seconds for transaction updates.\n\n- [x] Trace API route and persistence path\n- [x] Reproduce or measure latency locally if feasible\n- [x] Identify root cause candidates with evidence\n- [x] Produce fix plan

## Summary of Changes\n\nInvestigated PUT /v1/transactions/:id latency. Found that updateTransaction does an in-memory mutation followed by saveStore and addAuditEvent; both persist through full SQLite store rewrites. saveStore also forces the next request to reload the entire SQLite store. Benchmarked local temp SQLite copy: loadStore ~812 ms, warm updateTransaction ~574 ms, full save ~213 ms, transaction-table save ~180 ms, audit event save ~180 ms with 3,755 transactions. Root cause is coarse full-store persistence and forced reloads on hot mutation paths, which scales with data size and can explain ~5s on larger/live data. Fix plan: introduce targeted SQLite row/table persistence for transaction updates plus coalesced audit writes; stop forcing self-reload after local writes and instead invalidate derived caches directly; add request/write timing logs and regression tests.

## Revalidation\n\n- [x] Check whether the original conclusion explains this specific fetch path\n- [x] Compare hot vs cold costs and synchronous post-update work\n- [x] Validate or revise the fix plan

## Revalidation Notes\n\nRechecked the root cause. The original diagnosis was directionally correct but incomplete. The strongest explanation is the combination of synchronous sqlite3 CLI persistence, full-store rewrite scripts, 5s SQLite busy timeout, and forced cache reload after local writes. A raw PUT can be slow because it may begin with a forced full reload from a previous mutation, then it performs a full store rewrite for the transaction and another full store rewrite for the audit event. A lock experiment on a temp DB showed sqlite3 writers can sit behind a held write transaction and produce lock waits/errors tied to the 5s busy timeout, and because the generated script continues past failed BEGIN statements it can wait repeatedly. The fix plan should prioritize replacing full-store sqlite3 script writes on hot paths with targeted atomic row persistence and coalesced audit writes, then fix local-write cache invalidation. saveStoreTables alone is insufficient because it still deletes/reinserts whole tables and transaction updates may dirty transactions, accounts, category_rules, and audit_events.

## Synology Timing Update\n\nUser measured PUT /v1/transactions/txn_c37531a6-6e50-433a-99a4-02ce159dfd5b at ~3.4s when changing transaction_type for a single transaction on Synology-hosted service at 10.0.0.20:6001. This strengthens the hot-path persistence diagnosis: a type-only edit still uses the same broad updateTransaction path and persists via full SQLite store rewrites plus audit write.

## Network Timing Detail\n\nBrowser devtools shows 'Waiting for server response' / TTFB at 3.41s for the single-transaction update. This isolates the visible latency to server-side work before the first response byte, not request upload, response download, frontend rendering, or post-response UI work.
