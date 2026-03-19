import { loadStore, saveStore, addAuditEvent } from "./store.ts";
import { createId, nowIso, monthKey } from "./utils.ts";
import { createRecurringRule, evaluateRecurringRule } from "./recurrings.ts";

const AMOUNT_TOLERANCE_MIN = 0.10;
const AMOUNT_TOLERANCE_PERCENT = 0.05;
const MAX_TRANSACTION_IDS = 10;
const COOLDOWN_DAYS = 30;

export const DISMISSAL_REASON = {
  USER_DISMISSED: "user_dismissed",
  RULE_DELETED: "rule_deleted"
} as const;

function toAmount(txn: any): number {
  return Math.abs(Number(txn?.amount || 0));
}

function amountMatches(a: number, b: number): boolean {
  const tolerance = Math.max(AMOUNT_TOLERANCE_MIN, a * AMOUNT_TOLERANCE_PERCENT);
  return Math.abs(a - b) <= tolerance;
}

function isCooldownExpired(dismissedAt: string): boolean {
  const dismissedDate = new Date(dismissedAt);
  const expiresAt = new Date(dismissedDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  return new Date() >= expiresAt;
}

interface RecurringSuggestion {
  id: string;
  user_id: string;
  merchant_pattern: string;
  amount: number;
  detected_at: string;
  occurrence_count: number;
  transaction_ids: string[];
}

interface ListRecurringSuggestionsOptions {
  count_only?: boolean;
}

interface ListRecurringSuggestionsResult {
  items?: RecurringSuggestion[];
  count?: number;
}

interface DismissRecurringSuggestionResult {
  dismissed: boolean;
}

export function detectRecurringSuggestions(userId: string): RecurringSuggestion[] {
  const store = loadStore();
  const userTxns = store.transactions.filter(
    (txn) => txn.user_id === userId && !txn.deleted_at
  );

  // Group by (merchant_normalized, amount with tolerance)
  const groups = [];

  for (const txn of userTxns) {
    const merchant = String(txn.merchant_normalized || "").trim().toLowerCase();
    if (!merchant) continue;

    const amount = toAmount(txn);

    // Find existing group with matching merchant and amount within tolerance
    let group = groups.find(g => g.merchant_pattern === merchant && amountMatches(g.amount, amount));

    if (!group) {
      group = {
        merchant_pattern: merchant,
        amount,
        months: new Set(),
        transaction_ids: []
      };
      groups.push(group);
    }

    const month = monthKey(txn.transaction_date);
    if (month) group.months.add(month);

    if (group.transaction_ids.length < MAX_TRANSACTION_IDS) {
      group.transaction_ids.push(txn.id);
    }
  }

  // Filter to those with 2+ distinct months, not already a rule, not dismissed
  const existingRules = (store.recurringRules || [])
    .filter((rule) => rule.user_id === userId);

  const dismissedPatterns = (store.dismissedRecurringSuggestions || [])
    .filter((d) => d.user_id === userId);

  const suggestions = [];
  for (const group of groups) {
    if (group.months.size < 2) continue;

    // Check if there's an existing rule with matching merchant and amount within tolerance
    const hasExistingRule = existingRules.some(rule =>
      String(rule.merchant_pattern || "").toLowerCase() === group.merchant_pattern &&
      amountMatches(Number(rule.amount), group.amount)
    );
    if (hasExistingRule) continue;

    // Check if dismissed (user_dismissed is permanent, rule_deleted has cooldown)
    const dismissedEntry = dismissedPatterns.find(d =>
      String(d.merchant_pattern || "").toLowerCase() === group.merchant_pattern &&
      amountMatches(Number(d.amount), group.amount)
    );
    if (dismissedEntry) {
      // user_dismissed is permanent
      if (dismissedEntry.dismissed_reason === DISMISSAL_REASON.USER_DISMISSED) continue;
      // rule_deleted has cooldown
      if (!isCooldownExpired(dismissedEntry.dismissed_at)) continue;
    }

    suggestions.push({
      id: createId("rsug"),
      user_id: userId,
      merchant_pattern: group.merchant_pattern,
      amount: group.amount,
      detected_at: nowIso(),
      occurrence_count: group.months.size,
      transaction_ids: group.transaction_ids
    });
  }

  // Store suggestions
  store.recurringSuggestions = suggestions;
  saveStore(store);

  return suggestions;
}

export function listRecurringSuggestions(userId: string, options: ListRecurringSuggestionsOptions = {}): ListRecurringSuggestionsResult {
  const store = loadStore();
  const items = (store.recurringSuggestions || [])
    .filter((s) => s.user_id === userId)
    .sort((a, b) => b.occurrence_count - a.occurrence_count);

  if (options.count_only) {
    return { count: items.length };
  }

  return { items };
}

export function dismissRecurringSuggestion(userId: string, suggestionId: string, reason: string = DISMISSAL_REASON.USER_DISMISSED): DismissRecurringSuggestionResult {
  const store = loadStore();
  const suggestion = (store.recurringSuggestions || []).find(
    (s) => s.id === suggestionId && s.user_id === userId
  );

  if (!suggestion) {
    throw new Error("Suggestion not found");
  }

  const dismissedAt = nowIso();
  const cooldownUntil = reason === DISMISSAL_REASON.RULE_DELETED
    ? new Date(Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null;

  store.dismissedRecurringSuggestions.push({
    id: createId("rdis"),
    user_id: userId,
    merchant_pattern: suggestion.merchant_pattern,
    amount: suggestion.amount,
    dismissed_at: dismissedAt,
    dismissed_reason: reason,
    cooldown_until: cooldownUntil
  });

  store.recurringSuggestions = (store.recurringSuggestions || []).filter(
    (s) => s.id !== suggestionId
  );

  saveStore(store);
  addAuditEvent(userId, "recurrings.suggestion.dismiss", { suggestionId, reason });

  return { dismissed: true };
}

interface CreateRuleFromSuggestionOptions {
  name?: string;
  cadence?: string;
}

export function createRuleFromSuggestion(userId: string, suggestionId: string, overrides: CreateRuleFromSuggestionOptions = {}): any {
  const store = loadStore();
  const suggestion = (store.recurringSuggestions || []).find(
    (s) => s.id === suggestionId && s.user_id === userId
  );

  if (!suggestion) {
    throw new Error("Suggestion not found");
  }

  // Create the rule
  const rule = createRecurringRule(userId, {
    name: overrides.name || suggestion.merchant_pattern,
    cadence: overrides.cadence || "monthly",
    amount: suggestion.amount,
    merchant_pattern: suggestion.merchant_pattern
  });

  // Remove suggestion
  store.recurringSuggestions = (store.recurringSuggestions || []).filter(
    (s) => s.id !== suggestionId
  );
  saveStore(store);

  // Link matching transactions
  evaluateRecurringRule(userId, rule.id);

  addAuditEvent(userId, "recurrings.suggestion.create_rule", {
    suggestionId,
    ruleId: rule.id
  });

  return rule;
}