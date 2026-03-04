#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

type ChangeEntry = {
  code: "A" | "C" | "M" | "R";
  oldPath: string | null;
  newPath: string;
};

type AddedLine = {
  filePath: string;
  lineNumber: number;
  content: string;
};

const MANAGED_SCOPES = ["apps/web/", "services/api/", "e2e/", "scripts/", "packages/domain/"];
const JS_FAMILY_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs"]);
const MANAGED_SCOPE_EXCLUDE_SEGMENTS = [
  "/.next/",
  "/dist/",
  "/coverage/",
  "/playwright-report/",
  "/node_modules/",
  "/output/"
];

const NPM_SCAN_PATHS = ["README.md", "TESTING.md", "docs"];
const NPM_TOKEN_RE = /\b(?:npm|npx)\b/;

const JS_ALLOWLIST_PATH = "config/guardrails/js-extension-allowlist.txt";

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function runGit(args: string) {
  try {
    return execSync(`git ${args}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
  } catch {
    return "";
  }
}

function hasRef(ref: string) {
  try {
    execSync(`git rev-parse --verify ${ref}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const againstFlagIndex = args.indexOf("--against");
  if (againstFlagIndex >= 0) {
    const against = args[againstFlagIndex + 1] || "";
    return { against: against.trim() || null };
  }
  return { against: null };
}

function parseNameStatusOutput(raw: string) {
  const entries: ChangeEntry[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const parts = line.split("\t");
    const status = parts[0] || "";
    const code = status.charAt(0) as ChangeEntry["code"];
    if (!["A", "C", "M", "R"].includes(code)) {
      continue;
    }

    if ((code === "R" || code === "C") && parts.length >= 3) {
      entries.push({
        code,
        oldPath: normalizePath(parts[1]),
        newPath: normalizePath(parts[2])
      });
      continue;
    }

    if (parts.length >= 2) {
      entries.push({
        code,
        oldPath: null,
        newPath: normalizePath(parts[1])
      });
    }
  }

  return entries;
}

function collectChangedFiles(against: string | null) {
  const outputs: string[] = [];

  if (against) {
    outputs.push(runGit(`diff --name-status --diff-filter=ACMR ${against}`));
  } else {
    if (hasRef("HEAD~1")) {
      outputs.push(runGit("diff --name-status --diff-filter=ACMR HEAD~1..HEAD"));
    } else if (hasRef("HEAD")) {
      outputs.push(runGit("show --name-status --pretty='' --diff-filter=ACMR HEAD"));
    }
    outputs.push(runGit("diff --name-status --diff-filter=ACMR"));
    outputs.push(runGit("diff --name-status --diff-filter=ACMR --cached"));
  }

  const byPath = new Map<string, ChangeEntry>();
  for (const output of outputs) {
    for (const entry of parseNameStatusOutput(output)) {
      byPath.set(entry.newPath, entry);
    }
  }

  return [...byPath.values()];
}

function parseUnifiedDiffAddedLines(raw: string) {
  const result: AddedLine[] = [];

  let currentFilePath: string | null = null;
  let nextNewLine = 0;

  for (const line of raw.split("\n")) {
    if (line.startsWith("+++ ")) {
      const target = line.slice(4).trim();
      if (target === "/dev/null") {
        currentFilePath = null;
      } else if (target.startsWith("b/")) {
        currentFilePath = normalizePath(target.slice(2));
      } else {
        currentFilePath = normalizePath(target);
      }
      continue;
    }

    if (line.startsWith("@@")) {
      const match = line.match(/\+(\d+)(?:,(\d+))?/);
      nextNewLine = match ? Number(match[1]) : 0;
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      if (currentFilePath) {
        result.push({
          filePath: currentFilePath,
          lineNumber: nextNewLine,
          content: line.slice(1)
        });
      }
      nextNewLine += 1;
      continue;
    }

    if (line.startsWith(" ")) {
      nextNewLine += 1;
    }
  }

  return result;
}

function buildScopedDiffCommand(baseArgs: string, against: string | null, scopedPaths: string[]) {
  const pathArgs = scopedPaths.join(" ");
  if (against) {
    return `${baseArgs} ${against} -- ${pathArgs}`;
  }
  return `${baseArgs} -- ${pathArgs}`;
}

function collectAddedLinesForPaths(against: string | null, scopedPaths: string[]) {
  const outputs: string[] = [];

  if (against) {
    const diffArgs = buildScopedDiffCommand("diff --unified=0 --no-color", against, scopedPaths);
    outputs.push(runGit(diffArgs));
  } else {
    if (hasRef("HEAD~1")) {
      outputs.push(runGit(buildScopedDiffCommand("diff --unified=0 --no-color", "HEAD~1..HEAD", scopedPaths)));
    } else if (hasRef("HEAD")) {
      outputs.push(runGit(buildScopedDiffCommand("show --unified=0 --no-color --pretty='format:'", "HEAD", scopedPaths)));
    }
    outputs.push(runGit(buildScopedDiffCommand("diff --unified=0 --no-color", null, scopedPaths)));
    outputs.push(runGit(buildScopedDiffCommand("diff --unified=0 --no-color --cached", null, scopedPaths)));
  }

  return outputs.flatMap((output) => parseUnifiedDiffAddedLines(output));
}

function loadJsAllowlist() {
  if (!fs.existsSync(JS_ALLOWLIST_PATH)) {
    return new Set<string>();
  }

  const contents = fs.readFileSync(JS_ALLOWLIST_PATH, "utf8");
  const entries = contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => normalizePath(line));
  return new Set(entries);
}

function isManagedScopePath(filePath: string) {
  const normalized = normalizePath(filePath);
  return MANAGED_SCOPES.some((prefix) => normalized.startsWith(prefix));
}

function isManagedScopeExcludedPath(filePath: string) {
  const normalized = `/${normalizePath(filePath)}`;
  return MANAGED_SCOPE_EXCLUDE_SEGMENTS.some((segment) => normalized.includes(segment));
}

function isJsFamily(filePath: string) {
  return JS_FAMILY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function runJsExtensionGuardrail(against: string | null) {
  const changedFiles = collectChangedFiles(against);
  const allowlist = loadJsAllowlist();

  const offenders = changedFiles
    .filter((entry) => entry.code === "A" || entry.code === "R" || entry.code === "C")
    .map((entry) => entry.newPath)
    .filter((filePath) => isManagedScopePath(filePath))
    .filter((filePath) => !isManagedScopeExcludedPath(filePath))
    .filter((filePath) => isJsFamily(filePath))
    .filter((filePath) => !allowlist.has(normalizePath(filePath)));

  return [...new Set(offenders)].sort((a, b) => a.localeCompare(b));
}

function runNpmDriftGuardrail(against: string | null) {
  const addedLines = collectAddedLinesForPaths(against, NPM_SCAN_PATHS);

  const offenders = addedLines
    .filter((entry) => NPM_TOKEN_RE.test(entry.content))
    .map((entry) => ({
      filePath: entry.filePath,
      lineNumber: entry.lineNumber,
      content: entry.content.trim()
    }));

  const seen = new Set<string>();
  return offenders.filter((entry) => {
    const key = `${entry.filePath}:${entry.lineNumber}:${entry.content}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function main() {
  const { against } = parseArgs();

  const jsViolations = runJsExtensionGuardrail(against);
  const npmViolations = runNpmDriftGuardrail(against);

  if (jsViolations.length === 0 && npmViolations.length === 0) {
    const rangeLabel = against ? ` against ${against}` : "";
    console.log(`Guardrails passed${rangeLabel}.`);
    return;
  }

  if (jsViolations.length > 0) {
    console.error("Guardrail failed: unmanaged JavaScript-family file additions detected in managed scopes.");
    for (const filePath of jsViolations) {
      console.error(`  - ${filePath}`);
    }
    console.error(`Allowlist path: ${JS_ALLOWLIST_PATH}`);
  }

  if (npmViolations.length > 0) {
    console.error("Guardrail failed: added npm/npx usage detected in maintained local docs.");
    for (const violation of npmViolations) {
      console.error(`  - ${violation.filePath}:${violation.lineNumber} -> ${violation.content}`);
    }
  }

  process.exit(1);
}

main();
