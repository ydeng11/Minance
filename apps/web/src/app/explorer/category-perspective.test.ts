import test from "node:test";
import assert from "node:assert/strict";
import { resolveVisibleCategoryLensItems } from "./components/CategoryPerspective";

const categoryItems = [
  { category: "Mortgage & Loan", amount: 300 },
  { category: "Groceries", amount: 200 },
  { category: "Travel", amount: 100 }
];

test("category lens hides selected categories when the category filter is inverted", () => {
  const visible = resolveVisibleCategoryLensItems(
    categoryItems,
    ["Mortgage & Loan", "Travel"],
    true
  );

  assert.deepEqual(
    visible.map((entry) => entry.category),
    ["Groceries"]
  );
});

test("category lens shows only selected categories when the category filter is not inverted", () => {
  const visible = resolveVisibleCategoryLensItems(
    categoryItems,
    ["Mortgage & Loan", "Travel"],
    false
  );

  assert.deepEqual(
    visible.map((entry) => entry.category),
    ["Mortgage & Loan", "Travel"]
  );
});
