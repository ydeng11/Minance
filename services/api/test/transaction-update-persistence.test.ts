import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import { isSqliteCliAvailable } from "../src/sqlite-foundation.ts";
import { readStoreCollectionsFromSqlite } from "../src/sqlite-store-repository.ts";

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

async function waitForHealth(baseUrl, serverProcess, getLogs) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
      const logs = getLogs();
      throw new Error(`API process exited early.\nstdout:\n${logs.stdout}\nstderr:\n${logs.stderr}`);
    }
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.status === 200) {
        return;
      }
    } catch {
      // The server may still be starting.
    }
    await delay(100);
  }
  const logs = getLogs();
  throw new Error(`Timed out waiting for API readiness.\nstdout:\n${logs.stdout}\nstderr:\n${logs.stderr}`);
}

async function stopProcess(processRef) {
  if (processRef.exitCode !== null || processRef.signalCode !== null) {
    return;
  }
  processRef.kill("SIGTERM");
  const exitPromise = new Promise((resolve) => processRef.once("exit", resolve));
  const timedOut = Symbol("timeout");
  const result = await Promise.race([exitPromise, delay(2_000).then(() => timedOut)]);
  if (result === timedOut) {
    processRef.kill("SIGKILL");
    await exitPromise;
  }
}

async function startApiServer(t) {
  const port = await findAvailablePort();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "minance-transaction-update-"));
  const sqliteFile = path.join(tempDir, "runtime.sqlite");
  const dataFile = path.join(tempDir, "store.json");
  const env = {
    ...process.env,
    PORT: String(port),
    NODE_ENV: "test",
    MINANCE_STORE_BACKEND: "sqlite",
    MINANCE_SEED_TEST_ACCOUNT: "false",
    MINANCE_DATA_FILE_TEST: dataFile,
    MINANCE_SQLITE_FILE_TEST: sqliteFile,
    MINANCE_DATA_FILE: dataFile,
    MINANCE_SQLITE_FILE: sqliteFile
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

  return { baseUrl, sqliteFile, getLogs };
}

async function apiRequest(context, method, pathName, { token = null, body, expectedStatus } = {}) {
  const headers = {};
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
      `Unexpected ${method} ${pathName}: ${raw}\nstdout:\n${logs.stdout}\nstderr:\n${logs.stderr}`
    );
  }
  return { status: response.status, payload };
}

async function ensureCategoryExists(context, token, name, type = null) {
  const listed = await apiRequest(context, "GET", "/v1/categories", { token, expectedStatus: 200 });
  if (listed.payload?.categories?.some((entry) => entry.name === name)) {
    return;
  }
  const body = { name, coarseKey: "extra" };
  if (type) {
    body.type = type;
  }
  await apiRequest(context, "POST", "/v1/categories", {
    token,
    expectedStatus: 201,
    body
  });
}

test("transaction update persists one transaction row and one audit row", { skip: !isSqliteCliAvailable() }, async (t) => {
  const context = await startApiServer(t);
  const signup = await apiRequest(context, "POST", "/v1/auth/signup", {
    expectedStatus: 201,
    body: { email: "targeted-update@example.com", password: "contractpass123" }
  });
  const token = signup.payload?.tokens?.accessToken;
  assert.equal(typeof token, "string");

  await ensureCategoryExists(context, token, "Travel");
  const created = await apiRequest(context, "POST", "/v1/transactions", {
    token,
    expectedStatus: 201,
    body: {
      transaction_date: "2026-04-01",
      description: "Targeted update dinner",
      merchant_raw: "Targeted Bistro",
      amount: -18.5,
      direction: "outflow",
      account_name: "Primary Checking",
      category_final: "Travel"
    }
  });
  const transactionId = created.payload?.transaction?.id;
  assert.equal(typeof transactionId, "string");
  assert.equal(created.payload?.transaction?.transaction_type, "expense");

  const persistedBeforeUpdate = readStoreCollectionsFromSqlite({ dbPath: context.sqliteFile });
  const updated = await apiRequest(context, "PUT", `/v1/transactions/${transactionId}`, {
    token,
    expectedStatus: 200,
    body: { transaction_type: "transfer" }
  });
  assert.equal(updated.payload?.transaction?.id, transactionId);
  assert.equal(updated.payload?.transaction?.transaction_type, "transfer");

  const persistedAfterUpdate = readStoreCollectionsFromSqlite({ dbPath: context.sqliteFile });
  const persistedTransaction = persistedAfterUpdate.transactions.find((entry) => entry.id === transactionId);
  const updateAuditEvents = persistedAfterUpdate.auditEvents.filter(
    (entry) => entry.action === "transaction.update" && entry.details?.transactionId === transactionId
  );

  assert.equal(persistedAfterUpdate.transactions.length, persistedBeforeUpdate.transactions.length);
  assert.equal(persistedAfterUpdate.accounts.length, persistedBeforeUpdate.accounts.length);
  assert.equal(persistedAfterUpdate.categoryRules.length, persistedBeforeUpdate.categoryRules.length);
  assert.equal(persistedAfterUpdate.auditEvents.length, persistedBeforeUpdate.auditEvents.length + 1);
  assert.equal(persistedTransaction?.transaction_type, "transfer");
  assert.equal(persistedTransaction?.description, "Targeted update dinner");
  assert.equal(updateAuditEvents.length, 1);
});
