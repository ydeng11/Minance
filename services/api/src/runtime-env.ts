import path from "node:path";
import { threadId } from "node:worker_threads";

const DEFAULT_DATA_FILE = "services/api/data/store.json";
const DEFAULT_SQLITE_SCHEMA_FILE = "services/api/sql/schema.sql";
const DEFAULT_TEST_DATA_FILE = `services/api/tmp/test-store-${process.pid}-${threadId}.json`;
const DEFAULT_TEST_SQLITE_FILE = `services/api/tmp/test-runtime-${process.pid}-${threadId}/test-minance.sqlite`;

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

export function getRuntimeEnvironment(nodeEnv: string | undefined) {
  const normalized = String(nodeEnv || "production").trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(normalized)) {
    throw new Error(`Invalid runtime environment: ${nodeEnv}`);
  }
  return normalized;
}

export function getDefaultSqliteFile(nodeEnv: string | undefined) {
  return `services/api/data/${getRuntimeEnvironment(nodeEnv)}-minance.sqlite`;
}

export function getConfiguredSqliteFile(env: NodeJS.ProcessEnv, nodeEnv: string | undefined) {
  return isTestEnvironment(nodeEnv) ? env.MINANCE_SQLITE_FILE_TEST : env.MINANCE_SQLITE_FILE;
}

export function getEnvFileName(nodeEnv: string | undefined) {
  return `.env.${getRuntimeEnvironment(nodeEnv)}`;
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

  const configuredDataFile = testMode ? env.MINANCE_DATA_FILE_TEST : env.MINANCE_DATA_FILE;
  const configuredSqliteFile = getConfiguredSqliteFile(env, nodeEnv);
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
      testMode ? DEFAULT_TEST_SQLITE_FILE : getDefaultSqliteFile(nodeEnv)
    ),
    sqliteSchemaFile: resolvePathFromRoot(rootDir, configuredSqliteSchema, DEFAULT_SQLITE_SCHEMA_FILE)
  };
}
