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
    transactionType: "all",
    tag: "",
    page: 1
  });
});

test("parseTransactionsFilterState reads supported query tokens", () => {
  const parsed = parseTransactionsFilterState(
    new URLSearchParams(
      "query=Transfer&category=Dining&account=primary-checking&range=custom&start=2026-01-01&end=2026-01-31&category_view=coarse&type=transfer&tag=monthly"
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
    transactionType: "transfer",
    tag: "monthly",
    page: 1
  });
});

test("parseTransactionsFilterState reads and normalizes pagination page number", () => {
  const parsed = parseTransactionsFilterState(new URLSearchParams("query=Coffee&page=3"));
  assert.equal(parsed.query, "Coffee");
  assert.equal(parsed.page, 3);
});

test("parseTransactionsFilterState falls back for invalid values", () => {
  const parsed = parseTransactionsFilterState(
    new URLSearchParams(
      "range=invalid&start=01-31-2026&end=bad&category_view=wrong&type=invalid"
    )
  );

  assert.equal(parsed.range, "all");
  assert.equal(parsed.start, "");
  assert.equal(parsed.end, "");
  assert.equal(parsed.categoryView, "granular");
  assert.equal(parsed.transactionType, "all");
  assert.equal(parsed.page, 1);
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
    transactionType: "expense",
    tag: "monthly",
    page: 3
  });

  assert.deepEqual(params, {
    query: "rent",
    category: "Housing",
    account: "fixture-checking",
    start: "2026-01-01",
    end: "2026-01-31",
    category_view: "coarse",
    transaction_type: "expense",
    tag: "monthly",
    limit: 50,
    offset: 100
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
    transactionType: "transfer",
    page: 4
  });

  assert.equal(
    searchParams.toString(),
    "query=Transfer&account=primary-checking&range=custom&start=2026-01-01&end=2026-01-31&type=transfer&page=4"
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
    transactionType: "all",
    tag: "  monthly  ",
    page: 0
  });

  assert.deepEqual(validated, {
    query: "Rent",
    category: "Housing",
    account: "fixture-checking",
    range: "90d",
    start: "",
    end: "",
    categoryView: "granular",
    transactionType: "all",
    tag: "monthly",
    page: 1
  });
});
