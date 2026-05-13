import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const categoriesPageSource = readFileSync(join(process.cwd(), "src/app/categories/page.tsx"), "utf8");

test("category dialogs use shared focus management and restore focus", () => {
  assert.match(categoriesPageSource, /import \{ trapDialogTabKey \} from "@\/lib\/dialogFocus";/);
  assert.match(categoriesPageSource, /const categoryDialogRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.match(categoriesPageSource, /const deleteDialogRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.match(categoriesPageSource, /const previousFocusedElementRef = useRef<HTMLElement \| null>\(null\);/);
  assert.match(categoriesPageSource, /categoryNameInputRef\.current\?\.focus\(\)/);
  assert.match(categoriesPageSource, /deleteCancelButtonRef\.current\?\.focus\(\)/);
  assert.match(categoriesPageSource, /trapDialogTabKey\(event, categoryDialogRef\.current\)/);
  assert.match(categoriesPageSource, /trapDialogTabKey\(event, deleteDialogRef\.current\)/);
  assert.match(categoriesPageSource, /previousFocusedElementRef\.current\?\.focus\(\)/);
  assert.match(categoriesPageSource, /ref=\{categoryDialogRef\}[\s\S]*data-testid="category-modal"[\s\S]*tabIndex=\{-1\}/);
  assert.match(categoriesPageSource, /ref=\{deleteDialogRef\}[\s\S]*data-testid="category-delete-modal"[\s\S]*tabIndex=\{-1\}/);
});

test("category controls keep touch-friendly minimum targets", () => {
  assert.match(categoriesPageSource, /const DANGER_INLINE_BUTTON_CLASS =\n\s+"[^"]*min-h-11/);
  assert.match(categoriesPageSource, /const DANGER_CONFIRM_BUTTON_CLASS =\n\s+"[^"]*min-h-11/);
  assert.match(categoriesPageSource, /const CATEGORY_PRIMARY_ACTION_CLASS =\n\s+"[^"]*min-h-11/);
  assert.match(categoriesPageSource, /const CATEGORY_ROW_ACTION_BUTTON_CLASS =\n\s+"[^"]*min-h-11/);
  assert.match(categoriesPageSource, /const CATEGORY_SECONDARY_ACTION_CLASS =\n\s+"[^"]*min-h-11/);
  assert.match(categoriesPageSource, /const CATEGORY_ACCENT_ACTION_CLASS =\n\s+"[^"]*min-h-11/);
  assert.match(categoriesPageSource, /const CATEGORY_TAXONOMY_ICON_BUTTON_CLASS =\n\s+"[^"]*min-h-11[^"]*min-w-11/);
});

test("category decorative icons are hidden from assistive technology", () => {
  assert.match(categoriesPageSource, /<Plus className="h-4 w-4" aria-hidden="true" \/>/);
  assert.match(categoriesPageSource, /<Tags className="h-4 w-4 text-text-muted" aria-hidden="true" \/>/);
  assert.match(categoriesPageSource, /<Search className=\{CATEGORY_FIELD_ICON_CLASS\} aria-hidden="true" \/>/);
  assert.match(categoriesPageSource, /<Pencil className="h-3\.5 w-3\.5" aria-hidden="true" \/>/);
  assert.match(categoriesPageSource, /<Trash2 className="h-3\.5 w-3\.5" aria-hidden="true" \/>/);
  assert.match(categoriesPageSource, /<ArrowUp className="h-3\.5 w-3\.5" aria-hidden="true" \/>/);
  assert.match(categoriesPageSource, /<ArrowDown className="h-3\.5 w-3\.5" aria-hidden="true" \/>/);
  assert.match(categoriesPageSource, /<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" \/>/);
  assert.match(categoriesPageSource, /<Save className="h-4 w-4" aria-hidden="true" \/>/);
});
