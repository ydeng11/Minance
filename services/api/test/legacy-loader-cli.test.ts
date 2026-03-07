import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../..");
const require = createRequire(import.meta.url);
const TSX_CLI = require.resolve("tsx/cli", { paths: [path.join(ROOT_DIR, "apps/web")] });

test("legacy loader cli rejects --user-password without --user-email", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "minance-legacy-loader-cli-"));

  try {
    const result = spawnSync(
      process.execPath,
      [TSX_CLI, "scripts/load-legacy-api.ts", "--user-password", "12345678"],
      {
        cwd: ROOT_DIR,
        encoding: "utf8",
        env: {
          ...process.env,
          NODE_ENV: "test",
          MINANCE_SEED_TEST_ACCOUNT: "false",
          MINANCE_DATA_FILE_TEST: path.join(tempDir, "store.json")
        }
      }
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--user-password requires --user-email/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
