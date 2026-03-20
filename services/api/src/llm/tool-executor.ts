// services/api/src/llm/tool-executor.ts

import {
  getUserDataBounds,
  getOverview,
  getCategoryRollup,
  getMerchantRollup,
  getAnomalies,
  filterUserTransactions,
  buildAppliedRange
} from "../analytics.ts";
import { listTransactions } from "../transactions.ts";
import { listCategories } from "../categories.ts";
import { loadStore } from "../store.ts";
import { computeDateRange } from "../utils.ts";

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

/**
 * Normalizes date parameters to a consistent format.
 */
function normalizeDateParams(args: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...args };

  // Handle range parameter
  if (normalized.range && typeof normalized.range === "string") {
    // Range is already normalized
  }

  // Ensure start and end are strings if provided
  if (normalized.start && typeof normalized.start !== "string") {
    normalized.start = String(normalized.start);
  }
  if (normalized.end && typeof normalized.end !== "string") {
    normalized.end = String(normalized.end);
  }

  return normalized;
}

/**
 * Execute a tool by name with the given arguments and context.
 * All tools enforce user isolation by filtering data by userId.
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const normalizedArgs = normalizeDateParams(args);
    let data: unknown;

    switch (toolName) {
      case "get_data_bounds":
        data = executeGetDataBounds(context.userId);
        break;

      case "get_overview":
        data = executeGetOverview(context.userId, normalizedArgs);
        break;

      case "get_category_breakdown":
        data = executeGetCategoryBreakdown(context.userId, normalizedArgs);
        break;

      case "get_merchant_breakdown":
        data = executeGetMerchantBreakdown(context.userId, normalizedArgs);
        break;

      case "get_anomalies":
        data = executeGetAnomalies(context.userId, normalizedArgs);
        break;

      case "list_transactions":
        data = executeListTransactions(context.userId, normalizedArgs);
        break;

      case "get_categories":
        data = executeGetCategories(context.userId);
        break;

      case "get_merchant_history":
        data = executeGetMerchantHistory(context.userId, normalizedArgs);
        break;

      case "get_merchant_transactions_6_months":
        data = executeGetMerchantTransactions6Months(context.userId, normalizedArgs);
        break;

      case "reference_previous":
        data = executeReferencePrevious(normalizedArgs, context);
        break;

      case "ask_clarification":
        data = executeAskClarification(normalizedArgs);
        break;

      case "compare_results":
        data = executeCompareResults(normalizedArgs, context);
        break;

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
          meta: {
            toolName,
            executionTimeMs: Date.now() - startTime
          }
        };
    }

    return {
      success: true,
      data,
      meta: {
        toolName,
        executionTimeMs: Date.now() - startTime
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      meta: {
        toolName,
        executionTimeMs: Date.now() - startTime
      }
    };
  }
}

function executeGetDataBounds(userId: string) {
  return getUserDataBounds(userId);
}

function executeGetOverview(userId: string, args: Record<string, unknown>) {
  const filters = buildFiltersFromArgs(args);
  return getOverview(userId, filters);
}

function executeGetCategoryBreakdown(userId: string, args: Record<string, unknown>) {
  const filters = buildFiltersFromArgs(args);
  return getCategoryRollup(userId, filters);
}

function executeGetMerchantBreakdown(userId: string, args: Record<string, unknown>) {
  const filters = buildFiltersFromArgs(args);
  return getMerchantRollup(userId, filters);
}

function executeGetAnomalies(userId: string, args: Record<string, unknown>) {
  const filters = buildFiltersFromArgs(args);
  return getAnomalies(userId, filters);
}

function executeListTransactions(userId: string, args: Record<string, unknown>) {
  const filters = buildFiltersFromArgs(args);

  // Add pagination params
  if (args.limit !== undefined) {
    filters.limit = Number(args.limit);
  }
  if (args.offset !== undefined) {
    filters.offset = Number(args.offset);
  }

  return listTransactions(userId, filters);
}

function executeGetCategories(userId: string) {
  return listCategories(userId);
}

function executeGetMerchantHistory(userId: string, args: Record<string, unknown>) {
  const merchant = args.merchant as string | undefined;
  if (!merchant) {
    throw new Error("merchant parameter is required");
  }

  const filters = buildFiltersFromArgs(args);
  filters.merchant = merchant;

  // Get monthly breakdown for the merchant
  const transactions = filterUserTransactions(userId, filters);
  const monthlyTotals: Record<string, { month: string; amount: number; count: number }> = {};

  for (const txn of transactions) {
    const month = txn.transaction_date?.substring(0, 7) || "unknown";
    if (!monthlyTotals[month]) {
      monthlyTotals[month] = { month, amount: 0, count: 0 };
    }
    const amount = Math.abs(Number(txn.amount) || 0);
    monthlyTotals[month].amount += amount;
    monthlyTotals[month].count += 1;
  }

  const history = Object.values(monthlyTotals).sort((a, b) => a.month.localeCompare(b.month));

  return {
    merchant,
    history,
    totalAmount: history.reduce((sum, m) => sum + m.amount, 0),
    totalTransactions: history.reduce((sum, m) => sum + m.count, 0),
    appliedRange: buildAppliedRange(filters)
  };
}

function executeGetMerchantTransactions6Months(userId: string, args: Record<string, unknown>) {
  const merchant = args.merchant as string | undefined;
  if (!merchant) {
    throw new Error("merchant parameter is required");
  }

  // Get last 6 months of data
  const now = new Date();
  const end = now.toISOString().substring(0, 10);
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 6);
  const start = startDate.toISOString().substring(0, 10);

  const filters = buildFiltersFromArgs({ ...args, start, end });
  filters.merchant = merchant;

  const transactions = filterUserTransactions(userId, filters);

  // Calculate monthly breakdown
  const monthlyTotals: Record<string, { month: string; amount: number; count: number }> = {};
  for (const txn of transactions) {
    const month = txn.transaction_date?.substring(0, 7) || "unknown";
    if (!monthlyTotals[month]) {
      monthlyTotals[month] = { month, amount: 0, count: 0 };
    }
    const amount = Math.abs(Number(txn.amount) || 0);
    monthlyTotals[month].amount += amount;
    monthlyTotals[month].count += 1;
  }

  const monthlyHistory = Object.values(monthlyTotals).sort((a, b) => a.month.localeCompare(b.month));

  // Calculate average and trend
  const totalAmount = monthlyHistory.reduce((sum, m) => sum + m.amount, 0);
  const avgAmount = monthlyHistory.length > 0 ? totalAmount / monthlyHistory.length : 0;

  return {
    merchant,
    transactions: transactions.slice(0, 50), // Limit to 50 most recent
    monthlyHistory,
    summary: {
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalTransactions: transactions.length,
      averageMonthlyAmount: Math.round(avgAmount * 100) / 100,
      monthsCovered: monthlyHistory.length
    },
    appliedRange: { start, end }
  };
}

function executeReferencePrevious(args: Record<string, unknown>, context?: ToolExecutionContext) {
  const key = args.key as string | undefined;
  const resultId = args.result_id as string | undefined;
  const description = args.description as string | undefined;

  // Try to fetch from resultCache if available
  const cacheKey = key || resultId;
  if (cacheKey && context?.resultCache?.has(cacheKey)) {
    const cachedData = context.resultCache.get(cacheKey);
    return {
      referenced: true,
      key: cacheKey,
      data: cachedData,
      description: description || null
    };
  }

  return {
    referenced: true,
    key: key || resultId || null,
    description: description || null,
    note: "Reference to previous tool result for context continuity"
  };
}

function executeAskClarification(args: Record<string, unknown>) {
  const question = args.question as string | undefined;
  const options = args.options as Array<string> | undefined;

  return {
    needsClarification: true,
    question: question || "Could you provide more details?",
    options: Array.isArray(options) ? options : null
  };
}

function executeCompareResults(args: Record<string, unknown>, context: ToolExecutionContext) {
  const resultIdA = args.result_id_a as string | undefined;
  const resultIdB = args.result_id_b as string | undefined;

  if (!resultIdA || !resultIdB) {
    return {
      compared: false,
      error: "Both result_id_a and result_id_b are required"
    };
  }

  const dataA = context?.resultCache?.get(resultIdA);
  const dataB = context?.resultCache?.get(resultIdB);

  if (!dataA || !dataB) {
    return {
      compared: false,
      error: `Results not found in cache: ${!dataA ? resultIdA : ''} ${!dataB ? resultIdB : ''}`.trim(),
      availableKeys: context?.resultCache ? Array.from(context.resultCache.keys()) : []
    };
  }

  // Perform comparison
  const comparison = compareResults(dataA, dataB);

  return {
    compared: true,
    result_id_a: resultIdA,
    result_id_b: resultIdB,
    comparison
  };
}

/**
 * Compare two result sets and return a comparison summary.
 */
function compareResults(dataA: unknown, dataB: unknown): Record<string, unknown> {
  const a = dataA as Record<string, unknown> | null | undefined;
  const b = dataB as Record<string, unknown> | null | undefined;

  const result: Record<string, unknown> = {
    typeA: a?.constructor?.name || typeof a,
    typeB: b?.constructor?.name || typeof b
  };

  // Compare numeric totals if present
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

  // Compare category breakdowns if present
  if (Array.isArray(a?.categories) && Array.isArray(b?.categories)) {
    const categoriesA = new Map((a.categories as Array<Record<string, unknown>>).map(c => [c.category || c.name, c]));
    const categoriesB = new Map((b.categories as Array<Record<string, unknown>>).map(c => [c.category || c.name, c]));

    const categoryComparison: Array<{
      category: string;
      amountA?: number;
      amountB?: number;
      diff?: number;
    }> = [];

    const allCategories = new Set([...categoriesA.keys(), ...categoriesB.keys()]);
    for (const cat of allCategories) {
      const catA = categoriesA.get(cat);
      const catB = categoriesB.get(cat);
      categoryComparison.push({
        category: String(cat),
        amountA: catA ? Number(catA.amount || catA.total || 0) : undefined,
        amountB: catB ? Number(catB.amount || catB.total || 0) : undefined
      });
    }

    result.categoryComparison = categoryComparison;
  }

  return result;
}

function buildFiltersFromArgs(args: Record<string, unknown>): Record<string, unknown> {
  const filters: Record<string, unknown> = {};

  if (args.start) filters.start = args.start;
  if (args.end) filters.end = args.end;
  if (args.range) filters.range = args.range;
  if (args.category) filters.category = args.category;
  if (args.category_view || args.categoryView) {
    filters.category_view = args.category_view || args.categoryView;
  }
  if (args.merchant) filters.merchant = args.merchant;
  if (args.direction) filters.direction = args.direction;
  if (args.account) filters.account = args.account;
  if (args.tag) filters.tag = args.tag;
  if (args.query) filters.query = args.query;
  if (args.min_amount !== undefined) filters.min_amount = args.min_amount;
  if (args.max_amount !== undefined) filters.max_amount = args.max_amount;
  if (args.review_status) filters.review_status = args.review_status;
  if (args.transaction_type) filters.transaction_type = args.transaction_type;
  if (args.source_type) filters.source_type = args.source_type;
  if (args.recurring_rule_id) filters.recurring_rule_id = args.recurring_rule_id;

  return filters;
}

/**
 * Get the list of available tools with their schemas.
 */
export function getAvailableTools() {
  return [
    {
      name: "get_data_bounds",
      description: "Get the date range and count of user's transaction data",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_overview",
      description: "Get a financial overview including spend, income, trends, and top categories/merchants",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date (YYYY-MM-DD)" },
          end: { type: "string", description: "End date (YYYY-MM-DD)" },
          range: { type: "string", description: "Predefined range (e.g., '30d', '90d', 'this_month')" },
          category_view: { type: "string", enum: ["granular", "coarse"] }
        },
        required: []
      }
    },
    {
      name: "get_category_breakdown",
      description: "Get spending breakdown by category",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date (YYYY-MM-DD)" },
          end: { type: "string", description: "End date (YYYY-MM-DD)" },
          range: { type: "string", description: "Predefined range" },
          category_view: { type: "string", enum: ["granular", "coarse"] }
        },
        required: []
      }
    },
    {
      name: "get_merchant_breakdown",
      description: "Get spending breakdown by merchant",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date (YYYY-MM-DD)" },
          end: { type: "string", description: "End date (YYYY-MM-DD)" },
          range: { type: "string", description: "Predefined range" }
        },
        required: []
      }
    },
    {
      name: "get_anomalies",
      description: "Detect unusual spending patterns and outliers",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date (YYYY-MM-DD)" },
          end: { type: "string", description: "End date (YYYY-MM-DD)" },
          range: { type: "string", description: "Predefined range" }
        },
        required: []
      }
    },
    {
      name: "list_transactions",
      description: "List transactions with optional filtering and pagination",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date (YYYY-MM-DD)" },
          end: { type: "string", description: "End date (YYYY-MM-DD)" },
          range: { type: "string", description: "Predefined range" },
          category: { type: "string", description: "Filter by category" },
          merchant: { type: "string", description: "Filter by merchant" },
          limit: { type: "number", description: "Max results (default 100)" },
          offset: { type: "number", description: "Pagination offset" }
        },
        required: []
      }
    },
    {
      name: "get_categories",
      description: "Get the user's categories",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_merchant_history",
      description: "Get historical spending data for a specific merchant",
      parameters: {
        type: "object",
        properties: {
          merchant: { type: "string", description: "Merchant name" },
          start: { type: "string", description: "Start date (YYYY-MM-DD)" },
          end: { type: "string", description: "End date (YYYY-MM-DD)" }
        },
        required: ["merchant"]
      }
    },
    {
      name: "get_merchant_transactions_6_months",
      description: "Get transactions and monthly history for a merchant over the last 6 months",
      parameters: {
        type: "object",
        properties: {
          merchant: { type: "string", description: "Merchant name" }
        },
        required: ["merchant"]
      }
    },
    {
      name: "reference_previous",
      description: "Reference a previous tool result for context",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Key to reference" },
          description: { type: "string", description: "Description of the reference" }
        },
        required: []
      }
    },
    {
      name: "ask_clarification",
      description: "Ask the user for clarification when needed",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The clarification question" },
          options: { type: "array", items: { type: "string" }, description: "Optional choices" }
        },
        required: ["question"]
      }
    }
  ];
}