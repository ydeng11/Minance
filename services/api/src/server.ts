import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { URL } from "node:url";

import { PORT, WEB_DIR, STORE_BACKEND } from "./config.ts";
import { sendJson, sendError, sendNoContent, parseJsonBody } from "./utils.ts";
import { signup, login, refresh, requireAuth, deleteUser, ensureDevTestAccount } from "./auth.ts";
import {
  getProviderCatalog,
  listCredentials,
  addCredential,
  rotateCredential,
  deleteCredential,
  updatePreferences,
  getPreferences,
  ensureDevOpenRouterCredential
} from "./ai.ts";
import {
  createImportJob,
  getImportById,
  updateImportMapping,
  commitImport,
  listImportProcessedRows,
  updateImportProcessedRow,
  reprocessImportRows,
  getImportReconciliation,
  resolveImportReconciliation
} from "./imports.ts";
import {
  createManualTransaction,
  listTransactions,
  bulkUpdateTransactions,
  updateTransaction,
  deleteTransaction,
  restoreTransaction
} from "./transactions.ts";
import {
  listRecurringRules,
  getRecurringRule,
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
  evaluateRecurringRule
} from "./recurrings.ts";
import {
  detectRecurringSuggestions,
  listRecurringSuggestions,
  dismissRecurringSuggestion,
  createRuleFromSuggestion
} from "./recurring-suggestions.ts";
import { incrementUserScanCounter, runRecurringDetectionTask } from "./recurring-scan.ts";
import {
  listInvestmentHoldings,
  createManualInvestmentHolding,
  importInvestmentHoldingsFromCsv,
  listInvestmentPositions,
  listInvestmentAccounts,
  getInvestmentPerformance,
  getInvestmentOverview
} from "./investments.ts";
// TODO(maybe-later): Keep investments API support for future re-enable while frontend hides this module.
import {
  getExplorerAnalytics,
  getOverview,
  getCategoryRollup,
  getMerchantRollup,
  getHeatmap,
  getAnomalies,
  buildAnalyticsMeta
} from "./analytics.ts";
import {
  getCategoryStrategyForUser,
  updateCategoryStrategyForUser
} from "./category-strategy.ts";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from "./categories.ts";
import {
  runAssistantQuery,
  getAssistantQuery,
  createConversation,
  getConversation,
  requireConversationOwnership
} from "./assistant.ts";
import { loadStore, saveStore, addAuditEvent, refreshStoreCacheIfChanged } from "./store.ts";
import {
  listSavedViews,
  createSavedView,
  updateSavedView,
  deleteSavedView
} from "./savedViews.ts";
import { createId, nowIso, stableHash } from "./utils.ts";
import { ensureSqliteFoundation, getSqliteFoundationStatus } from "./sqlite-foundation.ts";
import {
  beginHttpObservation,
  createRequestId,
  endHttpObservation,
  getHealthStatus,
  getMetricsSnapshot,
  getReadinessStatus,
  logStructuredEvent
} from "./observability.ts";
import { applyCors, applySecurityHeaders, checkRateLimit } from "./security.ts";
import {
  listAccountProviders,
  getDefaultAccountProviderId,
  getAccountProvider,
  beginAccountProviderLinkSession
} from "./account-providers.ts";
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getSupportedAccountTypes,
  listAccountBalanceHistory,
  createAccountManualAdjustment
} from "./accounts.ts";

const contentTypeByExt = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function isApiPath(pathname) {
  return pathname.startsWith("/v1/");
}

function matchPath(pathname, pattern) {
  const pathParts = pathname.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  if (pathParts.length !== patternParts.length) {
    return null;
  }

  const params = {};
  for (let i = 0; i < pathParts.length; i += 1) {
    const pathPart = pathParts[i];
    const patternPart = patternParts[i];
    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }
    if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

function apiError(res, error) {
  const message = String(error?.message || "Internal server error");
  const normalizedMessage = message.toLowerCase();

  if (error.message === "Unauthorized") {
    sendError(res, 401, "Unauthorized");
    return;
  }
  if (error.code === "AI_SETUP_REQUIRED") {
    sendError(res, 409, "AI setup required", {
      code: error.code,
      remediation: "Configure a provider key in Settings > AI Providers"
    });
    return;
  }
  if (error.code === "ACCOUNT_PROVIDER_ACTION_UNSUPPORTED") {
    sendError(res, 409, error.message, {
      code: error.code,
      providerId: error.providerId,
      action: error.action,
      remediation: error.remediation
    });
    return;
  }

  if (
    normalizedMessage.includes("not found") ||
    normalizedMessage.includes("unknown")
  ) {
    sendError(res, 404, message);
    return;
  }

  if (
    normalizedMessage.includes("required") ||
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("must") ||
    normalizedMessage.includes("unsupported")
  ) {
    sendError(res, 400, message);
    return;
  }

  sendError(res, 500, message);
}

function requireUser(req) {
  const auth = requireAuth(req);
  return auth.user;
}

const IDEMPOTENCY_AUDIT_ACTION = "mutation.idempotency.recorded";

function getHeaderValue(req, headerName) {
  const raw = req.headers[headerName];
  if (Array.isArray(raw)) {
    return raw[0] || null;
  }
  return raw ?? null;
}

function getIdempotencyKey(req) {
  const value = getHeaderValue(req, "idempotency-key");
  if (value == null) {
    return null;
  }
  const key = String(value).trim();
  if (!key || key.length > 128) {
    throw new Error("Invalid idempotency key");
  }
  return key;
}

function resolveMutationGuard(req, userId, mutationScope, requestBody = {}) {
  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) {
    return null;
  }

  const fingerprint = stableHash(
    JSON.stringify({
      mutationScope,
      requestBody: requestBody || {}
    })
  );

  const store = loadStore();
  const replayEvent = [...store.auditEvents]
    .reverse()
    .find((event) => {
      if (event.userId !== userId || event.action !== IDEMPOTENCY_AUDIT_ACTION) {
        return false;
      }
      return (
        event.details?.idempotencyKey === idempotencyKey && event.details?.mutationScope === mutationScope
      );
    });

  if (!replayEvent) {
    return {
      idempotencyKey,
      mutationScope,
      fingerprint
    };
  }

  if (replayEvent.details?.fingerprint !== fingerprint) {
    throw new Error("Invalid idempotency key reuse with a different payload");
  }

  return {
    replay: {
      statusCode: Number(replayEvent.details?.statusCode || 200),
      responseBody: replayEvent.details?.responseBody || null,
      noContent: Boolean(replayEvent.details?.noContent)
    }
  };
}

function sendMutationReplay(res, replay) {
  if (replay.noContent) {
    sendNoContent(res);
    return;
  }
  sendJson(res, replay.statusCode, replay.responseBody || {});
}

function recordMutationGuardResult(userId, guard, statusCode, responseBody = null, noContent = false) {
  if (!guard || guard.replay) {
    return;
  }

  addAuditEvent(userId, IDEMPOTENCY_AUDIT_ACTION, {
    idempotencyKey: guard.idempotencyKey,
    mutationScope: guard.mutationScope,
    fingerprint: guard.fingerprint,
    statusCode,
    responseBody: noContent ? null : responseBody,
    noContent
  });
}

async function handleApiRequest(req, res, url) {
  const { pathname, searchParams } = url;
  refreshStoreCacheIfChanged();

  try {
    if (req.method === "POST" && pathname === "/v1/auth/signup") {
      const body = await parseJsonBody(req);
      const result = signup(body.email, body.password);
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "POST" && pathname === "/v1/auth/login") {
      const body = await parseJsonBody(req);
      const result = login(body.email, body.password);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/v1/auth/refresh") {
      const body = await parseJsonBody(req);
      const result = refresh(body.refreshToken);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/users/me") {
      const user = requireUser(req);
      sendJson(res, 200, { user });
      return;
    }

    if (req.method === "DELETE" && pathname === "/v1/users/me") {
      const user = requireUser(req);
      deleteUser(user.id);
      sendNoContent(res);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/system/storage") {
      requireUser(req);
      sendJson(res, 200, {
        storage: {
          backend: STORE_BACKEND,
          sqlite: getSqliteFoundationStatus()
        }
      });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/system/metrics") {
      requireUser(req);
      sendJson(res, 200, {
        metrics: getMetricsSnapshot()
      });
      return;
    }

    if (req.method === "POST" && pathname === "/v1/admin/recurring-scan/run") {
      requireUser(req);
      const result = await runRecurringDetectionTask();
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/accounts/providers") {
      requireUser(req);
      sendJson(res, 200, {
        providers: listAccountProviders(),
        defaultProviderId: getDefaultAccountProviderId()
      });
      return;
    }

    const accountProviderParams = matchPath(pathname, "/v1/accounts/providers/:providerId");
    if (req.method === "GET" && accountProviderParams) {
      requireUser(req);
      sendJson(res, 200, {
        provider: getAccountProvider(accountProviderParams.providerId)
      });
      return;
    }

    const accountProviderLinkSessionParams = matchPath(
      pathname,
      "/v1/accounts/providers/:providerId/link-session"
    );
    if (req.method === "POST" && accountProviderLinkSessionParams) {
      requireUser(req);
      sendJson(res, 201, {
        linkSession: beginAccountProviderLinkSession(accountProviderLinkSessionParams.providerId)
      });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/accounts/supported-account-types") {
      requireUser(req);
      sendJson(res, 200, {
        accountTypes: getSupportedAccountTypes()
      });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/accounts") {
      const user = requireUser(req);
      sendJson(res, 200, {
        accounts: listAccounts(user.id)
      });
      return;
    }

    if (req.method === "POST" && pathname === "/v1/accounts") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(req, user.id, "POST /v1/accounts", body);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const account = createAccount(user.id, body);
      recordMutationGuardResult(user.id, guard, 201, { account });
      sendJson(res, 201, { account });
      return;
    }

    const accountPutParams = matchPath(pathname, "/v1/accounts/:id");
    if (req.method === "PUT" && accountPutParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(req, user.id, `PUT /v1/accounts/:id#${accountPutParams.id}`, body);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const account = updateAccount(user.id, accountPutParams.id, body);
      recordMutationGuardResult(user.id, guard, 200, { account });
      sendJson(res, 200, { account });
      return;
    }

    const accountSettingsPutParams = matchPath(pathname, "/v1/accounts/:id/settings");
    if (req.method === "PUT" && accountSettingsPutParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `PUT /v1/accounts/:id/settings#${accountSettingsPutParams.id}`,
        body
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const account = updateAccount(user.id, accountSettingsPutParams.id, body);
      recordMutationGuardResult(user.id, guard, 200, { account });
      sendJson(res, 200, { account });
      return;
    }

    const accountDeleteParams = matchPath(pathname, "/v1/accounts/:id");
    if (req.method === "DELETE" && accountDeleteParams) {
      const user = requireUser(req);
      const guard = resolveMutationGuard(req, user.id, `DELETE /v1/accounts/:id#${accountDeleteParams.id}`);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      deleteAccount(user.id, accountDeleteParams.id);
      recordMutationGuardResult(user.id, guard, 204, null, true);
      sendNoContent(res);
      return;
    }

    const accountBalanceHistoryParams = matchPath(pathname, "/v1/accounts/:id/balance-history");
    if (req.method === "GET" && accountBalanceHistoryParams) {
      const user = requireUser(req);
      const history = listAccountBalanceHistory(user.id, accountBalanceHistoryParams.id, {
        start: searchParams.get("start"),
        end: searchParams.get("end")
      });
      sendJson(res, 200, history);
      return;
    }

    const accountManualAdjustmentParams = matchPath(pathname, "/v1/accounts/:id/manual-adjustments");
    if (req.method === "POST" && accountManualAdjustmentParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `POST /v1/accounts/:id/manual-adjustments#${accountManualAdjustmentParams.id}`,
        body
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const adjustmentResult = createAccountManualAdjustment(user.id, accountManualAdjustmentParams.id, body);
      recordMutationGuardResult(user.id, guard, 201, adjustmentResult);
      sendJson(res, 201, adjustmentResult);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/ai/providers") {
      requireUser(req);
      sendJson(res, 200, { providers: getProviderCatalog() });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/ai/credentials") {
      const user = requireUser(req);
      sendJson(res, 200, { credentials: listCredentials(user.id), preferences: getPreferences(user.id) });
      return;
    }

    if (req.method === "POST" && pathname === "/v1/ai/credentials") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const credential = addCredential(user.id, body.provider, body.apiKey, body.label);
      sendJson(res, 201, { credential });
      return;
    }

    const credentialPutParams = matchPath(pathname, "/v1/ai/credentials/:id");
    if (req.method === "PUT" && credentialPutParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const credential = rotateCredential(user.id, credentialPutParams.id, body.apiKey);
      sendJson(res, 200, { credential });
      return;
    }

    const credentialDeleteParams = matchPath(pathname, "/v1/ai/credentials/:id");
    if (req.method === "DELETE" && credentialDeleteParams) {
      const user = requireUser(req);
      deleteCredential(user.id, credentialDeleteParams.id);
      sendNoContent(res);
      return;
    }

    if (req.method === "PUT" && pathname === "/v1/ai/preferences") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const preferences = updatePreferences(user.id, body);
      sendJson(res, 200, { preferences });
      return;
    }

    if (req.method === "POST" && pathname === "/v1/imports") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const result = await createImportJob({
        userId: user.id,
        fileName: body.fileName,
        csvText: body.csvText
      });
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/imports") {
      const user = requireUser(req);
      const store = loadStore();
      const imports = store.imports
        .filter((entry) => entry.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      sendJson(res, 200, { imports });
      return;
    }

    const importGetParams = matchPath(pathname, "/v1/imports/:id");
    if (req.method === "GET" && importGetParams) {
      const user = requireUser(req);
      const result = getImportById(user.id, importGetParams.id);
      sendJson(res, 200, result);
      return;
    }

    const mappingParams = matchPath(pathname, "/v1/imports/:id/mapping");
    if (req.method === "POST" && mappingParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const importJob = await updateImportMapping(user.id, mappingParams.id, body.mapping);
      sendJson(res, 200, { importJob });
      return;
    }

    const processedRowsParams = matchPath(pathname, "/v1/imports/:id/processed-rows");
    if (req.method === "GET" && processedRowsParams) {
      const user = requireUser(req);
      const result = listImportProcessedRows(user.id, processedRowsParams.id, {
        offset: searchParams.get("offset"),
        limit: searchParams.get("limit"),
        status: searchParams.get("status")
      });
      sendJson(res, 200, result);
      return;
    }

    const processedRowParams = matchPath(pathname, "/v1/imports/:id/processed-rows/:rowId");
    if (req.method === "PATCH" && processedRowParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const result = updateImportProcessedRow(user.id, processedRowParams.id, processedRowParams.rowId, body);
      sendJson(res, 200, result);
      return;
    }

    const reprocessParams = matchPath(pathname, "/v1/imports/:id/reprocess");
    if (req.method === "POST" && reprocessParams) {
      const user = requireUser(req);
      const result = await reprocessImportRows(user.id, reprocessParams.id);
      sendJson(res, 200, result);
      return;
    }

    const commitParams = matchPath(pathname, "/v1/imports/:id/commit");
    if (req.method === "POST" && commitParams) {
      const user = requireUser(req);
      const result = await commitImport(user.id, commitParams.id);
      sendJson(res, 200, result);
      return;
    }

    const reconciliationGetParams = matchPath(pathname, "/v1/imports/:id/reconciliation");
    if (req.method === "GET" && reconciliationGetParams) {
      const user = requireUser(req);
      const result = getImportReconciliation(user.id, reconciliationGetParams.id);
      sendJson(res, 200, result);
      return;
    }

    const reconciliationResolveParams = matchPath(pathname, "/v1/imports/:id/reconciliation/resolve");
    if (req.method === "POST" && reconciliationResolveParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `POST /v1/imports/:id/reconciliation/resolve#${reconciliationResolveParams.id}`,
        body
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const result = resolveImportReconciliation(user.id, reconciliationResolveParams.id, body);
      recordMutationGuardResult(user.id, guard, 201, result);
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/transactions") {
      const user = requireUser(req);
      const result = listTransactions(user.id, {
        start: searchParams.get("start"),
        end: searchParams.get("end"),
        range: searchParams.get("range"),
        category_view: searchParams.get("category_view"),
        category: searchParams.getAll("category"),
        invert_categories: searchParams.get("invert_categories"),
        account: searchParams.getAll("account"),
        merchant: searchParams.get("merchant"),
        source_type: searchParams.get("source_type"),
        query: searchParams.get("query"),
        needs_category_review: searchParams.get("needs_category_review"),
        review_status: searchParams.get("review_status"),
        transaction_type: searchParams.getAll("transaction_type"),
        tag: searchParams.get("tag"),
        min_amount: searchParams.get("min_amount"),
        max_amount: searchParams.get("max_amount"),
        recurring_rule_id: searchParams.get("recurring_rule_id"),
        limit: searchParams.get("limit"),
        offset: searchParams.get("offset")
      });

      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/v1/transactions") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(req, user.id, "POST /v1/transactions", body);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const transaction = createManualTransaction(user.id, body);
      incrementUserScanCounter(user.id);
      recordMutationGuardResult(user.id, guard, 201, { transaction });
      sendJson(res, 201, { transaction });
      return;
    }

    if (req.method === "POST" && pathname === "/v1/transactions/bulk") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(req, user.id, "POST /v1/transactions/bulk", body);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const result = bulkUpdateTransactions(user.id, body || {});
      recordMutationGuardResult(user.id, guard, 200, { result });
      sendJson(res, 200, { result });
      return;
    }

    const transactionPutParams = matchPath(pathname, "/v1/transactions/:id");
    if (req.method === "PUT" && transactionPutParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `PUT /v1/transactions/:id#${transactionPutParams.id}`,
        body
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const transaction = updateTransaction(user.id, transactionPutParams.id, body);
      recordMutationGuardResult(user.id, guard, 200, { transaction });
      sendJson(res, 200, { transaction });
      return;
    }

    const transactionDeleteParams = matchPath(pathname, "/v1/transactions/:id");
    if (req.method === "DELETE" && transactionDeleteParams) {
      const user = requireUser(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `DELETE /v1/transactions/:id#${transactionDeleteParams.id}`
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      deleteTransaction(user.id, transactionDeleteParams.id);
      recordMutationGuardResult(user.id, guard, 204, null, true);
      sendNoContent(res);
      return;
    }

    const transactionRestoreParams = matchPath(pathname, "/v1/transactions/:id/restore");
    if (req.method === "POST" && transactionRestoreParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `POST /v1/transactions/:id/restore#${transactionRestoreParams.id}`,
        body
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const transaction = restoreTransaction(user.id, transactionRestoreParams.id);
      recordMutationGuardResult(user.id, guard, 200, { transaction });
      sendJson(res, 200, { transaction });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/recurrings") {
      const user = requireUser(req);
      const recurrings = listRecurringRules(user.id, {
        status: searchParams.get("status")
      });
      sendJson(res, 200, recurrings);
      return;
    }

    if (req.method === "POST" && pathname === "/v1/recurrings") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(req, user.id, "POST /v1/recurrings", body);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const recurring = createRecurringRule(user.id, body || {});
      recordMutationGuardResult(user.id, guard, 201, { recurring });
      sendJson(res, 201, { recurring });
      return;
    }

    const recurringEvaluateParams = matchPath(pathname, "/v1/recurrings/:id/evaluate");
    if (req.method === "POST" && recurringEvaluateParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `POST /v1/recurrings/:id/evaluate#${recurringEvaluateParams.id}`,
        body
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const evaluation = evaluateRecurringRule(user.id, recurringEvaluateParams.id, body || {});
      recordMutationGuardResult(user.id, guard, 200, { evaluation });
      sendJson(res, 200, { evaluation });
      return;
    }

    const recurringPauseParams = matchPath(pathname, "/v1/recurrings/:id/pause");
    if (req.method === "POST" && recurringPauseParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `POST /v1/recurrings/:id/pause#${recurringPauseParams.id}`,
        body
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const recurring = updateRecurringRule(user.id, recurringPauseParams.id, { status: "paused" });
      recordMutationGuardResult(user.id, guard, 200, { recurring });
      sendJson(res, 200, { recurring });
      return;
    }

    const recurringResumeParams = matchPath(pathname, "/v1/recurrings/:id/resume");
    if (req.method === "POST" && recurringResumeParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `POST /v1/recurrings/:id/resume#${recurringResumeParams.id}`,
        body
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const recurring = updateRecurringRule(user.id, recurringResumeParams.id, { status: "active" });
      recordMutationGuardResult(user.id, guard, 200, { recurring });
      sendJson(res, 200, { recurring });
      return;
    }

    const recurringArchiveParams = matchPath(pathname, "/v1/recurrings/:id/archive");
    if (req.method === "POST" && recurringArchiveParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `POST /v1/recurrings/:id/archive#${recurringArchiveParams.id}`,
        body
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const recurring = updateRecurringRule(user.id, recurringArchiveParams.id, { status: "archived" });
      recordMutationGuardResult(user.id, guard, 200, { recurring });
      sendJson(res, 200, { recurring });
      return;
    }

    const recurringParams = matchPath(pathname, "/v1/recurrings/:id");
    if (req.method === "GET" && recurringParams) {
      const user = requireUser(req);
      const recurring = getRecurringRule(user.id, recurringParams.id);
      sendJson(res, 200, { recurring });
      return;
    }

    if (req.method === "PUT" && recurringParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `PUT /v1/recurrings/:id#${recurringParams.id}`,
        body
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const recurring = updateRecurringRule(user.id, recurringParams.id, body || {});
      recordMutationGuardResult(user.id, guard, 200, { recurring });
      sendJson(res, 200, { recurring });
      return;
    }

    if (req.method === "DELETE" && recurringParams) {
      const user = requireUser(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `DELETE /v1/recurrings/:id#${recurringParams.id}`
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const result = deleteRecurringRule(user.id, recurringParams.id);
      recordMutationGuardResult(user.id, guard, 200, { result });
      sendJson(res, 200, { result });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/recurrings/suggestions") {
      const user = requireUser(req);
      const countOnly = searchParams.get("count_only") === "true";
      const suggestions = listRecurringSuggestions(user.id, { count_only: countOnly });
      sendJson(res, 200, suggestions);
      return;
    }

    const suggestionDismissParams = matchPath(pathname, "/v1/recurrings/suggestions/:id/dismiss");
    if (req.method === "POST" && suggestionDismissParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `POST /v1/recurrings/suggestions/:id/dismiss#${suggestionDismissParams.id}`,
        body
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const result = dismissRecurringSuggestion(user.id, suggestionDismissParams.id, body?.reason || "user_dismissed");
      recordMutationGuardResult(user.id, guard, 200, result);
      sendJson(res, 200, result);
      return;
    }

    const suggestionCreateRuleParams = matchPath(pathname, "/v1/recurrings/suggestions/:id/create-rule");
    if (req.method === "POST" && suggestionCreateRuleParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(
        req,
        user.id,
        `POST /v1/recurrings/suggestions/:id/create-rule#${suggestionCreateRuleParams.id}`,
        body
      );
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const recurring = createRuleFromSuggestion(user.id, suggestionCreateRuleParams.id, body || {});
      recordMutationGuardResult(user.id, guard, 201, { recurring });
      sendJson(res, 201, { recurring });
      return;
    }

    // TODO(maybe-later): These investments endpoints are intentionally kept active while UI entry points stay hidden.
    if (req.method === "GET" && pathname === "/v1/investments/overview") {
      const user = requireUser(req);
      const overview = getInvestmentOverview(user.id, {
        timeframe: searchParams.get("timeframe"),
        query: searchParams.get("query")
      });
      sendJson(res, 200, { overview });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/investments/holdings") {
      const user = requireUser(req);
      const holdings = listInvestmentHoldings(user.id);
      sendJson(res, 200, holdings);
      return;
    }

    if (req.method === "POST" && pathname === "/v1/investments/holdings") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(req, user.id, "POST /v1/investments/holdings", body);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const holding = createManualInvestmentHolding(user.id, body || {});
      recordMutationGuardResult(user.id, guard, 201, { holding });
      sendJson(res, 201, { holding });
      return;
    }

    if (req.method === "POST" && pathname === "/v1/investments/holdings/import-csv") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(req, user.id, "POST /v1/investments/holdings/import-csv", body);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const result = importInvestmentHoldingsFromCsv(user.id, body.csvText, {
        sourceFileId: body.sourceFileId,
        asOfDate: body.asOfDate
      });
      recordMutationGuardResult(user.id, guard, 200, { result });
      sendJson(res, 200, { result });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/investments/positions") {
      const user = requireUser(req);
      const positions = listInvestmentPositions(user.id, {
        query: searchParams.get("query")
      });
      sendJson(res, 200, positions);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/investments/accounts") {
      const user = requireUser(req);
      const accounts = listInvestmentAccounts(user.id);
      sendJson(res, 200, accounts);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/investments/performance") {
      const user = requireUser(req);
      const performance = getInvestmentPerformance(user.id, {
        timeframe: searchParams.get("timeframe"),
        symbol: searchParams.get("symbol")
      });
      sendJson(res, 200, performance);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/analytics/overview") {
      const user = requireUser(req);
      const result = getOverview(user.id, {
        start: searchParams.get("start"),
        end: searchParams.get("end"),
        range: searchParams.get("range"),
        category_view: searchParams.get("category_view"),
        category: searchParams.get("category"),
        merchant: searchParams.get("merchant")
      });
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/analytics/explorer") {
      const user = requireUser(req);
      const result = getExplorerAnalytics(user.id, {
        start: searchParams.get("start"),
        end: searchParams.get("end"),
        range: searchParams.get("range"),
        category_view: searchParams.get("category_view"),
        perspective: searchParams.get("perspective"),
        compare: searchParams.get("compare"),
        category: searchParams.getAll("category"),
        account: searchParams.get("account"),
        merchant: searchParams.get("merchant"),
        query: searchParams.get("query"),
        direction: searchParams.get("direction"),
        invert_categories: searchParams.get("invert_categories"),
        transaction_type: searchParams.getAll("transaction_type"),
        tag: searchParams.get("tag"),
        recurring_rule_id: searchParams.get("recurring_rule_id"),
        review_status: searchParams.get("review_status"),
        min_amount: searchParams.get("min_amount"),
        max_amount: searchParams.get("max_amount")
      });
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/analytics/categories") {
      const user = requireUser(req);
      const filters = {
        start: searchParams.get("start"),
        end: searchParams.get("end"),
        range: searchParams.get("range"),
        category_view: searchParams.get("category_view")
      };
      const result = getCategoryRollup(user.id, {
        start: filters.start,
        end: filters.end,
        range: filters.range,
        category_view: filters.category_view
      });
      sendJson(res, 200, { items: result, meta: buildAnalyticsMeta(user.id, filters) });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/analytics/merchants") {
      const user = requireUser(req);
      const filters = {
        start: searchParams.get("start"),
        end: searchParams.get("end"),
        range: searchParams.get("range"),
        category_view: searchParams.get("category_view")
      };
      const result = getMerchantRollup(user.id, {
        start: filters.start,
        end: filters.end,
        range: filters.range
      });
      sendJson(res, 200, { items: result, meta: buildAnalyticsMeta(user.id, filters) });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/analytics/heatmap") {
      const user = requireUser(req);
      const filters = {
        start: searchParams.get("start"),
        end: searchParams.get("end"),
        range: searchParams.get("range"),
        category_view: searchParams.get("category_view")
      };
      const result = getHeatmap(user.id, {
        start: filters.start,
        end: filters.end,
        range: filters.range
      });
      sendJson(res, 200, { items: result, meta: buildAnalyticsMeta(user.id, filters) });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/analytics/anomalies") {
      const user = requireUser(req);
      const filters = {
        start: searchParams.get("start"),
        end: searchParams.get("end"),
        range: searchParams.get("range"),
        category_view: searchParams.get("category_view")
      };
      const result = getAnomalies(user.id, {
        start: filters.start,
        end: filters.end,
        range: filters.range,
        category_view: filters.category_view
      });
      sendJson(res, 200, { items: result, meta: buildAnalyticsMeta(user.id, filters) });
      return;
    }

    if (req.method === "POST" && pathname === "/v1/assistant/query") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const query = await runAssistantQuery(user.id, body.question);
      sendJson(res, 201, { query });
      return;
    }

    const assistantGetParams = matchPath(pathname, "/v1/assistant/query/:id");
    if (req.method === "GET" && assistantGetParams) {
      const user = requireUser(req);
      const query = getAssistantQuery(user.id, assistantGetParams.id);
      sendJson(res, 200, { query });
      return;
    }

    if (req.method === "POST" && pathname === "/v1/assistant/conversations") {
      const user = requireUser(req);
      const conversationId = await createConversation(user.id);
      sendJson(res, 201, { conversationId });
      return;
    }

    const conversationGetParams = matchPath(pathname, "/v1/assistant/conversations/:id");
    if (req.method === "GET" && conversationGetParams) {
      const user = requireUser(req);
      const conversation = await requireConversationOwnership(conversationGetParams.id, user.id);
      if (!conversation) {
        sendError(res, 404, "Conversation not found");
        return;
      }
      sendJson(res, 200, { conversation });
      return;
    }

    const conversationQueryParams = matchPath(pathname, "/v1/assistant/conversations/:id/query");
    if (req.method === "POST" && conversationQueryParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const conversation = await requireConversationOwnership(conversationQueryParams.id, user.id);
      if (!conversation) {
        sendError(res, 404, "Conversation not found");
        return;
      }
      const query = await runAssistantQuery(user.id, body.question, conversationQueryParams.id);
      sendJson(res, 201, { query });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/categories") {
      const user = requireUser(req);
      sendJson(res, 200, { categories: listCategories(user.id) });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/category-strategy") {
      const user = requireUser(req);
      const strategy = getCategoryStrategyForUser(user.id);
      sendJson(res, 200, { strategy });
      return;
    }

    if (req.method === "PUT" && pathname === "/v1/category-strategy") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(req, user.id, "PUT /v1/category-strategy", body);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const strategy = updateCategoryStrategyForUser(user.id, body);
      addAuditEvent(user.id, "category_strategy.update", {});
      recordMutationGuardResult(user.id, guard, 200, { strategy });
      sendJson(res, 200, { strategy });
      return;
    }

    if (req.method === "POST" && pathname === "/v1/categories") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(req, user.id, "POST /v1/categories", body);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const category = createCategory(user.id, body);
      recordMutationGuardResult(user.id, guard, 201, { category });
      sendJson(res, 201, { category });
      return;
    }

    const categoryPutParams = matchPath(pathname, "/v1/categories/:id");
    if (req.method === "PUT" && categoryPutParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(req, user.id, `PUT /v1/categories/:id#${categoryPutParams.id}`, body);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      const category = updateCategory(user.id, categoryPutParams.id, body);
      recordMutationGuardResult(user.id, guard, 200, { category });
      sendJson(res, 200, { category });
      return;
    }

    const categoryDeleteParams = matchPath(pathname, "/v1/categories/:id");
    if (req.method === "DELETE" && categoryDeleteParams) {
      const user = requireUser(req);
      const guard = resolveMutationGuard(req, user.id, `DELETE /v1/categories/:id#${categoryDeleteParams.id}`);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      deleteCategory(user.id, categoryDeleteParams.id);
      recordMutationGuardResult(user.id, guard, 204, null, true);
      sendNoContent(res);
      return;
    }

    if (req.method === "POST" && pathname === "/v1/category-rules") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const guard = resolveMutationGuard(req, user.id, "POST /v1/category-rules", body);
      if (guard?.replay) {
        sendMutationReplay(res, guard.replay);
        return;
      }
      if (!body.pattern || !body.category) {
        throw new Error("pattern and category are required");
      }

      const store = loadStore();
      const rule = {
        id: createId("rule"),
        userId: user.id,
        type: body.type || "contains",
        pattern: String(body.pattern),
        category: String(body.category),
        priority: Number(body.priority || 70),
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      store.categoryRules.push(rule);
      saveStore(store);
      addAuditEvent(user.id, "category_rule.create", { ruleId: rule.id });
      recordMutationGuardResult(user.id, guard, 201, { rule });
      sendJson(res, 201, { rule });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/saved-views") {
      const user = requireUser(req);
      sendJson(res, 200, { items: listSavedViews(user.id) });
      return;
    }

    if (req.method === "POST" && pathname === "/v1/saved-views") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const view = createSavedView(user.id, body);
      sendJson(res, 201, { view });
      return;
    }

    const savedViewParams = matchPath(pathname, "/v1/saved-views/:id");
    if (req.method === "PUT" && savedViewParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const view = updateSavedView(user.id, savedViewParams.id, body);
      sendJson(res, 200, { view });
      return;
    }

    if (req.method === "DELETE" && savedViewParams) {
      const user = requireUser(req);
      deleteSavedView(user.id, savedViewParams.id);
      sendNoContent(res);
      return;
    }

    sendError(res, 404, `Endpoint not found: ${req.method} ${pathname}`);
  } catch (error) {
    apiError(res, error);
  }
}

function safeFilePath(requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const candidate = decoded === "/" ? "/index.html" : decoded;
  const normalized = path
    .normalize(candidate)
    .replace(/^([/\\])+/, "")
    .replace(/^\.+[\/\\]/, "");
  const resolved = path.join(WEB_DIR, normalized);
  if (!resolved.startsWith(WEB_DIR)) {
    return null;
  }
  return resolved;
}

function serveStatic(req, res, url) {
  let filePath = safeFilePath(url.pathname);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(WEB_DIR, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypeByExt[ext] || "application/octet-stream";

  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    sendError(res, 404, "Not found");
  });

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  stream.pipe(res);
}

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(req, res);
  const corsAllowed = applyCors(req, res);
  if (!corsAllowed) {
    sendError(res, 403, "Origin is not allowed by MINANCE_ALLOWED_ORIGINS");
    return;
  }
  const requestId = createRequestId(req.headers["x-request-id"]);
  res.setHeader("X-Request-Id", requestId);

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const observation = beginHttpObservation(req, url.pathname);
  let responseFinished = false;

  const finalizeObservation = () => {
    if (responseFinished) {
      return;
    }
    responseFinished = true;
    const durationMs = endHttpObservation(observation, res.statusCode, Date.now());
    logStructuredEvent("info", "http.request", {
      requestId,
      method: req.method,
      path: url.pathname,
      statusCode: res.statusCode,
      durationMs,
      remoteAddress: req.socket?.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || null
    });
  };
  res.on("finish", finalizeObservation);
  res.on("close", finalizeObservation);

  const rateLimit = checkRateLimit(req, url.pathname);
  if (Number.isFinite(rateLimit.limit)) {
    res.setHeader("X-RateLimit-Limit", String(rateLimit.limit));
    res.setHeader("X-RateLimit-Remaining", String(rateLimit.remaining));
    res.setHeader("X-RateLimit-Reset", rateLimit.resetAt);
  }
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
    sendError(res, 429, "Rate limit exceeded", {
      policy: rateLimit.policy,
      retryAfterSeconds: rateLimit.retryAfterSeconds
    });
    return;
  }

  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/healthz") {
    sendJson(res, 200, getHealthStatus());
    return;
  }

  if (req.method === "GET" && url.pathname === "/readyz") {
    const readiness = getReadinessStatus();
    sendJson(res, readiness.ready ? 200 : 503, readiness);
    return;
  }

  if (isApiPath(url.pathname)) {
    await handleApiRequest(req, res, url);
    return;
  }

  serveStatic(req, res, url);
});

const devTestAccount = ensureDevTestAccount();
if (devTestAccount.enabled) {
  const status = devTestAccount.created ? "created" : "available";
  logStructuredEvent("info", "dev_account.seed", {
    status,
    email: devTestAccount.email
  });
}

let sqliteFoundation = null;
try {
  sqliteFoundation = ensureSqliteFoundation();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (sqliteFoundation?.ready) {
  logStructuredEvent("info", "sqlite.foundation.ready", {
    migrationsApplied: sqliteFoundation.migrationsApplied,
    sqliteFilePath: sqliteFoundation.sqliteFilePath
  });
} else if (sqliteFoundation?.lastError) {
  logStructuredEvent("warn", "sqlite.foundation.not_ready", {
    reason: sqliteFoundation.lastError
  });
}

if (process.env.NODE_ENV !== "production") {
  const store = loadStore();
  let seededUsers = 0;
  let warned = false;

  for (const user of store.users) {
    const aiSeed = ensureDevOpenRouterCredential(user.id);
    if (aiSeed.enabled) {
      if (aiSeed.createdCredential || aiSeed.updatedPreferences) {
        seededUsers += 1;
      }
    } else if (!warned && aiSeed.reason !== "missing_env_key" && aiSeed.reason !== "production") {
      logStructuredEvent("warn", "dev_openrouter.seed_skipped", { reason: aiSeed.reason });
      warned = true;
    }
  }

  if (seededUsers > 0) {
    logStructuredEvent("info", "dev_openrouter.seeded", {
      users: seededUsers
    });
  }
}

server.listen(PORT, () => {
  logStructuredEvent("info", "server.started", {
    port: PORT,
    storeBackend: STORE_BACKEND
  });
});
