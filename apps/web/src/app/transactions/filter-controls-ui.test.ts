import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExplorerAdvancedFilters } from "@/app/explorer/components/ExplorerAdvancedFilters";
import { MultiSelectField } from "@/components/filters/MultiSelectField";
import { ExplorerViewContent } from "@/app/explorer/components/ExplorerViewContent";
import { ViewControllerProvider } from "@/components/view/ViewController";
import { createDefaultExplorerFilterState } from "@/app/explorer/filters";
import { TransactionsViewContent } from "./TransactionsViewContent";
import { createDefaultTransactionsFilterState } from "./filters";

const transactionsPageSource = readFileSync(join(process.cwd(), "src/app/transactions/page.tsx"), "utf8");
const assistantConversationSource = readFileSync(
  join(process.cwd(), "src/components/assistant/AssistantConversation.tsx"),
  "utf8"
);

test("transactions view content uses the shared shell filter layout", () => {
  const markup = renderToStaticMarkup(
    createElement(
      ViewControllerProvider,
      null,
      createElement(TransactionsViewContent, {
        filters: createDefaultTransactionsFilterState(),
        categoryOptions: [{ value: "Groceries", label: "Groceries" }],
        accountOptions: [{ value: "manual", label: "Manual Account" }],
        availableTags: [],
        amountBounds: { min: 0, max: 100 },
        onApply: () => undefined
      })
    )
  );

  assert.match(markup, /data-testid="transactions-view-content"/);
  assert.match(markup, /data-testid="transactions-account-multiselect-trigger"/);
  assert.match(markup, />Range</);
  assert.match(markup, />Accounts</);
  assert.match(markup, />Advanced filters</);
  assert.match(markup, /data-testid="transactions-advanced-control-grid"/);
  assert.match(markup, /lg:grid-cols-3/);
  assert.match(markup, />Categories</);
  assert.match(markup, />Type</);
  assert.match(markup, /Current range:/);
  assert.doesNotMatch(markup, />Compare</);
  assert.doesNotMatch(markup, />Quick filters</);
  assert.doesNotMatch(markup, />Shape the ledger view</);
});

test("transactions page registers filters with the shell view controller", () => {
  assert.match(transactionsPageSource, /const \{ registerView \} = useViewController\(\);/);
  assert.match(transactionsPageSource, /<TransactionsViewContent/);
  assert.match(transactionsPageSource, /title: "Transaction filters"/);
  assert.doesNotMatch(transactionsPageSource, /<TransactionsCommandBar/);
  assert.doesNotMatch(transactionsPageSource, /<TransactionsAdvancedFilters/);
});

test("transactions legacy inline filter components are removed", () => {
  assert.equal(existsSync(join(process.cwd(), "src/app/transactions/TransactionsCommandBar.tsx")), false);
  assert.equal(existsSync(join(process.cwd(), "src/app/transactions/TransactionsAdvancedFilters.tsx")), false);
});

test("searchable multiselect exposes an explicit accessible search label", () => {
  const markup = renderToStaticMarkup(
    createElement(MultiSelectField, {
      selectedValues: [],
      options: [
        { value: "groceries", label: "Groceries" },
        { value: "dining", label: "Dining" }
      ],
      onChange: () => undefined,
      emptyLabel: "All categories",
      testId: "test-category-multiselect",
      isOpen: true,
      onOpenChange: () => undefined,
      ariaLabel: "Filter transactions by category",
      searchable: true,
      searchPlaceholder: "Search category"
    })
  );

  assert.match(markup, /aria-label="Search category"/);
});

test("searchable multiselect controls preserve visible focus treatment", () => {
  const markup = renderToStaticMarkup(
    createElement(MultiSelectField, {
      selectedValues: ["groceries"],
      options: [
        { value: "groceries", label: "Groceries" },
        { value: "dining", label: "Dining" }
      ],
      onChange: () => undefined,
      emptyLabel: "All categories",
      testId: "test-category-multiselect",
      isOpen: true,
      onOpenChange: () => undefined,
      ariaLabel: "Filter transactions by category",
      searchable: true,
      searchPlaceholder: "Search category"
    })
  );

  assert.match(markup, /data-testid="test-category-multiselect-trigger"[^>]*focus-visible:ring-2/);
  assert.match(markup, /data-testid="test-category-multiselect-search"[^>]*focus-visible:ring-2/);
  assert.match(markup, /role="option"[^>]*focus-visible:ring-2/);
  assert.match(markup, /focus-visible:ring-offset-2/);
});

test("assistant icon controls meet touch target and decorative icon expectations", () => {
  assert.match(assistantConversationSource, /data-testid="assistant-ask"[\s\S]*h-11 w-11/);
  assert.match(assistantConversationSource, /<Send className="h-4 w-4" aria-hidden="true" \/>/);
  assert.match(assistantConversationSource, /<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" \/>/);
  assert.match(assistantConversationSource, /<X className="h-4 w-4" aria-hidden="true" \/>/);
});

test("explorer advanced filters include a recurring-only toggle", () => {
  const markup = renderToStaticMarkup(
    createElement(ExplorerAdvancedFilters, {
      filters: createDefaultExplorerFilterState(),
      categories: [],
      availableTags: [],
      amountBounds: { min: 0, max: 100 },
      onChange: () => undefined
    })
  );

  assert.match(markup, /data-testid="explorer-recurring-filter"/);
  assert.match(markup, />Recurring only</);
});

test("explorer view content moves range and compare controls into the shell dialog body", () => {
  const markup = renderToStaticMarkup(
    createElement(
      ViewControllerProvider,
      null,
      createElement(ExplorerViewContent, {
        filters: createDefaultExplorerFilterState(),
        accounts: [],
        categories: [],
        availableTags: [],
        amountBounds: { min: 0, max: 100 },
        onApply: () => undefined
      })
    )
  );

  assert.match(markup, />Range</);
  assert.match(markup, />Compare</);
  assert.match(markup, /data-testid="explorer-advanced-filters"/);
});

test("transactions ledger keeps the compact breakpoint treatment until large desktop widths", () => {
  assert.match(transactionsPageSource, /lg:min-w-\[1160px\]/);
  assert.match(transactionsPageSource, /lg:table-cell/);
  assert.match(transactionsPageSource, /lg:hidden/);
  assert.doesNotMatch(transactionsPageSource, /className="min-w-\[1160px\] w-full text-left text-sm text-neutral-200"/);
  assert.doesNotMatch(transactionsPageSource, /md:min-w-\[1160px\]/);
});

test("transaction create and bulk delete dialogs use the shared focus-management pattern", () => {
  assert.match(transactionsPageSource, /import \{ trapDialogTabKey \} from "@\/lib\/dialogFocus";/);
  assert.match(transactionsPageSource, /const createDialogRef = useRef<HTMLElement \| null>\(null\);/);
  assert.match(transactionsPageSource, /const bulkDeleteDialogRef = useRef<HTMLElement \| null>\(null\);/);
  assert.match(transactionsPageSource, /const previousFocusedElementRef = useRef<HTMLElement \| null>\(null\);/);
  assert.match(transactionsPageSource, /trapDialogTabKey\(event, createDialogRef\.current\)/);
  assert.match(transactionsPageSource, /trapDialogTabKey\(event, bulkDeleteDialogRef\.current\)/);
  assert.match(transactionsPageSource, /previousFocusedElementRef\.current\?\.focus\(\)/);
  assert.match(transactionsPageSource, /ref=\{createDialogRef\}[\s\S]*data-testid="txn-create-dialog"[\s\S]*tabIndex=\{-1\}/);
  assert.match(transactionsPageSource, /ref=\{bulkDeleteDialogRef\}[\s\S]*data-testid="txn-bulk-delete-dialog"[\s\S]*tabIndex=\{-1\}/);
});

test("transaction bulk dropdown fields expose accessible labels", () => {
  assert.match(transactionsPageSource, /aria-label="Bulk category"/);
  assert.match(transactionsPageSource, /aria-label="Bulk tags"/);
});

test("transaction row pagination and bulk action buttons keep touch-friendly minimum height", () => {
  assert.match(transactionsPageSource, /const BULK_DANGER_BUTTON_CLASS =\n\s+"[^"]*min-h-11/);
  assert.match(transactionsPageSource, /const TRANSACTION_BULK_ACTION_BUTTON_CLASS =\n\s+"[^"]*min-h-11/);
  assert.match(transactionsPageSource, /const TRANSACTION_BULK_APPLY_BUTTON_CLASS =\n\s+"[^"]*min-h-11/);
  assert.match(transactionsPageSource, /const TRANSACTION_BULK_REVIEW_OPTION_CLASS =\n\s+"[^"]*min-h-11/);
  assert.match(transactionsPageSource, /const TRANSACTION_ROW_ACTION_BUTTON_CLASS =\n\s+"[^"]*min-h-11/);
  assert.match(transactionsPageSource, /const TRANSACTION_ROW_CANCEL_BUTTON_CLASS =\n\s+"[^"]*min-h-11/);
  assert.match(transactionsPageSource, /const TRANSACTION_PAGINATION_BUTTON_CLASS =\n\s+"[^"]*min-h-11/);
});

test("transactions active filter chips are derived inline without an extra memo", () => {
  assert.match(transactionsPageSource, /const activeFilterChips = \(\(\) => {/);
  assert.doesNotMatch(transactionsPageSource, /const activeFilterChips = useMemo\(\(\) => {/);
});

test("transaction filter commits reload ledger data without waiting for navigation effects", () => {
  assert.match(transactionsPageSource, /function commitFilters\(nextFilters: TransactionsFilterState\) \{/);
  assert.match(transactionsPageSource, /syncFiltersToUrl\(nextFilters\);\n\s+void loadTransactions\(nextFilters\);/);
});
