import test from "node:test";
import assert from "node:assert/strict";
import { deriveActiveBadges } from "./ActiveFilterBadges";
import type { ExplorerFilterState } from "@/app/explorer/filters";
import type { TransactionsFilterState } from "@/app/transactions/filters";

function createDefaultExplorerFilters(): ExplorerFilterState {
  return {
    perspective: "overview",
    compare: "none",
    query: "",
    merchant: "",
    categories: [],
    invertCategories: false,
    account: "",
    range: "90d",
    start: "",
    end: "",
    categoryView: "granular",
    transactionTypes: [],
    direction: "all",
    tag: "",
    recurring: false,
    minAmount: "",
    maxAmount: ""
  };
}

function createDefaultTransactionsFilters(): TransactionsFilterState {
  return {
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
    recurring: false
  };
}

test("deriveActiveBadges returns empty array when no active filters", () => {
  const badges = deriveActiveBadges({ ...createDefaultExplorerFilters() });
  assert.deepEqual(badges, []);
});

test("deriveActiveBadges returns badge for query filter", () => {
  const filters = { ...createDefaultExplorerFilters(), query: "amazon" };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.length, 1);
  assert.equal(badges[0].key, "query");
  assert.ok(badges[0].label.includes("Search"));
  assert.ok(badges[0].label.includes("amazon"));
});

test("deriveActiveBadges returns badge for categories array with count", () => {
  const filters = { ...createDefaultExplorerFilters(), categories: ["food", "transport"] };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "categories" && b.label === "Filtering 2 categories"), true);
});

test("deriveActiveBadges returns badge for accounts array with count", () => {
  const filters = { ...createDefaultTransactionsFilters(), accounts: ["acc1", "acc2", "acc3"] };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "accounts" && b.label === "3 accounts"), true);
});

test("deriveActiveBadges returns badge for single account filter", () => {
  const filters = { ...createDefaultExplorerFilters(), account: "main-account" };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "account" && b.label.includes("Account")), true);
});

test("deriveActiveBadges returns badge for tag filter", () => {
  const filters = { ...createDefaultExplorerFilters(), tag: "vacation" };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "tag" && b.label.includes("Tag") && b.label.includes("vacation")), true);
});

test("deriveActiveBadges returns badge for transactionTypes array", () => {
  const filters = { ...createDefaultExplorerFilters(), transactionTypes: ["expense", "income"] };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "transactionTypes" && b.label === "2 types"), true);
});

test("deriveActiveBadges returns badge for direction filter when not default", () => {
  const filters = { ...createDefaultExplorerFilters(), direction: "outflow" };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "direction" && b.label.includes("Direction")), true);
});

test("deriveActiveBadges does not return badge for default direction", () => {
  const filters = { ...createDefaultExplorerFilters() };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "direction"), false);
});

test("deriveActiveBadges returns badge for amount range", () => {
  const filters = { ...createDefaultExplorerFilters(), minAmount: "100", maxAmount: "500" };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "amountRange" && b.label.includes("Amount")), true);
});

test("deriveActiveBadges returns badge for minAmount only", () => {
  const filters = { ...createDefaultExplorerFilters(), minAmount: "100" };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "amountRange" && b.label.includes("Amount")), true);
});

test("deriveActiveBadges returns badge for maxAmount only", () => {
  const filters = { ...createDefaultExplorerFilters(), maxAmount: "500" };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "amountRange" && b.label.includes("Amount")), true);
});

test("deriveActiveBadges returns badge for non-default range (Explorer)", () => {
  const filters = { ...createDefaultExplorerFilters(), range: "30d" };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "range" && b.label.includes("Range")), true);
});

test("deriveActiveBadges does not return badge for default range (Explorer 90d)", () => {
  const filters = { ...createDefaultExplorerFilters() };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "range"), false);
});

test("deriveActiveBadges returns badge for non-default range (Transactions)", () => {
  const filters = { ...createDefaultTransactionsFilters(), range: "90d" };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "range" && b.label.includes("Range")), true);
});

test("deriveActiveBadges does not return badge for default range (Transactions all)", () => {
  const filters = { ...createDefaultTransactionsFilters() };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "range"), false);
});

test("deriveActiveBadges returns badge for merchant filter", () => {
  const filters = { ...createDefaultExplorerFilters(), merchant: "Starbucks" };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "merchant" && b.label.includes("Merchant")), true);
});

test("deriveActiveBadges returns badge for recurring filter", () => {
  const filters = { ...createDefaultExplorerFilters(), recurring: true };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.some(b => b.key === "recurring"), true);
});

test("deriveActiveBadges handles multiple active filters", () => {
  const filters = {
    ...createDefaultExplorerFilters(),
    query: "test",
    categories: ["food"],
    direction: "outflow"
  };
  const badges = deriveActiveBadges(filters);
  assert.equal(badges.length, 3);
});