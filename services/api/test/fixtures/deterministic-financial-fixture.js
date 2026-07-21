import fs from "node:fs";
import path from "node:path";

export const DETERMINISTIC_FINANCIAL_FIXTURE_VERSION = "2026-07-18";
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
    id: "acct_fixture_chase_sapphire",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    normalizedKey: "fixture-chase-sapphire",
    displayName: "Sapphire Preferred",
    sourceInstitution: "Chase",
    accountType: "credit",
    currency: "USD",
    initialBalance: 0,
    status: "active",
    version: 1,
    classMetadata: {
      type: "credit",
      credit: {
        annualFee: 95,
        activationDate: "2024-06-15",
        lastRenewalDate: "2025-06-15",
        renewalCycleMonths: 12,
        benefits: [
          { id: "bnft_fixture_001", name: "5x Travel via Chase Travel", monetaryValue: null, used: true, lastUsedDate: "2026-06-01" },
          { id: "bnft_fixture_002", name: "3x Dining & Streaming", monetaryValue: null, used: false, lastUsedDate: null },
          { id: "bnft_fixture_003", name: "$50 Annual Hotel Credit", monetaryValue: 50, used: true, lastUsedDate: "2026-04-10" },
          { id: "bnft_fixture_004", name: "Primary Rental Car Coverage", monetaryValue: null, used: false, lastUsedDate: null }
        ]
      }
    },
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  },
  {
    id: "acct_fixture_amex_gold",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    normalizedKey: "fixture-amex-gold",
    displayName: "Gold Card",
    sourceInstitution: "American Express",
    accountType: "credit",
    currency: "USD",
    initialBalance: 0,
    status: "active",
    version: 1,
    classMetadata: {
      type: "credit",
      credit: {
        annualFee: 350,
        activationDate: "2025-11-01",
        lastRenewalDate: null,
        renewalCycleMonths: 12,
        benefits: [
          { id: "bnft_fixture_005", name: "4x Restaurants Worldwide", monetaryValue: null, used: false, lastUsedDate: null },
          { id: "bnft_fixture_006", name: "4x US Supermarkets (up to $25k)", monetaryValue: null, used: false, lastUsedDate: null },
          { id: "bnft_fixture_007", name: "3x Flights Direct/AmexTravel", monetaryValue: null, used: false, lastUsedDate: null },
          { id: "bnft_fixture_008", name: "$120 Annual Dining Credit", monetaryValue: 120, used: false, lastUsedDate: null },
          { id: "bnft_fixture_009", name: "$120 Annual Uber Cash", monetaryValue: 120, used: false, lastUsedDate: null },
          { id: "bnft_fixture_010", name: "$100 Resy Credit", monetaryValue: 100, used: false, lastUsedDate: null }
        ]
      }
    },
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  },
  {
    id: "acct_fixture_venture_x",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    normalizedKey: "fixture-venture-x",
    displayName: "Venture X",
    sourceInstitution: "Capital One",
    accountType: "credit",
    currency: "USD",
    initialBalance: 0,
    status: "active",
    version: 1,
    classMetadata: {
      type: "credit",
      credit: {
        annualFee: 395,
        activationDate: "2026-03-20",
        lastRenewalDate: null,
        renewalCycleMonths: 12,
        benefits: [
          { id: "bnft_fixture_011", name: "10x Hotels/Rental Cars via Capital One Travel", monetaryValue: null, used: false, lastUsedDate: null, consumable: false },
          { id: "bnft_fixture_012", name: "5x Flights via Capital One Travel", monetaryValue: null, used: false, lastUsedDate: null, consumable: false },
          { id: "bnft_fixture_013", name: "2x Miles on Everything", monetaryValue: null, used: false, lastUsedDate: null, consumable: false },
          { id: "bnft_fixture_014", name: "10k Bonus Miles Annually", monetaryValue: null, used: false, lastUsedDate: null, consumable: false },
          { id: "bnft_fixture_015", name: "$300 Annual Travel Credit", monetaryValue: 300, used: true, lastUsedDate: "2026-04-05", consumable: true },
          { id: "bnft_fixture_016", name: "Priority Pass & Lounge Access", monetaryValue: null, used: false, lastUsedDate: null, consumable: false }
        ]
      }
    },
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
  ["Housing", "house", "essential", "expense"],
  ["Utilities", "light", "essential", "expense"],
  ["Groceries", "cart", "essential", "expense"],
  ["Healthcare", "health", "essential", "expense"],
  ["Dining", "meal", "extra", "expense"],
  ["Entertainment", "ticket", "extra", "expense"],
  ["Travel", "plane", "extra", "expense"],
  ["Fees", "fee", "extra", "expense"],
  ["Income", "income", "income", "income"],
  ["Refunds", "refund", "income", "income"],
  ["Investments", "chart", "investments", "transfer"],
  ["Transfer", "transfer", "neutral", "transfer"]
].map(([name, emoji, coarseKey, type], index) => ({
  id: `cat_fixture_${String(index + 1).padStart(3, "0")}`,
  userId: DETERMINISTIC_FIXTURE_USER_ID,
  name,
  emoji,
  coarseKey,
  type,
  isSystem: false,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT
}));

const MONTHS = [
  "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
  "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
  "2026-07"
];

const TRANSACTION_INPUTS = MONTHS.flatMap((month, monthIndex) => {
  const energyAmount = [142, 133, 96, 78, 74, 92, 128, 136, 101, 84, 81, 109][monthIndex % 12];
  const groceryBase = 112 + monthIndex * 2.35;
  const investmentAmount = monthIndex % 3 === 2 ? 750 : 500;
  return [
    [`${month}-01`, "Fixture Employer", "Payroll", 5200, "inflow", "Income", "income", "acct_fixture_checking", "income", ["recurring", "payroll"], "rr_fixture_payroll"],
    [`${month}-03`, "Green Market", "Weekly groceries", groceryBase, "outflow", "Groceries", "essential", "acct_fixture_checking", "expense", ["recurring", "groceries"], "rr_fixture_groceries"],
    [`${month}-10`, "Neighborhood Foods", "Weekly groceries", groceryBase + 18.75, "outflow", "Groceries", "essential", "acct_fixture_chase_sapphire", "expense", ["recurring", "groceries"], "rr_fixture_groceries"],
    [`${month}-05`, "Sunset Apartments", "Monthly rent", 1850, "outflow", "Housing", "essential", "acct_fixture_checking", "expense", ["recurring", "fixed"], "rr_fixture_rent"],
    [`${month}-08`, "Fixture Energy", "Electric bill", energyAmount, "outflow", "Utilities", "essential", "acct_fixture_checking", "expense", ["recurring", "utilities"], "rr_fixture_energy"],
    [`${month}-12`, "Stream Box", "Video subscription", 15.99, "outflow", "Entertainment", "extra", "acct_fixture_chase_sapphire", "expense", ["recurring", "subscription"], "rr_fixture_streaming"],
    [`${month}-14`, "Cafe Brisk", "Dinner", 32 + monthIndex * 1.8, "outflow", "Dining", "extra", "acct_fixture_chase_sapphire", "expense", ["dining"], null],
    [`${month}-16`, "Savings Transfer", "Monthly savings", 400, "outflow", "Transfer", "neutral", "acct_fixture_checking", "transfer", ["transfer"], null],
    [`${month}-16`, "Savings Transfer", "Monthly savings", 400, "inflow", "Transfer", "neutral", "acct_fixture_savings", "transfer", ["transfer"], null],
    [`${month}-18`, "Broker Transfer", "Investment contribution", investmentAmount, "outflow", "Investments", "investments", "acct_fixture_checking", "transfer", ["transfer", "investment"], null],
    [`${month}-18`, "Broker Transfer", "Investment contribution", investmentAmount, "inflow", "Transfer", "neutral", "acct_fixture_brokerage", "transfer", ["transfer", "investment"], null]
  ];
});

TRANSACTION_INPUTS.push(
  ["2025-10-18", "Fixture Health Clinic", "Annual checkup", 180, "outflow", "Healthcare", "essential", "acct_fixture_chase_sapphire", "expense", ["health"], null],
  ["2025-12-22", "Northwind Airlines", "Holiday trip", 845.5, "outflow", "Travel", "extra", "acct_fixture_chase_sapphire", "expense", ["travel"], null],
  ["2026-01-02", "Northwind Airlines", "Fare adjustment refund", 125, "inflow", "Refunds", "income", "acct_fixture_chase_sapphire", "income", ["refund", "travel"], null],
  ["2026-04-21", "Fixture Insurance", "Annual premium", 720, "outflow", "Utilities", "essential", "acct_fixture_checking", "expense", ["recurring", "annual"], "rr_fixture_insurance"],
  ["2026-06-27", "Fixture Bank", "Service fee needs review", 35, "outflow", "Fees", "extra", "acct_fixture_checking", "expense", ["fee"], null, true]
);

const TRANSACTIONS = TRANSACTION_INPUTS.map(([
  date, merchant, description, amount, direction, category, categoryCoarse, accountId,
  transactionType, tags, recurringRuleId, needsReview = false
], index) => {
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
    transaction_type: transactionType,
    category_raw: category,
    category_final: category,
    category_coarse: categoryCoarse,
    category_emoji: CATEGORIES.find((entry) => entry.name === category)?.emoji || "",
    category_confidence: 1,
    category_strategy: "fixture_seed",
    needs_category_review: needsReview,
    review_status: needsReview ? "needs_review" : "reviewed",
    tags,
    recurring_rule_id: recurringRuleId,
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
    direction: "outflow",
    category: "Housing",
    accountId: "acct_fixture_checking",
    merchantPattern: "Sunset Apartments",
    nextRunAt: "2026-08-05",
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
    direction: "inflow",
    category: "Income",
    accountId: "acct_fixture_checking",
    merchantPattern: "Fixture Employer",
    nextRunAt: "2026-08-01",
    status: "active",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  },
  {
    id: "rr_fixture_groceries",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    name: "Weekly Groceries",
    cadence: "weekly",
    amount: 135,
    direction: "outflow",
    category: "Groceries",
    merchantPattern: "Market",
    nextRunAt: "2026-07-21",
    status: "active",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  },
  {
    id: "rr_fixture_energy",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    name: "Electric Bill",
    cadence: "monthly",
    amount: 100,
    direction: "outflow",
    category: "Utilities",
    accountId: "acct_fixture_checking",
    merchantPattern: "Fixture Energy",
    nextRunAt: "2026-08-08",
    status: "active",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  },
  {
    id: "rr_fixture_streaming",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    name: "Streaming Subscription",
    cadence: "monthly",
    amount: 15.99,
    direction: "outflow",
    category: "Entertainment",
    accountId: "acct_fixture_chase_sapphire",
    merchantPattern: "Stream Box",
    nextRunAt: "2026-08-12",
    status: "paused",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  },
  {
    id: "rr_fixture_insurance",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    name: "Annual Insurance",
    cadence: "yearly",
    amount: 720,
    direction: "outflow",
    category: "Utilities",
    accountId: "acct_fixture_checking",
    merchantPattern: "Fixture Insurance",
    nextRunAt: "2027-04-21",
    status: "active",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  }
].map((rule) => ({
  ...rule,
  linked_transaction_ids: TRANSACTIONS
    .filter((transaction) => transaction.recurring_rule_id === rule.id)
    .map((transaction) => transaction.id)
}));

const INVESTMENT_HOLDINGS = [
  {
    id: "inv_hold_fixture_voo",
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    accountId: "acct_fixture_brokerage",
    symbol: "VOO",
    quantity: 14,
    avgCost: 436.12,
    currency: "USD",
    asOfDate: "2026-07-15",
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
    asOfDate: "2026-07-15",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT
  }
];

const INVESTMENT_SNAPSHOTS = MONTHS.map((month, index) => {
  const totalCost = 5600 + index * 500;
  const marketValue = totalCost + [120, 165, 142, 230, 190, 275, 310, 288, 355, 420, 385, 470][index % 12];
  return {
    id: `inv_snap_${month.replace("-", "_")}`,
    userId: DETERMINISTIC_FIXTURE_USER_ID,
    accountId: "acct_fixture_brokerage",
    snapshotDate: `${month}-15`,
    marketValue,
    totalCost,
    unrealizedPnl: marketValue - totalCost,
    createdAt: UPDATED_AT,
    updatedAt: UPDATED_AT
  };
});

const FIXTURE_STORE = {
  fixtureMeta: {
    key: "deterministic-financial",
    version: DETERMINISTIC_FINANCIAL_FIXTURE_VERSION,
    generatedAt: "2026-07-18T00:00:00.000Z"
  },
  users: [
    {
      id: DETERMINISTIC_FIXTURE_USER_ID,
      email: "dev@minance.local",
      passwordHash:
        "d758d1a6c26919c5dbb416b9d0835b23eb77b66fd24a0f2b7e54d41d284af037d7311bf0b5adba156ad5bc315210ad0f1d4816afc5cf151b368a9e5b41a7dc7d",
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
      name: "Last 90 Days Spend",
      filters: {
        range: "90d",
        category_view: "granular"
      },
      layout: {
        cards: ["summary", "categories", "merchants"]
      },
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT
    },
    {
      id: "saved_view_fixture_002",
      userId: DETERMINISTIC_FIXTURE_USER_ID,
      name: "Recurring Essentials",
      filters: {
        range: "last_year",
        category_view: "coarse",
        category: ["Essential"],
        recurring: true
      },
      layout: { cards: ["trend", "categories", "merchants"] },
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT
    },
    {
      id: "saved_view_fixture_003",
      userId: DETERMINISTIC_FIXTURE_USER_ID,
      name: "Needs Review",
      filters: { range: "all", review_status: "needs_review" },
      layout: { cards: ["transactions"] },
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT
    }
  ],
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
    investmentSnapshots: (store.investmentSnapshots || []).length,
    savedViews: (store.savedViews || []).length
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
