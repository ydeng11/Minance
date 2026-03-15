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

async function startApiServer(t, options = {}) {
  const port = await findAvailablePort();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "minance-api-contract-"));
  const dataFile = path.join(tempDir, "store.json");
  const sqliteFile = path.join(tempDir, "runtime.sqlite");

  const env = {
    ...process.env,
    PORT: String(port),
    NODE_ENV: options.nodeEnv || "test",
    MINANCE_STORE_BACKEND: "sqlite",
    MINANCE_SEED_TEST_ACCOUNT: "false",
    OPENROUTER_API_KEY: "",
    MINANCE_DATA_FILE_TEST: dataFile,
    MINANCE_SQLITE_FILE_TEST: sqliteFile,
    MINANCE_DATA_FILE: dataFile,
    MINANCE_SQLITE_FILE: sqliteFile,
    ...(options.env || {})
  };

  const serverProcess = spawn(process.execPath, ["--import", "tsx/esm", "services/api/src/server.ts"], {
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

async function ensureCategoryExists(context, token, name, coarseKey = "neutral", type = "expense") {
  const listed = await apiRequest(context, "GET", "/v1/categories", {
    token,
    expectedStatus: 200
  });
  const existing = (listed.payload?.categories || []).find(
    (entry) => String(entry?.name || "").toLowerCase() === String(name || "").toLowerCase()
  );
  if (existing) {
    return existing;
  }

  const created = await apiRequest(context, "POST", "/v1/categories", {
    token,
    expectedStatus: 201,
    body: {
      name,
      coarseKey,
      type
    }
  });
  return created.payload?.category || null;
}

test("system storage reports sqlite for non-test runtime even when JSON backend is requested", async (t) => {
  const context = await startApiServer(t, {
    nodeEnv: "development",
    env: {
      MINANCE_STORE_BACKEND: "json",
      MINANCE_SEED_TEST_ACCOUNT: "false",
      OPENROUTER_API_KEY: ""
    }
  });

  const signupResponse = await apiRequest(context, "POST", "/v1/auth/signup", {
    expectedStatus: 201,
    body: {
      email: "storage-contract@example.com",
      password: "contractpass123"
    }
  });
  const accessToken = signupResponse.payload?.tokens?.accessToken;
  assert.equal(typeof accessToken, "string");

  const storage = await apiRequest(context, "GET", "/v1/system/storage", {
    token: accessToken,
    expectedStatus: 200
  });

  assert.equal(storage.payload?.storage?.backend, "sqlite");
  assert.equal(storage.payload?.storage?.sqlite?.backend, "sqlite");
});

test("explorer analytics applies OR within filters and AND across filter groups", async (t) => {
  const context = await startApiServer(t);

  const signupResponse = await apiRequest(context, "POST", "/v1/auth/signup", {
    expectedStatus: 201,
    body: {
      email: "explorer-filters-contract@example.com",
      password: "contractpass123"
    }
  });
  const accessToken = signupResponse.payload?.tokens?.accessToken;
  assert.equal(typeof accessToken, "string");

  await ensureCategoryExists(context, accessToken, "Food", "essential", "expense");
  await ensureCategoryExists(context, accessToken, "Travel", "extra", "expense");
  await ensureCategoryExists(context, accessToken, "Income", "neutral", "income");
  await ensureCategoryExists(context, accessToken, "Transfer", "neutral", "transfer");
  const transactions = [
    {
      transaction_date: "2026-02-01",
      description: "Weekly groceries",
      merchant_raw: "Corner Market",
      amount: -25,
      account_name: "Primary Checking",
      category_final: "Food",
      tags: ["weekly"]
    },
    {
      transaction_date: "2026-02-02",
      description: "Flight booking",
      merchant_raw: "Airline",
      amount: -220,
      account_name: "Primary Checking",
      category_final: "Travel",
      tags: ["trip"]
    },
    {
      transaction_date: "2026-02-03",
      description: "Move to savings",
      merchant_raw: "Bank Transfer",
      amount: -150,
      account_name: "Primary Checking",
      category_final: "Transfer"
    },
    {
      transaction_date: "2026-02-04",
      description: "Payday",
      merchant_raw: "Payroll",
      amount: 1800,
      account_name: "Primary Checking",
      category_final: "Income"
    }
  ];

  for (const body of transactions) {
    const created = await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 201,
      body
    });
    assert.equal(typeof created.payload?.transaction?.id, "string");
  }

  const explorer = await apiRequest(
    context,
    "GET",
    "/v1/analytics/explorer?range=all&category=Food&category=Travel&transaction_type=expense&transaction_type=transfer",
    {
      token: accessToken,
      expectedStatus: 200
    }
  );

  assert.equal(explorer.payload?.summary?.current?.transactionCount, 2);
  assert.equal(typeof explorer.payload?.meta?.amountBounds?.min, "number");
  assert.equal(typeof explorer.payload?.meta?.amountBounds?.max, "number");
  assert.deepEqual(explorer.payload?.meta?.availableTags, ["trip", "weekly"]);
  assert.deepEqual(
    (explorer.payload?.merchants?.items || [])
      .map((entry) => entry.merchant)
      .sort((left, right) => left.localeCompare(right)),
    ["airline", "corner market"]
  );
});

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
    assert.equal(invalidCategoryGroup.payload?.error?.message, "Invalid category group: not-a-real-group");

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
    await ensureCategoryExists(context, accessToken, "Transfer", "neutral", "transfer");
    await ensureCategoryExists(context, accessToken, "Income", "neutral", "income");

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
    const accountId = created.payload?.transaction?.account_id;
    assert.equal(typeof transactionId, "string");
    assert.equal(typeof accountId, "string");
    assert.equal(created.payload?.transaction?.transaction_type, "transfer");
    assert.equal(Array.isArray(created.payload?.transaction?.tags), true);
    assert.equal(created.payload?.transaction?.review_status, "reviewed");
    assert.equal(created.payload?.transaction?.needs_category_review, false);
    assert.equal(created.payload?.transaction?.recurring_rule_id, null);

    const contractShape = await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        transaction_date: "2026-02-03",
        description: "Rule-linked transfer",
        merchant_raw: "Rule Linked Merchant",
        amount: -42.15,
        direction: "outflow",
        account_name: "Primary Checking",
        category_final: "Transfer",
        transaction_type: "transfer",
        tags: [" Utilities ", "Monthly", "utilities"],
        review_status: "needs_review",
        recurring_rule_id: "rr_contract_001"
      }
    });
    const contractShapeTransactionId = contractShape.payload?.transaction?.id;
    assert.equal(typeof contractShapeTransactionId, "string");
    assert.equal(contractShape.payload?.transaction?.transaction_type, "transfer");
    assert.deepEqual(contractShape.payload?.transaction?.tags, ["utilities", "monthly"]);
    assert.equal(contractShape.payload?.transaction?.review_status, "needs_review");
    assert.equal(contractShape.payload?.transaction?.needs_category_review, true);
    assert.equal(contractShape.payload?.transaction?.recurring_rule_id, "rr_contract_001");

    const reviewAndTypeFilters = await apiRequest(
      context,
      "GET",
      "/v1/transactions?range=all&review_status=needs_review&transaction_type=transfer&tag=monthly&recurring_rule_id=rr_contract_001",
      {
        token: accessToken,
        expectedStatus: 200
      }
    );
    assert.equal(
      reviewAndTypeFilters.payload?.items?.some((entry) => entry.id === contractShapeTransactionId),
      true
    );

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

    const accountFilterMatch = await apiRequest(
      context,
      "GET",
      `/v1/transactions?range=all&account=${encodeURIComponent(accountId)}`,
      {
        token: accessToken,
        expectedStatus: 200
      }
    );
    assert.equal(
      accountFilterMatch.payload?.items?.some((entry) => entry.id === transactionId),
      true
    );

    await ensureCategoryExists(context, accessToken, "Dining", "extra", "expense");

    const bulkOne = await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        transaction_date: "2026-02-07",
        description: "Bulk candidate 1",
        merchant_raw: "Bulk Merchant One",
        amount: -18.5,
        account_name: "Primary Checking",
        category_final: "Dining"
      }
    });
    const bulkTwo = await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        transaction_date: "2026-02-08",
        description: "Bulk candidate 2",
        merchant_raw: "Bulk Merchant Two",
        amount: -22.1,
        account_name: "Primary Checking",
        category_final: "Dining"
      }
    });
    const bulkTransactionIds = [
      bulkOne.payload?.transaction?.id,
      bulkTwo.payload?.transaction?.id
    ];
    assert.equal(typeof bulkTransactionIds[0], "string");
    assert.equal(typeof bulkTransactionIds[1], "string");

    const bulkReviewUpdate = await apiRequest(context, "POST", "/v1/transactions/bulk", {
      token: accessToken,
      expectedStatus: 200,
      body: {
        transaction_ids: bulkTransactionIds,
        review_status: "needs_review"
      }
    });
    assert.equal(bulkReviewUpdate.payload?.result?.updated, 2);
    assert.equal(
      bulkReviewUpdate.payload?.result?.transactions?.every((entry) => entry.review_status === "needs_review"),
      true
    );

    const bulkCategoryAndTags = await apiRequest(context, "POST", "/v1/transactions/bulk", {
      token: accessToken,
      expectedStatus: 200,
      body: {
        transaction_ids: bulkTransactionIds,
        category_final: "Transfer",
        tags: [" Operations ", "quarterly", "operations"],
        needs_category_review: false
      }
    });
    assert.equal(bulkCategoryAndTags.payload?.result?.updated, 2);
    assert.equal(
      bulkCategoryAndTags.payload?.result?.transactions?.every(
        (entry) =>
          entry.category_final === "Transfer" &&
          entry.transaction_type === "transfer" &&
          entry.review_status === "reviewed"
      ),
      true
    );
    assert.deepEqual(
      bulkCategoryAndTags.payload?.result?.transactions?.[0]?.tags,
      ["operations", "quarterly"]
    );

    const bulkFilterMatch = await apiRequest(
      context,
      "GET",
      "/v1/transactions?range=all&transaction_type=transfer&tag=operations",
      {
        token: accessToken,
        expectedStatus: 200
      }
    );
    assert.equal(
      bulkTransactionIds.every((id) => bulkFilterMatch.payload?.items?.some((entry) => entry.id === id)),
      true
    );

    const invalidBulkMissingTransaction = await apiRequest(context, "POST", "/v1/transactions/bulk", {
      token: accessToken,
      expectedStatus: 404,
      body: {
        transaction_ids: [bulkTransactionIds[0], "txn_missing_contract"],
        review_status: "reviewed"
      }
    });
    assert.equal(
      invalidBulkMissingTransaction.payload?.error?.message,
      "Transaction not found: txn_missing_contract"
    );

    const invalidBulkDuplicates = await apiRequest(context, "POST", "/v1/transactions/bulk", {
      token: accessToken,
      expectedStatus: 400,
      body: {
        transaction_ids: [bulkTransactionIds[0], bulkTransactionIds[0]],
        review_status: "reviewed"
      }
    });
    assert.equal(
      invalidBulkDuplicates.payload?.error?.message,
      "transaction_ids must not include duplicates"
    );

    const bulkIdempotentKey = "txn-bulk-idem-001";
    const bulkIdempotentBody = {
      transaction_ids: bulkTransactionIds,
      review_status: "needs_review"
    };
    const firstBulkIdempotent = await apiRequest(context, "POST", "/v1/transactions/bulk", {
      token: accessToken,
      expectedStatus: 200,
      headers: {
        "Idempotency-Key": bulkIdempotentKey
      },
      body: bulkIdempotentBody
    });
    const secondBulkIdempotent = await apiRequest(context, "POST", "/v1/transactions/bulk", {
      token: accessToken,
      expectedStatus: 200,
      headers: {
        "Idempotency-Key": bulkIdempotentKey
      },
      body: bulkIdempotentBody
    });
    assert.equal(
      secondBulkIdempotent.payload?.result?.transactions?.[0]?.id,
      firstBulkIdempotent.payload?.result?.transactions?.[0]?.id
    );

    const conflictingBulkIdempotent = await apiRequest(context, "POST", "/v1/transactions/bulk", {
      token: accessToken,
      expectedStatus: 400,
      headers: {
        "Idempotency-Key": bulkIdempotentKey
      },
      body: {
        transaction_ids: bulkTransactionIds,
        review_status: "reviewed"
      }
    });
    assert.equal(
      conflictingBulkIdempotent.payload?.error?.message,
      "Invalid idempotency key reuse with a different payload"
    );

    const invalidBulkDeleteMixedOperation = await apiRequest(context, "POST", "/v1/transactions/bulk", {
      token: accessToken,
      expectedStatus: 400,
      body: {
        transaction_ids: [transactionId],
        operation: "delete",
        review_status: "reviewed"
      }
    });
    assert.equal(
      invalidBulkDeleteMixedOperation.payload?.error?.message,
      "Invalid bulk delete: cannot be combined with updates"
    );

    const bulkDelete = await apiRequest(context, "POST", "/v1/transactions/bulk", {
      token: accessToken,
      expectedStatus: 200,
      body: {
        transaction_ids: bulkTransactionIds,
        operation: "delete"
      }
    });
    assert.equal(bulkDelete.payload?.result?.updated, 2);
    assert.equal(
      bulkDelete.payload?.result?.transactions?.every((entry) => Boolean(entry.deleted_at)),
      true
    );

    const deletedRowsMissingFromList = await apiRequest(
      context,
      "GET",
      "/v1/transactions?range=all",
      {
        token: accessToken,
        expectedStatus: 200
      }
    );
    assert.equal(
      bulkTransactionIds.every((id) => deletedRowsMissingFromList.payload?.items?.every((entry) => entry.id !== id)),
      true
    );

    const updated = await apiRequest(context, "PUT", `/v1/transactions/${transactionId}`, {
      token: accessToken,
      expectedStatus: 200,
      body: {
        description: "Transfer to HYSA",
        transaction_type: "transfer",
        tags: ["moving-funds", "internal"],
        review_status: "needs_review",
        recurring_rule_id: "rr_contract_002"
      }
    });
    assert.equal(updated.payload?.transaction?.description, "Transfer to HYSA");
    assert.equal(updated.payload?.transaction?.transaction_type, "transfer");
    assert.deepEqual(updated.payload?.transaction?.tags, ["moving-funds", "internal"]);
    assert.equal(updated.payload?.transaction?.review_status, "needs_review");
    assert.equal(updated.payload?.transaction?.needs_category_review, true);
    assert.equal(updated.payload?.transaction?.recurring_rule_id, "rr_contract_002");

    const updateClearReviewAndTags = await apiRequest(context, "PUT", `/v1/transactions/${transactionId}`, {
      token: accessToken,
      expectedStatus: 200,
      body: {
        needs_category_review: false,
        tags: null,
        recurring_rule_id: null
      }
    });
    assert.equal(updateClearReviewAndTags.payload?.transaction?.review_status, "reviewed");
    assert.equal(updateClearReviewAndTags.payload?.transaction?.needs_category_review, false);
    assert.deepEqual(updateClearReviewAndTags.payload?.transaction?.tags, []);
    assert.equal(updateClearReviewAndTags.payload?.transaction?.recurring_rule_id, null);

    const invalidType = await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 400,
      body: {
        transaction_date: "2026-02-04",
        description: "Invalid credit expense",
        merchant_raw: "Type Validation",
        amount: 25,
        direction: "inflow",
        account_name: "Primary Checking",
        category_final: "Income",
        transaction_type: "expense"
      }
    });
    assert.equal(invalidType.payload?.error?.message, "Invalid transaction type for inflow direction");

    const invalidTags = await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 400,
      body: {
        transaction_date: "2026-02-05",
        description: "Invalid tags payload",
        merchant_raw: "Tag Validation",
        amount: -8,
        account_name: "Primary Checking",
        category_final: "Dining",
        tags: "dining"
      }
    });
    assert.equal(invalidTags.payload?.error?.message, "Invalid tags");

    const invalidCategory = await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 400,
      body: {
        transaction_date: "2026-02-06",
        description: "Unknown category create",
        merchant_raw: "Category Validation",
        amount: -12,
        account_name: "Primary Checking",
        category_final: "Not A Category"
      }
    });
    assert.equal(invalidCategory.payload?.error?.message, "Invalid category");

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
    assert.equal(storage.payload?.storage?.backend, "sqlite");
    assert.equal(storage.payload?.storage?.sqlite?.backend, "sqlite");

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

    await ensureCategoryExists(context, accessToken, "Dining", "extra", "expense");

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

  await t.test("investments endpoints expose overview, holdings, positions, and performance contracts", async () => {
    const createdHolding = await apiRequest(context, "POST", "/v1/investments/holdings", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        account_name: "Parity Brokerage",
        symbol: "NFLX",
        asset_name: "Netflix Inc",
        asset_class: "equity",
        quantity: 3.25,
        average_cost: 250.5,
        market_price: 299.05,
        previous_close_price: 296.12,
        as_of_date: "2026-03-01"
      }
    });
    assert.equal(createdHolding.payload?.holding?.symbol, "NFLX");

    const csvImport = await apiRequest(context, "POST", "/v1/investments/holdings/import-csv", {
      token: accessToken,
      expectedStatus: 200,
      body: {
        sourceFileId: "contract_import_001",
        csvText: [
          "Account,Ticker,Shares,Cost Basis,Market Price,Previous Close,As Of",
          "Parity Brokerage,NFLX,3.50,251.00,300.10,299.00,2026-03-02",
          "Parity Brokerage,VOO,12.00,430.25,439.10,438.00,2026-03-02"
        ].join("\n")
      }
    });
    assert.equal(csvImport.payload?.result?.total_rows, 2);
    assert.equal(Array.isArray(csvImport.payload?.result?.imported), true);
    assert.equal(Array.isArray(csvImport.payload?.result?.updated), true);

    const holdings = await apiRequest(context, "GET", "/v1/investments/holdings", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(Array.isArray(holdings.payload?.items), true);
    assert.equal(holdings.payload?.items?.length >= 2, true);

    const overview = await apiRequest(context, "GET", "/v1/investments/overview?timeframe=3M&query=nflx", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(typeof overview.payload?.overview?.summary?.total_market_value, "number");
    assert.equal(Array.isArray(overview.payload?.overview?.allocations), true);
    assert.equal(Array.isArray(overview.payload?.overview?.accounts), true);
    assert.equal(Array.isArray(overview.payload?.overview?.positions), true);
    assert.equal(typeof overview.payload?.overview?.performance?.timeframe, "string");

    const positions = await apiRequest(context, "GET", "/v1/investments/positions?query=nflx", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(Array.isArray(positions.payload?.items), true);
    assert.equal(typeof positions.payload?.total, "number");
    assert.equal(positions.payload?.items?.every((entry) => entry.symbol.includes("NFLX")), true);

    const accounts = await apiRequest(context, "GET", "/v1/investments/accounts", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(Array.isArray(accounts.payload?.items), true);

    const performance = await apiRequest(context, "GET", "/v1/investments/performance?timeframe=1M&symbol=NFLX", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(performance.payload?.timeframe, "1M");
    assert.equal(performance.payload?.featured_symbol, "NFLX");
    assert.equal(Array.isArray(performance.payload?.portfolio), true);
    assert.equal(Array.isArray(performance.payload?.security), true);
  });

  await t.test("recurrings endpoints expose rule lifecycle and deterministic evaluation contracts", async () => {
    await ensureCategoryExists(context, accessToken, "Housing", "essential", "expense");

    const createdRecurring = await apiRequest(context, "POST", "/v1/recurrings", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        name: "Monthly Rent",
        cadence: "monthly",
        amount: 1850,
        direction: "outflow",
        category_final: "Housing",
        merchant_pattern: "Sunset Apartments"
      }
    });
    const recurringId = createdRecurring.payload?.recurring?.id;
    assert.equal(typeof recurringId, "string");
    assert.equal(createdRecurring.payload?.recurring?.status, "active");

    await apiRequest(context, "POST", "/v1/transactions", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        transaction_date: "2026-03-05",
        description: "Rent payment",
        merchant_raw: "Sunset Apartments",
        amount: -1850,
        category_final: "Housing"
      }
    });

    const listed = await apiRequest(context, "GET", "/v1/recurrings", {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(Array.isArray(listed.payload?.items), true);
    assert.equal(listed.payload?.items?.length > 0, true);

    const fetched = await apiRequest(context, "GET", `/v1/recurrings/${recurringId}`, {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(fetched.payload?.recurring?.id, recurringId);

    const evaluated = await apiRequest(context, "POST", `/v1/recurrings/${recurringId}/evaluate`, {
      token: accessToken,
      expectedStatus: 200,
      body: {
        start: "2026-03-01",
        end: "2026-03-31"
      }
    });
    assert.equal(typeof evaluated.payload?.evaluation?.match_count, "number");
    assert.equal(Array.isArray(evaluated.payload?.evaluation?.linked_transaction_ids), true);

    const paused = await apiRequest(context, "POST", `/v1/recurrings/${recurringId}/pause`, {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(paused.payload?.recurring?.status, "paused");

    const resumed = await apiRequest(context, "POST", `/v1/recurrings/${recurringId}/resume`, {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(resumed.payload?.recurring?.status, "active");

    const archived = await apiRequest(context, "POST", `/v1/recurrings/${recurringId}/archive`, {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(archived.payload?.recurring?.status, "archived");

    const deleted = await apiRequest(context, "DELETE", `/v1/recurrings/${recurringId}`, {
      token: accessToken,
      expectedStatus: 200
    });
    assert.equal(deleted.payload?.result?.deleted, true);
  });

  await t.test("generic settings remain explicit 404 contracts", async () => {
    const response = await apiRequest(context, "GET", "/v1/settings", {
      token: accessToken,
      expectedStatus: 404
    });
    assert.equal(response.payload?.error?.message, "Endpoint not found: GET /v1/settings");
  });

  await t.test("legacy migration endpoint is not exposed", async () => {
    const response = await apiRequest(context, "POST", "/v1/migrations/minance/sqlite", {
      token: accessToken,
      expectedStatus: 404,
      body: {
        fileName: "legacy.db",
        sqliteBase64: "abcd"
      }
    });
    assert.equal(response.payload?.error?.message, "Endpoint not found: POST /v1/migrations/minance/sqlite");
  });
});
