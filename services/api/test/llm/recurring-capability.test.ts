import test from "node:test";
import assert from "node:assert/strict";
import { ALL_TOOLS } from "../../src/llm/tool-spec.ts";

// ---------------------------------------------------------------------------
// ToolSpec integrity
// ---------------------------------------------------------------------------

test("recurring tools are registered in ALL_TOOLS", () => {
  const recurringNames = [
    "list_recurring_rules",
    "list_recurring_suggestions",
    "detect_recurring_patterns",
    "explain_recurring_rule",
    "create_recurring_rule",
    "dismiss_recurring_suggestion"
  ];

  for (const name of recurringNames) {
    const tool = ALL_TOOLS.find((t) => t.name === name);
    assert.ok(tool, `Tool ${name} should be registered`);
    assert.equal(tool.name, name);
    assert.ok(tool.schema, `${name} should have a schema`);
  }
});

test("mutation tools (create/dismiss) have requiresConfirmation=true", () => {
  const mutationNames = ["create_recurring_rule", "dismiss_recurring_suggestion"];
  for (const name of mutationNames) {
    const tool = ALL_TOOLS.find((t) => t.name === name);
    assert.ok(tool, `${name} should be registered`);
    assert.equal(tool!.requiresConfirmation, true, `${name} should require confirmation`);
  }
});

test("read tools do not require confirmation", () => {
  const readTools = ALL_TOOLS.filter((t) => t.access === "read" && t.category === "subscriptions");
  for (const tool of readTools) {
    assert.equal(tool.requiresConfirmation, undefined, `${tool.name} should not require confirmation`);
  }
});

// ---------------------------------------------------------------------------
// Subscription tool schemas
// ---------------------------------------------------------------------------

test("list_recurring_rules schema has no required params", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "list_recurring_rules")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  assert.deepEqual(params.properties, {});
  assert.deepEqual(params.required, []);
});

test("list_recurring_suggestions schema has no required params", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "list_recurring_suggestions")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  assert.deepEqual(params.properties, {});
  assert.deepEqual(params.required, []);
});

test("detect_recurring_patterns schema accepts optional merchant", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "detect_recurring_patterns")!;
  const params = tool.schema.function.parameters as Record<string, { type: string }>;
  assert.ok(params.properties);
  assert.ok(params.properties!.merchant);
  assert.deepEqual(params.required, []);
});

test("explain_recurring_rule schema requires rule_id", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "explain_recurring_rule")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  assert.ok(params.required);
  assert.ok((params.required as string[]).includes("rule_id"));
});

test("create_recurring_rule schema requires merchant/cadence/amount, hides _mode", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "create_recurring_rule")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  const required = params.required as string[];
  assert.ok(required.includes("merchant"));
  assert.ok(required.includes("cadence"));
  assert.ok(required.includes("amount"));
  const props = params.properties as Record<string, { enum?: string[] }>;
  // _mode is intentionally hidden from LLM schemas for security
  assert.ok(!props._mode, "_mode should not be exposed in LLM schema");
});

test("dismiss_recurring_suggestion schema requires suggestion_id, hides _mode", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "dismiss_recurring_suggestion")!;
  const params = tool.schema.function.parameters as Record<string, unknown>;
  const required = params.required as string[];
  assert.ok(required.includes("suggestion_id"));
  const props = params.properties as Record<string, { enum?: string[] }>;
  // _mode is intentionally hidden from LLM schemas for security
  assert.ok(!props._mode, "_mode should not be exposed in LLM schema");
});

// ---------------------------------------------------------------------------
// Deterministic pattern detection tests
// ---------------------------------------------------------------------------

test("detect_recurring_patterns access is read", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "detect_recurring_patterns")!;
  assert.equal(tool.access, "read");
  assert.equal(tool.category, "subscriptions");
});

test("create_recurring_rule access is write with confirmation", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "create_recurring_rule")!;
  assert.equal(tool.access, "write");
  assert.equal(tool.requiresConfirmation, true);
});

test("dismiss_recurring_suggestion access is write with confirmation", () => {
  const tool = ALL_TOOLS.find((t) => t.name === "dismiss_recurring_suggestion")!;
  assert.equal(tool.access, "write");
  assert.equal(tool.requiresConfirmation, true);
});

test("all recurring tools have unique names", () => {
  const recurringTools = ALL_TOOLS.filter((t) => t.category === "subscriptions");
  const names = recurringTools.map((t) => t.name);
  const uniqueNames = new Set(names);
  assert.equal(names.length, uniqueNames.size, "All recurring tool names must be unique");
});

test("all recurring tools have descriptions", () => {
  const recurringTools = ALL_TOOLS.filter((t) => t.category === "subscriptions");
  for (const tool of recurringTools) {
    assert.ok(tool.description, `${tool.name} should have a description`);
    assert.ok(tool.description.length > 10, `${tool.name} description should be meaningful`);
  }
});

test("recurring tools have valid categories", () => {
  const recurringTools = ALL_TOOLS.filter((t) => t.category === "subscriptions");
  for (const tool of recurringTools) {
    assert.equal(tool.category, "subscriptions");
  }
});
