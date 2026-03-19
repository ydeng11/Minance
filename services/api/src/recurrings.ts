import { loadStore, saveStore, addAuditEvent } from "./store.ts";
import { createId, nowIso, normalizeText, parseDate, toDecimal } from "./utils.ts";
import { DISMISSAL_REASON } from "./recurring-suggestions.ts";

const CADENCE_VALUES = new Set(["weekly", "biweekly", "monthly", "quarterly", "yearly"]);
const STATUS_VALUES = new Set(["active", "paused", "archived"]);
const DIRECTION_VALUES = new Set(["outflow", "inflow"]);
const MAX_NAME_LENGTH = 120;
const MAX_PATTERN_LENGTH = 160;
const AMOUNT_TOLERANCE_MIN = 0.10;
const AMOUNT_TOLERANCE_PERCENT = 0.05;

function amountMatchesRule(transactionAmount, ruleAmount) {
  const tolerance = Math.max(AMOUNT_TOLERANCE_MIN, ruleAmount * AMOUNT_TOLERANCE_PERCENT);
  // Use a small epsilon to handle floating point precision issues
  const EPSILON = 0.0001;
  return Math.abs(transactionAmount - ruleAmount) <= tolerance + EPSILON;
}

function hasOwnField(payload, key) {
  return Boolean(payload && typeof payload === "object" && Object.hasOwn(payload, key));
}

function ensureRecurringCollection(store) {
  if (!Array.isArray(store.recurringRules)) {
    store.recurringRules = [];
  }
  return store.recurringRules;
}

function resolveRuleUserId(rule) {
  if (!rule || typeof rule !== "object") {
    return null;
  }
  if (rule.user_id != null && String(rule.user_id).trim() !== "") {
    return String(rule.user_id).trim();
  }
  if (rule.userId != null && String(rule.userId).trim() !== "") {
    return String(rule.userId).trim();
  }
  return null;
}

function normalizeName(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value || value.length > MAX_NAME_LENGTH) {
    throw new Error("Invalid recurring rule name");
  }
  return value;
}

function normalizeCadence(rawValue, fallback = null) {
  if (rawValue == null || String(rawValue).trim() === "") {
    if (fallback) {
      return fallback;
    }
    throw new Error("Invalid recurring cadence");
  }
  const cadence = String(rawValue).trim().toLowerCase();
  if (!CADENCE_VALUES.has(cadence)) {
    throw new Error("Invalid recurring cadence");
  }
  return cadence;
}

function normalizeStatus(rawValue, fallback = "active") {
  if (rawValue == null || String(rawValue).trim() === "") {
    return fallback;
  }
  const status = String(rawValue).trim().toLowerCase();
  if (!STATUS_VALUES.has(status)) {
    throw new Error("Invalid recurring status");
  }
  return status;
}

function normalizeDirection(rawValue, fallback = null) {
  if (rawValue == null || String(rawValue).trim() === "") {
    return fallback;
  }
  const direction = String(rawValue).trim().toLowerCase();
  // Map legacy values
  if (direction === "debit") return "outflow";
  if (direction === "credit") return "inflow";
  if (!DIRECTION_VALUES.has(direction)) {
    throw new Error("Invalid recurring direction");
  }
  return direction;
}

function normalizeAmount(rawValue, fallback = null) {
  if ((rawValue == null || rawValue === "") && fallback != null) {
    return fallback;
  }
  const amount = toDecimal(rawValue);
  if (amount == null || amount <= 0) {
    throw new Error("Invalid recurring amount");
  }
  return Number(amount.toFixed(2));
}

function normalizeOptionalText(rawValue, maxLength = MAX_PATTERN_LENGTH) {
  if (rawValue == null) {
    return null;
  }
  const value = String(rawValue).trim();
  if (!value) {
    return null;
  }
  if (value.length > maxLength) {
    throw new Error("Invalid recurring field");
  }
  return value;
}

function normalizeOptionalDate(rawValue, fallback = null) {
  if (rawValue == null || String(rawValue).trim() === "") {
    return fallback;
  }
  const date = parseDate(rawValue);
  if (!date) {
    throw new Error("Invalid recurring date");
  }
  return date;
}

function normalizeLinkedTransactionIds(rawValue) {
  if (!Array.isArray(rawValue)) {
    return [];
  }
  const out = [];
  const seen = new Set();
  for (const entry of rawValue) {
    const id = String(entry || "").trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

function normalizeRuleInput(payload = {}, { partial = false } = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const normalized = {};

  if (!partial || hasOwnField(source, "name")) {
    normalized.name = normalizeName(source.name);
  }

  if (!partial || hasOwnField(source, "cadence")) {
    normalized.cadence = normalizeCadence(source.cadence);
  }

  if (!partial || hasOwnField(source, "amount")) {
    normalized.amount = normalizeAmount(source.amount);
  }

  if (hasOwnField(source, "direction") || !partial) {
    normalized.direction = normalizeDirection(source.direction, null);
  }

  if (hasOwnField(source, "category_final") || hasOwnField(source, "category") || !partial) {
    normalized.category_final = normalizeOptionalText(
      source.category_final ?? source.category,
      MAX_NAME_LENGTH
    );
  }

  if (hasOwnField(source, "account_id") || hasOwnField(source, "accountId") || !partial) {
    normalized.account_id = normalizeOptionalText(source.account_id ?? source.accountId, MAX_PATTERN_LENGTH);
  }

  if (hasOwnField(source, "merchant_pattern") || hasOwnField(source, "merchantPattern") || !partial) {
    normalized.merchant_pattern = normalizeOptionalText(
      source.merchant_pattern ?? source.merchantPattern,
      MAX_PATTERN_LENGTH
    );
  }

  if (hasOwnField(source, "status") || !partial) {
    normalized.status = normalizeStatus(source.status, "active");
  }

  if (hasOwnField(source, "next_run_at") || hasOwnField(source, "nextRunAt") || !partial) {
    normalized.next_run_at = normalizeOptionalDate(source.next_run_at ?? source.nextRunAt, null);
  }

  return normalized;
}

function normalizeStoredRule(rule) {
  const userId = resolveRuleUserId(rule);
  if (!userId) {
    throw new Error("Invalid recurring rule user");
  }

  const id = String(rule.id || "").trim();
  if (!id) {
    throw new Error("Invalid recurring rule id");
  }

  const cadence = normalizeCadence(rule.cadence, "monthly");
  const amount = normalizeAmount(rule.amount, 0.01);
  const name = normalizeName(rule.name || id);
  const status = normalizeStatus(rule.status, "active");

  return {
    id,
    user_id: userId,
    name,
    cadence,
    amount,
    direction: normalizeDirection(rule.direction, null),
    category_final: normalizeOptionalText(rule.category_final ?? rule.category, MAX_NAME_LENGTH),
    account_id: normalizeOptionalText(rule.account_id ?? rule.accountId, MAX_PATTERN_LENGTH),
    merchant_pattern: normalizeOptionalText(rule.merchant_pattern ?? rule.merchantPattern, MAX_PATTERN_LENGTH),
    status,
    next_run_at: normalizeOptionalDate(rule.next_run_at ?? rule.nextRunAt, null),
    linked_transaction_ids: normalizeLinkedTransactionIds(rule.linked_transaction_ids),
    linked_transaction_count: normalizeLinkedTransactionIds(rule.linked_transaction_ids).length,
    last_evaluated_at: normalizeOptionalText(rule.last_evaluated_at ?? rule.lastEvaluatedAt, MAX_PATTERN_LENGTH),
    created_at: String(rule.created_at ?? rule.createdAt ?? nowIso()),
    updated_at: String(rule.updated_at ?? rule.updatedAt ?? nowIso())
  };
}

function normalizeStoredRuleSafe(rule) {
  try {
    return normalizeStoredRule(rule);
  } catch {
    return null;
  }
}

function applyNormalizedRule(target, normalized) {
  Object.assign(target, {
    user_id: normalized.user_id,
    name: normalized.name,
    cadence: normalized.cadence,
    amount: normalized.amount,
    direction: normalized.direction,
    category_final: normalized.category_final,
    account_id: normalized.account_id,
    merchant_pattern: normalized.merchant_pattern,
    status: normalized.status,
    next_run_at: normalized.next_run_at,
    linked_transaction_ids: normalized.linked_transaction_ids,
    last_evaluated_at: normalized.last_evaluated_at,
    created_at: normalized.created_at,
    updated_at: normalized.updated_at
  });
}

function findRuleRecord(store, userId, ruleId) {
  const rules = ensureRecurringCollection(store);
  const index = rules.findIndex(
    (entry) => resolveRuleUserId(entry) === userId && String(entry.id || "").trim() === ruleId
  );
  if (index < 0) {
    throw new Error("Recurring rule not found");
  }
  return {
    rules,
    index,
    record: rules[index]
  };
}

function addMonths(dateText, months) {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function computeNextRunDate(baseDate, cadence) {
  const date = parseDate(baseDate || nowIso().slice(0, 10));
  if (!date) {
    return nowIso().slice(0, 10);
  }

  if (cadence === "weekly") {
    return addDays(date, 7);
  }
  if (cadence === "biweekly") {
    return addDays(date, 14);
  }
  if (cadence === "monthly") {
    return addMonths(date, 1);
  }
  if (cadence === "quarterly") {
    return addMonths(date, 3);
  }
  if (cadence === "yearly") {
    return addMonths(date, 12);
  }

  return addMonths(date, 1);
}

export function transactionMatchesRule(transaction, rule) {
  if (transaction.deleted_at) {
    return false;
  }

  if (rule.direction && transaction.direction !== rule.direction) {
    return false;
  }

  if (rule.account_id && transaction.account_id !== rule.account_id) {
    return false;
  }

  if (rule.category_final) {
    const ruleCategory = normalizeText(rule.category_final);
    const transactionCategory = normalizeText(transaction.category_final || "");
    if (!transactionCategory || ruleCategory !== transactionCategory) {
      return false;
    }
  }

  if (!amountMatchesRule(Math.abs(Number(transaction.amount || 0)), rule.amount)) {
    return false;
  }

  if (rule.merchant_pattern) {
    const pattern = normalizeText(rule.merchant_pattern);
    const haystack = normalizeText(`${transaction.merchant_raw || ""} ${transaction.description || ""}`);
    if (!haystack.includes(pattern)) {
      return false;
    }
  }

  return true;
}

function inDateRange(transactionDate, start, end) {
  const value = parseDate(transactionDate);
  if (!value) {
    return false;
  }
  if (start && value < start) {
    return false;
  }
  if (end && value > end) {
    return false;
  }
  return true;
}

function summarizeMatch(transaction) {
  return {
    id: transaction.id,
    transaction_date: transaction.transaction_date,
    merchant_raw: transaction.merchant_raw,
    amount: transaction.amount,
    direction: transaction.direction,
    account_id: transaction.account_id,
    category_final: transaction.category_final,
    recurring_rule_id: transaction.recurring_rule_id || null
  };
}

export function listRecurringRules(userId, options = {}) {
  const store = loadStore();
  const statusFilter = options.status ? normalizeStatus(options.status, "active") : null;

  const items = ensureRecurringCollection(store)
    .map(normalizeStoredRuleSafe)
    .filter(Boolean)
    .filter((entry) => entry.user_id === userId)
    .filter((entry) => (statusFilter ? entry.status === statusFilter : true))
    .sort((left, right) => {
      if (left.status === right.status) {
        return left.name.localeCompare(right.name);
      }
      return left.status.localeCompare(right.status);
    });

  return {
    items
  };
}

export function getRecurringRule(userId, ruleId) {
  const store = loadStore();
  const { record } = findRuleRecord(store, userId, ruleId);
  return normalizeStoredRule(record);
}

export function createRecurringRule(userId, payload) {
  const store = loadStore();
  const rules = ensureRecurringCollection(store);
  const input = normalizeRuleInput(payload, { partial: false });
  const currentTimestamp = nowIso();
  const nextRunAt = input.next_run_at || computeNextRunDate(currentTimestamp.slice(0, 10), input.cadence);

  const created = {
    id: createId("rrule"),
    user_id: userId,
    name: input.name,
    cadence: input.cadence,
    amount: input.amount,
    direction: input.direction,
    category_final: input.category_final,
    account_id: input.account_id,
    merchant_pattern: input.merchant_pattern,
    status: input.status,
    next_run_at: nextRunAt,
    linked_transaction_ids: [],
    last_evaluated_at: null,
    created_at: currentTimestamp,
    updated_at: currentTimestamp
  };

  rules.push(created);
  saveStore(store);
  addAuditEvent(userId, "recurrings.rule.create", { ruleId: created.id });
  return normalizeStoredRule(created);
}

export function updateRecurringRule(userId, ruleId, payload) {
  const store = loadStore();
  const { record } = findRuleRecord(store, userId, ruleId);
  const current = normalizeStoredRule(record);
  const patch = normalizeRuleInput(payload, { partial: true });

  const merged = {
    ...current,
    ...patch,
    next_run_at: patch.next_run_at ?? current.next_run_at,
    updated_at: nowIso()
  };

  applyNormalizedRule(record, merged);
  saveStore(store);
  addAuditEvent(userId, "recurrings.rule.update", { ruleId });
  return normalizeStoredRule(record);
}

export function deleteRecurringRule(userId, ruleId) {
  const store = loadStore();
  const { rules, index, record } = findRuleRecord(store, userId, ruleId);

  let detachedCount = 0;
  for (const transaction of store.transactions || []) {
    if (transaction.user_id !== userId) {
      continue;
    }
    if (transaction.recurring_rule_id === ruleId) {
      transaction.recurring_rule_id = null;
      transaction.updated_at = nowIso();
      detachedCount += 1;
    }
  }

  rules.splice(index, 1);

  // Add entry to dismissed registry with 30-day cooldown
  const dismissedEntry = {
    id: createId("rdis"),
    user_id: userId,
    merchant_pattern: record.merchant_pattern,
    amount: record.amount,
    dismissed_at: nowIso(),
    dismissed_reason: DISMISSAL_REASON.RULE_DELETED,
    cooldown_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  if (!Array.isArray(store.dismissedRecurringSuggestions)) {
    store.dismissedRecurringSuggestions = [];
  }
  store.dismissedRecurringSuggestions.push(dismissedEntry);

  saveStore(store);
  addAuditEvent(userId, "recurrings.rule.delete", {
    ruleId,
    detachedCount
  });

  return {
    deleted: true,
    detached_count: detachedCount
  };
}

export function evaluateRecurringRule(userId, ruleId, options = {}) {
  const store = loadStore();
  const { record } = findRuleRecord(store, userId, ruleId);
  const rule = normalizeStoredRule(record);

  if (rule.status === "archived") {
    throw new Error("Archived recurring rules cannot be evaluated");
  }

  const start = normalizeOptionalDate(options.start, null);
  const end = normalizeOptionalDate(options.end, null);

  const transactions = (store.transactions || [])
    .filter((entry) => entry.user_id === userId)
    .filter((entry) => inDateRange(entry.transaction_date, start, end));

  const matches = transactions
    .filter((transaction) => transactionMatchesRule(transaction, rule))
    .sort((left, right) => {
      if (left.transaction_date === right.transaction_date) {
        return String(left.id).localeCompare(String(right.id));
      }
      return left.transaction_date.localeCompare(right.transaction_date);
    });

  const matchedIds = new Set(matches.map((entry) => entry.id));
  const currentTimestamp = nowIso();

  let attachedCount = 0;
  let detachedCount = 0;

  for (const transaction of transactions) {
    if (matchedIds.has(transaction.id)) {
      if (transaction.recurring_rule_id !== ruleId) {
        transaction.recurring_rule_id = ruleId;
        transaction.updated_at = currentTimestamp;
        attachedCount += 1;
      }
      continue;
    }

    if (transaction.recurring_rule_id === ruleId) {
      transaction.recurring_rule_id = null;
      transaction.updated_at = currentTimestamp;
      detachedCount += 1;
    }
  }

  const latestMatchDate = matches.length
    ? matches[matches.length - 1].transaction_date
    : rule.next_run_at || currentTimestamp.slice(0, 10);

  applyNormalizedRule(record, {
    ...rule,
    linked_transaction_ids: Array.from(matchedIds),
    linked_transaction_count: matchedIds.size,
    last_evaluated_at: currentTimestamp,
    next_run_at: computeNextRunDate(latestMatchDate, rule.cadence),
    updated_at: currentTimestamp
  });

  saveStore(store);
  addAuditEvent(userId, "recurrings.rule.evaluate", {
    ruleId,
    matches: matches.length,
    attachedCount,
    detachedCount
  });

  return {
    rule: normalizeStoredRule(record),
    matches: matches.map(summarizeMatch),
    match_count: matches.length,
    attached_count: attachedCount,
    detached_count: detachedCount,
    linked_transaction_ids: Array.from(matchedIds)
  };
}
