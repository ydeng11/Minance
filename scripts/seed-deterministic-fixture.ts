#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  createDeterministicFinancialFixture,
  summarizeDeterministicFinancialFixture,
  writeDeterministicFinancialFixture,
  DETERMINISTIC_FINANCIAL_FIXTURE_VERSION
} from "../services/api/test/fixtures/deterministic-financial-fixture.js";

const DEFAULT_TARGET_FIXTURE = "services/api/test/fixtures/deterministic-financial-store.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function resolveFromRoot(inputPath, fallbackPath) {
  const selected = inputPath || fallbackPath;
  if (!selected) {
    throw new Error("A target path is required");
  }
  return path.isAbsolute(selected) ? selected : path.resolve(ROOT_DIR, selected);
}

function parseArgs(argv) {
  const args = {
    target: null,
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--target") {
      args.target = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "-h" || token === "--help") {
      console.log(`Usage: tsx scripts/seed-deterministic-fixture.ts [--target <path>] [--dry-run]\n\nOptions:\n  --target   Target JSON fixture path (default: MINANCE_DATA_FILE or ${DEFAULT_TARGET_FIXTURE})\n  --dry-run  Print fixture summary without writing file`);
      process.exit(0);
    }
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetPath = resolveFromRoot(args.target || process.env.MINANCE_DATA_FILE, DEFAULT_TARGET_FIXTURE);

  if (args.dryRun) {
    const summary = summarizeDeterministicFinancialFixture(createDeterministicFinancialFixture());
    console.log(
      JSON.stringify(
        {
          dataset: "deterministic-financial",
          version: DETERMINISTIC_FINANCIAL_FIXTURE_VERSION,
          targetPath,
          summary,
          wrote: false
        },
        null,
        2
      )
    );
    return;
  }

  const result = writeDeterministicFinancialFixture(targetPath);
  console.log(
    JSON.stringify(
      {
        dataset: "deterministic-financial",
        version: DETERMINISTIC_FINANCIAL_FIXTURE_VERSION,
        targetPath: result.targetPath,
        summary: result.summary,
        wrote: true
      },
      null,
      2
    )
  );
}

main();
