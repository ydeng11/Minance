import test from "node:test";
import assert from "node:assert/strict";

import { resetStoreForTests } from "../src/store.js";
import {
  createManualInvestmentHolding,
  getInvestmentOverview,
  getInvestmentPerformance,
  getInvestmentPortfolio,
  importInvestmentHoldingsFromCsv,
  listInvestmentAccounts,
  listInvestmentHoldings,
  listInvestmentPositions,
  normalizeInvestmentHoldingInput
} from "../src/investments.js";

const USER_ID = "user_investments_1";

function resetForInvestments(storeOverrides = {}) {
  resetStoreForTests({
    users: [
      {
        id: USER_ID,
        email: "investments@example.com",
        passwordHash: "hash",
        salt: "salt",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    ...storeOverrides
  });
}

test("normalizeInvestmentHoldingInput maps aliases and validates fields", () => {
  const normalized = normalizeInvestmentHoldingInput(
    {
      account: "Primary Brokerage",
      ticker: "aapl",
      name: "Apple Inc.",
      class: "Large Cap",
      quantity: "2",
      avgCost: "123.456",
      price: "130.1",
      prev_close: "129.33",
      currency: "usd",
      date: "3/2/2026"
    },
    { sourceType: "csv", sourceFileId: " import_1 " }
  );

  assert.deepEqual(normalized, {
    account_name: "Primary Brokerage",
    symbol: "AAPL",
    asset_name: "Apple Inc.",
    asset_class: "large_cap",
    quantity: 2,
    average_cost: 123.46,
    market_price: 130.1,
    previous_close_price: 129.33,
    currency: "USD",
    as_of_date: "2026-03-02",
    source_type: "csv",
    source_file_id: "import_1"
  });

  assert.throws(
    () =>
      normalizeInvestmentHoldingInput({
        account_name: "Primary Brokerage",
        symbol: "BAD SYMBOL",
        quantity: 1,
        average_cost: 1,
        market_price: 1
      }),
    /Invalid symbol/
  );
});

test("manual holdings upsert by key and list only the requested user", () => {
  resetForInvestments();

  const first = createManualInvestmentHolding(USER_ID, {
    account_name: "Primary Brokerage",
    symbol: "AAPL",
    quantity: 10,
    average_cost: 100,
    market_price: 110,
    as_of_date: "2026-02-01"
  });

  const updated = createManualInvestmentHolding(USER_ID, {
    account_name: "Primary Brokerage",
    symbol: "aapl",
    quantity: 12,
    average_cost: 101.25,
    market_price: 111.5,
    as_of_date: "2026-02-01"
  });

  createManualInvestmentHolding(USER_ID, {
    account_name: "Primary Brokerage",
    symbol: "MSFT",
    quantity: 3,
    average_cost: 250,
    market_price: 252,
    as_of_date: "2026-02-05"
  });

  createManualInvestmentHolding("another-user", {
    account_name: "External Brokerage",
    symbol: "AAPL",
    quantity: 99,
    average_cost: 1,
    market_price: 1,
    as_of_date: "2026-02-01"
  });

  assert.equal(updated.id, first.id);
  assert.equal(updated.quantity, 12);
  assert.equal(updated.source_type, "manual");

  const listed = listInvestmentHoldings(USER_ID).items;
  assert.equal(listed.length, 2);
  assert.deepEqual(
    listed.map((entry) => entry.symbol),
    ["MSFT", "AAPL"]
  );
  assert.equal(listed.some((entry) => entry.user_id !== USER_ID), false);
});

test("csv import distinguishes created versus updated holdings and keeps csv source metadata", () => {
  resetForInvestments();

  const existing = createManualInvestmentHolding(USER_ID, {
    account_name: "Primary Brokerage",
    symbol: "AAPL",
    quantity: 8,
    average_cost: 120,
    market_price: 132,
    as_of_date: "2026-03-01"
  });

  const csvText = [
    "Account,Ticker,Shares,Cost Basis,Market Price,Previous Close,Currency,As Of",
    "Primary Brokerage,AAPL,9,121,133,130,USD,2026-03-01",
    "Primary Brokerage,QQQ,4,320,328,326,USD,2026-03-01"
  ].join("\n");

  const result = importInvestmentHoldingsFromCsv(USER_ID, csvText, { sourceFileId: "file_2026_03_01" });
  assert.equal(result.total_rows, 2);
  assert.equal(result.imported.length, 1);
  assert.equal(result.updated.length, 1);
  assert.equal(result.updated[0], existing.id);

  const listed = listInvestmentHoldings(USER_ID).items;
  const aapl = listed.find((entry) => entry.id === existing.id);
  const qqq = listed.find((entry) => entry.symbol === "QQQ");

  assert.equal(aapl?.source_type, "csv");
  assert.equal(aapl?.source_file_id, "file_2026_03_01");
  assert.equal(aapl?.quantity, 9);
  assert.equal(qqq?.source_type, "csv");
});

test("csv import validates required investment columns", () => {
  resetForInvestments();

  const missingAccountColumn = ["Ticker,Shares,Cost Basis,Market Price", "AAPL,1,100,101"].join("\n");
  assert.throws(
    () => importInvestmentHoldingsFromCsv(USER_ID, missingAccountColumn),
    /CSV is missing required investments column: account_name/
  );
});

test("portfolio snapshot uses the latest holding per account+symbol and computes metrics", () => {
  resetForInvestments({
    investmentHoldings: [
      {
        id: "legacy_voo_old",
        userId: USER_ID,
        accountName: "Primary Brokerage",
        symbol: "VOO",
        quantity: 10,
        avgCost: 400,
        marketPrice: 430,
        asOfDate: "2026-03-01",
        currency: "USD",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z"
      },
      {
        id: "legacy_voo_new",
        userId: USER_ID,
        accountName: "Primary Brokerage",
        symbol: "VOO",
        quantity: 10,
        avgCost: 400,
        marketPrice: 440,
        asOfDate: "2026-03-02",
        currency: "USD",
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z"
      },
      {
        id: "hold_bnd",
        user_id: USER_ID,
        account_name: "Primary Brokerage",
        symbol: "BND",
        quantity: 20,
        average_cost: 70,
        market_price: 72,
        previous_close_price: 71,
        as_of_date: "2026-03-01",
        currency: "USD",
        created_at: "2026-03-01T00:00:00.000Z",
        updated_at: "2026-03-01T00:00:00.000Z"
      }
    ]
  });

  const portfolio = getInvestmentPortfolio(USER_ID);
  assert.equal(portfolio.positions.length, 2);
  assert.equal(portfolio.summary.position_count, 2);
  assert.equal(portfolio.summary.total_market_value, 5840);
  assert.equal(portfolio.summary.total_cost_basis, 5400);
  assert.equal(portfolio.summary.unrealized_gain, 440);
  assert.equal(portfolio.summary.day_change_value, 20);

  const bySymbol = Object.fromEntries(portfolio.positions.map((position) => [position.symbol, position]));
  assert.equal(bySymbol.VOO.market_price, 440);
  assert.equal(bySymbol.VOO.market_value, 4400);
  assert.equal(bySymbol.BND.day_change_value, 20);
});

test("overview, positions, accounts, and performance projections stay deterministic", () => {
  resetForInvestments();

  importInvestmentHoldingsFromCsv(
    USER_ID,
    [
      "Account,Ticker,Shares,Cost Basis,Market Price,Previous Close,As Of",
      "Primary Brokerage,NFLX,2,200,250,248,2026-02-01",
      "Primary Brokerage,NFLX,2,200,255,252,2026-03-01",
      "Primary Brokerage,VOO,10,430,440,438,2026-03-01"
    ].join("\n"),
    { sourceFileId: "series_file_001" }
  );

  const overview = getInvestmentOverview(USER_ID, { timeframe: "3M", query: "nflx" });
  assert.equal(overview.timeframe, "3M");
  assert.equal(Array.isArray(overview.positions), true);
  assert.equal(overview.positions.length, 1);
  assert.equal(overview.positions[0].symbol, "NFLX");
  assert.equal(overview.summary.position_count, 2);
  assert.equal(Array.isArray(overview.accounts), true);
  assert.equal(Array.isArray(overview.allocations), true);
  assert.equal(Array.isArray(overview.performance.portfolio), true);
  assert.equal(Array.isArray(overview.performance.security), true);

  const positions = listInvestmentPositions(USER_ID, { query: "voo" });
  assert.equal(positions.total, 1);
  assert.equal(positions.items[0].symbol, "VOO");

  const accounts = listInvestmentAccounts(USER_ID);
  assert.equal(accounts.items.length, 1);
  assert.equal(accounts.items[0].account_name, "Primary Brokerage");

  const performance = getInvestmentPerformance(USER_ID, { timeframe: "1M", symbol: "NFLX" });
  assert.equal(performance.timeframe, "1M");
  assert.equal(performance.featured_symbol, "NFLX");
  assert.equal(performance.portfolio.length > 0, true);
  assert.equal(performance.security.length > 0, true);
});

test("performance symbol fallback and account ordering remain deterministic", () => {
  resetForInvestments();

  importInvestmentHoldingsFromCsv(
    USER_ID,
    [
      "Account,Ticker,Shares,Cost Basis,Market Price,As Of",
      "Zulu Brokerage,VOO,1,100,120,2026-03-01",
      "Alpha Brokerage,NFLX,1,100,120,2026-03-01"
    ].join("\n"),
    { sourceFileId: "deterministic_tie_001" }
  );

  const fallbackPerformance = getInvestmentPerformance(USER_ID, {
    timeframe: "1M",
    symbol: "MISSING"
  });
  assert.equal(fallbackPerformance.featured_symbol, "NFLX");
  assert.equal(fallbackPerformance.security.length > 0, true);

  const accountOrder = listInvestmentAccounts(USER_ID).items.map((entry) => entry.account_name);
  assert.deepEqual(accountOrder, ["Alpha Brokerage", "Zulu Brokerage"]);
});
