import test from "node:test";
import assert from "node:assert/strict";
import {
  accountsApi,
  analyticsApi,
  assistantApi,
  categoriesApi,
  importsApi,
  investmentsApi,
  recurringsApi,
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

test("transactionsApi.list appends repeated category, account, and type params", async () => {
  const { calls, request } = createRecorder();
  await transactionsApi.list(request, {
    range: "90d",
    category: ["Essential", "Travel"],
    account: ["checking", "travel-card"],
    transaction_type: ["expense", "transfer"],
    category_view: "coarse",
    needs_category_review: true,
    min_amount: 25,
    max_amount: 250
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].path,
    "/v1/transactions?range=90d&category=Essential&category=Travel&account=checking&account=travel-card&transaction_type=expense&transaction_type=transfer&category_view=coarse&needs_category_review=true&min_amount=25&max_amount=250"
  );
});

test("transactionsApi.bulkUpdate targets bulk mutation contract", async () => {
  const { calls, request } = createRecorder();
  await transactionsApi.bulkUpdate(request, {
    transaction_ids: ["txn_1", "txn_2"],
    operation: "delete"
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/v1/transactions/bulk");
  assert.equal(calls[0].options?.method, "POST");
  assert.deepEqual(calls[0].options?.body, {
    transaction_ids: ["txn_1", "txn_2"],
    operation: "delete"
  });
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

test("analyticsApi.explorer includes perspective and compare query params", async () => {
  const { calls, request } = createRecorder();
  await analyticsApi.explorer(request, {
    range: "90d",
    category_view: "granular",
    perspective: "account",
    compare: "previous",
    account: "acct_card"
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].path,
    "/v1/analytics/explorer?range=90d&category_view=granular&perspective=account&compare=previous&account=acct_card"
  );
});

test("analyticsApi.explorer appends repeated category and type params", async () => {
  const { calls, request } = createRecorder();
  await analyticsApi.explorer(request, {
    category_view: "granular",
    category: ["Food", "Travel"],
    transaction_type: ["expense", "transfer"]
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].path,
    "/v1/analytics/explorer?category_view=granular&category=Food&category=Travel&transaction_type=expense&transaction_type=transfer"
  );
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
  await categoriesApi.update(request, "cat_123", {
    budget: {
      amount: 500,
      cadence: "monthly",
      currency: "USD",
      rollover: false
    }
  });
  await categoriesApi.remove(request, "cat_123");

  assert.equal(calls[0].path, "/v1/category-strategy");
  assert.equal(calls[1].path, "/v1/category-strategy");
  assert.equal(calls[1].options?.method, "PUT");
  assert.equal(calls[2].path, "/v1/categories");
  assert.equal(calls[2].options?.method, "POST");
  assert.equal(calls[3].path, "/v1/categories/cat_123");
  assert.equal(calls[3].options?.method, "PUT");
  assert.equal(calls[4].path, "/v1/categories/cat_123");
  assert.equal(calls[4].options?.method, "DELETE");
});

test("accountsApi routes provider and manual-create requests to /v1/accounts contracts", async () => {
  const { calls, request } = createRecorder();

  await accountsApi.listProviders(request);
  await accountsApi.getProvider(request, "manual csv");
  await accountsApi.createLinkSession(request, "manual_csv");
  await accountsApi.supportedAccountTypes(request);
  await accountsApi.list(request);
  await accountsApi.create(request, {
    sourceInstitution: "Chase",
    displayName: "Travel Card",
    accountType: "credit",
    currency: "USD",
    initialBalance: 25
  });
  await accountsApi.update(request, "acct_123", {
    displayName: "Travel Card v2",
    expectedVersion: 1
  });
  await accountsApi.updateSettings(request, "acct_123", {
    hidden: true,
    expectedVersion: 2
  });
  await accountsApi.remove(request, "acct_123");

  assert.equal(calls[0].path, "/v1/accounts/providers");
  assert.equal(calls[1].path, "/v1/accounts/providers/manual%20csv");
  assert.equal(calls[2].path, "/v1/accounts/providers/manual_csv/link-session");
  assert.equal(calls[2].options?.method, "POST");
  assert.equal(calls[3].path, "/v1/accounts/supported-account-types");
  assert.equal(calls[4].path, "/v1/accounts");
  assert.equal(calls[5].path, "/v1/accounts");
  assert.equal(calls[5].options?.method, "POST");
  assert.equal(calls[6].path, "/v1/accounts/acct_123");
  assert.equal(calls[6].options?.method, "PUT");
  assert.equal(calls[7].path, "/v1/accounts/acct_123/settings");
  assert.equal(calls[7].options?.method, "PUT");
  assert.equal(calls[8].path, "/v1/accounts/acct_123");
  assert.equal(calls[8].options?.method, "DELETE");
});

test("investmentsApi exposes overview, module endpoints, and CSV/manual mutations", async () => {
  const { calls, request } = createRecorder();

  await investmentsApi.overview(request, { timeframe: "3M", query: "nflx" });
  await investmentsApi.holdings(request);
  await investmentsApi.createHolding(request, {
    account_name: "Brokerage",
    symbol: "VOO",
    quantity: 10,
    average_cost: 400,
    market_price: 430
  });
  await investmentsApi.importCsv(request, {
    csvText: "Account,Ticker,Shares,Cost Basis,Market Price\\nBrokerage,VOO,10,400,430",
    sourceFileId: "import_1"
  });
  await investmentsApi.positions(request, { query: "voo" });
  await investmentsApi.accounts(request);
  await investmentsApi.performance(request, { timeframe: "1M", symbol: "VOO" });

  assert.equal(calls[0].path, "/v1/investments/overview?timeframe=3M&query=nflx");
  assert.equal(calls[1].path, "/v1/investments/holdings");
  assert.equal(calls[2].path, "/v1/investments/holdings");
  assert.equal(calls[2].options?.method, "POST");
  assert.equal(calls[3].path, "/v1/investments/holdings/import-csv");
  assert.equal(calls[3].options?.method, "POST");
  assert.equal(calls[4].path, "/v1/investments/positions?query=voo");
  assert.equal(calls[5].path, "/v1/investments/accounts");
  assert.equal(calls[6].path, "/v1/investments/performance?timeframe=1M&symbol=VOO");
});

test("investmentsApi query builder omits empty optional filters", async () => {
  const { calls, request } = createRecorder();

  await investmentsApi.overview(request, { query: "" });
  await investmentsApi.positions(request, {});
  await investmentsApi.performance(request, {});

  assert.equal(calls[0].path, "/v1/investments/overview");
  assert.equal(calls[1].path, "/v1/investments/positions");
  assert.equal(calls[2].path, "/v1/investments/performance");
});

test("importsApi exposes reconciliation query and resolution mutation contracts", async () => {
  const { calls, request } = createRecorder();

  await importsApi.getReconciliation(request, "imp_123");
  await importsApi.resolveReconciliation(request, "imp_123", {
    action: "create_manual_adjustment",
    accountId: "acct_123",
    amountDelta: -42.5,
    reason: "Resolve mismatch"
  });

  assert.equal(calls[0].path, "/v1/imports/imp_123/reconciliation");
  assert.equal(calls[1].path, "/v1/imports/imp_123/reconciliation/resolve");
  assert.equal(calls[1].options?.method, "POST");
});

test("importsApi no longer exposes a manual reprocess endpoint helper in the web client", () => {
  assert.equal("reprocess" in importsApi, false);
});

test("assistantApi exposes conversation creation and scoped query contracts", async () => {
  const { calls, request } = createRecorder();

  await assistantApi.createConversation(request);
  await assistantApi.askInConversation(request, "conv_123", "Ignore transfer transactions");

  assert.equal(calls[0].path, "/v1/assistant/conversations");
  assert.equal(calls[0].options?.method, "POST");
  assert.equal(calls[1].path, "/v1/assistant/conversations/conv_123/query");
  assert.equal(calls[1].options?.method, "POST");
  assert.deepEqual(calls[1].options?.body, {
    question: "Ignore transfer transactions"
  });
});

test("recurringsApi routes lifecycle and evaluation contracts", async () => {
  const { calls, request } = createRecorder();

  await recurringsApi.list(request, { status: "active" });
  await recurringsApi.getById(request, "rrule_1");
  await recurringsApi.create(request, {
    name: "Rent",
    cadence: "monthly",
    amount: 1850
  });
  await recurringsApi.update(request, "rrule_1", {
    status: "paused",
    merchant_pattern: "sunset"
  });
  await recurringsApi.evaluate(request, "rrule_1", {
    start: "2026-01-01",
    end: "2026-03-31"
  });
  await recurringsApi.pause(request, "rrule_1");
  await recurringsApi.resume(request, "rrule_1");
  await recurringsApi.archive(request, "rrule_1");
  await recurringsApi.remove(request, "rrule_1");

  assert.equal(calls[0].path, "/v1/recurrings?status=active");
  assert.equal(calls[1].path, "/v1/recurrings/rrule_1");
  assert.equal(calls[2].path, "/v1/recurrings");
  assert.equal(calls[2].options?.method, "POST");
  assert.equal(calls[3].path, "/v1/recurrings/rrule_1");
  assert.equal(calls[3].options?.method, "PUT");
  assert.equal(calls[4].path, "/v1/recurrings/rrule_1/evaluate");
  assert.equal(calls[4].options?.method, "POST");
  assert.equal(calls[5].path, "/v1/recurrings/rrule_1/pause");
  assert.equal(calls[6].path, "/v1/recurrings/rrule_1/resume");
  assert.equal(calls[7].path, "/v1/recurrings/rrule_1/archive");
  assert.equal(calls[8].path, "/v1/recurrings/rrule_1");
  assert.equal(calls[8].options?.method, "DELETE");
});
