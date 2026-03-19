// services/api/src/recurring-scan.ts
import { loadStore, saveStore } from "./store.ts";
import { nowIso, normalizeText } from "./utils.ts";

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