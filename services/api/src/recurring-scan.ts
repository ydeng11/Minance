// services/api/src/recurring-scan.ts
import { loadStore, saveStore } from "./store.ts";
import { nowIso, normalizeText } from "./utils.ts";
import { DISMISSAL_REASON } from "./recurring-suggestions.ts";

const AMOUNT_TOLERANCE_MIN = 0.10;
const AMOUNT_TOLERANCE_PERCENT = 0.05;
const COOLDOWN_DAYS = 30;

function amountMatches(a: number, b: number): boolean {
  const tolerance = Math.max(AMOUNT_TOLERANCE_MIN, b * AMOUNT_TOLERANCE_PERCENT);
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

export function incrementUserScanCounter(userId: string): void {
  const store = loadStore();
  let state = store.userRecurringScanState.find(s => s.user_id === userId);

  if (!state) {
    state = {
      user_id: userId,
      last_recurring_scan_at: null,
      transactions_since_scan: 0,
      updated_at: nowIso()
    };
    store.userRecurringScanState.push(state);
  }

  state.transactions_since_scan += 1;
  state.updated_at = nowIso();
  saveStore(store);
}

export function getUserScanState(userId: string): UserRecurringScanState {
  const store = loadStore();
  let state = store.userRecurringScanState.find(s => s.user_id === userId);

  if (!state) {
    state = {
      user_id: userId,
      last_recurring_scan_at: null,
      transactions_since_scan: 0,
      updated_at: nowIso()
    };
    store.userRecurringScanState.push(state);
    saveStore(store);
  }

  return state;
}

export function updateUserScanState(userId: string, updates: Partial<UserRecurringScanState>): void {
  const store = loadStore();
  let state = store.userRecurringScanState.find(s => s.user_id === userId);

  if (!state) {
    state = {
      user_id: userId,
      last_recurring_scan_at: null,
      transactions_since_scan: 0,
      updated_at: nowIso()
    };
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