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
  /** Override "now" for deterministic date-relative calculations */
  _now?: Date;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  meta?: {
    toolName: string;
    executionTimeMs: number;
  };
  /** Structured blocks for typed API/frontend rendering */
  blocks?: ToolResultBlock[];
}

export type ToolAccess = "read" | "write";
export type ToolCategory = "analytics" | "subscriptions" | "benefits" | "budgeting" | "system";

// ---------------------------------------------------------------------------
// Structured blocks for UI rendering
// ---------------------------------------------------------------------------

export type BlockType = "subscriptions" | "cardBenefits" | "budgetComparison";

export interface ToolResultBlock {
  type: BlockType;
  data: unknown;
}

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

/**
 * Get the effective "now" date. Uses context override if available.
 */
export function getEffectiveNow(ctx: ToolExecutionContext): Date {
  return ctx._now || new Date();
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
    const data = getOverview(ctx.userId, filters);
    const now = getEffectiveNow(ctx);
    return { success: true, data: { ...data, dataAsOf: now.toISOString().substring(0, 10) } };
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
    const filters = buildFiltersFromArgs({ ...args, merchant }, { include_excluded: false });
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
    const now = getEffectiveNow(ctx);
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

// ----- Subscriptions / Recurring tools -----

/**
 * Amount-matching logic (deterministic, same as recurring-scan.ts).
 */
function amountMatches(a: number, b: number): boolean {
  const AMOUNT_TOLERANCE_MIN = 0.10;
  const AMOUNT_TOLERANCE_PERCENT = 0.05;
  const tolerance = Math.max(AMOUNT_TOLERANCE_MIN, a * AMOUNT_TOLERANCE_PERCENT);
  const EPSILON = 0.0001;
  return Math.abs(a - b) <= tolerance + EPSILON;
}

/**
 * Detect cadence from a sorted list of dates (ISO strings).
 * Returns the best-guess cadence and confidence.
 */
function detectCadence(
  dates: string[]
): { cadence: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | null; confidence: number } {
  if (dates.length < 2) return { cadence: null, confidence: 0 };

  // Calculate gaps in days between consecutive dates
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
    gaps.push(Math.round(diff));
  }

  if (gaps.length === 0) return { cadence: null, confidence: 0 };

  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;

  // Score each cadence by how well it matches the average gap
  const cadenceScores: Array<{ cadence: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"; score: number }> = [
    { cadence: "weekly", score: 1 / (1 + Math.abs(avgGap - 7)) },
    { cadence: "biweekly", score: 1 / (1 + Math.abs(avgGap - 14)) },
    { cadence: "monthly", score: 1 / (1 + Math.abs(avgGap - 30)) },
    { cadence: "quarterly", score: 1 / (1 + Math.abs(avgGap - 91)) },
    { cadence: "yearly", score: 1 / (1 + Math.abs(avgGap - 365)) }
  ];

  // Determine consistency: low variance = high confidence
  const gapMean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const variance = gaps.map(g => (g - gapMean) ** 2).reduce((s, v) => s + v, 0) / gaps.length;
  const consistencyScore = 1 / (1 + Math.sqrt(variance) / 10);

  const best = cadenceScores.reduce((best, curr) => (curr.score > best.score ? curr : best));
  const confidence = Math.min(1, best.score * consistencyScore);

  return { cadence: best.score > 0.3 ? best.cadence : null, confidence: Math.round(confidence * 100) / 100 };
}

// --- Tool: list_recurring_rules ---

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
    const result = listRecurringRules(ctx.userId);
    const rules = result.items || [];
    const subscriptions = rules.map((r: Record<string, unknown>) => ({
      merchant: String(r.name || r.merchant_pattern || "Unknown"),
      cadence: String(r.cadence || ""),
      amount: Math.abs(Number(r.amount) || 0),
      nextDate: String(r.next_run_at || r.next_expected_date || ""),
      status: String(r.status || "active")
    }));
    return {
      success: true,
      data: { items: rules },
      blocks: subscriptions.length > 0 ? [{ type: "subscriptions" as const, data: subscriptions }] : undefined
    };
  }
});

// --- Tool: list_recurring_suggestions ---

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

// --- Tool: detect_recurring_patterns (deterministic, not LLM-on-LLM) ---

export const T_DETECT_RECURRING_PATTERNS = register({
  name: "detect_recurring_patterns",
  description: "Analyze transaction history for recurring patterns. Deterministic analysis (not AI-based).",
  access: "read",
  category: "subscriptions",
  schema: {
    type: "function",
    function: {
      name: "detect_recurring_patterns",
      description: "Analyze transaction history for recurring patterns by merchant.",
      parameters: {
        type: "object",
        properties: {
          merchant: { type: "string", description: "Merchant to analyze (optional — if omitted, analyzes all merchants)" }
        },
        required: []
      }
    }
  },
  execute: async (ctx, args) => {
    const merchant = args.merchant as string | undefined;
    const { filterUserTransactions } = await import("../analytics.ts");
    const now = getEffectiveNow(ctx);
    const end = now.toISOString().substring(0, 10);
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 6);
    const start = startDate.toISOString().substring(0, 10);

    const filters = { start, end, ...(merchant ? { merchant } : {}), include_excluded: false };
    const transactions = filterUserTransactions(ctx.userId, filters);

    if (transactions.length === 0) {
      return { success: true, data: { patterns: [], note: "No transactions found in the last 6 months." } };
    }

    // Group by merchant-normalized
    const merchantGroups: Record<string, Array<{ date: string; amount: number }>> = {};
    for (const txn of transactions) {
      const m = String(txn.merchant_normalized || txn.merchant || "unknown").trim().toLowerCase();
      if (!merchantGroups[m]) merchantGroups[m] = [];
      merchantGroups[m].push({
        date: String(txn.transaction_date || ""),
        amount: Math.abs(Number(txn.amount) || 0)
      });
    }

    const patterns: Array<{
      merchant: string;
      cadence: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | null;
      suggestedAmount: number;
      confidence: number;
      transactionCount: number;
      monthsCovered: number;
      averageGapDays: number;
    }> = [];

    for (const [mName, txns] of Object.entries(merchantGroups)) {
      if (txns.length < 2) continue; // Need at least 2 transactions

      // Sort by date
      txns.sort((a, b) => a.date.localeCompare(b.date));

      // Group by similar amounts (within 5% tolerance)
      const amountGroups: Array<typeof txns> = [];
      for (const txn of txns) {
        let added = false;
        for (const group of amountGroups) {
          if (amountMatches(group[0].amount, txn.amount)) {
            group.push(txn);
            added = true;
            break;
          }
        }
        if (!added) {
          amountGroups.push([txn]);
        }
      }

      // Analyze each group with >= 2 transactions
      for (const group of amountGroups) {
        if (group.length < 2) continue;

        const dates = group.map(t => t.date).filter(Boolean);
        const amounts = group.map(t => t.amount);
        const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;

        const { cadence, confidence } = detectCadence(dates);

        // Get unique months covered
        const months = new Set(dates.map(d => d.substring(0, 7)));

        patterns.push({
          merchant: mName,
          cadence,
          suggestedAmount: Math.round(avgAmount * 100) / 100,
          confidence,
          transactionCount: group.length,
          monthsCovered: months.size,
          averageGapDays: dates.length > 1
            ? Math.round(
              (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) /
                (1000 * 60 * 60 * 24 * (dates.length - 1))
            )
            : 0
        });
      }
    }

    // Sort by confidence descending
    patterns.sort((a, b) => b.confidence - a.confidence);

    return { success: true, data: { patterns, totalMerchantsAnalyzed: Object.keys(merchantGroups).length } };
  }
});

// --- Tool: explain_recurring_rule ---

export const T_EXPLAIN_RECURRING_RULE = register({
  name: "explain_recurring_rule",
  description: "Get detailed explanation of a recurring rule: projected annual cost, next expected date, cadence, and recent changes.",
  access: "read",
  category: "subscriptions",
  schema: {
    type: "function",
    function: {
      name: "explain_recurring_rule",
      description: "Get detailed explanation of a recurring rule.",
      parameters: {
        type: "object",
        properties: {
          rule_id: { type: "string", description: "The recurring rule ID to explain" }
        },
        required: ["rule_id"]
      }
    }
  },
  execute: async (ctx, args) => {
    const ruleId = args.rule_id as string;
    if (!ruleId) return { success: false, error: "rule_id is required" };

    const { getRecurringRule } = await import("../recurrings.ts");
    const { filterUserTransactions } = await import("../analytics.ts");

    const rule = getRecurringRule(ctx.userId, ruleId);
    if (!rule) return { success: false, error: "Rule not found" };

    // Compute projected annual cost
    const amount = Math.abs(Number(rule.amount) || 0);
    const cadenceMultiplier: Record<string, number> = {
      weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1
    };
    const annualMultiplier = cadenceMultiplier[String(rule.cadence)] || 12;
    const annualCost = amount * annualMultiplier;

    // Compute next expected date
    let nextDate: string | null = rule.next_run_at || null;
    if (!nextDate && rule.last_evaluated_at) {
      // Estimate from last evaluated + cadence
      const lastDate = new Date(rule.last_evaluated_at);
      const cadenceDays: Record<string, number> = {
        weekly: 7, biweekly: 14, monthly: 30, quarterly: 91, yearly: 365
      };
      const days = cadenceDays[String(rule.cadence)] || 30;
      lastDate.setDate(lastDate.getDate() + days);
      nextDate = lastDate.toISOString().substring(0, 10);
    }

    // Get recent transactions for this merchant
    const now = getEffectiveNow(ctx);
    const lookback = new Date(now);
    lookback.setMonth(lookback.getMonth() - 6);
    const recentTxns = filterUserTransactions(ctx.userId, {
      start: lookback.toISOString().substring(0, 10),
      end: now.toISOString().substring(0, 10),
      merchant: rule.merchant_pattern || "",
      include_excluded: false
    });

    // Detect amount changes
    const amounts = recentTxns.map((t: { amount: number }) => Math.abs(Number(t.amount) || 0)).filter(Boolean);
    let amountChange: "increased" | "decreased" | "stable" = "stable";
    if (amounts.length >= 2) {
      const firstHalfAvg = amounts.slice(0, Math.floor(amounts.length / 2)).reduce((s: number, a: number) => s + a, 0) / Math.floor(amounts.length / 2);
      const secondHalfAvg = amounts.slice(Math.floor(amounts.length / 2)).reduce((s: number, a: number) => s + a, 0) / Math.ceil(amounts.length / 2);
      if (secondHalfAvg > firstHalfAvg * 1.05) amountChange = "increased";
      else if (secondHalfAvg < firstHalfAvg * 0.95) amountChange = "decreased";
    }

    return {
      success: true,
      data: {
        rule: {
          id: rule.id,
          merchant: rule.name || rule.merchant_pattern,
          cadence: rule.cadence,
          amount: Math.round(amount * 100) / 100,
          direction: rule.direction,
          status: rule.status
        },
        projectedAnnualCost: Math.round(annualCost * 100) / 100,
        annualMultiplier,
        nextExpectedDate: nextDate,
        amountChange,
        recentTransactions: {
          count: recentTxns.length,
          averageAmount: amounts.length ? Math.round(amounts.reduce((s: number, a: number) => s + a, 0) / amounts.length * 100) / 100 : 0,
          period: {
            start: lookback.toISOString().substring(0, 10),
            end: now.toISOString().substring(0, 10)
          }
        }
      }
    };
  }
});

// --- Tool: create_recurring_rule (with confirmation) ---

export const T_CREATE_RECURRING_RULE = register({
  name: "create_recurring_rule",
  description: "Create a recurring rule from a suggestion or detected pattern. Requires user confirmation.",
  access: "write",
  requiresConfirmation: true,
  category: "subscriptions",
  schema: {
    type: "function",
    function: {
      name: "create_recurring_rule",
      description: "Create a recurring rule from a suggestion or detected pattern. Use _mode=preview first, then _mode=execute after user confirms.",
      parameters: {
        type: "object",
        properties: {
          _mode: { type: "string", enum: ["preview", "execute"], description: "preview = show what would happen, execute = actually create" },
          merchant: { type: "string", description: "Merchant name" },
          cadence: { type: "string", enum: [...VALID_CADENCES], description: "How often the charge occurs" },
          amount: { type: "number", description: "Expected amount" },
          direction: { type: "string", enum: [...VALID_DIRECTIONS], description: "Direction of the transaction" },
          suggestion_id: { type: "string", description: "Optional: suggestion ID to convert to rule" }
        },
        required: ["merchant", "cadence", "amount"]
      }
    }
  },
  execute: async (ctx, args) => {
    const mode = String(args._mode || "preview");
    const merchant = String(args.merchant || "");
    const cadence = String(args.cadence || "");
    const amount = Number(args.amount) || 0;
    const direction = String(args.direction || "outflow");

    if (!merchant) return { success: false, error: "merchant is required" };
    if (!VALID_CADENCES.includes(cadence as typeof VALID_CADENCES[number])) {
      return { success: false, error: `Invalid cadence: ${cadence}. Must be ${VALID_CADENCES.join(", ")}` };
    }
    if (amount <= 0) return { success: false, error: "amount must be positive" };

    if (mode === "preview") {
      // Return a preview of what would be created
      return {
        success: true,
        data: {
          _requiresConfirmation: true,
          _confirmationType: "create_recurring_rule",
          preview: {
            merchant,
            cadence,
            amount: Math.round(amount * 100) / 100,
            direction,
            projectedAnnualCost: Math.round(amount * ({
              weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1
            }[cadence] || 12) * 100) / 100
          },
          confirmationQuestion: `Create a ${cadence} recurring rule for ${merchant} at $${amount.toFixed(2)}?`
        }
      };
    }

    // Execute mode: actually create the rule
    const { createRecurringRule } = await import("../recurrings.ts");
    const { createRuleFromSuggestion } = await import("../recurring-suggestions.ts");

    const suggestionId = args.suggestion_id as string | undefined;
    let result;

    if (suggestionId) {
      result = createRuleFromSuggestion(ctx.userId, suggestionId, {
        cadence,
        amount
      });
    } else {
      result = createRecurringRule(ctx.userId, {
        name: merchant,
        merchant_pattern: merchant,
        cadence,
        amount,
        direction,
        status: "active"
      });
    }

    return {
      success: true,
      data: {
        created: true,
        rule: result,
        message: `Recurring rule created for ${merchant}: ${cadence} at $${amount.toFixed(2)}`
      }
    };
  }
});

// --- Tool: dismiss_recurring_suggestion (with confirmation) ---

export const T_DISMISS_RECURRING_SUGGESTION = register({
  name: "dismiss_recurring_suggestion",
  description: "Dismiss a pending recurring suggestion. Requires user confirmation.",
  access: "write",
  requiresConfirmation: true,
  category: "subscriptions",
  schema: {
    type: "function",
    function: {
      name: "dismiss_recurring_suggestion",
      description: "Dismiss a recurring suggestion. Use _mode=preview first, then _mode=execute after user confirms.",
      parameters: {
        type: "object",
        properties: {
          _mode: { type: "string", enum: ["preview", "execute"], description: "preview or execute" },
          suggestion_id: { type: "string", description: "The suggestion ID to dismiss" },
          reason: { type: "string", description: "Reason for dismissal", default: "user_dismissed" }
        },
        required: ["suggestion_id"]
      }
    }
  },
  execute: async (ctx, args) => {
    const mode = String(args._mode || "preview");
    const suggestionId = String(args.suggestion_id || "");
    const reason = String(args.reason || "user_dismissed");

    if (!suggestionId) return { success: false, error: "suggestion_id is required" };

    if (mode === "preview") {
      return {
        success: true,
        data: {
          _requiresConfirmation: true,
          _confirmationType: "dismiss_recurring_suggestion",
          preview: { suggestionId, reason },
          confirmationQuestion: `Dismiss this recurring suggestion? This will prevent it from appearing again for 30 days.`
        }
      };
    }

    const { dismissRecurringSuggestion } = await import("../recurring-suggestions.ts");
    const result = dismissRecurringSuggestion(ctx.userId, suggestionId, reason);

    return {
      success: true,
      data: {
        dismissed: true,
        result,
        message: "Suggestion dismissed."
      }
    };
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

// --- Tool: get_card_benefits ---

export const T_GET_CARD_BENEFITS = register({
  name: "get_card_benefits",
  description: "Get the benefits configured for a specific credit card account. Returns rates, caps, annual credits, and annual fee.",
  access: "read",
  category: "benefits",
  schema: {
    type: "function",
    function: {
      name: "get_card_benefits",
      description: "Get benefits for a specific credit card account.",
      parameters: {
        type: "object",
        properties: {
          account_id: { type: "string", description: "The credit card account ID" }
        },
        required: ["account_id"]
      }
    }
  },
  execute: async (ctx, args) => {
    const accountId = args.account_id as string;
    if (!accountId) return { success: false, error: "account_id is required" };
    const { getBenefitsForAccount, calculateBenefitUsage } = await import("./benefits-store.ts");
    const benefits = await getBenefitsForAccount(ctx.userId, accountId);
    // Join each benefit definition with its deterministic usage calculation
    const benefitsWithUsage = await Promise.all(
      benefits.map(async (b) => {
        const usage = await calculateBenefitUsage(ctx.userId, b, ctx._now);
        return {
          ...b,
          usedAmount: usage.usedAmount,
          remainingAmount: usage.remainingAmount,
          usagePercent: usage.usagePercent,
          periodStart: usage.periodStart,
          periodEnd: usage.periodEnd
        };
      })
    );
    // Build structured blocks for API response
    const cardBenefits = benefitsWithUsage.map((b) => ({
      cardName: String(b.cardName || ""),
      benefitType: String(b.benefitType || "rate"),
      category: b.category ? String(b.category) : undefined,
      rate: Number(b.rate) || 0,
      used: Number(b.usedAmount) || 0,
      cap: b.capAmount !== null && b.capAmount !== undefined ? Number(b.capAmount) : null,
      remaining: b.remainingAmount !== null && b.remainingAmount !== undefined ? Number(b.remainingAmount) : null
    }));
    return {
      success: true,
      data: { accountId, benefits: benefitsWithUsage },
      blocks: cardBenefits.length > 0 ? [{ type: "cardBenefits" as const, data: cardBenefits }] : undefined
    };
  }
});

// --- Tool: get_benefit_usage ---

export const T_GET_BENEFIT_USAGE = register({
  name: "get_benefit_usage",
  description: "Track how much of a benefit cap has been used, based on actual transaction history.",
  access: "read",
  category: "benefits",
  schema: {
    type: "function",
    function: {
      name: "get_benefit_usage",
      description: "Track benefit cap usage against transaction history.",
      parameters: {
        type: "object",
        properties: {
          benefit_id: { type: "string", description: "The benefit ID to check" }
        },
        required: ["benefit_id"]
      }
    }
  },
  execute: async (ctx, args) => {
    const benefitId = args.benefit_id as string;
    if (!benefitId) return { success: false, error: "benefit_id is required" };
    const { getBenefit, calculateBenefitUsage } = await import("./benefits-store.ts");
    const benefit = await getBenefit(ctx.userId, benefitId);
    if (!benefit) return { success: false, error: "Benefit not found" };
    const usage = await calculateBenefitUsage(ctx.userId, benefit, ctx._now);
    return { success: true, data: usage };
  }
});

// --- Tool: get_best_card_for_category ---

export const T_GET_BEST_CARD_FOR_CATEGORY = register({
  name: "get_best_card_for_category",
  description: "Find which credit card gives the best rewards for a spending category, considering rates and remaining caps.",
  access: "read",
  category: "benefits",
  schema: {
    type: "function",
    function: {
      name: "get_best_card_for_category",
      description: "Find the best card for a spending category.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "The spending category (e.g. Dining, Groceries)" },
          spend_amount: { type: "number", description: "Expected spend amount (optional)" }
        },
        required: ["category"]
      }
    }
  },
  execute: async (ctx, args) => {
    const category = args.category as string;
    if (!category) return { success: false, error: "category is required" };
    const spendAmount = Number(args.spend_amount) || 0;
    const { getBestCardForCategory } = await import("./benefits-store.ts");
    const results = await getBestCardForCategory(ctx.userId, category, spendAmount, ctx._now);
    return { success: true, data: { category, recommendations: results } };
  }
});

// --- Tool: get_annual_fee_analysis ---

export const T_GET_ANNUAL_FEE_ANALYSIS = register({
  name: "get_annual_fee_analysis",
  description: "Analyze whether a card's annual fee is worth it based on rewards earned vs fee paid.",
  access: "read",
  category: "benefits",
  schema: {
    type: "function",
    function: {
      name: "get_annual_fee_analysis",
      description: "Analyze annual fee vs rewards earned.",
      parameters: {
        type: "object",
        properties: {
          benefit_id: { type: "string", description: "The benefit ID to analyze" }
        },
        required: ["benefit_id"]
      }
    }
  },
  execute: async (ctx, args) => {
    const benefitId = args.benefit_id as string;
    if (!benefitId) return { success: false, error: "benefit_id is required" };
    const { getBenefit, getAnnualFeeAnalysis } = await import("./benefits-store.ts");
    const benefit = await getBenefit(ctx.userId, benefitId);
    if (!benefit) return { success: false, error: "Benefit not found" };
    const analysis = await getAnnualFeeAnalysis(ctx.userId, benefit, ctx._now);
    return { success: true, data: analysis };
  }
});

// --- Tool: get_annual_credits ---

export const T_GET_ANNUAL_CREDITS = register({
  name: "get_annual_credits",
  description: "Track annual credits for a card (e.g. Uber cash, airline fee credit) and see remaining amounts.",
  access: "read",
  category: "benefits",
  schema: {
    type: "function",
    function: {
      name: "get_annual_credits",
      description: "Track annual credits usage.",
      parameters: {
        type: "object",
        properties: {
          benefit_id: { type: "string", description: "The benefit ID" }
        },
        required: ["benefit_id"]
      }
    }
  },
  execute: async (ctx, args) => {
    const benefitId = args.benefit_id as string;
    if (!benefitId) return { success: false, error: "benefit_id is required" };
    const { getBenefit, getAnnualCreditsUsage } = await import("./benefits-store.ts");
    const benefit = await getBenefit(ctx.userId, benefitId);
    if (!benefit) return { success: false, error: "Benefit not found" };
    return { success: true, data: { credits: getAnnualCreditsUsage(benefit) } };
  }
});

// --- Tool: save_card_benefit (with confirmation) ---

export const T_SAVE_CARD_BENEFIT = register({
  name: "save_card_benefit",
  description: "Add or update a credit card benefit. Use _mode=preview first, then _mode=execute after user confirms.",
  access: "write",
  requiresConfirmation: true,
  category: "benefits",
  schema: {
    type: "function",
    function: {
      name: "save_card_benefit",
      description: "Add or update a credit card benefit. Preview first, then execute after user confirms.",
      parameters: {
        type: "object",
        properties: {
          _mode: { type: "string", enum: ["preview", "execute"], description: "preview or execute" },
          account_id: { type: "string", description: "The credit card account ID" },
          category: { type: "string", description: "Category the benefit applies to (or omit for all)" },
          merchant: { type: "string", description: "Specific merchant (or omit for category-wide)" },
          rate: { type: "number", description: "Cashback rate percentage (e.g. 3 for 3%)" },
          cap_amount: { type: "number", description: "Maximum spend that qualifies (omit for uncapped)" },
          cap_period: { type: "string", enum: ["monthly", "yearly", "statement"], description: "Cap period" },
          annual_fee: { type: "number", description: "Annual fee" },
          benefit_id: { type: "string", description: "Existing benefit ID to update (omit to create new)" }
        },
        required: ["account_id", "rate"]
      }
    }
  },
  execute: async (ctx, args) => {
    const mode = String(args._mode || "preview");
    const accountId = String(args.account_id || "");
    const rate = Number(args.rate) || 0;

    if (!accountId) return { success: false, error: "account_id is required" };
    if (rate <= 0) return { success: false, error: "rate must be positive" };

    // Build the benefit data
    const benefitData: Record<string, unknown> = {
      accountId,
      rate,
      category: args.category || null,
      merchant: args.merchant || null,
      capAmount: args.cap_amount !== undefined ? Number(args.cap_amount) : null,
      capPeriod: (args.cap_period as string) || null,
      annualFee: Number(args.annual_fee) || 0,
      annualCredits: []
    };

    if (mode === "preview") {
      return {
        success: true,
        data: {
          _requiresConfirmation: true,
          _confirmationType: "save_card_benefit",
          preview: {
            accountId,
            category: benefitData.category || "all categories",
            merchant: benefitData.merchant || "any merchant",
            rate,
            capAmount: benefitData.capAmount || "uncapped",
            capPeriod: benefitData.capPeriod || "none",
            annualFee: benefitData.annualFee || 0
          },
          confirmationQuestion: `Save this benefit: ${rate}%${benefitData.category ? ` on ${benefitData.category}` : ""}?`
        }
      };
    }

    // Execute: save the benefit
    const { addBenefit, updateBenefit } = await import("./benefits-store.ts");
    const { listAccounts } = await import("../accounts.ts");

    // Verify the account exists and belongs to the user
    const accounts = listAccounts(ctx.userId);
    const account = accounts.find((a: { id: string }) => a.id === accountId);
    if (!account) return { success: false, error: "Account not found" };

    const cardName = String((account as Record<string, unknown>).name || "Unknown Card");
    const issuer = String((account as Record<string, unknown>).institution || "Unknown");

    const existingBenefitId = args.benefit_id as string | undefined;
    let result;

    if (existingBenefitId) {
      result = await updateBenefit(ctx.userId, existingBenefitId, benefitData as Record<string, never>);
      if (!result) return { success: false, error: "Benefit not found" };
    } else {
      result = await addBenefit(ctx.userId, {
        userId: ctx.userId,
        cardName,
        issuer,
        benefitType: "rate",
        category: benefitData.category as string | null | undefined,
        merchant: benefitData.merchant as string | null | undefined,
        rate,
        capAmount: benefitData.capAmount as number | null,
        capPeriod: benefitData.capPeriod as "monthly" | "yearly" | "statement" | null,
        annualFee: benefitData.annualFee as number,
        annualCredits: []
      });
    }

    return {
      success: true,
      data: {
        created: !existingBenefitId,
        benefit: result,
        message: existingBenefitId
          ? "Benefit updated."
          : `Benefit added for ${cardName}: ${rate}%${benefitData.category ? ` on ${benefitData.category}` : ""}`
      }
    };
  }
});

// --- Tool: delete_card_benefit (with confirmation) ---

export const T_DELETE_CARD_BENEFIT = register({
  name: "delete_card_benefit",
  description: "Delete a credit card benefit. Use _mode=preview first, then _mode=execute after user confirms.",
  access: "write",
  requiresConfirmation: true,
  category: "benefits",
  schema: {
    type: "function",
    function: {
      name: "delete_card_benefit",
      description: "Delete a credit card benefit.",
      parameters: {
        type: "object",
        properties: {
          _mode: { type: "string", enum: ["preview", "execute"], description: "preview or execute" },
          benefit_id: { type: "string", description: "The benefit ID to delete" }
        },
        required: ["benefit_id"]
      }
    }
  },
  execute: async (ctx, args) => {
    const mode = String(args._mode || "preview");
    const benefitId = String(args.benefit_id || "");

    if (!benefitId) return { success: false, error: "benefit_id is required" };

    const { getBenefit, deleteBenefit } = await import("./benefits-store.ts");
    const benefit = await getBenefit(ctx.userId, benefitId);
    if (!benefit) return { success: false, error: "Benefit not found" };

    if (mode === "preview") {
      return {
        success: true,
        data: {
          _requiresConfirmation: true,
          _confirmationType: "delete_card_benefit",
          preview: {
            benefitId,
            cardName: benefit.cardName,
            category: benefit.category || "all",
            rate: benefit.rate
          },
          confirmationQuestion: `Delete the ${benefit.rate}% ${benefit.category || "general"} benefit for ${benefit.cardName}?`
        }
      };
    }

    const deleted = await deleteBenefit(ctx.userId, benefitId);
    return {
      success: true,
      data: { deleted, message: "Benefit deleted." }
    };
  }
});

// ----- Analysis / Budgeting tools -----

// --- Tool: get_spending_trends ---

export const T_GET_SPENDING_TRENDS = register({
  name: "get_spending_trends",
  description: "Get month-over-month spending trends. Shows direction (increasing/decreasing/stable) and percent changes.",
  access: "read",
  category: "budgeting",
  schema: {
    type: "function",
    function: {
      name: "get_spending_trends",
      description: "Get month-over-month spending trends.",
      parameters: {
        type: "object",
        properties: {
          months: { type: "number", description: "Number of months to analyze (default 6)" },
          category: { type: "string", description: "Filter to a specific category" },
          merchant: { type: "string", description: "Filter to a specific merchant" }
        },
        required: []
      }
    }
  },
  execute: async (ctx, args) => {
    const monthsCount = Math.min(Math.max(Number(args.months) || 6, 2), 24);
    const { filterUserTransactions } = await import("../analytics.ts");

    const now = getEffectiveNow(ctx);
    const end = now.toISOString().substring(0, 10);
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - monthsCount);
    const start = startDate.toISOString().substring(0, 10);

    const filters: Record<string, unknown> = { start, end, include_excluded: false };
    if (args.category) filters.category = args.category;
    if (args.merchant) filters.merchant = args.merchant;

    const transactions = filterUserTransactions(ctx.userId, filters);

    // Group by month
    const monthlyTotals: Record<string, { month: string; total: number; count: number }> = {};
    for (const txn of transactions) {
      const month = String(txn.transaction_date || "").substring(0, 7);
      if (!month) continue;
      if (!monthlyTotals[month]) monthlyTotals[month] = { month, total: 0, count: 0 };
      monthlyTotals[month].total += Math.abs(Number(txn.amount) || 0);
      monthlyTotals[month].count += 1;
    }

    const months = Object.values(monthlyTotals).sort((a, b) => a.month.localeCompare(b.month));

    // Calculate trends
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    let percentChange = 0;

    if (months.length >= 2) {
      const firstHalfTotal = months.slice(0, Math.floor(months.length / 2)).reduce((s, m) => s + m.total, 0);
      const firstHalfCount = Math.floor(months.length / 2);
      const secondHalfTotal = months.slice(Math.floor(months.length / 2)).reduce((s, m) => s + m.total, 0);
      const secondHalfCount = Math.ceil(months.length / 2);

      const firstAvg = firstHalfTotal / firstHalfCount;
      const secondAvg = secondHalfTotal / secondHalfCount;

      percentChange = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 10000) / 100 : 0;

      if (percentChange > 10) trend = "increasing";
      else if (percentChange < -10) trend = "decreasing";
    }

    const totalSpend = months.reduce((s, m) => s + m.total, 0);

    return {
      success: true,
      data: {
        trend,
        percentChange,
        monthsAnalyzed: months.length,
        totalSpend: Math.round(totalSpend * 100) / 100,
        averageMonthly: months.length ? Math.round((totalSpend / months.length) * 100) / 100 : 0,
        monthlyBreakdown: months.map(m => ({
          month: m.month,
          total: Math.round(m.total * 100) / 100,
          transactionCount: m.count
        })),
        period: { start, end }
      }
    };
  }
});

// --- Tool: get_recurring_forecast ---

export const T_GET_RECURRING_FORECAST = register({
  name: "get_recurring_forecast",
  description: "Project upcoming recurring charges for a given period based on active recurring rules.",
  access: "read",
  category: "budgeting",
  schema: {
    type: "function",
    function: {
      name: "get_recurring_forecast",
      description: "Project upcoming recurring charges.",
      parameters: {
        type: "object",
        properties: {
          months: { type: "number", description: "Number of months to forecast (default 1, max 12)" },
          start_date: { type: "string", format: "date", description: "Start date (YYYY-MM-DD, defaults to today)" }
        },
        required: []
      }
    }
  },
  execute: async (ctx, args) => {
    const monthsAhead = Math.min(Math.max(Number(args.months) || 1, 1), 12);
    const { listRecurringRules } = await import("../recurrings.ts");

    const rulesResult = listRecurringRules(ctx.userId, { status: "active" });
    const rules = rulesResult.items || [];

    if (rules.length === 0) {
      return {
        success: true,
        data: {
          forecast: [],
          totalProjected: 0,
          ruleCount: 0,
          monthsForecasted: monthsAhead,
          note: "No active recurring rules."
        }
      };
    }

    const now = getEffectiveNow(ctx);
    const startDate = args.start_date ? new Date(String(args.start_date)) : now;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + monthsAhead);

    const forecast: Array<{
      merchant: string;
      cadence: string;
      amount: number;
      direction: string;
      expectedDates: string[];
      totalOccurrences: number;
      totalProjected: number;
    }> = [];

    let totalProjected = 0;

    for (const rule of rules) {
      const amount = Math.abs(Number(rule.amount) || 0);
      const cadence = String(rule.cadence || "monthly");
      const direction = String(rule.direction || "outflow");

      // Generate expected occurrences from rule's next_run_at using calendar cadence
      const displayDates: string[] = [];
      const maxDisplayDates = 6;
      let current = rule.next_run_at ? new Date(rule.next_run_at) : new Date(startDate);

      // Advance past occurrences forward by cadence until they reach startDate
      // e.g. next_run_at = Jan 15, forecast starts Jun 15, cadence = monthly
      // Advance: Feb 15, Mar 15, Apr 15, May 15, Jun 15 (now in window)
      if (current < startDate) {
        const advanceCount = new Date(current);
        let safety = 0;
        while (advanceCount < startDate && safety < 100) {
          safety++;
          if (cadence === "weekly") {
            advanceCount.setDate(advanceCount.getDate() + 7);
          } else if (cadence === "biweekly") {
            advanceCount.setDate(advanceCount.getDate() + 14);
          } else if (cadence === "monthly") {
            advanceCount.setMonth(advanceCount.getMonth() + 1);
          } else if (cadence === "quarterly") {
            advanceCount.setMonth(advanceCount.getMonth() + 3);
          } else if (cadence === "yearly") {
            advanceCount.setFullYear(advanceCount.getFullYear() + 1);
          } else {
            advanceCount.setMonth(advanceCount.getMonth() + 1);
          }
        }
        current = advanceCount;
      }

      // First: count all occurrences in the period for the total
      const countCurrent = new Date(current);
      let totalOccurrences = 0;
      let safety = 0;
      while (countCurrent <= endDate && safety < 1000) {
        safety++;
        totalOccurrences++;
        if (cadence === "weekly") {
          countCurrent.setDate(countCurrent.getDate() + 7);
        } else if (cadence === "biweekly") {
          countCurrent.setDate(countCurrent.getDate() + 14);
        } else if (cadence === "monthly") {
          countCurrent.setMonth(countCurrent.getMonth() + 1);
        } else if (cadence === "quarterly") {
          countCurrent.setMonth(countCurrent.getMonth() + 3);
        } else if (cadence === "yearly") {
          countCurrent.setFullYear(countCurrent.getFullYear() + 1);
        } else {
          countCurrent.setMonth(countCurrent.getMonth() + 1);
        }
      }

      // Second: collect display dates (capped)
      let displayCurrent = new Date(current);
      safety = 0;
      while (displayCurrent <= endDate && displayDates.length < maxDisplayDates && safety < 100) {
        safety++;
        displayDates.push(displayCurrent.toISOString().substring(0, 10));
        if (cadence === "weekly") {
          displayCurrent.setDate(displayCurrent.getDate() + 7);
        } else if (cadence === "biweekly") {
          displayCurrent.setDate(displayCurrent.getDate() + 14);
        } else if (cadence === "monthly") {
          displayCurrent.setMonth(displayCurrent.getMonth() + 1);
        } else if (cadence === "quarterly") {
          displayCurrent.setMonth(displayCurrent.getMonth() + 3);
        } else if (cadence === "yearly") {
          displayCurrent.setFullYear(displayCurrent.getFullYear() + 1);
        } else {
          displayCurrent.setMonth(displayCurrent.getMonth() + 1);
        }
      }

      const totalForRule = amount * totalOccurrences;
      totalProjected += totalForRule;

      forecast.push({
        merchant: String(rule.name || rule.merchant_pattern || "Unknown"),
        cadence,
        amount: Math.round(amount * 100) / 100,
        direction,
        expectedDates: displayDates,
        totalOccurrences,
        totalProjected: Math.round(totalForRule * 100) / 100
      });
    }

    return {
      success: true,
      data: {
        forecast,
        totalProjected: Math.round(totalProjected * 100) / 100,
        ruleCount: rules.length,
        monthsForecasted: monthsAhead,
        period: {
          start: startDate.toISOString().substring(0, 10),
          end: endDate.toISOString().substring(0, 10)
        }
      }
    };
  }
});

// --- Tool: get_budget_comparison ---

export const T_GET_BUDGET_COMPARISON = register({
  name: "get_budget_comparison",
  description: "Compare actual spending to budget targets. Budget targets can be saved with save_budget_target.",
  access: "read",
  category: "budgeting",
  schema: {
    type: "function",
    function: {
      name: "get_budget_comparison",
      description: "Compare actual spending to budget targets.",
      parameters: {
        type: "object",
        properties: {
          month: { type: "string", format: "date", description: "Month to analyze (YYYY-MM, defaults to current)" },
          category: { type: "string", description: "Filter to a specific category" }
        },
        required: []
      }
    }
  },
  execute: async (ctx, args) => {
    const { filterUserTransactions } = await import("../analytics.ts");
    const { listCategories } = await import("../categories.ts");

    // Determine analysis period
    const now = getEffectiveNow(ctx);
    let targetMonth: string;
    if (args.month && typeof args.month === "string") {
      targetMonth = args.month.substring(0, 7);
    } else {
      targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    const start = `${targetMonth}-01`;
    const endDate = new Date(Number(targetMonth.split("-")[0]), Number(targetMonth.split("-")[1]), 0);
    const end = endDate.toISOString().substring(0, 10);

    // Get all categories for the user
    const categories = listCategories(ctx.userId);

    // Get budget targets (user-scoped)
    const { loadStore } = await import("../store.ts");
    const store = loadStore() as Record<string, unknown>;
    const allTargets = (store.budgetTargetsByUser as Record<string, Record<string, number>>) || {};
    const budgetTargets: Record<string, number> = allTargets[ctx.userId] || {};

    // Get spending by category
    const filters: Record<string, unknown> = { start, end, include_excluded: false };
    if (args.category) filters.category = args.category;

    const transactions = filterUserTransactions(ctx.userId, filters);

    // Group by category
    const actualByCategory: Record<string, number> = {};
    for (const txn of transactions) {
      const cat = String(txn.category || txn.categoryGranular || "Uncategorized");
      actualByCategory[cat] = (actualByCategory[cat] || 0) + Math.abs(Number(txn.amount) || 0);
    }

    // Build comparison
    const comparisons: Array<{
      category: string;
      actual: number;
      target: number | null;
      difference: number;
      percentOfTarget: number | null;
    }> = [];

    const allCategoryNames = new Set([...Object.keys(actualByCategory), ...Object.keys(budgetTargets)]);

    for (const catName of allCategoryNames) {
      if (args.category && args.category !== catName) continue;
      const actual = Math.round((actualByCategory[catName] || 0) * 100) / 100;
      const target = budgetTargets[catName] !== undefined ? Number(budgetTargets[catName]) : null;
      const difference = target !== null ? Math.round((actual - target) * 100) / 100 : 0;
      const percentOfTarget = target !== null && target > 0
        ? Math.round((actual / target) * 10000) / 100
        : null;

      comparisons.push({ category: catName, actual, target, difference, percentOfTarget });
    }

    // Sort: over-budget first, then by difference
    comparisons.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

    const totalActual = comparisons.reduce((s, c) => s + c.actual, 0);
    const totalTarget = comparisons.reduce((s, c) => s + (c.target || 0), 0);

    // Build structured blocks for API response
    const budgetBlocks = comparisons.map((c) => ({
      category: c.category,
      actual: Math.round(c.actual * 100) / 100,
      target: c.target !== null ? Math.round(c.target * 100) / 100 : null,
      difference: Math.round(c.difference * 100) / 100
    }));

    return {
      success: true,
      data: {
        comparisons,
        summary: {
          month: targetMonth,
          totalActual: Math.round(totalActual * 100) / 100,
          totalTarget: Math.round(totalTarget * 100) / 100,
          totalDifference: Math.round((totalActual - totalTarget) * 100) / 100,
          categoriesCompared: comparisons.length,
          categoriesWithTarget: comparisons.filter(c => c.target !== null).length
        }
      },
      blocks: budgetBlocks.length > 0 ? [{ type: "budgetComparison" as const, data: budgetBlocks }] : undefined
    };
  }
});

// --- Tool: save_budget_target (with confirmation) ---

export const T_SAVE_BUDGET_TARGET = register({
  name: "save_budget_target",
  description: "Set a spending budget target for a category. Use _mode=preview first, then _mode=execute after user confirms.",
  access: "write",
  requiresConfirmation: true,
  category: "budgeting",
  schema: {
    type: "function",
    function: {
      name: "save_budget_target",
      description: "Set a spending budget target for a category.",
      parameters: {
        type: "object",
        properties: {
          _mode: { type: "string", enum: ["preview", "execute"], description: "preview or execute" },
          category: { type: "string", description: "Category name" },
          amount: { type: "number", description: "Monthly budget target" }
        },
        required: ["category", "amount"]
      }
    }
  },
  execute: async (ctx, args) => {
    const mode = String(args._mode || "preview");
    const category = String(args.category || "");
    const amount = Number(args.amount) || 0;

    if (!category) return { success: false, error: "category is required" };
    if (amount <= 0) return { success: false, error: "amount must be positive" };

    if (mode === "preview") {
      return {
        success: true,
        data: {
          _requiresConfirmation: true,
          _confirmationType: "save_budget_target",
          preview: { category, amount: Math.round(amount * 100) / 100 },
          confirmationQuestion: `Set a monthly budget of $${amount.toFixed(2)} for ${category}?`
        }
      };
    }

    // Execute: save the budget target (user-scoped)
    const { loadStore, saveStore } = await import("../store.ts");
    const store = loadStore() as Record<string, unknown>;
    if (!store.budgetTargetsByUser) {
      store.budgetTargetsByUser = {};
    }
    const userTargets = (store.budgetTargetsByUser as Record<string, Record<string, number>>);
    if (!userTargets[ctx.userId]) {
      userTargets[ctx.userId] = {};
    }
    userTargets[ctx.userId][category] = Math.round(amount * 100) / 100;
    saveStore(store as never);

    return {
      success: true,
      data: {
        saved: true,
        category,
        amount: Math.round(amount * 100) / 100,
        message: `Monthly budget of $${amount.toFixed(2)} set for ${category}.`
      }
    };
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
