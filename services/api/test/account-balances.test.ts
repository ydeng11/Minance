import test from "node:test";
import assert from "node:assert/strict";

import { listAccountBalanceHistory, listAccounts } from "../src/accounts.ts";
import { loadStore, resetStoreForTests } from "../src/store.ts";

const USER_ID = "user_account_balances";

function makeAccount({ id, accountType, initialBalance }) {
  return {
    id,
    userId: USER_ID,
    normalizedKey: id,
    displayName: id,
    sourceInstitution: null,
    accountType,
    currency: "USD",
    initialBalance,
    manualAdjustments: [
      {
        id: `${id}_adjustment`,
        accountId: id,
        userId: USER_ID,
        amountDelta: 12.5,
        effectiveAt: "2026-01-04",
        reason: "Statement reconciliation",
        note: null,
        createdAt: "2026-01-04T00:00:00.000Z"
      }
    ],
    version: 1,
    status: "active",
    hidden: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function makeTransaction({ id, accountId, amount, direction, deletedAt = null }) {
  return {
    id,
    user_id: USER_ID,
    account_id: accountId,
    account_key: accountId,
    transaction_date: "2026-01-03",
    merchant_raw: "Account balance fixture",
    description: "Account balance fixture",
    amount,
    direction,
    deleted_at: deletedAt,
    created_at: "2026-01-03T00:00:00.000Z",
    updated_at: "2026-01-03T00:00:00.000Z"
  };
}

function makeStore(accounts, transactions) {
  return {
    users: [{ id: USER_ID, email: "account-balances@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
    sessions: [],
    accounts,
    transactions,
    recurringRules: [],
    recurringSuggestions: [],
    dismissedRecurringSuggestions: [],
    investmentHoldings: [],
    investmentSnapshots: [],
    categories: [],
    categoryStrategies: [],
    categoryRules: [],
    imports: [],
    importRowsRaw: [],
    importRowsProcessed: [],
    importRowDiagnostics: [],
    aiProviderCredentials: [],
    aiProviderPreferences: [],
    assistantQueries: [],
    savedViews: [],
    auditEvents: []
  };
}

test("account current balances include active signed transaction deltas and manual adjustments", () => {
  const checking = makeAccount({ id: "checking", accountType: "checking", initialBalance: 100 });
  const credit = makeAccount({ id: "credit", accountType: "credit", initialBalance: -200 });
  resetStoreForTests(
    makeStore(
      [checking, credit],
      [
        makeTransaction({ id: "checking_inflow", accountId: checking.id, amount: 50, direction: "inflow" }),
        makeTransaction({ id: "checking_outflow", accountId: checking.id, amount: 30, direction: "outflow" }),
        makeTransaction({ id: "checking_deleted", accountId: checking.id, amount: 999, direction: "inflow", deletedAt: "2026-01-05T00:00:00.000Z" }),
        makeTransaction({ id: "credit_inflow", accountId: credit.id, amount: 75, direction: "inflow" }),
        makeTransaction({ id: "credit_outflow", accountId: credit.id, amount: 40, direction: "outflow" }),
        makeTransaction({ id: "credit_deleted", accountId: credit.id, amount: 999, direction: "outflow", deletedAt: "2026-01-05T00:00:00.000Z" })
      ]
    )
  );

  const accounts = new Map(listAccounts(USER_ID).map((account) => [account.id, account]));
  const checkingHistory = listAccountBalanceHistory(USER_ID, checking.id);
  const creditHistory = listAccountBalanceHistory(USER_ID, credit.id);

  assert.equal(accounts.get(checking.id)?.currentBalance, 132.5);
  assert.equal(checkingHistory.currentBalance, 132.5);
  assert.equal(accounts.get(credit.id)?.currentBalance, -152.5);
  assert.equal(creditHistory.currentBalance, -152.5);
});

test("account balances include undated values that history cannot place", () => {
  const checking = makeAccount({ id: "checking", accountType: "checking", initialBalance: 100 });
  checking.manualAdjustments.push({
    id: "checking_undated_adjustment",
    accountId: checking.id,
    userId: USER_ID,
    amountDelta: -8.25,
    effectiveAt: null,
    reason: "Undated reconciliation",
    note: null,
    createdAt: null
  });
  const undatedTransaction = makeTransaction({
    id: "checking_undated_transaction",
    accountId: checking.id,
    amount: 20,
    direction: "inflow"
  });
  undatedTransaction.transaction_date = null;
  undatedTransaction.created_at = null;

  resetStoreForTests(makeStore([checking], [undatedTransaction]));

  const account = listAccounts(USER_ID)[0];
  const history = listAccountBalanceHistory(USER_ID, checking.id);

  assert.equal(account.currentBalance, 124.25);
  assert.equal(history.currentBalance, 124.25);
  assert.equal(history.account.currentBalance, 124.25);
  assert.equal(
    history.items.some((entry) => entry.sourceId === undatedTransaction.id || entry.sourceId === "checking_undated_adjustment"),
    false
  );
});

test("listing accounts aggregates transactions once without building balance history", () => {
  const checking = makeAccount({ id: "checking", accountType: "checking", initialBalance: 100 });
  const savings = makeAccount({ id: "savings", accountType: "savings", initialBalance: 200 });
  resetStoreForTests(
    makeStore(
      [checking, savings],
      [
        makeTransaction({ id: "checking_inflow", accountId: checking.id, amount: 50, direction: "inflow" }),
        makeTransaction({ id: "savings_outflow", accountId: savings.id, amount: 30, direction: "outflow" })
      ]
    )
  );

  const store = loadStore();
  let transactionIterations = 0;
  store.transactions = new Proxy(store.transactions, {
    get(target, property, receiver) {
      if (property === "filter") {
        throw new Error("Account listing must not build balance history events");
      }
      if (property === Symbol.iterator) {
        transactionIterations += 1;
        if (transactionIterations > 1) {
          throw new Error("Account listing must aggregate transactions in one pass");
        }
      }
      return Reflect.get(target, property, receiver);
    }
  });

  const accounts = new Map(listAccounts(USER_ID).map((account) => [account.id, account.currentBalance]));

  assert.equal(transactionIterations, 1);
  assert.equal(accounts.get(checking.id), 162.5);
  assert.equal(accounts.get(savings.id), 182.5);
});
