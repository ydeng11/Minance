import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTransactionsFilterSearchParams,
  createDefaultTransactionsFilterState,
  parseTransactionsFilterState,
  toTransactionsListApiParams,
  toTransactionsOverviewApiParams,
  toValidFilterState
} from "./filters";

test("createDefaultTransactionsFilterState returns expected defaults", () => {
  assert.deepEqual(createDefaultTransactionsFilterState(), {
    query: "",
    category: "",
    account: "",
    range: "all",
    start: "",
    end: "",
    categoryView: "granular",
    review: "all",
    transactionType: "all",
    tag: ""
  });
});

test("parseTransactionsFilterState reads supported query tokens", () => {
  const parsed = parseTransactionsFilterState(
    new URLSearchParams(
      "query=Transfer&category=Dining&account=primary-checking&range=custom&start=2026-01-01&end=2026-01-31&category_view=coarse&review=needs_review&type=transfer&tag=monthly"
    )
  );

  assert.deepEqual(parsed, {
    query: "Transfer",
    category: "Dining",
    account: "primary-checking",
    range: "custom",
    start: "2026-01-01",
    end: "2026-01-31",
    categoryView: "coarse",
    review: "needs_review",
    transactionType: "transfer",
    tag: "monthly"
  });
});

test("parseTransactionsFilterState falls back for invalid values", () => {
  const parsed = parseTransactionsFilterState(
    new URLSearchParams(
      "range=invalid&start=01-31-2026&end=bad&category_view=wrong&review=invalid&type=invalid"
    )
  );

  assert.equal(parsed.range, "all");
  assert.equal(parsed.start, "");
  assert.equal(parsed.end, "");
  assert.equal(parsed.categoryView, "granular");
  assert.equal(parsed.review, "all");
  assert.equal(parsed.transactionType, "all");
});

test("toTransactionsListApiParams serializes custom date mode and semantic filters", () => {
  const params = toTransactionsListApiParams({
    query: "rent",
    category: "Housing",
    account: "fixture-checking",
    range: "custom",
    start: "2026-01-01",
    end: "2026-01-31",
    categoryView: "coarse",
    review: "reviewed",
    transactionType: "expense",
    tag: "monthly"
  });

  assert.deepEqual(params, {
    query: "rent",
    category: "Housing",
    account: "fixture-checking",
    start: "2026-01-01",
    end: "2026-01-31",
    category_view: "coarse",
    review_status: "reviewed",
    transaction_type: "expense",
    tag: "monthly",
    limit: 200
  });
});

test("toTransactionsOverviewApiParams uses range for presets and start/end for custom", () => {
  assert.deepEqual(
    toTransactionsOverviewApiParams({
      ...createDefaultTransactionsFilterState(),
      range: "90d",
      categoryView: "granular"
    }),
    {
      range: "90d",
      category_view: "granular"
    }
  );

  assert.deepEqual(
    toTransactionsOverviewApiParams({
      ...createDefaultTransactionsFilterState(),
      range: "custom",
      start: "2026-02-01",
      end: "2026-02-28",
      categoryView: "coarse"
    }),
    {
      start: "2026-02-01",
      end: "2026-02-28",
      category_view: "coarse"
    }
  );
});

test("buildTransactionsFilterSearchParams writes only non-default tokens", () => {
  const searchParams = buildTransactionsFilterSearchParams({
    ...createDefaultTransactionsFilterState(),
    query: "Transfer",
    account: "primary-checking",
    range: "custom",
    start: "2026-01-01",
    end: "2026-01-31",
    review: "needs_review",
    transactionType: "transfer"
  });

  assert.equal(
    searchParams.toString(),
    "query=Transfer&account=primary-checking&range=custom&start=2026-01-01&end=2026-01-31&review=needs_review&type=transfer"
  );
});

test("toValidFilterState trims values and clears custom dates when not in custom range", () => {
  const validated = toValidFilterState({
    query: "  Rent  ",
    category: "  Housing  ",
    account: " fixture-checking ",
    range: "90d",
    start: "2026-01-01",
    end: "2026-01-31",
    categoryView: "granular",
    review: "all",
    transactionType: "all",
    tag: "  monthly  "
  });

  assert.deepEqual(validated, {
    query: "Rent",
    category: "Housing",
    account: "fixture-checking",
    range: "90d",
    start: "",
    end: "",
    categoryView: "granular",
    review: "all",
    transactionType: "all",
    tag: "monthly"
  });
});
