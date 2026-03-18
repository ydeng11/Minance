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
import type { Transaction } from "@/lib/api/types";
import { getHelpResources } from "@/components/help/helpResources";
import { SettingsMenu } from "@/components/settings/SettingsMenu";

export default function SettingsPage() {
  const api = useApi();
  const { user } = useSession();
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
        <h2 className="text-3xl font-semibold tracking-tight">Settings</h2>
        <p className="text-neutral-400">Self-host controls and integrations.</p>
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
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
    </div>
  );
}