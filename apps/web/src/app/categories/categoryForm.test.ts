import test from "node:test";
import assert from "node:assert/strict";
import type { Category } from "@/lib/api/types";
import {
  buildCategoryDraftFromCategory,
  createDefaultCategoryDraft,
  normalizeCategoryType,
  validateCategoryDraft
} from "./categoryForm";

function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat_1",
    userId: "user_1",
    name: "Dining",
    emoji: "🍽️",
    coarseKey: "essential",
    type: "expense",
    budget: null,
    isSystem: false,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides
  };
}

test("createDefaultCategoryDraft initializes a blank draft with default group", () => {
  assert.deepEqual(createDefaultCategoryDraft("neutral"), {
    name: "",
    emoji: "",
    coarseKey: "neutral",
    type: ""
  });
});

test("buildCategoryDraftFromCategory maps category values for editing", () => {
  assert.deepEqual(
    buildCategoryDraftFromCategory(
      createCategory({
        name: "Utilities",
        emoji: "💡",
        coarseKey: "extra",
        type: "expense"
      })
    ),
    {
      name: "Utilities",
      emoji: "💡",
      coarseKey: "extra",
      type: "expense"
    }
  );
});

test("validateCategoryDraft enforces required name and group", () => {
  const result = validateCategoryDraft(
    {
      name: "  ",
      emoji: "",
      coarseKey: "",
      type: ""
    },
    [],
    null
  );

  assert.equal(result.errors.name, "Category name is required.");
  assert.equal(result.errors.coarseKey, "Category group is required.");
});

test("validateCategoryDraft detects duplicates case-insensitively", () => {
  const existing = [createCategory({ id: "cat_existing", name: "Dining Out" })];
  const result = validateCategoryDraft(
    {
      name: " dining   out ",
      emoji: "",
      coarseKey: "essential",
      type: ""
    },
    existing,
    null
  );

  assert.equal(result.errors.name, "Category name already exists.");
});

test("validateCategoryDraft allows unchanged name while editing same category id", () => {
  const existing = [createCategory({ id: "cat_existing", name: "Dining Out" })];
  const result = validateCategoryDraft(
    {
      name: "Dining Out",
      emoji: "🍽️",
      coarseKey: "essential",
      type: "expense"
    },
    existing,
    "cat_existing"
  );

  assert.deepEqual(result.errors, {});
  assert.equal(result.normalizedName, "Dining Out");
  assert.equal(result.normalizedType, "expense");
});

test("normalizeCategoryType returns undefined for invalid values", () => {
  assert.equal(normalizeCategoryType("expense"), "expense");
  assert.equal(normalizeCategoryType(" income "), "income");
  assert.equal(normalizeCategoryType(""), undefined);
  assert.equal(normalizeCategoryType("invalid"), undefined);
});
