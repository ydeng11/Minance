import { loadStore, saveStore, addAuditEvent } from "./store.js";
import { createId, nowIso, normalizeText, parseDate, toDecimal } from "./utils.js";

const DEFAULT_ACCOUNT_TYPE = "checking";
const DEFAULT_CURRENCY = "USD";

const ACCOUNT_TYPE_ALIASES = new Map(
  Object.entries({
    checking: "checking",
    chequing: "checking",
    savings: "savings",
    depository: "depository",
    deposit: "depository",
    credit: "credit",
    credit_card: "credit",
    loan: "loan",
    investment: "investment",
    brokerage: "investment",
    cash: "cash"
  })
);

const LIABILITY_ACCOUNT_TYPES = new Set(["credit", "loan"]);

function hasAnyField(payload, fields) {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  return fields.some((field) => Object.hasOwn(payload, field));
}

function normalizeAccountType(rawValue) {
  const normalized = normalizeText(rawValue || DEFAULT_ACCOUNT_TYPE).replace(/\s+/g, "_");
  const accountType = ACCOUNT_TYPE_ALIASES.get(normalized);
  if (!accountType) {
    throw new Error("Invalid account type");
  }
  return accountType;
}

function normalizeCurrency(rawValue) {
  const currency = String(rawValue || DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY;
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Invalid currency code");
  }
  return currency;
}

function normalizeDisplayName(rawValue) {
  const value = String(rawValue || "").trim();
  if (value.length < 2) {
    throw new Error("Account name is required");
  }
  return value;
}

function normalizeSourceInstitution(rawValue) {
  const value = String(rawValue || "").trim();
  return value || null;
}

function normalizeInitialBalance(rawValue, accountType) {
  const parsed = toDecimal(rawValue ?? 0);
  if (parsed == null) {
    throw new Error("initialBalance must be numeric");
  }
  const absolute = Math.abs(parsed);
  if (LIABILITY_ACCOUNT_TYPES.has(accountType)) {
    return -absolute;
  }
  return absolute;
}

function toAccountResponse(entry) {
  return {
    id: entry.id,
    userId: entry.userId,
    displayName: entry.displayName,
    sourceInstitution: entry.sourceInstitution || null,
    accountType: entry.accountType || DEFAULT_ACCOUNT_TYPE,
    currency: entry.currency || DEFAULT_CURRENCY,
    initialBalance: Number(entry.initialBalance || 0),
    version: Number(entry.version || 1),
    normalizedKey: entry.normalizedKey,
    createdAt: entry.createdAt || null,
    updatedAt: entry.updatedAt || null
  };
}

function ensureAccountVersion(account) {
  const nextVersion = Number(account.version || 1);
  account.version = Number.isFinite(nextVersion) && nextVersion > 0 ? Math.trunc(nextVersion) : 1;
  return account.version;
}

function parseExpectedVersion(payload = {}) {
  if (!hasAnyField(payload, ["expectedVersion", "expected_version"])) {
    return null;
  }
  const value = Number(payload.expectedVersion ?? payload.expected_version);
  if (!Number.isFinite(value) || value < 1) {
    throw new Error("Invalid expected account version");
  }
  return Math.trunc(value);
}

function assertExpectedVersion(account, expectedVersion) {
  if (expectedVersion == null) {
    return;
  }
  const version = ensureAccountVersion(account);
  if (version !== expectedVersion) {
    throw new Error("Invalid account version conflict");
  }
}

function ensureUniqueNormalizedKey(store, userId, normalizedKey, excludeId = null) {
  const duplicate = store.accounts.find(
    (entry) => entry.userId === userId && entry.normalizedKey === normalizedKey && entry.id !== excludeId
  );
  if (duplicate) {
    throw new Error("Invalid account name already exists");
  }
}

function resolveCreatePayload(payload = {}) {
  const displayName = normalizeDisplayName(payload.displayName ?? payload.accountName ?? payload.account_name);
  const accountType = normalizeAccountType(payload.accountType ?? payload.account_type);
  const currency = normalizeCurrency(payload.currency);
  const initialBalance = normalizeInitialBalance(
    payload.initialBalance ?? payload.initial_balance ?? payload.initBalance,
    accountType
  );
  const sourceInstitution = normalizeSourceInstitution(
    payload.sourceInstitution ?? payload.source_institution ?? payload.bankName ?? payload.bank_name
  );
  return {
    displayName,
    accountType,
    currency,
    initialBalance,
    sourceInstitution
  };
}

function resolveUpdatePayload(account, payload = {}) {
  const displayName = hasAnyField(payload, ["displayName", "accountName", "account_name"])
    ? normalizeDisplayName(payload.displayName ?? payload.accountName ?? payload.account_name)
    : account.displayName;
  const accountType = hasAnyField(payload, ["accountType", "account_type"])
    ? normalizeAccountType(payload.accountType ?? payload.account_type)
    : normalizeAccountType(account.accountType);
  const currency = hasAnyField(payload, ["currency"])
    ? normalizeCurrency(payload.currency)
    : normalizeCurrency(account.currency || DEFAULT_CURRENCY);
  const initialBalance = hasAnyField(payload, ["initialBalance", "initial_balance", "initBalance"])
    ? normalizeInitialBalance(payload.initialBalance ?? payload.initial_balance ?? payload.initBalance, accountType)
    : Number(account.initialBalance || 0);
  const sourceInstitution = hasAnyField(payload, ["sourceInstitution", "source_institution", "bankName", "bank_name"])
    ? normalizeSourceInstitution(
      payload.sourceInstitution ?? payload.source_institution ?? payload.bankName ?? payload.bank_name
    )
    : account.sourceInstitution || null;
  return {
    displayName,
    accountType,
    currency,
    initialBalance,
    sourceInstitution
  };
}

function updateLinkedTransactionKeys(store, userId, accountId, normalizedKey, updatedAt) {
  for (const transaction of store.transactions) {
    if (transaction.user_id === userId && transaction.account_id === accountId) {
      transaction.account_key = normalizedKey;
      transaction.updated_at = updatedAt;
    }
  }
}

export function getSupportedAccountTypes() {
  return Array.from(new Set(ACCOUNT_TYPE_ALIASES.values())).sort((a, b) => a.localeCompare(b));
}

export function listAccounts(userId) {
  const store = loadStore();
  return store.accounts
    .filter((entry) => entry.userId === userId)
    .map((entry) => toAccountResponse(entry))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function createAccount(userId, payload) {
  const store = loadStore();
  const normalized = resolveCreatePayload(payload);
  const normalizedKey = normalizeText(normalized.displayName);
  ensureUniqueNormalizedKey(store, userId, normalizedKey);

  const timestamp = nowIso();
  const account = {
    id: createId("acct"),
    userId,
    normalizedKey,
    displayName: normalized.displayName,
    sourceInstitution: normalized.sourceInstitution,
    accountType: normalized.accountType,
    currency: normalized.currency,
    initialBalance: normalized.initialBalance,
    manualAdjustments: [],
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  store.accounts.push(account);
  saveStore(store);
  addAuditEvent(userId, "account.create", { accountId: account.id });

  return toAccountResponse(account);
}

export function updateAccount(userId, accountId, payload) {
  const store = loadStore();
  const account = store.accounts.find((entry) => entry.id === accountId && entry.userId === userId);
  if (!account) {
    throw new Error("Account not found");
  }
  const expectedVersion = parseExpectedVersion(payload);
  assertExpectedVersion(account, expectedVersion);

  const normalized = resolveUpdatePayload(account, payload);
  const normalizedKey = normalizeText(normalized.displayName);
  ensureUniqueNormalizedKey(store, userId, normalizedKey, account.id);

  const updatedAt = nowIso();
  const currentVersion = ensureAccountVersion(account);
  account.normalizedKey = normalizedKey;
  account.displayName = normalized.displayName;
  account.sourceInstitution = normalized.sourceInstitution;
  account.accountType = normalized.accountType;
  account.currency = normalized.currency;
  account.initialBalance = normalized.initialBalance;
  account.version = currentVersion + 1;
  account.updatedAt = updatedAt;

  updateLinkedTransactionKeys(store, userId, account.id, normalizedKey, updatedAt);

  saveStore(store);
  addAuditEvent(userId, "account.update", { accountId: account.id });

  return toAccountResponse(account);
}

function toSignedTransactionAmount(transaction) {
  const amount = Number(transaction.amount || 0);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return transaction.direction === "debit" ? -Math.abs(amount) : Math.abs(amount);
}

function findAccount(store, userId, accountId) {
  return store.accounts.find((entry) => entry.id === accountId && entry.userId === userId) || null;
}

export function createAccountManualAdjustment(userId, accountId, payload = {}) {
  const store = loadStore();
  const account = findAccount(store, userId, accountId);
  if (!account) {
    throw new Error("Account not found");
  }

  const expectedVersion = parseExpectedVersion(payload);
  assertExpectedVersion(account, expectedVersion);

  const amountDelta = toDecimal(payload.amountDelta ?? payload.amount_delta ?? payload.amount);
  if (amountDelta == null || amountDelta === 0) {
    throw new Error("Invalid manual adjustment amount");
  }

  const effectiveAt = parseDate(payload.effectiveAt ?? payload.effective_at ?? payload.date ?? nowIso());
  if (!effectiveAt) {
    throw new Error("Invalid manual adjustment effective date");
  }

  const reason = String(payload.reason || "").trim();
  if (reason.length < 3) {
    throw new Error("Invalid manual adjustment reason");
  }

  const note = String(payload.note || "").trim() || null;
  const timestamp = nowIso();
  const currentVersion = ensureAccountVersion(account);
  const adjustment = {
    id: createId("acct_adj"),
    accountId: account.id,
    userId,
    amountDelta,
    effectiveAt,
    reason,
    note,
    createdAt: timestamp,
    createdByUserId: userId,
    expectedVersion: expectedVersion ?? currentVersion
  };

  if (!Array.isArray(account.manualAdjustments)) {
    account.manualAdjustments = [];
  }
  account.manualAdjustments.push(adjustment);
  account.version = currentVersion + 1;
  account.updatedAt = timestamp;

  saveStore(store);
  addAuditEvent(userId, "account.manual_adjustment.create", {
    accountId: account.id,
    adjustmentId: adjustment.id,
    amountDelta: adjustment.amountDelta,
    effectiveAt: adjustment.effectiveAt,
    reason: adjustment.reason,
    expectedVersion: adjustment.expectedVersion,
    nextVersion: account.version
  });

  return {
    account: toAccountResponse(account),
    adjustment
  };
}

export function listAccountBalanceHistory(userId, accountId, filters = {}) {
  const store = loadStore();
  const account = findAccount(store, userId, accountId);
  if (!account) {
    throw new Error("Account not found");
  }

  const start = filters.start ? parseDate(filters.start) : null;
  const end = filters.end ? parseDate(filters.end) : null;
  if (filters.start && !start) {
    throw new Error("Invalid start date");
  }
  if (filters.end && !end) {
    throw new Error("Invalid end date");
  }

  const accountTransactions = store.transactions
    .filter((entry) => entry.user_id === userId && entry.account_id === account.id && !entry.deleted_at)
    .map((entry) => ({
      id: entry.id,
      date: parseDate(entry.transaction_date) || parseDate(entry.created_at) || null,
      delta: toSignedTransactionAmount(entry),
      kind: "transaction",
      description: String(entry.description || entry.merchant_raw || "Transaction"),
      sourceId: entry.id,
      createdAt: entry.created_at || entry.updated_at || null
    }))
    .filter((entry) => entry.date);

  const manualAdjustments = (Array.isArray(account.manualAdjustments) ? account.manualAdjustments : [])
    .map((entry) => ({
      id: entry.id,
      date: parseDate(entry.effectiveAt) || parseDate(entry.createdAt) || null,
      delta: Number(entry.amountDelta || 0),
      kind: "manual_adjustment",
      description: String(entry.reason || "Manual adjustment"),
      note: entry.note || null,
      sourceId: entry.id,
      createdAt: entry.createdAt || null
    }))
    .filter((entry) => entry.date);

  const events = [...accountTransactions, ...manualAdjustments]
    .sort((left, right) => {
      if (left.date !== right.date) {
        return left.date.localeCompare(right.date);
      }
      return String(left.createdAt || "").localeCompare(String(right.createdAt || ""));
    });

  const openingBalance = Number(account.initialBalance || 0);
  let runningBalance = openingBalance;
  const openingDate = parseDate(account.createdAt) || null;
  const items = [];

  if ((!start || !openingDate || openingDate >= start) && (!end || !openingDate || openingDate <= end)) {
    items.push({
      date: openingDate,
      kind: "opening_balance",
      delta: 0,
      balanceAfter: runningBalance,
      description: "Opening balance",
      sourceId: account.id
    });
  }

  for (const event of events) {
    runningBalance += Number(event.delta || 0);
    if (start && event.date < start) {
      continue;
    }
    if (end && event.date > end) {
      continue;
    }
    items.push({
      date: event.date,
      kind: event.kind,
      delta: Math.round(Number(event.delta || 0) * 100) / 100,
      balanceAfter: Math.round(runningBalance * 100) / 100,
      description: event.description,
      note: event.note || null,
      sourceId: event.sourceId
    });
  }

  return {
    account: toAccountResponse(account),
    openingBalance,
    currentBalance: Math.round(runningBalance * 100) / 100,
    currency: account.currency || DEFAULT_CURRENCY,
    items
  };
}
