import { test, expect } from "@playwright/test";
import {
  appApi,
  loginWithSeedAccount,
  getLocalDateYmd
} from "./helpers.ts";

test("@core filter cache is invalidated after transaction mutations", async ({ page }) => {
  await loginWithSeedAccount(page);

  // ---- Step 1: get initial transaction count with range=all ----
  const initialResult = await appApi(page, "/v1/transactions?range=all");
  expect(initialResult).toHaveProperty("total");
  const initialTotal = initialResult.total;
  expect(typeof initialTotal).toBe("number");

  // ---- Step 2: ensure an account exists to attach transactions ----
  const accountsPayload = await appApi(page, "/v1/accounts");
  let accounts = Array.isArray(accountsPayload?.accounts) ? accountsPayload.accounts : [];
  let targetAccount;
  if (accounts.length === 0) {
    const created = await appApi(page, "/v1/accounts", {
      method: "POST",
      body: {
        displayName: "Cache Test Account",
        sourceInstitution: "Cache Test",
        accountType: "checking",
        currency: "USD",
        initialBalance: 1000
      }
    });
    targetAccount = created.account;
  } else {
    targetAccount = accounts[0];
  }

  // ---- Step 3: ensure a category exists ----
  const categoriesPayload = await appApi(page, "/v1/categories");
  const categories = Array.isArray(categoriesPayload?.categories) ? categoriesPayload.categories : [];
  let targetCategory = categories.find((c) => c.name === "Dining");
  if (!targetCategory) {
    targetCategory = categories.find((c) => c.type === "expense");
  }
  if (!targetCategory) {
    const created = await appApi(page, "/v1/categories", {
      method: "POST",
      body: { name: "Cache Dining", emoji: "🍽️", type: "expense" }
    });
    targetCategory = created.category || created;
  }

  // ---- Step 4: create a transaction via API ----
  const suffix = String(Date.now());
  const merchant = `Cache Staleness ${suffix}`;
  const txnPayload = {
    account_id: targetAccount.id || targetAccount.account_id,
    transaction_date: getLocalDateYmd(),
    amount: "15.00",
    direction: "outflow",
    description: `${merchant} description`,
    merchant_raw: merchant,
    category_final: targetCategory.name
  };

  const createdPayload = await appApi(page, "/v1/transactions", {
    method: "POST",
    body: txnPayload
  });
  expect(createdPayload).toHaveProperty("transaction");
  const createdId = createdPayload.transaction.id;

  // ---- Step 5: fetch with same params — should reflect the new transaction ----
  const afterCreate = await appApi(page, "/v1/transactions?range=all");
  expect(afterCreate.total).toBe(initialTotal + 1);
  const createdTxn = afterCreate.items.find((t) => t.merchant_raw === merchant);
  expect(createdTxn).toBeDefined();
  expect(createdTxn.id).toBe(createdId);

  // ---- Step 6: fetch with a different cache key — should also reflect the new transaction ----
  const afterCreateAltKey = await appApi(page, "/v1/transactions?range=all&limit=500");
  expect(afterCreateAltKey.total).toBe(initialTotal + 1);
  const createdTxnAlt = afterCreateAltKey.items.find((t) => t.merchant_raw === merchant);
  expect(createdTxnAlt).toBeDefined();

  // ---- Step 7: fetch with a third distinct cache key — should also be consistent ----
  const afterCreateAltKey2 = await appApi(page, "/v1/transactions?range=all&sort_direction=asc");
  expect(afterCreateAltKey2.total).toBe(initialTotal + 1);
  const createdTxnAlt2 = afterCreateAltKey2.items.find((t) => t.merchant_raw === merchant);
  expect(createdTxnAlt2).toBeDefined();

  // ---- Step 8: delete the created transaction via API ----
  await page.evaluate(async ({ id }) => {
    const rawTokens = localStorage.getItem("minance_tokens");
    const tokens = rawTokens ? JSON.parse(rawTokens) : null;
    const headers = { "Content-Type": "application/json" };
    if (tokens?.accessToken) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    const response = await fetch(`/v1/transactions/${id}`, {
      method: "DELETE",
      headers
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`DELETE failed: ${response.status}`);
    }
  }, { id: createdId });

  // ---- Step 9: fetch with same params as step 5 — should reflect the deletion ----
  const afterDelete = await appApi(page, "/v1/transactions?range=all");
  expect(afterDelete.total).toBe(initialTotal);
  const deletedTxn = afterDelete.items.find((t) => t.merchant_raw === merchant);
  expect(deletedTxn).toBeUndefined();

  // ---- Step 10: fetch with different cache key — should also reflect the deletion ----
  const afterDeleteAltKey = await appApi(page, "/v1/transactions?range=all&limit=500");
  expect(afterDeleteAltKey.total).toBe(initialTotal);
  const deletedTxnAlt = afterDeleteAltKey.items.find((t) => t.merchant_raw === merchant);
  expect(deletedTxnAlt).toBeUndefined();

  // ---- Step 11: fetch with third distinct cache key — should also be consistent ----
  const afterDeleteAltKey2 = await appApi(page, "/v1/transactions?range=all&sort_direction=asc");
  expect(afterDeleteAltKey2.total).toBe(initialTotal);
  const deletedTxnAlt2 = afterDeleteAltKey2.items.find((t) => t.merchant_raw === merchant);
  expect(deletedTxnAlt2).toBeUndefined();
});
