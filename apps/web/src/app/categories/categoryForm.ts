import type { Category } from "@/lib/api/types";

const CATEGORY_TYPES = new Set(["expense", "income", "transfer"]);

export interface CategoryFormDraft {
  name: string;
  emoji: string;
  coarseKey: string;
  type: string;
}

export interface CategoryFormErrors {
  name?: string;
  coarseKey?: string;
  type?: string;
}

export interface CategoryValidationResult {
  errors: CategoryFormErrors;
  normalizedName: string;
  normalizedEmoji: string;
  normalizedCoarseKey: string;
  normalizedType: "expense" | "income" | "transfer" | undefined;
}

function normalizeComparableName(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeCategoryType(value: string): "expense" | "income" | "transfer" | undefined {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (CATEGORY_TYPES.has(normalized)) {
    return normalized as "expense" | "income" | "transfer";
  }
  return undefined;
}

export function createDefaultCategoryDraft(defaultCoarseKey: string): CategoryFormDraft {
  return {
    name: "",
    emoji: "",
    coarseKey: defaultCoarseKey,
    type: ""
  };
}

export function buildCategoryDraftFromCategory(category: Category): CategoryFormDraft {
  return {
    name: category.name || "",
    emoji: category.emoji || "",
    coarseKey: String(category.coarseKey || ""),
    type: String(category.type || "")
  };
}

export function validateCategoryDraft(
  draft: CategoryFormDraft,
  categories: Category[],
  editingCategoryId: string | null
): CategoryValidationResult {
  const errors: CategoryFormErrors = {};

  const normalizedName = String(draft.name || "").trim().replace(/\s+/g, " ");
  const normalizedEmoji = String(draft.emoji || "").trim();
  const normalizedCoarseKey = String(draft.coarseKey || "").trim();
  const rawType = String(draft.type || "").trim().toLowerCase();
  const normalizedType = normalizeCategoryType(rawType);

  if (!normalizedName) {
    errors.name = "Category name is required.";
  } else if (normalizedName.length < 2) {
    errors.name = "Category name must be at least 2 characters.";
  }

  if (!normalizedCoarseKey) {
    errors.coarseKey = "Category group is required.";
  }

  if (rawType && !normalizedType) {
    errors.type = "Category type is invalid.";
  }

  if (normalizedName) {
    const normalizedCandidate = normalizeComparableName(normalizedName);
    const duplicate = categories.some(
      (entry) =>
        entry.id !== editingCategoryId
        && normalizeComparableName(entry.name) === normalizedCandidate
    );
    if (duplicate) {
      errors.name = "Category name already exists.";
    }
  }

  return {
    errors,
    normalizedName,
    normalizedEmoji,
    normalizedCoarseKey,
    normalizedType
  };
}
