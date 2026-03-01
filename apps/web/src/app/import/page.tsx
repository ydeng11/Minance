"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCcw,
  Save,
  UploadCloud
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import { importWorkflowReducer, initialImportWorkflowState } from "@/lib/import/reducer";
import type {
  Category,
  ImportDetailsResponse,
  ImportJob,
  ImportProcessedRowsResponse,
  ProcessedRow
} from "@/lib/api/types";
import { money } from "@/lib/utils";

const CANONICAL_FIELDS = [
  "date",
  "merchant",
  "description",
  "amount",
  "currency",
  "account",
  "category_raw",
  "memo"
] as const;

export default function ImportPage() {
  const api = useApi();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [imports, setImports] = useState<ImportJob[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [mappingDraft, setMappingDraft] = useState<Record<string, string | null>>({});
  const [state, dispatch] = useReducer(importWorkflowReducer, initialImportWorkflowState);

  const globalMessage = state.error || state.notice || "";

  const currentImportId = state.currentImport?.id || null;

  const commitSummaryJson = useMemo(() => {
    if (!state.commitResult) {
      return "";
    }
    return JSON.stringify(
      {
        summary: state.commitResult.summary,
        dateBounds: state.commitResult.dateBounds,
        processedTotals: state.commitResult.processedTotals
      },
      null,
      2
    );
  }, [state.commitResult]);

  async function refreshImports() {
    const data = await api.imports.list();
    setImports(data.imports);
  }

  async function refreshCategories() {
    const data = await api.categories.list();
    setCategories(data.categories);
  }

  async function openImport(importId: string, nextStatusFilter = statusFilter) {
    const [details, processedRows] = await Promise.all([
      api.imports.getById(importId),
      api.imports.listProcessedRows(importId, {
        limit: 200,
        status: nextStatusFilter || undefined
      })
    ]);

    dispatch({
      type: "analyze_succeeded",
      importJob: details.importJob,
      details,
      processedRows
    });
  }

  async function initialize() {
    try {
      await Promise.all([refreshImports(), refreshCategories()]);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to load import data.";
      dispatch({ type: "error", message });
    }
  }

  useEffect(() => {
    void initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.details?.importJob?.mapping) {
      setMappingDraft(state.details.importJob.mapping);
    }
  }, [state.details]);

  async function processFile() {
    if (!file) {
      dispatch({ type: "error", message: "Select a CSV file first." });
      return;
    }

    dispatch({ type: "analyze_started" });

    try {
      const csvText = await file.text();
      const created = await api.imports.create({ fileName: file.name, csvText });

      const [details, processedRows] = await Promise.all([
        api.imports.getById(created.importJob.id),
        api.imports.listProcessedRows(created.importJob.id, {
          limit: 200,
          status: statusFilter || undefined
        })
      ]);

      dispatch({
        type: "analyze_succeeded",
        importJob: created.importJob,
        details,
        processedRows
      });
      await refreshImports();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Import analysis failed.";
      dispatch({ type: "error", message });
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function saveMapping() {
    if (!currentImportId) {
      return;
    }

    dispatch({ type: "mapping_save_started" });

    try {
      await api.imports.saveMapping(currentImportId, mappingDraft);
      const [details, processedRows] = await Promise.all([
        api.imports.getById(currentImportId),
        api.imports.listProcessedRows(currentImportId, {
          limit: 200,
          status: statusFilter || undefined
        })
      ]);

      dispatch({ type: "mapping_save_succeeded", details, processedRows });
      await refreshImports();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to save mapping.";
      dispatch({ type: "error", message });
    }
  }

  async function refreshProcessedRows(importId: string, nextStatusFilter = statusFilter) {
    const [details, processedRows] = await Promise.all([
      api.imports.getById(importId),
      api.imports.listProcessedRows(importId, {
        limit: 200,
        status: nextStatusFilter || undefined
      })
    ]);

    dispatch({ type: "mapping_save_succeeded", details, processedRows });
  }

  async function updateProcessedRow(rowId: string, payload: Partial<ProcessedRow["normalized"]> & { include?: boolean }) {
    if (!currentImportId) {
      return;
    }

    try {
      await api.imports.updateProcessedRow(currentImportId, rowId, payload);
      await refreshProcessedRows(currentImportId);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to update row.";
      dispatch({ type: "error", message });
    }
  }

  async function reprocessRows() {
    if (!currentImportId) {
      return;
    }

    try {
      await api.imports.reprocess(currentImportId);
      await refreshProcessedRows(currentImportId);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to reprocess rows.";
      dispatch({ type: "error", message });
    }
  }

  async function commitImport() {
    if (!currentImportId) {
      return;
    }

    dispatch({ type: "commit_started" });

    try {
      const result = await api.imports.commit(currentImportId);
      dispatch({ type: "commit_succeeded", result });
      await Promise.all([refreshImports(), refreshProcessedRows(currentImportId)]);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to commit import.";
      dispatch({ type: "error", message });
    }
  }

  function renderProcessedRowsTable(data: ImportProcessedRowsResponse | null) {
    const processedFieldClass =
      "rounded border border-neutral-500 bg-neutral-900 px-2 py-1 text-neutral-100 placeholder:text-neutral-400 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/40";

    if (!data || !data.items.length) {
      return (
        <tr>
          <td colSpan={11} className="px-3 py-6 text-center text-xs text-neutral-400">
            No rows found for the selected filter.
          </td>
        </tr>
      );
    }

    return data.items.map((row) => (
      <tr key={row.rowId} className="border-b border-neutral-900 align-top">
        <td className="px-2 py-2">
          <input
            type="checkbox"
            data-testid={`processed-include-${row.rowId}`}
            defaultChecked={row.include}
            onChange={(event) => void updateProcessedRow(row.rowId, { include: event.target.checked })}
          />
        </td>
        <td className="px-2 py-2 text-xs">
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-neutral-200">{row.status}</span>
        </td>
        <td className="px-2 py-2">
          <input
            defaultValue={row.normalized.transaction_date || ""}
            type="date"
            className={`w-28 ${processedFieldClass}`}
            onBlur={(event) => void updateProcessedRow(row.rowId, { transaction_date: event.target.value })}
          />
        </td>
        <td className="px-2 py-2">
          <input
            defaultValue={row.normalized.merchant_raw}
            className={`w-40 ${processedFieldClass}`}
            onBlur={(event) => void updateProcessedRow(row.rowId, { merchant_raw: event.target.value })}
          />
        </td>
        <td className="px-2 py-2">
          <input
            defaultValue={row.normalized.description}
            className={`w-44 ${processedFieldClass}`}
            onBlur={(event) => void updateProcessedRow(row.rowId, { description: event.target.value })}
          />
        </td>
        <td className="px-2 py-2">
          <input
            defaultValue={row.normalized.amount == null ? "" : String(row.normalized.amount)}
            type="number"
            step="0.01"
            className={`w-24 ${processedFieldClass}`}
            onBlur={(event) => void updateProcessedRow(row.rowId, { amount: Number(event.target.value) })}
          />
        </td>
        <td className="px-2 py-2">
          <select
            defaultValue={row.normalized.direction}
            className={`w-20 ${processedFieldClass}`}
            onChange={(event) => void updateProcessedRow(row.rowId, { direction: event.target.value as "debit" | "credit" })}
          >
            <option value="debit">debit</option>
            <option value="credit">credit</option>
          </select>
        </td>
        <td className="px-2 py-2">
          <select
            defaultValue={row.normalized.category_final || ""}
            className={`w-36 ${processedFieldClass}`}
            onChange={(event) => void updateProcessedRow(row.rowId, { category_final: event.target.value || null })}
          >
            <option value="">(auto)</option>
            {categories.map((entry) => (
              <option key={entry.id} value={entry.name}>
                {entry.emoji ? `${entry.emoji} ` : ""}{entry.name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-2 py-2">
          <input
            defaultValue={row.normalized.account_name}
            className={`w-32 ${processedFieldClass}`}
            onBlur={(event) => void updateProcessedRow(row.rowId, { account_name: event.target.value })}
          />
        </td>
        <td className="px-2 py-2">
          <input
            defaultValue={row.normalized.memo || ""}
            data-testid={`processed-memo-${row.rowId}`}
            className={`w-32 ${processedFieldClass}`}
            onBlur={(event) => void updateProcessedRow(row.rowId, { memo: event.target.value || null })}
          />
        </td>
        <td className="px-2 py-2 text-[11px] text-neutral-400">{row.issues.join("; ")}</td>
      </tr>
    ));
  }

  return (
    <div className="space-y-6" data-testid="import-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Import Transactions</h2>
        <p className="mt-1 text-neutral-400">Upload a CSV from any bank. Our AI will automatically categorize and format it.</p>
      </header>

      {globalMessage ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300" data-testid="global-message">
          {globalMessage}
        </p>
      ) : null}

      <section className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/70 p-10 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          data-testid="import-file"
          className="hidden"
          onClick={(event) => {
            event.currentTarget.value = "";
          }}
          onChange={(event) => {
            const nextFile = event.target.files?.[0] || null;
            setFile(nextFile);
            if (nextFile) {
              dispatch({ type: "file_selected", fileName: nextFile.name });
            } else {
              dispatch({ type: "clear_notice" });
            }
          }}
        />

        <div className="rounded-xl border border-neutral-900 bg-neutral-950 p-10">
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-emerald-500/10 p-4">
                <FileText className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-lg font-medium text-emerald-100" data-testid="import-selected-file">{file.name}</p>
              <p className="text-sm text-neutral-500">Ready to process. Upload again to replace this file.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-neutral-900 p-4">
                <UploadCloud className="h-8 w-8 text-neutral-500" />
              </div>
              <p className="text-lg font-medium text-neutral-200">Upload a CSV file to begin</p>
              <p className="text-sm text-neutral-500">Supports Chase, Amex, Apple, Citi &amp; more...</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={openFilePicker}
          data-testid="import-upload"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 font-medium text-neutral-200 transition hover:bg-neutral-800"
        >
          <UploadCloud className="h-4 w-4" />
          Upload CSV
        </button>

        <button
          type="button"
          onClick={() => void processFile()}
          data-testid="import-process"
          disabled={!file || state.isAnalyzing}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing via AI...
            </>
          ) : (
            "Process Transactions"
          )}
        </button>
      </section>

      {state.details ? (
        <section className="rounded-xl border border-neutral-900 bg-neutral-950/70 p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="text-sm font-medium">Analyzed {state.details.importJob.rowCount} rows in {state.details.importJob.fileName}</h3>
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border border-neutral-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900/60 text-neutral-400">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Merchant</th>
                  <th className="px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {state.details.processedPreview.slice(0, 5).map((row) => (
                  <tr key={row.rowId}>
                    <td className="px-3 py-2 text-neutral-300">{row.normalized.transaction_date || "-"}</td>
                    <td className="px-3 py-2 text-neutral-200">{row.normalized.merchant_raw}</td>
                    <td className="px-3 py-2 text-neutral-200">{row.normalized.amount == null ? "-" : money(row.normalized.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <details className="rounded-2xl border border-neutral-900 bg-neutral-950/70" data-testid="advanced-import-controls" open>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-neutral-300">Advanced Import Controls</summary>
        <div className="space-y-4 px-4 pb-4">
          <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4" data-testid="mapping-panel">
            <h3 className="text-sm font-medium text-neutral-300">Mapping Review</h3>

            {state.details ? (
              <>
                <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {CANONICAL_FIELDS.map((field) => (
                    <label key={field} className="grid gap-1 text-xs text-neutral-300">
                      {field}
                      <select
                        value={mappingDraft[field] || ""}
                        onChange={(event) =>
                          setMappingDraft((prev) => ({
                            ...prev,
                            [field]: event.target.value || null
                          }))
                        }
                        className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-200 outline-none transition focus:border-emerald-500"
                      >
                        <option value="">(not mapped)</option>
                        {(state.details?.importJob.headers || []).map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void saveMapping()}
                    disabled={state.isSavingMapping}
                    data-testid="save-mapping"
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    Save Mapping
                  </button>
                  <button
                    type="button"
                    onClick={() => void commitImport()}
                    disabled={state.isCommitting}
                    data-testid="commit-import"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {state.isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Commit Import
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">Analyze a CSV to review mapping.</p>
            )}

            <pre
              className="mt-3 max-h-52 overflow-auto rounded-lg border border-neutral-900 bg-neutral-950 p-2 text-xs text-emerald-100"
              data-testid="import-summary"
            >
              {commitSummaryJson}
            </pre>
          </section>

          <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4" data-testid="processed-panel">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-neutral-300">Processed Records Editor</h3>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    const nextStatus = event.target.value;
                    setStatusFilter(nextStatus);
                    if (currentImportId) {
                      void openImport(currentImportId, nextStatus);
                    }
                  }}
                  data-testid="processed-status-filter"
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
                >
                  <option value="">All statuses</option>
                  <option value="valid">Valid</option>
                  <option value="invalid">Invalid</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="excluded">Excluded</option>
                </select>
                <button
                  type="button"
                  onClick={() => void reprocessRows()}
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Reprocess
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs text-neutral-500" data-testid="processed-summary">
              {state.processedRows
                ? `Total: ${state.processedRows.summary.all} · Included: ${state.processedRows.summary.included} · Valid: ${state.processedRows.summary.valid} · Invalid: ${state.processedRows.summary.invalid} · Duplicate: ${state.processedRows.summary.duplicate} · Excluded: ${state.processedRows.summary.excluded}`
                : "No processed rows loaded yet."}
            </p>

            <div className="mt-3 overflow-auto">
              <table className="min-w-[1100px] w-full text-xs" data-testid="processed-table">
                <thead>
                  <tr className="border-b border-neutral-900 text-left text-neutral-300">
                    <th className="px-2 py-2">Include</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Merchant</th>
                    <th className="px-2 py-2">Description</th>
                    <th className="px-2 py-2">Amount</th>
                    <th className="px-2 py-2">Dir</th>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Account</th>
                    <th className="px-2 py-2">Memo</th>
                    <th className="px-2 py-2">Issues</th>
                  </tr>
                </thead>
                <tbody>{renderProcessedRowsTable(state.processedRows)}</tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
            <h3 className="text-sm font-medium text-neutral-300">Recent Imports</h3>
            <div className="mt-3 space-y-2" data-testid="import-list">
              {imports.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm">
                  <div>
                    <strong className="text-neutral-100">{entry.fileName}</strong>
                    <p className="text-xs text-neutral-500">
                      {entry.status} · {entry.rowCount} rows · {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openImport(entry.id)}
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-200 transition hover:bg-neutral-700"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </details>

      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      ) : null}
    </div>
  );
}
