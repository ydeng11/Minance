import { RANGE_OPTIONS } from "@/lib/constants";

export type ExplorerCategoryView = "granular" | "coarse";
export type ExplorerTransactionType = "expense" | "income" | "transfer";
export type ExplorerDirectionFilter = "all" | "outflow" | "inflow";
export type ExplorerPerspective = "overview" | "category";
export type ExplorerCompareMode = "none" | "previous";

export interface ExplorerFilterState {
  perspective: ExplorerPerspective;
  compare: ExplorerCompareMode;

  // Merchant
  merchant: string;

  // Category & Account
  categories: string[];
  invertCategories: boolean;
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
  recurring: boolean;

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
  invert_categories?: boolean;
  account?: string;
  transaction_type?: ExplorerTransactionType[];
  direction?: "outflow" | "inflow";
  tag?: string;
  merchant?: string;
  recurring_rule_id?: string;
}

const RANGE_VALUES: Set<string> = new Set([...RANGE_OPTIONS.map((option) => option.value), "custom"]);
const CATEGORY_VIEW_VALUES = new Set<ExplorerCategoryView>(["granular", "coarse"]);
const TRANSACTION_TYPE_VALUES = new Set<ExplorerTransactionType>(["expense", "income", "transfer"]);
const DIRECTION_VALUES = new Set<ExplorerDirectionFilter>(["all", "outflow", "inflow"]);
const PERSPECTIVE_VALUES = new Set<ExplorerPerspective>(["overview", "category"]);
const COMPARE_VALUES = new Set<ExplorerCompareMode>(["none", "previous"]);

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

function cleanUniqueList<T extends string>(values: string[], normalizeValue: (value: string) => T | "") {
  const seen = new Set<string>();
  const cleaned: T[] = [];

  for (const value of values) {
    const normalized = normalizeValue(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    cleaned.push(normalized);
  }

  return cleaned;
}

function cleanStringList(values: string[]) {
  return cleanUniqueList(values, cleanValue);
}

function cleanTransactionTypeList(values: string[]) {
  return cleanUniqueList(values, (value) => {
    const normalized = cleanValue(value).toLowerCase();
    return TRANSACTION_TYPE_VALUES.has(normalized as ExplorerTransactionType)
      ? (normalized as ExplorerTransactionType)
      : "";
  });
}

function readEnumValue<T extends string>(value: string, allowedValues: Set<T>, fallback: T) {
  return allowedValues.has(value as T) ? (value as T) : fallback;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function readSavedString<T extends string>(value: unknown, fallback: T) {
  return typeof value === "string" ? value as T : fallback;
}

export function createDefaultExplorerFilterState(): ExplorerFilterState {
  return {
    perspective: "overview",
    compare: "none",
    merchant: "",
    categories: [],
    invertCategories: false,
    account: "",
    range: "3m",
    start: "",
    end: "",
    categoryView: "granular",
    transactionTypes: [],
    direction: "all",
    tag: "",
    recurring: false,
    minAmount: "",
    maxAmount: ""
  };
}

export function buildExplorerCategoryFilterLabel(categories: string[], invertCategories: boolean) {
  const mode = invertCategories ? "Excluded" : "Included";
  return `${mode} categories: ${categories.join(", ")}`;
}

export function parseExplorerFilterState(searchParams: SearchParamsLike): ExplorerFilterState {
  const defaults = createDefaultExplorerFilterState();

  const range = cleanValue(searchParams.get("range"));
  const categoryView = cleanValue(searchParams.get("category_view"));
  const direction = cleanValue(searchParams.get("direction"));
  const perspective = cleanValue(searchParams.get("perspective"));
  const compare = cleanValue(searchParams.get("compare"));
  const recurring = searchParams.get("recurring");

  return {
    perspective: readEnumValue(perspective, PERSPECTIVE_VALUES, defaults.perspective),
    compare: readEnumValue(compare, COMPARE_VALUES, defaults.compare),
    merchant: cleanValue(searchParams.get("merchant")),
    categories: cleanStringList(searchParams.getAll("category")),
    invertCategories: searchParams.get("invert_categories") === "true",
    account: cleanValue(searchParams.get("account")),
    range: RANGE_VALUES.has(range) ? range : defaults.range,
    start: cleanIsoDate(searchParams.get("start")),
    end: cleanIsoDate(searchParams.get("end")),
    categoryView: readEnumValue(categoryView, CATEGORY_VIEW_VALUES, defaults.categoryView),
    transactionTypes: cleanTransactionTypeList(searchParams.getAll("type")),
    direction: readEnumValue(direction, DIRECTION_VALUES, defaults.direction),
    tag: cleanValue(searchParams.get("tag")),
    recurring: recurring === "true",
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
  if (filters.invertCategories) {
    params.invert_categories = true;
  }
  if (filters.account) {
    params.account = filters.account;
  }
  if (filters.merchant) {
    params.merchant = filters.merchant;
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
  if (filters.recurring) {
    params.recurring_rule_id = "true";
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

  for (const category of filters.categories) {
    searchParams.append("category", category);
  }
  if (filters.invertCategories) {
    searchParams.set("invert_categories", "true");
  }
  if (filters.account) {
    searchParams.set("account", filters.account);
  }
  if (filters.merchant) {
    searchParams.set("merchant", filters.merchant);
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
  if (filters.recurring) {
    searchParams.set("recurring", "true");
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
    merchant: cleanValue(filters.merchant),
    categories: cleanStringList(filters.categories),
    invertCategories: Boolean(filters.invertCategories),
    account: cleanValue(filters.account),
    start: cleanIsoDate(filters.start),
    end: cleanIsoDate(filters.end),
    transactionTypes: cleanTransactionTypeList(filters.transactionTypes),
    tag: cleanValue(filters.tag),
    recurring: Boolean(filters.recurring),
    minAmount: cleanValue(filters.minAmount),
    maxAmount: cleanValue(filters.maxAmount)
  };

  next.perspective = readEnumValue(next.perspective, PERSPECTIVE_VALUES, "overview");
  next.compare = readEnumValue(next.compare, COMPARE_VALUES, "none");
  if (!RANGE_VALUES.has(next.range)) {
    next.range = "3m";
  }
  next.categoryView = readEnumValue(next.categoryView, CATEGORY_VIEW_VALUES, "granular");
  next.direction = readEnumValue(next.direction, DIRECTION_VALUES, "all");

  if (!next.categories.length) {
    next.invertCategories = false;
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
    perspective: readSavedString(source.perspective, defaults.perspective),
    compare: readSavedString(source.compare, defaults.compare),
    merchant: readSavedString(source.merchant, defaults.merchant),
    categories: readStringArray(source.categories),
    invertCategories: source.invertCategories === true,
    account: readSavedString(source.account, defaults.account),
    categoryView: readSavedString(source.categoryView, defaults.categoryView),
    range: readSavedString(source.range, defaults.range),
    start: readSavedString(source.start, defaults.start),
    end: readSavedString(source.end, defaults.end),
    transactionTypes: readStringArray(source.transactionTypes) as ExplorerTransactionType[],
    direction: readSavedString(source.direction, defaults.direction),
    tag: readSavedString(source.tag, defaults.tag),
    recurring: source.recurring === true,
    minAmount: readSavedString(source.minAmount, defaults.minAmount),
    maxAmount: readSavedString(source.maxAmount, defaults.maxAmount)
  });
}
