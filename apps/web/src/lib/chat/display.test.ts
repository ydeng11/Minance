import test from "node:test";
import assert from "node:assert/strict";
import {
  ASSISTANT_PROMPT_PLACEHOLDERS,
  ASSISTANT_THINKING_EMOJIS,
  pickAssistantPromptPlaceholder,
  pickAssistantThinkingEmoji
} from "./display";

test("pickAssistantPromptPlaceholder selects a curated prompt example", () => {
  assert.equal(pickAssistantPromptPlaceholder(0), ASSISTANT_PROMPT_PLACEHOLDERS[0]);
  assert.equal(
    pickAssistantPromptPlaceholder(0.999999),
    ASSISTANT_PROMPT_PLACEHOLDERS[ASSISTANT_PROMPT_PLACEHOLDERS.length - 1]
  );
});

test("pickAssistantThinkingEmoji selects a curated thinking emoji", () => {
  assert.equal(pickAssistantThinkingEmoji(0), ASSISTANT_THINKING_EMOJIS[0]);
  assert.equal(
    pickAssistantThinkingEmoji(0.999999),
    ASSISTANT_THINKING_EMOJIS[ASSISTANT_THINKING_EMOJIS.length - 1]
  );
});
