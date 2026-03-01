import { loadStore } from "./store.js";
import { computeDateRange, inDateRange, monthKey } from "./utils.js";

export function filterUserTransactions(userId, filters = {}) {
  const store = loadStore();
  const { start, end } = computeDateRange(filters.range, filters.start, filters.end);

  return store.transactions.filter((txn) => {
    if (txn.user_id !== userId) {
      return false;
    }
    if (!inDateRange(txn.transaction_date, start, end)) {
      return false;
    }
    if (filters.category && txn.category_final !== filters.category) {
      return false;
    }
    if (filters.merchant && txn.merchant_normalized !== filters.merchant) {
      return false;
    }
    if (filters.direction && txn.direction !== filters.direction) {
      return false;
    }
    return true;
  });
}

export function getUserDataBounds(userId) {
  const store = loadStore();
  const userTxns = store.transactions.filter((txn) => txn.user_id === userId);
  if (!userTxns.length) {
    return {
      start: null,
      end: null,
      count: 0
    };
  }

  const dates = userTxns
    .map((txn) => txn.transaction_date)
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b)));

  return {
    start: dates[0] || null,
    end: dates[dates.length - 1] || null,
    count: userTxns.length
  };
}

export function buildAppliedRange(filters = {}) {
  const requestedRange = filters.range || (filters.start || filters.end ? "custom" : "90d");
  const computed = computeDateRange(filters.range, filters.start, filters.end);
  return {
    range: requestedRange,
    start: computed.start,
    end: computed.end
  };
}

export function buildAnalyticsMeta(userId, filters = {}) {
  return {
    appliedRange: buildAppliedRange(filters),
    dataBounds: getUserDataBounds(userId)
  };
}

function toAmount(txn) {
  return Number(txn.amount || 0);
}

export function getOverview(userId, filters = {}) {
  const txns = filterUserTransactions(userId, filters);
  const spend = txns.filter((txn) => txn.direction === "debit").reduce((sum, txn) => sum + toAmount(txn), 0);
  const income = txns.filter((txn) => txn.direction === "credit").reduce((sum, txn) => sum + toAmount(txn), 0);

  const byMonth = {};
  for (const txn of txns) {
    const key = monthKey(txn.transaction_date) || "unknown";
    if (!byMonth[key]) {
      byMonth[key] = { month: key, spend: 0, income: 0, net: 0 };
    }
    if (txn.direction === "debit") {
      byMonth[key].spend += toAmount(txn);
    } else {
      byMonth[key].income += toAmount(txn);
    }
    byMonth[key].net = byMonth[key].income - byMonth[key].spend;
  }

  const merchantCounts = {};
  const merchantByMonth = {};
  for (const txn of txns) {
    if (txn.direction !== "debit") {
      continue;
    }
    merchantCounts[txn.merchant_normalized] = (merchantCounts[txn.merchant_normalized] || 0) + toAmount(txn);

    const key = `${txn.merchant_normalized}::${monthKey(txn.transaction_date)}`;
    merchantByMonth[key] = (merchantByMonth[key] || 0) + 1;
  }

  let recurringSpend = 0;
  const recurringMerchants = new Set();
  for (const key of Object.keys(merchantByMonth)) {
    const [merchant] = key.split("::");
    recurringMerchants.add(merchant);
  }
  for (const merchant of recurringMerchants) {
    const activeMonths = Object.keys(merchantByMonth).filter((key) => key.startsWith(`${merchant}::`)).length;
    if (activeMonths >= 2) {
      recurringSpend += merchantCounts[merchant] || 0;
    }
  }

  return {
    summary: {
      totalSpend: round2(spend),
      totalIncome: round2(income),
      netFlow: round2(income - spend),
      recurringSpend: round2(recurringSpend),
      transactionCount: txns.length
    },
    trend: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map((entry) => ({
      ...entry,
      spend: round2(entry.spend),
      income: round2(entry.income),
      net: round2(entry.net)
    })),
    topCategories: getCategoryRollup(userId, filters).slice(0, 5),
    topMerchants: getMerchantRollup(userId, filters).slice(0, 5),
    meta: buildAnalyticsMeta(userId, filters)
  };
}

export function getCategoryRollup(userId, filters = {}) {
  const txns = filterUserTransactions(userId, filters).filter((txn) => txn.direction === "debit");
  const grouped = {};
  for (const txn of txns) {
    grouped[txn.category_final] = (grouped[txn.category_final] || 0) + toAmount(txn);
  }

  return Object.entries(grouped)
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);
}

export function getMerchantRollup(userId, filters = {}) {
  const txns = filterUserTransactions(userId, filters).filter((txn) => txn.direction === "debit");
  const grouped = {};
  for (const txn of txns) {
    grouped[txn.merchant_normalized] = (grouped[txn.merchant_normalized] || 0) + toAmount(txn);
  }

  const total = Object.values(grouped).reduce((sum, amount) => sum + amount, 0) || 1;

  const items = Object.entries(grouped)
    .map(([merchant, amount]) => ({
      merchant,
      amount: round2(amount),
      share: round2((amount / total) * 100)
    }))
    .sort((a, b) => b.amount - a.amount);

  const concentration = items.reduce((sum, item) => sum + (item.share / 100) ** 2, 0);

  return items.map((entry, idx) => ({ ...entry, rank: idx + 1, concentrationIndex: round4(concentration) }));
}

export function getHeatmap(userId, filters = {}) {
  const txns = filterUserTransactions(userId, filters).filter((txn) => txn.direction === "debit");
  const buckets = new Map();

  for (const txn of txns) {
    const date = new Date(`${txn.transaction_date}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const weekday = date.getUTCDay();
    const weekOfYear = getWeekOfYear(date);
    const key = `${weekOfYear}-${weekday}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        week: weekOfYear,
        weekday,
        amount: 0,
        count: 0
      });
    }

    const bucket = buckets.get(key);
    bucket.amount += toAmount(txn);
    bucket.count += 1;
  }

  return Array.from(buckets.values())
    .map((entry) => ({ ...entry, amount: round2(entry.amount) }))
    .sort((a, b) => (a.week === b.week ? a.weekday - b.weekday : a.week - b.week));
}

export function getAnomalies(userId, filters = {}) {
  const txns = filterUserTransactions(userId, filters).filter((txn) => txn.direction === "debit");
  if (!txns.length) {
    return [];
  }

  const values = txns.map(toAmount);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length - 1);
  const std = Math.sqrt(variance);
  const threshold = mean + std * 2;

  const merchantSeenByMonth = {};
  for (const txn of txns) {
    const month = monthKey(txn.transaction_date);
    if (!merchantSeenByMonth[month]) {
      merchantSeenByMonth[month] = new Set();
    }
    merchantSeenByMonth[month].add(txn.merchant_normalized);
  }

  return txns
    .filter((txn) => {
      const amount = toAmount(txn);
      if (amount >= threshold) {
        return true;
      }

      const month = monthKey(txn.transaction_date);
      const previousMonth = shiftMonth(month, -1);
      if (!previousMonth) {
        return false;
      }

      const previousSet = merchantSeenByMonth[previousMonth];
      return previousSet ? !previousSet.has(txn.merchant_normalized) && amount > mean * 1.3 : false;
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20)
    .map((txn) => ({
      transactionId: txn.id,
      transactionDate: txn.transaction_date,
      merchant: txn.merchant_normalized,
      amount: round2(txn.amount),
      category: txn.category_final,
      reason:
        txn.amount >= threshold
          ? "amount_outlier"
          : "new_merchant_spike"
    }));
}

function getWeekOfYear(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((date - start) / (24 * 60 * 60 * 1000));
  return Math.floor(dayOfYear / 7) + 1;
}

function shiftMonth(monthText, delta) {
  if (!monthText || !/^\d{4}-\d{2}$/.test(monthText)) {
    return null;
  }

  const [year, month] = monthText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}
