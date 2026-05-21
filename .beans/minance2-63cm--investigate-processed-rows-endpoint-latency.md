---
# minance2-63cm
title: Investigate processed rows endpoint latency
status: completed
type: bug
priority: normal
created_at: 2026-05-21T01:54:23Z
updated_at: 2026-05-21T01:56:42Z
---

Investigate why GET /v1/imports/:id/processed-rows takes about 5 seconds for 75 rows.\n\n- [x] Trace endpoint and data-access path\n- [x] Reproduce or measure locally when possible\n- [x] Identify root cause\n- [x] Recommend improvements

## Investigation Notes\n\nGET /v1/imports/:id/processed-rows delegates to listImportProcessedRows in services/api/src/imports.ts. The row work itself is small for 75 rows, but request startup calls refreshStoreCacheIfChanged. When SQLite mtime differs or cache is cold, loadStore hydrates every table through sqlite3 CLI subprocesses and parses payload_json for all rows. Local measurement on the checked-out 8.6 MB database with 3,732 transactions showed full SQLite hydration at roughly 360-480 ms, with transactions alone around 334 ms. The live 5s symptom is consistent with a larger DB or repeated cache invalidation, not with 75 staged rows.\n\nSecondary multipliers: listImportProcessedRows calls processedRowsForImport twice; the import UI calls processed-rows twice during loadImportContext (visible page plus listAllProcessedRows), while getImportById and getImportReconciliation also rescan staged rows. Reconciliation additionally scans all transactions per account bucket.\n\nRecommended improvements: add a direct repository query for processed rows by import_id with SQL-level filtering/order/limit and summary aggregation; avoid full loadStore for this GET; combine the visible rows and allRows frontend calls for small imports; avoid recomputing summary from a second scan; reuse staged rows across details/reconciliation/processed responses or collapse them into a purpose-built import review endpoint.

## Summary of Changes\n\nCompleted the processed-rows latency investigation. No code changes were made. Root cause is the storage/read architecture around this endpoint: request handling can trigger full SQLite store hydration through sqlite3 CLI subprocesses, while the endpoint and import page duplicate staged-row scans. Recommended targeted SQL-level import-row reads and frontend/API response consolidation as follow-up implementation work.
