import test from "node:test";
import assert from "node:assert/strict";
import { ALL_TOOLS } from "../../src/llm/tool-spec.ts";

// ---------------------------------------------------------------------------
// ToolSpec integrity
// ---------------------------------------------------------------------------

test("benefits tools are registered in ALL_TOOLS", () => {
  const benefitNames = [
    "list_credit_cards",
    "get_card_benefits",
    "get_benefit_usage",
    "get_best_card_for_category",
    "get_annual_fee_analysis",
    "get_annual_credits",
    "save_card_benefit",
    "delete_card_benefit"
  ];

  for (const name of benefitNames) {
    const tool = ALL_TOOLS.find((t) => t.name === name);
    assert.ok(tool, `Tool ${name} should be registered`);
    assert.equal(tool.name, name);
    assert.ok(tool.schema, `${name} should have a schema`);
  }
});

test("benefits write tools have requiresConfirmation", () => {
  const writeTools = ALL_TOOLS.filter((t) => t.access === "write" && t.category === "benefits");
  for (const tool of writeTools) {
    assert.ok(tool.requiresConfirmation, `${tool.name} should require confirmation`);
  }
});

test("benefits read tools do not require confirmation", () => {
  const readTools = ALL_TOOLS.filter((t) => t.access === "read" && t.category === "benefits");
  for (const tool of readTools) {
    assert.equal(tool.requiresConfirmation, undefined, `${tool.name} should not require confirmation`);
  }
});

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

test("list_credit_cards schema has no required params", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "list_credit_cards")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  assert.deepEqual(params.properties, {});
  assert.deepEqual(params.required, []);
});

test("get_card_benefits requires account_id", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "get_card_benefits")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  assert.ok((params.required as string[]).includes("account_id"));
});

test("get_benefit_usage requires benefit_id", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "get_benefit_usage")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  assert.ok((params.required as string[]).includes("benefit_id"));
});

test("get_best_card_for_category requires category, optional spend_amount", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "get_best_card_for_category")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  assert.ok((params.required as string[]).includes("category"));
  // spend_amount should NOT be required
  const required = params.required as string[];
  assert.ok(!required.includes("spend_amount"), "spend_amount should be optional");
});

test("get_annual_fee_analysis requires benefit_id", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "get_annual_fee_analysis")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  assert.ok((params.required as string[]).includes("benefit_id"));
});

test("get_annual_credits requires benefit_id", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "get_annual_credits")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  assert.ok((params.required as string[]).includes("benefit_id"));
});

test("save_card_benefit requires account_id and rate, accepts _mode", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "save_card_benefit")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  const required = params.required as string[];
  assert.ok(required.includes("account_id"));
  assert.ok(required.includes("rate"));
  const props = params.properties as Record<string, { enum?: string[] }>;
  assert.ok(props._mode?.enum?.includes("preview"));
  assert.ok(props._mode?.enum?.includes("execute"));
});

test("delete_card_benefit requires benefit_id, accepts _mode", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "delete_card_benefit")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  const required = params.required as string[];
  assert.ok(required.includes("benefit_id"));
  const props = params.properties as Record<string, { enum?: string[] }>;
  assert.ok(props._mode?.enum?.includes("preview"));
  assert.ok(props._mode?.enum?.includes("execute"));
});

// ---------------------------------------------------------------------------
// Access levels
// ---------------------------------------------------------------------------

test("benefits tools have correct categories", () => {
  const benefitNames = [
    "list_credit_cards",
    "get_card_benefits",
    "get_benefit_usage",
    "get_best_card_for_category",
    "get_annual_fee_analysis",
    "get_annual_credits",
    "save_card_benefit",
    "delete_card_benefit"
  ];

  for (const name of benefitNames) {
    const tool = ALL_TOOLS.find((t) => t.name === name)!;
    assert.equal(tool.category, "benefits", `${name} should have category 'benefits'`);
  }
});

test("all benefits tools have descriptions", () => {
  const benefitTools = ALL_TOOLS.filter((t) => t.category === "benefits");
  for (const tool of benefitTools) {
    assert.ok(tool.description, `${tool.name} should have a description`);
    assert.ok(tool.description.length > 10, `${tool.name} description should be meaningful`);
  }
});

test("all benefits tool names are unique", () => {
  const benefitTools = ALL_TOOLS.filter((t) => t.category === "benefits");
  const names = benefitTools.map((t) => t.name);
  const uniqueNames = new Set(names);
  assert.equal(names.length, uniqueNames.size, "All benefits tool names must be unique");
});

// ---------------------------------------------------------------------------
// Benefits store tests
// ---------------------------------------------------------------------------

test("benefits-store exports expected functions", async () => {
  const benefitsStore = await import("../../src/llm/benefits-store.ts");
  const exportedFns = [
    "getBenefitsForUser",
    "getBenefitsForAccount",
    "getBenefit",
    "addBenefit",
    "updateBenefit",
    "deleteBenefit",
    "seedBenefits",
    "resetBenefitsStore",
    "calculateBenefitUsage",
    "getBestCardForCategory",
    "getAnnualFeeAnalysis",
    "getAnnualCreditsUsage"
  ];
  for (const fn of exportedFns) {
    assert.equal(typeof benefitsStore[fn as keyof typeof benefitsStore], "function",
      `${fn} should be a function`);
  }
});

test("benefits-store CRUD operations", async () => {
  const store = await import("../../src/llm/benefits-store.ts");

  // Clean slate
  store.resetBenefitsStore();
  assert.deepEqual(await store.getBenefitsForUser("user_1"), []);

  // Add
  const benefit = await store.addBenefit("user_1", {
    userId: "user_1",
    accountId: "acct_1",
    cardName: "Test Card",
    issuer: "Test Bank",
    benefitType: "rate",
    category: "Dining",
    merchant: null,
    rate: 3.0,
    capAmount: 500,
    capPeriod: "monthly",
    annualFee: 0,
    annualCredits: []
  });
  assert.ok(benefit.id);
  assert.equal(benefit.cardName, "Test Card");
  assert.equal(benefit.rate, 3.0);

  // Get
  const retrieved = await store.getBenefit("user_1", benefit.id);
  assert.ok(retrieved);
  assert.equal(retrieved!.id, benefit.id);

  // Update
  const updated = await store.updateBenefit("user_1", benefit.id, { rate: 4.0 });
  assert.ok(updated);
  assert.equal(updated!.rate, 4.0);

  // Delete
  const deleted = await store.deleteBenefit("user_1", benefit.id);
  assert.equal(deleted, true);
  assert.equal(await store.getBenefit("user_1", benefit.id), undefined);

  // User isolation
  assert.deepEqual(await store.getBenefitsForUser("user_2"), []);
});

test("benefits-store seed and reset", async () => {
  const store = await import("../../src/llm/benefits-store.ts");
  store.resetBenefitsStore();
  store.seedBenefits("user_1", [
    {
      id: "cbnf_test_1",
      userId: "user_1",
      accountId: "acct_1",
      cardName: "Card A",
      issuer: "Bank A",
      benefitType: "rate",
      category: "Dining",
      rate: 3.0,
      capAmount: 300,
      capPeriod: "monthly",
      annualFee: 0,
      annualCredits: []
    }
  ]);
  assert.equal((await store.getBenefitsForUser("user_1")).length, 1);
  store.resetBenefitsStore();
  assert.equal((await store.getBenefitsForUser("user_1")).length, 0);
});

// ---------------------------------------------------------------------------
// Annual credits
// ---------------------------------------------------------------------------

test("getAnnualCreditsUsage returns correct remaining", async () => {
  const store = await import("../../src/llm/benefits-store.ts");
  const benefit = {
    id: "cbnf_test_credits",
    userId: "user_1",
    accountId: "acct_1",
    cardName: "Test Card",
    issuer: "Test",
    benefitType: "rate",
    category: null,
    rate: 2.0,
    capAmount: null,
    capPeriod: null,
    annualFee: 100,
    annualCredits: [
      { name: "Uber Cash", amount: 120, used: 50 },
      { name: "Travel Credit", amount: 300, used: 100 }
    ]
  };

  const credits = store.getAnnualCreditsUsage(benefit);
  assert.equal(credits.length, 2);
  assert.equal(credits[0].name, "Uber Cash");
  assert.equal(credits[0].amount, 120);
  assert.equal(credits[0].used, 50);
  assert.equal(credits[0].remaining, 70);
  assert.equal(credits[1].remaining, 200);
});
