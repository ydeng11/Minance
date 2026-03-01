export const APP_NAME = "Minance Next";

export const IMPORT_STATUSES = [
  "received",
  "processing",
  "needs_review",
  "completed",
  "failed"
];

export const SOURCE_TYPES = ["imported", "manual", "migrated"];

export const DIRECTIONS = ["debit", "credit"];

export const AI_PROVIDERS = {
  openai: {
    id: "openai",
    name: "OpenAI",
    models: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"]
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    models: ["chatgpt-4.1-mini", "gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"]
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    models: ["claude-3-5-haiku-latest", "claude-3-7-sonnet-latest"]
  },
  google: {
    id: "google",
    name: "Google",
    models: ["gemini-2.0-flash", "gemini-2.5-pro"]
  }
};

export const CANONICAL_IMPORT_FIELDS = [
  "date",
  "merchant",
  "description",
  "amount",
  "currency",
  "account",
  "category_raw",
  "memo"
];

export const DEFAULT_CATEGORIES = [
  "Groceries",
  "Dining",
  "Transport",
  "Utilities",
  "Housing",
  "Healthcare",
  "Entertainment",
  "Shopping",
  "Income",
  "Transfer",
  "Uncategorized"
];

export const CATEGORY_KEYWORDS = {
  Groceries: ["grocery", "whole foods", "trader joe", "supermarket", "market"],
  Dining: ["restaurant", "cafe", "coffee", "doordash", "ubereats", "bar"],
  Transport: ["uber", "lyft", "gas", "shell", "chevron", "transit"],
  Utilities: ["electric", "water", "internet", "comcast", "verizon", "at&t"],
  Housing: ["rent", "mortgage", "hoa", "landlord"],
  Healthcare: ["pharmacy", "clinic", "hospital", "dentist"],
  Entertainment: ["netflix", "spotify", "hulu", "cinema", "theater"],
  Shopping: ["amazon", "target", "walmart", "costco", "store"],
  Income: ["payroll", "salary", "deposit", "refund", "reimbursement"],
  Transfer: ["transfer", "payment", "venmo", "zelle"]
};
