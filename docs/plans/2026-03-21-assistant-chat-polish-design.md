# Assistant Chat Polish Design

## Scope

Improve the assistant chat experience so user messages appear immediately after submit, waiting on the AI feels active instead of stalled, prompt placeholders rotate through curated examples, and assistant responses are easier to scan.

## Goals

- Append the user's message to the conversation immediately after pressing Enter or clicking send.
- Show an in-thread pending assistant card with a stable random emoji and `Thinking...` state while the response is in flight.
- Rotate the input placeholder from a curated list without changing it mid-typing.
- Render assistant answers with clearer hierarchy, shorter summary text, scannable bullets, and visible highlights.
- Preserve compatibility with older assistant responses that only contain a plain answer string.

## Non-Goals

- Add streaming token-by-token responses.
- Introduce markdown rendering for arbitrary assistant output.
- Redesign unrelated assistant routes, conversation persistence, or provider settings.
- Add new backend dependencies or new persistence storage for placeholders.

## Decisions

### 1. Use optimistic local conversation entries

The client should append both the user turn and a temporary assistant placeholder immediately on submit. When the server response arrives, the placeholder entry should be replaced in place. This keeps the chat feeling responsive without waiting for the network round-trip.

### 2. Keep the loading state inside the conversation thread

The send button can still disable during the request, but the main feedback should move into the message list. A pending assistant card with a stable random emoji and subtle animation makes the delay feel intentional and readable in both page and panel layouts.

### 3. Rotate placeholders from a curated client-side list

Prompt placeholders should come from a short list of assistant example questions. The component should pick a placeholder when it mounts and after successful sends or resets, but never reroll while the user is actively typing.

### 4. Add structured answer sections without requiring markdown

Assistant replies should render as structured UI data instead of one long paragraph. The preferred response shape is:

- `summary`: one short answer-first sentence
- `keyPoints`: two to four concise bullet items
- `highlights`: short chips for notable categories or facts
- `followUp`: optional next-step guidance

If a response only includes the legacy `answer` string, the UI should still render it cleanly.

### 5. Tighten the backend synthesis contract

The synthesis prompt should ask for short structured JSON, not a single prose block. The backend should keep numeric fidelity with deterministic results while returning the new optional fields. This makes the UI presentation more consistent and reduces overlong responses before they reach the browser.

## Architecture

### Frontend

- Extend the assistant message adapter to support pending and fulfilled assistant message variants.
- Add helper logic for placeholder selection and stable pending emoji choice.
- Update `AssistantConversation` to insert optimistic pending turns, replace them on success, and show a compact inline error state on failure.
- Render summary, bullet points, follow-up text, and highlight chips with stronger spacing and typography.

### API

- Expand the assistant synthesis prompt schema to return `summary`, `key_points`, `follow_up`, `highlights`, and drill-down filters.
- Normalize the structured result in the synthesis layer and continue falling back safely if the LLM omits optional fields.
- Preserve existing response fields so older callers remain compatible while the web UI adopts the richer structure.

## Data Flow

1. User submits a question.
2. The client appends the user turn immediately.
3. The client appends a pending assistant turn with a generated local ID and random emoji.
4. The client sends the request to the existing conversation endpoint.
5. The backend returns a structured assistant result.
6. The client replaces the matching pending turn with the final assistant card.
7. On error, the client replaces the pending turn with an error card and leaves the user's submitted question visible.
8. After success or reset, the client rotates to a new placeholder example.

## Error Handling

- Empty questions still short-circuit before appending anything.
- Failed requests should replace the pending assistant turn with a readable inline error message instead of showing only a global banner.
- The global status banner can remain for reset/new-conversation confirmation, but request-specific failures should stay attached to the failed turn.
- Legacy responses without structured sections should fall back to the existing single-answer rendering path.

## Testing Strategy

- Unit tests for placeholder selection behavior and optimistic pending message replacement.
- Adapter tests for structured response parsing and legacy fallbacks.
- Conversation state tests for optimistic append, in-place replacement, and failure replacement.
- Focused component tests for the pending UI, placeholder rotation, and structured answer rendering.

## Risks

- More aggressive prompt shaping could over-constrain the assistant and make some answers feel too terse.
  Mitigation: keep `summary` plus optional `keyPoints` and `followUp` instead of forcing every section.

- Optimistic local messages can drift from server state if replacement matching is wrong.
  Mitigation: use explicit temporary IDs for pending turns and replace by ID.

- Randomized placeholders or emojis can create visual noise if they change too often.
  Mitigation: keep choices curated and stable for the lifetime of each pending turn or input cycle.
