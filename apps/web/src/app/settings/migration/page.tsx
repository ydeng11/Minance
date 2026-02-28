"use client";

import { useState } from "react";
import { DatabaseZap, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import { readFileAsBase64 } from "@/lib/utils";
import { SettingsMenu } from "@/components/settings/SettingsMenu";

export default function MigrationSettingsPage() {
  const api = useApi();

  const [migrationPath, setMigrationPath] = useState("");
  const [migrationFile, setMigrationFile] = useState<File | null>(null);
  const [migrationReport, setMigrationReport] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function runMigration() {
    if (!migrationPath.trim() && !migrationFile) {
      setMessage("Select a migration file or provide a server path.");
      return;
    }

    setIsRunning(true);
    setMessage("");

    try {
      if (migrationPath.trim()) {
        const result = await api.migration.run({ sqlitePath: migrationPath.trim() });
        setMigrationReport(JSON.stringify(result.migration.report, null, 2));
      } else if (migrationFile) {
        const sqliteBase64 = await readFileAsBase64(migrationFile);
        const result = await api.migration.run({
          fileName: migrationFile.name,
          sqliteBase64
        });
        setMigrationReport(JSON.stringify(result.migration.report, null, 2));
      }

      setMessage("Migration completed.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Migration failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="migration-settings-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Migration</h2>
        <p className="text-neutral-400">Import legacy Minance SQLite data into this workspace.</p>
      </header>

      <SettingsMenu />

      {message ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300" data-testid="global-message">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
          <DatabaseZap className="h-4 w-4 text-emerald-400" />
          Legacy Minance Migration
        </h3>

        <div className="mt-3 grid gap-2">
          <label className="grid gap-1 text-sm text-neutral-300">
            Upload legacy data.db
            <input
              type="file"
              accept=".db,.sqlite,.sqlite3"
              onChange={(event) => setMigrationFile(event.target.files?.[0] || null)}
              data-testid="migration-file"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
            />
          </label>

          <label className="grid gap-1 text-sm text-neutral-300">
            or Server path
            <input
              value={migrationPath}
              onChange={(event) => setMigrationPath(event.target.value)}
              data-testid="migration-path"
              placeholder="/absolute/path/to/data.db"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
            />
          </label>

          <button
            type="button"
            onClick={() => void runMigration()}
            data-testid="run-migration"
            disabled={isRunning}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Run Migration
          </button>

          <pre
            className="max-h-60 overflow-auto rounded-lg border border-neutral-900 bg-neutral-950 p-2 text-xs text-emerald-100"
            data-testid="migration-report"
          >
            {migrationReport}
          </pre>
        </div>
      </section>
    </div>
  );
}
