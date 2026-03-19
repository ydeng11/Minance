import { loadStore, saveStore } from "../store.ts";
import { nowIso } from "../utils.ts";

export function migrateRecurringScanState(): void {
  const store = loadStore();

  // Skip if already migrated
  if (store.userRecurringScanState.length > 0) {
    return;
  }

  // Get all users
  const users = store.users || [];

  for (const user of users) {
    // Count non-deleted transactions for this user
    const txCount = (store.transactions || []).filter(t =>
      t.user_id === user.id && !t.deleted_at
    ).length;

    store.userRecurringScanState.push({
      user_id: user.id,
      last_recurring_scan_at: null,
      transactions_since_scan: txCount,
      updated_at: nowIso()
    });
  }

  saveStore(store);
}