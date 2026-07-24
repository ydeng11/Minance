/**
 * Action execution service for write tool confirmation.
 *
 * This is the ONLY authorized path for executing write tools with
 * _mode: "execute". Routes must call this service, not ToolSpec.execute()
 * directly. The service atomically validates ownership, expiry, stored
 * tool, and exact stored arguments before executing.
 *
 * The pending action store and tool dispatch are module-private —
 * no caller can forge an authorization.
 */

import { storePendingAction, consumePendingActionForOwner, type PendingAction } from "./pending-actions.ts";
import { ALL_TOOLS } from "./tool-spec.ts";

export { storePendingAction };
export type { PendingAction };

/**
 * Execute a confirmed pending action.
 * Atomically consumes the action (owner + conversation validated)
 * and dispatches the stored tool with stored args.
 * Returns { success, data, error, actionId }.
 */
export async function executeConfirmedAction(
  actionId: string,
  userId: string,
  conversationId: string
): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
  actionId: string;
  toolName: string;
}> {
  const action = consumePendingActionForOwner(actionId, userId, conversationId);
  if (!action) {
    return {
      success: false,
      error: "Action not found, expired, or access denied",
      actionId,
      toolName: "unknown"
    };
  }

  // Look up the tool
  const toolSpec = ALL_TOOLS.find((t) => t.name === action.toolName);
  if (!toolSpec) {
    return {
      success: false,
      error: `Tool ${action.toolName} not found`,
      actionId,
      toolName: action.toolName
    };
  }

  // Execute with exact stored args
  try {
    const execArgs = { ...action.args, _mode: "execute" };
    const result = await toolSpec.execute(
      {
        userId,
        conversationId,
        resultCache: new Map(),
        writeAuthorization: { actionId: action.key }
      },
      execArgs
    );
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      actionId,
      toolName: action.toolName
    };
  } catch (err) {
    return {
      success: false,
      error: `Execution failed: ${err instanceof Error ? err.message : String(err)}`,
      actionId,
      toolName: action.toolName
    };
  }
}
