import { loadStore, saveStore } from "../store.ts";
import { createId, nowIso, normalizeText } from "../utils.ts";
import { buildTransactionFingerprint } from "../transaction-fingerprint.ts";
import { findAccountsByDisplayName, pickPreferredAccountIdentity } from "../account-identity.ts";

function appendAuditEvent(store, userId, details) {
  store.auditEvents.push({
    id: createId("audit"),
    userId,
    action: "account.identity.repaired",
    details,
    createdAt: nowIso()
  });
}

function rewriteTransactionAccountIdentity(transaction, userId, accountId, accountKey, updatedAt) {
  transaction.account_id = accountId;
  transaction.account_key = accountKey;
  transaction.updated_at = updatedAt;

  if (transaction.dedupe_fingerprint) {
    transaction.dedupe_fingerprint = buildTransactionFingerprint({
      userId,
      accountKey,
      merchantNormalized: transaction.merchant_normalized,
      amount: transaction.amount,
      transactionDate: transaction.transaction_date,
      memo: transaction.memo
    });
  }
}

function mergeManualAdjustments(survivor, duplicates = []) {
  const survivorAdjustments = Array.isArray(survivor.manualAdjustments) ? survivor.manualAdjustments : [];
  const duplicateAdjustments = duplicates.flatMap((duplicate) =>
    Array.isArray(duplicate.manualAdjustments) ? duplicate.manualAdjustments : []
  );
  if (duplicateAdjustments.length === 0) {
    return survivorAdjustments;
  }
  return survivorAdjustments.concat(duplicateAdjustments);
}

function shouldRepairDuplicateGroup(duplicates, displayNameKey) {
  const normalizedKeys = duplicates
    .map((entry) => normalizeText(entry.normalizedKey || ""))
    .filter(Boolean);
  const institutions = new Set(
    duplicates
      .map((entry) => normalizeText(entry.sourceInstitution || ""))
      .filter(Boolean)
  );

  return (
    normalizedKeys.includes(displayNameKey)
    && normalizedKeys.some((key) => key !== displayNameKey)
    && institutions.size <= 1
  );
}

export function repairLegacyAccountIdentityDrift() {
  const store = loadStore();
  const userIds = Array.from(new Set((store.accounts || []).map((account) => account.userId).filter(Boolean)));
  let duplicateGroupsRepaired = 0;
  const updatedAt = nowIso();

  for (const userId of userIds) {
    const accounts = (store.accounts || []).filter((entry) => entry.userId === userId);
    const processedKeys = new Set();

    for (const account of accounts) {
      const displayNameKey = normalizeText(account.displayName || "");
      if (!displayNameKey || processedKeys.has(displayNameKey)) {
        continue;
      }
      processedKeys.add(displayNameKey);

      const duplicates = findAccountsByDisplayName(store, userId, displayNameKey);
      if (duplicates.length < 2) {
        continue;
      }
      if (!shouldRepairDuplicateGroup(duplicates, displayNameKey)) {
        continue;
      }

      const survivor = pickPreferredAccountIdentity(store, userId, duplicates);
      if (!survivor) {
        continue;
      }

      const survivorKey = String(survivor.normalizedKey || "").trim() || displayNameKey;
      const duplicateIds = new Set(duplicates.filter((entry) => entry.id !== survivor.id).map((entry) => entry.id));
      const historicalKeys = new Set(duplicates.map((entry) => String(entry.normalizedKey || "").trim()).filter(Boolean));

      for (const transaction of store.transactions || []) {
        if (transaction.user_id !== userId) {
          continue;
        }
        if (
          duplicateIds.has(transaction.account_id)
          || transaction.account_id === survivor.id
          || historicalKeys.has(String(transaction.account_key || "").trim())
        ) {
          rewriteTransactionAccountIdentity(transaction, userId, survivor.id, survivorKey, updatedAt);
        }
      }

      for (const recurringRule of store.recurringRules || []) {
        if (recurringRule.user_id === userId && duplicateIds.has(recurringRule.account_id)) {
          recurringRule.account_id = survivor.id;
          recurringRule.updated_at = updatedAt;
        }
      }

      survivor.updatedAt = updatedAt;
      if (survivor.updated_at != null) {
        survivor.updated_at = updatedAt;
      }
      if (Number.isFinite(Number(survivor.version))) {
        survivor.version = Number(survivor.version) + 1;
      }
      survivor.manualAdjustments = mergeManualAdjustments(
        survivor,
        duplicates.filter((entry) => entry.id !== survivor.id)
      );

      store.accounts = (store.accounts || []).filter(
        (entry) => entry.userId !== userId || normalizeText(entry.displayName || "") !== displayNameKey || entry.id === survivor.id
      );

      appendAuditEvent(store, userId, {
        displayName: survivor.displayName,
        survivorAccountId: survivor.id,
        removedAccountIds: Array.from(duplicateIds),
        canonicalKey: survivorKey
      });
      duplicateGroupsRepaired += 1;
    }
  }

  if (duplicateGroupsRepaired > 0) {
    saveStore(store);
  }

  return {
    duplicateGroupsRepaired
  };
}
