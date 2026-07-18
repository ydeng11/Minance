import path from "node:path";
import { threadId } from "node:worker_threads";

const DEFAULT_DATA_FILE = "services/api/data/store.json";
const DEFAULT_SQLITE_FILE = "services/api/data/minance.sqlite";
const DEFAULT_DEV_SQLITE_FILE = "services/api/data/development-minance.sqlite";
const DEFAULT_SQLITE_SCHEMA_FILE = "services/api/sql/schema.sql";
const TEST_RUNTIME_SUFFIX = `${process.pid}-${threadId}`;
const DEFAULT_TEST_DATA_FILE = `services/api/tmp/test-store-${TEST_RUNTIME_SUFFIX}.json`;
const DEFAULT_TEST_SQLITE_FILE = `services/api/tmp/test-minance-${TEST_RUNTIME_SUFFIX}.sqlite`;

export function normalizeStoreBackend(value: string | undefined) {
  const normalized = String(value || "json").trim().toLowerCase();
  return normalized === "sqlite" ? "sqlite" : "json";
}

function resolvePathFromRoot(rootDir: string, configuredPath: string | undefined, fallbackPath: string) {
  const raw = configuredPath || fallbackPath;
  if (!raw) {
    throw new Error("Path configuration is required");
  }
  return path.isAbsolute(raw) ? raw : path.join(rootDir, raw);
}

export function isTestEnvironment(nodeEnv: string | undefined) {
  return String(nodeEnv || "").trim().toLowerCase() === "test";
}

export function isDevelopmentEnvironment(nodeEnv: string | undefined) {
  return String(nodeEnv || "").trim().toLowerCase() === "development";
}

export function getEnvFileName(nodeEnv: string | undefined) {
  if (isTestEnvironment(nodeEnv)) {
    return ".env.test";
  }
  return isDevelopmentEnvironment(nodeEnv) ? ".env.development" : ".env.local";
}

export function resolveStoreBackend({
  env = process.env,
  nodeEnv = env.NODE_ENV
}: {
  env?: NodeJS.ProcessEnv;
  nodeEnv?: string | undefined;
} = {}) {
  if (!isTestEnvironment(nodeEnv)) {
    return "sqlite";
  }

  return normalizeStoreBackend(env.MINANCE_STORE_BACKEND || "json");
}

export function resolveRuntimePaths({
  rootDir,
  env = process.env,
  nodeEnv = env.NODE_ENV
}: {
  rootDir: string;
  env?: NodeJS.ProcessEnv;
  nodeEnv?: string | undefined;
}) {
  const testMode = isTestEnvironment(nodeEnv);
  const developmentMode = isDevelopmentEnvironment(nodeEnv);

  const configuredDataFile = testMode ? env.MINANCE_DATA_FILE_TEST : env.MINANCE_DATA_FILE;
  const configuredSqliteFile = testMode ? env.MINANCE_SQLITE_FILE_TEST : env.MINANCE_SQLITE_FILE;
  const configuredSqliteSchema = testMode
    ? env.MINANCE_SQLITE_SCHEMA_FILE_TEST
    : env.MINANCE_SQLITE_SCHEMA_FILE;
  return {
    envFileName: getEnvFileName(nodeEnv),
    dataFile: resolvePathFromRoot(
      rootDir,
      configuredDataFile,
      testMode ? DEFAULT_TEST_DATA_FILE : DEFAULT_DATA_FILE
    ),
    sqliteFile: resolvePathFromRoot(
      rootDir,
      configuredSqliteFile,
      testMode ? DEFAULT_TEST_SQLITE_FILE : developmentMode ? DEFAULT_DEV_SQLITE_FILE : DEFAULT_SQLITE_FILE
    ),
    sqliteSchemaFile: resolvePathFromRoot(rootDir, configuredSqliteSchema, DEFAULT_SQLITE_SCHEMA_FILE)
  };
}
