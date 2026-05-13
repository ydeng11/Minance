import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusMessage } from "./StatusMessage";

test("status message announces informational updates politely", () => {
  const markup = renderToStaticMarkup(createElement(StatusMessage, null, "Saved."));

  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /data-testid="global-message"/);
});

test("status message announces errors assertively", () => {
  const markup = renderToStaticMarkup(
    createElement(StatusMessage, { tone: "error", "data-testid": "accounts-error" }, "Failed.")
  );

  assert.match(markup, /role="alert"/);
  assert.match(markup, /aria-live="assertive"/);
  assert.match(markup, /data-testid="accounts-error"/);
});

test("globals css disables the shared animation utilities for reduced-motion users", () => {
  const globalsSource = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(globalsSource, /prefers-reduced-motion:\s*reduce/);
  assert.match(globalsSource, /\.animate-bounce/);
  assert.match(globalsSource, /\.animate-pulse/);
  assert.match(globalsSource, /\.animate-spin/);
  assert.match(globalsSource, /animation:\s*none\s*!important/);
});
