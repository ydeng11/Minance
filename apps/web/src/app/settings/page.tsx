"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { Category } from "@/lib/api/types";
import { SettingsMenu } from "@/components/settings/SettingsMenu";

export default function SettingsPage() {
  const api = useApi();

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");
  const [message, setMessage] = useState("");

  async function loadCategories() {
    try {
      const categoryData = await api.categories.list();
      setCategories(categoryData.categories);
      setRuleCategory(categoryData.categories[0]?.name || "");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to load settings.");
    }
  }

  useEffect(() => {
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addCategory() {
    if (!newCategory.trim()) {
      return;
    }

    try {
      await api.categories.add(newCategory.trim());
      setNewCategory("");
      setMessage("Category added.");
      await loadCategories();
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

  return (
    <div className="space-y-6" data-testid="settings-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Settings</h2>
        <p className="text-neutral-400">Manage taxonomy rules and app configuration.</p>
      </header>

      <SettingsMenu />

      {message ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300" data-testid="global-message">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
        <h3 className="text-sm font-medium text-neutral-300">Taxonomy &amp; Rules</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-sm text-neutral-300">
            New category
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              data-testid="new-category"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
            />
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
                  {entry.name}
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
    </div>
  );
}
