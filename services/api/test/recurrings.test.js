import test from "node:test";
import assert from "node:assert/strict";

import { loadStore, resetStoreForTests } from "../src/store.js";
import {
  createRecurringRule,
  deleteRecurringRule,
  evaluateRecurringRule,
  getRecurringRule,
  listRecurringRules,
  updateRecurringRule
} from "../src/recurrings.js";

const USER_ID = "user_recurrings_1";
const ACCOUNT_ID = "acct_recurrings_1";

function resetForRecurrings(storeOverrides = {}) {
  resetStoreForTests({
    users: [
      {
        id: USER_ID,
        email: "recurrings@example.com",
        passwordHash: "hash",
        salt: "salt",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    accounts: [
      {
        id: ACCOUNT_ID,
        userId: USER_ID,
        normalizedKey: "primary-checking",
        displayName: "Primary Checking",
        sourceInstitution: "Test CU",
        accountType: "checking",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    ...storeOverrides
  });
}

test("recurring rules support create/list/get/update lifecycle", () => {
  resetForRecurrings();

  const created = createRecurringRule(USER_ID, {
    name: "Monthly Rent",
    cadence: "monthly",
    amount: 1850,
    direction: "debit",
    account_id: ACCOUNT_ID,
    category_final: "Housing",
    merchant_pattern: "Sunset Apartments"
  });

  assert.equal(created.name, "Monthly Rent");
  assert.equal(created.status, "active");
  assert.equal(created.cadence, "monthly");
  assert.equal(created.amount, 1850);
  assert.equal(Array.isArray(created.linked_transaction_ids), true);

  const listed = listRecurringRules(USER_ID);
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0].id, created.id);

  const fetched = getRecurringRule(USER_ID, created.id);
  assert.equal(fetched.id, created.id);

  const updated = updateRecurringRule(USER_ID, created.id, {
    status: "paused",
    cadence: "quarterly",
    amount: 1900
  });
  assert.equal(updated.status, "paused");
  assert.equal(updated.cadence, "quarterly");
  assert.equal(updated.amount, 1900);
});

test("recurring evaluation links matching transactions and detaches stale links", () => {
  resetForRecurrings({
    transactions: [
      {
        id: "txn_rent_001",
        user_id: USER_ID,
        account_id: ACCOUNT_ID,
        transaction_date: "2026-01-05",
        merchant_raw: "Sunset Apartments",
        description: "Monthly rent",
        amount: -1850,
        direction: "debit",
        category_final: "Housing",
        recurring_rule_id: null,
        created_at: "2026-01-05T00:00:00.000Z",
        updated_at: "2026-01-05T00:00:00.000Z"
      },
      {
        id: "txn_rent_002",
        user_id: USER_ID,
        account_id: ACCOUNT_ID,
        transaction_date: "2026-02-05",
        merchant_raw: "Sunset Apartments",
        description: "Monthly rent",
        amount: -1850,
        direction: "debit",
        category_final: "Housing",
        recurring_rule_id: null,
        created_at: "2026-02-05T00:00:00.000Z",
        updated_at: "2026-02-05T00:00:00.000Z"
      },
      {
        id: "txn_other_001",
        user_id: USER_ID,
        account_id: ACCOUNT_ID,
        transaction_date: "2026-02-11",
        merchant_raw: "Cafe Brisk",
        description: "Lunch",
        amount: -22.15,
        direction: "debit",
        category_final: "Dining",
        recurring_rule_id: null,
        created_at: "2026-02-11T00:00:00.000Z",
        updated_at: "2026-02-11T00:00:00.000Z"
      }
    ]
  });

  const recurring = createRecurringRule(USER_ID, {
    name: "Monthly Rent",
    cadence: "monthly",
    amount: 1850,
    direction: "debit",
    account_id: ACCOUNT_ID,
    category_final: "Housing",
    merchant_pattern: "Sunset Apartments"
  });

  const firstEvaluation = evaluateRecurringRule(USER_ID, recurring.id, {
    start: "2026-01-01",
    end: "2026-03-01"
  });
  assert.equal(firstEvaluation.match_count, 2);
  assert.equal(firstEvaluation.attached_count, 2);
  assert.equal(firstEvaluation.detached_count, 0);
  assert.equal(firstEvaluation.rule.linked_transaction_ids.length, 2);
  assert.equal(firstEvaluation.rule.next_run_at, "2026-03-05");

  const afterLink = loadStore().transactions.filter((entry) => entry.user_id === USER_ID);
  assert.equal(afterLink.filter((entry) => entry.recurring_rule_id === recurring.id).length, 2);

  updateRecurringRule(USER_ID, recurring.id, {
    amount: 9999
  });
  const secondEvaluation = evaluateRecurringRule(USER_ID, recurring.id);
  assert.equal(secondEvaluation.match_count, 0);
  assert.equal(secondEvaluation.detached_count, 2);

  const afterDetach = loadStore().transactions.filter((entry) => entry.user_id === USER_ID);
  assert.equal(afterDetach.filter((entry) => entry.recurring_rule_id === recurring.id).length, 0);

  const deleted = deleteRecurringRule(USER_ID, recurring.id);
  assert.equal(deleted.deleted, true);
});
