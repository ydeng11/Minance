import type { AnalyticsMeta, Transaction } from "@/lib/api/types";

function compareIsoDesc(left?: string | null, right?: string | null) {
  return String(right || "").localeCompare(String(left || ""));
}

export function sortTransactionsForLedger(transactions: Transaction[]) {
  return [...transactions].sort((left, right) => {
    const byTransactionDate = compareIsoDesc(left.transaction_date, right.transaction_date);
    if (byTransactionDate !== 0) {
      return byTransactionDate;
    }

    const byCreatedAt = compareIsoDesc(left.created_at, right.created_at);
    if (byCreatedAt !== 0) {
      return byCreatedAt;
    }

    const byUpdatedAt = compareIsoDesc(left.updated_at, right.updated_at);
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
