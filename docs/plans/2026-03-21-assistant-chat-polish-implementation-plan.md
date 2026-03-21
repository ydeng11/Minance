# Assistant Chat Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the assistant chat feel immediate, lively while waiting, and easier to scan by combining optimistic UI updates with structured assistant responses.

**Architecture:** The web app will add optimistic local message entries, rotating placeholders, and richer assistant card rendering. The API will tighten the synthesis output contract so the UI can reliably show a short summary, key bullets, and highlights while remaining backward compatible with legacy plain-text answers.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Node test runner, `tsx --test`

---

### Task 1: Model structured assistant messages

**Files:**
- Modify: `apps/web/src/lib/chat/adapter.ts`
- Modify: `apps/web/src/lib/chat/adapter.test.ts`

**Step 1: Write the failing test**

Add coverage for mapping a structured assistant result into UI fields and for falling back when only a legacy `answer` string is present.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @minance/web exec tsx --test src/lib/chat/adapter.test.ts`
Expected: FAIL because the adapter does not yet expose structured fields.

**Step 3: Write minimal implementation**

Extend the adapted message shape with optional `summary`, `keyPoints`, and `followUp` fields while preserving the existing answer fallback.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @minance/web exec tsx --test src/lib/chat/adapter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/chat/adapter.ts apps/web/src/lib/chat/adapter.test.ts
git commit -m "feat: model structured assistant messages"
```

### Task 2: Add optimistic assistant conversation helpers

**Files:**
- Modify: `apps/web/src/lib/chat/conversation.ts`
- Modify: `apps/web/src/lib/chat/conversation.test.ts`

**Step 1: Write the failing test**

Add tests for creating pending assistant turns, replacing a pending turn with a server result, and replacing it with an error turn.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @minance/web exec tsx --test src/lib/chat/conversation.test.ts`
Expected: FAIL because the optimistic helper functions do not exist.

**Step 3: Write minimal implementation**

Add pure helpers for optimistic submit state and deterministic replacement by temporary ID.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @minance/web exec tsx --test src/lib/chat/conversation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/chat/conversation.ts apps/web/src/lib/chat/conversation.test.ts
git commit -m "feat: add optimistic assistant conversation helpers"
```

### Task 3: Tighten assistant synthesis output

**Files:**
- Modify: `services/api/src/llm/prompts.ts`
- Modify: `services/api/src/llm/assistant.ts`
- Modify: `apps/web/src/lib/api/types.ts`

**Step 1: Write the failing test**

Add or extend tests around assistant result typing and synthesis parsing so structured fields are expected.

**Step 2: Run test to verify it fails**

Run: `pnpm test services/api/test/**/*.test.ts`
Expected: FAIL because the structured fields are not normalized yet.

**Step 3: Write minimal implementation**

Update the LLM prompt schema to request short structured sections, normalize `summary`, `key_points`, and `follow_up`, and expose them in the shared API types while keeping legacy compatibility.

**Step 4: Run test to verify it passes**

Run: `pnpm test services/api/test/**/*.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/api/src/llm/prompts.ts services/api/src/llm/assistant.ts apps/web/src/lib/api/types.ts
git commit -m "feat: shape assistant responses for chat cards"
```

### Task 4: Update the assistant conversation component

**Files:**
- Modify: `apps/web/src/components/assistant/AssistantConversation.tsx`

**Step 1: Write the failing test**

Add focused web/component coverage for immediate optimistic message display, pending emoji rendering, placeholder rotation, and structured answer sections.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @minance/web test`
Expected: FAIL because the component still waits for the response and renders plain paragraphs.

**Step 3: Write minimal implementation**

Use the new helpers to append optimistic turns, keep a stable random placeholder and pending emoji, replace pending turns in place, and render structured answer sections with graceful legacy fallback.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @minance/web test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/components/assistant/AssistantConversation.tsx
git commit -m "feat: polish assistant chat interaction"
```

### Task 5: Verify the full change

**Files:**
- Modify: `.beans/minance2-tur3--improve-assistant-chat-interface.md`

**Step 1: Run targeted tests**

Run:

```bash
pnpm --filter @minance/web exec tsx --test src/lib/chat/adapter.test.ts
pnpm --filter @minance/web exec tsx --test src/lib/chat/conversation.test.ts
pnpm --filter @minance/web test
```

Expected: PASS

**Step 2: Run repo quality gates**

Run: `just check`
Expected: PASS

**Step 3: Update bean summary**

Mark all checklist items complete and append a `## Summary of Changes` section.

**Step 4: Commit**

```bash
git add .beans/minance2-tur3--improve-assistant-chat-interface.md docs/plans/2026-03-21-assistant-chat-polish-design.md docs/plans/2026-03-21-assistant-chat-polish-implementation-plan.md
git commit -m "docs: record assistant chat polish plan"
```
