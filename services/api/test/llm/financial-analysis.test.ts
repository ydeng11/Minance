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

test("save_budget_target requires category and amount, accepts _mode", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "save_budget_target")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  const required = params.required as string[];
  assert.ok(required.includes("category"), "category should be required");
  assert.ok(required.includes("amount"), "amount should be required");
  const props = params.properties as Record<string, { enum?: string[] }>;
  assert.ok(props._mode?.enum?.includes("preview"));
  assert.ok(props._mode?.enum?.includes("execute"));
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
