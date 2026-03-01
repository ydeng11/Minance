import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { TMP_DIR } from "./config.js";
import { loadStore, saveStore, addAuditEvent } from "./store.js";
import { createId, nowIso, parseDate, stableHash, normalizeText, toDecimal } from "./utils.js";
import { normalizeMerchant } from "./categorization.js";

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `${command} exited with code ${code}`));
        return;
      }
      resolve(stdout);
    });
  });
}

async function ensureSqliteInstalled() {
  try {
    await runCommand("sqlite3", ["--version"]);
  } catch {
    throw new Error("sqlite3 CLI is required for migration but was not found on this machine");
  }
}

async function querySqlite(dbPath, sql) {
  const raw = await runCommand("sqlite3", ["-json", dbPath, sql]);
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return [];
  }
}

function field(row, candidates, fallback = null) {
  for (const candidate of candidates) {
    if (Object.hasOwn(row, candidate) && row[candidate] != null) {
      return row[candidate];
    }
  }
  return fallback;
}

function normalizeLegacyAmount(value) {
  const amount = toDecimal(value);
  return amount == null ? null : Math.round(amount * 100) / 100;
}

function inferDirection(transactionType, amount) {
  const normalizedType = String(transactionType || "").toLowerCase();
  if (normalizedType.includes("debit") || normalizedType.includes("withdraw")) {
    return "debit";
  }
  if (normalizedType.includes("credit") || normalizedType.includes("deposit")) {
    return "credit";
  }

  return amount < 0 ? "debit" : "credit";
}

function dedupeFingerprint(userId, accountKey, merchantNormalized, amount, date, memo) {
  return stableHash(
    [
      userId,
      accountKey,
      merchantNormalized,
      Math.abs(amount).toFixed(2),
      parseDate(date) || "",
      memo ? stableHash(String(memo)) : ""
    ].join("|")
  );
}

function ensureTmpDir() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

export function writeUploadedSqliteFile(fileName, sqliteBase64) {
  if (!sqliteBase64) {
    throw new Error("sqliteBase64 is required");
  }

  ensureTmpDir();
  const safeName = `${Date.now()}-${String(fileName || "legacy.db").replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
  const filePath = path.join(TMP_DIR, safeName);

  fs.writeFileSync(filePath, Buffer.from(sqliteBase64, "base64"));
  return filePath;
}

export async function runLegacyMigration({ userId, sqlitePath }) {
  if (!sqlitePath) {
    throw new Error("sqlitePath is required");
  }
  if (!fs.existsSync(sqlitePath)) {
    throw new Error("SQLite file not found");
  }

  await ensureSqliteInstalled();

  const store = loadStore();
  const runId = createId("mig");
  const run = {
    id: runId,
    userId,
    status: "processing",
    sqlitePath,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    report: {
      scanned: 0,
      imported: 0,
      duplicatesSkipped: 0,
      invalidRows: 0,
      accountsImported: 0,
      categoriesImported: 0,
      rulesImported: 0,
      warnings: []
    }
  };

  store.migrationRuns.push(run);
  saveStore(store);

  const banks = await querySqlite(sqlitePath, "SELECT * FROM banks;");
  const accounts = await querySqlite(sqlitePath, "SELECT * FROM accounts;");
  const transactions = await querySqlite(sqlitePath, "SELECT * FROM transactions;");
  const categories = await querySqlite(sqlitePath, "SELECT * FROM minance_category;");
  const rawMappings = await querySqlite(sqlitePath, "SELECT * FROM raw_category_to_minance_category;");

  const banksById = new Map();
  for (const bank of banks) {
    const bankId = field(bank, ["id", "bank_id"]);
    const bankName = field(bank, ["bank_name", "name"], "Unknown");
    banksById.set(String(bankId), bankName);
  }

  const accountIdMap = new Map();
  const categoryIdToName = new Map();
  for (const accountRow of accounts) {
    const legacyId = String(field(accountRow, ["id", "account_id"]));
    const displayName = String(field(accountRow, ["account_name", "name"], "Legacy Account"));
    const accountType = String(field(accountRow, ["account_type", "type"], "checking"));
    const bankId = String(field(accountRow, ["bank_id", "bank"], ""));
    const institution = banksById.get(bankId) || null;
    const normalizedKey = normalizeText(displayName);

    let existing = store.accounts.find((entry) => entry.userId === userId && entry.normalizedKey === normalizedKey);
    if (!existing) {
      existing = {
        id: createId("acct"),
        userId,
        normalizedKey,
        displayName,
        sourceInstitution: institution,
        accountType,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      store.accounts.push(existing);
      run.report.accountsImported += 1;
    }

    accountIdMap.set(legacyId, existing.id);
  }

  for (const categoryRow of categories) {
    const categoryName = String(
      field(categoryRow, ["category", "name", "category_name", "minance_category"], "")
    ).trim();
    const categoryId = String(field(categoryRow, ["m_category_id", "id", "category_id"], "")).trim();
    if (!categoryName) {
      continue;
    }
    if (categoryId) {
      categoryIdToName.set(categoryId, categoryName);
    }

    let existing = store.categories.find((entry) => entry.userId === userId && entry.name === categoryName);
    if (!existing) {
      existing = {
        id: createId("cat"),
        userId,
        name: categoryName,
        isSystem: false,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      store.categories.push(existing);
      run.report.categoriesImported += 1;
    }
  }

  for (const mapping of rawMappings) {
    const pattern = String(field(mapping, ["raw_category", "raw", "source_category"], "")).trim();
    const mappedCategoryId = String(
      field(mapping, ["minance_category_id", "m_category_id", "category_id"], "")
    ).trim();
    const category = String(
      field(
        mapping,
        ["minance_category", "mapped_category", "category"],
        mappedCategoryId ? categoryIdToName.get(mappedCategoryId) || "" : ""
      )
    ).trim();
    if (!pattern || !category) {
      continue;
    }

    const exists = store.categoryRules.find(
      (entry) => entry.userId === userId && entry.pattern === pattern && entry.category === category
    );
    if (exists) {
      continue;
    }

    store.categoryRules.push({
      id: createId("rule"),
      userId,
      type: "contains",
      pattern,
      category,
      priority: 80,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    run.report.rulesImported += 1;
  }

  const existingFingerprints = new Set(
    store.transactions.filter((entry) => entry.user_id === userId).map((entry) => entry.dedupe_fingerprint)
  );

  for (const tx of transactions) {
    run.report.scanned += 1;

    const transactionDate = parseDate(field(tx, ["transaction_date", "date", "post_date"]));
    const rawAmount = normalizeLegacyAmount(field(tx, ["amount", "value", "transaction_amount"]));
    const description = String(field(tx, ["description", "merchant", "payee"], "")).trim();

    if (!transactionDate || rawAmount == null || !description) {
      run.report.invalidRows += 1;
      continue;
    }

    const legacyAccountId = String(field(tx, ["account_id", "account"], ""));
    const accountId = accountIdMap.get(legacyAccountId) || null;
    const account = store.accounts.find((entry) => entry.id === accountId);
    const accountKey = account?.normalizedKey || "legacy-account";

    const merchantRaw = description;
    const merchantNormalized = normalizeMerchant(merchantRaw);
    const memo = field(tx, ["memo", "notes"], null);
    const direction = inferDirection(field(tx, ["transaction_type", "type"], ""), rawAmount);
    const amount = Math.abs(rawAmount);

    const fingerprint = dedupeFingerprint(
      userId,
      accountKey,
      merchantNormalized,
      rawAmount,
      transactionDate,
      memo
    );

    if (existingFingerprints.has(fingerprint)) {
      run.report.duplicatesSkipped += 1;
      continue;
    }

    existingFingerprints.add(fingerprint);

    store.transactions.push({
      id: createId("txn"),
      user_id: userId,
      account_id: accountId,
      account_key: accountKey,
      source_type: "migrated",
      source_file_id: runId,
      transaction_date: transactionDate,
      post_date: parseDate(field(tx, ["post_date"], null)),
      merchant_raw: merchantRaw,
      merchant_normalized: merchantNormalized,
      description,
      amount,
      currency: String(field(tx, ["currency"], "USD")).toUpperCase(),
      direction,
      category_raw: String(field(tx, ["category"], "")).trim() || null,
      category_final: String(field(tx, ["category"], "Uncategorized")).trim() || "Uncategorized",
      category_confidence: 0.8,
      category_strategy: "migration",
      needs_category_review: false,
      memo: memo ? String(memo) : null,
      dedupe_fingerprint: fingerprint,
      created_at: parseDate(field(tx, ["upload_time"], null))
        ? `${parseDate(field(tx, ["upload_time"]))}T00:00:00.000Z`
        : nowIso(),
      updated_at: nowIso()
    });

    run.report.imported += 1;
  }

  run.status = "completed";
  run.updatedAt = nowIso();

  saveStore(store);
  addAuditEvent(userId, "migration.completed", { migrationId: runId, report: run.report });

  return run;
}

export function getMigrationReport(userId, migrationId) {
  const store = loadStore();
  const run = store.migrationRuns.find((entry) => entry.id === migrationId && entry.userId === userId);
  if (!run) {
    throw new Error("Migration run not found");
  }
  return run;
}
