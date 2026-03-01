"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type {
  Category,
  CategoryStrategyCoarse,
  CategoryStrategyGranular
} from "@/lib/api/types";
import { SettingsMenu } from "@/components/settings/SettingsMenu";

export default function SettingsPage() {
  const api = useApi();

  const [categories, setCategories] = useState<Category[]>([]);
  const [coarseDraft, setCoarseDraft] = useState<CategoryStrategyCoarse[]>([]);
  const [granularDraft, setGranularDraft] = useState<CategoryStrategyGranular[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("");
  const [newCategoryCoarseKey, setNewCategoryCoarseKey] = useState("");
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");
  const [message, setMessage] = useState("");

  async function loadSettings() {
    try {
      const [categoryData, strategyData] = await Promise.all([
        api.categories.list(),
        api.categories.getStrategy()
      ]);

      const nextCategories = categoryData.categories;
      setCategories(nextCategories);
      setRuleCategory(nextCategories[0]?.name || "");

      setCoarseDraft(strategyData.strategy.coarseCategories || []);
      setGranularDraft(strategyData.strategy.granularCategories || []);

      const defaultCoarse = strategyData.strategy.coarseCategories?.find((entry) => entry.key === "neutral")
        || strategyData.strategy.coarseCategories?.[0];
      setNewCategoryCoarseKey(defaultCoarse?.key || "");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to load settings.");
    }
  }

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addCategory() {
    if (!newCategory.trim()) {
      return;
    }

    try {
      await api.categories.add({
        name: newCategory.trim(),
        emoji: newCategoryEmoji.trim() || undefined,
        coarseKey: newCategoryCoarseKey || undefined
      });
      setNewCategory("");
      setNewCategoryEmoji("");
      setMessage("Category added.");
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to add category.");
    }
  }

  async function addRule() {
    if (!rulePattern.trim() || !ruleCategory) {
      setMessage("Rule pattern and category are required.");
      return;
    }

    try {
      await api.categories.addRule({
        pattern: rulePattern.trim(),
        category: ruleCategory,
        type: "contains"
      });
      setRulePattern("");
      setMessage("Rule added.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to add rule.");
    }
  }

  async function saveStrategy() {
    try {
      await api.categories.saveStrategy({
        coarseCategories: coarseDraft,
        granularCategories: granularDraft
      });
      setMessage("Category strategy saved.");
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to save strategy.");
    }
  }

  return (
    <div className="space-y-6" data-testid="settings-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Settings</h2>
        <p className="text-neutral-400">Manage taxonomy rules and category strategy configuration.</p>
      </header>

      <SettingsMenu />

      {message ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300" data-testid="global-message">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
        <h3 className="text-sm font-medium text-neutral-300">Taxonomy &amp; Rules</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_120px_180px_auto]">
          <label className="grid gap-1 text-sm text-neutral-300">
            New category
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              data-testid="new-category"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
            />
          </label>

          <label className="grid gap-1 text-sm text-neutral-300">
            Emoji
            <input
              value={newCategoryEmoji}
              onChange={(event) => setNewCategoryEmoji(event.target.value)}
              data-testid="new-category-emoji"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
            />
          </label>

          <label className="grid gap-1 text-sm text-neutral-300">
            Coarse bucket
            <select
              value={newCategoryCoarseKey}
              onChange={(event) => setNewCategoryCoarseKey(event.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
            >
              {coarseDraft.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.emoji} {entry.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => void addCategory()}
            data-testid="add-category"
            className="self-end rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200"
          >
            Add Category
          </button>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_220px_auto]">
          <label className="grid gap-1 text-sm text-neutral-300">
            Rule pattern
            <input
              value={rulePattern}
              onChange={(event) => setRulePattern(event.target.value)}
              data-testid="new-rule-pattern"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
            />
          </label>
          <label className="grid gap-1 text-sm text-neutral-300">
            Rule category
            <select
              value={ruleCategory}
              onChange={(event) => setRuleCategory(event.target.value)}
              data-testid="new-rule-category"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
            >
              {categories.map((entry) => (
                <option key={entry.id} value={entry.name}>
                  {entry.emoji ? `${entry.emoji} ` : ""}{entry.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void addRule()}
            data-testid="add-rule"
            className="self-end rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200"
          >
            Add Rule
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4" data-testid="category-strategy">
        <h3 className="text-sm font-medium text-neutral-300">Copilot Two-Category Strategy</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Defaults follow{" "}
          <a
            className="text-emerald-300 underline decoration-emerald-600 underline-offset-2"
            href="https://imgur.com/a/copilot-categorization-strategy-Ut9IGEv"
            target="_blank"
            rel="noreferrer"
          >
            Essential / Extra / Neutral / Other
          </a>
          . Edit bucket labels/emojis and granular mappings below.
        </p>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {coarseDraft.map((entry, index) => (
            <div key={entry.key} className="grid grid-cols-[110px_1fr] gap-2 rounded-lg border border-neutral-900 bg-neutral-950 p-2">
              <label className="grid gap-1 text-xs text-neutral-400">
                Emoji
                <input
                  value={entry.emoji}
                  onChange={(event) => {
                    const next = [...coarseDraft];
                    next[index] = {
                      ...entry,
                      emoji: event.target.value
                    };
                    setCoarseDraft(next);
                  }}
                  className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
                />
              </label>
              <label className="grid gap-1 text-xs text-neutral-400">
                Label
                <input
                  value={entry.name}
                  onChange={(event) => {
                    const next = [...coarseDraft];
                    next[index] = {
                      ...entry,
                      name: event.target.value
                    };
                    setCoarseDraft(next);
                  }}
                  className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
                />
              </label>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-neutral-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/70 text-neutral-400">
              <tr>
                <th className="px-3 py-2">Granular Category</th>
                <th className="px-3 py-2">Emoji</th>
                <th className="px-3 py-2">Coarse Bucket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {granularDraft.map((entry, index) => (
                <tr key={`${entry.name}-${index}`}>
                  <td className="px-3 py-2 text-neutral-200">{entry.name}</td>
                  <td className="px-3 py-2">
                    <input
                      value={entry.emoji}
                      onChange={(event) => {
                        const next = [...granularDraft];
                        next[index] = {
                          ...entry,
                          emoji: event.target.value
                        };
                        setGranularDraft(next);
                      }}
                      className="w-20 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={entry.coarseKey}
                      onChange={(event) => {
                        const next = [...granularDraft];
                        next[index] = {
                          ...entry,
                          coarseKey: event.target.value
                        };
                        setGranularDraft(next);
                      }}
                      className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"
                    >
                      {coarseDraft.map((coarse) => (
                        <option key={coarse.key} value={coarse.key}>
                          {coarse.emoji} {coarse.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => void saveStrategy()}
            data-testid="save-category-strategy"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
          >
            Save Strategy
          </button>
        </div>
      </section>
    </div>
  );
}
