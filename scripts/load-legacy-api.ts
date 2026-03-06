#!/usr/bin/env node

import process from "node:process";
import { seedFromLegacyApiToStore } from "../services/api/src/legacy-api-loader.ts";

function printHelp() {
  console.log(`Usage: tsx scripts/load-legacy-api.ts [options]

Options:
  --base-url <url>      Legacy Minance API base URL (default: LEGACY_MINANCE_BASE_URL or http://10.0.0.20:18080)
  --start <YYYY-MM-DD>  Transaction start date (default: LEGACY_MINANCE_START or 2024-01-01)
  --end <YYYY-MM-DD>    Transaction end date (default: LEGACY_MINANCE_END or 2026-12-31)
  --user-email <email>  Target Minance2 user email (default: dev seeded user)
  --no-reset            Keep existing user data and append with dedupe (default resets user financial data first)
  --help                Show this help message
`);
}

function parseArgs(argv) {
  const options = {
    baseUrl: String(process.env.LEGACY_MINANCE_BASE_URL || "http://10.0.0.20:18080").trim(),
    startDate: String(process.env.LEGACY_MINANCE_START || "2024-01-01").trim(),
    endDate: String(process.env.LEGACY_MINANCE_END || "2026-12-31").trim(),
    userEmail: process.env.LEGACY_MINANCE_USER_EMAIL || null,
    resetUserData: true,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--base-url") {
      options.baseUrl = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    if (token === "--start") {
      options.startDate = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    if (token === "--end") {
      options.endDate = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    if (token === "--user-email") {
      options.userEmail = String(argv[index + 1] || "").trim() || null;
      index += 1;
      continue;
    }
    if (token === "--no-reset") {
      options.resetUserData = false;
      continue;
    }
    if (token === "-h" || token === "--help") {
      options.help = true;
      continue;
    }
  }

  return options;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const result = await seedFromLegacyApiToStore({
    baseUrl: args.baseUrl,
    startDate: args.startDate,
    endDate: args.endDate,
    userEmail: args.userEmail,
    resetUserData: args.resetUserData
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        loader: "legacy-api",
        ...result
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
