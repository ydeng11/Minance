import test from "node:test";
import assert from "node:assert/strict";
import { buildInstitutionSuggestions, normalizeInstitutionName } from "./presets";

test("normalizeInstitutionName maps legacy identifiers to display names", () => {
  assert.equal(normalizeInstitutionName("BANK_OF_AMERICA"), "Bank of America");
  assert.equal(normalizeInstitutionName("WELLS_FARGO"), "Wells Fargo");
  assert.equal(normalizeInstitutionName("CITI"), "Citibank");
  assert.equal(normalizeInstitutionName("CHASE"), "Chase");
  assert.equal(normalizeInstitutionName("AMEX"), "American Express");
  assert.equal(normalizeInstitutionName("PAYPAL"), "PayPal");
  assert.equal(normalizeInstitutionName("CASH_APP"), "Cash App");
});

test("normalizeInstitutionName passes through modern display names and unknown values", () => {
  assert.equal(normalizeInstitutionName("Bank of America"), "Bank of America");
  assert.equal(normalizeInstitutionName("  Chase  "), "Chase");
  assert.equal(normalizeInstitutionName("Local Credit Union"), "Local Credit Union");
  assert.equal(normalizeInstitutionName(""), "");
});

test("buildInstitutionSuggestions dedupes legacy identifiers against display-name presets", () => {
  const suggestions = buildInstitutionSuggestions([
    "BANK_OF_AMERICA",
    "Bank of America",
    "CHASE",
    "Wells Fargo"
  ]);

  assert.ok(suggestions.includes("Bank of America"));
  assert.equal(
    suggestions.filter((name) => name === "Bank of America").length,
    1
  );
  assert.ok(suggestions.includes("Chase"));
  assert.ok(suggestions.includes("Wells Fargo"));
});

test("buildInstitutionSuggestions dedupes case-insensitively and ignores empty values", () => {
  const suggestions = buildInstitutionSuggestions([
    "bank of america",
    "Bank of America",
    "",
    null,
    undefined,
    "   "
  ]);

  assert.equal(
    suggestions.filter((name) => name === "Bank of America").length,
    1
  );
});


test("normalizeInstitutionName resolves case-insensitive preset variants to the canonical display name", () => {
  assert.equal(normalizeInstitutionName("bank of america"), "Bank of America");
  assert.equal(normalizeInstitutionName("BANK OF AMERICA"), "Bank of America");
  assert.equal(normalizeInstitutionName("WELLS FARGO"), "Wells Fargo");
  assert.equal(normalizeInstitutionName("u.s. bank"), "U.S. Bank");
});

test("stored institution values always normalize to a suggestion key (grouping cannot orphan accounts)", () => {
  const stored = [
    "bank of america",
    "BANK_OF_AMERICA",
    "WELLS FARGO",
    "wells fargo",
    "CITI",
    "citibank",
    "Local Credit Union"
  ];

  const suggestions = new Set(buildInstitutionSuggestions(stored));
  for (const value of stored) {
    const key = normalizeInstitutionName(value);
    if (key) {
      assert.ok(
        suggestions.has(key),
        `"${value}" normalizes to "${key}" which is missing from the suggestions list`
      );
    }
  }
});

test("buildInstitutionSuggestions merges stored values with presets and sorts them", () => {
  const suggestions = buildInstitutionSuggestions(["Zeta Bank", "Bilt"]);

  assert.deepEqual(suggestions, [...suggestions].sort((a, b) => a.localeCompare(b)));
  assert.ok(suggestions.includes("Bilt"));
  assert.ok(suggestions.includes("Zeta Bank"));
  assert.ok(suggestions.includes("Capital One"));
  assert.ok(suggestions.includes("Bank of America"));
});
