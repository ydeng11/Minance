import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

import { prepareE2eSqlite } from "../../../e2e/global-setup.ts";
import { isSqliteCliAvailable } from "../src/sqlite-foundation.ts";

test("default E2E setup recreates the SQLite schema after clearing the database", {
  skip: !isSqliteCliAvailable()
}, async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "minance-e2e-setup-"));
  const sqliteFile = path.join(tempDir, "test-minance.sqlite");
  const schemaFile = path.resolve("services/api/sql/schema.sql");

  try {
    fs.writeFileSync(sqliteFile, "");

    await prepareE2eSqlite({
      sqliteFile,
      schemaFile,
      seedDataset: ""
    });

    const result = spawnSync(
      "sqlite3",
      ["-json", sqliteFile, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users';"],
      { encoding: "utf8" }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), [{ name: "users" }]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
