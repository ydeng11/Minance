import type { AnalyticsMeta, Transaction } from "@/lib/api/types";

function compareIsoDesc(left?: string | null, right?: string | null) {
  return String(right || "").localeCompare(String(left || ""));
}

function compareIsoAsc(left?: string | null, right?: string | null) {
  return String(left || "").localeCompare(String(right || ""));
}

export type SortDirection = "desc" | "asc";

export function sortTransactionsForLedger(transactions: Transaction[], sortDirection: SortDirection = "desc") {
  const compare = sortDirection === "asc" ? compareIsoAsc : compareIsoDesc;
  return [...transactions].sort((left, right) => {
    const byTransactionDate = compare(left.transaction_date, right.transaction_date);
    if (byTransactionDate !== 0) {
      return byTransactionDate;
    }

    const byCreatedAt = compare(left.created_at, right.created_at);
    if (byCreatedAt !== 0) {
      return byCreatedAt;
    }

    const byUpdatedAt = compare(left.updated_at, right.updated_at);
    if (byUpdatedAt !== 0) {
      return byUpdatedAt;
    }

    return String(right.id || "").localeCompare(String(left.id || ""));
  });
}

export function getLedgerAmountBounds(meta: Pick<AnalyticsMeta, "amountBounds"> | null | undefined, transactions: Transaction[]) {
  if (meta?.amountBounds) {
    return meta.amountBounds;
  }

  const amounts = transactions
    .map((entry) => Math.abs(Number(entry.amount || 0)))
    .filter((value) => Number.isFinite(value));

  if (amounts.length === 0) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...amounts),
    max: Math.max(...amounts)
  };
}

export function buildCreateResultMessage(createdId: string, transactions: Transaction[]) {
  const isVisible = transactions.some((entry) => entry.id === createdId);
  if (isVisible) {
    return "Transaction created.";
  }

  return "Transaction created. It is outside the current filter view.";
}
