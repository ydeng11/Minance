import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFrontendTestFirst } from "./check-frontend-test-first.mjs";

test("passes when no frontend .tsx files changed", () => {
  const result = evaluateFrontendTestFirst(["README.md", "services/api/src/server.js"]);

  assert.equal(result.ok, true);
  assert.equal(result.reason, "no_frontend_changes");
});

test("fails when frontend .tsx changed but no tests changed", () => {
  const result = evaluateFrontendTestFirst([
    "apps/web/src/app/investments/page.tsx",
    "apps/web/src/components/layout/Sidebar.tsx"
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.reason, "missing_tests");
  assert.deepEqual(result.frontendFiles, [
    "apps/web/src/app/investments/page.tsx",
    "apps/web/src/components/layout/Sidebar.tsx"
  ]);
});

test("passes when frontend .tsx and e2e/frontend tests both changed", () => {
  const result = evaluateFrontendTestFirst([
    "apps/web/src/app/investments/page.tsx",
    "e2e/specs/investments-layout-parity.spec.mjs",
    "apps/web/src/lib/import/reducer.test.ts"
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.reason, "tests_present");
  assert.deepEqual(result.testFiles, [
    "apps/web/src/lib/import/reducer.test.ts",
    "e2e/specs/investments-layout-parity.spec.mjs"
  ]);
});
