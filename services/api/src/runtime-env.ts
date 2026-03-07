import path from "node:path";

const DEFAULT_DATA_FILE = "services/api/data/store.json";
const DEFAULT_SQLITE_FILE = "services/api/data/minance.sqlite";
const DEFAULT_SQLITE_SCHEMA_FILE = "services/api/sql/schema.sql";
const DEFAULT_TEST_DATA_FILE = "services/api/tmp/test-store.json";
const DEFAULT_TEST_SQLITE_FILE = "services/api/tmp/test-minance.sqlite";

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

export function getEnvFileName(nodeEnv: string | undefined) {
  return isTestEnvironment(nodeEnv) ? ".env.test" : ".env.local";
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
      testMode ? DEFAULT_TEST_SQLITE_FILE : DEFAULT_SQLITE_FILE
    ),
    sqliteSchemaFile: resolvePathFromRoot(rootDir, configuredSqliteSchema, DEFAULT_SQLITE_SCHEMA_FILE)
  };
}
