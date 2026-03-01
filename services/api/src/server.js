import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { URL } from "node:url";

import { PORT, WEB_DIR } from "./config.js";
import { sendJson, sendError, sendNoContent, parseJsonBody } from "./utils.js";
import { signup, login, refresh, requireAuth, deleteUser, ensureDevTestAccount } from "./auth.js";
import {
  getProviderCatalog,
  listCredentials,
  addCredential,
  rotateCredential,
  deleteCredential,
  updatePreferences,
  getPreferences,
  ensureDevOpenRouterCredential
} from "./ai.js";
import {
  createImportJob,
  getImportById,
  updateImportMapping,
  commitImport,
  listImportProcessedRows,
  updateImportProcessedRow,
  reprocessImportRows
} from "./imports.js";
import { createManualTransaction, listTransactions, updateTransaction, deleteTransaction } from "./transactions.js";
import {
  getOverview,
  getCategoryRollup,
  getMerchantRollup,
  getHeatmap,
  getAnomalies,
  buildAnalyticsMeta
} from "./analytics.js";
import { runAssistantQuery, getAssistantQuery } from "./assistant.js";
import { writeUploadedSqliteFile, runLegacyMigration, getMigrationReport } from "./migration.js";
import { loadStore, saveStore, addAuditEvent } from "./store.js";
import { getTrainingStatus } from "./training.js";
import {
  listSavedViews,
  createSavedView,
  updateSavedView,
  deleteSavedView
} from "./savedViews.js";
import { createId, nowIso } from "./utils.js";

const contentTypeByExt = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".tsx": "application/javascript; charset=utf-8",
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

function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
}

function apiError(res, error) {
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

  if (
    error.message.includes("not found") ||
    error.message.includes("not found") ||
    error.message.includes("unknown")
  ) {
    sendError(res, 404, error.message);
    return;
  }

  if (
    error.message.includes("required") ||
    error.message.includes("Invalid") ||
    error.message.includes("must") ||
    error.message.includes("Unsupported")
  ) {
    sendError(res, 400, error.message);
    return;
  }

  sendError(res, 500, error.message || "Internal server error");
}

function requireUser(req) {
  const auth = requireAuth(req);
  return auth.user;
}

async function handleApiRequest(req, res, url) {
  const { pathname, searchParams } = url;

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

    if (req.method === "GET" && pathname === "/v1/ai/training-status") {
      requireUser(req);
      sendJson(res, 200, { training: getTrainingStatus() });
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

    if (req.method === "POST" && pathname === "/v1/migrations/minance/sqlite") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);

      let sqlitePath = body.sqlitePath;
      if (!sqlitePath && body.sqliteBase64) {
        sqlitePath = writeUploadedSqliteFile(body.fileName, body.sqliteBase64);
      }

      const run = await runLegacyMigration({ userId: user.id, sqlitePath });
      sendJson(res, 201, { migration: run });
      return;
    }

    const migrationReportParams = matchPath(pathname, "/v1/migrations/:id/report");
    if (req.method === "GET" && migrationReportParams) {
      const user = requireUser(req);
      const run = getMigrationReport(user.id, migrationReportParams.id);
      sendJson(res, 200, { report: run.report, migration: run });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/transactions") {
      const user = requireUser(req);
      const result = listTransactions(user.id, {
        start: searchParams.get("start"),
        end: searchParams.get("end"),
        range: searchParams.get("range"),
        category: searchParams.get("category"),
        merchant: searchParams.get("merchant"),
        source_type: searchParams.get("source_type"),
        query: searchParams.get("query"),
        needs_category_review: searchParams.get("needs_category_review"),
        limit: searchParams.get("limit"),
        offset: searchParams.get("offset")
      });

      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/v1/transactions") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const transaction = createManualTransaction(user.id, body);
      sendJson(res, 201, { transaction });
      return;
    }

    const transactionPutParams = matchPath(pathname, "/v1/transactions/:id");
    if (req.method === "PUT" && transactionPutParams) {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      const transaction = updateTransaction(user.id, transactionPutParams.id, body);
      sendJson(res, 200, { transaction });
      return;
    }

    const transactionDeleteParams = matchPath(pathname, "/v1/transactions/:id");
    if (req.method === "DELETE" && transactionDeleteParams) {
      const user = requireUser(req);
      deleteTransaction(user.id, transactionDeleteParams.id);
      sendNoContent(res);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/analytics/overview") {
      const user = requireUser(req);
      const result = getOverview(user.id, {
        start: searchParams.get("start"),
        end: searchParams.get("end"),
        range: searchParams.get("range"),
        category: searchParams.get("category"),
        merchant: searchParams.get("merchant")
      });
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/analytics/categories") {
      const user = requireUser(req);
      const filters = {
        start: searchParams.get("start"),
        end: searchParams.get("end"),
        range: searchParams.get("range")
      };
      const result = getCategoryRollup(user.id, {
        start: filters.start,
        end: filters.end,
        range: filters.range
      });
      sendJson(res, 200, { items: result, meta: buildAnalyticsMeta(user.id, filters) });
      return;
    }

    if (req.method === "GET" && pathname === "/v1/analytics/merchants") {
      const user = requireUser(req);
      const filters = {
        start: searchParams.get("start"),
        end: searchParams.get("end"),
        range: searchParams.get("range")
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
        range: searchParams.get("range")
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
        range: searchParams.get("range")
      };
      const result = getAnomalies(user.id, {
        start: filters.start,
        end: filters.end,
        range: filters.range
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

    if (req.method === "GET" && pathname === "/v1/categories") {
      const user = requireUser(req);
      const store = loadStore();
      const categories = store.categories.filter((entry) => entry.userId === user.id);
      sendJson(res, 200, { categories });
      return;
    }

    if (req.method === "POST" && pathname === "/v1/categories") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
      if (!body.name || String(body.name).trim().length < 2) {
        throw new Error("Category name is required");
      }

      const store = loadStore();
      const category = {
        id: createId("cat"),
        userId: user.id,
        name: String(body.name).trim(),
        isSystem: false,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      store.categories.push(category);
      saveStore(store);
      addAuditEvent(user.id, "category.create", { categoryId: category.id });
      sendJson(res, 201, { category });
      return;
    }

    if (req.method === "POST" && pathname === "/v1/category-rules") {
      const user = requireUser(req);
      const body = await parseJsonBody(req);
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
  allowCors(res);

  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (isApiPath(url.pathname)) {
    await handleApiRequest(req, res, url);
    return;
  }

  serveStatic(req, res, url);
});

const devTestAccount = ensureDevTestAccount();
if (devTestAccount.enabled) {
  const status = devTestAccount.created ? "created" : "available";
  console.log(`Dev/test account ${status}: ${devTestAccount.email}`);
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
      console.warn(`Skipped dev OpenRouter seed: ${aiSeed.reason}`);
      warned = true;
    }
  }

  if (seededUsers > 0) {
    console.log(`Seeded dev OpenRouter credential/default for ${seededUsers} user(s) from .env.local`);
  }
}

server.listen(PORT, () => {
  console.log(`Minance Next running at http://localhost:${PORT}`);
});
