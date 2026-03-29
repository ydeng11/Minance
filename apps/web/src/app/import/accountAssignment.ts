import type { Account, ImportReconciliationAccount, ProcessedRow } from "@/lib/api/types";

export interface ImportAccountOption {
  value: string;
  label: string;
}

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

function findImportAccountByIdentity(accounts: Account[], accountName: string) {
  const normalizedTarget = normalizeAccountKey(accountName);
  if (!normalizedTarget) {
    return null;
  }

  return accounts.find((account) => (
    normalizeAccountKey(account.displayName) === normalizedTarget ||
    normalizeAccountKey(account.displayIdentifier) === normalizedTarget ||
    normalizeAccountKey(account.normalizedKey) === normalizedTarget
  )) || null;
}

export function resolveImportAccountValue(accounts: Account[], currentAccountName = ""): string {
  const current = String(currentAccountName || "").trim();
  if (!current) {
    return "";
  }

  const match = findImportAccountByIdentity(accounts, current);
  return match?.displayName || current;
}

export function buildImportAccountOptions(accounts: Account[], currentAccountName = ""): ImportAccountOption[] {
  const options = accounts
    .map((account) => ({
      value: account.displayName,
      label: account.displayIdentifier || account.displayName
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  const current = String(currentAccountName || "").trim();
  if (!current) {
    return options;
  }

  const selectedValue = resolveImportAccountValue(accounts, current);
  if (selectedValue !== current || options.some((option) => option.value === current)) {
    return options;
  }

  return [{ value: current, label: current }, ...options];
}
