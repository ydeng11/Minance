import test from "node:test";
import assert from "node:assert/strict";
import { ALL_TOOLS, ALLOWED_CATEGORIES, VALID_CADENCES, VALID_SOURCES, VALID_DIRECTIONS } from "../../src/llm/tool-spec.ts";

// ---------------------------------------------------------------------------
// ToolSpec registry integrity
// ---------------------------------------------------------------------------

test("ALL_TOOLS is non-empty", () => {
  assert.ok(ALL_TOOLS.length > 0);
});

test("every tool has a unique name", () => {
  const names = ALL_TOOLS.map((t) => t.name);
  const unique = new Set(names);
  assert.equal(names.length, unique.size, "All tool names must be unique");
});

test("every tool has a non-empty description", () => {
  for (const tool of ALL_TOOLS) {
    assert.ok(tool.description?.length >= 5, `${tool.name} must have a description`);
  }
});

test("every tool has a valid schema", () => {
  for (const tool of ALL_TOOLS) {
    assert.ok(tool.schema, `${tool.name} must have a schema`);
    assert.equal(tool.schema.type, "function");
    assert.ok(tool.schema.function, `${tool.name} schema must have function`);
    assert.equal(tool.schema.function.name, tool.name, `Schema name must match tool name`);
    assert.ok(tool.schema.function.parameters, `${tool.name} schema must have parameters`);
    assert.ok(tool.schema.function.parameters.properties !== undefined,
      `${tool.name} schema parameters must have properties`);
    assert.ok(Array.isArray(tool.schema.function.parameters.required),
      `${tool.name} schema parameters must have required array`);
  }
});

test("every tool has valid access level", () => {
  for (const tool of ALL_TOOLS) {
    assert.ok(tool.access === "read" || tool.access === "write",
      `${tool.name} access must be 'read' or 'write'`);
  }
});

test("every tool has valid category", () => {
  const validCategories = ["analytics", "subscriptions", "benefits", "budgeting", "system"];
  for (const tool of ALL_TOOLS) {
    assert.ok(validCategories.includes(tool.category),
      `${tool.name} category '${tool.category}' must be one of ${validCategories.join(", ")}`);
  }
});

test("write tools have requiresConfirmation flag", () => {
  for (const tool of ALL_TOOLS) {
    if (tool.access === "write") {
      assert.equal(typeof tool.requiresConfirmation, "boolean",
        `${tool.name} must have requiresConfirmation boolean`);
    }
  }
});

test("every tool has an execute function", () => {
  for (const tool of ALL_TOOLS) {
    assert.equal(typeof tool.execute, "function", `${tool.name} must have execute function`);
  }
});

// ---------------------------------------------------------------------------
// Constants validation
// ---------------------------------------------------------------------------

test("ALLOWED_CATEGORIES is non-empty", () => {
  assert.ok(ALLOWED_CATEGORIES.length > 0);
  assert.ok(ALLOWED_CATEGORIES.includes("Dining"));
  assert.ok(ALLOWED_CATEGORIES.includes("Groceries"));
});

test("VALID_CADENCES contains expected values", () => {
  assert.ok(VALID_CADENCES.includes("weekly"));
  assert.ok(VALID_CADENCES.includes("monthly"));
  assert.ok(VALID_CADENCES.includes("yearly"));
  assert.equal(VALID_CADENCES.length, 5);
});

test("VALID_SOURCES contains expected values", () => {
  assert.ok(VALID_SOURCES.includes("history"));
  assert.ok(VALID_SOURCES.includes("inferred"));
});

test("VALID_DIRECTIONS contains expected values", () => {
  assert.ok(VALID_DIRECTIONS.includes("inflow"));
  assert.ok(VALID_DIRECTIONS.includes("outflow"));
});

// ---------------------------------------------------------------------------
// Legacy backward compat check
// ---------------------------------------------------------------------------

test("QA tools match schema names from ALL_TOOLS", async () => {
  const { QA_TOOLS } = await import("../../src/llm/tools.ts");
  const qaNames = new Set(QA_TOOLS.map((t: { function: { name: string } }) => t.function.name));
  const analyticsTools = ALL_TOOLS.filter((t) => ["analytics", "system"].includes(t.category));
  for (const tool of analyticsTools) {
    assert.ok(qaNames.has(tool.name), `${tool.name} should be in QA_TOOLS`);
  }
});
