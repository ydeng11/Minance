import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProcessedRecordsToolbar } from "./ProcessedRecordsToolbar";

test("processed records toolbar omits the manual reprocess action", () => {
  const markup = renderToStaticMarkup(
    createElement(ProcessedRecordsToolbar, {
      statusFilter: "",
      onStatusFilterChange: () => undefined
    })
  );

  assert.match(markup, /data-testid="processed-status-filter"/);
  assert.doesNotMatch(markup, />Reprocess</);
});
