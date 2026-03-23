import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const packageJsonPath = path.join(rootDir, "package.json");
const webPackageJsonPath = path.join(rootDir, "apps", "web", "package.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

test("root package declares tsx when root scripts invoke it", () => {
  const packageJson = readJson(packageJsonPath);
  const scripts = Object.values(packageJson.scripts || {});
  const usesTsx = scripts.some((script) => String(script).includes("tsx"));
  const declaredTsx =
    packageJson.dependencies?.tsx != null || packageJson.devDependencies?.tsx != null;

  assert.equal(usesTsx, true, "expected at least one root script to invoke tsx");
  assert.equal(
    declaredTsx,
    true,
    "root package.json must declare tsx when root scripts invoke it"
  );
});

test("web package quotes recursive test globs so pnpm test covers nested files", () => {
  const packageJson = readJson(webPackageJsonPath);
  const testScript = String(packageJson.scripts?.test || "");

  assert.match(
    testScript,
    /tsx --test ["']src\/\*\*\/\*\.test\.ts["']/,
    "apps/web package.json must quote the recursive test glob so /bin/sh does not collapse nested test coverage"
  );
});
