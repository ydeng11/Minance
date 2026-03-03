import { loadStore, saveStore, addAuditEvent } from "./store.js";
import { createId, nowIso, normalizeText, toDecimal } from "./utils.js";

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
    normalizedKey: entry.normalizedKey,
    createdAt: entry.createdAt || null,
    updatedAt: entry.updatedAt || null
  };
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

  const normalized = resolveUpdatePayload(account, payload);
  const normalizedKey = normalizeText(normalized.displayName);
  ensureUniqueNormalizedKey(store, userId, normalizedKey, account.id);

  const updatedAt = nowIso();
  account.normalizedKey = normalizedKey;
  account.displayName = normalized.displayName;
  account.sourceInstitution = normalized.sourceInstitution;
  account.accountType = normalized.accountType;
  account.currency = normalized.currency;
  account.initialBalance = normalized.initialBalance;
  account.updatedAt = updatedAt;

  updateLinkedTransactionKeys(store, userId, account.id, normalizedKey, updatedAt);

  saveStore(store);
  addAuditEvent(userId, "account.update", { accountId: account.id });

  return toAccountResponse(account);
}
