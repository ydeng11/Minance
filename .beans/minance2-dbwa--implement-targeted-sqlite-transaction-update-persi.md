---
# minance2-dbwa
title: Implement targeted SQLite transaction update persistence
status: completed
type: bug
priority: normal
created_at: 2026-05-22T03:17:57Z
updated_at: 2026-05-22T03:27:34Z
---

Implement hot-path targeted SQLite row upserts for PUT /v1/transactions/:id to reduce server-side TTFB on self-hosted Synology deployments.\n\n- [x] Add targeted SQLite row upsert helper\n- [x] Add single-save store/audit row persistence path\n- [x] Update transaction update mutation to use targeted persistence\n- [x] Add repository, store, and API regression tests\n- [x] Run Code Simplifier pass on changed code\n- [x] Run focused verification and project check

## Summary of Changes\n\nImplemented targeted SQLite row upserts for the transaction update hot path. PUT /v1/transactions/:id now appends the audit event in memory and persists only the changed transaction, resolved account, optional correction rule, and audit event rows through saveStoreRows. Added SQLite repository, store, and focused API regression tests. Ran Code Simplifier pass and verified with focused backend tests plus just check.
