export const TOKEN_STORAGE_KEY = "minance_tokens";

export const RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "365d", label: "Last 12 months" },
  { value: "ytd", label: "Year to date" },
  { value: "this_month", label: "This Month" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom" }
] as const;
