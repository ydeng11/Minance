import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const SQLITE_RUNTIME_ARTIFACTS = [
  "services/api/data/minance.sqlite",
  "services/api/data/minance.sqlite.bak.20260306-221455",
  "services/api/data/minance.sqlite.bak.20260307-085144"
];

function git(args) {
  return execFileSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function isTracked(filePath) {
  try {
    return git(["ls-files", "--error-unmatch", filePath]).length > 0;
  } catch {
    return false;
  }
}

function isIgnored(filePath) {
  try {
    git(["check-ignore", filePath]);
    return true;
  } catch {
    return false;
  }
}

test("runtime sqlite artifacts are ignored and not tracked", () => {
  for (const filePath of SQLITE_RUNTIME_ARTIFACTS) {
    assert.equal(isTracked(filePath), false, `${filePath} should not be tracked`);
    assert.equal(isIgnored(filePath), true, `${filePath} should be ignored`);
  }
});
