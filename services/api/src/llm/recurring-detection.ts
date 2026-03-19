import { runStructuredLlm } from "./client.ts";
import { requireAiFeature } from "../ai.ts";

const VALID_CADENCES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];

export interface RecurringPattern {
  is_recurring: boolean;
  amount: number;
  cadence: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
}

const SYSTEM_PROMPT = `You analyze transaction history to detect recurring spending patterns.
Return JSON only.
Output schema:
{
  "patterns": [
    { "is_recurring": boolean, "amount": number, "cadence": "weekly"|"biweekly"|"monthly"|"quarterly"|"yearly" }
  ]
}

Rules:
- A pattern is recurring if transactions appear consistently at regular intervals across at least 2 distinct months.
- Multiple patterns can exist for the same merchant (e.g., phone bill at $80/mo, internet at $60/mo).
- Group transactions by similar amounts (within ~5%) when detecting patterns.
- If no recurring pattern exists, return empty patterns array.
- Prefer the most common/recent amount for each pattern.`;

export function formatTransactionsForLlm(transactions: any[]): string {
  return transactions
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    .slice(0, 50)
    .map(t => `- ${t.transaction_date}: $${Math.abs(t.amount).toFixed(2)}`)
    .join("\n");
}

export function validatePatterns(patterns: unknown): RecurringPattern[] {
  if (!Array.isArray(patterns)) return [];

  return patterns
    .filter(p => p && typeof p === "object")
    .filter(p => typeof (p as any).is_recurring === "boolean")
    .filter(p => typeof (p as any).amount === "number" && (p as any).amount > 0)
    .filter(p => VALID_CADENCES.includes((p as any).cadence))
    .map(p => ({
      is_recurring: (p as any).is_recurring,
      amount: Math.abs((p as any).amount),
      cadence: (p as any).cadence
    }));
}

export function buildUserPrompt(merchant: string, transactions: any[], existingRules: any[]): string {
  return [
    `Merchant: ${merchant}`,
    "",
    "Transactions (last 6 months):",
    formatTransactionsForLlm(transactions),
    "",
    existingRules.length > 0
      ? `Existing rules for this merchant: ${JSON.stringify(existingRules)}`
      : "Existing rules for this merchant: none"
  ].join("\n");
}

export async function detectRecurringPatternsWithLlm({
  userId,
  merchant,
  transactions,
  existingRules = []
}: {
  userId: string;
  merchant: string;
  transactions: any[];
  existingRules?: any[];
}): Promise<{ ok: boolean; patterns: RecurringPattern[]; error?: string }> {
  try {
    const aiContext = requireAiFeature(userId, "recurring_detection");
    const userPrompt = buildUserPrompt(merchant, transactions, existingRules);

    const result = await runStructuredLlm({
      provider: aiContext.provider,
      apiKey: aiContext.apiKey,
      model: aiContext.model,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 500,
      temperature: 0
    });

    if (!result.ok) {
      return { ok: false, patterns: [], error: result.error };
    }

    const validated = validatePatterns(result.data?.patterns);
    return { ok: true, patterns: validated };
  } catch (error: any) {
    return { ok: false, patterns: [], error: error?.message || "Unknown error" };
  }
}