import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  ensureSqliteFoundation,
  getSqliteFoundationStatus,
  isSqliteCliAvailable
} from "../src/sqlite-foundation.js";

function createTempPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "minance-sqlite-foundation-"));
  return {
    dir,
    dbPath: path.join(dir, "test.sqlite"),
    schemaPath: path.join(dir, "schema.sql")
  };
}

test("ensureSqliteFoundation initializes schema idempotently", { skip: !isSqliteCliAvailable() }, () => {
  const temp = createTempPaths();
  try {
    fs.writeFileSync(
      temp.schemaPath,
      [
        "PRAGMA foreign_keys = ON;",
        "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);",
        "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL);"
      ].join("\n")
    );

    const first = ensureSqliteFoundation({
      backend: "json",
      sqliteFile: temp.dbPath,
      schemaFile: temp.schemaPath,
      autoInit: true
    });
    assert.equal(first.ready, true);
    assert.equal(first.sqliteFileExists, true);
    assert.equal(first.schemaFileExists, true);
    assert.equal(typeof first.schemaVersion, "string");
    assert.ok(first.migrationsApplied >= 1);

    const second = ensureSqliteFoundation({
      backend: "json",
      sqliteFile: temp.dbPath,
      schemaFile: temp.schemaPath,
      autoInit: true
    });
    assert.equal(second.ready, true);
    assert.equal(second.schemaVersion, first.schemaVersion);
    assert.equal(second.migrationsApplied, first.migrationsApplied);

    const status = getSqliteFoundationStatus({
      backend: "json",
      sqliteFile: temp.dbPath,
      schemaFile: temp.schemaPath
    });
    assert.equal(status.ready, true);
    assert.equal(status.initializeAttempted, false);
  } finally {
    fs.rmSync(temp.dir, { recursive: true, force: true });
  }
});

test("ensureSqliteFoundation fails fast for sqlite backend when schema is missing", () => {
  const temp = createTempPaths();
  try {
    assert.throws(
      () =>
        ensureSqliteFoundation({
          backend: "sqlite",
          sqliteFile: temp.dbPath,
          schemaFile: path.join(temp.dir, "missing-schema.sql"),
          autoInit: true
        }),
      /requires a ready SQLite foundation/
    );
  } finally {
    fs.rmSync(temp.dir, { recursive: true, force: true });
  }
});
