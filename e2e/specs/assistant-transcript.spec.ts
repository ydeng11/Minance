import { test, expect } from "@playwright/test";
import { loginWithSeedAccount } from "./helpers.ts";

const CONVERSATION_ID_KEY = "minance.assistant.conversationId";
const TRANSCRIPT_KEY = "minance.assistant.transcript";

const SEEDED_MESSAGE = {
  id: "asst_seeded",
  question: "How much did I spend on groceries last month?",
  answer: "You spent $123.45 on groceries last month.",
  summary: "You spent $123.45 on groceries last month.",
  keyPoints: ["Groceries totaled $123.45.", "No unusual grocery spikes were detected."],
  followUp: "Want me to break that down by merchant?",
  highlights: ["Groceries", "$123.45"],
  provider: "openai",
  model: "gpt-4.1-mini",
  drillDownUrl: "/transactions?category=Groceries&range=30d",
  createdAt: "2026-03-21T12:00:00.000Z",
  state: "complete" as const
};

async function seedAssistantTranscript(page) {
  await page.evaluate(({ conversationIdKey, transcriptKey, message }) => {
    localStorage.setItem(conversationIdKey, "conv_seeded");
    localStorage.setItem(transcriptKey, JSON.stringify({
      conversationId: "conv_seeded",
      messages: [message],
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }));
  }, {
    conversationIdKey: CONVERSATION_ID_KEY,
    transcriptKey: TRANSCRIPT_KEY,
    message: SEEDED_MESSAGE
  });
}

test("@core assistant restores transcript after reload and preserves it across close/reopen", async ({ page }) => {
  await loginWithSeedAccount(page);
  await seedAssistantTranscript(page);

  await page.reload();
  await expect(page.getByTestId("app-shell")).toBeVisible();

  await page.getByTestId("assistant-toggle").click();
  await expect(page.getByTestId("assistant-sidebar")).toBeVisible();
  await expect(page.getByTestId("assistant-responses")).toContainText(SEEDED_MESSAGE.question);
  await expect(page.getByTestId("assistant-responses")).toContainText(SEEDED_MESSAGE.answer);

  await page.getByTestId("assistant-close").click();
  await expect(page.getByTestId("assistant-sidebar")).toBeHidden();

  await page.getByTestId("assistant-toggle").click();
  await expect(page.getByTestId("assistant-sidebar")).toBeVisible();
  await expect(page.getByTestId("assistant-responses")).toContainText(SEEDED_MESSAGE.question);
  await expect(page.getByTestId("assistant-responses")).toContainText(SEEDED_MESSAGE.answer);
});

test("@core assistant new conversation clears the persisted transcript", async ({ page }) => {
  await loginWithSeedAccount(page);
  await seedAssistantTranscript(page);

  await page.reload();
  await expect(page.getByTestId("app-shell")).toBeVisible();

  await page.getByTestId("assistant-toggle").click();
  await expect(page.getByTestId("assistant-sidebar")).toBeVisible();
  await expect(page.getByTestId("assistant-responses")).toContainText(SEEDED_MESSAGE.question);

  await page.getByTestId("assistant-new-conversation").click();
  await expect(page.getByTestId("assistant-responses")).toContainText("I'm Minance AI");
  await expect(page.getByTestId("assistant-responses")).not.toContainText(SEEDED_MESSAGE.question);

  await expect.poll(() =>
    page.evaluate(({ conversationIdKey, transcriptKey }) => ({
      conversationId: localStorage.getItem(conversationIdKey),
      transcript: localStorage.getItem(transcriptKey)
    }), {
      conversationIdKey: CONVERSATION_ID_KEY,
      transcriptKey: TRANSCRIPT_KEY
    })
  ).toEqual({
    conversationId: null,
    transcript: null
  });

  await page.getByTestId("assistant-close").click();
  await page.reload();
  await expect(page.getByTestId("app-shell")).toBeVisible();

  await page.getByTestId("assistant-toggle").click();
  await expect(page.getByTestId("assistant-sidebar")).toBeVisible();
  await expect(page.getByTestId("assistant-responses")).toContainText("I'm Minance AI");
  await expect(page.getByTestId("assistant-responses")).not.toContainText(SEEDED_MESSAGE.question);
});
