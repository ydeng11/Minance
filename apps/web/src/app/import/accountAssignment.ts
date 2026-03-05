import type { ImportReconciliationAccount, ProcessedRow } from "@/lib/api/types";

export function normalizeAccountKey(value: string | null | undefined): string {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function getReconciliationActionMode(entry: ImportReconciliationAccount): "create_adjustment" | "assign_account" | "none" {
  if (entry.status === "account_missing" || !entry.accountId) {
    return "assign_account";
  }

  if (Math.abs(Number(entry.discrepancyAmount || 0)) >= 0.01) {
    return "create_adjustment";
  }

  return "none";
}

export function collectVisibleSelectedRowIds(rows: ProcessedRow[], selectedRowIds: Set<string>): string[] {
  if (!rows.length || selectedRowIds.size === 0) {
    return [];
  }

  return rows.filter((row) => selectedRowIds.has(row.rowId)).map((row) => row.rowId);
}

export function collectRowIdsByAccountKey(rows: ProcessedRow[], accountKey: string): string[] {
  const normalizedTarget = normalizeAccountKey(accountKey);
  if (!normalizedTarget) {
    return [];
  }

  return rows
    .filter((row) => normalizeAccountKey(row.normalized.account_name) === normalizedTarget)
    .map((row) => row.rowId);
}
