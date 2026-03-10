import { RANGE_OPTIONS } from "@/lib/constants";

export type TransactionCategoryView = "granular" | "coarse";
export type TransactionTypeFilter = "all" | "expense" | "income" | "transfer";

export interface TransactionsFilterState {
  query: string;
  category: string;
  account: string;
  minAmount: string;
  maxAmount: string;
  range: string;
  start: string;
  end: string;
  categoryView: TransactionCategoryView;
  transactionType: TransactionTypeFilter;
  tag: string;
  page: number;
}

export interface TransactionsListApiParams {
  query?: string;
  category?: string;
  account?: string;
  min_amount?: number;
  max_amount?: number;
  range?: string;
  start?: string;
  end?: string;
  category_view: TransactionCategoryView;
  transaction_type?: "expense" | "income" | "transfer";
  tag?: string;
  limit: number;
  offset: number;
}

export interface TransactionsOverviewApiParams {
  range?: string;
  start?: string;
  end?: string;
  category_view: TransactionCategoryView;
}

const RANGE_VALUES = new Set([...RANGE_OPTIONS.map((option) => option.value), "custom"]);
const CATEGORY_VIEW_VALUES = new Set(["granular", "coarse"]);
const TRANSACTION_TYPE_VALUES = new Set(["all", "expense", "income", "transfer"]);
export const TRANSACTIONS_PAGE_SIZE = 50;

interface SearchParamsLike {
  get(key: string): string | null;
}

function cleanValue(value: string | null) {
  return String(value || "").trim();
}

function cleanAmountValue(value: string | null) {
  const normalized = cleanValue(value);
  if (!normalized) {
    return "";
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return "";
  }

  return normalized;
}

function cleanIsoDate(value: string | null) {
  const normalized = cleanValue(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function cleanPositiveInteger(value: string | null, fallback = 1) {
  const normalized = cleanValue(value);
  if (!normalized) {
    return fallback;
  }
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function createDefaultTransactionsFilterState(): TransactionsFilterState {
  return {
    query: "",
    category: "",
    account: "",
    minAmount: "",
    maxAmount: "",
    range: "all",
    start: "",
    end: "",
    categoryView: "granular",
    transactionType: "all",
    tag: "",
    page: 1
  };
}

export function parseTransactionsFilterState(searchParams: SearchParamsLike): TransactionsFilterState {
  const defaults = createDefaultTransactionsFilterState();

  const range = cleanValue(searchParams.get("range"));
  const categoryView = cleanValue(searchParams.get("category_view"));
  const transactionType = cleanValue(searchParams.get("type"));

  return {
    query: cleanValue(searchParams.get("query")),
    category: cleanValue(searchParams.get("category")),
    account: cleanValue(searchParams.get("account")),
    minAmount: cleanAmountValue(searchParams.get("min_amount")),
    maxAmount: cleanAmountValue(searchParams.get("max_amount")),
    range: RANGE_VALUES.has(range) ? range : defaults.range,
    start: cleanIsoDate(searchParams.get("start")),
    end: cleanIsoDate(searchParams.get("end")),
    categoryView: CATEGORY_VIEW_VALUES.has(categoryView)
      ? (categoryView as TransactionCategoryView)
      : defaults.categoryView,
    transactionType: TRANSACTION_TYPE_VALUES.has(transactionType)
      ? (transactionType as TransactionTypeFilter)
      : defaults.transactionType,
    tag: cleanValue(searchParams.get("tag")),
    page: cleanPositiveInteger(searchParams.get("page"), defaults.page)
  };
}

export function toTransactionsListApiParams(filters: TransactionsFilterState): TransactionsListApiParams {
  const safePage = Math.max(1, Number.isFinite(filters.page) ? Math.trunc(filters.page) : 1);
  const params: TransactionsListApiParams = {
    category_view: filters.categoryView,
    limit: TRANSACTIONS_PAGE_SIZE,
    offset: (safePage - 1) * TRANSACTIONS_PAGE_SIZE
  };

  if (filters.query) {
    params.query = filters.query;
  }
  if (filters.category) {
    params.category = filters.category;
  }
  if (filters.account) {
    params.account = filters.account;
  }
  if (filters.minAmount) {
    params.min_amount = Number(filters.minAmount);
  }
  if (filters.maxAmount) {
    params.max_amount = Number(filters.maxAmount);
  }
  if (filters.transactionType !== "all") {
    params.transaction_type = filters.transactionType;
  }
  if (filters.tag) {
    params.tag = filters.tag;
  }

  if (filters.range === "custom") {
    if (filters.start) {
      params.start = filters.start;
    }
    if (filters.end) {
      params.end = filters.end;
    }
  } else {
    params.range = filters.range;
  }

  return params;
}

export function toTransactionsOverviewApiParams(filters: TransactionsFilterState): TransactionsOverviewApiParams {
  const params: TransactionsOverviewApiParams = {
    category_view: filters.categoryView
  };

  if (filters.range === "custom") {
    if (filters.start) {
      params.start = filters.start;
    }
    if (filters.end) {
      params.end = filters.end;
    }
    return params;
  }

  params.range = filters.range;
  return params;
}

export function buildTransactionsFilterSearchParams(filters: TransactionsFilterState): URLSearchParams {
  const defaults = createDefaultTransactionsFilterState();
  const searchParams = new URLSearchParams();

  if (filters.query) {
    searchParams.set("query", filters.query);
  }
  if (filters.category) {
    searchParams.set("category", filters.category);
  }
  if (filters.account) {
    searchParams.set("account", filters.account);
  }
  if (filters.minAmount) {
    searchParams.set("min_amount", filters.minAmount);
  }
  if (filters.maxAmount) {
    searchParams.set("max_amount", filters.maxAmount);
  }
  if (filters.tag) {
    searchParams.set("tag", filters.tag);
  }

  if (filters.range !== defaults.range) {
    searchParams.set("range", filters.range);
  }

  if (filters.range === "custom") {
    if (filters.start) {
      searchParams.set("start", filters.start);
    }
    if (filters.end) {
      searchParams.set("end", filters.end);
    }
  }

  if (filters.categoryView !== defaults.categoryView) {
    searchParams.set("category_view", filters.categoryView);
  }

  if (filters.transactionType !== defaults.transactionType) {
    searchParams.set("type", filters.transactionType);
  }

  if (filters.page > defaults.page) {
    searchParams.set("page", String(filters.page));
  }

  return searchParams;
}

export function toValidFilterState(filters: TransactionsFilterState): TransactionsFilterState {
  const next = {
    ...filters,
    query: cleanValue(filters.query),
    category: cleanValue(filters.category),
    account: cleanValue(filters.account),
    minAmount: cleanAmountValue(filters.minAmount),
    maxAmount: cleanAmountValue(filters.maxAmount),
    start: cleanIsoDate(filters.start),
    end: cleanIsoDate(filters.end),
    tag: cleanValue(filters.tag),
    page: Math.max(1, Number.isFinite(filters.page) ? Math.trunc(filters.page) : 1)
  };

  if (!RANGE_VALUES.has(next.range)) {
    next.range = "all";
  }
  if (!CATEGORY_VIEW_VALUES.has(next.categoryView)) {
    next.categoryView = "granular";
  }
  if (!TRANSACTION_TYPE_VALUES.has(next.transactionType)) {
    next.transactionType = "all";
  }

  if (next.range !== "custom") {
    next.start = "";
    next.end = "";
  }

  if (next.minAmount && next.maxAmount && Number(next.minAmount) > Number(next.maxAmount)) {
    next.maxAmount = next.minAmount;
  }

  return next;
}
