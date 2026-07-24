/**
 * In-memory store for pending write actions that require user confirmation.
 *
 * When a write tool returns _requiresConfirmation, the agent stores the
 * pending action here with a unique key. On the next user message ("Yes, confirm"),
 * the agent looks up the pending action and executes it.
 *
 * Actions expire after 10 minutes (configurable).
 */

import { createId } from "../utils.ts";

const PENDING_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface PendingAction {
  key: string;
  userId: string;
  conversationId: string;
  toolName: string;
  args: Record<string, unknown>;
  preview: Record<string, unknown>;
  createdAt: number;
}

const store = new Map<string, PendingAction>();

export function storePendingAction(
  userId: string,
  conversationId: string,
  toolName: string,
  args: Record<string, unknown>,
  preview: Record<string, unknown>
): string {
  const key = `pending_${createId("act")}`;
  store.set(key, {
    key,
    userId,
    conversationId,
    toolName,
    args,
    preview,
    createdAt: Date.now()
  });
  return key;
}

export function getPendingAction(key: string): PendingAction | undefined {
  const action = store.get(key);
  if (!action) return undefined;
  if (Date.now() - action.createdAt > PENDING_TTL_MS) {
    store.delete(key);
    return undefined;
  }
  return action;
}

export function consumePendingAction(key: string): PendingAction | undefined {
  const action = getPendingAction(key);
  if (action) store.delete(key);
  return action;
}

export function getPendingActionByConversation(
  userId: string,
  conversationId: string
): PendingAction | undefined {
  const now = Date.now();
  for (const [, action] of store) {
    if (action.userId === userId && action.conversationId === conversationId) {
      if (now - action.createdAt > PENDING_TTL_MS) {
        store.delete(action.key);
        continue;
      }
      return action;
    }
  }
  return undefined;
}

export function clearPendingActions(): void {
  store.clear();
}
