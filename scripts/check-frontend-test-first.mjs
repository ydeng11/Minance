import { execSync } from "node:child_process";

const FRONTEND_FILE_RE = /^apps\/web\/src\/.*\.tsx$/;
const FRONTEND_TEST_FILE_RE = /^apps\/web\/src\/.*\.test\.(ts|tsx)$/;
const E2E_TEST_FILE_RE = /^e2e\/specs\/.*\.(spec|test)\.(mjs|js|ts|tsx)$/;

function toUniqueSorted(items) {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

function normalizeList(input) {
  if (!input) {
    return [];
  }

  return input
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function runGit(args) {
  try {
    return execSync(`git ${args}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function hasRef(ref) {
  try {
    execSync(`git rev-parse --verify ${ref}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function evaluateFrontendTestFirst(files) {
  const frontendFiles = toUniqueSorted(
    files.filter((file) => FRONTEND_FILE_RE.test(file) && !FRONTEND_TEST_FILE_RE.test(file))
  );

  const testFiles = toUniqueSorted(
    files.filter((file) => FRONTEND_TEST_FILE_RE.test(file) || E2E_TEST_FILE_RE.test(file))
  );

  if (frontendFiles.length === 0) {
    return {
      ok: true,
      reason: "no_frontend_changes",
      frontendFiles,
      testFiles
    };
  }

  if (testFiles.length === 0) {
    return {
      ok: false,
      reason: "missing_tests",
      frontendFiles,
      testFiles
    };
  }

  return {
    ok: true,
    reason: "tests_present",
    frontendFiles,
    testFiles
  };
}

export function collectChangedFiles() {
  const override = normalizeList(process.env.FRONTEND_TEST_GUARD_FILES);
  if (override.length) {
    return { files: toUniqueSorted(override), skipped: false, source: "override" };
  }

  if (!hasRef("HEAD")) {
    return { files: [], skipped: true, source: "no_head" };
  }

  const files = [];

  if (hasRef("HEAD~1")) {
    files.push(...runGit("diff --name-only --diff-filter=ACMR HEAD~1..HEAD"));
  } else {
    files.push(...runGit("show --pretty='' --name-only HEAD"));
  }

  files.push(...runGit("diff --name-only --diff-filter=ACMR"));
  files.push(...runGit("diff --name-only --diff-filter=ACMR --cached"));

  return {
    files: toUniqueSorted(files),
    skipped: false,
    source: "git"
  };
}

export function runFrontendTestFirstCheck() {
  const changed = collectChangedFiles();

  if (changed.skipped) {
    return {
      ok: true,
      skipped: true,
      reason: changed.source,
      message: "Skipped frontend test-first check (no git HEAD ref found)."
    };
  }

  const result = evaluateFrontendTestFirst(changed.files);

  if (result.ok) {
    if (result.reason === "no_frontend_changes") {
      return {
        ...result,
        skipped: false,
        message: "Frontend test-first check passed (no frontend .tsx changes detected)."
      };
    }

    return {
      ...result,
      skipped: false,
      message: `Frontend test-first check passed (${result.frontendFiles.length} frontend file(s), ${result.testFiles.length} test file(s)).`
    };
  }

  const frontendList = result.frontendFiles.map((file) => `  - ${file}`).join("\n");
  return {
    ...result,
    skipped: false,
    message: [
      "Frontend test-first check failed.",
      "Detected frontend .tsx changes without matching frontend/e2e test changes.",
      "Frontend files:",
      frontendList,
      "",
      "Add or update at least one test file in apps/web/src/**/*.test.ts(x) or e2e/specs/**/*.spec.*"
    ].join("\n")
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runFrontendTestFirstCheck();

  if (result.ok) {
    console.log(result.message);
    process.exit(0);
  }

  console.error(result.message);
  process.exit(1);
}
