"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Save, Search, Tags, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { Category, CategoryStrategyCoarse, CategoryStrategyGranular } from "@/lib/api/types";
import { EmojiPicker } from "@/components/EmojiPicker";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import { trapDialogTabKey } from "@/lib/dialogFocus";
import {
  buildCategoryDraftFromCategory,
  createDefaultCategoryDraft,
  type CategoryFormDraft,
  type CategoryFormErrors,
  validateCategoryDraft
} from "./categoryForm";
import {
  createCoarseGroup,
  groupCategoriesByCoarse,
  moveCoarseGroup,
  sortCoarseGroups,
  syncGranularAssignment
} from "./categoryTaxonomy";

type ModalMode = "create" | "edit";

const MODAL_BACKDROP_CLASS = "fixed inset-0 z-50 flex items-center justify-center bg-app-bg/80 p-4 backdrop-blur-sm";
const FORM_ERROR_CLASS = "mt-1 text-xs text-danger";
const DANGER_INLINE_BUTTON_CLASS =
  "inline-flex min-h-11 items-center gap-1 rounded-md border border-danger/35 bg-danger-soft px-3 py-2 text-xs text-danger transition hover:border-danger/55 disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-field disabled:text-text-muted";
const DELETE_DIALOG_CLASS =
  "w-full max-w-lg rounded-2xl border border-danger/35 bg-surface-panel p-5 shadow-dialog";
const DANGER_CONFIRM_BUTTON_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border border-danger/35 bg-danger-soft px-4 py-2 text-sm text-danger transition hover:border-danger/55 disabled:cursor-not-allowed disabled:opacity-60";
const CATEGORY_PRIMARY_ACTION_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-subtle bg-surface-field px-4 py-2 text-sm font-medium text-text-primary transition hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const CATEGORY_SECTION_CLASS =
  "rounded-2xl border border-border-subtle bg-surface-panel/85 p-4 shadow-panel";
const CATEGORY_FIELD_LABEL_CLASS = "grid gap-1 text-text-secondary";
const CATEGORY_FIELD_ICON_CLASS = "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted";
const CATEGORY_TEXT_FIELD_CLASS =
  "min-h-11 w-full rounded-lg border border-border-subtle bg-surface-field py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-focus-ring";
const CATEGORY_SELECT_FIELD_CLASS =
  "min-h-11 rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-focus-ring";
const CATEGORY_TABLE_WRAP_CLASS = "mt-4 overflow-x-auto rounded-xl border border-border-subtle";
const CATEGORY_TABLE_CLASS = "min-w-full divide-y divide-border-subtle text-sm";
const CATEGORY_TABLE_HEAD_CLASS = "bg-surface-elevated/70 text-left text-xs uppercase tracking-wide text-text-muted";
const CATEGORY_TABLE_BODY_CLASS = "divide-y divide-border-subtle bg-surface-panel/20 text-text-secondary";
const CATEGORY_TABLE_EMPTY_CLASS = "px-3 py-6 text-center text-text-muted";
const CATEGORY_TABLE_PRIMARY_TEXT_CLASS = "font-medium text-text-primary";
const CATEGORY_TABLE_MUTED_TEXT_CLASS = "text-xs text-text-muted";
const CATEGORY_TABLE_CELL_CLASS = "px-3 py-3 text-text-secondary";
const CATEGORY_ROW_ACTION_BUTTON_CLASS =
  "inline-flex min-h-11 items-center gap-1 rounded-md border border-border-strong bg-surface-field px-3 py-2 text-xs text-text-secondary transition hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const CATEGORY_SECONDARY_ACTION_CLASS =
  "min-h-11 rounded-lg border border-border-subtle bg-surface-field px-4 py-2 text-sm text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg disabled:cursor-not-allowed disabled:opacity-60";
const CATEGORY_ACCENT_ACTION_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border border-accent/35 bg-accent-soft px-4 py-2 text-sm font-medium text-accent transition hover:border-accent/60 hover:bg-accent-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg disabled:cursor-not-allowed disabled:opacity-60";
const CATEGORY_TAXONOMY_HELPER_CLASS = "mt-1 text-xs text-text-muted";
const CATEGORY_TAXONOMY_ORDER_WRAP_CLASS =
  "inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-field px-2 py-1";
const CATEGORY_TAXONOMY_ICON_BUTTON_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:text-text-muted";
const CATEGORY_TAXONOMY_CARD_CLASS = "rounded-xl border border-border-subtle bg-surface-field/55 p-3";
const CATEGORY_TAXONOMY_BUCKET_CLASS = "rounded-lg border border-border-subtle bg-surface-panel/70 p-3";
const CATEGORY_TAXONOMY_ITEM_CLASS =
  "grid grid-cols-[1fr_130px] items-center gap-2 rounded-md border border-border-subtle bg-surface-field/70 px-2 py-1.5";
const CATEGORY_COMPACT_TEXT_FIELD_CLASS =
  "min-h-11 w-full min-w-48 rounded border border-border-subtle bg-surface-field px-3 py-2 text-text-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-focus-ring";
const CATEGORY_COMPACT_SELECT_FIELD_CLASS =
  "min-h-11 rounded border border-border-subtle bg-surface-field px-3 py-2 text-xs text-text-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-60";
const CATEGORY_CHECKBOX_CLASS =
  "h-4 w-4 rounded border-border-subtle bg-surface-field text-accent focus:ring-focus-ring";
const CATEGORY_MODAL_PANEL_CLASS =
  "w-full max-w-xl rounded-2xl border border-border-subtle bg-surface-panel p-5 shadow-dialog";
const CATEGORY_MODAL_TITLE_CLASS = "text-lg font-semibold text-text-primary";
const CATEGORY_MODAL_COPY_CLASS = "mt-1 text-sm text-text-secondary";
const CATEGORY_MODAL_LABEL_CLASS = "block text-xs uppercase tracking-wide text-text-muted";
const CATEGORY_MODAL_FIELD_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-focus-ring";

function categoryTypeLabel(type: string | null | undefined) {
  if (type === "expense") {
    return "Expense";
  }
  if (type === "income") {
    return "Income";
  }
  if (type === "transfer") {
    return "Transfer";
  }
  return "Not set";
}

function resolveDefaultCoarseKey(coarseGroups: CategoryStrategyCoarse[]) {
  return coarseGroups.find((entry) => entry.key === "neutral")?.key || coarseGroups[0]?.key || "";
}

function hasFormErrors(errors: CategoryFormErrors) {
  return Boolean(errors.name || errors.coarseKey || errors.type);
}

export default function CategoriesPage() {
  const api = useApi();

  const [categories, setCategories] = useState<Category[]>([]);
  const [coarseGroups, setCoarseGroups] = useState<CategoryStrategyCoarse[]>([]);
  const [granularDraft, setGranularDraft] = useState<CategoryStrategyGranular[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingStrategy, setIsSavingStrategy] = useState(false);
  const [movingCategoryId, setMovingCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [strategyDirty, setStrategyDirty] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupEmoji, setNewGroupEmoji] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryFormDraft>(() => createDefaultCategoryDraft(""));
  const [formErrors, setFormErrors] = useState<CategoryFormErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const categoryDialogRef = useRef<HTMLDivElement | null>(null);
  const categoryNameInputRef = useRef<HTMLInputElement | null>(null);
  const deleteDialogRef = useRef<HTMLDivElement | null>(null);
  const deleteCancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
  const isSavingRef = useRef(isSaving);
  const isDeletingRef = useRef(isDeleting);

  const coarseLabelByKey = useMemo(
    () => new Map(coarseGroups.map((entry) => [entry.key, entry.name])),
    [coarseGroups]
  );

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return categories.filter((category) => {
      if (groupFilter !== "all" && String(category.coarseKey || "") !== groupFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const coarseLabel = coarseLabelByKey.get(String(category.coarseKey || "")) || category.coarseKey || "";
      return [
        category.name,
        category.emoji || "",
        category.type || "",
        coarseLabel
      ].some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [categories, coarseLabelByKey, groupFilter, query]);
  const groupedBuckets = useMemo(
    () => groupCategoriesByCoarse(categories, coarseGroups),
    [categories, coarseGroups]
  );

  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [categoryResponse, strategyResponse] = await Promise.all([
        api.categories.list(),
        api.categories.getStrategy()
      ]);
      setCategories(categoryResponse.categories || []);
      setCoarseGroups(sortCoarseGroups(strategyResponse.strategy.coarseCategories || []));
      setGranularDraft(strategyResponse.strategy.granularCategories || []);
      setStrategyDirty(false);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to load categories.");
      setMessageTone("error");
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  useEffect(() => {
    isDeletingRef.current = isDeleting;
  }, [isDeleting]);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    previousFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    requestAnimationFrame(() => {
      categoryNameInputRef.current?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isSavingRef.current) {
          setModalOpen(false);
          setFormErrors({});
        }
        return;
      }

      trapDialogTabKey(event, categoryDialogRef.current);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => {
        previousFocusedElementRef.current?.focus();
      });
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!deleteTarget) {
      return;
    }

    previousFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    requestAnimationFrame(() => {
      deleteCancelButtonRef.current?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isDeletingRef.current) {
          setDeleteTarget(null);
        }
        return;
      }

      trapDialogTabKey(event, deleteDialogRef.current);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => {
        previousFocusedElementRef.current?.focus();
      });
    };
  }, [deleteTarget]);

  useEffect(() => {
    if (!modalOpen || isSaving || !coarseGroups.length) {
      return;
    }

    if (!draft.coarseKey) {
      setDraft((previous) => ({
        ...previous,
        coarseKey: resolveDefaultCoarseKey(coarseGroups)
      }));
    }
  }, [coarseGroups, draft.coarseKey, isSaving, modalOpen]);

  useEffect(() => {
    if (groupFilter !== "all" && !coarseGroups.some((entry) => entry.key === groupFilter)) {
      setGroupFilter("all");
    }
  }, [coarseGroups, groupFilter]);

  function updateDraft(field: keyof CategoryFormDraft, value: string) {
    setDraft((previous) => ({
      ...previous,
      [field]: value
    }));

    if (field === "name" && formErrors.name) {
      setFormErrors((previous) => ({ ...previous, name: undefined }));
    }
    if (field === "coarseKey" && formErrors.coarseKey) {
      setFormErrors((previous) => ({ ...previous, coarseKey: undefined }));
    }
    if (field === "type" && formErrors.type) {
      setFormErrors((previous) => ({ ...previous, type: undefined }));
    }
  }

  function openCreateModal() {
    setModalMode("create");
    setEditingCategoryId(null);
    const defaultCoarseKey = groupFilter !== "all" && coarseGroups.some((entry) => entry.key === groupFilter)
      ? groupFilter
      : resolveDefaultCoarseKey(coarseGroups);
    setDraft(createDefaultCategoryDraft(defaultCoarseKey));
    setFormErrors({});
    setModalOpen(true);
  }

  function openEditModal(category: Category) {
    setModalMode("edit");
    setEditingCategoryId(category.id);
    setDraft(buildCategoryDraftFromCategory(category));
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }
    setModalOpen(false);
    setFormErrors({});
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const validation = validateCategoryDraft(draft, categories, editingCategoryId);
    setFormErrors(validation.errors);
    if (hasFormErrors(validation.errors)) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: validation.normalizedName,
        emoji: validation.normalizedEmoji || undefined,
        coarseKey: validation.normalizedCoarseKey,
        type: validation.normalizedType
      };

      if (modalMode === "edit" && editingCategoryId) {
        await api.categories.update(editingCategoryId, payload);
        setMessage("Category updated.");
      } else {
        await api.categories.add(payload);
        setMessage("Category created.");
      }

      setMessageTone("info");
      setModalOpen(false);
      setFormErrors({});
      await loadPageData();
    } catch (error) {
      const nextMessage = error instanceof ApiError ? error.message : "Failed to save category.";
      const normalized = nextMessage.toLowerCase();
      if (normalized.includes("already exists")) {
        setFormErrors((previous) => ({ ...previous, name: "Category name already exists." }));
      }
      if (normalized.includes("invalid category group")) {
        setFormErrors((previous) => ({ ...previous, coarseKey: "Category group is invalid." }));
      } else if (normalized.includes("invalid category type")) {
        setFormErrors((previous) => ({ ...previous, type: "Category type is invalid." }));
      }
      setMessage(nextMessage);
      setMessageTone("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDeleteCategory() {
    if (!deleteTarget) {
      return;
    }
    setMessage("");
    setIsDeleting(true);
    try {
      await api.categories.remove(deleteTarget.id);
      setMessage("Category deleted.");
      setMessageTone("info");
      setDeleteTarget(null);
      await loadPageData();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to delete category.");
      setMessageTone("error");
    } finally {
      setIsDeleting(false);
    }
  }

  function updateCoarseGroup(key: string, patch: Partial<CategoryStrategyCoarse>) {
    setCoarseGroups((previous) =>
      previous.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry))
    );
    setStrategyDirty(true);
  }

  function reorderCoarseGroup(key: string, direction: "up" | "down") {
    setCoarseGroups((previous) => moveCoarseGroup(previous, key, direction));
    setStrategyDirty(true);
  }

  function addCoarseGroupDraft() {
    const created = createCoarseGroup(newGroupName, newGroupEmoji, coarseGroups);
    if (!created) {
      setMessage("Group name is required.");
      setMessageTone("error");
      return;
    }

    setCoarseGroups((previous) => sortCoarseGroups([...previous, created]));
    setNewGroupName("");
    setNewGroupEmoji("");
    setStrategyDirty(true);
    setMessage("Coarse group added. Save taxonomy to persist.");
    setMessageTone("info");
  }

  async function moveCategoryToGroup(category: Category, nextCoarseKey: string) {
    if (!nextCoarseKey || String(category.coarseKey || "") === nextCoarseKey) {
      return;
    }

    setMessage("");
    setMovingCategoryId(category.id);
    try {
      await api.categories.update(category.id, { coarseKey: nextCoarseKey });
      setCategories((previous) =>
        previous.map((entry) => (entry.id === category.id ? { ...entry, coarseKey: nextCoarseKey } : entry))
      );
      setGranularDraft((previous) => syncGranularAssignment(previous, category, nextCoarseKey));
      setMessage(`Moved ${category.name} to ${coarseLabelByKey.get(nextCoarseKey) || nextCoarseKey}.`);
      setMessageTone("info");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to update category group.");
      setMessageTone("error");
    } finally {
      setMovingCategoryId(null);
    }
  }

  async function saveTaxonomy() {
    setMessage("");
    setIsSavingStrategy(true);
    try {
      const normalizedCoarseGroups = sortCoarseGroups(coarseGroups);
      await api.categories.saveStrategy({
        coarseCategories: normalizedCoarseGroups,
        granularCategories: granularDraft
      });
      setMessage("Category taxonomy saved.");
      setMessageTone("info");
      setStrategyDirty(false);
      await loadPageData();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to save category taxonomy.");
      setMessageTone("error");
    } finally {
      setIsSavingStrategy(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="categories-page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Categories</h2>
          <p className="text-text-secondary">Manage category names, group assignments, and type mapping behavior.</p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          data-testid="categories-add"
          className={CATEGORY_PRIMARY_ACTION_CLASS}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add category
        </button>
      </header>

      {message ? (
        <StatusMessage tone={messageTone}>{message}</StatusMessage>
      ) : null}

      <section className={CATEGORY_SECTION_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Tags className="h-4 w-4 text-text-muted" aria-hidden="true" />
            Category catalog
          </h3>
          <span className="rounded-md border border-border-subtle bg-surface-field px-2 py-1 text-xs text-text-muted">
            {filteredCategories.length} / {categories.length} visible
          </span>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
          <label htmlFor="categories-query" className={CATEGORY_FIELD_LABEL_CLASS}>
            <span className="text-xs uppercase tracking-wide">Search</span>
            <div className="relative">
              <Search className={CATEGORY_FIELD_ICON_CLASS} aria-hidden="true" />
              <input
                id="categories-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search category, group, or type"
                data-testid="categories-query"
                className={CATEGORY_TEXT_FIELD_CLASS}
              />
            </div>
          </label>
          <label htmlFor="categories-group-filter" className={CATEGORY_FIELD_LABEL_CLASS}>
            <span className="text-xs uppercase tracking-wide">Group filter</span>
            <select
              id="categories-group-filter"
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
              data-testid="categories-group-filter"
              className={CATEGORY_SELECT_FIELD_CLASS}
            >
              <option value="all">All groups</option>
              {coarseGroups.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.emoji ? `${entry.emoji} ` : ""}{entry.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={CATEGORY_TABLE_WRAP_CLASS}>
          <table className={CATEGORY_TABLE_CLASS} data-testid="categories-table">
            <caption className="sr-only">Category list</caption>
            <thead className={CATEGORY_TABLE_HEAD_CLASS}>
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Category</th>
                <th scope="col" className="px-3 py-2 font-medium">Type</th>
                <th scope="col" className="px-3 py-2 font-medium">Group</th>
                <th scope="col" className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className={CATEGORY_TABLE_BODY_CLASS}>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className={CATEGORY_TABLE_EMPTY_CLASS}>
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Loading categories...
                    </span>
                  </td>
                </tr>
              ) : filteredCategories.length ? (
                filteredCategories.map((category) => (
                  <tr key={category.id} data-testid={`category-row-${category.id}`}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{category.emoji || "🏷️"}</span>
                        <div>
                          <p className={CATEGORY_TABLE_PRIMARY_TEXT_CLASS}>{category.name}</p>
                          {category.isSystem ? (
                            <p className={CATEGORY_TABLE_MUTED_TEXT_CLASS}>System category</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className={CATEGORY_TABLE_CELL_CLASS}>{categoryTypeLabel(category.type)}</td>
                    <td className={CATEGORY_TABLE_CELL_CLASS}>
                      {coarseLabelByKey.get(String(category.coarseKey || "")) || category.coarseKey || "Unassigned"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(category)}
                          data-testid={`category-edit-${category.id}`}
                          className={CATEGORY_ROW_ACTION_BUTTON_CLASS}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(category)}
                          disabled={category.isSystem}
                          data-testid={`category-delete-${category.id}`}
                          className={DANGER_INLINE_BUTTON_CLASS}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className={CATEGORY_TABLE_EMPTY_CLASS}>
                    No categories match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={CATEGORY_SECTION_CLASS} data-testid="taxonomy-management">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-text-secondary">Grouping &amp; taxonomy management</h3>
            <p className={CATEGORY_TAXONOMY_HELPER_CLASS}>
              Reorder and edit coarse groups, then save once to synchronize grouped list views and filters.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadPageData()}
              disabled={isSavingStrategy}
              data-testid="taxonomy-reset"
              className={CATEGORY_SECONDARY_ACTION_CLASS}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => void saveTaxonomy()}
              disabled={isSavingStrategy || !coarseGroups.length || !strategyDirty}
              data-testid="taxonomy-save"
              className={CATEGORY_ACCENT_ACTION_CLASS}
            >
              {isSavingStrategy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              Save taxonomy
            </button>
          </div>
        </div>

        <div className={CATEGORY_TABLE_WRAP_CLASS}>
          <table className={CATEGORY_TABLE_CLASS} data-testid="taxonomy-groups-table">
            <caption className="sr-only">Coarse group taxonomy editor</caption>
            <thead className={CATEGORY_TABLE_HEAD_CLASS}>
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Order</th>
                <th scope="col" className="px-3 py-2 font-medium">Emoji</th>
                <th scope="col" className="px-3 py-2 font-medium">Label</th>
                <th scope="col" className="px-3 py-2 font-medium">Excluded</th>
              </tr>
            </thead>
            <tbody className={CATEGORY_TABLE_BODY_CLASS}>
              {coarseGroups.map((entry, index) => (
                <tr key={entry.key}>
                  <td className="px-3 py-2">
                    <div className={CATEGORY_TAXONOMY_ORDER_WRAP_CLASS}>
                      <button
                        type="button"
                        onClick={() => reorderCoarseGroup(entry.key, "up")}
                        disabled={index === 0}
                        data-testid={`taxonomy-order-up-${entry.key}`}
                        aria-label={`Move ${entry.name} up`}
                        className={CATEGORY_TAXONOMY_ICON_BUTTON_CLASS}
                      >
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="min-w-5 text-center text-xs text-text-secondary">{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => reorderCoarseGroup(entry.key, "down")}
                        disabled={index === coarseGroups.length - 1}
                        data-testid={`taxonomy-order-down-${entry.key}`}
                        aria-label={`Move ${entry.name} down`}
                        className={CATEGORY_TAXONOMY_ICON_BUTTON_CLASS}
                      >
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <EmojiPicker
                      value={entry.emoji}
                      onChange={(emoji) => updateCoarseGroup(entry.key, { emoji })}
                      ariaLabel={`Emoji for ${entry.name}`}
                      triggerTestId={`taxonomy-emoji-trigger-${entry.key}`}
                      triggerClassName="w-28 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={entry.name}
                      onChange={(event) => updateCoarseGroup(entry.key, { name: event.target.value })}
                      aria-label={`Name for ${entry.key}`}
                      data-testid={`taxonomy-name-${entry.key}`}
                      className={CATEGORY_COMPACT_TEXT_FIELD_CLASS}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        checked={entry.isExcluded}
                        onChange={(event) => updateCoarseGroup(entry.key, { isExcluded: event.target.checked })}
                        data-testid={`taxonomy-excluded-${entry.key}`}
                        className={CATEGORY_CHECKBOX_CLASS}
                      />
                      Exclude from rollups
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className={CATEGORY_TAXONOMY_CARD_CLASS}>
            <h4 className="text-sm font-medium text-text-primary">Grouped category lists</h4>
            <p className={CATEGORY_TAXONOMY_HELPER_CLASS}>Reassign categories between groups to keep board and filters aligned.</p>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              {groupedBuckets.map((bucket) => (
                <article key={bucket.key} className={CATEGORY_TAXONOMY_BUCKET_CLASS} data-testid={`taxonomy-group-${bucket.key}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">
                      {bucket.emoji ? `${bucket.emoji} ` : ""}{bucket.name}
                    </p>
                    <span className="rounded-md border border-border-subtle bg-surface-field px-2 py-0.5 text-xs text-text-muted">
                      {bucket.count}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {bucket.items.length ? bucket.items.map((category) => (
                      <div key={category.id} className={CATEGORY_TAXONOMY_ITEM_CLASS}>
                        <span className="truncate text-xs text-text-secondary">
                          {category.emoji ? `${category.emoji} ` : ""}{category.name}
                        </span>
                        <select
                          value={String(category.coarseKey || "")}
                          onChange={(event) => void moveCategoryToGroup(category, event.target.value)}
                          disabled={movingCategoryId === category.id}
                          data-testid={`taxonomy-move-${category.id}`}
                          className={CATEGORY_COMPACT_SELECT_FIELD_CLASS}
                        >
                          {coarseGroups.map((entry) => (
                            <option key={entry.key} value={entry.key}>
                              {entry.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )) : (
                      <p className="rounded-md border border-dashed border-border-subtle px-2 py-3 text-xs text-text-muted">
                        No categories in this group.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className={CATEGORY_TAXONOMY_CARD_CLASS}>
            <h4 className="text-sm font-medium text-text-primary">Add coarse group</h4>
            <p className={CATEGORY_TAXONOMY_HELPER_CLASS}>
              Create custom taxonomy buckets and save to persist the new filter/group option.
            </p>
            <label className="mt-3 grid gap-1 text-xs text-text-muted">
              Group name
              <input
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                data-testid="taxonomy-new-group-name"
                className={CATEGORY_SELECT_FIELD_CLASS}
              />
            </label>
            <label className="mt-3 grid gap-1 text-xs text-text-muted">
              Emoji
              <EmojiPicker
                value={newGroupEmoji}
                onChange={setNewGroupEmoji}
                ariaLabel="Emoji for new group"
                triggerTestId="taxonomy-new-group-emoji-trigger"
                placeholder="Optional"
                triggerClassName="w-full"
              />
            </label>
            <button
              type="button"
              onClick={addCoarseGroupDraft}
              data-testid="taxonomy-add-group"
              className={`mt-3 ${CATEGORY_PRIMARY_ACTION_CLASS}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add group draft
            </button>
          </div>
        </div>
      </section>

      {modalOpen ? (
        <div
          className={MODAL_BACKDROP_CLASS}
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              closeModal();
            }
          }}
        >
          <div
            ref={categoryDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            data-testid="category-modal"
            tabIndex={-1}
            className={CATEGORY_MODAL_PANEL_CLASS}
          >
            <h3 id="category-modal-title" className={CATEGORY_MODAL_TITLE_CLASS}>
              {modalMode === "edit" ? "Edit category" : "Add category"}
            </h3>
            <p className={CATEGORY_MODAL_COPY_CLASS}>
              Configure required fields, type, and group assignment.
            </p>

            <form onSubmit={(event) => void submitCategory(event)} className="mt-4 space-y-4">
              <div>
                <label htmlFor="category-form-name" className={CATEGORY_MODAL_LABEL_CLASS}>
                  Category name
                </label>
                <input
                  ref={categoryNameInputRef}
                  id="category-form-name"
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  required
                  data-testid="category-form-name"
                  className={CATEGORY_MODAL_FIELD_CLASS}
                />
                {formErrors.name ? (
                  <p className={FORM_ERROR_CLASS} data-testid="category-form-error-name">{formErrors.name}</p>
                ) : null}
              </div>

              <div>
                <label className={CATEGORY_MODAL_LABEL_CLASS}>
                  Emoji
                </label>
                <EmojiPicker
                  value={draft.emoji}
                  onChange={(emoji) => updateDraft("emoji", emoji)}
                  ariaLabel="Category emoji"
                  placeholder="Optional (e.g. 🍽️)"
                  triggerTestId="category-form-emoji-trigger"
                  triggerClassName="mt-1 w-full"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="category-form-type" className={CATEGORY_MODAL_LABEL_CLASS}>
                    Category type
                  </label>
                  <select
                    id="category-form-type"
                    value={draft.type}
                    onChange={(event) => updateDraft("type", event.target.value)}
                    data-testid="category-form-type"
                    className={CATEGORY_MODAL_FIELD_CLASS}
                  >
                    <option value="">Not set</option>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                  </select>
                  {formErrors.type ? (
                    <p className={FORM_ERROR_CLASS} data-testid="category-form-error-type">{formErrors.type}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="category-form-group" className={CATEGORY_MODAL_LABEL_CLASS}>
                    Group
                  </label>
                  <select
                    id="category-form-group"
                    value={draft.coarseKey}
                    onChange={(event) => updateDraft("coarseKey", event.target.value)}
                    required
                    data-testid="category-form-group"
                    className={CATEGORY_MODAL_FIELD_CLASS}
                  >
                    {!coarseGroups.length ? <option value="">No groups available</option> : null}
                    {coarseGroups.map((entry) => (
                      <option key={entry.key} value={entry.key}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.coarseKey ? (
                    <p className={FORM_ERROR_CLASS} data-testid="category-form-error-group">{formErrors.coarseKey}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  data-testid="category-form-cancel"
                  className={CATEGORY_SECONDARY_ACTION_CLASS}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !coarseGroups.length}
                  data-testid="category-form-save"
                  className={CATEGORY_ACCENT_ACTION_CLASS}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {modalMode === "edit" ? "Save changes" : "Create category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className={MODAL_BACKDROP_CLASS}
          onClick={(event) => {
            if (event.currentTarget === event.target && !isDeleting) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            data-testid="category-delete-modal"
            tabIndex={-1}
            className={DELETE_DIALOG_CLASS}
          >
            <h3 id="delete-category-title" className={CATEGORY_MODAL_TITLE_CLASS}>
              Delete category?
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              This permanently removes <strong>{deleteTarget.name}</strong>. Existing references must be cleared before deletion.
            </p>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                ref={deleteCancelButtonRef}
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                data-testid="category-delete-cancel"
                className={CATEGORY_SECONDARY_ACTION_CLASS}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteCategory()}
                disabled={isDeleting}
                data-testid="category-delete-confirm"
                className={DANGER_CONFIRM_BUTTON_CLASS}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
