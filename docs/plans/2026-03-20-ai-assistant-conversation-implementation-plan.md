# AI Assistant Conversation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the AI Assistant append messages in chronological order, persist conversation memory across reloads, and let the user manually start a fresh conversation.

**Architecture:** Extend the web assistant client to create and reuse conversation sessions, then move the persistence/retry logic into a small chat helper so the component stays thin. On the backend, update the tool-calling agent so the saved conversation session includes the final assistant reply, which preserves follow-up context for later turns.

**Tech Stack:** TypeScript, Next.js app router, React 19, Tailwind CSS, Node API server, Node test runner (`tsx --test`), pnpm.

---

### Task 1: Add web assistant conversation API contracts

**Files:**
- Modify: `apps/web/src/lib/api/endpoints.ts`
- Modify: `apps/web/src/lib/api/endpoints.test.ts`
- Modify: `apps/web/src/hooks/useApi.ts`

**Step 1: Write the failing test**

Update `apps/web/src/lib/api/endpoints.test.ts` to cover:
- `assistantApi.createConversation()` calling `POST /v1/assistant/conversations`
- `assistantApi.askInConversation()` calling `POST /v1/assistant/conversations/:id/query`

**Step 2: Run test to verify it fails**

Run from `apps/web`:

```bash
env NODE_ENV=test ./node_modules/.bin/tsx --test src/lib/api/endpoints.test.ts
```

Expected: failures because the assistant API client does not expose the conversation endpoints yet.

**Step 3: Write minimal implementation**

- add `assistantApi.createConversation`
- add `assistantApi.askInConversation`
- expose the new methods through `useApi`
- keep the existing single-shot `ask` method untouched for backward compatibility

**Step 4: Run test to verify it passes**

Run from `apps/web`:

```bash
env NODE_ENV=test ./node_modules/.bin/tsx --test src/lib/api/endpoints.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/src/lib/api/endpoints.ts apps/web/src/lib/api/endpoints.test.ts apps/web/src/hooks/useApi.ts
git commit -m "feat: add assistant conversation api client"
```

### Task 2: Add a testable web conversation workflow helper

**Files:**
- Create: `apps/web/src/lib/chat/conversation.ts`
- Create: `apps/web/src/lib/chat/conversation.test.ts`

**Step 1: Write the failing test**

Create `apps/web/src/lib/chat/conversation.test.ts` to cover:
- loading and clearing the stored assistant `conversationId`
- appending new assistant cards at the end of the message list
- trimming the list to the newest 25 entries
- creating a conversation when no `conversationId` exists
- recreating the conversation and retrying once when a conversation query returns `ApiError` with status `404`

**Step 2: Run test to verify it fails**

Run from `apps/web`:

```bash
env NODE_ENV=test ./node_modules/.bin/tsx --test src/lib/chat/conversation.test.ts
```

Expected: failures because the helper module does not exist yet.

**Step 3: Write minimal implementation**

- add a storage key constant for the assistant conversation session
- add helper functions to load, persist, and clear the stored `conversationId`
- add a helper that appends assistant messages chronologically and caps the list at 25
- add a small async workflow helper that:
  - reuses the stored `conversationId` when present
  - creates a conversation when missing
  - retries once after clearing stale state on `404`

**Step 4: Run test to verify it passes**

Run from `apps/web`:

```bash
env NODE_ENV=test ./node_modules/.bin/tsx --test src/lib/chat/conversation.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/src/lib/chat/conversation.ts apps/web/src/lib/chat/conversation.test.ts
git commit -m "feat: add assistant conversation workflow helper"
```

### Task 3: Wire the assistant UI to persistent conversation state

**Files:**
- Modify: `apps/web/src/components/assistant/AssistantConversation.tsx`
- Modify: `apps/web/src/lib/chat/adapter.test.ts`

**Step 1: Write the failing test**

Update `apps/web/src/lib/chat/adapter.test.ts` or extend `apps/web/src/lib/chat/conversation.test.ts` so the expected chat transcript shape reflects chronological append semantics and the reset path returns an empty thread state before the next send.

**Step 2: Run test to verify it fails**

Run from `apps/web`:

```bash
env NODE_ENV=test ./node_modules/.bin/tsx --test src/lib/chat/adapter.test.ts src/lib/chat/conversation.test.ts
```

Expected: failures because the current component still prepends messages and has no reset flow.

**Step 3: Write minimal implementation**

- update `AssistantConversation` to:
  - load the stored conversation ID on the client
  - send questions through the conversation workflow helper
  - append returned messages at the end instead of the beginning
  - auto-scroll the response pane to the bottom after successful sends
  - render a `New conversation` button in page and panel headers
  - clear local messages and stored conversation state when reset is clicked
  - disable reset while a request is in flight

**Step 4: Run test to verify it passes**

Run from `apps/web`:

```bash
env NODE_ENV=test ./node_modules/.bin/tsx --test src/lib/chat/adapter.test.ts src/lib/chat/conversation.test.ts src/lib/api/endpoints.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/src/components/assistant/AssistantConversation.tsx apps/web/src/lib/chat/adapter.test.ts apps/web/src/lib/chat/conversation.test.ts apps/web/src/lib/api/endpoints.test.ts
git commit -m "fix: persist assistant conversations in the web ui"
```

### Task 4: Persist the final assistant reply in backend conversation history

**Files:**
- Modify: `services/api/src/llm/agent.ts`
- Modify: `services/api/test/llm/agent.test.ts`
- Modify: `services/api/test/integration/agent-integration.test.ts`

**Step 1: Write the failing test**

Update the agent tests so a Q&A conversation session asserts that:
- the saved session contains the current user message
- the saved session contains the final assistant answer after a successful response

**Step 2: Run test to verify it fails**

Run from the repo root:

```bash
env NODE_ENV=test ./apps/web/node_modules/.bin/tsx --test services/api/test/llm/agent.test.ts services/api/test/integration/agent-integration.test.ts
```

Expected: failures because the current session update path saves tool history but not the final assistant reply.

**Step 3: Write minimal implementation**

- append the final assistant response to the in-memory message list before saving the conversation session
- keep the saved session free of the system prompt
- preserve existing timeout, tool call, and ownership behavior

**Step 4: Run test to verify it passes**

Run from the repo root:

```bash
env NODE_ENV=test ./apps/web/node_modules/.bin/tsx --test services/api/test/llm/agent.test.ts services/api/test/integration/agent-integration.test.ts
```

**Step 5: Commit**

```bash
git add services/api/src/llm/agent.ts services/api/test/llm/agent.test.ts services/api/test/integration/agent-integration.test.ts
git commit -m "fix: persist assistant session replies"
```

### Task 5: Run focused verification for the assistant fix

**Files:**
- No code changes expected

**Step 1: Run focused frontend tests**

Run:

```bash
cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/lib/api/endpoints.test.ts src/lib/chat/adapter.test.ts src/lib/chat/conversation.test.ts
```

Expected: all focused frontend assistant tests pass.

**Step 2: Run focused backend tests**

Run:

```bash
env NODE_ENV=test ./apps/web/node_modules/.bin/tsx --test services/api/test/llm/agent.test.ts services/api/test/integration/agent-integration.test.ts services/api/test/llm/conversation-store.test.ts
```

Expected: all focused backend conversation tests pass.

**Step 3: Run full regression suite**

Run:

```bash
pnpm test
```

Expected: full repo test suite passes in the worktree.

**Step 4: Commit check**

Run:

```bash
git status --short
```

Confirm only the intended assistant conversation changes remain before final landing steps.
