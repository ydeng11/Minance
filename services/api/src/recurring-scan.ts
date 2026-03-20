// services/api/src/recurring-scan.ts
import { loadStore, saveStore } from "./store.ts";
import { nowIso, normalizeText, createId } from "./utils.ts";
import { DISMISSAL_REASON } from "./recurring-suggestions.ts";
import { resolveProviderForFeature } from "./ai.ts";
import { detectRecurringPatternsWithLlm } from "./llm/recurring-detection.ts";

const AMOUNT_TOLERANCE_MIN = 0.10;
const AMOUNT_TOLERANCE_PERCENT = 0.05;
const COOLDOWN_DAYS = 30;
const USER_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per user

function amountMatches(a: number, b: number): boolean {
  // Use 'a' as reference amount (consistent with recurring-suggestions.ts)
  const tolerance = Math.max(AMOUNT_TOLERANCE_MIN, a * AMOUNT_TOLERANCE_PERCENT);
  const EPSILON = 0.0001;
  return Math.abs(a - b) <= tolerance + EPSILON;
}

function isCooldownExpired(dismissedAt: string): boolean {
  const dismissedDate = new Date(dismissedAt);
  const expiresAt = new Date(dismissedDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  return new Date() >= expiresAt;
}

export interface UserRecurringScanState {
  user_id: string;
  last_recurring_scan_at: string | null;
  transactions_since_scan: number;
  updated_at: string;
}

function createDefaultScanState(userId: string): UserRecurringScanState {
  return {
    user_id: userId,
    last_recurring_scan_at: null,
    transactions_since_scan: 0,
    updated_at: nowIso()
  };
}

export function incrementUserScanCounter(userId: string, count: number = 1): void {
  const store = loadStore();
  let state = store.userRecurringScanState.find(s => s.user_id === userId);

  if (!state) {
    state = createDefaultScanState(userId);
    store.userRecurringScanState.push(state);
  }

  state.transactions_since_scan += count;
  state.updated_at = nowIso();
  saveStore(store);
}

export function getUserScanState(userId: string): UserRecurringScanState {
  const store = loadStore();
  let state = store.userRecurringScanState.find(s => s.user_id === userId);

  if (!state) {
    state = createDefaultScanState(userId);
    store.userRecurringScanState.push(state);
    saveStore(store);
  }

  return state;
}

export function updateUserScanState(userId: string, updates: Partial<UserRecurringScanState>): void {
  const store = loadStore();
  let state = store.userRecurringScanState.find(s => s.user_id === userId);

  if (!state) {
    state = createDefaultScanState(userId);
    store.userRecurringScanState.push(state);
  }

  Object.assign(state, updates, { updated_at: nowIso() });
  saveStore(store);
}

export function getAdaptiveThreshold(daysSinceScan: number): number {
  if (daysSinceScan >= 30) return 1;
  if (daysSinceScan >= 7) return 3;
  return 5;
}

export function daysBetween(date1: string | null, date2: string): number {
  if (!date1) return Infinity;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function subMonths(date: string, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export function getUsersWithPendingScans(): UserRecurringScanState[] {
  const store = loadStore();
  return store.userRecurringScanState.filter(u => u.transactions_since_scan > 0);
}

export function getMerchantsWithNewTransactions(userId: string): string[] {
  const store = loadStore();
  const state = getUserScanState(userId);
  const since = state.last_recurring_scan_at;

  const txns = store.transactions.filter(t =>
    t.user_id === userId &&
    !t.deleted_at &&
    t.merchant_normalized &&
    (since === null || t.created_at > since)
  );

  return [...new Set(txns.map(t => t.merchant_normalized).filter(Boolean))];
}

export function getMerchantTransactions(userId: string, merchant: string, options: { months: number }): any[] {
  const store = loadStore();
  const cutoff = subMonths(nowIso().slice(0, 10), options.months);

  return store.transactions.filter(t =>
    t.user_id === userId &&
    !t.deleted_at &&
    normalizeText(t.merchant_normalized) === normalizeText(merchant) &&
    t.transaction_date >= cutoff
  );
}

export function existingRuleMatches(userId: string, merchant: string, amount: number): boolean {
  const store = loadStore();
  const rules = store.recurringRules.filter(r => r.user_id === userId);
  const dismissed = store.dismissedRecurringSuggestions.filter(d => d.user_id === userId);

  // Check for existing rule
  const hasRule = rules.some(r =>
    normalizeText(r.merchant_pattern || "") === normalizeText(merchant) &&
    amountMatches(amount, r.amount)
  );
  if (hasRule) return true;

  // Check for permanent dismissal
  const permanentlyDismissed = dismissed.some(d =>
    normalizeText(d.merchant_pattern || "") === normalizeText(merchant) &&
    amountMatches(amount, d.amount) &&
    d.dismissed_reason === DISMISSAL_REASON.USER_DISMISSED
  );
  if (permanentlyDismissed) return true;

  // Check for cooldown dismissal
  const cooldownDismissed = dismissed.some(d =>
    normalizeText(d.merchant_pattern || "") === normalizeText(merchant) &&
    amountMatches(amount, d.amount) &&
    d.dismissed_reason === DISMISSAL_REASON.RULE_DELETED &&
    !isCooldownExpired(d.dismissed_at)
  );
  if (cooldownDismissed) return true;

  return false;
}

export function hasAiSetup(userId: string): boolean {
  const result = resolveProviderForFeature(userId, "recurring_detection");
  return result.ok === true;
}

function getMatchingTransactionIds(userId: string, merchant: string, amount: number): string[] {
  const store = loadStore();
  const txns = store.transactions.filter(t =>
    t.user_id === userId &&
    !t.deleted_at &&
    normalizeText(t.merchant_normalized || "") === normalizeText(merchant) &&
    amountMatches(Math.abs(t.amount), amount)
  );
  return txns.map(t => t.id);
}

function createSuggestion(userId: string, merchant: string, amount: number): void {
  const store = loadStore();
  const matchingTxns = getMatchingTransactionIds(userId, merchant, amount);

  const suggestion = {
    id: createId("rsug"),
    user_id: userId,
    merchant_pattern: merchant,
    amount,
    detected_at: nowIso(),
    occurrence_count: matchingTxns.length,
    transaction_ids: matchingTxns.slice(0, 10)
  };

  if (!Array.isArray(store.recurringSuggestions)) {
    store.recurringSuggestions = [];
  }
  store.recurringSuggestions.push(suggestion);
  saveStore(store);
}

export async function runRecurringDetectionTask(): Promise<{
  users_scanned: number;
  merchants_analyzed: number;
  suggestions_created: number;
}> {
  const store = loadStore();

  // Check overlap protection
  if (store.scanRunState.is_running) {
    console.log("[recurring-scan] Already running, skipping");
    return { users_scanned: 0, merchants_analyzed: 0, suggestions_created: 0 };
  }

  store.scanRunState.is_running = true;
  const startTime = Date.now();
  let runStatus: "success" | "partial" | "failed" = "success";
  let merchantsAnalyzed = 0;
  let suggestionsCreated = 0;
  let usersScanned = 0;

  try {
    const users = getUsersWithPendingScans();

    for (const user of users) {
      const userStartTime = Date.now();
      const daysSinceScan = daysBetween(user.last_recurring_scan_at, nowIso());
      const threshold = getAdaptiveThreshold(daysSinceScan);
      let userTimedOut = false;

      // Skip if not enough new transactions
      if (user.transactions_since_scan < threshold) {
        continue;
      }

      // Check AI setup
      if (!hasAiSetup(user.user_id)) {
        continue;
      }

      usersScanned++;

      // Get merchants with new transactions
      const newMerchants = getMerchantsWithNewTransactions(user.user_id);

      for (const merchant of newMerchants) {
        // Check per-user timeout
        if (Date.now() - userStartTime > USER_TIMEOUT_MS) {
          console.log(`[recurring-scan] User ${user.user_id} timeout, skipping remaining merchants`);
          runStatus = "partial";
          userTimedOut = true;
          break;
        }

        // Pull 6-month history
        const history = getMerchantTransactions(user.user_id, merchant, { months: 6 });

        // Skip if fewer than 2 transactions OR fewer than 2 distinct months
        const distinctMonths = new Set(history.map(t => t.transaction_date.slice(0, 7)));
        if (history.length < 2 || distinctMonths.size < 2) {
          continue;
        }

        merchantsAnalyzed++;

        // LLM detection
        const result = await detectRecurringPatternsWithLlm({
          userId: user.user_id,
          merchant,
          transactions: history
        });

        if (!result.ok) {
          console.log(`[recurring-scan] LLM failed for ${merchant}: ${result.error}`);
          runStatus = "partial";
          continue;
        }

        // Create suggestions for detected patterns
        for (const pattern of result.patterns.filter(p => p.is_recurring)) {
          if (!existingRuleMatches(user.user_id, merchant, pattern.amount)) {
            createSuggestion(user.user_id, merchant, pattern.amount);
            suggestionsCreated++;
          }
        }
      }

      // Reset scan state - only reset counter if user didn't timeout
      // On timeout, keep the counter so remaining merchants get processed next run
      updateUserScanState(user.user_id, {
        last_recurring_scan_at: nowIso(),
        transactions_since_scan: userTimedOut ? user.transactions_since_scan : 0
      });
    }

    return { users_scanned: usersScanned, merchants_analyzed: merchantsAnalyzed, suggestions_created: suggestionsCreated };
  } catch (error: any) {
    console.log(`[recurring-scan] Scan failed: ${error.message}`);
    runStatus = "failed";
    return { users_scanned: usersScanned, merchants_analyzed: merchantsAnalyzed, suggestions_created: suggestionsCreated };
  } finally {
    const finalStore = loadStore();
    finalStore.scanRunState.is_running = false;
    finalStore.scanRunState.last_run_at = nowIso();
    finalStore.scanRunState.last_run_status = runStatus;
    finalStore.scanRunState.last_run_duration_ms = Date.now() - startTime;
    saveStore(finalStore);
  }
}