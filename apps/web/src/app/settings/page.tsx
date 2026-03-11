"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Download,
  FileSpreadsheet,
  LifeBuoy,
  Loader2,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import { useSession } from "@/lib/session";
import { EmojiPicker } from "@/components/EmojiPicker";
import type {
  Category,
  CategoryStrategyCoarse,
  CategoryStrategyGranular,
  StorageStatusResponse,
  Transaction
} from "@/lib/api/types";
import { getHelpResources } from "@/components/help/helpResources";
import { SettingsMenu } from "@/components/settings/SettingsMenu";

function emojiFieldTestKey(value: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "item";
}

export default function SettingsPage() {
  const api = useApi();
  const { user } = useSession();
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "local";
  const helpResources = useMemo(() => getHelpResources(), []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [coarseDraft, setCoarseDraft] = useState<CategoryStrategyCoarse[]>([]);
  const [granularDraft, setGranularDraft] = useState<CategoryStrategyGranular[]>([]);
  const [storageStatus, setStorageStatus] = useState<StorageStatusResponse["storage"] | null>(null);

  const [newCategory, setNewCategory] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("");
  const [newCategoryCoarseKey, setNewCategoryCoarseKey] = useState("");
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSettings() {
    try {
      const [categoryData, strategyData, storageData] = await Promise.all([
        api.categories.list(),
        api.categories.getStrategy(),
        api.system.storage().catch(() => null)
      ]);

      const nextCategories = categoryData.categories;
      setCategories(nextCategories);
      setRuleCategory(nextCategories[0]?.name || "");

      setCoarseDraft(strategyData.strategy.coarseCategories || []);
      setGranularDraft(strategyData.strategy.granularCategories || []);

      const defaultCoarse = strategyData.strategy.coarseCategories?.find((entry) => entry.key === "neutral")
        || strategyData.strategy.coarseCategories?.[0];
      setNewCategoryCoarseKey(defaultCoarse?.key || "");
      setStorageStatus(storageData?.storage || null);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to load settings.");
    }
  }

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function listAllTransactions() {
    const pageSize = 250;
    const all: Transaction[] = [];
    let offset = 0;

    for (let page = 0; page < 100; page += 1) {
      const response = await api.transactions.list({ limit: pageSize, offset });
      all.push(...response.items);

      offset += response.items.length;
      if (!response.items.length || offset >= response.total || response.items.length < pageSize) {
        break;
      }
    }

    return all;
  }

  function downloadExportBundle(payload: unknown) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `minance-export-${timestamp}.json`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  async function exportDataSnapshot() {
    setIsExporting(true);
    setMessage("");

    try {
      const [categoryData, strategyData, importsData, savedViewsData, credentialData, transactions] =
        await Promise.all([
          api.categories.list(),
          api.categories.getStrategy(),
          api.imports.list(),
          api.savedViews.list(),
          api.ai.credentials(),
          listAllTransactions()
        ]);

      downloadExportBundle({
        exportedAt: new Date().toISOString(),
        environment: appEnv,
        user: {
          id: user?.id || null,
          email: user?.email || null
        },
        storage: storageStatus,
        nonSaasFallbacks: {
          bankAggregation: "csv_or_manual_import",
          subscriptionFeatures: "not_required_for_self_host"
        },
        datasets: {
          categories: categoryData.categories,
          categoryStrategy: strategyData.strategy,
          transactions,
          imports: importsData.imports,
          savedViews: savedViewsData.items,
          aiPreferences: credentialData.preferences,
          aiCredentialsMasked: credentialData.credentials
        }
      });

      setMessage(`Export completed (${transactions.length} transactions).`);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to export settings data.");
    } finally {
      setIsExporting(false);
    }
  }

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
        <p className="text-neutral-400">Self-host controls, integrations, and taxonomy configuration.</p>
      </header>

      <SettingsMenu />

      {message ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300" data-testid="global-message">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4" data-testid="settings-section-map">
        <h3 className="text-sm font-medium text-neutral-300">Section Map</h3>
        <p className="mt-1 text-xs text-neutral-400">
          This workspace defaults to self-host behavior and keeps SaaS-only surfaces optional.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <a
            href="#settings-data-controls"
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-900"
          >
            Data import/export
            <ArrowRight className="h-4 w-4 text-neutral-400" />
          </a>
          <a
            href="#settings-integrations"
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-900"
          >
            Integrations
            <ArrowRight className="h-4 w-4 text-neutral-400" />
          </a>
          <a
            href="#settings-profile-prefs"
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-900"
          >
            Profile &amp; preferences
            <ArrowRight className="h-4 w-4 text-neutral-400" />
          </a>
          <a
            href="#settings-taxonomy-rules"
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-900"
          >
            Taxonomy &amp; rules
            <ArrowRight className="h-4 w-4 text-neutral-400" />
          </a>
        </div>
      </section>

      <section id="settings-data-controls" className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4" data-testid="settings-data-controls">
        <h3 className="text-sm font-medium text-neutral-300">Data Controls</h3>
        <p className="mt-1 text-xs text-neutral-400">
          Default ingestion is CSV/manual import. Export produces a local JSON snapshot with masked credentials.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/import"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
            data-testid="settings-import-open"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Open CSV Import
          </Link>

          <button
            type="button"
            onClick={() => void exportDataSnapshot()}
            disabled={isExporting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="settings-export-snapshot"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Snapshot
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-neutral-900 bg-neutral-950 p-3 text-xs text-neutral-400">
          <p>
            Hosted bank connectors are intentionally optional. If they are not configured, keep using CSV/manual import
            workflows.
          </p>
        </div>
      </section>

      <section id="settings-integrations" className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4" data-testid="settings-integrations">
        <h3 className="text-sm font-medium text-neutral-300">Integrations</h3>
        <p className="mt-1 text-xs text-neutral-400">
          AI and support channels are operator-configurable; no subscription service is required.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link
            href="/settings/ai"
            className="inline-flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-900"
            data-testid="settings-ai-settings-link"
          >
            <span className="inline-flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-400" />
              AI provider settings (BYOK)
            </span>
            <ArrowRight className="h-4 w-4 text-neutral-400" />
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-900"
            data-testid="settings-help-link"
          >
            <span className="inline-flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-emerald-400" />
              Help &amp; support links
            </span>
            <ArrowRight className="h-4 w-4 text-neutral-400" />
          </Link>
        </div>

        <div className="mt-3 rounded-lg border border-neutral-900 bg-neutral-950 p-3 text-xs text-neutral-400">
          {helpResources.supportConfigured ? (
            <p>Hosted support endpoints are configured for this deployment.</p>
          ) : (
            <p>No hosted support endpoint configured; local help docs are used as the default fallback.</p>
          )}
        </div>
      </section>

      <section id="settings-profile-prefs" className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4" data-testid="settings-profile-prefs">
        <h3 className="text-sm font-medium text-neutral-300">Profile &amp; Preferences</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-3">
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-neutral-400">
              <UserRound className="h-3.5 w-3.5" />
              Account
            </p>
            <p className="mt-1 text-sm text-neutral-200">{user?.email || "Unknown user"}</p>
          </div>
          <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Environment</p>
            <p className="mt-1 text-sm text-neutral-200">{appEnv}</p>
          </div>
          <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-3">
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-neutral-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Storage backend
            </p>
            <p className="mt-1 text-sm text-neutral-200">
              {storageStatus?.backend ? `${storageStatus.backend}` : "Unavailable"}
            </p>
          </div>
        </div>
      </section>

      <section id="settings-taxonomy-rules" className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
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
            <EmojiPicker
              value={newCategoryEmoji}
              onChange={setNewCategoryEmoji}
              ariaLabel="Emoji for new category"
              triggerTestId="settings-new-category-emoji-trigger"
              triggerClassName="w-full"
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
        <p className="mt-1 text-xs text-neutral-400">
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
            <div key={entry.key} className="grid grid-cols-[150px_1fr] gap-2 rounded-lg border border-neutral-900 bg-neutral-950 p-2">
              <label className="grid gap-1 text-xs text-neutral-400">
                Emoji
                <EmojiPicker
                  value={entry.emoji}
                  onChange={(emoji) => {
                    const next = [...coarseDraft];
                    next[index] = {
                      ...entry,
                      emoji
                    };
                    setCoarseDraft(next);
                  }}
                  ariaLabel={`Emoji for ${entry.name}`}
                  triggerTestId={`settings-strategy-coarse-emoji-trigger-${entry.key}`}
                  triggerClassName="w-full"
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
            <caption className="sr-only">Granular category strategy mapping</caption>
            <thead className="bg-neutral-900/70 text-neutral-400">
              <tr>
                <th scope="col" className="px-3 py-2">Granular Category</th>
                <th scope="col" className="px-3 py-2">Emoji</th>
                <th scope="col" className="px-3 py-2">Coarse Bucket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {granularDraft.map((entry, index) => (
                <tr key={`${entry.name}-${index}`}>
                  <td className="px-3 py-2 text-neutral-200">{entry.name}</td>
                  <td className="px-3 py-2">
                    <EmojiPicker
                      value={entry.emoji}
                      ariaLabel={`Emoji for ${entry.name}`}
                      triggerTestId={`settings-strategy-granular-emoji-trigger-${emojiFieldTestKey(entry.name)}`}
                      onChange={(emoji) => {
                        const next = [...granularDraft];
                        next[index] = {
                          ...entry,
                          emoji
                        };
                        setGranularDraft(next);
                      }}
                      triggerClassName="w-28 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={entry.coarseKey}
                      aria-label={`Coarse bucket for ${entry.name}`}
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
