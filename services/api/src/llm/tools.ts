import type { ToolDefinition } from "./client.ts";

// Q&A Mode Tools
export const QA_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_data_bounds",
      description: "Get the date range and count of user's transaction data. Use this to understand what data is available before querying.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_overview",
      description: "Get a summary overview of spending, income, and trends. Use for general queries about spending totals, net flow, or high-level analytics.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", format: "date", description: "Start date (YYYY-MM-DD)" },
          end: { type: "string", format: "date", description: "End date (YYYY-MM-DD)" },
          range: { type: "string", enum: ["30d", "90d", "365d", "ytd", "all"], description: "Preset date range" },
          category: { type: "string", description: "Filter by category name" },
          merchant: { type: "string", description: "Filter by merchant name" },
          direction: { type: "string", enum: ["inflow", "outflow"], description: "Filter by direction" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_category_breakdown",
      description: "Get spending breakdown by category. Use when user asks about spending by category or which categories they spend most on.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", format: "date" },
          end: { type: "string", format: "date" },
          range: { type: "string", enum: ["30d", "90d", "365d", "ytd", "all"] },
          direction: { type: "string", enum: ["inflow", "outflow"] }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_merchant_breakdown",
      description: "Get spending breakdown by merchant. Use when user asks about top merchants or spending at specific merchants.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", format: "date" },
          end: { type: "string", format: "date" },
          range: { type: "string", enum: ["30d", "90d", "365d", "ytd", "all"] },
          category: { type: "string" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_anomalies",
      description: "Detect unusual or anomalous transactions. Use when user asks about unusual spending, outliers, or transactions that stand out.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", format: "date" },
          end: { type: "string", format: "date" },
          range: { type: "string", enum: ["30d", "90d", "365d", "ytd", "all"] }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_transactions",
      description: "List individual transactions with filters. Use when user wants to see specific transactions or search for particular items.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", format: "date" },
          end: { type: "string", format: "date" },
          range: { type: "string", enum: ["30d", "90d", "365d", "ytd", "all"] },
          category: { type: "string" },
          merchant: { type: "string" },
          direction: { type: "string", enum: ["inflow", "outflow"] },
          limit: { type: "number", description: "Max transactions to return (default 20, max 100)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reference_previous",
      description: "Fetch results from a previous turn in the conversation. Use when user references earlier results like 'show me those transactions'.",
      parameters: {
        type: "object",
        properties: {
          result_id: { type: "string", description: "The result ID to reference (e.g., 'result_1')" }
        },
        required: ["result_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "compare_results",
      description: "Compare two result sets. Use when user asks to compare periods or categories.",
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
  {
    type: "function",
    function: {
      name: "ask_clarification",
      description: "Ask the user a clarifying question when the query is ambiguous. Use sparingly.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The clarifying question to ask the user" },
          options: { type: "array", items: { type: "string" }, description: "Optional list of suggested answers" }
        },
        required: ["question"]
      }
    }
  }
];

// Categorization Mode Tools
export const CATEGORIZATION_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_categories",
      description: "Get all available categories for the user.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
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
  {
    type: "function",
    function: {
      name: "assign_category",
      description: "Assign a category to the transaction.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "The category to assign" },
          confidence: { type: "number", description: "Confidence level (0-1)" },
          source: { type: "string", enum: ["history", "inferred"], description: "How the category was determined" }
        },
        required: ["category", "confidence", "source"]
      }
    }
  }
];

// Recurring Detection Mode Tools
export const RECURRING_TOOLS: ToolDefinition[] = [
  {
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
  {
    type: "function",
    function: {
      name: "create_recurring_suggestion",
      description: "Create a recurring transaction suggestion for user review.",
      parameters: {
        type: "object",
        properties: {
          merchant: { type: "string" },
          cadence: { type: "string", enum: ["weekly", "biweekly", "monthly", "quarterly", "yearly"] },
          suggested_amount: { type: "number" },
          confidence: { type: "number", description: "Confidence level (0-1)" }
        },
        required: ["merchant", "cadence", "suggested_amount", "confidence"]
      }
    }
  }
];

// Import Mode Tools
export const IMPORT_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_categories",
      description: "Get all available categories for the user.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_merchant_history",
      description: "Check if this merchant exists in past transactions and what category/direction was assigned.",
      parameters: {
        type: "object",
        properties: {
          merchant: { type: "string", description: "The merchant name to look up" }
        },
        required: ["merchant"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "assign_results",
      description: "Assign category and direction for a batch of transactions.",
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
                direction: { type: "string", enum: ["inflow", "outflow"] },
                confidence: { type: "number" },
                source: { type: "string", enum: ["history", "inferred"] }
              },
              required: ["transaction_id", "category", "direction", "confidence", "source"]
            }
          }
        },
        required: ["results"]
      }
    }
  }
];

// Tool selection by mode
export const TOOLS_BY_MODE = {
  qa: QA_TOOLS,
  categorization: CATEGORIZATION_TOOLS,
  recurring: RECURRING_TOOLS,
  import: IMPORT_TOOLS
} as const;

export type AgentMode = keyof typeof TOOLS_BY_MODE;