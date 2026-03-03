import test from "node:test";
import assert from "node:assert/strict";
import {
  getImportMappingTemplates,
  resolveTemplateMapping
} from "./mappingTemplates";

test("resolveTemplateMapping maps generic statement headers deterministically", () => {
  const template = getImportMappingTemplates().find((entry) => entry.id === "generic_statement");
  assert.ok(template);

  const headers = [
    "Transaction Date",
    "Description",
    "Amount",
    "Currency",
    "Account Name",
    "Category"
  ];

  const resolved = resolveTemplateMapping(template, headers);

  assert.equal(resolved.mapping.date, "Transaction Date");
  assert.equal(resolved.mapping.merchant, "Description");
  assert.equal(resolved.mapping.amount, "Amount");
  assert.equal(resolved.mapping.currency, "Currency");
  assert.equal(resolved.mapping.account, "Account Name");
  assert.equal(resolved.mapping.category_raw, "Category");
  assert.ok(resolved.unmatchedFields.includes("memo"));
});

test("resolveTemplateMapping falls back to seeded mapping when template headers are missing", () => {
  const template = getImportMappingTemplates().find((entry) => entry.id === "balance_snapshot");
  assert.ok(template);

  const headers = ["Date", "Balance", "Account", "Reference"];
  const seed = {
    memo: "Reference",
    description: "Reference"
  };

  const resolved = resolveTemplateMapping(template, headers, seed);

  assert.equal(resolved.mapping.date, "Date");
  assert.equal(resolved.mapping.amount, "Balance");
  assert.equal(resolved.mapping.account, "Account");
  assert.equal(resolved.mapping.description, "Reference");
  assert.equal(resolved.mapping.memo, null);
});

test("resolveTemplateMapping does not reuse the same header across multiple fields", () => {
  const template = getImportMappingTemplates().find((entry) => entry.id === "generic_statement");
  assert.ok(template);

  const headers = ["Description", "Amount", "Date"];
  const resolved = resolveTemplateMapping(template, headers);

  assert.equal(resolved.mapping.merchant, "Description");
  assert.equal(resolved.mapping.description, null);
});
