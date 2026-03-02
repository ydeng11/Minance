import fs from "node:fs";
import path from "node:path";

export const DETERMINISTIC_FINANCIAL_FIXTURE_VERSION = "2026-03-02";
export const DETERMINISTIC_FIXTURE_USER_ID = "usr_fixture_001";

const CREATED_AT = "2026-01-01T00:00:00.000Z";
const UPDATED_AT = "2026-03-01T00:00:00.000Z";

const ACCOUNTS = [
  {
    id: "acct_fixture_checking",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    normalizedKey: "fixture-checking",
    displayName: "Fixture Checking",
    sourceInstitution: "Fixture Credit Union",
    accountType: "depository",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  },
  {
    id: "acct_fixture_savings",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    normalizedKey: "fixture-savings",
    displayName: "Fixture Savings",
    sourceInstitution: "Fixture Credit Union",
    accountType: "depository",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  },
  {
    id: "acct_fixture_credit",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    normalizedKey: "fixture-credit",
    displayName: "Fixture Rewards Card",
    sourceInstitution: "Fixture Bank",
    accountType: "credit",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  },
  {
    id: "acct_fixture_brokerage",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    normalizedKey: "fixture-brokerage",
    displayName: "Fixture Brokerage",
    sourceInstitution: "Fixture Investments",
    accountType: "investment",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  }
];

const CATEGORIES = [
  ["Housing", "house", "essential"],
  ["Utilities", "light", "essential"],
  ["Groceries", "cart", "essential"],
  ["Dining", "meal", "extra"],
  ["Transport", "car", "essential"],
  ["Income", "income", "income"],
  ["Investments", "chart", "investments"],
  ["Transfer", "transfer", "neutral"]
].map(([name, emoji, coarseKey], index) => ({
  id: `cat_fixture_${String(index + 1).padStart(3, "0")}`,
  userId: DETERMINISTIC_FIXTURE_USER_ID,
  name,
  emoji,
  coarseKey,
  isSystem: false,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT
}));

const TRANSACTIONS = [
  ["2026-01-01", "Fixture Employer", "Payroll", 5200, "credit", "Income", "income", "acct_fixture_checking"],
  ["2026-01-03", "Green Market", "Weekly groceries", 128.45, "debit", "Groceries", "essential", "acct_fixture_checking"],
  ["2026-01-05", "Sunset Apartments", "Monthly rent", 1850, "debit", "Housing", "essential", "acct_fixture_checking"],
  ["2026-01-08", "Fixture Energy", "Electric bill", 92.31, "debit", "Utilities", "essential", "acct_fixture_checking"],
  ["2026-01-11", "Metro Transit", "Transit reload", 60, "debit", "Transport", "essential", "acct_fixture_credit"],
  ["2026-01-14", "Cafe Brisk", "Lunch", 24.8, "debit", "Dining", "extra", "acct_fixture_credit"],
  ["2026-01-16", "Broker Transfer", "Investment contribution", 500, "debit", "Investments", "investments", "acct_fixture_checking"],
  ["2026-01-16", "Broker Transfer", "Investment contribution", 500, "credit", "Transfer", "neutral", "acct_fixture_brokerage"],
  ["2026-02-01", "Fixture Employer", "Payroll", 5200, "credit", "Income", "income", "acct_fixture_checking"],
  ["2026-02-03", "Green Market", "Weekly groceries", 132.1, "debit", "Groceries", "essential", "acct_fixture_checking"],
  ["2026-02-05", "Sunset Apartments", "Monthly rent", 1850, "debit", "Housing", "essential", "acct_fixture_checking"],
  ["2026-02-08", "Fixture Energy", "Electric bill", 89.77, "debit", "Utilities", "essential", "acct_fixture_checking"],
  ["2026-02-10", "Cafe Brisk", "Lunch", 28.15, "debit", "Dining", "extra", "acct_fixture_credit"],
  ["2026-02-16", "Broker Transfer", "Investment contribution", 500, "debit", "Investments", "investments", "acct_fixture_checking"],
  ["2026-02-16", "Broker Transfer", "Investment contribution", 500, "credit", "Transfer", "neutral", "acct_fixture_brokerage"],
  ["2026-02-20", "Dividend Fund", "Dividend payout", 74.22, "credit", "Income", "income", "acct_fixture_brokerage"],
  ["2026-03-01", "Fixture Employer", "Payroll", 5200, "credit", "Income", "income", "acct_fixture_checking"],
  ["2026-03-03", "Green Market", "Weekly groceries", 130.64, "debit", "Groceries", "essential", "acct_fixture_checking"],
  ["2026-03-05", "Sunset Apartments", "Monthly rent", 1850, "debit", "Housing", "essential", "acct_fixture_checking"],
  ["2026-03-09", "Cafe Brisk", "Lunch", 26.35, "debit", "Dining", "extra", "acct_fixture_credit"]
].map(([date, merchant, description, amount, direction, category, categoryCoarse, accountId], index) => {
  const transactionId = `txn_fixture_${String(index + 1).padStart(3, "0")}`;
  const merchantNormalized = String(merchant).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return {
    id: transactionId,
    user_id: DETERMINISTIC_FIXTURE_USER_ID,
    account_id: accountId,
    account_key: ACCOUNTS.find((account) => account.id === accountId)?.normalizedKey || null,
    source_type: "fixture_seed",
    source_file_id: null,
    transaction_date: date,
    post_date: date,
    merchant_raw: merchant,
    merchant_normalized: merchantNormalized,
    description,
    amount,
    currency: "USD",
    direction,
    category_raw: category,
    category_final: category,
    category_coarse: categoryCoarse,
    category_emoji: CATEGORIES.find((entry) => entry.name === category)?.emoji || "",
    category_confidence: 1,
    category_strategy: "fixture_seed",
    needs_category_review: false,
    memo: `fixture-seed-${index + 1}`,
    dedupe_fingerprint: `fixture-fingerprint-${String(index + 1).padStart(3, "0")}`,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT
  };
});

const RECURRING_RULES = [
  {
    id: "rr_fixture_rent",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    name: "Monthly Rent",
    cadence: "monthly",
    amount: 1850,
    direction: "debit",
    category: "Housing",
    accountId: "acct_fixture_checking",
    merchantPattern: "Sunset Apartments",
    nextRunAt: "2026-04-05",
    status: "active",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  },
  {
    id: "rr_fixture_payroll",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    name: "Monthly Payroll",
    cadence: "monthly",
    amount: 5200,
    direction: "credit",
    category: "Income",
    accountId: "acct_fixture_checking",
    merchantPattern: "Fixture Employer",
    nextRunAt: "2026-04-01",
    status: "active",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  }
];

const INVESTMENT_HOLDINGS = [
  {
    id: "inv_hold_fixture_voo",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    accountId: "acct_fixture_brokerage",
    symbol: "VOO",
    quantity: 14,
    avgCost: 436.12,
    currency: "USD",
    asOfDate: "2026-03-01",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  },
  {
    id: "inv_hold_fixture_bnd",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    accountId: "acct_fixture_brokerage",
    symbol: "BND",
    quantity: 20,
    avgCost: 71.45,
    currency: "USD",
    asOfDate: "2026-03-01",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  }
];

const INVESTMENT_SNAPSHOTS = [
  {
    id: "inv_snap_2026_01",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    accountId: "acct_fixture_brokerage",
    snapshotDate: "2026-01-31",
    marketValue: 6480.52,
    totalCost: 6210.0,
    unrealizedPnl: 270.52,
    createdAt: UPDATED_AT,
    updatedAt: UPDATED_AT
  },
  {
    id: "inv_snap_2026_02",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    accountId: "acct_fixture_brokerage",
    snapshotDate: "2026-02-28",
    marketValue: 6894.13,
    totalCost: 6710.0,
    unrealizedPnl: 184.13,
    createdAt: UPDATED_AT,
    updatedAt: UPDATED_AT
  }
];

const FIXTURE_STORE = {
  fixtureMeta: {
    key: "deterministic-financial",
    version: DETERMINISTIC_FINANCIAL_FIXTURE_VERSION,
    generatedAt: "2026-03-02T00:00:00.000Z"
  },
  users: [
    {
      id: DETERMINISTIC_FIXTURE_USER_ID,
      email: "fixture.user@minance.local",
      passwordHash:
        "ad78acfd8ac9fd8c57ac96f89fe260c5b07c8cf3a2e9909fd80a3235a2f96d5415751a0d576746f8b5a4294f52ca5aaabf0f17472d3f1689be299ca51c325574",
      passwordSalt: "minance-fixture-salt-001",
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT
    }
  ],
  sessions: [],
  accounts: ACCOUNTS,
  transactions: TRANSACTIONS,
  categories: CATEGORIES,
  categoryStrategies: [
    {
      id: "cat_strategy_fixture_001",
      userId: DETERMINISTIC_FIXTURE_USER_ID,
      coarseCategories: [
        { key: "essential", name: "Essential", emoji: "essential", excluded: false },
        { key: "extra", name: "Extra", emoji: "extra", excluded: false },
        { key: "income", name: "Income", emoji: "income", excluded: true },
        { key: "investments", name: "Investments", emoji: "investments", excluded: true },
        { key: "neutral", name: "Neutral", emoji: "neutral", excluded: true }
      ],
      granularCategories: CATEGORIES.map((entry) => ({
        name: entry.name,
        coarseKey: entry.coarseKey,
        emoji: entry.emoji
      })),
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT
    }
  ],
  categoryRules: [
    {
      id: "cat_rule_fixture_001",
      userId: DETERMINISTIC_FIXTURE_USER_ID,
      type: "contains",
      pattern: "green market",
      category: "Groceries",
      priority: 80,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT
    },
    {
      id: "cat_rule_fixture_002",
      userId: DETERMINISTIC_FIXTURE_USER_ID,
      type: "contains",
      pattern: "cafe brisk",
      category: "Dining",
      priority: 80,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT
    }
  ],
  imports: [],
  importRowsRaw: [],
  importRowsProcessed: [],
  importRowDiagnostics: [],
  aiProviderCredentials: [],
  aiProviderPreferences: [],
  assistantQueries: [],
  savedViews: [
    {
      id: "saved_view_fixture_001",
      userId: DETERMINISTIC_FIXTURE_USER_ID,
      name: "Fixture 90d Spend",
      filters: {
        range: "90d",
        category_view: "granular"
      },
      layout: {
        cards: ["summary", "categories", "merchants"]
      },
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT
    }
  ],
  migrationRuns: [],
  auditEvents: [
    {
      id: "audit_fixture_seed_001",
      userId: DETERMINISTIC_FIXTURE_USER_ID,
      action: "fixture.seed",
      details: {
        dataset: "deterministic-financial"
      },
      createdAt: UPDATED_AT
    }
  ],
  recurringRules: RECURRING_RULES,
  investmentHoldings: INVESTMENT_HOLDINGS,
  investmentSnapshots: INVESTMENT_SNAPSHOTS
};

export function createDeterministicFinancialFixture() {
  return structuredClone(FIXTURE_STORE);
}

export function summarizeDeterministicFinancialFixture(store = FIXTURE_STORE) {
  return {
    users: store.users.length,
    accounts: store.accounts.length,
    categories: store.categories.length,
    transactions: store.transactions.length,
    recurringRules: (store.recurringRules || []).length,
    investmentHoldings: (store.investmentHoldings || []).length,
    investmentSnapshots: (store.investmentSnapshots || []).length
  };
}

export function writeDeterministicFinancialFixture(targetPath) {
  if (!targetPath) {
    throw new Error("targetPath is required");
  }
  const fixture = createDeterministicFinancialFixture();
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(fixture, null, 2));
  return {
    targetPath,
    summary: summarizeDeterministicFinancialFixture(fixture)
  };
}
