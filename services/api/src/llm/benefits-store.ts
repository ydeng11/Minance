/**
 * In-memory store for credit card benefits.
 *
 * Benefits are tied to credit-card accounts (accountType === "credit").
 * The store is loaded from fixture data for evals, and runtime data is
 * seeded from user accounts.
 *
 * Structure:
 * - CardBenefit: a benefit rule attached to a specific credit account.
 * - AnnualCredit: a specific annual credit (e.g. Uber cash, airline fee credit).
 *
 * This is a simple in-memory store (same pattern as conversation-store.ts).
 * A future DB migration can persist this to SQLite.
 */

import { createId } from "../utils.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardBenefit {
  id: string;
  userId: string;
  accountId: string;
  cardName: string;
  issuer: string;
  /** Type of benefit */
  benefitType: "rate" | "points" | "credit";
  /** Category this benefit applies to (e.g. "Dining", "Groceries"), or null for "all" */
  category?: string | null;
  /** Specific merchant this benefit applies to, or null for category-wide */
  merchant?: string | null;
  /** Rate: e.g. 3 for 3% cashback, or 2 for 2x points */
  rate: number;
  /** Maximum spend that qualifies (e.g. 500 for $500/month), or null for uncapped */
  capAmount: number | null;
  /** Period for the cap */
  capPeriod: "monthly" | "yearly" | "statement" | null;
  /** Statement cycle day (1-31), or null if not applicable */
  statementCycleDay?: number | null;
  /** Activation date */
  activationDate?: string | null;
  /** Expiry date */
  expiryDate?: string | null;
  /** Annual fee */
  annualFee: number;
  /** Annual credits (e.g. Uber cash, airline fee credit) */
  annualCredits: AnnualCredit[];
}

export interface AnnualCredit {
  name: string;
  amount: number;
  used: number;
}

/** A usage snapshot: how much of a benefit's cap has been used */
export interface BenefitUsage {
  benefitId: string;
  accountId: string;
  cardName: string;
  category: string | null;
  merchant: string | null;
  rate: number;
  capAmount: number | null;
  capPeriod: string | null;
  usedAmount: number;
  remainingAmount: number | null;
  usagePercent: number | null;
  /** Period for this calculation */
  periodStart: string;
  periodEnd: string;
}

// ---------------------------------------------------------------------------
// Store — dual layer: production uses central store, tests use in-memory Map
// ---------------------------------------------------------------------------

const testStore = new Map<string, CardBenefit[]>();

/** Check if test store has data for this user */
function isUsingTestStore(userId: string): boolean {
  return testStore.has(userId);
}

async function loadBenefitsStore(userId: string): Promise<CardBenefit[]> {
  if (testStore.has(userId)) return testStore.get(userId) || [];
  const { loadStore } = await import("../store.ts");
  const s = loadStore() as Record<string, unknown>;
  const byUser = (s.benefitsByUser as Record<string, CardBenefit[]>) || {};
  return byUser[userId] || [];
}

async function saveBenefitsStore(userId: string, benefits: CardBenefit[]): Promise<void> {
  if (testStore.has(userId)) {
    testStore.set(userId, benefits);
    return;
  }
  const { loadStore, saveStore } = await import("../store.ts");
  const s = loadStore() as Record<string, unknown>;
  if (!s.benefitsByUser) {
    (s as Record<string, unknown>).benefitsByUser = {};
  }
  (s.benefitsByUser as Record<string, CardBenefit[]>)[userId] = benefits;
  saveStore(s as never);
}

export async function getBenefitsForUser(userId: string): Promise<CardBenefit[]> {
  return loadBenefitsStore(userId);
}

export async function getBenefitsForAccount(userId: string, accountId: string): Promise<CardBenefit[]> {
  const all = await loadBenefitsStore(userId);
  return all.filter((b) => b.accountId === accountId);
}

export async function getBenefit(userId: string, benefitId: string): Promise<CardBenefit | undefined> {
  const all = await loadBenefitsStore(userId);
  return all.find((b) => b.id === benefitId);
}

export async function addBenefit(userId: string, benefit: Omit<CardBenefit, "id">): Promise<CardBenefit> {
  const newBenefit: CardBenefit = { ...benefit, id: createId("cbnf") };
  const existing = await loadBenefitsStore(userId);
  existing.push(newBenefit);
  await saveBenefitsStore(userId, existing);
  return newBenefit;
}

export async function updateBenefit(
  userId: string,
  benefitId: string,
  patch: Partial<Omit<CardBenefit, "id" | "userId">>
): Promise<CardBenefit | undefined> {
  const existing = await loadBenefitsStore(userId);
  const index = existing.findIndex((b) => b.id === benefitId);
  if (index === -1) return undefined;
  existing[index] = { ...existing[index], ...patch };
  await saveBenefitsStore(userId, existing);
  return existing[index];
}

export async function deleteBenefit(userId: string, benefitId: string): Promise<boolean> {
  const existing = await loadBenefitsStore(userId);
  const index = existing.findIndex((b) => b.id === benefitId);
  if (index === -1) return false;
  existing.splice(index, 1);
  await saveBenefitsStore(userId, existing);
  return true;
}

/** Seed benefits for tests (synchronous, in-memory only) */
export function seedBenefits(userId: string, benefits: CardBenefit[]): void {
  testStore.set(userId, benefits);
}

/** Reset in-memory test store */
export function resetBenefitsStore(): void {
  testStore.clear();
}

// ---------------------------------------------------------------------------
// Benefit calculation (deterministic)
// ---------------------------------------------------------------------------

/**
 * Calculate benefit usage for a specific benefit based on transaction history.
 *
 * This looks up transactions matching the benefit's category or merchant
 * within the cap period, sums the amounts, and returns usage statistics.
 */
export async function calculateBenefitUsage(
  userId: string,
  benefit: CardBenefit,
  nowOverride?: Date
): Promise<BenefitUsage> {
  const { filterUserTransactions } = await import("../analytics.ts");

  // Determine the calculation period
  const now = nowOverride || new Date();
  let periodStart: Date;
  let periodEnd: Date = now;

  if (benefit.capPeriod === "monthly") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (benefit.capPeriod === "yearly") {
    periodStart = new Date(now.getFullYear(), 0, 1);
  } else if (benefit.capPeriod === "statement") {
    // Estimate statement cycle: start from the cycle day of last month
    const cycleDay = benefit.statementCycleDay || 1;
    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, cycleDay);
  } else {
    // Uncapped — use all data
    periodStart = new Date(0);
  }

  const filters: Record<string, unknown> = {
    start: periodStart.toISOString().substring(0, 10),
    end: periodEnd.toISOString().substring(0, 10),
    include_excluded: false
  };

  // Filter by category or merchant
  if (benefit.category) filters.category = benefit.category;
  if (benefit.merchant) filters.merchant = benefit.merchant;

  // Filter by the specific account and only outflow (excludes refunds/inflow)
  const accountFilters: Record<string, unknown> = {
    ...filters,
    account: benefit.accountId,
    direction: "outflow"
  };
  const transactions = filterUserTransactions(userId, accountFilters);
  const usedAmount = transactions.reduce(
    (sum: number, t: { amount: number }) => {
      const amt = Number(t.amount) || 0;
      // Only count positive outflows (exclude negative amounts/refunds)
      return amt > 0 ? sum + amt : sum;
    },
    0
  );

  const capAmount = benefit.capAmount;
  const remainingAmount = capAmount !== null ? Math.max(0, capAmount - usedAmount) : null;
  const usagePercent = capAmount !== null && capAmount > 0
    ? Math.min(100, Math.round((usedAmount / capAmount) * 10000) / 100)
    : null;

  return {
    benefitId: benefit.id,
    accountId: benefit.accountId,
    cardName: benefit.cardName,
    category: benefit.category,
    merchant: benefit.merchant,
    rate: benefit.rate,
    capAmount,
    capPeriod: benefit.capPeriod,
    usedAmount: Math.round(usedAmount * 100) / 100,
    remainingAmount,
    usagePercent,
    periodStart: periodStart.toISOString().substring(0, 10),
    periodEnd: periodEnd.toISOString().substring(0, 10)
  };
}

/**
 * For a given category, rank cards by how much benefit remains.
 * This helps the user choose which card to use.
 */
export async function getBestCardForCategory(
  userId: string,
  category: string,
  spendAmount: number = 0,
  nowOverride?: Date
): Promise<
  Array<{
    accountId: string;
    cardName: string;
    issuer: string;
    rate: number;
    capAmount: number | null;
    remainingAmount: number | null;
    estimatedReward: number;
    estimatedRewardAfterSpend: number;
  }>
> {
  const benefits = getBenefitsForUser(userId).filter(
    (b) => b.category === category || b.category === null
  );

  const results = [];
  for (const benefit of benefits) {
    const usage = await calculateBenefitUsage(userId, benefit, nowOverride);

    // Calculate what this spend would earn
    // rate 3 means 3% = spend * 0.03
    const rateDecimal = benefit.rate / 100;
    const spendAfterCap = usage.remainingAmount !== null
      ? Math.min(spendAmount, usage.remainingAmount)
      : spendAmount;

    const estimatedReward = Math.round(spendAmount * rateDecimal * 100) / 100;
    const estimatedRewardAfterSpend = Math.round(spendAfterCap * rateDecimal * 100) / 100;

    results.push({
      accountId: benefit.accountId,
      cardName: benefit.cardName,
      issuer: benefit.issuer,
      rate: benefit.rate,
      capAmount: benefit.capAmount,
      remainingAmount: usage.remainingAmount,
      estimatedReward,
      estimatedRewardAfterSpend
    });
  }

  // Sort by: marginal reward for the proposed spend (highest first),
  // then by rate (highest first) as tiebreaker.
  results.sort((a, b) => {
    const rewardDiff = b.estimatedRewardAfterSpend - a.estimatedRewardAfterSpend;
    if (rewardDiff !== 0) return rewardDiff;
    return b.rate - a.rate;
  });

  return results;
}

/**
 * Analyze whether a card is worth its annual fee.
 * Compares total rewards earned in the last 12 months to the annual fee.
 */
export async function getAnnualFeeAnalysis(
  userId: string,
  benefit: CardBenefit,
  nowOverride?: Date
): Promise<{
  annualFee: number;
  totalRewardsEarned: number;
  netValue: number;
  worthIt: boolean;
  breakdown: Array<{ category: string; spend: number; reward: number }>;
}> {
  const annualFee = benefit.annualFee || 0;
  const { filterUserTransactions } = await import("../analytics.ts");

  // Look back 12 months
  const now = nowOverride || new Date();
  const start = new Date(now);
  start.setFullYear(start.getFullYear() - 1);

  // Get all transactions for this card's categories
  const breakdown: Array<{ category: string; spend: number; reward: number }> = [];
  let totalRewardsEarned = 0;

  // If benefit has a specific category, analyze that
  const categoriesToCheck = benefit.category ? [benefit.category] : ["Dining", "Groceries", "Gas", "Shopping", "Entertainment", "Travel"];

  for (const cat of categoriesToCheck) {
    const filters: Record<string, unknown> = {
      start: start.toISOString().substring(0, 10),
      end: now.toISOString().substring(0, 10),
      category: cat,
      include_excluded: false,
      direction: "outflow"
    };

    const transactions = filterUserTransactions(userId, filters);
    const spend = transactions.reduce(
      (sum: number, t: { amount: number }) => {
        const amt = Number(t.amount) || 0;
        return amt > 0 ? sum + amt : sum;
      },
      0
    );

    if (spend > 0) {
      // Filter by account
      const acctFilters: Record<string, unknown> = { ...filters, account: benefit.accountId };
      const acctTransactions = filterUserTransactions(userId, acctFilters);
      const acctSpend = acctTransactions.reduce(
        (sum: number, t: { amount: number }) => sum + Math.abs(Number(t.amount) || 0),
        0
      );
      // Apply cap if applicable
      const rateDecimal = benefit.rate / 100;
      const effectiveSpend = benefit.capAmount !== null ? Math.min(acctSpend, benefit.capAmount) : acctSpend;
      const reward = Math.round(effectiveSpend * rateDecimal * 100) / 100;
      breakdown.push({ category: cat, spend: Math.round(acctSpend * 100) / 100, reward });
      totalRewardsEarned += reward;
    }
  }

  const netValue = Math.round((totalRewardsEarned - annualFee) * 100) / 100;

  return {
    annualFee,
    totalRewardsEarned: Math.round(totalRewardsEarned * 100) / 100,
    netValue,
    worthIt: netValue > 0,
    breakdown
  };
}

/**
 * Track annual credit usage.
 */
export function getAnnualCreditsUsage(
  benefit: CardBenefit
): Array<{ name: string; amount: number; used: number; remaining: number }> {
  return (benefit.annualCredits || []).map((credit) => ({
    name: credit.name,
    amount: credit.amount,
    used: credit.used,
    remaining: Math.max(0, credit.amount - credit.used)
  }));
}
