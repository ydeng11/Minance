import test from "node:test";
import assert from "node:assert/strict";
import type { SavedView } from "@/lib/api/types";
import {
  DEFAULT_SAVED_VIEW_ID,
  buildExplorerSavedViews,
  isDefaultSavedView
} from "./savedViews";

test("buildExplorerSavedViews always leads with an all-data three-month Default view", () => {
  const views = buildExplorerSavedViews([]);

  assert.equal(views.length, 1);
  assert.equal(views[0]?.id, DEFAULT_SAVED_VIEW_ID);
  assert.equal(views[0]?.name, "Default");
  assert.deepEqual(views[0]?.filters, {
    perspective: "overview",
    compare: "none",
    merchant: "",
    categories: [],
    invertCategories: false,
    account: "",
    range: "3m",
    start: "",
    end: "",
    categoryView: "granular",
    transactionTypes: [],
    direction: "all",
    tag: "",
    recurring: false,
    minAmount: "",
    maxAmount: ""
  });
});

test("buildExplorerSavedViews uses a persisted Default without duplicating it", () => {
  const persistedDefault: SavedView = {
    id: "view_default",
    userId: "user_1",
    name: "Default",
    filters: { range: "30d" },
    layout: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z"
  };
  const otherView: SavedView = {
    ...persistedDefault,
    id: "view_other",
    name: "Dining"
  };

  const views = buildExplorerSavedViews([otherView, persistedDefault]);

  assert.deepEqual(views.map((view) => view.id), ["view_default", "view_other"]);
  assert.equal(isDefaultSavedView(views[0]), true);
  assert.equal(isDefaultSavedView(views[1]), false);
});
