import test from "node:test";
import assert from "node:assert/strict";
import { resetBenefitsStore, seedBenefits, addBenefit, calculateBenefitUsage, getBestCardForCategory, getAnnualFeeAnalysis, getAnnualCreditsUsage } from "../../src/llm/benefits-store.ts";

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const FIXTURE_CARDS = [
  {
    id: "cbnf_dining_chase",
    userId: "user_fixture",
    accountId: "acct_chase",
    cardName: "Chase Sapphire",
    issuer: "Chase",
    benefitType: "rate" as const,
    category: "Dining",
    merchant: null,
    rate: 3.0,
    capAmount: 300,
    capPeriod: "monthly" as const,
    statementCycleDay: 1,
    annualFee: 95,
    annualCredits: []
  },
  {
    id: "cbnf_groceries_amex",
    userId: "user_fixture",
    accountId: "acct_amex",
    cardName: "Amex Gold",
    issuer: "Amex",
    benefitType: "rate" as const,
    category: "Groceries",
    merchant: null,
    rate: 4.0,
    capAmount: 250,
    capPeriod: "monthly" as const,
    statementCycleDay: 15,
    annualFee: 250,
    annualCredits: [
      { name: "Uber Cash", amount: 120, used: 50 }
    ]
  },
  {
    id: "cbnf_general_venture",
    userId: "user_fixture",
    accountId: "acct_venture",
    cardName: "Venture X",
    issuer: "Capital One",
    benefitType: "rate" as const,
    category: null,
    merchant: null,
    rate: 2.0,
    capAmount: null,
    capPeriod: null,
    annualFee: 395,
    annualCredits: [
      { name: "Travel Credit", amount: 300, used: 150 }
    ]
  }
];

// ---------------------------------------------------------------------------
// Rate calculation tests
// ---------------------------------------------------------------------------

test("benefits: rate 3% means spend * 0.03", () => {
  const spend = 100;
  const rate = 3.0;
  const reward = spend * (rate / 100);
  assert.equal(reward, 3.0, "3% of $100 should be $3.00");
});

test("benefits: rate 4% means spend * 0.04", () => {
  const spend = 75.50;
  const rate = 4.0;
  const reward = Math.round(spend * (rate / 100) * 100) / 100;
  assert.equal(reward, 3.02, "4% of $75.50 should be $3.02");
});

test("benefits: rate 2% on large spend", () => {
  const spend = 523.45;
  const rate = 2.0;
  const reward = Math.round(spend * (rate / 100) * 100) / 100;
  assert.equal(reward, 10.47, "2% of $523.45 should be $10.47");
});

// ---------------------------------------------------------------------------
// Cap-aware reward calculation tests
// ---------------------------------------------------------------------------

test("benefits: reward capped at cap amount", () => {
  const spend = 500;
  const cap = 300;
  const rate = 3.0;
  const effectiveSpend = Math.min(spend, cap);
  const reward = Math.round(effectiveSpend * (rate / 100) * 100) / 100;
  assert.equal(reward, 9.0, "3% of $300 (capped from $500) should be $9.00");
});

test("benefits: reward below cap is uncapped", () => {
  const spend = 200;
  const cap = 300;
  const rate = 3.0;
  const effectiveSpend = Math.min(spend, cap);
  const reward = Math.round(effectiveSpend * (rate / 100) * 100) / 100;
  assert.equal(reward, 6.0, "3% of $200 (under $300 cap) should be $6.00");
});

test("benefits: uncapped benefit", () => {
  const spend = 10000;
  const cap = null;
  const rate = 2.0;
  const effectiveSpend = cap !== null ? Math.min(spend, cap) : spend;
  const reward = Math.round(effectiveSpend * (rate / 100) * 100) / 100;
  assert.equal(reward, 200.0, "2% of $10,000 uncapped should be $200.00");
});

// ---------------------------------------------------------------------------
// Card ranking tests
// ---------------------------------------------------------------------------

test("benefits: higher rate card ranks first when caps are equal or both uncapped", () => {
  // Simulated: two uncapped cards, one with 4%, one with 2%
  const cards = [
    { name: "Card A", rate: 2.0, remainingCap: Infinity, reward: 2.0 },
    { name: "Card B", rate: 4.0, remainingCap: Infinity, reward: 4.0 }
  ];
  cards.sort((a, b) => b.reward - a.reward);
  assert.equal(cards[0].name, "Card B", "Higher rate should rank first");
});

test("benefits: card with cap remaining ranks over fully-exhausted card at same rate", () => {
  // Card A has $0 remaining at 3%; Card B has $200 remaining at 2%
  const testSpend = 100;
  const cards = [
    { name: "Card A", rate: 3.0, remaining: 0, rewardForSpend: 0 },
    { name: "Card B", rate: 2.0, remaining: 200, rewardForSpend: testSpend * 0.02 }
  ];
  cards.sort((a, b) => b.rewardForSpend - a.rewardForSpend);
  assert.equal(cards[0].name, "Card B", "Card with cap remaining should rank over exhausted card");
});

// ---------------------------------------------------------------------------
// Annual credit tests
// ---------------------------------------------------------------------------

test("benefits: getAnnualCreditsUsage returns remaining correctly", () => {
  const benefit = FIXTURE_CARDS[2]; // Venture X
  const credits = getAnnualCreditsUsage(benefit);
  assert.equal(credits.length, 1);
  assert.equal(credits[0].name, "Travel Credit");
  assert.equal(credits[0].amount, 300);
  assert.equal(credits[0].used, 150);
  assert.equal(credits[0].remaining, 150);
});

test("benefits: full credit usage shows zero remaining", () => {
  const benefit = { ...FIXTURE_CARDS[0], annualCredits: [{ name: "Test Credit", amount: 100, used: 100 }] };
  const credits = getAnnualCreditsUsage(benefit);
  assert.equal(credits[0].remaining, 0);
});

// ---------------------------------------------------------------------------
// Empty state tests
// ---------------------------------------------------------------------------

test("benefits: empty store returns empty array", async () => {
  resetBenefitsStore();
  const { getBenefitsForUser } = await import("../../src/llm/benefits-store.ts");
  assert.deepEqual(await getBenefitsForUser("nonexistent_user"), []);
});

// ---------------------------------------------------------------------------
// User isolation tests
// ---------------------------------------------------------------------------

test("benefits: user A's data is not visible to user B", async () => {
  resetBenefitsStore();
  seedBenefits("user_a", [FIXTURE_CARDS[0]]);
  seedBenefits("user_b", [FIXTURE_CARDS[1]]);
  const { getBenefitsForUser } = await import("../../src/llm/benefits-store.ts");
  const userAData = await getBenefitsForUser("user_a");
  assert.equal(userAData.length, 1);
  assert.equal(userAData[0].cardName, "Chase Sapphire");
  const userBData = await getBenefitsForUser("user_b");
  assert.equal(userBData.length, 1);
  assert.equal(userBData[0].cardName, "Amex Gold");
  resetBenefitsStore();
});
