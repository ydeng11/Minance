"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Download,
  FileSpreadsheet,
  LifeBuoy,
  Loader2
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import { useSession } from "@/lib/session";
import { useAppTheme } from "@/components/providers/ThemeProvider";
import type { AppTheme } from "@/lib/theme";
import type { Transaction } from "@/lib/api/types";
import { getHelpResources } from "@/components/help/helpResources";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import { SettingsMenu } from "@/components/settings/SettingsMenu";

const SETTINGS_SECTION_CLASS_NAME =
  "rounded-[24px] border border-border-subtle bg-surface-panel/85 p-4 shadow-panel";

const SETTINGS_ACTION_CARD_CLASS_NAME =
  "flex items-center justify-between rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-sm text-text-primary transition hover:bg-surface-elevated";

const THEME_OPTIONS: Array<{ value: AppTheme; label: string; description: string; testId: string }> = [
  {
    value: "dark",
    label: "Dark",
    description: "High-contrast editorial shell with deep surfaces.",
    testId: "settings-theme-dark"
  },
  {
    value: "light",
    label: "Light",
    description: "Paper-like workspace with brighter panels and softer shadows.",
    testId: "settings-theme-light"
  }
];

export default function SettingsPage() {
  const api = useApi();
  const { user } = useSession();
  const { theme, setTheme } = useAppTheme();
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "local";
  const helpResources = useMemo(() => getHelpResources(), []);

  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState("");

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

  return (
    <div className="space-y-6" data-testid="settings-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Settings</h2>
        <p className="text-text-secondary">Self-host controls, appearance, and integrations.</p>
      </header>

      <SettingsMenu />

      {message ? (
        <StatusMessage>{message}</StatusMessage>
      ) : null}

      <section className={SETTINGS_SECTION_CLASS_NAME} data-testid="settings-appearance">
        <h3 className="text-sm font-medium text-text-primary">Appearance</h3>
        <p className="mt-1 text-xs text-text-secondary">
          Choose the workspace palette that fits your environment. Your selection is stored locally in this browser.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {THEME_OPTIONS.map((option) => {
            const isActive = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                data-testid={option.testId}
                aria-pressed={isActive}
                className={`rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ${
                  isActive
                    ? "border-accent/35 bg-accent-soft text-accent"
                    : "border-border-subtle bg-surface-field text-text-primary hover:bg-surface-elevated"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${isActive ? "text-accent" : "text-text-muted"}`}>
                    {isActive ? "Active" : "Available"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{option.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className={SETTINGS_SECTION_CLASS_NAME} data-testid="settings-section-map">
        <h3 className="text-sm font-medium text-text-primary">Section Map</h3>
        <p className="mt-1 text-xs text-text-secondary">
          This workspace defaults to self-host behavior and keeps SaaS-only surfaces optional.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <a
            href="#settings-data-controls"
            className={SETTINGS_ACTION_CARD_CLASS_NAME}
          >
            Data import/export
            <ArrowRight className="h-4 w-4 text-text-muted" />
          </a>
          <a
            href="#settings-integrations"
            className={SETTINGS_ACTION_CARD_CLASS_NAME}
          >
            Integrations
            <ArrowRight className="h-4 w-4 text-text-muted" />
          </a>
        </div>
      </section>

      <section id="settings-data-controls" className={SETTINGS_SECTION_CLASS_NAME} data-testid="settings-data-controls">
        <h3 className="text-sm font-medium text-text-primary">Data Controls</h3>
        <p className="mt-1 text-xs text-text-secondary">
          Default ingestion is CSV/manual import. Export produces a local JSON snapshot with masked credentials.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/import"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-field px-4 py-2 text-sm text-text-primary transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            data-testid="settings-import-open"
          >
            <FileSpreadsheet className="h-4 w-4 text-accent" aria-hidden="true" />
            Open CSV Import
          </Link>

          <button
            type="button"
            onClick={() => void exportDataSnapshot()}
            disabled={isExporting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent/35 bg-accent-soft px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="settings-export-snapshot"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            Export Snapshot
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-border-subtle bg-surface-field p-3 text-xs text-text-secondary">
          <p>
            Hosted bank connectors are intentionally optional. If they are not configured, keep using CSV/manual import
            workflows.
          </p>
        </div>
      </section>

      <section id="settings-integrations" className={SETTINGS_SECTION_CLASS_NAME} data-testid="settings-integrations">
        <h3 className="text-sm font-medium text-text-primary">Integrations</h3>
        <p className="mt-1 text-xs text-text-secondary">
          AI and support channels are operator-configurable; no subscription service is required.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link
            href="/settings/ai"
            className={SETTINGS_ACTION_CARD_CLASS_NAME}
            data-testid="settings-ai-settings-link"
          >
            <span className="inline-flex items-center gap-2">
              <Bot className="h-4 w-4 text-accent" />
              AI provider settings (BYOK)
            </span>
            <ArrowRight className="h-4 w-4 text-text-muted" />
          </Link>
          <Link
            href="/help"
            className={SETTINGS_ACTION_CARD_CLASS_NAME}
            data-testid="settings-help-link"
          >
            <span className="inline-flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-accent" />
              Help &amp; support links
            </span>
            <ArrowRight className="h-4 w-4 text-text-muted" />
          </Link>
        </div>

        <div className="mt-3 rounded-lg border border-border-subtle bg-surface-field p-3 text-xs text-text-secondary">
          {helpResources.supportConfigured ? (
            <p>Hosted support endpoints are configured for this deployment.</p>
          ) : (
            <p>No hosted support endpoint configured; local help docs are used as the default fallback.</p>
          )}
        </div>
      </section>
    </div>
  );
}
