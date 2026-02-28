import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "../../..");

function loadDotEnvLocal() {
  const envPath = path.join(ROOT_DIR, ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    if (!key || process.env[key] != null) {
      continue;
    }

    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadDotEnvLocal();

const configuredDataFile = process.env.MINANCE_DATA_FILE || "services/api/data/store.json";
export const DATA_FILE = path.isAbsolute(configuredDataFile)
  ? configuredDataFile
  : path.join(ROOT_DIR, configuredDataFile);
export const TMP_DIR = path.join(__dirname, "../tmp");
export const WEB_DIR = path.join(ROOT_DIR, "apps/web");

export const PORT = Number(process.env.PORT || 3000);
export const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour
export const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
export const AI_SECRET = process.env.AI_CREDENTIAL_SECRET || "minance-next-local-secret-change-me";
