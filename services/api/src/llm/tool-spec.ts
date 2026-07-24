/**
 * Single source of truth for all tools available to the AI assistant.
 * Each tool is defined once with schema, execute handler, access level,
 * and confirmation policy. The LLM-facing schema is derived from ToolSpec.
 */

import type { ToolDefinition } from "./client.ts";
import { DEFAULT_CATEGORIES } from "../../../../packages/domain/src/constants.ts";

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export interface ToolExecutionContext {
  userId: string;
  conversationId?: string;
  resultCache?: Map<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  meta?: {
    toolName: string;
    executionTimeMs: number;
  };
}

export type ToolAccess = "read" | "write";
export type ToolCategory = "analytics" | "subscriptions" | "benefits" | "budgeting" | "system";

export interface ToolSpec {
  name: string;
  description: string;
  /** OpenAPI-like schema for LLM function calling */
  schema: ToolDefinition;
  /** Whether this tool reads or mutates user data */
  access: ToolAccess;
  /** Whether this tool requires explicit user confirmation before executing */
  requiresConfirmation?: boolean;
  /** Category for grouping in system prompt */
  category: ToolCategory;
  /** The execute function */
  execute(ctx: ToolExecutionContext, args: Record<string, unknown>): Promise<ToolResult>;
}

// ---------------------------------------------------------------------------
// Import existing tool schemas (temporarily re-exported for backward compat)
// ---------------------------------------------------------------------------

/** Re-export types for tests */
export type { ToolDefinition } from "./client.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const ALLOWED_CATEGORIES = DEFAULT_CATEGORIES;
export const VALID_CADENCES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"] as const;
export const VALID_SOURCES = ["history", "inferred"] as const;
export const VALID_DIRECTIONS = ["inflow", "outflow"] as const;
export const VALID_RANGES = ["30d", "90d", "365d", "ytd", "all"] as const;

function filterOptionalKeys(keys: string[]) {
  return keys.map((k) => ({ key: k, required: false }));
}

/**
 * Normalizes an args record so date/range fields are consistently typed.
 */
export function normalizeDateArgs(args: Record<string, unknown>): Record<string, unknown> {
  const n = { ...args };
  if (n.start && typeof n.start !== "string") n.start = String(n.start);
  if (n.end && typeof n.end !== "string") n.end = String(n.end);
  return n;
}

// ---------------------------------------------------------------------------
// Tool registrations
// ---------------------------------------------------------------------------

/**
 * All registered tools. This is the single source of truth.
 * Tools from all capability areas are registered here.
 */
export const ALL_TOOLS: ToolSpec[] = [];

function register(spec: ToolSpec): ToolSpec {
  ALL_TOOLS.push(spec);
  return spec;
}

// ----- Analytics tools (QA) -----

export const T_GET_DATA_BOUNDS = register({
  name: "get_data_bounds",
  description: "Get the date range and count of user's transaction data. Use this to understand what data is available before querying.",
  access: "read",
  category: "analytics",
  schema: {
    type: "function",
    function: {
      name: "get_data_bounds",
      description: "Get the date range and count of user's transaction data. Use this to understand what data is available before querying.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  execute: async (ctx) => {
    const { getUserDataBounds } = await import("../analytics.ts");
    return { success: true, data: getUserDataBounds(ctx.userId) };
  }
});

export const T_GET_OVERVIEW = register({
  name: "get_overview",
  description: "Get a summary overview of spending, income, and trends. Use for general queries about spending totals, net flow, or high-level analytics.",
  access: "read",
  category: "analytics",
  schema: {
    type: "function",
    function: {
      name: "get_overview",
      description: "Get a summary overview of spending, income, and trends. Use for general queries about spending totals, net flow, or high-level analytics.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", format: "date", description: "Start date (YYYY-MM-DD)" },
          end: { type: "string", format: "date", description: "End date (YYYY-MM-DD)" },
          range: { type: "string", enum: [...VALID_RANGES], description: "Preset date range" },
          category: { type: "string", description: "Filter by category name" },
          merchant: { type: "string", description: "Filter by merchant name" },
          account: { type: "string", description: "Filter by account name, normalized account key, or account ID" },
          direction: { type: "string", enum: [...VALID_DIRECTIONS], description: "Filter by direction" }
        },
        required: []
      }
    }
  },
  execute: async (ctx, args) => {
    const { getOverview } = await import("../analytics.ts");
    const filters = buildFiltersFromArgs(args);
    return { success: true, data: getOverview(ctx.userId, filters) };
  }
});

export const T_GET_CATEGORY_BREAKDOWN = register({
  name: "get_category_breakdown",
  description: "Get spending breakdown by category. Use when user asks about spending by category or which categories they spend most on.",
  access: "read",
  category: "analytics",
  schema: {
    type: "function",
    function: {
      name: "get_category_breakdown",
      description: "Get spending breakdown by category. Use when user asks about spending by category or which categories they spend most on.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", format: "date" },
          end: { type: "string", format: "date" },
          range: { type: "string", enum: [...VALID_RANGES] },
          account: { type: "string", description: "Filter by account name, normalized account key, or account ID" },
          direction: { type: "string", enum: [...VALID_DIRECTIONS] }
        },
        required: []
      }
    }
  },
  execute: async (ctx, args) => {
    const { getCategoryRollup } = await import("../analytics.ts");
    const filters = buildFiltersFromArgs(args);
    return { success: true, data: getCategoryRollup(ctx.userId, filters) };
  }
});

export const T_GET_MERCHANT_BREAKDOWN = register({
  name: "get_merchant_breakdown",
  description: "Get spending breakdown by merchant. Use when user asks about top merchants or spending at specific merchants.",
  access: "read",
  category: "analytics",
  schema: {
    type: "function",
    function: {
      name: "get_merchant_breakdown",
      description: "Get spending breakdown by merchant. Use when user asks about top merchants or spending at specific merchants.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", format: "date" },
          end: { type: "string", format: "date" },
          range: { type: "string", enum: [...VALID_RANGES] },
          account: { type: "string", description: "Filter by account name, normalized account key, or account ID" },
          category: { type: "string" }
        },
        required: []
      }
    }
  },
  execute: async (ctx, args) => {
    const { getMerchantRollup } = await import("../analytics.ts");
    const filters = buildFiltersFromArgs(args);
    return { success: true, data: getMerchantRollup(ctx.userId, filters) };
  }
});

export const T_GET_ANOMALIES = register({
  name: "get_anomalies",
  description: "Detect unusual or anomalous transactions. Use when user asks about unusual spending, outliers, or transactions that stand out.",
  access: "read",
  category: "analytics",
  schema: {
    type: "function",
    function: {
      name: "get_anomalies",
      description: "Detect unusual or anomalous transactions. Use when user asks about unusual spending, outliers, or transactions that stand out.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", format: "date" },
          end: { type: "string", format: "date" },
          range: { type: "string", enum: [...VALID_RANGES] },
          account: { type: "string", description: "Filter by account name, normalized account key, or account ID" }
        },
        required: []
      }
    }
  },
  execute: async (ctx, args) => {
    const { getAnomalies } = await import("../analytics.ts");
    const filters = buildFiltersFromArgs(args);
    return { success: true, data: getAnomalies(ctx.userId, filters) };
  }
});

export const T_LIST_TRANSACTIONS = register({
  name: "list_transactions",
  description: "List individual transactions with filters. Use when user wants to see specific transactions or search for particular items.",
  access: "read",
  category: "analytics",
  schema: {
    type: "function",
    function: {
      name: "list_transactions",
      description: "List individual transactions with filters.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", format: "date" },
          end: { type: "string", format: "date" },
          range: { type: "string", enum: [...VALID_RANGES] },
          category: { type: "string" },
          merchant: { type: "string" },
          account: { type: "string", description: "Filter by account name, normalized account key, or account ID" },
          direction: { type: "string", enum: [...VALID_DIRECTIONS] },
          limit: { type: "number", description: "Max transactions to return (default 20, max 100)" }
        },
        required: []
      }
    }
  },
  execute: async (ctx, args) => {
    const { listTransactions } = await import("../transactions.ts");
    const { filterUserTransactions, buildAppliedRange } = await import("../analytics.ts");
    const filters = buildFiltersFromArgs(args, { include_excluded: false });
    if (args.limit !== undefined) filters.limit = Number(args.limit);
    if (args.offset !== undefined) filters.offset = Number(args.offset);
    return { success: true, data: listTransactions(ctx.userId, filters) };
  }
});

export const T_REFERENCE_PREVIOUS = register({
  name: "reference_previous",
  description: "Fetch results from a previous turn in the conversation. Use when user references earlier results like 'show me those transactions'.",
  access: "read",
  category: "system",
  schema: {
    type: "function",
    function: {
      name: "reference_previous",
      description: "Fetch results from a previous turn in the conversation.",
      parameters: {
        type: "object",
        properties: {
          result_id: { type: "string", description: "The result ID to reference (e.g., 'result_1')" }
        },
        required: ["result_id"]
      }
    }
  },
  execute: async (ctx, args) => {
    const key = args.key as string | undefined;
    const resultId = args.result_id as string | undefined;
    const cacheKey = key || resultId;
    if (cacheKey && ctx.resultCache?.has(cacheKey)) {
      return { success: true, data: { referenced: true, key: cacheKey, data: ctx.resultCache.get(cacheKey) } };
    }
    return { success: true, data: { referenced: true, key: cacheKey || null, note: "Reference to previous tool result for context continuity" } };
  }
});

export const T_COMPARE_RESULTS = register({
  name: "compare_results",
  description: "Compare two result sets. Use when user asks to compare periods or categories.",
  access: "read",
  category: "analytics",
  schema: {
    type: "function",
    function: {
      name: "compare_results",
      description: "Compare two result sets.",
      parameters: {
        type: "object",
        properties: {
          result_id_a: { type: "string", description: "First result ID" },
          result_id_b: { type: "string", description: "Second result ID" }
        },
        required: ["result_id_a", "result_id_b"]
      }
    }
  },
  execute: async (ctx, args) => {
    const resultIdA = args.result_id_a as string;
    const resultIdB = args.result_id_b as string;
    if (!resultIdA || !resultIdB) {
      return { success: false, error: "Both result_id_a and result_id_b are required" };
    }
    const dataA = ctx.resultCache?.get(resultIdA);
    const dataB = ctx.resultCache?.get(resultIdB);
    if (!dataA || !dataB) {
      return {
        success: false,
        error: `Results not found: ${!dataA ? resultIdA : ""} ${!dataB ? resultIdB : ""}`.trim(),
        data: { availableKeys: ctx.resultCache ? Array.from(ctx.resultCache.keys()) : [] }
      };
    }
    return { success: true, data: { compared: true, comparison: compareDataSets(dataA, dataB) } };
  }
});

export const T_ASK_CLARIFICATION = register({
  name: "ask_clarification",
  description: "Ask the user a clarifying question when the query is ambiguous. Use sparingly.",
  access: "read",
  category: "system",
  schema: {
    type: "function",
    function: {
      name: "ask_clarification",
      description: "Ask the user a clarifying question when the query is ambiguous. Use sparingly.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The clarifying question" },
          options: { type: "array", items: { type: "string" }, description: "Suggested answers" }
        },
        required: ["question"]
      }
    }
  },
  execute: async (_ctx, args) => {
    return {
      success: true,
      data: {
        needsClarification: true,
        question: String(args.question || "Could you provide more details?"),
        options: Array.isArray(args.options) ? args.options.map(String) : null
      }
    };
  }
});

// ----- Categorization tools -----

export const T_GET_CATEGORIES = register({
  name: "get_categories",
  description: "Get all available categories for the user.",
  access: "read",
  category: "analytics",
  schema: {
    type: "function",
    function: {
      name: "get_categories",
      description: "Get all available categories for the user.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  execute: async (ctx) => {
    const { listCategories } = await import("../categories.ts");
    return { success: true, data: listCategories(ctx.userId) };
  }
});

export const T_GET_MERCHANT_HISTORY = register({
  name: "get_merchant_history",
  description: "Check if this merchant exists in past transactions and what category was assigned.",
  access: "read",
  category: "analytics",
  schema: {
    type: "function",
    function: {
      name: "get_merchant_history",
      description: "Check if this merchant exists in past transactions and what category was assigned.",
      parameters: {
        type: "object",
        properties: {
          merchant: { type: "string", description: "The merchant name to look up" }
        },
        required: ["merchant"]
      }
    }
  },
  execute: async (ctx, args) => {
    const merchant = args.merchant as string | undefined;
    if (!merchant) throw new Error("merchant parameter is required");
    const { filterUserTransactions, buildAppliedRange } = await import("../analytics.ts");
    const filters = buildFiltersFromArgs({ merchant }, { include_excluded: false });
    const transactions = filterUserTransactions(ctx.userId, filters);
    const monthlyTotals: Record<string, { month: string; amount: number; count: number }> = {};
    for (const txn of transactions) {
      const month = String(txn.transaction_date || "").substring(0, 7) || "unknown";
      if (!monthlyTotals[month]) monthlyTotals[month] = { month, amount: 0, count: 0 };
      monthlyTotals[month].amount += Math.abs(Number(txn.amount) || 0);
      monthlyTotals[month].count += 1;
    }
    return {
      success: true,
      data: {
        merchant,
        history: Object.values(monthlyTotals).sort((a, b) => a.month.localeCompare(b.month)),
        totalAmount: Object.values(monthlyTotals).reduce((s, m) => s + m.amount, 0),
        totalTransactions: Object.values(monthlyTotals).reduce((s, m) => s + m.count, 0)
      }
    };
  }
});

export const T_GET_MERCHANT_TRANSACTIONS_6_MONTHS = register({
  name: "get_merchant_transactions_6_months",
  description: "Get all transactions for this merchant in the last 6 months.",
  access: "read",
  category: "analytics",
  schema: {
    type: "function",
    function: {
      name: "get_merchant_transactions_6_months",
      description: "Get all transactions for this merchant in the last 6 months.",
      parameters: {
        type: "object",
        properties: {
          merchant: { type: "string", description: "The merchant name to look up" }
        },
        required: ["merchant"]
      }
    }
  },
  execute: async (ctx, args) => {
    const merchant = args.merchant as string | undefined;
    if (!merchant) throw new Error("merchant parameter is required");
    const now = new Date();
    const end = now.toISOString().substring(0, 10);
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 6);
    const start = startDate.toISOString().substring(0, 10);
    const { filterUserTransactions } = await import("../analytics.ts");
    const filters = buildFiltersFromArgs({ start, end, merchant }, { include_excluded: false });
    const transactions = filterUserTransactions(ctx.userId, filters);
    const monthlyHistory: Record<string, { month: string; amount: number; count: number }> = {};
    for (const txn of transactions) {
      const month = String(txn.transaction_date || "").substring(0, 7) || "unknown";
      if (!monthlyHistory[month]) monthlyHistory[month] = { month, amount: 0, count: 0 };
      monthlyHistory[month].amount += Math.abs(Number(txn.amount) || 0);
      monthlyHistory[month].count += 1;
    }
    const months = Object.values(monthlyHistory).sort((a, b) => a.month.localeCompare(b.month));
    const totalAmount = months.reduce((s, m) => s + m.amount, 0);
    return {
      success: true,
      data: {
        merchant,
        transactions: transactions.slice(0, 50),
        monthlyHistory: months,
        summary: {
          totalAmount: Math.round(totalAmount * 100) / 100,
          totalTransactions: transactions.length,
          averageMonthlyAmount: months.length ? Math.round((totalAmount / months.length) * 100) / 100 : 0,
          monthsCovered: months.length
        },
        appliedRange: { start, end }
      }
    };
  }
});

// ----- Subscriptions tools (will be implemented in step 3) -----

// Placeholder — actual implementations will be added in step 3
export const T_LIST_RECURRING_RULES = register({
  name: "list_recurring_rules",
  description: "List all recurring rules (subscriptions, bills) the user has configured.",
  access: "read",
  category: "subscriptions",
  schema: {
    type: "function",
    function: {
      name: "list_recurring_rules",
      description: "List all recurring rules the user has configured.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  execute: async (ctx) => {
    const { listRecurringRules } = await import("../recurrings.ts");
    return { success: true, data: listRecurringRules(ctx.userId) };
  }
});

export const T_LIST_RECURRING_SUGGESTIONS = register({
  name: "list_recurring_suggestions",
  description: "List pending recurring suggestions that need user review.",
  access: "read",
  category: "subscriptions",
  schema: {
    type: "function",
    function: {
      name: "list_recurring_suggestions",
      description: "List pending recurring suggestions that need user review.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  execute: async (ctx) => {
    const { listRecurringSuggestions } = await import("../recurring-suggestions.ts");
    return { success: true, data: listRecurringSuggestions(ctx.userId) };
  }
});

// ----- Benefits tools (will be implemented in step 4) -----

export const T_LIST_CREDIT_CARDS = register({
  name: "list_credit_cards",
  description: "List the user's credit card accounts.",
  access: "read",
  category: "benefits",
  schema: {
    type: "function",
    function: {
      name: "list_credit_cards",
      description: "List the user's credit card accounts.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  execute: async (ctx) => {
    const { listAccounts } = await import("../accounts.ts");
    const accounts = listAccounts(ctx.userId);
    return { success: true, data: accounts.filter((a: { accountType: string }) => a.accountType === "credit") };
  }
});

// ----- Terminal / write tools (categorization, recurring, import) -----

export const T_ASSIGN_CATEGORY = register({
  name: "assign_category",
  description: "Assign a category to a transaction. Terminal action — confirms the categorization.",
  access: "write",
  requiresConfirmation: false,
  category: "analytics",
  schema: {
    type: "function",
    function: {
      name: "assign_category",
      description: "Assign a category to a transaction.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "The category to assign" },
          confidence: { type: "number", description: "Confidence level (0-1)" },
          source: { type: "string", enum: [...VALID_SOURCES], description: "How the category was determined" }
        },
        required: ["category", "confidence", "source"]
      }
    }
  },
  execute: async (_ctx, args) => {
    // Validation is done in agent.ts before reaching here
    return {
      success: true,
      data: {
        category: String(args.category || ""),
        confidence: Number(args.confidence) || 0.5,
        source: args.source === "history" || args.source === "inferred" ? args.source : "inferred"
      }
    };
  }
});

export const T_CREATE_RECURRING_SUGGESTION = register({
  name: "create_recurring_suggestion",
  description: "Create a recurring transaction suggestion for user review. Terminal action.",
  access: "write",
  requiresConfirmation: false,
  category: "subscriptions",
  schema: {
    type: "function",
    function: {
      name: "create_recurring_suggestion",
      description: "Create a recurring transaction suggestion for user review.",
      parameters: {
        type: "object",
        properties: {
          merchant: { type: "string" },
          cadence: { type: "string", enum: [...VALID_CADENCES] },
          suggested_amount: { type: "number" },
          confidence: { type: "number", description: "Confidence level (0-1)" }
        },
        required: ["merchant", "cadence", "suggested_amount", "confidence"]
      }
    }
  },
  execute: async (_ctx, args) => {
    return {
      success: true,
      data: {
        isRecurring: true,
        cadence: args.cadence as string | undefined,
        suggestedAmount: args.suggested_amount ? Number(args.suggested_amount) : undefined,
        confidence: args.confidence ? Number(args.confidence) : undefined
      }
    };
  }
});

export const T_ASSIGN_RESULTS = register({
  name: "assign_results",
  description: "Assign category and direction for a batch of imported transactions. Terminal action.",
  access: "write",
  requiresConfirmation: false,
  category: "analytics",
  schema: {
    type: "function",
    function: {
      name: "assign_results",
      description: "Assign category and direction for a batch of imported transactions.",
      parameters: {
        type: "object",
        properties: {
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                transaction_id: { type: "string" },
                category: { type: "string" },
                direction: { type: "string", enum: [...VALID_DIRECTIONS] },
                confidence: { type: "number" },
                source: { type: "string", enum: [...VALID_SOURCES] }
              },
              required: ["transaction_id", "category", "direction", "confidence", "source"]
            }
          }
        },
        required: ["results"]
      }
    }
  },
  execute: async (_ctx, args) => {
    const results = Array.isArray(args.results) ? args.results.map((r: Record<string, unknown>) => ({
      transaction_id: String(r.transaction_id),
      category: String(r.category),
      direction: r.direction === "inflow" || r.direction === "outflow" ? r.direction : "outflow",
      confidence: Number(r.confidence) || 0.5,
      source: r.source === "history" || r.source === "inferred" ? r.source : "inferred"
    })) : [];
    return { success: true, data: { results } };
  }
});

// ----- Analysis / budgeting tools (will be implemented in step 5) -----

// ----- Helper: build filters from args -----

function buildFiltersFromArgs(
  args: Record<string, unknown>,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const filters: Record<string, unknown> = { ...extra };
  if (args.start) filters.start = args.start;
  if (args.end) filters.end = args.end;
  if (args.range) filters.range = args.range;
  if (args.category) filters.category = args.category;
  if (args.merchant) filters.merchant = args.merchant;
  if (args.direction) filters.direction = args.direction;
  if (args.account) filters.account = args.account;
  if (args.limit !== undefined) filters.limit = args.limit;
  if (args.offset !== undefined) filters.offset = args.offset;
  if (args.min_amount !== undefined) filters.min_amount = args.min_amount;
  if (args.max_amount !== undefined) filters.max_amount = args.max_amount;
  return filters;
}

// ----- Helper: compare two data sets -----

export function compareDataSets(dataA: unknown, dataB: unknown): Record<string, unknown> {
  const a = dataA as Record<string, unknown> | null | undefined;
  const b = dataB as Record<string, unknown> | null | undefined;
  const result: Record<string, unknown> = {};
  const numericFields = ["totalSpend", "totalIncome", "netFlow", "totalAmount", "count", "amount"];
  for (const field of numericFields) {
    if (a?.[field] !== undefined && b?.[field] !== undefined) {
      const valA = Number(a[field]) || 0;
      const valB = Number(b[field]) || 0;
      result[`${field}A`] = valA;
      result[`${field}B`] = valB;
      result[`${field}Diff`] = valA - valB;
      result[`${field}PercentChange`] = valB !== 0 ? ((valA - valB) / valB) * 100 : null;
    }
  }
  if (Array.isArray(a?.categories) && Array.isArray(b?.categories)) {
    const catsA = new Map((a.categories as Array<Record<string, unknown>>).map(c => [c.category || c.name, c]));
    const catsB = new Map((b.categories as Array<Record<string, unknown>>).map(c => [c.category || c.name, c]));
    const allKeys = new Set([...catsA.keys(), ...catsB.keys()]);
    result.categoryComparison = [...allKeys].map(cat => ({
      category: String(cat),
      amountA: catsA.get(cat) ? Number((catsA.get(cat) as Record<string, unknown>).amount || 0) : undefined,
      amountB: catsB.get(cat) ? Number((catsB.get(cat) as Record<string, unknown>).amount || 0) : undefined
    }));
  }
  return result;
}
