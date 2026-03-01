import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

export default async function globalSetup() {
  const dataFile = path.join(ROOT_DIR, "services/api/tmp/e2e-store.json");
  const reportDir = path.join(ROOT_DIR, "output/playwright/report");
  const testResultsDir = path.join(ROOT_DIR, "output/playwright/test-results");

  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.mkdir(path.join(ROOT_DIR, "output/playwright"), { recursive: true });

  await fs.rm(dataFile, { force: true });
  await fs.rm(reportDir, { recursive: true, force: true });
  await fs.rm(testResultsDir, { recursive: true, force: true });
}
