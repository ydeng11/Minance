# AI Assistant Conversation Design

## Scope

Improve the AI Assistant so the conversation reads in chronological order, follow-up instructions persist across reloads, and users can manually reset assistant memory with a `New conversation` action.

## Goals

- Show the newest assistant turn at the bottom of the conversation.
- Persist assistant conversation context across page refreshes and sidebar reopen events.
- Reuse backend conversation sessions so follow-up instructions affect later answers.
- Give the user a clear way to start over and discard prior assistant context.
- Keep the fix narrow to the current web assistant and tool-calling agent flow.

## Non-Goals

- Build a full conversation history browser or multi-thread inbox for assistant chats.
- Add long-term server-side archival of assistant conversations beyond the existing session store.
- Redesign the assistant visual language beyond the new reset control and chronological rendering.
- Replace the current model/provider selection strategy.

## Decisions

### 1. Persist the active conversation ID in the browser

The backend already exposes conversation endpoints. The simplest reliable fix is to let the client own the active `conversationId`, store it locally, and reuse it for future assistant turns.

### 2. Keep one active assistant thread per browser context

This bug only requires a persistent active thread plus a manual reset. We do not need conversation switching, thread lists, or server-side "latest conversation" lookup.

### 3. Append turns and auto-scroll to the latest response

The current UI prepends new responses, which makes the assistant read backwards. New turns should append to the message list, and the scroll container should snap to the bottom when a send completes so the latest answer stays visible.

### 4. Expose a manual `New conversation` action

Persistent memory is useful only if the user can explicitly reset it. The assistant header should include a `New conversation` button that clears local messages, drops the stored `conversationId`, and starts fresh on the next question.

### 5. Persist the final assistant turn in the backend session

The current agent stores tool activity but does not reliably write the final assistant answer into the saved conversation history. That weakens later follow-up turns even when a `conversationId` is present. The saved session should include the complete turn, including the final assistant reply.

## Architecture

### Frontend

- Extend the web assistant API client to create conversations and send questions to conversation-specific endpoints.
- Store the active assistant `conversationId` in browser storage so it survives reloads.
- Append messages in chronological order in `AssistantConversation`.
- Add a `New conversation` button to both page and panel headers.
- Recreate the conversation automatically when a stored session has expired or no longer exists.

### API

- Continue using the existing assistant conversation endpoints in `services/api/src/server.ts`.
- Preserve the complete assistant turn in the in-memory conversation store by saving the final assistant response into session history.
- Keep the current ownership and expiration rules in place.

### State Model

- `conversationId`: persisted in local storage and reused for sends.
- `messages`: in-memory chronological UI state for the current browser session.
- `isLoading`: blocks duplicate sends and temporarily disables `New conversation`.
- server session history: stores prior user/tool/assistant messages for follow-up prompts.

## Data Flow

1. User opens the assistant and types a question.
2. The client loads the persisted `conversationId` if one exists.
3. If no `conversationId` exists, the client creates one through `/v1/assistant/conversations`.
4. The client sends the question to `/v1/assistant/conversations/:id/query`.
5. The backend agent runs tools, returns an answer, and saves the full turn to the conversation session.
6. The client appends the returned assistant card to the bottom of the conversation and scrolls to the latest turn.
7. On refresh or reopen, the client keeps using the same `conversationId` until the user chooses `New conversation` or the session expires.
8. If the stored conversation is missing or expired, the client transparently creates a fresh conversation and retries once.

## Error Handling

- Empty questions continue to short-circuit in the client.
- If a conversation query returns `404`, the client should clear the stale `conversationId`, create a fresh conversation, and retry the request once.
- If the retry still fails, surface the existing assistant error message behavior.
- While a request is in flight, disable the reset button to avoid mixing old responses into a new thread.

## Testing Strategy

- Frontend API unit tests for conversation creation and conversation query request paths.
- Frontend assistant UI tests for chronological ordering, persisted conversation ID behavior, and manual reset behavior.
- Backend agent tests that confirm the final assistant response is saved into conversation history.
- Focused integration coverage for follow-up conversation flows.

## Risks

- Local browser storage can hold a stale `conversationId` after server-side expiry.
  Mitigation: treat `404` as recoverable by recreating the conversation and retrying once.

- Persisting only the conversation ID means messages do not automatically repopulate after refresh.
  Mitigation: this is acceptable for the current bug because the key requirement is preserved model context, not historical transcript restoration.

- Resetting the conversation mid-request could interleave responses across threads.
  Mitigation: disable `New conversation` while a request is pending.
