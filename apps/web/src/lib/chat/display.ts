export const ASSISTANT_PROMPT_PLACEHOLDERS = [
  "Where did most of my spending go this month?",
  "What changed the most in my spending over the last 30 days?",
  "How much did I spend on dining last month?",
  "Which categories are easiest for me to cut back on right now?",
  "Show me the merchants driving my grocery spending."
];

export const ASSISTANT_THINKING_EMOJIS = ["🧠", "🤖", "✨", "🔎", "💭"];

function pickRandomItem(items: string[], randomValue = Math.random()): string {
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(randomValue * items.length)));
  return items[index] || "";
}

export function pickAssistantPromptPlaceholder(randomValue?: number): string {
  return pickRandomItem(ASSISTANT_PROMPT_PLACEHOLDERS, randomValue);
}

export function pickAssistantThinkingEmoji(randomValue?: number): string {
  return pickRandomItem(ASSISTANT_THINKING_EMOJIS, randomValue);
}
