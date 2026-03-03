import test from "node:test";
import assert from "node:assert/strict";
import type { Category, CategoryStrategyCoarse, CategoryStrategyGranular } from "@/lib/api/types";
import {
  createCoarseGroup,
  groupCategoriesByCoarse,
  moveCoarseGroup,
  sortCoarseGroups,
  syncGranularAssignment
} from "./categoryTaxonomy";

function createGroup(overrides: Partial<CategoryStrategyCoarse> = {}): CategoryStrategyCoarse {
  return {
    key: "essential",
    name: "Essential",
    emoji: "🟢",
    isExcluded: false,
    order: 1,
    ...overrides
  };
}

function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat_1",
    userId: "user_1",
    name: "Dining",
    emoji: "🍽️",
    coarseKey: "extra",
    type: "expense",
    budget: null,
    isSystem: false,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides
  };
}

test("sortCoarseGroups normalizes order and preserves sorted sequence", () => {
  const result = sortCoarseGroups([
    createGroup({ key: "neutral", name: "Neutral", order: 3 }),
    createGroup({ key: "extra", name: "Extra", order: 2 }),
    createGroup({ key: "essential", name: "Essential", order: 1 })
  ]);

  assert.deepEqual(result.map((entry) => entry.key), ["essential", "extra", "neutral"]);
  assert.deepEqual(result.map((entry) => entry.order), [1, 2, 3]);
});

test("moveCoarseGroup moves a group up or down and resequences order", () => {
  const starting = [
    createGroup({ key: "essential", order: 1 }),
    createGroup({ key: "extra", name: "Extra", order: 2 }),
    createGroup({ key: "neutral", name: "Neutral", order: 3 })
  ];

  const movedUp = moveCoarseGroup(starting, "neutral", "up");
  assert.deepEqual(movedUp.map((entry) => entry.key), ["essential", "neutral", "extra"]);
  assert.deepEqual(movedUp.map((entry) => entry.order), [1, 2, 3]);

  const movedDown = moveCoarseGroup(starting, "essential", "down");
  assert.deepEqual(movedDown.map((entry) => entry.key), ["extra", "essential", "neutral"]);
});

test("createCoarseGroup generates a unique normalized key", () => {
  const existing = [
    createGroup({ key: "essential" }),
    createGroup({ key: "custom_group", name: "Custom Group", order: 2 })
  ];

  const created = createCoarseGroup("Custom Group", "✨", existing);
  assert.equal(created?.key, "custom_group_2");
  assert.equal(created?.name, "Custom Group");
  assert.equal(created?.emoji, "✨");
});

test("groupCategoriesByCoarse builds buckets in coarse order with counts", () => {
  const groups = [
    createGroup({ key: "essential", order: 1 }),
    createGroup({ key: "extra", name: "Extra", order: 2 })
  ];
  const categories = [
    createCategory({ id: "cat_1", name: "Groceries", coarseKey: "essential" }),
    createCategory({ id: "cat_2", name: "Dining", coarseKey: "extra" }),
    createCategory({ id: "cat_3", name: "Transport", coarseKey: "essential" })
  ];

  const buckets = groupCategoriesByCoarse(categories, groups);
  assert.equal(buckets.length, 2);
  assert.equal(buckets[0].key, "essential");
  assert.equal(buckets[0].count, 2);
  assert.deepEqual(
    buckets[0].items.map((entry) => entry.name),
    ["Groceries", "Transport"]
  );
});

test("syncGranularAssignment updates existing granular item and appends missing one", () => {
  const starting: CategoryStrategyGranular[] = [
    {
      name: "Dining",
      emoji: "🍴",
      coarseKey: "extra",
      aliases: [],
      isSystem: true
    }
  ];

  const updated = syncGranularAssignment(starting, createCategory({ name: "Dining", emoji: "🍽️" }), "essential");
  assert.equal(updated.length, 1);
  assert.equal(updated[0].coarseKey, "essential");
  assert.equal(updated[0].emoji, "🍽️");

  const appended = syncGranularAssignment(updated, createCategory({ name: "Fuel", emoji: "⛽" }), "essential");
  assert.equal(appended.length, 2);
  assert.equal(appended[1].name, "Fuel");
  assert.equal(appended[1].coarseKey, "essential");
});
