"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Database,
  Download,
  HardDrive,
  Loader2,
  Upload
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { DatabaseBackupSummary } from "@/lib/api/types";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import { SettingsMenu } from "@/components/settings/SettingsMenu";

const SETTINGS_SECTION_CLASS_NAME =
  "rounded-[24px] border border-border-subtle bg-surface-panel/85 p-4 shadow-panel";

export default function SettingsPage() {
  const api = useApi();

  // Backup state
  const [backups, setBackups] = useState<DatabaseBackupSummary[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [isUploadingBackup, setIsUploadingBackup] = useState(false);
  const [backupsListExpanded, setBackupsListExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function fetchBackups() {
    setIsLoadingBackups(true);
    setBackupMessage("");
    try {
      const response = await api.system.listBackups();
      setBackups(response.backups || []);
    } catch (error) {
      setBackupMessage(error instanceof ApiError ? error.message : "Failed to load backups.");
    } finally {
      setIsLoadingBackups(false);
    }
  }

  async function createServerBackup() {
    setIsCreatingBackup(true);
    setBackupMessage("");
    try {
      const response = await api.system.createBackup();
      setBackups((prev) => [response.backup, ...prev]);
      setBackupMessage(`Backup created: ${response.backup.id}`);
    } catch (error) {
      setBackupMessage(error instanceof ApiError ? error.message : "Failed to create backup.");
    } finally {
      setIsCreatingBackup(false);
    }
  }

  async function exportBackupArchive(backupId: string) {
    setBackupMessage("");
    try {
      const blob = await api.system.exportBackupArchive(backupId);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `minance-backup-${backupId}.tar.gz`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setBackupMessage("Backup archive downloaded.");
    } catch (error) {
      setBackupMessage(error instanceof ApiError ? error.message : "Failed to export backup.");
    }
  }

  function resetBackupSelection() {
    setSelectedBackupId(null);
    setConfirmText("");
  }

  async function restoreFromBackup() {
    if (!selectedBackupId || confirmText !== selectedBackupId) return;
    setIsRestoring(true);
    setBackupMessage("");
    try {
      const response = await api.system.restoreBackup(selectedBackupId, confirmText);
      resetBackupSelection();
      await fetchBackups();
      setBackupMessage(
        response.currentSessionStillExists
          ? `Backup restored (id: ${response.backupId}). Reload the page to see changes.`
          : "Backup restored. Your session has changed — please log in again."
      );
    } catch (error) {
      setBackupMessage(error instanceof ApiError ? error.message : "Failed to restore backup.");
    } finally {
      setIsRestoring(false);
    }
  }

  async function handleBackupFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingBackup(true);
    setBackupMessage("");
    try {
      const response = await api.system.importBackupArchive(file);
      await fetchBackups();
      setBackupMessage(`Backup imported: ${response.backup.id}`);
    } catch (error) {
      setBackupMessage(error instanceof ApiError ? error.message : "Failed to import backup.");
    } finally {
      setIsUploadingBackup(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  }

  // Fetch backups on mount
  useEffect(() => {
    void fetchBackups();
  }, []);

  return (
    <div className="space-y-6" data-testid="settings-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Settings</h2>
        <p className="text-text-secondary">Self-host data controls and AI configuration.</p>
      </header>

      <SettingsMenu />

      <section id="settings-data-controls" className={SETTINGS_SECTION_CLASS_NAME} data-testid="settings-data-controls">
        <h3 className="text-sm font-medium text-text-primary">Data Controls</h3>
        <div className="mt-3">
          <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-accent" aria-hidden="true" />
            Database backups
          </h4>
          <p className="mt-1 text-xs text-text-secondary">
            Server-side database backups, export, and reload. Requires sqlite3 CLI on the server.
          </p>

          {backupMessage ? (
            <div className="mt-2">
              <StatusMessage key={backupMessage}>{backupMessage}</StatusMessage>
            </div>
          ) : null}

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => void createServerBackup()}
              disabled={isCreatingBackup}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent/35 bg-accent-soft px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="settings-backup-create"
            >
              {isCreatingBackup ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Database className="h-4 w-4" aria-hidden="true" />}
              Create Backup
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingBackup}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-field px-4 py-2 text-sm text-text-primary transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60"
              data-testid="settings-backup-upload"
            >
              {isUploadingBackup ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4 text-text-muted" aria-hidden="true" />}
              Upload Backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tar.gz,application/gzip,application/x-gzip"
              onChange={(e) => void handleBackupFileUpload(e)}
              className="hidden"
              data-testid="settings-backup-upload-input"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept=".tar.gz,application/gzip,application/x-gzip"
              onChange={(e) => void handleBackupFileUpload(e)}
              className="hidden"
              data-testid="settings-backup-upload-input"
            />
          </div>

          {backups.length > 0 ? (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => setBackupsListExpanded((prev) => !prev)}
                className="flex w-full items-center gap-1.5 text-xs font-medium text-text-secondary transition hover:text-text-primary"
                data-testid="settings-backup-list-toggle"
              >
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${backupsListExpanded ? "rotate-90" : ""}`}
                  aria-hidden="true"
                />
                Recent backups ({backups.length})
              </button>

              {backupsListExpanded ? (
                <div className="space-y-2">
              {backups.slice(0, 10).map((b) => (
                <div
                  key={b.id}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    selectedBackupId === b.id
                      ? "border-accent/50 bg-accent-soft/30"
                      : "border-border-subtle bg-surface-field"
                  }`}
                  data-testid={`settings-backup-item-${b.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-mono text-text-primary">{b.id}</p>
                      <p className="text-[11px] text-text-muted">
                        {new Date(b.createdAt).toLocaleDateString()} &middot;
                        {(b.sizeBytes / 1024).toFixed(1)} KB &middot;
                        quick_check: {b.quickCheckResult.slice(0, 20)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => void exportBackupArchive(b.id)}
                        className="rounded-md border border-border-subtle bg-surface-field p-1.5 text-text-muted transition hover:bg-surface-elevated hover:text-text-primary"
                        data-testid={`settings-backup-export-${b.id}`}
                        title="Export backup"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBackupId(b.id);
                          setConfirmText("");
                        }}
                        className={`rounded-md border p-1.5 transition ${
                          selectedBackupId === b.id
                            ? "border-danger/40 bg-danger-soft text-danger"
                            : "border-border-subtle bg-surface-field text-text-muted hover:bg-surface-elevated hover:text-text-primary"
                        }`}
                        data-testid={`settings-backup-restore-select-${b.id}`}
                        title="Restore this backup"
                      >
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {selectedBackupId === b.id ? (
                    <div className="mt-2 border-t border-danger/20 pt-2">
                      <p className="text-xs font-medium text-danger mb-1">
                        Danger: restoring will replace the current database.
                      </p>
                      <p className="text-[11px] text-text-muted mb-2">
                        Type the backup id to confirm: <span className="font-mono text-danger">{b.id}</span>
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder={b.id}
                          className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-surface-field px-3 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring"
                          data-testid="settings-backup-confirm-input"
                        />
                        <button
                          type="button"
                          onClick={() => void restoreFromBackup()}
                          disabled={confirmText !== b.id || isRestoring}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-danger/50 bg-danger-soft px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
                          data-testid="settings-backup-restore-confirm"
                        >
                          {isRestoring ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={resetBackupSelection}
                          className="rounded-lg border border-border-subtle bg-surface-field px-3 py-1.5 text-xs text-text-secondary transition hover:bg-surface-elevated"
                          data-testid="settings-backup-restore-cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
                </div>
              ) : null}
            </div>
          ) : (
            !isLoadingBackups && (
              <p className="mt-3 text-xs text-text-muted" data-testid="settings-backup-empty">
                No backups yet. Create one above.
              </p>
            )
          )}
        </div>
      </section>

    </div>
  );
}
