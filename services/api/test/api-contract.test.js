import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address && typeof address === "object" ? address.port : null;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        if (!port) {
          reject(new Error("Unable to allocate a test port"));
          return;
        }
        resolve(port);
      });
    });
  });
}

async function stopProcess(processRef) {
  if (processRef.exitCode !== null || processRef.signalCode !== null) {
    return;
  }

  processRef.kill("SIGTERM");
  const exitPromise = new Promise((resolve) => {
    processRef.once("exit", resolve);
  });
  const timedOut = Symbol("timeout");
  const result = await Promise.race([exitPromise, delay(2_000).then(() => timedOut)]);
  if (result === timedOut) {
    processRef.kill("SIGKILL");
    await exitPromise;
  }
}

async function waitForHealth(baseUrl, serverProcess, getLogs, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
      const logs = getLogs();
      throw new Error(
        `API process exited before readiness check (code=${serverProcess.exitCode}, signal=${serverProcess.signalCode}).\n` +
          `stdout:\n${logs.stdout}\n` +
          `stderr:\n${logs.stderr}`
      );
    }

    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.status === 200) {
        return;
      }
    } catch {
      // Keep polling until timeout or success.
    }

    await delay(100);
  }

  const logs = getLogs();
  throw new Error(
    `Timed out waiting for API readiness at ${baseUrl}.\n` +
      `stdout:\n${logs.stdout}\n` +
      `stderr:\n${logs.stderr}`
  );
}

async function startApiServer(t) {
  const port = await findAvailablePort();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "minance-api-contract-"));
  const dataFile = path.join(tempDir, "store.json");

  const env = {
    ...process.env,
    PORT: String(port),
    NODE_ENV: "test",
    MINANCE_STORE_BACKEND: "json",
    MINANCE_DATA_FILE: dataFile,
    MINANCE_SEED_TEST_ACCOUNT: "false",
    OPENROUTER_API_KEY: ""
  };

  const serverProcess = spawn(process.execPath, ["services/api/src/server.js"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  serverProcess.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  serverProcess.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const getLogs = () => ({ stdout, stderr });
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForHealth(baseUrl, serverProcess, getLogs);

  t.after(async () => {
    await stopProcess(serverProcess);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  return { baseUrl, getLogs };
}

async function apiRequest(context, method, pathName, { token = null, body, expectedStatus, headers: customHeaders } = {}) {
  const headers = { ...(customHeaders || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${context.baseUrl}${pathName}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : null;

  if (expectedStatus !== undefined) {
    const logs = context.getLogs();
    assert.equal(
      response.status,
      expectedStatus,
      `Unexpected status for ${method} ${pathName}. Response body: ${raw}\nstdout:\n${logs.stdout}\nstderr:\n${logs.stderr}`
    );
  }

  return { status: response.status, payload };
}

test("api parity contract suite for categories/transactions/settings and missing domains", async (t) => {
  const context = await startApiServer(t);

  const signupResponse = await apiRequest(context, "POST", "/v1/auth/signup", {
    expectedStatus: 201,
    body: {
      email: "contract-suite@example.com",
      password: "contractpass123"
    }
  });
  const accessToken = signupResponse.payload?.tokens?.accessToken;
  assert.equal(typeof accessToken, "string");

  await t.test("categories endpoints return parity-critical contract shapes", async () => {
    const listResponse = await apiRequest(context, "GET", "/v1/categories", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(Array.isArray(listResponse.payload?.categories), true);

    const createResponse = await apiRequest(context, "POST", "/v1/categories", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        name: "Parity Dining",
        emoji: "Bowl",
        coarseKey: "essential"
      }
    });
    assert.equal(createResponse.payload?.category?.name, "Parity Dining");
    assert.equal(createResponse.payload?.category?.coarseKey, "essential");
    assert.equal(createResponse.payload?.category?.emoji, "Bowl");
    const categoryId = createResponse.payload?.category?.id;
    assert.equal(typeof categoryId, "string");

    const updatedCategory = await apiRequest(context, "PUT", `/v1/categories/${categoryId}`, {
      token: accessToken,
      expectedStatus: 200,
      body: {
        name: "Parity Dining Updated",
        coarseKey: "extra",
        type: "expense"
      }
    });
    assert.equal(updatedCategory.payload?.category?.name, "Parity Dining Updated");
    assert.equal(updatedCategory.payload?.category?.coarseKey, "extra");
    assert.equal(updatedCategory.payload?.category?.type, "expense");

    const budgetedCategory = await apiRequest(context, "POST", "/v1/categories", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        name: "Budget Groceries",
        coarseKey: "essential",
        type: "expense",
        budget: {
          amount: "650.40",
          cadence: "monthly",
          currency: "usd",
          rollover: true
        }
      }
    });
    const budgetedCategoryId = budgetedCategory.payload?.category?.id;
    assert.equal(typeof budgetedCategoryId, "string");
    assert.equal(budgetedCategory.payload?.category?.budget?.amount, 650.4);
    assert.equal(budgetedCategory.payload?.category?.budget?.cadence, "monthly");
    assert.equal(budgetedCategory.payload?.category?.budget?.currency, "USD");
    assert.equal(budgetedCategory.payload?.category?.budget?.rollover, true);

    const budgetUpdatedCategory = await apiRequest(context, "PUT", `/v1/categories/${budgetedCategoryId}`, {
      token: accessToken,
      expectedStatus: 200,
      body: {
        budgetAmount: 700,
        budgetCadence: "yearly",
        budgetCurrency: "eur",
        budgetRollover: false
      }
    });
    assert.equal(budgetUpdatedCategory.payload?.category?.budget?.amount, 700);
    assert.equal(budgetUpdatedCategory.payload?.category?.budget?.cadence, "yearly");
    assert.equal(budgetUpdatedCategory.payload?.category?.budget?.currency, "EUR");
    assert.equal(budgetUpdatedCategory.payload?.category?.budget?.rollover, false);

    const invalidBudget = await apiRequest(context, "POST", "/v1/categories", {
      token: accessToken,
      expectedStatus: 400,
      body: {
        name: "Invalid Budget Category",
        coarseKey: "essential",
        budget: {
          amount: -5
        }
      }
    });
    assert.equal(invalidBudget.payload?.error?.message, "Invalid category budget amount");

    const duplicateCategory = await apiRequest(context, "POST", "/v1/categories", {
      token: accessToken,
      expectedStatus: 400,
      body: {
        name: "Parity Dining Updated"
      }
    });
    assert.equal(duplicateCategory.payload?.error?.message, "Invalid category name already exists");

    const invalidCategoryGroup = await apiRequest(context, "POST", "/v1/categories", {
      token: accessToken,
      expectedStatus: 400,
      body: {
        name: "Invalid Group Category",
        coarseKey: "not-a-real-group"
      }
    });
    assert.equal(invalidCategoryGroup.payload?.error?.message, "Invalid category group");

    const ruleResponse = await apiRequest(context, "POST", "/v1/category-rules", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        pattern: "parity cafe",
        category: "Parity Dining Updated",
        type: "contains",
        priority: 70
      }
    });
    assert.equal(ruleResponse.payload?.rule?.category, "Parity Dining Updated");
    assert.equal(ruleResponse.payload?.rule?.type, "contains");

    const removableCategory = await apiRequest(context, "POST", "/v1/categories", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        name: "Temporary Cleanup Category",
        coarseKey: "neutral"
      }
    });
    const removableCategoryId = removableCategory.payload?.category?.id;
    assert.equal(typeof removableCategoryId, "string");

    await apiRequest(context, "DELETE", `/v1/categories/${removableCategoryId}`, {
      token: accessToken,
      expectedStatus: 204
    });

    const listAfterDelete = await apiRequest(context, "GET", "/v1/categories", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(
      listAfterDelete.payload?.categories?.some((entry) => entry.id === removableCategoryId),
      false
    );

    await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        transaction_date: "2026-02-01",
        description: "Referenced category transaction",
        merchant_raw: "Parity Category Merchant",
        amount: -15.25,
        account_name: "Contract Checking",
        category_final: "Parity Dining Updated"
      }
    });

    const referencedDelete = await apiRequest(context, "DELETE", `/v1/categories/${categoryId}`, {
      token: accessToken,
      expectedStatus: 400
    });
    assert.equal(referencedDelete.payload?.error?.message, "Invalid category is referenced by existing transactions");
  });

  await t.test("transactions endpoints support captured query patterns and CRUD lifecycle", async () => {
    const created = await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        transaction_date: "2026-02-01",
        description: "Transfer to savings",
        merchant_raw: "Internal Transfer",
        amount: -125.5,
        account_name: "Primary Checking",
        category_final: "Transfer"
      }
    });
    const transactionId = created.payload?.transaction?.id;
    assert.equal(typeof transactionId, "string");

    const listAll = await apiRequest(
      context,
      "GET",
      "/v1/transactions?category_view=granular&range=all&limit=200",
      {
        token: accessToken,
        expectedStatus: 200
      }
    );
    assert.equal(Array.isArray(listAll.payload?.items), true);
    assert.equal(listAll.payload?.meta?.categoryView, "granular");

    const queryMatch = await apiRequest(
      context,
      "GET",
      "/v1/transactions?query=Transfer&category_view=granular&range=all&limit=200",
      {
        token: accessToken,
        expectedStatus: 200
      }
    );
    assert.equal(Array.isArray(queryMatch.payload?.items), true);
    assert.equal(
      queryMatch.payload.items.some((entry) => entry.id === transactionId),
      true
    );

    const updated = await apiRequest(context, "PUT", `/v1/transactions/${transactionId}`, {
      token: accessToken,
      expectedStatus: 200,
      body: {
        description: "Transfer to HYSA"
      }
    });
    assert.equal(updated.payload?.transaction?.description, "Transfer to HYSA");

    const idempotentCreateBody = {
      transaction_date: "2026-02-02",
      description: "Idempotent coffee",
      merchant_raw: "Parity Cafe",
      amount: -9.75,
      account_name: "Primary Checking",
      category_final: "Dining"
    };
    const idempotentKey = "txn-create-idem-001";
    const firstIdempotentCreate = await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 201,
      headers: {
        "Idempotency-Key": idempotentKey
      },
      body: idempotentCreateBody
    });
    const secondIdempotentCreate = await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 201,
      headers: {
        "Idempotency-Key": idempotentKey
      },
      body: idempotentCreateBody
    });
    const idempotentTransactionId = firstIdempotentCreate.payload?.transaction?.id;
    assert.equal(typeof idempotentTransactionId, "string");
    assert.equal(secondIdempotentCreate.payload?.transaction?.id, idempotentTransactionId);

    const conflictingIdempotentCreate = await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 400,
      headers: {
        "Idempotency-Key": idempotentKey
      },
      body: {
        ...idempotentCreateBody,
        amount: -19.75
      }
    });
    assert.equal(
      conflictingIdempotentCreate.payload?.error?.message,
      "Invalid idempotency key reuse with a different payload"
    );

    const deleteKey = "txn-delete-idem-001";
    await apiRequest(context, "DELETE", `/v1/transactions/${transactionId}`, {
      token: accessToken,
      expectedStatus: 204,
      headers: {
        "Idempotency-Key": deleteKey
      }
    });
    await apiRequest(context, "DELETE", `/v1/transactions/${transactionId}`, {
      token: accessToken,
      expectedStatus: 204,
      headers: {
        "Idempotency-Key": deleteKey
      }
    });

    const afterDelete = await apiRequest(
      context,
      "GET",
      "/v1/transactions?category_view=granular&range=all&limit=200",
      {
        token: accessToken,
        expectedStatus: 200
      }
    );
    assert.equal(
      afterDelete.payload?.items?.some((entry) => entry.id === transactionId),
      false
    );

    const restored = await apiRequest(context, "POST", `/v1/transactions/${transactionId}/restore`, {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(restored.payload?.transaction?.id, transactionId);

    const afterRestore = await apiRequest(
      context,
      "GET",
      "/v1/transactions?category_view=granular&range=all&limit=200",
      {
        token: accessToken,
        expectedStatus: 200
      }
    );
    assert.equal(
      afterRestore.payload?.items?.some((entry) => entry.id === transactionId),
      true
    );
  });

  await t.test("settings endpoints expose storage and AI preference contracts", async () => {
    const storage = await apiRequest(context, "GET", "/v1/system/storage", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(typeof storage.payload?.storage?.backend, "string");

    const providers = await apiRequest(context, "GET", "/v1/ai/providers", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(Array.isArray(providers.payload?.providers), true);
    assert.equal(providers.payload.providers.length > 0, true);

    await apiRequest(context, "POST", "/v1/ai/credentials", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        provider: "openrouter",
        label: "Contract test key",
        apiKey: "sk-or-v1-contract-test-key"
      }
    });

    const savePreferences = await apiRequest(context, "PUT", "/v1/ai/preferences", {
      token: accessToken,
      expectedStatus: 200,
      body: {
        defaultProvider: "openrouter",
        defaultModel: "openai/gpt-4.1-mini",
        failoverProviders: ["openrouter"]
      }
    });
    assert.equal(savePreferences.payload?.preferences?.defaultProvider, "openrouter");

    const credentials = await apiRequest(context, "GET", "/v1/ai/credentials", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(Array.isArray(credentials.payload?.credentials), true);
    assert.equal(credentials.payload?.preferences?.defaultProvider, "openrouter");
  });

  await t.test("accounts create/update contracts enforce type, currency, and initial-balance semantics", async () => {
    const accountTypes = await apiRequest(context, "GET", "/v1/accounts/supported-account-types", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(Array.isArray(accountTypes.payload?.accountTypes), true);
    assert.equal(accountTypes.payload?.accountTypes?.includes("checking"), true);
    assert.equal(accountTypes.payload?.accountTypes?.includes("credit"), true);

    const createAsset = await apiRequest(context, "POST", "/v1/accounts", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        displayName: "Accounts Suite Checking",
        accountType: "checking",
        currency: "usd",
        initialBalance: "250.55"
      }
    });
    const assetAccountId = createAsset.payload?.account?.id;
    assert.equal(typeof assetAccountId, "string");
    assert.equal(createAsset.payload?.account?.currency, "USD");
    assert.equal(createAsset.payload?.account?.accountType, "checking");
    assert.equal(createAsset.payload?.account?.initialBalance, 250.55);
    assert.equal(createAsset.payload?.account?.status, "active");
    assert.equal(createAsset.payload?.account?.includeInCharts, true);
    assert.equal(createAsset.payload?.account?.hidden, false);
    assert.equal(createAsset.payload?.account?.closed, false);
    assert.equal(Number.isInteger(createAsset.payload?.account?.version), true);

    const createLiability = await apiRequest(context, "POST", "/v1/accounts", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        displayName: "Travel Card",
        accountType: "credit",
        currency: "USD",
        initialBalance: 425
      }
    });
    assert.equal(createLiability.payload?.account?.accountType, "credit");
    assert.equal(createLiability.payload?.account?.initialBalance, -425);

    const duplicateName = await apiRequest(context, "POST", "/v1/accounts", {
      token: accessToken,
      expectedStatus: 400,
      body: {
        displayName: "Accounts Suite Checking",
        accountType: "checking",
        currency: "USD",
        initialBalance: 10
      }
    });
    assert.equal(duplicateName.payload?.error?.message, "Invalid account name already exists");

    const invalidCurrency = await apiRequest(context, "POST", "/v1/accounts", {
      token: accessToken,
      expectedStatus: 400,
      body: {
        displayName: "Bad Currency Account",
        accountType: "checking",
        currency: "US",
        initialBalance: 10
      }
    });
    assert.equal(invalidCurrency.payload?.error?.message, "Invalid currency code");

    const updated = await apiRequest(context, "PUT", `/v1/accounts/${assetAccountId}`, {
      token: accessToken,
      expectedStatus: 200,
      body: {
        accountType: "savings",
        currency: "eur",
        initialBalance: -111
      }
    });
    assert.equal(updated.payload?.account?.accountType, "savings");
    assert.equal(updated.payload?.account?.currency, "EUR");
    assert.equal(updated.payload?.account?.initialBalance, 111);
    let currentVersion = updated.payload?.account?.version;
    assert.equal(Number.isInteger(currentVersion), true);

    const hiddenUpdate = await apiRequest(context, "PUT", `/v1/accounts/${assetAccountId}/settings`, {
      token: accessToken,
      expectedStatus: 200,
      body: {
        includeInCharts: false,
        hidden: true,
        expectedVersion: Number(currentVersion)
      }
    });
    currentVersion = hiddenUpdate.payload?.account?.version;
    assert.equal(hiddenUpdate.payload?.account?.status, "hidden");
    assert.equal(hiddenUpdate.payload?.account?.hidden, true);
    assert.equal(hiddenUpdate.payload?.account?.closed, false);
    assert.equal(hiddenUpdate.payload?.account?.includeInCharts, false);
    assert.equal(Number.isInteger(currentVersion), true);

    const closedUpdate = await apiRequest(context, "PUT", `/v1/accounts/${assetAccountId}/settings`, {
      token: accessToken,
      expectedStatus: 200,
      body: {
        closed: true,
        expectedVersion: Number(currentVersion)
      }
    });
    currentVersion = closedUpdate.payload?.account?.version;
    assert.equal(closedUpdate.payload?.account?.status, "closed");
    assert.equal(closedUpdate.payload?.account?.closed, true);
    assert.equal(typeof closedUpdate.payload?.account?.closedAt, "string");
    assert.equal(Number.isInteger(currentVersion), true);

    const activeUpdate = await apiRequest(context, "PUT", `/v1/accounts/${assetAccountId}/settings`, {
      token: accessToken,
      expectedStatus: 200,
      body: {
        status: "active",
        includeInCharts: true,
        expectedVersion: Number(currentVersion)
      }
    });
    currentVersion = activeUpdate.payload?.account?.version;
    assert.equal(activeUpdate.payload?.account?.status, "active");
    assert.equal(activeUpdate.payload?.account?.hidden, false);
    assert.equal(activeUpdate.payload?.account?.closed, false);
    assert.equal(activeUpdate.payload?.account?.closedAt, null);
    assert.equal(activeUpdate.payload?.account?.includeInCharts, true);

    const staleManualAdjustment = await apiRequest(
      context,
      "POST",
      `/v1/accounts/${assetAccountId}/manual-adjustments`,
      {
        token: accessToken,
        expectedStatus: 400,
        body: {
          amountDelta: 25.5,
          effectiveAt: "2026-02-18",
          reason: "Quarterly reconciliation",
          expectedVersion: Number(currentVersion) - 1
        }
      }
    );
    assert.equal(staleManualAdjustment.payload?.error?.message, "Invalid account version conflict");

    const adjustmentKey = "acct-adjustment-idem-001";
    const firstAdjustment = await apiRequest(
      context,
      "POST",
      `/v1/accounts/${assetAccountId}/manual-adjustments`,
      {
        token: accessToken,
        expectedStatus: 201,
        headers: {
          "Idempotency-Key": adjustmentKey
        },
        body: {
          amountDelta: 25.5,
          effectiveAt: "2026-02-18",
          reason: "Quarterly reconciliation",
          note: "Bank statement aligned",
          expectedVersion: Number(currentVersion)
        }
      }
    );
    const adjustmentId = firstAdjustment.payload?.adjustment?.id;
    assert.equal(typeof adjustmentId, "string");
    assert.equal(firstAdjustment.payload?.account?.version, Number(currentVersion) + 1);

    const replayAdjustment = await apiRequest(
      context,
      "POST",
      `/v1/accounts/${assetAccountId}/manual-adjustments`,
      {
        token: accessToken,
        expectedStatus: 201,
        headers: {
          "Idempotency-Key": adjustmentKey
        },
        body: {
          amountDelta: 25.5,
          effectiveAt: "2026-02-18",
          reason: "Quarterly reconciliation",
          note: "Bank statement aligned",
          expectedVersion: Number(currentVersion)
        }
      }
    );
    assert.equal(replayAdjustment.payload?.adjustment?.id, adjustmentId);
    assert.equal(replayAdjustment.payload?.account?.version, Number(currentVersion) + 1);

    const staleAfterAdjustment = await apiRequest(
      context,
      "POST",
      `/v1/accounts/${assetAccountId}/manual-adjustments`,
      {
        token: accessToken,
        expectedStatus: 400,
        body: {
          amountDelta: 5,
          effectiveAt: "2026-02-20",
          reason: "Late correction",
          expectedVersion: Number(currentVersion)
        }
      }
    );
    assert.equal(staleAfterAdjustment.payload?.error?.message, "Invalid account version conflict");

    const history = await apiRequest(context, "GET", `/v1/accounts/${assetAccountId}/balance-history`, {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(Array.isArray(history.payload?.items), true);
    assert.equal(history.payload?.currentBalance, 136.5);
    assert.equal(
      history.payload?.items?.some((entry) => entry.kind === "manual_adjustment" && entry.sourceId === adjustmentId),
      true
    );

    const list = await apiRequest(context, "GET", "/v1/accounts", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(Array.isArray(list.payload?.accounts), true);
    assert.equal(list.payload?.accounts?.some((entry) => entry.id === assetAccountId), true);

    const removableAccount = await apiRequest(context, "POST", "/v1/accounts", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        displayName: "Temporary Closable Account",
        accountType: "checking",
        currency: "USD",
        initialBalance: 0
      }
    });
    const removableAccountId = removableAccount.payload?.account?.id;
    assert.equal(typeof removableAccountId, "string");

    const accountDeleteKey = "acct-delete-idem-001";
    await apiRequest(context, "DELETE", `/v1/accounts/${removableAccountId}`, {
      token: accessToken,
      expectedStatus: 204,
      headers: {
        "Idempotency-Key": accountDeleteKey
      }
    });
    await apiRequest(context, "DELETE", `/v1/accounts/${removableAccountId}`, {
      token: accessToken,
      expectedStatus: 204,
      headers: {
        "Idempotency-Key": accountDeleteKey
      }
    });

    const listAfterDelete = await apiRequest(context, "GET", "/v1/accounts", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(Array.isArray(listAfterDelete.payload?.accounts), true);
    assert.equal(listAfterDelete.payload?.accounts?.some((entry) => entry.id === removableAccountId), false);

    const referencedAccount = await apiRequest(context, "POST", "/v1/accounts", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        displayName: "Referenced Delete Guard Account",
        accountType: "checking",
        currency: "USD",
        initialBalance: 10
      }
    });
    const referencedAccountId = referencedAccount.payload?.account?.id;
    assert.equal(typeof referencedAccountId, "string");

    await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        transaction_date: "2026-02-22",
        description: "Delete guard transaction",
        merchant_raw: "Delete Guard Merchant",
        amount: -12.34,
        account_id: referencedAccountId,
        account_name: "Referenced Delete Guard Account",
        category_final: "Dining"
      }
    });

    const referencedDelete = await apiRequest(context, "DELETE", `/v1/accounts/${referencedAccountId}`, {
      token: accessToken,
      expectedStatus: 400
    });
    assert.equal(referencedDelete.payload?.error?.message, "Invalid account is referenced by existing transactions");
  });

  await t.test("account provider abstraction exposes self-host fallback and deterministic failures", async () => {
    const providers = await apiRequest(context, "GET", "/v1/accounts/providers", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(Array.isArray(providers.payload?.providers), true);
    assert.equal(providers.payload?.providers?.length > 0, true);
    assert.equal(providers.payload?.defaultProviderId, "manual_csv");

    const provider = await apiRequest(context, "GET", "/v1/accounts/providers/manual_csv", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(provider.payload?.provider?.id, "manual_csv");
    assert.equal(provider.payload?.provider?.capabilities?.csvImport, true);
    assert.equal(provider.payload?.provider?.capabilities?.directAggregation, false);

    const missing = await apiRequest(context, "GET", "/v1/accounts/providers/unknown", {
      token: accessToken,
      expectedStatus: 404
    });
    assert.equal(missing.payload?.error?.message, "Unknown account provider");

    const unsupportedAction = await apiRequest(context, "POST", "/v1/accounts/providers/manual_csv/link-session", {
      token: accessToken,
      expectedStatus: 409
    });
    assert.equal(unsupportedAction.payload?.error?.details?.code, "ACCOUNT_PROVIDER_ACTION_UNSUPPORTED");
    assert.equal(unsupportedAction.payload?.error?.details?.providerId, "manual_csv");
    assert.equal(unsupportedAction.payload?.error?.details?.action, "begin_link_session");
  });

  await t.test("recurrings, investments, and generic settings remain explicit 404 contracts", async () => {
    const missingEndpoints = ["/v1/recurrings", "/v1/investments", "/v1/settings"];
    for (const endpoint of missingEndpoints) {
      const response = await apiRequest(context, "GET", endpoint, {
        token: accessToken,
        expectedStatus: 404
      });
      assert.equal(response.payload?.error?.message, `Endpoint not found: GET ${endpoint}`);
    }
  });
});
