import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExplorerAdvancedFilters } from "@/app/explorer/components/ExplorerAdvancedFilters";
import { createDefaultExplorerFilterState } from "@/app/explorer/filters";
import { TransactionsAdvancedFilters } from "./TransactionsAdvancedFilters";
import { TransactionsCommandBar } from "./TransactionsCommandBar";
import { createDefaultTransactionsFilterState } from "./filters";

test("transactions command bar removes the clear button and constrains the search width", () => {
  const markup = renderToStaticMarkup(
    createElement(TransactionsCommandBar, {
      filters: createDefaultTransactionsFilterState(),
      activeFilterCount: 0,
      onChange: () => undefined,
      onApply: () => undefined,
      onOpenAdvancedFilters: () => undefined
    })
  );

  assert.doesNotMatch(markup, />Clear</);
  assert.match(markup, /xl:w-\[24rem\]/);
});

test("transactions advanced filters shorten the reset button label", () => {
  const markup = renderToStaticMarkup(
    createElement(TransactionsAdvancedFilters, {
      filters: createDefaultTransactionsFilterState(),
      categoryOptions: [],
      accountOptions: [],
      amountBoundMin: 0,
      amountBoundMax: 100,
      onChange: () => undefined,
      onApply: () => undefined,
      onClose: () => undefined,
      onReset: () => undefined
    })
  );

  assert.match(markup, />Rest</);
  assert.doesNotMatch(markup, />Reset draft</);
});

test("explorer advanced filters include a recurring-only toggle", () => {
  const markup = renderToStaticMarkup(
    createElement(ExplorerAdvancedFilters, {
      filters: createDefaultExplorerFilterState(),
      categories: [],
      availableTags: [],
      amountBounds: { min: 0, max: 100 },
      onApply: () => undefined,
      onClose: () => undefined
    })
  );

  assert.match(markup, /data-testid="explorer-recurring-filter"/);
  assert.match(markup, />Recurring only</);
});
