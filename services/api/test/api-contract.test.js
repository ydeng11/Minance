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

    const ruleResponse = await apiRequest(context, "POST", "/v1/category-rules", {
      token: accessToken,
      expectedStatus: 201,
      body: {
        pattern: "parity cafe",
        category: "Parity Dining",
        type: "contains",
        priority: 70
      }
    });
    assert.equal(ruleResponse.payload?.rule?.category, "Parity Dining");
    assert.equal(ruleResponse.payload?.rule?.type, "contains");
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

  await t.test("accounts, recurrings, investments, and generic settings remain explicit 404 contracts", async () => {
    const missingEndpoints = ["/v1/accounts", "/v1/recurrings", "/v1/investments", "/v1/settings"];
    for (const endpoint of missingEndpoints) {
      const response = await apiRequest(context, "GET", endpoint, {
        token: accessToken,
        expectedStatus: 404
      });
      assert.equal(response.payload?.error?.message, `Endpoint not found: GET ${endpoint}`);
    }
  });
});
