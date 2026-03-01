import test from "node:test";
import assert from "node:assert/strict";
import {
  analyticsApi,
  categoriesApi,
  transactionsApi,
  type ApiRequest
} from "./endpoints";

function createRecorder() {
  const calls: Array<{ path: string; options: Record<string, unknown> | undefined }> = [];
  const request: ApiRequest = async (path, options) => {
    calls.push({
      path,
      options: options ? { ...options } : undefined
    });
    return {} as never;
  };

  return { calls, request };
}

test("transactionsApi.list forwards coarse/granular view and review flag", async () => {
  const { calls, request } = createRecorder();
  await transactionsApi.list(request, {
    range: "90d",
    category: "Essential",
    category_view: "coarse",
    needs_category_review: true
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].path,
    "/v1/transactions?range=90d&category=Essential&category_view=coarse&needs_category_review=true"
  );
});

test("analyticsApi.overview includes category_view query param", async () => {
  const { calls, request } = createRecorder();
  await analyticsApi.overview(request, {
    range: "all",
    category_view: "granular"
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/v1/analytics/overview?range=all&category_view=granular");
});

test("categoriesApi strategy endpoints use expected routes and methods", async () => {
  const { calls, request } = createRecorder();

  await categoriesApi.getStrategy(request);
  await categoriesApi.saveStrategy(request, {
    coarseCategories: [
      { key: "essential", name: "Essential", emoji: "🟢", isExcluded: false, order: 1 }
    ]
  });
  await categoriesApi.add(request, {
    name: "Auto",
    emoji: "🚗",
    coarseKey: "essential"
  });

  assert.equal(calls[0].path, "/v1/category-strategy");
  assert.equal(calls[1].path, "/v1/category-strategy");
  assert.equal(calls[1].options?.method, "PUT");
  assert.equal(calls[2].path, "/v1/categories");
  assert.equal(calls[2].options?.method, "POST");
});
