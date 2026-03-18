import { RANGE_OPTIONS } from "@/lib/constants";

export type TransactionTypeFilter = "expense" | "income" | "transfer";

export interface SharedFilterState {
  range: string;
  start: string;
  end: string;
  categories: string[];
  accounts: string[];
  query: string;
  tag: string;
  transactionTypes: TransactionTypeFilter[];
  categoryView: "granular" | "coarse";
}

const SHARED_FILTERS_KEY = "minance:shared-filters";

const RANGE_VALUES = new Set([...RANGE_OPTIONS.map((option) => option.value), "custom"]);
const CATEGORY_VIEW_VALUES = new Set(["granular", "coarse"] as const);
const TRANSACTION_TYPE_VALUES = new Set<TransactionTypeFilter>(["expense", "income", "transfer"]);

export function createDefaultSharedFilterState(): SharedFilterState {
  return {
    range: "90d",
    start: "",
    end: "",
    categories: [],
    accounts: [],
    query: "",
    tag: "",
    transactionTypes: [],
    categoryView: "granular"
  };
}

export function getSharedFilters(): SharedFilterState {
  if (typeof window === "undefined") {
    return createDefaultSharedFilterState();
  }

  try {
    const raw = window.sessionStorage.getItem(SHARED_FILTERS_KEY);
    if (!raw) {
      return createDefaultSharedFilterState();
    }

    const parsed = JSON.parse(raw) as Partial<SharedFilterState>;
    const defaults = createDefaultSharedFilterState();

    return {
      range: RANGE_VALUES.has(parsed.range || "") ? parsed.range! : defaults.range,
      start: typeof parsed.start === "string" ? parsed.start : defaults.start,
      end: typeof parsed.end === "string" ? parsed.end : defaults.end,
      categories: Array.isArray(parsed.categories) ? parsed.categories.filter((c) => typeof c === "string") : [],
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts.filter((a) => typeof a === "string") : [],
      query: typeof parsed.query === "string" ? parsed.query : defaults.query,
      tag: typeof parsed.tag === "string" ? parsed.tag : defaults.tag,
      transactionTypes: Array.isArray(parsed.transactionTypes)
        ? parsed.transactionTypes.filter((t): t is TransactionTypeFilter => TRANSACTION_TYPE_VALUES.has(t))
        : [],
      categoryView: CATEGORY_VIEW_VALUES.has(parsed.categoryView as typeof CATEGORY_VIEW_VALUES extends Set<infer T> ? T : never) ? parsed.categoryView! : defaults.categoryView
    };
  } catch {
    return createDefaultSharedFilterState();
  }
}

export function setSharedFilters(filters: Partial<SharedFilterState>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const current = getSharedFilters();
    const updated: SharedFilterState = {
      ...current,
      ...filters
    };

    window.sessionStorage.setItem(SHARED_FILTERS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function clearSharedFilters(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(SHARED_FILTERS_KEY);
  } catch {
    // Ignore storage errors
  }
}