import { createId, nowIso, normalizeText } from "./utils.ts";
import { formatAccountDisplayIdentifier } from "../../../packages/domain/src/accounts.ts";

function normalizeAccountIdentity(value) {
  return normalizeText(value || "");
}

function normalizeAccountDisplayIdentifier(account) {
  return normalizeAccountIdentity(
    formatAccountDisplayIdentifier(
      account.displayName,
      account.sourceInstitution,
      account.accountType
    )
  );
}

function countLinkedTransactions(store, userId, account) {
  return (store.transactions || []).reduce((count, transaction) => {
    if (transaction.user_id !== userId || transaction.deleted_at) {
      return count;
    }
    if (transaction.account_id === account.id || transaction.account_key === account.normalizedKey) {
      return count + 1;
    }
    return count;
  }, 0);
}

function scoreAccountRichness(store, userId, account) {
  let score = 0;

  if (String(account.sourceInstitution || "").trim()) {
    score += 4;
  }

  const accountType = String(account.accountType || "").trim().toLowerCase();
  if (accountType && accountType !== "checking") {
    score += 2;
  }

  if (Number(account.initialBalance || 0) !== 0) {
    score += 1;
  }

  if (Number(account.version || 1) > 1) {
    score += 1;
  }

  return score + countLinkedTransactions(store, userId, account);
}

export function pickPreferredAccountIdentity(store, userId, accounts = []) {
  if (!accounts.length) {
    return null;
  }

  return [...accounts].sort((left, right) => {
    const scoreDelta = scoreAccountRichness(store, userId, right) - scoreAccountRichness(store, userId, left);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const byCreatedAt = String(left.createdAt || "").localeCompare(String(right.createdAt || ""));
    if (byCreatedAt !== 0) {
      return byCreatedAt;
    }

    return String(left.id || "").localeCompare(String(right.id || ""));
  })[0] || null;
}

function findAccountsByNormalizedKey(store, userId, normalizedKey) {
  if (!normalizedKey) {
    return [];
  }
  return (store.accounts || []).filter(
    (entry) => entry.userId === userId && normalizeAccountIdentity(entry.normalizedKey) === normalizedKey
  );
}

export function findAccountsByDisplayName(store, userId, displayName) {
  const normalizedDisplayName = normalizeAccountIdentity(displayName);
  if (!normalizedDisplayName) {
    return [];
  }
  return (store.accounts || []).filter(
    (entry) =>
      entry.userId === userId
      && (
        normalizeAccountIdentity(entry.displayName) === normalizedDisplayName
        || normalizeAccountDisplayIdentifier(entry) === normalizedDisplayName
      )
  );
}

export function resolveAccountIdentity(store, userId, { accountId = null, accountKey = null, accountName = null } = {}) {
  if (accountId) {
    const existingById = (store.accounts || []).find((entry) => entry.id === accountId && entry.userId === userId) || null;
    if (existingById) {
      return existingById;
    }
  }

  const normalizedKeyCandidates = [accountKey, accountName]
    .map((value) => normalizeAccountIdentity(value))
    .filter(Boolean);

  for (const normalizedKey of normalizedKeyCandidates) {
    const matches = findAccountsByNormalizedKey(store, userId, normalizedKey);
    if (matches.length > 0) {
      return pickPreferredAccountIdentity(store, userId, matches);
    }
  }

  const displayNameCandidates = [accountName, accountKey]
    .map((value) => normalizeAccountIdentity(value))
    .filter(Boolean);

  for (const normalizedDisplayName of displayNameCandidates) {
    const matches = findAccountsByDisplayName(store, userId, normalizedDisplayName);
    if (matches.length > 0) {
      return pickPreferredAccountIdentity(store, userId, matches);
    }
  }

  return null;
}

export function ensureAccountIdentity(
  store,
  userId,
  {
    accountId = null,
    accountKey = null,
    accountName = null,
    fallbackName = "Manual Account",
    sourceInstitution = null,
    accountType = "checking"
  } = {}
) {
  const existing = resolveAccountIdentity(store, userId, {
    accountId,
    accountKey,
    accountName
  });
  if (existing) {
    return existing;
  }

  const displayName = String(accountName || fallbackName).trim() || fallbackName;
  const timestamp = nowIso();
  const account = {
    id: createId("acct"),
    userId,
    normalizedKey: normalizeAccountIdentity(displayName),
    displayName,
    sourceInstitution,
    accountType,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  store.accounts.push(account);
  return account;
}

export function resolveCanonicalAccountKey(store, userId, { accountId = null, accountKey = null, accountName = null } = {}) {
  return (
    resolveAccountIdentity(store, userId, {
      accountId,
      accountKey,
      accountName
    })?.normalizedKey
    || normalizeAccountIdentity(accountName || accountKey || "")
  );
}
