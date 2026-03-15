import { RANGE_OPTIONS } from "@/lib/constants";

export type ExplorerCategoryView = "granular" | "coarse";
export type ExplorerTransactionType = "expense" | "income" | "transfer";
export type ExplorerDirectionFilter = "all" | "outflow" | "inflow";
export type ExplorerPerspective = "overview" | "category" | "account";
export type ExplorerCompareMode = "none" | "previous";

export interface ExplorerFilterState {
  perspective: ExplorerPerspective;
  compare: ExplorerCompareMode;

  // Search & Text
  query: string;
  merchant: string;

  // Category & Account
  categories: string[];
  account: string;
  categoryView: ExplorerCategoryView;

  // Date Range
  range: string;
  start: string;
  end: string;

  // Transaction Properties
  transactionTypes: ExplorerTransactionType[];
  direction: ExplorerDirectionFilter;
  tag: string;

  // Amount Range
  minAmount: string;
  maxAmount: string;
}

export interface ExplorerAnalyticsApiParams {
  range?: string;
  start?: string;
  end?: string;
  category_view: ExplorerCategoryView;
  perspective?: ExplorerPerspective;
  compare?: "previous";
  category?: string[];
  account?: string;
  transaction_type?: ExplorerTransactionType[];
  direction?: "outflow" | "inflow";
  tag?: string;
}

const RANGE_VALUES = new Set([...RANGE_OPTIONS.map((option) => option.value), "custom"]);
const CATEGORY_VIEW_VALUES = new Set(["granular", "coarse"]);
const TRANSACTION_TYPE_VALUES = new Set<ExplorerTransactionType>(["expense", "income", "transfer"]);
const DIRECTION_VALUES = new Set(["all", "outflow", "inflow"]);
const PERSPECTIVE_VALUES = new Set(["overview", "category", "account"]);
const COMPARE_VALUES = new Set(["none", "previous"]);

interface SearchParamsLike {
  get(key: string): string | null;
  getAll(key: string): string[];
}

function cleanValue(value: string | null) {
  return String(value || "").trim();
}

function cleanIsoDate(value: string | null) {
  const normalized = cleanValue(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function cleanStringList(values: string[]) {
  const seen = new Set<string>();
  const cleaned: string[] = [];

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

function cleanTransactionTypeList(values: string[]) {
  const seen = new Set<ExplorerTransactionType>();
  const cleaned: ExplorerTransactionType[] = [];

  for (const value of values) {
    const normalized = cleanValue(value).toLowerCase();
    if (!TRANSACTION_TYPE_VALUES.has(normalized as ExplorerTransactionType)) {
      continue;
    }

    const transactionType = normalized as ExplorerTransactionType;
    if (seen.has(transactionType)) {
      continue;
    }

    seen.add(transactionType);
    cleaned.push(transactionType);
  }

  return cleaned;
}

export function createDefaultExplorerFilterState(): ExplorerFilterState {
  return {
    perspective: "overview",
    compare: "none",
    query: "",
    merchant: "",
    categories: [],
    account: "",
    range: "90d",
    start: "",
    end: "",
    categoryView: "granular",
    transactionTypes: [],
    direction: "all",
    tag: "",
    minAmount: "",
    maxAmount: ""
  };
}

export function parseExplorerFilterState(searchParams: SearchParamsLike): ExplorerFilterState {
  const defaults = createDefaultExplorerFilterState();

  const range = cleanValue(searchParams.get("range"));
  const categoryView = cleanValue(searchParams.get("category_view"));
  const direction = cleanValue(searchParams.get("direction"));
  const perspective = cleanValue(searchParams.get("perspective"));
  const compare = cleanValue(searchParams.get("compare"));

  return {
    perspective: PERSPECTIVE_VALUES.has(perspective)
      ? (perspective as ExplorerPerspective)
      : defaults.perspective,
    compare: COMPARE_VALUES.has(compare)
      ? (compare as ExplorerCompareMode)
      : defaults.compare,
    query: cleanValue(searchParams.get("query")),
    merchant: cleanValue(searchParams.get("merchant")),
    categories: cleanStringList(searchParams.getAll("category")),
    account: cleanValue(searchParams.get("account")),
    range: RANGE_VALUES.has(range) ? range : defaults.range,
    start: cleanIsoDate(searchParams.get("start")),
    end: cleanIsoDate(searchParams.get("end")),
    categoryView: CATEGORY_VIEW_VALUES.has(categoryView)
      ? (categoryView as ExplorerCategoryView)
      : defaults.categoryView,
    transactionTypes: cleanTransactionTypeList(searchParams.getAll("type")),
    direction: DIRECTION_VALUES.has(direction)
      ? (direction as ExplorerDirectionFilter)
      : defaults.direction,
    tag: cleanValue(searchParams.get("tag")),
    minAmount: cleanValue(searchParams.get("min_amount")),
    maxAmount: cleanValue(searchParams.get("max_amount"))
  };
}

export function toExplorerAnalyticsApiParams(
  filters: ExplorerFilterState
): ExplorerAnalyticsApiParams {
  const params: ExplorerAnalyticsApiParams = {
    category_view: filters.categoryView,
    perspective: filters.perspective
  };

  if (filters.compare === "previous") {
    params.compare = "previous";
  }

  if (filters.categories.length) {
    params.category = filters.categories;
  }
  if (filters.account) {
    params.account = filters.account;
  }
  if (filters.transactionTypes.length) {
    params.transaction_type = filters.transactionTypes;
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
  for (const category of filters.categories) {
    searchParams.append("category", category);
  }
  if (filters.account) {
    searchParams.set("account", filters.account);
  }
  if (filters.perspective !== defaults.perspective) {
    searchParams.set("perspective", filters.perspective);
  }
  if (filters.compare !== defaults.compare) {
    searchParams.set("compare", filters.compare);
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
    categories: cleanStringList(filters.categories),
    account: cleanValue(filters.account),
    start: cleanIsoDate(filters.start),
    end: cleanIsoDate(filters.end),
    transactionTypes: cleanTransactionTypeList(filters.transactionTypes),
    tag: cleanValue(filters.tag),
    minAmount: cleanValue(filters.minAmount),
    maxAmount: cleanValue(filters.maxAmount)
  };

  if (!PERSPECTIVE_VALUES.has(next.perspective)) {
    next.perspective = "overview";
  }
  if (!COMPARE_VALUES.has(next.compare)) {
    next.compare = "none";
  }
  if (!RANGE_VALUES.has(next.range)) {
    next.range = "90d";
  }
  if (!CATEGORY_VIEW_VALUES.has(next.categoryView)) {
    next.categoryView = "granular";
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

export function savedExplorerFiltersToState(
  rawFilters: Record<string, unknown> | null | undefined
): ExplorerFilterState {
  const defaults = createDefaultExplorerFilterState();
  if (!rawFilters || typeof rawFilters !== "object") {
    return defaults;
  }

  const source = rawFilters as Record<string, unknown>;
  return toValidExplorerFilterState({
    perspective: typeof source.perspective === "string" ? (source.perspective as ExplorerPerspective) : defaults.perspective,
    compare: typeof source.compare === "string" ? (source.compare as ExplorerCompareMode) : defaults.compare,
    query: typeof source.query === "string" ? source.query : defaults.query,
    merchant: typeof source.merchant === "string" ? source.merchant : defaults.merchant,
    categories: Array.isArray(source.categories)
      ? source.categories.filter((entry): entry is string => typeof entry === "string")
      : defaults.categories,
    account: typeof source.account === "string" ? source.account : defaults.account,
    categoryView: typeof source.categoryView === "string"
      ? (source.categoryView as ExplorerCategoryView)
      : defaults.categoryView,
    range: typeof source.range === "string" ? source.range : defaults.range,
    start: typeof source.start === "string" ? source.start : defaults.start,
    end: typeof source.end === "string" ? source.end : defaults.end,
    transactionTypes: Array.isArray(source.transactionTypes)
      ? source.transactionTypes.filter((entry): entry is ExplorerTransactionType => typeof entry === "string")
      : defaults.transactionTypes,
    direction: typeof source.direction === "string"
      ? (source.direction as ExplorerDirectionFilter)
      : defaults.direction,
    tag: typeof source.tag === "string" ? source.tag : defaults.tag,
    minAmount: typeof source.minAmount === "string" ? source.minAmount : defaults.minAmount,
    maxAmount: typeof source.maxAmount === "string" ? source.maxAmount : defaults.maxAmount
  });
}
