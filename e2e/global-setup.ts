import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensureSqliteFoundation } from "../services/api/src/sqlite-foundation.ts";
import { writeStoreCollectionsToSqlite } from "../services/api/src/sqlite-store-repository.ts";
import { createDeterministicFinancialFixture } from "../services/api/test/fixtures/deterministic-financial-fixture.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

export default async function globalSetup() {
  const sqliteFile = path.join(ROOT_DIR, "services/api/tmp/e2e/test-minance.sqlite");
  const schemaFile = path.join(ROOT_DIR, "services/api/sql/schema.sql");
  const reportDir = path.join(ROOT_DIR, "output/playwright/report");
  const testResultsDir = path.join(ROOT_DIR, "output/playwright/test-results");
  const e2eSeedDataset = String(process.env.E2E_SEED_DATASET || "").trim();

  await fs.mkdir(path.dirname(sqliteFile), { recursive: true });
  await fs.mkdir(path.join(ROOT_DIR, "output/playwright"), { recursive: true });

  await fs.rm(sqliteFile, { force: true });
  await fs.rm(reportDir, { recursive: true, force: true });
  await fs.rm(testResultsDir, { recursive: true, force: true });

  if (e2eSeedDataset === "deterministic-financial") {
    ensureSqliteFoundation({
      backend: "sqlite",
      sqliteFile,
      schemaFile,
      autoInit: true
    });
    writeStoreCollectionsToSqlite(createDeterministicFinancialFixture(), {
      dbPath: sqliteFile
    });
  }
}
