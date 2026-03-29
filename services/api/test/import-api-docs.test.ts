import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderImportApiMarkdown } from "../src/api-docs/imports.ts";

const ROOT_DIR = process.cwd();
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, "package.json");
const IMPORT_API_DOC_PATH = path.join(ROOT_DIR, "docs/api/imports.md");

test("root package exposes a docs:api script", () => {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));

  assert.equal(packageJson.scripts?.["docs:api"], "tsx scripts/generate-api-docs.ts");
});

test("generated import API docs stay in sync with the renderer output", () => {
  assert.equal(fs.existsSync(IMPORT_API_DOC_PATH), true);
  assert.equal(
    fs.readFileSync(IMPORT_API_DOC_PATH, "utf8"),
    renderImportApiMarkdown()
  );
});

test("generated import API docs describe the retained reprocess endpoint as non-UI", () => {
  assert.equal(fs.existsSync(IMPORT_API_DOC_PATH), true);

  const markdown = fs.readFileSync(IMPORT_API_DOC_PATH, "utf8");
  assert.match(markdown, /POST `\/v1\/imports\/:id\/reprocess`/);
  assert.match(markdown, /not exposed in the primary UI/i);
});
