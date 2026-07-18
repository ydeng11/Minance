import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { threadId } from "node:worker_threads";

import {
  getEnvFileName,
  resolveRuntimePaths,
  resolveStoreBackend
} from "../src/runtime-env.ts";

const ROOT_DIR = "/tmp/minance-root";

test("test mode ignores live storage env vars and uses isolated defaults", () => {
  const runtime = resolveRuntimePaths({
    rootDir: ROOT_DIR,
    nodeEnv: "test",
    env: {
      MINANCE_DATA_FILE: "services/api/data/live-store.json",
      MINANCE_SQLITE_FILE: "services/api/data/live.sqlite",
      MINANCE_SQLITE_SCHEMA_FILE: "services/api/sql/live-schema.sql"
    }
  });

  assert.equal(getEnvFileName("test"), ".env.test");
  assert.equal(
    runtime.dataFile,
    path.join(ROOT_DIR, `services/api/tmp/test-store-${process.pid}-${threadId}.json`)
  );
  assert.equal(
    runtime.sqliteFile,
    path.join(ROOT_DIR, `services/api/tmp/test-minance-${process.pid}-${threadId}.sqlite`)
  );
  assert.equal(runtime.sqliteSchemaFile, path.join(ROOT_DIR, "services/api/sql/schema.sql"));
});

test("test mode honors test-specific storage overrides", () => {
  const runtime = resolveRuntimePaths({
    rootDir: ROOT_DIR,
    nodeEnv: "test",
    env: {
      MINANCE_DATA_FILE_TEST: "tmp/custom-store.json",
      MINANCE_SQLITE_FILE_TEST: "/tmp/custom.sqlite",
      MINANCE_SQLITE_SCHEMA_FILE_TEST: "tmp/custom-schema.sql"
    }
  });

  assert.equal(runtime.dataFile, path.join(ROOT_DIR, "tmp/custom-store.json"));
  assert.equal(runtime.sqliteFile, "/tmp/custom.sqlite");
  assert.equal(runtime.sqliteSchemaFile, path.join(ROOT_DIR, "tmp/custom-schema.sql"));
});

test("test mode still honors explicit JSON backend selection", () => {
  assert.equal(
    resolveStoreBackend({
      nodeEnv: "test",
      env: {
        MINANCE_STORE_BACKEND: "json"
      }
    }),
    "json"
  );
});

test("development mode resolves the tracked environment-prefixed database", () => {
  const runtime = resolveRuntimePaths({
    rootDir: ROOT_DIR,
    nodeEnv: "development",
    env: {
      MINANCE_DATA_FILE_TEST: "services/api/tmp/ignored.json",
      MINANCE_SQLITE_FILE_TEST: "services/api/tmp/ignored.sqlite"
    }
  });

  assert.equal(getEnvFileName("development"), ".env.development");
  assert.equal(runtime.dataFile, path.join(ROOT_DIR, "services/api/data/store.json"));
  assert.equal(
    runtime.sqliteFile,
    path.join(ROOT_DIR, "services/api/data/development-minance.sqlite")
  );
  assert.equal(runtime.sqliteSchemaFile, path.join(ROOT_DIR, "services/api/sql/schema.sql"));
});

test("production mode remains distinct from the environment-prefixed development database", () => {
  const defaultRuntime = resolveRuntimePaths({
    rootDir: ROOT_DIR,
    nodeEnv: "production",
    env: {}
  });
  const runtime = resolveRuntimePaths({
    rootDir: ROOT_DIR,
    nodeEnv: "production",
    env: { MINANCE_SQLITE_FILE: "services/api/data/live.sqlite" }
  });

  assert.equal(getEnvFileName("production"), ".env.local");
  assert.equal(
    defaultRuntime.sqliteFile,
    path.join(ROOT_DIR, "services/api/data/minance.sqlite")
  );
  assert.equal(runtime.sqliteFile, path.join(ROOT_DIR, "services/api/data/live.sqlite"));
});

test("non-test mode forces sqlite backend even when JSON is requested", () => {
  assert.equal(
    resolveStoreBackend({
      nodeEnv: "development",
      env: {
        MINANCE_STORE_BACKEND: "json"
      }
    }),
    "sqlite"
  );
});
