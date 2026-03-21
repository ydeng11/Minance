import { loadStore } from "./store.ts";
import { computeDateRange, inDateRange, monthKey } from "./utils.ts";
import { applySharedTransactionFilters } from "./transactionFilters.ts";
import {
  CATEGORY_VIEW_COARSE,
  createCategoryResolver,
  ensureCategoryStrategyForUser,
  normalizeCategoryView
} from "./category-strategy.ts";

const TAG_PATTERN = /^[a-z0-9]+(?:[ _-][a-z0-9]+)*$/;

function resolveTxnCategory(resolveCategory, txn) {
  return resolveCategory({
    categoryFinal: txn.category_final,
    categoryRaw: txn.category_raw,
    merchantNormalized: txn.merchant_normalized,
    merchantRaw: txn.merchant_raw,
    description: txn.description,
    memo: txn.memo
  });
}

function normalizeTransactionForAnalytics(txn) {
  const rawAmount = Number(txn?.amount ?? 0);
  const amount = Number.isFinite(rawAmount) ? Math.abs(rawAmount) : 0;
  const rawDirection = String(txn?.direction || "").trim().toLowerCase();

  let direction = "outflow";
  if (rawDirection === "inflow" || rawDirection === "outflow") {
    direction = rawDirection;
  } else if (rawDirection === "credit") {
    direction = "inflow";
  } else if (rawDirection === "debit") {
    direction = "outflow";
  } else if (rawAmount > 0) {
    direction = "inflow";
  }

  return {
    ...txn,
    amount,
    direction
  };
}

function normalizeFilterList(rawValue) {
  const values = Array.isArray(rawValue) ? rawValue : rawValue == null ? [] : [rawValue];
  const cleaned = [];
  const seen = new Set();

  for (const value of values) {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    cleaned.push(normalized);
  }

  return cleaned;
}

function normalizeIncludeExcluded(rawValue, defaultValue = true) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return defaultValue;
  }

  if (typeof rawValue === "string") {
    const normalized = rawValue.trim().toLowerCase();
    if (!normalized) {
      return defaultValue;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
  }

  return Boolean(rawValue);
}

function readIncludeExcludedFilter(filters = {}) {
  if (Object.hasOwn(filters, "include_excluded")) {
    return filters.include_excluded;
  }
  return filters.includeExcluded;
}

function withDefaultRollupExclusion(filters = {}) {
  if (readIncludeExcludedFilter(filters) !== undefined) {
    return filters;
  }
  return {
    ...filters,
    include_excluded: false
  };
}

function normalizeAnalyticsFilters(filters = {}) {
  const effectiveFilters = withDefaultRollupExclusion(filters);
  return {
    effectiveFilters,
    categoryView: normalizeCategoryView(effectiveFilters.category_view || effectiveFilters.categoryView)
  };
}

export function filterUserTransactions(userId, filters = {}) {
  const store = loadStore();
  const { start, end } = computeDateRange(filters.range, filters.start, filters.end);
  const categoryView = normalizeCategoryView(filters.category_view || filters.categoryView);
  const strategy = ensureCategoryStrategyForUser(userId);
  const resolveCategory = createCategoryResolver(strategy);
  const categoryFilters = normalizeFilterList(filters.category);
  const includeExcluded = normalizeIncludeExcluded(readIncludeExcludedFilter(filters), true);

  const filtered = [];
  for (const txn of store.transactions) {
    if (txn.user_id !== userId) {
      continue;
    }
    if (txn.deleted_at) {
      continue;
    }
    if (!inDateRange(txn.transaction_date, start, end)) {
      continue;
    }

    const normalizedTxn = normalizeTransactionForAnalytics(txn);
    let resolvedCategory = null;
    if (!includeExcluded || categoryFilters.length) {
      resolvedCategory = resolveTxnCategory(resolveCategory, normalizedTxn);
      if (!includeExcluded && resolvedCategory.categoryExcluded) {
        continue;
      }
    }

    if (categoryFilters.length) {
      const categoryToMatch = categoryView === CATEGORY_VIEW_COARSE
        ? resolvedCategory.categoryCoarse
        : resolvedCategory.categoryGranular;
      if (!categoryFilters.includes(categoryToMatch)) {
        continue;
      }
    }
    if (filters.merchant && normalizedTxn.merchant_normalized !== filters.merchant) {
      continue;
    }
    if (filters.direction && normalizedTxn.direction !== filters.direction) {
      continue;
    }
    filtered.push(normalizedTxn);
  }

  return applySharedTransactionFilters(filtered, filters);
}

export function getUserDataBounds(userId) {
  const store = loadStore();
  const userTxns = store.transactions.filter((txn) => txn.user_id === userId && !txn.deleted_at);
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

function normalizeExistingTags(rawTags) {
  if (!Array.isArray(rawTags)) {
    return [];
  }

  const tags = [];
  const seen = new Set();

  for (const rawTag of rawTags) {
    if (typeof rawTag !== "string") {
      continue;
    }

    const normalized = rawTag.trim().toLowerCase();
    if (!normalized || !TAG_PATTERN.test(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    tags.push(normalized);
  }

  return tags;
}

function buildAmountBounds(transactions = []) {
  if (!transactions.length) {
    return { min: 0, max: 0 };
  }

  const amounts = transactions
    .map((entry) => toAmount(entry))
    .filter((value) => Number.isFinite(value));

  if (!amounts.length) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...amounts),
    max: Math.max(...amounts)
  };
}

function buildAvailableTags(transactions = []) {
  const tags = [];
  const seen = new Set();

  for (const transaction of transactions) {
    for (const tag of normalizeExistingTags(transaction?.tags)) {
      if (seen.has(tag)) {
        continue;
      }
      seen.add(tag);
      tags.push(tag);
    }
  }

  return tags.sort((left, right) => left.localeCompare(right));
}

export function buildAnalyticsMeta(userId, filters = {}, transactions = null) {
  const meta = {
    appliedRange: buildAppliedRange(filters),
    dataBounds: getUserDataBounds(userId),
    categoryView: normalizeCategoryView(filters.category_view || filters.categoryView)
  };

  if (Array.isArray(transactions)) {
    meta.amountBounds = buildAmountBounds(transactions);
    meta.availableTags = buildAvailableTags(transactions);
  }

  return meta;
}

function toAmount(txn) {
  const amount = Number(txn?.amount || 0);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Math.abs(amount);
}

function buildCategoryRollupFromTransactions(txns, resolveCategory, categoryView) {
  const grouped = {};
  let totalAmount = 0;

  for (const txn of txns) {
    if (txn.direction !== "outflow") {
      continue;
    }

    const categoryMeta = resolveTxnCategory(resolveCategory, txn);
    const categoryName = categoryView === CATEGORY_VIEW_COARSE
      ? categoryMeta.categoryCoarse
      : categoryMeta.categoryGranular;
    const emoji = categoryView === CATEGORY_VIEW_COARSE
      ? categoryMeta.categoryCoarseEmoji
      : categoryMeta.categoryEmoji;

    if (!grouped[categoryName]) {
      grouped[categoryName] = {
        category: categoryName,
        amount: 0,
        count: 0,
        emoji,
        coarseKey: categoryMeta.categoryCoarseKey,
        excluded: categoryMeta.categoryExcluded
      };
    }

    const amount = toAmount(txn);
    grouped[categoryName].amount += amount;
    grouped[categoryName].count += 1;
    totalAmount += amount;
  }

  const safeTotal = totalAmount || 1;
  return Object.values(grouped)
    .map((entry) => ({
      ...entry,
      amount: round2(entry.amount),
      share: round2((entry.amount / safeTotal) * 100)
    }))
    .sort((a, b) => b.amount - a.amount);
}

function buildExplorerCategoryRollupFromTransactions(txns, resolveCategory, categoryView) {
  const grouped = {};
  let totalSpend = 0;
  let totalIncome = 0;

  for (const txn of txns) {
    const categoryMeta = resolveTxnCategory(resolveCategory, txn);
    const categoryName = categoryView === CATEGORY_VIEW_COARSE
      ? categoryMeta.categoryCoarse
      : categoryMeta.categoryGranular;
    const emoji = categoryView === CATEGORY_VIEW_COARSE
      ? categoryMeta.categoryCoarseEmoji
      : categoryMeta.categoryEmoji;

    if (!grouped[categoryName]) {
      grouped[categoryName] = {
        category: categoryName,
        spend: 0,
        income: 0,
        transactionCount: 0,
        emoji,
        coarseKey: categoryMeta.categoryCoarseKey,
        excluded: categoryMeta.categoryExcluded
      };
    }

    const amount = toAmount(txn);
    if (txn.direction === "outflow") {
      grouped[categoryName].spend += amount;
      totalSpend += amount;
    } else {
      grouped[categoryName].income += amount;
      totalIncome += amount;
    }
    grouped[categoryName].transactionCount += 1;
  }

  const safeTotalSpend = totalSpend || 1;
  const safeTotalIncome = totalIncome || 1;

  return Object.values(grouped)
    .map((entry) => ({
      ...entry,
      spend: round2(entry.spend),
      income: round2(entry.income),
      net: round2(entry.income - entry.spend),
      amount: round2(entry.spend),
      count: entry.transactionCount,
      share: round2((entry.spend / safeTotalSpend) * 100),
      spendShare: round2((entry.spend / safeTotalSpend) * 100),
      incomeShare: round2((entry.income / safeTotalIncome) * 100)
    }))
    .sort((a, b) => {
      if (b.amount !== a.amount) {
        return b.amount - a.amount;
      }
      if (b.income !== a.income) {
        return b.income - a.income;
      }
      return a.category.localeCompare(b.category);
    });
}

function buildCategoryCompositionItems(grouped) {
  const entries = Object.values(grouped);
  const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const safeTotal = totalAmount || 1;

  return entries
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4)
    .map((entry) => ({
      category: entry.category,
      amount: round2(entry.amount),
      share: round2((entry.amount / safeTotal) * 100),
      emoji: entry.emoji
    }));
}

function buildExplorerTrendFromTransactions(txns, resolveCategory, categoryView) {
  const byMonth = {};

  for (const txn of txns) {
    const key = monthKey(txn.transaction_date) || "unknown";
    if (!byMonth[key]) {
      byMonth[key] = {
        month: key,
        spend: 0,
        income: 0,
        spendBuckets: {},
        incomeBuckets: {}
      };
    }

    const bucket = byMonth[key];
    const categoryMeta = resolveTxnCategory(resolveCategory, txn);
    const categoryName = categoryView === CATEGORY_VIEW_COARSE
      ? categoryMeta.categoryCoarse
      : categoryMeta.categoryGranular;
    const emoji = categoryView === CATEGORY_VIEW_COARSE
      ? categoryMeta.categoryCoarseEmoji
      : categoryMeta.categoryEmoji;
    const amount = toAmount(txn);

    if (txn.direction === "outflow") {
      bucket.spend += amount;
      if (!bucket.spendBuckets[categoryName]) {
        bucket.spendBuckets[categoryName] = {
          category: categoryName,
          amount: 0,
          emoji
        };
      }
      bucket.spendBuckets[categoryName].amount += amount;
      continue;
    }

    bucket.income += amount;
    if (!bucket.incomeBuckets[categoryName]) {
      bucket.incomeBuckets[categoryName] = {
        category: categoryName,
        amount: 0,
        emoji
      };
    }
    bucket.incomeBuckets[categoryName].amount += amount;
  }

  return Object.values(byMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((entry) => ({
      month: entry.month,
      spend: round2(entry.spend),
      income: round2(entry.income),
      net: round2(entry.income - entry.spend),
      spendComposition: buildCategoryCompositionItems(entry.spendBuckets),
      incomeComposition: buildCategoryCompositionItems(entry.incomeBuckets)
    }));
}

function buildExplorerWeekdaySummary(txns) {
  const buckets = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    amount: 0,
    count: 0
  }));

  for (const txn of txns) {
    const date = new Date(`${txn.transaction_date}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const weekday = date.getUTCDay();
    buckets[weekday].amount += toAmount(txn);
    buckets[weekday].count += 1;
  }

  return buckets.map((entry) => ({
    ...entry,
    amount: round2(entry.amount)
  }));
}

function buildExplorerCategoryWeekdayHeatmap(txns, resolveCategory, categoryView) {
  const grouped = {};

  for (const txn of txns) {
    const date = new Date(`${txn.transaction_date}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const categoryMeta = resolveTxnCategory(resolveCategory, txn);
    const categoryName = categoryView === CATEGORY_VIEW_COARSE
      ? categoryMeta.categoryCoarse
      : categoryMeta.categoryGranular;
    const emoji = categoryView === CATEGORY_VIEW_COARSE
      ? categoryMeta.categoryCoarseEmoji
      : categoryMeta.categoryEmoji;

    if (!grouped[categoryName]) {
      grouped[categoryName] = {
        category: categoryName,
        emoji,
        coarseKey: categoryMeta.categoryCoarseKey,
        totalSpend: 0,
        transactionCount: 0,
        cells: Array.from({ length: 7 }, (_, weekday) => ({
          weekday,
          amount: 0,
          count: 0
        }))
      };
    }

    const weekday = date.getUTCDay();
    const amount = toAmount(txn);
    grouped[categoryName].totalSpend += amount;
    grouped[categoryName].transactionCount += 1;
    grouped[categoryName].cells[weekday].amount += amount;
    grouped[categoryName].cells[weekday].count += 1;
  }

  return Object.values(grouped)
    .map((entry) => ({
      ...entry,
      totalSpend: round2(entry.totalSpend),
      cells: entry.cells.map((cell) => ({
        ...cell,
        amount: round2(cell.amount)
      }))
    }))
    .sort((a, b) => {
      if (b.totalSpend !== a.totalSpend) {
        return b.totalSpend - a.totalSpend;
      }
      return a.category.localeCompare(b.category);
    })
    .slice(0, 7);
}

export function getOverview(userId, filters = {}) {
  const { effectiveFilters, categoryView } = normalizeAnalyticsFilters(filters);
  const strategy = ensureCategoryStrategyForUser(userId);
  const resolveCategory = createCategoryResolver(strategy);
  const txns = filterUserTransactions(userId, effectiveFilters);
  const spend = txns.filter((txn) => txn.direction === "outflow").reduce((sum, txn) => sum + toAmount(txn), 0);
  const income = txns.filter((txn) => txn.direction === "inflow").reduce((sum, txn) => sum + toAmount(txn), 0);

  const byMonth = {};
  for (const txn of txns) {
    const key = monthKey(txn.transaction_date) || "unknown";
    if (!byMonth[key]) {
      byMonth[key] = { month: key, spend: 0, income: 0, net: 0 };
    }
    if (txn.direction === "outflow") {
      byMonth[key].spend += toAmount(txn);
    } else {
      byMonth[key].income += toAmount(txn);
    }
    byMonth[key].net = byMonth[key].income - byMonth[key].spend;
  }

  // Rule-based calculation: sum outflow transactions with a recurring rule
  let recurringSpend = 0;
  for (const txn of txns) {
    if (txn.direction !== "outflow") continue;
    if (txn.recurring_rule_id) {
      recurringSpend += toAmount(txn);
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
    topCategories: buildCategoryRollupFromTransactions(txns, resolveCategory, categoryView).slice(0, 5),
    topMerchants: getMerchantRollup(userId, effectiveFilters).slice(0, 5),
    meta: buildAnalyticsMeta(userId, {
      ...effectiveFilters,
      category_view: categoryView
    })
  };
}

export function getCategoryRollup(userId, filters = {}) {
  const { effectiveFilters, categoryView } = normalizeAnalyticsFilters(filters);
  const strategy = ensureCategoryStrategyForUser(userId);
  const resolveCategory = createCategoryResolver(strategy);
  const txns = filterUserTransactions(userId, effectiveFilters);
  return buildCategoryRollupFromTransactions(txns, resolveCategory, categoryView);
}

export function getMerchantRollup(userId, filters = {}) {
  const effectiveFilters = withDefaultRollupExclusion(filters);
  const txns = filterUserTransactions(userId, effectiveFilters).filter((txn) => txn.direction === "outflow");
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

export function getAccountRollup(userId, filters = {}) {
  const store = loadStore();
  const effectiveFilters = withDefaultRollupExclusion(filters);
  const txns = filterUserTransactions(userId, effectiveFilters);
  const accountById = new Map(
    store.accounts
      .filter((entry) => entry.userId === userId)
      .map((entry) => [entry.id, entry])
  );
  const grouped = {};
  let totalOutflow = 0;

  for (const txn of txns) {
    const account = txn.account_id ? (accountById.get(txn.account_id) || null) : null;
    const accountName = account?.displayName || String(txn.account_key || "").trim() || "Unassigned";
    const accountKey = account?.normalizedKey || String(txn.account_key || "").trim().toLowerCase() || "unassigned";
    const groupKey = String(txn.account_id || accountKey);

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        accountId: txn.account_id || account?.id || null,
        accountKey,
        accountName,
        sourceInstitution: account?.sourceInstitution || null,
        outflow: 0,
        inflow: 0,
        net: 0,
        transactionCount: 0,
        trendMap: {}
      };
    }

    const bucket = grouped[groupKey];
    const month = monthKey(txn.transaction_date) || "unknown";
    if (!bucket.trendMap[month]) {
      bucket.trendMap[month] = {
        month,
        outflow: 0,
        inflow: 0,
        net: 0
      };
    }

    const amount = toAmount(txn);
    if (txn.direction === "outflow") {
      bucket.outflow += amount;
      bucket.trendMap[month].outflow += amount;
      totalOutflow += amount;
    } else {
      bucket.inflow += amount;
      bucket.trendMap[month].inflow += amount;
    }

    bucket.net = bucket.inflow - bucket.outflow;
    bucket.trendMap[month].net = bucket.trendMap[month].inflow - bucket.trendMap[month].outflow;
    bucket.transactionCount += 1;
  }

  const safeTotalOutflow = totalOutflow || 1;
  const items = Object.values(grouped)
    .map((entry) => ({
      accountId: entry.accountId,
      accountKey: entry.accountKey,
      accountName: entry.accountName,
      sourceInstitution: entry.sourceInstitution,
      outflow: round2(entry.outflow),
      inflow: round2(entry.inflow),
      net: round2(entry.net),
      transactionCount: entry.transactionCount,
      share: round2((entry.outflow / safeTotalOutflow) * 100),
      trend: Object.values(entry.trendMap)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((bucket) => ({
          month: bucket.month,
          outflow: round2(bucket.outflow),
          inflow: round2(bucket.inflow),
          net: round2(bucket.net)
        }))
    }))
    .sort((a, b) => (b.outflow === a.outflow ? a.accountName.localeCompare(b.accountName) : b.outflow - a.outflow));

  return {
    items,
    totals: {
      accounts: items.length,
      outflow: round2(totalOutflow)
    }
  };
}

export function getHeatmap(userId, filters = {}) {
  const effectiveFilters = withDefaultRollupExclusion(filters);
  const txns = filterUserTransactions(userId, effectiveFilters).filter((txn) => txn.direction === "outflow");
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
  const { effectiveFilters, categoryView } = normalizeAnalyticsFilters(filters);
  const strategy = ensureCategoryStrategyForUser(userId);
  const resolveCategory = createCategoryResolver(strategy);
  const txns = filterUserTransactions(userId, effectiveFilters).filter((txn) => txn.direction === "outflow");
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
    .map((txn) => {
      const categoryMeta = resolveTxnCategory(resolveCategory, txn);
      const category = categoryView === CATEGORY_VIEW_COARSE
        ? categoryMeta.categoryCoarse
        : categoryMeta.categoryGranular;
      return {
        transactionId: txn.id,
        transactionDate: txn.transaction_date,
        merchant: txn.merchant_normalized,
        amount: round2(txn.amount),
        category,
        categoryGranular: categoryMeta.categoryGranular,
        categoryCoarse: categoryMeta.categoryCoarse,
        emoji: categoryView === CATEGORY_VIEW_COARSE
          ? categoryMeta.categoryCoarseEmoji
          : categoryMeta.categoryEmoji,
        reason:
          txn.amount >= threshold
            ? "amount_outlier"
            : "new_merchant_spike"
      };
    });
}

export function getExplorerAnalytics(userId, filters = {}) {
  const { effectiveFilters, categoryView } = normalizeAnalyticsFilters(filters);
  const strategy = ensureCategoryStrategyForUser(userId);
  const resolveCategory = createCategoryResolver(strategy);
  const currentTransactions = filterUserTransactions(userId, effectiveFilters);
  const currentOutflowTransactions = currentTransactions.filter((txn) => txn.direction === "outflow");
  const currentOverview = getOverview(userId, {
    ...effectiveFilters,
    category_view: categoryView
  });
  const previousFilters = effectiveFilters.compare === "previous"
    ? derivePreviousComparisonFilters(effectiveFilters)
    : null;
  const previousOverview = previousFilters
    ? getOverview(userId, {
        ...previousFilters,
        category_view: categoryView
      })
    : null;
  const categorySelectorFilters = {
    ...effectiveFilters,
    category: null
  };
  const accountSelectorFilters = {
    ...effectiveFilters,
    account: null
  };

  return {
    summary: {
      current: currentOverview.summary,
      previous: previousOverview?.summary || null,
      delta: previousOverview ? buildSummaryDelta(currentOverview.summary, previousOverview.summary) : null,
      sparkline: buildSummarySparkline(currentTransactions, filters)
    },
    comparison: {
      enabled: Boolean(previousOverview),
      current: currentOverview.summary,
      previous: previousOverview?.summary || null,
      delta: previousOverview ? buildSummaryDelta(currentOverview.summary, previousOverview.summary) : null
    },
    trend: {
      items: buildExplorerTrendFromTransactions(currentTransactions, resolveCategory, categoryView)
    },
    categories: {
      items: buildExplorerCategoryRollupFromTransactions(
        filterUserTransactions(userId, {
          ...categorySelectorFilters,
          category_view: categoryView
        }),
        resolveCategory,
        categoryView
      )
    },
    accounts: getAccountRollup(userId, accountSelectorFilters),
    merchants: {
      items: getMerchantRollup(userId, effectiveFilters)
    },
    weekdaySummary: {
      items: buildExplorerWeekdaySummary(currentOutflowTransactions)
    },
    categoryWeekdayHeatmap: {
      items: buildExplorerCategoryWeekdayHeatmap(currentOutflowTransactions, resolveCategory, categoryView)
    },
    heatmap: {
      items: getHeatmap(userId, filters)
    },
    anomalies: {
      items: getAnomalies(userId, {
        ...effectiveFilters,
        category_view: categoryView
      })
    },
    meta: buildAnalyticsMeta(userId, {
      ...effectiveFilters,
      category_view: categoryView
    }, currentTransactions)
  };
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

function derivePreviousComparisonFilters(filters = {}) {
  const currentRange = computeDateRange(filters.range, filters.start, filters.end);
  if (!currentRange.start || !currentRange.end) {
    return null;
  }

  const currentStart = new Date(`${currentRange.start}T12:00:00Z`);
  const currentEnd = new Date(`${currentRange.end}T12:00:00Z`);
  if (Number.isNaN(currentStart.getTime()) || Number.isNaN(currentEnd.getTime()) || currentEnd < currentStart) {
    return null;
  }

  const days = Math.round((currentEnd.getTime() - currentStart.getTime()) / DAY_IN_MS) + 1;
  const previousEnd = new Date(currentStart);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - (days - 1));

  return {
    ...filters,
    start: formatDateYmd(previousStart),
    end: formatDateYmd(previousEnd),
    range: "custom"
  };
}

function buildSummaryDelta(currentSummary, previousSummary) {
  return {
    totalSpend: buildDeltaValue(currentSummary.totalSpend, previousSummary.totalSpend),
    totalIncome: buildDeltaValue(currentSummary.totalIncome, previousSummary.totalIncome),
    netFlow: buildDeltaValue(currentSummary.netFlow, previousSummary.netFlow),
    recurringSpend: buildDeltaValue(currentSummary.recurringSpend, previousSummary.recurringSpend),
    transactionCount: buildDeltaValue(currentSummary.transactionCount, previousSummary.transactionCount)
  };
}

function buildSummarySparkline(transactions, filters = {}) {
  const appliedRange = buildAppliedRange(filters);
  if (!appliedRange.end) {
    return [];
  }

  const endDate = new Date(`${appliedRange.end}T12:00:00Z`);
  if (Number.isNaN(endDate.getTime())) {
    return [];
  }

  const points = [];
  const pointMap = new Map();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const pointDate = new Date(endDate.getTime() - offset * DAY_IN_MS);
    const date = formatDateYmd(pointDate);
    const point = {
      date,
      spend: 0,
      income: 0,
      net: 0
    };
    points.push(point);
    pointMap.set(date, point);
  }

  for (const transaction of transactions) {
    const point = pointMap.get(transaction.transaction_date);
    if (!point) {
      continue;
    }

    const amount = toAmount(transaction);
    if (transaction.direction === "inflow") {
      point.income = round2(point.income + amount);
      point.net = round2(point.net + amount);
      continue;
    }

    point.spend = round2(point.spend + amount);
    point.net = round2(point.net - amount);
  }

  return points;
}

function buildDeltaValue(currentValue, previousValue) {
  const delta = round2(currentValue - previousValue);
  const safePrevious = previousValue === 0 ? null : previousValue;
  return {
    delta,
    percent: safePrevious == null ? null : round2((delta / safePrevious) * 100)
  };
}

function formatDateYmd(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function round2(value) {
  return Math.round(value * 100) / 100;
}

function round4(value) {
  return Math.round(value * 10000) / 10000;
}
