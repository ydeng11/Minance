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
    categories: [],
    invertCategories: false,
    accounts: [],
    minAmount: "",
    maxAmount: "",
    range: "all",
    start: "",
    end: "",
    categoryView: "granular",
    transactionTypes: [],
    tag: "",
    page: 1,
    recurringRuleId: "",
    recurring: false,
    sortDirection: "desc"
  });
});

test("parseTransactionsFilterState reads supported query tokens", () => {
  const parsed = parseTransactionsFilterState(
    new URLSearchParams(
      "query=Transfer&category=Dining&category=Groceries&account=primary-checking&account=travel-card&range=custom&start=2026-01-01&end=2026-01-31&category_view=coarse&type=expense&type=transfer&tag=monthly"
    )
  );

  assert.deepEqual(parsed, {
    query: "Transfer",
    categories: ["Dining", "Groceries"],
    invertCategories: false,
    accounts: ["primary-checking", "travel-card"],
    minAmount: "",
    maxAmount: "",
    range: "custom",
    start: "2026-01-01",
    end: "2026-01-31",
    categoryView: "coarse",
    transactionTypes: ["expense", "transfer"],
    tag: "monthly",
    page: 1,
    recurringRuleId: "",
    recurring: false,
    sortDirection: "desc"
  });
});

test("parseTransactionsFilterState reads sort parameter", () => {
  const parsedAsc = parseTransactionsFilterState(
    new URLSearchParams("sort=asc")
  );
  assert.equal(parsedAsc.sortDirection, "asc");

  const parsedDesc = parseTransactionsFilterState(
    new URLSearchParams("sort=desc")
  );
  assert.equal(parsedDesc.sortDirection, "desc");

  const parsedDefault = parseTransactionsFilterState(new URLSearchParams(""));
  assert.equal(parsedDefault.sortDirection, "desc");
});

test("parseTransactionsFilterState reads and normalizes pagination page number", () => {
  const parsed = parseTransactionsFilterState(new URLSearchParams("query=Coffee&page=3"));
  assert.equal(parsed.query, "Coffee");
  assert.equal(parsed.minAmount, "");
  assert.equal(parsed.maxAmount, "");
  assert.equal(parsed.page, 3);
});

test("parseTransactionsFilterState falls back for invalid values", () => {
  const parsed = parseTransactionsFilterState(
    new URLSearchParams(
      "range=invalid&start=01-31-2026&end=bad&category_view=wrong&type=invalid&min_amount=nope&max_amount=-"
    )
  );

  assert.equal(parsed.minAmount, "");
  assert.equal(parsed.maxAmount, "");
  assert.equal(parsed.range, "all");
  assert.equal(parsed.start, "");
  assert.equal(parsed.end, "");
  assert.equal(parsed.categoryView, "granular");
  assert.deepEqual(parsed.categories, []);
  assert.deepEqual(parsed.accounts, []);
  assert.deepEqual(parsed.transactionTypes, []);
  assert.equal(parsed.page, 1);
});

test("parseTransactionsFilterState reads recurring_rule_id parameter", () => {
  const parsed = parseTransactionsFilterState(
    new URLSearchParams("recurring_rule_id=rrule_abc123")
  );
  assert.equal(parsed.recurringRuleId, "rrule_abc123");
});

test("parseTransactionsFilterState reads recurring parameter", () => {
  const parsedTrue = parseTransactionsFilterState(
    new URLSearchParams("recurring=true")
  );
  assert.equal(parsedTrue.recurring, true);

  const parsedFalse = parseTransactionsFilterState(
    new URLSearchParams("recurring=false")
  );
  assert.equal(parsedFalse.recurring, false);

  const parsedMissing = parseTransactionsFilterState(new URLSearchParams(""));
  assert.equal(parsedMissing.recurring, false);
});

test("toTransactionsListApiParams sets recurring_rule_id to 'true' when recurring filter is on", () => {
  const params = toTransactionsListApiParams({
    ...createDefaultTransactionsFilterState(),
    recurring: true
  });
  assert.equal(params.recurring_rule_id, "true");
});

test("buildTransactionsFilterSearchParams includes recurring when true", () => {
  const searchParams = buildTransactionsFilterSearchParams({
    ...createDefaultTransactionsFilterState(),
    recurring: true
  });
  assert.equal(searchParams.get("recurring"), "true");
});

test("toTransactionsListApiParams serializes custom date mode and semantic filters", () => {
  const params = toTransactionsListApiParams({
    ...createDefaultTransactionsFilterState(),
    query: "rent",
    categories: ["Housing", "Travel"],
    accounts: ["fixture-checking", "travel-card"],
    minAmount: "25",
    maxAmount: "150",
    range: "custom",
    start: "2026-01-01",
    end: "2026-01-31",
    categoryView: "coarse",
    transactionTypes: ["expense", "transfer"],
    tag: "monthly",
    page: 3,
    recurringRuleId: "rrule_xyz",
    recurring: false
  });

  assert.deepEqual(Object.keys(params), [
    "category_view",
    "limit",
    "offset",
    "query",
    "category",
    "account",
    "min_amount",
    "max_amount",
    "transaction_type",
    "tag",
    "recurring_rule_id",
    "start",
    "end"
  ]);
});

test("toTransactionsListApiParams passes sort_direction when sortDirection is asc", () => {
  const params = toTransactionsListApiParams({
    ...createDefaultTransactionsFilterState(),
    sortDirection: "asc"
  });
  assert.equal(params.sort_direction, "asc");
});

test("toTransactionsListApiParams omits sort_direction when sortDirection is desc (default)", () => {
  const params = toTransactionsListApiParams({
    ...createDefaultTransactionsFilterState(),
    sortDirection: "desc"
  });
  assert.equal(Object.hasOwn(params, "sort_direction"), false);
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
    categories: ["Dining", "Groceries"],
    accounts: ["primary-checking", "travel-card"],
    minAmount: "15",
    maxAmount: "120",
    range: "custom",
    start: "2026-01-01",
    end: "2026-01-31",
    transactionTypes: ["expense", "transfer"],
    page: 4,
    recurringRuleId: "rrule_test"
  });

  assert.equal(
    searchParams.toString(),
    "query=Transfer&category=Dining&category=Groceries&account=primary-checking&account=travel-card&min_amount=15&max_amount=120&range=custom&start=2026-01-01&end=2026-01-31&type=expense&type=transfer&page=4&recurring_rule_id=rrule_test"
  );
});

test("toValidFilterState trims values and clears custom dates when not in custom range", () => {
  const validated = toValidFilterState({
    ...createDefaultTransactionsFilterState(),
    query: "  Rent  ",
    categories: ["  Housing  ", "Travel", "Housing"],
    accounts: [" fixture-checking ", "travel-card", "fixture-checking"],
    minAmount: " 20.5 ",
    maxAmount: " 140 ",
    range: "3m",
    start: "2026-01-01",
    end: "2026-01-31",
    categoryView: "granular",
    transactionTypes: ["expense", "transfer", "expense"],
    tag: "  monthly  ",
    page: 0,
    recurringRuleId: "  rrule_123  ",
    recurring: true
  });

  assert.deepEqual(validated, {
    query: "Rent",
    categories: ["Housing", "Travel"],
    invertCategories: false,
    accounts: ["fixture-checking", "travel-card"],
    minAmount: "20.5",
    maxAmount: "140",
    range: "3m",
    start: "",
    end: "",
    categoryView: "granular",
    transactionTypes: ["expense", "transfer"],
    tag: "monthly",
    page: 1,
    recurringRuleId: "rrule_123",
    recurring: true,
    sortDirection: "desc"
  });
});
