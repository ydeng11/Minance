import { DEFAULT_CATEGORIES } from "../../../../packages/domain/src/constants.js";
import { getTrainingPromptContext } from "../training.js";

const CATEGORY_GUIDANCE = [
  "Groceries: supermarkets, markets, wholesale food stores, and household food purchases.",
  "Dining: restaurants, cafes, delivery, bars, and food/drink services.",
  "Transport: rideshare, fuel, tolls, parking, transit, and travel movement costs.",
  "Utilities: internet, electric, water, phone, and recurring household services.",
  "Housing: rent, mortgage, HOA, and primary home payments.",
  "Healthcare: pharmacy, medical, dental, and wellness care spending.",
  "Entertainment: streaming, games, events, hobbies, and discretionary fun.",
  "Shopping: merchandise, retail goods, apparel, electronics, and general purchases.",
  "Income: salary, payroll, interest, refunds, reimbursements, and inflows.",
  "Transfer: card payments, internal transfers, account-to-account movement, and pass-through money movement.",
  "Uncategorized: only use when evidence is too weak or conflicting."
];

const LEGACY_BUCKET_SYNONYMS = [
  "Transfer: legacy labels like Transfer & Withdrawl, Transfers, Credit Card Payments, Payment, Payments and Credits.",
  "Dining: legacy labels like Food & Drink, Restaurants/Dining, Dining.",
  "Shopping: legacy labels like Shopping, General Merchandise, Merchandise, Fashion, Clothing/Shoes, Home.",
  "Transport: legacy labels like Travel, Gas, Automotive, Travel/ Entertainment.",
  "Utilities: legacy labels like Bills & Utilities, Bills, Utilities, Subscriptions & Services, Dues and Subscriptions.",
  "Housing: legacy labels like Mortgage & Loan, Mortgage.",
  "Healthcare: legacy labels like Health, Personal Care, Health & Wellness.",
  "Entertainment: legacy labels like Entertainments & Growth, Entertainments, Outdoor Activities.",
  "Income: legacy labels like Salary, Paychecks/Salary, Other Income, Investment Income, Interest.",
  "Groceries: legacy labels like Groceries.",
  "Uncategorized: legacy labels like Miscellaneous, Fees & Adjustments when no stronger signal is present."
];

function safeJson(value) {
  return JSON.stringify(value, null, 2);
}

export function buildCategorizationPrompt({
  transaction,
  userRules = [],
  exemplars = []
}) {
  const trainingContext = getTrainingPromptContext({
    maxRawCategoryMappings: 60,
    maxMerchantExemplars: 60
  });

  const systemPrompt = [
    "You classify personal-finance transactions into one allowed category.",
    "Return JSON only. Do not add markdown or prose outside JSON.",
    `Allowed categories: ${DEFAULT_CATEGORIES.join(", ")}.`,
    "Prefer Transfer when description indicates card payment, account transfer, ACH movement, or payment settlement.",
    "Prefer Income only for true inflows into the user's balances.",
    "If uncertain, pick the best category and lower confidence_internal.",
    "Output schema:",
    '{"category":"<allowed category>","reason_short":"<1 short sentence>","signals_used":["<signal>"],"confidence_internal":0.0}'
  ].join("\n");

  const userPrompt = [
    "Category guidance:",
    ...CATEGORY_GUIDANCE.map((line) => `- ${line}`),
    "",
    "Legacy category synonym guidance (derived from historical mapping patterns):",
    ...LEGACY_BUCKET_SYNONYMS.map((line) => `- ${line}`),
    "",
    "User-defined category rules (higher priority):",
    safeJson(userRules.slice(0, 30)),
    "",
    "User historical merchant exemplars (same user only):",
    safeJson(exemplars.slice(0, 40)),
    "",
    "Global training context from historical backup data (cross-user priors, lower priority than user rules/history):",
    safeJson(
      trainingContext.enabled
        ? {
            raw_category_mappings: trainingContext.rawCategoryMappings,
            merchant_exemplars: trainingContext.merchantExemplars
          }
        : { status: "unavailable" }
    ),
    "",
    "Transaction to classify:",
    safeJson(transaction)
  ].join("\n");

  return { systemPrompt, userPrompt };
}

export function buildAssistantSynthesisPrompt({
  question,
  plan,
  deterministicResult
}) {
  const systemPrompt = [
    "You are a personal-finance assistant.",
    "You must ONLY use the provided computed facts.",
    "Do not invent values or claims.",
    "Keep the answer concise and directly useful.",
    "Return JSON only.",
    'Output schema: {"answer":"<string>","highlights":["<string>"],"drill_down_filters":{"start":null,"end":null,"range":null,"category":null,"merchant":null}}'
  ].join("\n");

  const userPrompt = [
    "User question:",
    question,
    "",
    "Computed query plan:",
    safeJson(plan),
    "",
    "Computed deterministic result:",
    safeJson({
      answer: deterministicResult.answer,
      numbers: deterministicResult.numbers,
      filters: deterministicResult.filters,
      details: deterministicResult.details
    }),
    "",
    "Rules:",
    "- Preserve numeric consistency with deterministicResult.numbers/details.",
    "- Keep answer-first style.",
    "- Provide 2-4 highlights if available."
  ].join("\n");

  return { systemPrompt, userPrompt };
}

export function buildMerchantExemplars(transactions = [], maxItems = 24) {
  const counts = new Map();
  for (const tx of transactions) {
    if (!tx?.merchant_normalized || !tx?.category_final) {
      continue;
    }
    const key = `${tx.merchant_normalized}::${tx.category_final}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const items = Array.from(counts.entries())
    .map(([key, count]) => {
      const [merchant, category] = key.split("::");
      return { merchant, category, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);

  return items;
}
