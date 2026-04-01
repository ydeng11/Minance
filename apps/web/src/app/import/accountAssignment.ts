import type {
  Account,
  ImportReconciliationAccount,
  ImportReconciliationResponse,
  ProcessedRow,
  ProcessedSummary
} from "@/lib/api/types";

interface ReprocessRowsFlowDependencies {
  reprocess: (importId: string) => Promise<{ total: number; summary: ProcessedSummary }>;
  refreshProcessedRows: (importId: string) => Promise<void>;
  refreshImports: () => Promise<void>;
  publishNotice: (notice: string) => void;
}

export interface ImportAccountOption {
  value: string;
  label: string;
}

export interface ImportAccountUsageSummary {
  importAccountName: string;
  normalizedImportAccountName: string;
  visibleRowCount: number;
  defaultInheritedRowIds: string[];
  exceptionRowIds: string[];
  allVisibleRowsShareOneAccountIdentity: boolean;
  sharedAccountIdentity: string | null;
}

export interface ImportIssueVisibilitySummary {
  invalidRows: number;
  duplicateRows: number;
  lowDirectionConfidenceRows: number;
  multipleAccountGroups: boolean;
  hasMissingAccount: boolean;
  hasDiscrepancy: boolean;
}

export interface ImportAccountReviewState {
  selectedAccountId: string;
  defaultRowIds: string[];
}

const BLANK_ACCOUNT_IDENTITY = "__blank__";

export function normalizeAccountKey(value: string | null | undefined): string {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function getReconciliationActionMode(entry: ImportReconciliationAccount): "assign_account" | "none" {
  if (entry.status === "account_missing" || !entry.accountId) {
    return "assign_account";
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

export function collectRowsWithoutExplicitAccountOverride(rows: ProcessedRow[]): string[] {
  return rows
    .filter((row) => !Object.prototype.hasOwnProperty.call(row.overrides, "account_name"))
    .map((row) => row.rowId);
}

export function resolveImportAccountSelectionId(rows: ProcessedRow[], accounts: Account[]): string {
  const inheritedRows = rows.filter((row) => !Object.prototype.hasOwnProperty.call(row.overrides, "account_name"));
  const candidateRows = inheritedRows.length > 0 ? inheritedRows : rows;
  if (!candidateRows.length) {
    return "";
  }

  const resolvedAccountKeys = Array.from(
    new Set(
      candidateRows
        .map((row) => normalizeAccountKey(row.normalized.account_name))
        .filter((value) => value.length > 0)
    )
  );

  if (resolvedAccountKeys.length !== 1) {
    return "";
  }

  const normalizedTarget = resolvedAccountKeys[0];
  const match = accounts.find((account) => (
    normalizeAccountKey(account.displayName) === normalizedTarget ||
    normalizeAccountKey(account.displayIdentifier) === normalizedTarget ||
    normalizeAccountKey(account.normalizedKey) === normalizedTarget
  ));

  return match?.id || "";
}

export function buildImportAccountReviewState(rows: ProcessedRow[], accounts: Account[]): ImportAccountReviewState {
  return {
    selectedAccountId: resolveImportAccountSelectionId(rows, accounts),
    defaultRowIds: collectRowsWithoutExplicitAccountOverride(rows)
  };
}

function resolveRowAccountKey(row: Pick<ProcessedRow, "normalized">): string {
  return normalizeAccountKey(row.normalized.account_name);
}

export function summarizeImportAccountUsage(rows: ProcessedRow[], importAccountName: string): ImportAccountUsageSummary {
  const normalizedImportAccountName = normalizeAccountKey(importAccountName);
  const resolvedAccountKeys = new Set<string>();
  const defaultInheritedRowIds: string[] = [];
  const exceptionRowIds: string[] = [];

  for (const row of rows) {
    const rowAccountKey = resolveRowAccountKey(row);
    const hasExplicitAccountOverride = Object.prototype.hasOwnProperty.call(row.overrides, "account_name");
    const isDefaultInheritedRow =
      !hasExplicitAccountOverride &&
      !!normalizedImportAccountName &&
      (!rowAccountKey || rowAccountKey === normalizedImportAccountName);

    if (isDefaultInheritedRow) {
      defaultInheritedRowIds.push(row.rowId);
    } else {
      exceptionRowIds.push(row.rowId);
    }

    if (rowAccountKey) {
      resolvedAccountKeys.add(rowAccountKey);
    } else if (normalizedImportAccountName) {
      resolvedAccountKeys.add(normalizedImportAccountName);
    } else {
      resolvedAccountKeys.add(BLANK_ACCOUNT_IDENTITY);
    }
  }

  const onlyAccountIdentity = resolvedAccountKeys.size === 1 ? Array.from(resolvedAccountKeys)[0] || null : null;

  return {
    importAccountName,
    normalizedImportAccountName,
    visibleRowCount: rows.length,
    defaultInheritedRowIds,
    exceptionRowIds,
    allVisibleRowsShareOneAccountIdentity: resolvedAccountKeys.size <= 1,
    sharedAccountIdentity: onlyAccountIdentity === BLANK_ACCOUNT_IDENTITY ? null : onlyAccountIdentity
  };
}

export function shouldShowImportIssues(summary: ImportIssueVisibilitySummary): boolean {
  return (
    summary.invalidRows > 0 ||
    summary.duplicateRows > 0 ||
    summary.lowDirectionConfidenceRows > 0 ||
    summary.multipleAccountGroups ||
    summary.hasMissingAccount ||
    summary.hasDiscrepancy
  );
}

export function buildImportIssueVisibilitySummary(
  rows: ProcessedRow[],
  reconciliation: ImportReconciliationResponse | null | undefined
): ImportIssueVisibilitySummary {
  const distinctAccountGroups = new Set(
    rows
      .map((row) => normalizeAccountKey(row.normalized.account_name))
      .filter((value) => value.length > 0)
  );

  return {
    invalidRows: rows.filter((row) => row.status === "invalid").length,
    duplicateRows: rows.filter((row) => row.status === "duplicate").length,
    lowDirectionConfidenceRows: rows.filter((row) => row.normalized.needs_direction_review).length,
    multipleAccountGroups: distinctAccountGroups.size > 1,
    hasMissingAccount: Number(reconciliation?.summary.missingAccounts || 0) > 0,
    hasDiscrepancy: reconciliation?.accounts.some((entry) => Math.abs(Number(entry.discrepancyAmount || 0)) >= 0.01) || false
  };
}

export function shouldShowReconciliationSummary(summary: Pick<ImportIssueVisibilitySummary, "multipleAccountGroups" | "hasMissingAccount" | "hasDiscrepancy">): boolean {
  return summary.multipleAccountGroups || summary.hasMissingAccount || summary.hasDiscrepancy;
}

export function buildReprocessNotice(total: number, summary: ProcessedSummary): string {
  return `Reprocessed ${total} rows (included: ${summary.included}, excluded: ${summary.excluded}, invalid: ${summary.invalid}).`;
}

export async function runReprocessRowsFlow(
  importId: string,
  dependencies: ReprocessRowsFlowDependencies
): Promise<void> {
  const reprocessed = await dependencies.reprocess(importId);
  await dependencies.refreshProcessedRows(importId);
  await dependencies.refreshImports();
  dependencies.publishNotice(buildReprocessNotice(reprocessed.total, reprocessed.summary));
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
