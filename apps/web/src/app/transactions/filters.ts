import { RANGE_OPTIONS } from "@/lib/constants";

export type TransactionCategoryView = "granular" | "coarse";
export type TransactionTypeFilter = "expense" | "income" | "transfer";

export interface TransactionsFilterState {
  query: string;
  categories: string[];
  invertCategories: boolean;
  accounts: string[];
  minAmount: string;
  maxAmount: string;
  range: string;
  start: string;
  end: string;
  categoryView: TransactionCategoryView;
  transactionTypes: TransactionTypeFilter[];
  tag: string;
  page: number;
  recurringRuleId: string;
  recurring: boolean;
}

export interface TransactionsListApiParams {
  query?: string;
  category?: string[];
  account?: string[];
  min_amount?: number;
  max_amount?: number;
  range?: string;
  start?: string;
  end?: string;
  category_view: TransactionCategoryView;
  invert_categories?: boolean;
  transaction_type?: TransactionTypeFilter[];
  tag?: string;
  limit: number;
  offset: number;
  recurring_rule_id?: string;
}

export interface TransactionsOverviewApiParams {
  range?: string;
  start?: string;
  end?: string;
  category_view: TransactionCategoryView;
}

const RANGE_VALUES: Set<string> = new Set(RANGE_OPTIONS.map((option) => option.value));
const CATEGORY_VIEW_VALUES = new Set(["granular", "coarse"]);
const TRANSACTION_TYPE_VALUES = new Set<TransactionTypeFilter>(["expense", "income", "transfer"]);
export const TRANSACTIONS_PAGE_SIZE = 50;

interface SearchParamsLike {
  get(key: string): string | null;
  getAll(key: string): string[];
}

function cleanValue(value: string | null) {
  return String(value || "").trim();
}

function cleanStringList(values: string[]) {
  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = cleanValue(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    cleaned.push(normalized);
  }

  return cleaned;
}

function cleanTransactionTypes(values: string[]) {
  return cleanStringList(values).filter((value): value is TransactionTypeFilter =>
    TRANSACTION_TYPE_VALUES.has(value as TransactionTypeFilter)
  );
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
    categories: [],
    invertCategories: false,
    accounts: [],
    minAmount: "",
    maxAmount: "",
    range: "all",
    start: "",
    end: "",
    categoryView: "granular",
    transactionTypes: [],
    tag: "",
    page: 1,
    recurringRuleId: "",
    recurring: false
  };
}

export function parseTransactionsFilterState(searchParams: SearchParamsLike): TransactionsFilterState {
  const defaults = createDefaultTransactionsFilterState();

  const range = cleanValue(searchParams.get("range"));
  const categoryView = cleanValue(searchParams.get("category_view"));
  const recurringParam = searchParams.get("recurring");

  return {
    query: cleanValue(searchParams.get("query")),
    categories: cleanStringList(searchParams.getAll("category")),
    invertCategories: searchParams.get("invert_categories") === "true",
    accounts: cleanStringList(searchParams.getAll("account")),
    minAmount: cleanAmountValue(searchParams.get("min_amount")),
    maxAmount: cleanAmountValue(searchParams.get("max_amount")),
    range: RANGE_VALUES.has(range) ? range : defaults.range,
    start: cleanIsoDate(searchParams.get("start")),
    end: cleanIsoDate(searchParams.get("end")),
    categoryView: CATEGORY_VIEW_VALUES.has(categoryView)
      ? (categoryView as TransactionCategoryView)
      : defaults.categoryView,
    transactionTypes: cleanTransactionTypes(searchParams.getAll("type")),
    tag: cleanValue(searchParams.get("tag")),
    page: cleanPositiveInteger(searchParams.get("page"), defaults.page),
    recurringRuleId: cleanValue(searchParams.get("recurring_rule_id")),
    recurring: recurringParam === "true"
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
  if (filters.categories.length) {
    params.category = filters.categories;
  }
  if (filters.invertCategories) {
    params.invert_categories = true;
  }
  if (filters.accounts.length) {
    params.account = filters.accounts;
  }
  if (filters.minAmount) {
    params.min_amount = Number(filters.minAmount);
  }
  if (filters.maxAmount) {
    params.max_amount = Number(filters.maxAmount);
  }
  if (filters.transactionTypes.length) {
    params.transaction_type = filters.transactionTypes;
  }
  if (filters.tag) {
    params.tag = filters.tag;
  }
  if (filters.recurring) {
    params.recurring_rule_id = "true";
  } else if (filters.recurringRuleId) {
    params.recurring_rule_id = filters.recurringRuleId;
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
  for (const category of filters.categories) {
    searchParams.append("category", category);
  }
  if (filters.invertCategories) {
    searchParams.set("invert_categories", "true");
  }
  for (const account of filters.accounts) {
    searchParams.append("account", account);
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

  for (const transactionType of filters.transactionTypes) {
    searchParams.append("type", transactionType);
  }

  if (filters.page > defaults.page) {
    searchParams.set("page", String(filters.page));
  }

  if (filters.recurringRuleId) {
    searchParams.set("recurring_rule_id", filters.recurringRuleId);
  }

  if (filters.recurring) {
    searchParams.set("recurring", "true");
  }

  return searchParams;
}

export function toValidFilterState(filters: TransactionsFilterState): TransactionsFilterState {
  const next: TransactionsFilterState = {
    query: cleanValue(filters.query),
    categories: cleanStringList(filters.categories),
    invertCategories: Boolean(filters.invertCategories),
    accounts: cleanStringList(filters.accounts),
    minAmount: cleanAmountValue(filters.minAmount),
    maxAmount: cleanAmountValue(filters.maxAmount),
    range: filters.range,
    start: cleanIsoDate(filters.start),
    end: cleanIsoDate(filters.end),
    categoryView: filters.categoryView,
    transactionTypes: cleanTransactionTypes(filters.transactionTypes),
    tag: cleanValue(filters.tag),
    page: Math.max(1, Number.isFinite(filters.page) ? Math.trunc(filters.page) : 1),
    recurringRuleId: cleanValue(filters.recurringRuleId),
    recurring: Boolean(filters.recurring)
  };

  if (!RANGE_VALUES.has(next.range)) {
    next.range = "all";
  }
  if (!CATEGORY_VIEW_VALUES.has(next.categoryView)) {
    next.categoryView = "granular";
  }

  if (!next.categories.length) {
    next.invertCategories = false;
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
