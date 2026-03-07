import { RANGE_OPTIONS } from "@/lib/constants";

export type ExplorerCategoryView = "granular" | "coarse";
export type ExplorerReviewFilter = "all" | "reviewed" | "needs_review";
export type ExplorerTypeFilter = "all" | "expense" | "income" | "transfer";
export type ExplorerDirectionFilter = "all" | "outflow" | "inflow";

export interface ExplorerFilterState {
  // Search & Text
  query: string;
  merchant: string;

  // Category & Account
  category: string;
  account: string;
  categoryView: ExplorerCategoryView;

  // Date Range
  range: string;
  start: string;
  end: string;

  // Transaction Properties
  transactionType: ExplorerTypeFilter;
  direction: ExplorerDirectionFilter;
  tag: string;

  // Amount Range
  minAmount: string;
  maxAmount: string;

  // Review Status
  review: ExplorerReviewFilter;
}

export interface ExplorerAnalyticsApiParams {
  range?: string;
  start?: string;
  end?: string;
  category_view: ExplorerCategoryView;
  category?: string;
  account?: string;
  transaction_type?: "expense" | "income" | "transfer";
  direction?: "outflow" | "inflow";
  tag?: string;
}

const RANGE_VALUES = new Set([...RANGE_OPTIONS.map((option) => option.value), "custom"]);
const CATEGORY_VIEW_VALUES = new Set(["granular", "coarse"]);
const REVIEW_VALUES = new Set(["all", "reviewed", "needs_review"]);
const TRANSACTION_TYPE_VALUES = new Set(["all", "expense", "income", "transfer"]);
const DIRECTION_VALUES = new Set(["all", "outflow", "inflow"]);

interface SearchParamsLike {
  get(key: string): string | null;
}

function cleanValue(value: string | null) {
  return String(value || "").trim();
}

function cleanIsoDate(value: string | null) {
  const normalized = cleanValue(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

export function createDefaultExplorerFilterState(): ExplorerFilterState {
  return {
    query: "",
    merchant: "",
    category: "",
    account: "",
    range: "90d",
    start: "",
    end: "",
    categoryView: "granular",
    transactionType: "all",
    direction: "all",
    tag: "",
    minAmount: "",
    maxAmount: "",
    review: "all"
  };
}

export function parseExplorerFilterState(searchParams: SearchParamsLike): ExplorerFilterState {
  const defaults = createDefaultExplorerFilterState();

  const range = cleanValue(searchParams.get("range"));
  const categoryView = cleanValue(searchParams.get("category_view"));
  const review = cleanValue(searchParams.get("review"));
  const transactionType = cleanValue(searchParams.get("type"));
  const direction = cleanValue(searchParams.get("direction"));

  return {
    query: cleanValue(searchParams.get("query")),
    merchant: cleanValue(searchParams.get("merchant")),
    category: cleanValue(searchParams.get("category")),
    account: cleanValue(searchParams.get("account")),
    range: RANGE_VALUES.has(range) ? range : defaults.range,
    start: cleanIsoDate(searchParams.get("start")),
    end: cleanIsoDate(searchParams.get("end")),
    categoryView: CATEGORY_VIEW_VALUES.has(categoryView)
      ? (categoryView as ExplorerCategoryView)
      : defaults.categoryView,
    transactionType: TRANSACTION_TYPE_VALUES.has(transactionType)
      ? (transactionType as ExplorerTypeFilter)
      : defaults.transactionType,
    direction: DIRECTION_VALUES.has(direction)
      ? (direction as ExplorerDirectionFilter)
      : defaults.direction,
    tag: cleanValue(searchParams.get("tag")),
    minAmount: cleanValue(searchParams.get("min_amount")),
    maxAmount: cleanValue(searchParams.get("max_amount")),
    review: REVIEW_VALUES.has(review) ? (review as ExplorerReviewFilter) : defaults.review
  };
}

export function toExplorerAnalyticsApiParams(
  filters: ExplorerFilterState
): ExplorerAnalyticsApiParams {
  const params: ExplorerAnalyticsApiParams = {
    category_view: filters.categoryView
  };

  if (filters.category) {
    params.category = filters.category;
  }
  if (filters.account) {
    params.account = filters.account;
  }
  if (filters.transactionType !== "all") {
    params.transaction_type = filters.transactionType;
  }
  if (filters.direction !== "all") {
    params.direction = filters.direction;
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
    return params;
  }

  params.range = filters.range;
  return params;
}

export function buildExplorerFilterSearchParams(filters: ExplorerFilterState): URLSearchParams {
  const defaults = createDefaultExplorerFilterState();
  const searchParams = new URLSearchParams();

  if (filters.query) {
    searchParams.set("query", filters.query);
  }
  if (filters.merchant) {
    searchParams.set("merchant", filters.merchant);
  }
  if (filters.category) {
    searchParams.set("category", filters.category);
  }
  if (filters.account) {
    searchParams.set("account", filters.account);
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

  if (filters.review !== defaults.review) {
    searchParams.set("review", filters.review);
  }

  if (filters.transactionType !== defaults.transactionType) {
    searchParams.set("type", filters.transactionType);
  }

  if (filters.direction !== defaults.direction) {
    searchParams.set("direction", filters.direction);
  }

  if (filters.minAmount) {
    searchParams.set("min_amount", filters.minAmount);
  }

  if (filters.maxAmount) {
    searchParams.set("max_amount", filters.maxAmount);
  }

  return searchParams;
}

export function toValidExplorerFilterState(filters: ExplorerFilterState): ExplorerFilterState {
  const next = {
    ...filters,
    query: cleanValue(filters.query),
    merchant: cleanValue(filters.merchant),
    category: cleanValue(filters.category),
    account: cleanValue(filters.account),
    start: cleanIsoDate(filters.start),
    end: cleanIsoDate(filters.end),
    tag: cleanValue(filters.tag),
    minAmount: cleanValue(filters.minAmount),
    maxAmount: cleanValue(filters.maxAmount)
  };

  if (!RANGE_VALUES.has(next.range)) {
    next.range = "90d";
  }
  if (!CATEGORY_VIEW_VALUES.has(next.categoryView)) {
    next.categoryView = "granular";
  }
  if (!REVIEW_VALUES.has(next.review)) {
    next.review = "all";
  }
  if (!TRANSACTION_TYPE_VALUES.has(next.transactionType)) {
    next.transactionType = "all";
  }
  if (!DIRECTION_VALUES.has(next.direction)) {
    next.direction = "all";
  }

  if (next.range !== "custom") {
    next.start = "";
    next.end = "";
  }

  return next;
}
