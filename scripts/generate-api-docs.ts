import fs from "node:fs";
import path from "node:path";
import { renderImportApiMarkdown } from "../services/api/src/api-docs/imports.ts";

const ROOT_DIR = process.cwd();
const importApiDocPath = path.join(ROOT_DIR, "docs/api/imports.md");

fs.mkdirSync(path.dirname(importApiDocPath), { recursive: true });
fs.writeFileSync(importApiDocPath, renderImportApiMarkdown(), "utf8");

console.log(`Updated ${path.relative(ROOT_DIR, importApiDocPath)}`);
