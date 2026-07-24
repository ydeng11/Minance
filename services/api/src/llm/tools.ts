/**
 * Tool definitions for the AI Assistant.
 *
 * This module now derives its schemas from tool-spec.ts (the single source of truth).
 * Legacy exports are maintained for backward compatibility during the migration.
 */

import { ALL_TOOLS, type ToolCategory } from "./tool-spec.ts";
import type { ToolDefinition } from "./client.ts";

// ---------------------------------------------------------------------------
// Helper: group tools by category
// ---------------------------------------------------------------------------

function toolsByCategory(...categories: ToolCategory[]): ToolDefinition[] {
  return ALL_TOOLS
    .filter((t) => categories.includes(t.category))
    .map((t) => t.schema);
}

function toolNamesByCategory(...categories: ToolCategory[]): string[] {
  return ALL_TOOLS
    .filter((t) => categories.includes(t.category))
    .map((t) => t.name);
}

// ---------------------------------------------------------------------------
// Legacy exports — derived from ALL_TOOLS
// ---------------------------------------------------------------------------

export const QA_TOOLS: ToolDefinition[] = toolsByCategory("analytics", "system");
export const CATEGORIZATION_TOOLS: ToolDefinition[] = (() => {
  const names = new Set(["get_categories", "get_merchant_history", "assign_category"]);
  return ALL_TOOLS.filter((t) => names.has(t.name)).map((t) => t.schema);
})();
export const RECURRING_TOOLS: ToolDefinition[] = (() => {
  const names = new Set(["get_merchant_transactions_6_months", "create_recurring_suggestion"]);
  return ALL_TOOLS.filter((t) => names.has(t.name)).map((t) => t.schema);
})();
export const IMPORT_TOOLS: ToolDefinition[] = (() => {
  const names = new Set(["get_categories", "get_merchant_history", "assign_results"]);
  return ALL_TOOLS.filter((t) => names.has(t.name)).map((t) => t.schema);
})();

// Tool selection by mode
export const TOOLS_BY_MODE = {
  qa: QA_TOOLS,
  categorization: CATEGORIZATION_TOOLS,
  recurring: RECURRING_TOOLS,
  import: IMPORT_TOOLS
} as const;

export type AgentMode = keyof typeof TOOLS_BY_MODE;
