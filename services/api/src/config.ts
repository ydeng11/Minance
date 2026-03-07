import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getEnvFileName, resolveRuntimePaths } from "./runtime-env.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "../../..");

function loadDotEnvFile(fileName) {
  const envPath = path.join(ROOT_DIR, fileName);
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    if (!key || process.env[key] != null) {
      continue;
    }

    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadDotEnvFile(getEnvFileName(process.env.NODE_ENV));

function parseBoolean(value, defaultValue) {
  if (value == null) {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return defaultValue;
}

function parseInteger(value, defaultValue, minValue = null) {
  if (value == null || value === "") {
    return defaultValue;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  if (minValue != null && parsed < minValue) {
    return minValue;
  }
  return parsed;
}

function parseOriginList(value, fallback) {
  const raw = value == null ? fallback : value;
  return String(raw)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeStoreBackend(value) {
  const normalized = String(value || "json").trim().toLowerCase();
  return normalized === "sqlite" ? "sqlite" : "json";
}

const runtimePaths = resolveRuntimePaths({
  rootDir: ROOT_DIR,
  env: process.env,
  nodeEnv: process.env.NODE_ENV
});

export const DATA_FILE = runtimePaths.dataFile;
export const SQLITE_FILE = runtimePaths.sqliteFile;
export const SQLITE_SCHEMA_FILE = runtimePaths.sqliteSchemaFile;
export const STORE_BACKEND = normalizeStoreBackend(process.env.MINANCE_STORE_BACKEND || "json");
export const SQLITE_AUTO_INIT = parseBoolean(process.env.MINANCE_SQLITE_AUTO_INIT, true);
export const TMP_DIR = path.join(__dirname, "../tmp");
export const WEB_DIR = path.join(ROOT_DIR, "apps/web");

export const PORT = Number(process.env.PORT || 3000);
export const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour
export const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
export const AI_SECRET = process.env.AI_CREDENTIAL_SECRET || "minance-next-local-secret-change-me";
export const SECURITY_ALLOWED_ORIGINS = parseOriginList(
  process.env.MINANCE_ALLOWED_ORIGINS,
  "http://localhost:3000,http://127.0.0.1:3000"
);
export const CORS_ALLOW_CREDENTIALS = parseBoolean(process.env.MINANCE_CORS_ALLOW_CREDENTIALS, false);
export const RATE_LIMIT_WINDOW_MS = parseInteger(process.env.MINANCE_RATE_LIMIT_WINDOW_MS, 60_000, 1_000);
export const DEFAULT_RATE_LIMIT_MAX_REQUESTS = parseInteger(
  process.env.MINANCE_RATE_LIMIT_MAX_REQUESTS,
  600,
  1
);
export const AUTH_RATE_LIMIT_MAX_REQUESTS = parseInteger(
  process.env.MINANCE_AUTH_RATE_LIMIT_MAX_REQUESTS,
  60,
  1
);
