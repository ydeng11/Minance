"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Save, Search, Tags, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { Category, CategoryStrategyCoarse, CategoryStrategyGranular } from "@/lib/api/types";
import { EmojiPicker } from "@/components/EmojiPicker";
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

type MessageTone = "info" | "error";
type ModalMode = "create" | "edit";

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

function messageClasses(tone: MessageTone) {
  if (tone === "error") {
    return "border-rose-700 bg-rose-950/40 text-rose-200";
  }
  return "border-neutral-800 bg-neutral-900/60 text-neutral-300";
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
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [strategyDirty, setStrategyDirty] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupEmoji, setNewGroupEmoji] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryFormDraft>(() => createDefaultCategoryDraft(""));
  const [formErrors, setFormErrors] = useState<CategoryFormErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

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
          <p className="text-neutral-400">Manage category names, group assignments, and type mapping behavior.</p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          data-testid="categories-add"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:border-emerald-500/40 hover:text-emerald-300"
        >
          <Plus className="h-4 w-4" />
          Add category
        </button>
      </header>

      {message ? (
        <p className={`rounded-lg border px-3 py-2 text-sm ${messageClasses(messageTone)}`} data-testid="global-message">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-2 text-sm font-medium text-neutral-300">
            <Tags className="h-4 w-4 text-neutral-400" />
            Category catalog
          </h3>
          <span className="rounded-md border border-neutral-800 bg-neutral-900/70 px-2 py-1 text-xs text-neutral-400">
            {filteredCategories.length} / {categories.length} visible
          </span>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
          <label htmlFor="categories-query" className="grid gap-1 text-neutral-400">
            <span className="text-xs uppercase tracking-wide">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                id="categories-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search category, group, or type"
                data-testid="categories-query"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2 pl-9 pr-3 text-sm text-neutral-100 placeholder:text-neutral-400 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/40"
              />
            </div>
          </label>
          <label htmlFor="categories-group-filter" className="grid gap-1 text-neutral-400">
            <span className="text-xs uppercase tracking-wide">Group filter</span>
            <select
              id="categories-group-filter"
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
              data-testid="categories-group-filter"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/40"
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

        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-800 text-sm" data-testid="categories-table">
            <caption className="sr-only">Category list</caption>
            <thead className="bg-neutral-900/70 text-left text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Category</th>
                <th scope="col" className="px-3 py-2 font-medium">Type</th>
                <th scope="col" className="px-3 py-2 font-medium">Group</th>
                <th scope="col" className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 bg-neutral-950/20 text-neutral-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-neutral-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
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
                          <p className="font-medium text-neutral-100">{category.name}</p>
                          {category.isSystem ? (
                            <p className="text-xs text-neutral-500">System category</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-neutral-300">{categoryTypeLabel(category.type)}</td>
                    <td className="px-3 py-3 text-neutral-300">
                      {coarseLabelByKey.get(String(category.coarseKey || "")) || category.coarseKey || "Unassigned"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(category)}
                          data-testid={`category-edit-${category.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:border-emerald-500/40 hover:text-emerald-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(category)}
                          disabled={category.isSystem}
                          data-testid={`category-delete-${category.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-800/60 bg-rose-950/20 px-2 py-1 text-xs text-rose-200 transition hover:border-rose-700 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-neutral-400">
                    No categories match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4" data-testid="taxonomy-management">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-neutral-300">Grouping &amp; taxonomy management</h3>
            <p className="mt-1 text-xs text-neutral-400">
              Reorder and edit coarse groups, then save once to synchronize grouped list views and filters.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadPageData()}
              disabled={isSavingStrategy}
              data-testid="taxonomy-reset"
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => void saveTaxonomy()}
              disabled={isSavingStrategy || !coarseGroups.length || !strategyDirty}
              data-testid="taxonomy-save"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/60 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-200 transition hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingStrategy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save taxonomy
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-800 text-sm" data-testid="taxonomy-groups-table">
            <caption className="sr-only">Coarse group taxonomy editor</caption>
            <thead className="bg-neutral-900/70 text-left text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Order</th>
                <th scope="col" className="px-3 py-2 font-medium">Emoji</th>
                <th scope="col" className="px-3 py-2 font-medium">Label</th>
                <th scope="col" className="px-3 py-2 font-medium">Excluded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 bg-neutral-950/20 text-neutral-200">
              {coarseGroups.map((entry, index) => (
                <tr key={entry.key}>
                  <td className="px-3 py-2">
                    <div className="inline-flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-900/70 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => reorderCoarseGroup(entry.key, "up")}
                        disabled={index === 0}
                        data-testid={`taxonomy-order-up-${entry.key}`}
                        className="rounded p-1 text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-600"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-5 text-center text-xs text-neutral-300">{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => reorderCoarseGroup(entry.key, "down")}
                        disabled={index === coarseGroups.length - 1}
                        data-testid={`taxonomy-order-down-${entry.key}`}
                        className="rounded p-1 text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-600"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
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
                      className="w-full min-w-48 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100 outline-none transition focus:border-emerald-400"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-xs text-neutral-300">
                      <input
                        type="checkbox"
                        checked={entry.isExcluded}
                        onChange={(event) => updateCoarseGroup(entry.key, { isExcluded: event.target.checked })}
                        data-testid={`taxonomy-excluded-${entry.key}`}
                        className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-emerald-400 focus:ring-emerald-500/50"
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
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-3">
            <h4 className="text-sm font-medium text-neutral-200">Grouped category lists</h4>
            <p className="mt-1 text-xs text-neutral-400">Reassign categories between groups to keep board and filters aligned.</p>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              {groupedBuckets.map((bucket) => (
                <article key={bucket.key} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3" data-testid={`taxonomy-group-${bucket.key}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-100">
                      {bucket.emoji ? `${bucket.emoji} ` : ""}{bucket.name}
                    </p>
                    <span className="rounded-md border border-neutral-800 bg-neutral-900/70 px-2 py-0.5 text-xs text-neutral-400">
                      {bucket.count}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {bucket.items.length ? bucket.items.map((category) => (
                      <div key={category.id} className="grid grid-cols-[1fr_130px] items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/40 px-2 py-1.5">
                        <span className="truncate text-xs text-neutral-200">
                          {category.emoji ? `${category.emoji} ` : ""}{category.name}
                        </span>
                        <select
                          value={String(category.coarseKey || "")}
                          onChange={(event) => void moveCategoryToGroup(category, event.target.value)}
                          disabled={movingCategoryId === category.id}
                          data-testid={`taxonomy-move-${category.id}`}
                          className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 outline-none transition focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {coarseGroups.map((entry) => (
                            <option key={entry.key} value={entry.key}>
                              {entry.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )) : (
                      <p className="rounded-md border border-dashed border-neutral-800 px-2 py-3 text-xs text-neutral-500">
                        No categories in this group.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-3">
            <h4 className="text-sm font-medium text-neutral-200">Add coarse group</h4>
            <p className="mt-1 text-xs text-neutral-400">
              Create custom taxonomy buckets and save to persist the new filter/group option.
            </p>
            <label className="mt-3 grid gap-1 text-xs text-neutral-400">
              Group name
              <input
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                data-testid="taxonomy-new-group-name"
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-emerald-400"
              />
            </label>
            <label className="mt-3 grid gap-1 text-xs text-neutral-400">
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
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 transition hover:border-emerald-500/50 hover:text-emerald-200"
            >
              <Plus className="h-4 w-4" />
              Add group draft
            </button>
          </div>
        </div>
      </section>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            data-testid="category-modal"
            className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl"
          >
            <h3 id="category-modal-title" className="text-lg font-semibold text-neutral-100">
              {modalMode === "edit" ? "Edit category" : "Add category"}
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              Configure required fields, type, and group assignment.
            </p>

            <form onSubmit={(event) => void submitCategory(event)} className="mt-4 space-y-4">
              <div>
                <label htmlFor="category-form-name" className="block text-xs uppercase tracking-wide text-neutral-400">
                  Category name
                </label>
                <input
                  id="category-form-name"
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  required
                  autoFocus
                  data-testid="category-form-name"
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/40"
                />
                {formErrors.name ? (
                  <p className="mt-1 text-xs text-rose-300" data-testid="category-form-error-name">{formErrors.name}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-neutral-400">
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
                  <label htmlFor="category-form-type" className="block text-xs uppercase tracking-wide text-neutral-400">
                    Category type
                  </label>
                  <select
                    id="category-form-type"
                    value={draft.type}
                    onChange={(event) => updateDraft("type", event.target.value)}
                    data-testid="category-form-type"
                    className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/40"
                  >
                    <option value="">Not set</option>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                  </select>
                  {formErrors.type ? (
                    <p className="mt-1 text-xs text-rose-300" data-testid="category-form-error-type">{formErrors.type}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="category-form-group" className="block text-xs uppercase tracking-wide text-neutral-400">
                    Group
                  </label>
                  <select
                    id="category-form-group"
                    value={draft.coarseKey}
                    onChange={(event) => updateDraft("coarseKey", event.target.value)}
                    required
                    data-testid="category-form-group"
                    className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/40"
                  >
                    {!coarseGroups.length ? <option value="">No groups available</option> : null}
                    {coarseGroups.map((entry) => (
                      <option key={entry.key} value={entry.key}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.coarseKey ? (
                    <p className="mt-1 text-xs text-rose-300" data-testid="category-form-error-group">{formErrors.coarseKey}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  data-testid="category-form-cancel"
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !coarseGroups.length}
                  data-testid="category-form-save"
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/60 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-200 transition hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {modalMode === "edit" ? "Save changes" : "Create category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={(event) => {
            if (event.currentTarget === event.target && !isDeleting) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            data-testid="category-delete-modal"
            className="w-full max-w-lg rounded-2xl border border-rose-900/70 bg-neutral-950 p-5 shadow-2xl"
          >
            <h3 id="delete-category-title" className="text-lg font-semibold text-neutral-100">
              Delete category?
            </h3>
            <p className="mt-2 text-sm text-neutral-300">
              This permanently removes <strong>{deleteTarget.name}</strong>. Existing references must be cleared before deletion.
            </p>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                data-testid="category-delete-cancel"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteCategory()}
                disabled={isDeleting}
                data-testid="category-delete-confirm"
                className="inline-flex items-center gap-2 rounded-lg border border-rose-700/70 bg-rose-900/30 px-3 py-2 text-sm text-rose-200 transition hover:border-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
