export const TOKEN_STORAGE_KEY = "minance_tokens";

export const RANGE_OPTIONS = [
  { value: "3m", label: "Last 3 Months" },
  { value: "6m", label: "Last 6 Months" },
  { value: "12m", label: "Last 12 Months" },
  { value: "last_year", label: "Last Year" },
  { value: "this_year", label: "This Year" },
  { value: "all", label: "All time" }
] as const;
