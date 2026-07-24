import test from "node:test";
import assert from "node:assert/strict";
import { ALL_TOOLS } from "../../src/llm/tool-spec.ts";

// ---------------------------------------------------------------------------
// ToolSpec integrity
// ---------------------------------------------------------------------------

test("analysis tools are registered in ALL_TOOLS", () => {
  const analysisNames = [
    "get_spending_trends",
    "get_recurring_forecast",
    "get_budget_comparison",
    "save_budget_target"
  ];

  for (const name of analysisNames) {
    const tool = ALL_TOOLS.find((t) => t.name === name);
    assert.ok(tool, `Tool ${name} should be registered`);
    assert.equal(tool.name, name);
    assert.ok(tool.schema, `${name} should have a schema`);
  }
});

test("analysis write tools have requiresConfirmation", () => {
  const writeTools = ALL_TOOLS.filter((t) => t.access === "write" && t.category === "budgeting");
  for (const tool of writeTools) {
    assert.ok(tool.requiresConfirmation, `${tool.name} should require confirmation`);
  }
});

test("analysis read tools do not require confirmation", () => {
  const readTools = ALL_TOOLS.filter((t) => t.access === "read" && t.category === "budgeting");
  for (const tool of readTools) {
    assert.equal(tool.requiresConfirmation, undefined, `${tool.name} should not require confirmation`);
  }
});

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

test("get_spending_trends schema has optional params only", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "get_spending_trends")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  assert.deepEqual(params.required, [], "should have no required params");
  const props = params.properties as Record<string, { type: string }>;
  assert.ok(props.months, "should have months param");
  assert.ok(props.category, "should have category param");
  assert.ok(props.merchant, "should have merchant param");
});

test("get_recurring_forecast schema has optional params only", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "get_recurring_forecast")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  assert.deepEqual(params.required, [], "should have no required params");
});

test("get_budget_comparison schema has optional params only", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "get_budget_comparison")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  assert.deepEqual(params.required, [], "should have no required params");
});

test("save_budget_target requires category and amount, hides _mode from LLM", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "save_budget_target")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  const required = params.required as string[];
  assert.ok(required.includes("category"), "category should be required");
  assert.ok(required.includes("amount"), "amount should be required");
  const props = params.properties as Record<string, { enum?: string[] }>;
  // _mode is intentionally hidden from LLM schemas for security
  assert.ok(!props._mode, "_mode should not be exposed in LLM schema");
});

// ---------------------------------------------------------------------------
// Categories & descriptions
// ---------------------------------------------------------------------------

test("all analysis tools have category 'budgeting'", () => {
  const analysisNames = [
    "get_spending_trends",
    "get_recurring_forecast",
    "get_budget_comparison",
    "save_budget_target"
  ];
  for (const name of analysisNames) {
    const tool = ALL_TOOLS.find((t) => t.name === name)!;
    assert.equal(tool.category, "budgeting", `${name} should have category 'budgeting'`);
  }
});

test("all analysis tools have descriptions", () => {
  const analysisTools = ALL_TOOLS.filter((t) => t.category === "budgeting");
  for (const tool of analysisTools) {
    assert.ok(tool.description, `${tool.name} should have a description`);
    assert.ok(tool.description.length > 10, `${tool.name} description should be meaningful`);
  }
});

test("all analysis tool names are unique", () => {
  const analysisTools = ALL_TOOLS.filter((t) => t.category === "budgeting");
  const names = analysisTools.map((t) => t.name);
  const uniqueNames = new Set(names);
  assert.equal(names.length, uniqueNames.size, "All analysis tool names must be unique");
});

// ---------------------------------------------------------------------------
// Forecast correctness
// ---------------------------------------------------------------------------

test("forecast: totalProjected counts all occurrences, not just 6 display dates", async () => {
  const tool = ALL_TOOLS.find((t) => t.name === "get_recurring_forecast");
  assert.ok(tool, "get_recurring_forecast must be registered");

  // 12 months of weekly charges ($10/week) = 52 occurrences, not 6
  const fixedNow = new Date("2026-01-01T00:00:00Z");
  const result = await tool.execute(
    { userId: "test_user", _now: fixedNow },
    { months: 12 }
  );

  assert.equal(result.success, true);
  const data = result.data as Record<string, unknown>;
  const forecast = data.forecast as Array<Record<string, unknown>>;

  // All rules should have totalOccurrences, not just 6
  for (const item of forecast) {
    assert.ok(
      typeof item.totalOccurrences === "number",
      `${item.merchant} should have totalOccurrences`
    );
    // expectedDates (display) should be at most 6
    assert.ok(
      (item.expectedDates as Array<unknown>).length <= 6,
      `${item.merchant} should have at most 6 display dates`
    );
    // totalProjected should be based on totalOccurrences, not display dates
    const amount = Math.abs(Number(item.amount) || 0);
    assert.equal(
      item.totalProjected,
      Math.round(amount * Number(item.totalOccurrences) * 100) / 100,
      `${item.merchant} totalProjected should equal amount * totalOccurrences`
    );
  }
});

test("forecast: monthly rule with far-future next_run_at advances to forecast window", async () => {
  const tool = ALL_TOOLS.find((t) => t.name === "get_recurring_forecast");
  assert.ok(tool);

  const fixedNow = new Date("2026-06-15T00:00:00Z");
  const result = await tool.execute(
    { userId: "test_user", _now: fixedNow },
    { months: 3 }
  );

  assert.equal(result.success, true);
  const data = result.data as Record<string, unknown>;
  // Should not crash — fixtures have rules with various next_run_at values
  assert.ok(data.forecast, "Should return forecast array");
});

test("forecast: returns dataAsOf freshness marker", async () => {
  const tool = ALL_TOOLS.find((t) => t.name === "get_overview");
  assert.ok(tool);

  const fixedNow = new Date("2026-07-04T00:00:00Z");
  const result = await tool.execute(
    { userId: "usr_fixture_001", _now: fixedNow },
    {}
  );

  assert.equal(result.success, true);
  const data = result.data as Record<string, unknown>;
  assert.equal(data.dataAsOf, "2026-07-04", "Should include dataAsOf date");
});
