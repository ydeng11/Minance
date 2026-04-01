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
  Account,
  Category,
  ImportDetailsResponse,
  ImportJob,
  ImportReconciliationAccount,
  ImportReconciliationResponse,
  ImportProcessedRowsResponse,
  ProcessedRow
} from "@/lib/api/types";
import {
  CANONICAL_IMPORT_FIELDS,
  getImportMappingTemplates,
  resolveTemplateMapping
} from "@/lib/import/mappingTemplates";
import {
  buildImportAccountReviewState,
  buildImportAccountOptions,
  buildImportIssueVisibilitySummary,
  collectRowIdsByAccountKey,
  getReconciliationActionMode,
  resolveImportAccountValue,
  shouldShowReconciliationSummary,
  runReprocessRowsFlow
} from "./accountAssignment";
import { ImportAccountSelector, ImportIssuesSummaryPanel, ProcessedRowAccountSelect } from "./pageComponents";
import { money } from "@/lib/utils";

export default function ImportPage() {
  const api = useApi();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [imports, setImports] = useState<ImportJob[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mappingDraft, setMappingDraft] = useState<Record<string, string | null>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState("generic_statement");
  const [mappingTemplateNotice, setMappingTemplateNotice] = useState("");
  const [reconciliation, setReconciliation] = useState<ImportReconciliationResponse | null>(null);
  const [isReconciliationLoading, setIsReconciliationLoading] = useState(false);
  const [isAssigningAccount, setIsAssigningAccount] = useState(false);
  const [reconciliationAssignments, setReconciliationAssignments] = useState<Record<string, string>>({});
  const [reconciliationNotice, setReconciliationNotice] = useState("");
  const [allProcessedRows, setAllProcessedRows] = useState<ProcessedRow[]>([]);
  const [importAccountId, setImportAccountId] = useState("");
  const [importDefaultRowIds, setImportDefaultRowIds] = useState<string[]>([]);
  const [hasInitializedImportAccountState, setHasInitializedImportAccountState] = useState(false);
  const [state, dispatch] = useReducer(importWorkflowReducer, initialImportWorkflowState);
  const mappingTemplates = useMemo(() => getImportMappingTemplates(), []);

  const globalMessage = state.error || reconciliationNotice || state.notice || "";

  const currentImportId = state.currentImport?.id || null;
  const accountOptions = useMemo(
    () => accounts.slice().sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [accounts]
  );
  const accountAssignmentOptions = useMemo(
    () => accountOptions.map((account) => ({
      id: account.id,
      label: account.displayIdentifier || account.displayName
    })),
    [accountOptions]
  );
  const importAccountReviewState = useMemo(
    () => buildImportAccountReviewState(allProcessedRows, accountOptions),
    [accountOptions, allProcessedRows]
  );
  const importAccountOptions = useMemo(
    () => accountAssignmentOptions.map((account) => ({
      value: account.id,
      label: account.label
    })),
    [accountAssignmentOptions]
  );
  const importIssueSummary = useMemo(
    () => buildImportIssueVisibilitySummary(allProcessedRows, reconciliation),
    [allProcessedRows, reconciliation]
  );
  const isReconciliationVisible = shouldShowReconciliationSummary(importIssueSummary);

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

  async function refreshAccounts() {
    const data = await api.accounts.list();
    setAccounts(data.accounts);
  }

  async function loadImportContext(importId: string, nextStatusFilter = statusFilter) {
    setIsReconciliationLoading(true);
    try {
      const allRowsPromise = listAllProcessedRows(importId);
      const [details, processedRows, nextReconciliation, allRows] = await Promise.all([
        api.imports.getById(importId),
        api.imports.listProcessedRows(importId, {
          limit: 200,
          status: nextStatusFilter || undefined
        }),
        api.imports.getReconciliation(importId),
        allRowsPromise
      ]);
      setAllProcessedRows(allRows);
      setReconciliation(nextReconciliation);
      return { details, processedRows };
    } finally {
      setIsReconciliationLoading(false);
    }
  }

  async function openImport(importId: string, nextStatusFilter = statusFilter) {
    try {
      const { details, processedRows } = await loadImportContext(importId, nextStatusFilter);
      dispatch({
        type: "analyze_succeeded",
        importJob: details.importJob,
        details,
        processedRows
      });
      setReconciliationNotice("");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to load import details.";
      dispatch({ type: "error", message });
    }
  }

  async function initialize() {
    try {
      await Promise.all([refreshImports(), refreshCategories(), refreshAccounts()]);
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
      setMappingTemplateNotice("");
    }
  }, [state.details]);

  useEffect(() => {
    setReconciliationAssignments({});
    setImportAccountId("");
    setImportDefaultRowIds([]);
    setHasInitializedImportAccountState(false);
    if (!currentImportId) {
      setAllProcessedRows([]);
    }
  }, [currentImportId]);

  useEffect(() => {
    if (!currentImportId || hasInitializedImportAccountState) {
      return;
    }

    const rowsReady = allProcessedRows.length > 0 || state.processedRows?.summary.all === 0;
    if (!rowsReady || (allProcessedRows.length > 0 && accountOptions.length === 0)) {
      return;
    }

    setImportAccountId(importAccountReviewState.selectedAccountId);
    setImportDefaultRowIds(importAccountReviewState.defaultRowIds);
    setHasInitializedImportAccountState(true);
  }, [
    accountOptions.length,
    allProcessedRows.length,
    currentImportId,
    hasInitializedImportAccountState,
    importAccountReviewState.defaultRowIds,
    importAccountReviewState.selectedAccountId,
    state.processedRows?.summary.all
  ]);

  function applyMappingTemplate() {
    if (!state.details) {
      return;
    }

    const template = mappingTemplates.find((entry) => entry.id === selectedTemplateId) || mappingTemplates[0];
    if (!template) {
      return;
    }

    const resolved = resolveTemplateMapping(
      template,
      state.details.importJob.headers || [],
      mappingDraft
    );
    setMappingDraft(resolved.mapping);

    const requiredMissing = ["date", "merchant", "amount"].filter((field) =>
      resolved.unmatchedFields.includes(field as (typeof CANONICAL_IMPORT_FIELDS)[number])
    );
    if (requiredMissing.length) {
      setMappingTemplateNotice(`${template.label} applied. Review required fields: ${requiredMissing.join(", ")}.`);
      return;
    }

    setMappingTemplateNotice(
      `${template.label} applied (${resolved.matchedFields.length}/${CANONICAL_IMPORT_FIELDS.length} fields matched).`
    );
  }

  async function processFile() {
    if (!file) {
      dispatch({ type: "error", message: "Select a CSV file first." });
      return;
    }

    dispatch({ type: "analyze_started" });

    try {
      const csvText = await file.text();
      const created = await api.imports.create({ fileName: file.name, csvText });

      const { details, processedRows } = await loadImportContext(created.importJob.id, statusFilter);

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
      const { details, processedRows } = await loadImportContext(currentImportId, statusFilter);

      dispatch({ type: "mapping_save_succeeded", details, processedRows });
      await refreshImports();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to save mapping.";
      dispatch({ type: "error", message });
    }
  }

  async function refreshProcessedRows(importId: string, nextStatusFilter = statusFilter) {
    const { details, processedRows } = await loadImportContext(importId, nextStatusFilter);

    dispatch({ type: "mapping_save_succeeded", details, processedRows });
  }

  async function updateProcessedRow(rowId: string, payload: Partial<ProcessedRow["normalized"]> & { include?: boolean }) {
    if (!currentImportId) {
      return;
    }

    try {
      await api.imports.updateProcessedRow(currentImportId, rowId, payload);
      await refreshProcessedRows(currentImportId);
      if (Object.prototype.hasOwnProperty.call(payload, "account_name")) {
        setImportDefaultRowIds((previous) => previous.filter((candidateRowId) => candidateRowId !== rowId));
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to update row.";
      dispatch({ type: "error", message });
    }
  }

  async function listAllProcessedRows(importId: string): Promise<ProcessedRow[]> {
    const rows: ProcessedRow[] = [];
    let offset = 0;
    const pageSize = 500;

    while (true) {
      const response = await api.imports.listProcessedRows(importId, {
        limit: pageSize,
        offset
      });
      rows.push(...response.items);
      offset += response.items.length;
      if (response.items.length === 0 || rows.length >= response.total) {
        break;
      }
    }

    return rows;
  }

  async function applyImportAccountSelection(nextAccountId: string) {
    if (!currentImportId || !nextAccountId) {
      return;
    }

    const selectedAccount = accountOptions.find((entry) => entry.id === nextAccountId);
    if (!selectedAccount) {
      dispatch({ type: "error", message: "Select a valid account before assigning." });
      return;
    }

    setIsAssigningAccount(true);
    try {
      const didApply = importDefaultRowIds.length > 0
        ? await applyAccountToRows(importDefaultRowIds, selectedAccount.id, "Applied import account")
        : true;
      if (didApply) {
        setImportAccountId(nextAccountId);
      }
      if (importDefaultRowIds.length === 0) {
        setReconciliationNotice(`Import account set to ${selectedAccount.displayName}.`);
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to assign import account.";
      dispatch({ type: "error", message });
    } finally {
      setIsAssigningAccount(false);
    }
  }

  async function applyAccountToRows(rowIds: string[], accountId: string, successPrefix: string): Promise<boolean> {
    if (!currentImportId || !rowIds.length) {
      return false;
    }

    const account = accountOptions.find((entry) => entry.id === accountId);
    if (!account) {
      dispatch({ type: "error", message: "Select a valid account before assigning." });
      return false;
    }

    setIsAssigningAccount(true);
    try {
      await Promise.all(
        rowIds.map((rowId) => api.imports.updateProcessedRow(currentImportId, rowId, { account_name: account.displayName }))
      );
      await refreshProcessedRows(currentImportId);
      setReconciliationNotice(`${successPrefix}: ${account.displayName} (${rowIds.length} row${rowIds.length === 1 ? "" : "s"}).`);
      return true;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to assign account to rows.";
      dispatch({ type: "error", message });
      return false;
    } finally {
      setIsAssigningAccount(false);
    }
  }

  async function assignReconciliationAccount(entry: ImportReconciliationAccount) {
    if (!currentImportId) {
      return;
    }

    const assignedAccountId = reconciliationAssignments[entry.accountKey];
    if (!assignedAccountId) {
      dispatch({ type: "error", message: `Select an account to map ${entry.accountName}.` });
      return;
    }

    try {
      const rowIds = collectRowIdsByAccountKey(allProcessedRows, entry.accountKey);
      if (!rowIds.length) {
        dispatch({ type: "error", message: `No processed rows found for ${entry.accountName}.` });
        return;
      }

      const didApply = await applyAccountToRows(rowIds, assignedAccountId, `Mapped ${entry.accountName}`);
      if (didApply) {
        const assignedRowIds = new Set(rowIds);
        setImportDefaultRowIds((previous) => previous.filter((rowId) => !assignedRowIds.has(rowId)));
      }
      setReconciliationAssignments((previous) => {
        const next = { ...previous };
        delete next[entry.accountKey];
        return next;
      });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to map reconciliation account.";
      dispatch({ type: "error", message });
    }
  }

  async function reprocessRows() {
    if (!currentImportId) {
      return;
    }

    try {
      await runReprocessRowsFlow(currentImportId, {
        reprocess: api.imports.reprocess,
        refreshProcessedRows,
        refreshImports,
        publishNotice: setReconciliationNotice
      });
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
      setReconciliationNotice("");
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

    return data.items.map((row) => {
      const accountOptionsForRow = buildImportAccountOptions(accountOptions, row.normalized.account_name);

      return (
        <tr key={row.rowId} className="border-b border-neutral-900 align-top">
          <td className="px-2 py-2">
            <input
              type="checkbox"
              data-testid={`processed-include-${row.rowId}`}
              defaultChecked={row.include}
              aria-label={`Include row ${row.rowId}`}
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
              aria-label={`Date for row ${row.rowId}`}
              onBlur={(event) => void updateProcessedRow(row.rowId, { transaction_date: event.target.value })}
            />
          </td>
          <td className="px-2 py-2">
            <input
              defaultValue={row.normalized.merchant_raw}
              className={`w-40 ${processedFieldClass}`}
              aria-label={`Merchant for row ${row.rowId}`}
              onBlur={(event) => void updateProcessedRow(row.rowId, { merchant_raw: event.target.value })}
            />
          </td>
          <td className="px-2 py-2">
            <input
              defaultValue={row.normalized.description}
              className={`w-44 ${processedFieldClass}`}
              aria-label={`Description for row ${row.rowId}`}
              onBlur={(event) => void updateProcessedRow(row.rowId, { description: event.target.value })}
            />
          </td>
          <td className="px-2 py-2">
            <input
              defaultValue={row.normalized.amount == null ? "" : String(row.normalized.amount)}
              type="number"
              step="0.01"
              className={`w-24 ${processedFieldClass}`}
              aria-label={`Amount for row ${row.rowId}`}
              onBlur={(event) => void updateProcessedRow(row.rowId, { amount: Number(event.target.value) })}
            />
          </td>
          <td className="px-2 py-2">
            <select
              defaultValue={row.normalized.direction}
              className={`w-20 ${processedFieldClass}`}
              aria-label={`Direction for row ${row.rowId}`}
              onChange={(event) => void updateProcessedRow(row.rowId, { direction: event.target.value as "outflow" | "inflow" })}
            >
              <option value="outflow">outflow</option>
              <option value="inflow">inflow</option>
            </select>
          </td>
          <td className="px-2 py-2">
            <select
              defaultValue={row.normalized.category_final || ""}
              className={`w-36 ${processedFieldClass}`}
              aria-label={`Category for row ${row.rowId}`}
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
            <ProcessedRowAccountSelect
              rowId={row.rowId}
              accountOptions={accountOptionsForRow}
              value={resolveImportAccountValue(accountOptions, row.normalized.account_name)}
              onChange={(value) => void updateProcessedRow(row.rowId, { account_name: value })}
            />
          </td>
          <td className="px-2 py-2">
            <input
              defaultValue={row.normalized.memo || ""}
              data-testid={`processed-memo-${row.rowId}`}
              className={`w-32 ${processedFieldClass}`}
              aria-label={`Memo for row ${row.rowId}`}
              onBlur={(event) => void updateProcessedRow(row.rowId, { memo: event.target.value || null })}
            />
          </td>
          <td className="px-2 py-2 text-[11px] text-neutral-400">{row.issues.join("; ")}</td>
        </tr>
      );
    });
  }

  return (
    <div className="space-y-6" data-testid="import-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Import Transactions</h2>
        <p className="mt-1 text-neutral-400">Upload CSV, OFX, or QFX exports from any bank. Our AI will automatically categorize and format them.</p>
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
          accept=".csv,.ofx,.qfx,text/csv,application/x-ofx,text/plain"
          aria-label="Upload import file"
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
              <p className="text-sm text-neutral-400">Ready to process. Upload again to replace this file.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-neutral-900 p-4">
                <UploadCloud className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-lg font-medium text-neutral-200">Upload a CSV file to begin</p>
              <p className="text-sm text-neutral-400">Supports CSV, OFX, QFX exports from major banks.</p>
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
              <caption className="sr-only">Analyzed import preview rows</caption>
              <thead className="bg-neutral-900/60 text-neutral-400">
                <tr>
                  <th scope="col" className="px-3 py-2">Date</th>
                  <th scope="col" className="px-3 py-2">Merchant</th>
                  <th scope="col" className="px-3 py-2">Amount</th>
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
                  <div className="md:col-span-2 lg:col-span-4 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="grid min-w-48 flex-1 gap-1 text-xs text-neutral-300">
                        Mapping template
                        <select
                          value={selectedTemplateId}
                          onChange={(event) => setSelectedTemplateId(event.target.value)}
                          data-testid="mapping-template-select"
                          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-200 outline-none transition focus:border-emerald-500"
                        >
                          {mappingTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={applyMappingTemplate}
                        data-testid="mapping-template-apply"
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-200 transition hover:bg-neutral-800"
                      >
                        Apply Template
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-neutral-400">
                      {(mappingTemplates.find((entry) => entry.id === selectedTemplateId) || mappingTemplates[0])?.description}
                    </p>
                    {mappingTemplateNotice ? (
                      <p className="mt-2 text-xs text-emerald-300" data-testid="mapping-template-notice">
                        {mappingTemplateNotice}
                      </p>
                    ) : null}
                  </div>

                  {CANONICAL_IMPORT_FIELDS.map((field) => (
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
                        data-testid={`mapping-field-${field}`}
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
              <p className="mt-2 text-sm text-neutral-400">Analyze a CSV to review mapping.</p>
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
                <label htmlFor="processed-status-filter" className="sr-only">
                  Processed rows status
                </label>
                <select
                  id="processed-status-filter"
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

            <div className="mt-3">
              <ImportAccountSelector
                accountOptions={importAccountOptions}
                value={importAccountId}
                isApplying={isAssigningAccount}
                disabled={!currentImportId || !hasInitializedImportAccountState}
                onChange={(value) => void applyImportAccountSelection(value)}
              />
            </div>

            <p className="mt-2 text-xs text-neutral-400" data-testid="processed-summary">
              {state.processedRows
                ? `Total: ${state.processedRows.summary.all} · Included: ${state.processedRows.summary.included} · Valid: ${state.processedRows.summary.valid} · Invalid: ${state.processedRows.summary.invalid} · Duplicate: ${state.processedRows.summary.duplicate} · Excluded: ${state.processedRows.summary.excluded}`
                : "No processed rows loaded yet."}
            </p>

            <div
              className="mt-3 overflow-auto"
              tabIndex={0}
              aria-label="Processed records table"
            >
              <table className="min-w-[1100px] w-full text-xs" data-testid="processed-table">
                <caption className="sr-only">Processed row editor table</caption>
                <thead>
                  <tr className="border-b border-neutral-900 text-left text-neutral-300">
                    <th scope="col" className="px-2 py-2">Include</th>
                    <th scope="col" className="px-2 py-2">Status</th>
                    <th scope="col" className="px-2 py-2">Date</th>
                    <th scope="col" className="px-2 py-2">Merchant</th>
                    <th scope="col" className="px-2 py-2">Description</th>
                    <th scope="col" className="px-2 py-2">Amount</th>
                    <th scope="col" className="px-2 py-2">Dir</th>
                    <th scope="col" className="px-2 py-2">Category</th>
                    <th scope="col" className="px-2 py-2">Account</th>
                    <th scope="col" className="px-2 py-2">Memo</th>
                    <th scope="col" className="px-2 py-2">Issues</th>
                  </tr>
                </thead>
                <tbody>{renderProcessedRowsTable(state.processedRows)}</tbody>
              </table>
            </div>
          </section>

          <ImportIssuesSummaryPanel summary={importIssueSummary} />

          {isReconciliationVisible ? (
            <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4" data-testid="reconciliation-panel">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-neutral-300">Reconciliation</h3>
              <button
                type="button"
                onClick={() => {
                  if (currentImportId) {
                    void refreshProcessedRows(currentImportId);
                  }
                }}
                disabled={!currentImportId || isReconciliationLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReconciliationLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                Refresh
              </button>
            </div>

            {!currentImportId ? (
              <p className="mt-2 text-xs text-neutral-400">Analyze a CSV to compute reconciliation.</p>
            ) : reconciliation ? (
              <>
                <p className="mt-2 text-xs text-neutral-400" data-testid="reconciliation-summary">
                  Accounts: {reconciliation.summary.accountsTotal}
                  {" · "}Balanced: {reconciliation.summary.balancedAccounts}
                  {" · "}Needs review: {reconciliation.summary.needsReviewAccounts}
                  {" · "}Missing account links: {reconciliation.summary.missingAccounts}
                  {" · "}Net discrepancy: {money(reconciliation.summary.discrepancyAmount)}
                </p>
                <div className="mt-3 overflow-auto">
                  <table className="min-w-[1100px] w-full text-xs" data-testid="reconciliation-table">
                    <caption className="sr-only">Reconciliation summary by account</caption>
                    <thead>
                      <tr className="border-b border-neutral-900 text-left text-neutral-300">
                        <th scope="col" className="px-2 py-2">Account</th>
                        <th scope="col" className="px-2 py-2">Status</th>
                        <th scope="col" className="px-2 py-2">Rows</th>
                        <th scope="col" className="px-2 py-2">Imported Net</th>
                        <th scope="col" className="px-2 py-2">Ledger Net</th>
                        <th scope="col" className="px-2 py-2">Discrepancy</th>
                        <th scope="col" className="px-2 py-2">Recommendations</th>
                        <th scope="col" className="px-2 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliation.accounts.map((entry) => {
                        const actionMode = getReconciliationActionMode(entry);
                        const selectedAccountId = reconciliationAssignments[entry.accountKey] || "";
                        return (
                          <tr key={entry.accountKey} className="border-b border-neutral-900 align-top">
                            <td className="px-2 py-2 text-neutral-200">{entry.accountName}</td>
                            <td className="px-2 py-2 text-neutral-300">{entry.status}</td>
                            <td className="px-2 py-2 text-neutral-300">{entry.includedValidRows}/{entry.totalRows}</td>
                            <td className="px-2 py-2 text-neutral-200">{money(entry.importedNet)}</td>
                            <td className="px-2 py-2 text-neutral-300">{money(entry.existingWindowNet)}</td>
                            <td className="px-2 py-2 text-neutral-200">{money(entry.discrepancyAmount)}</td>
                            <td className="px-2 py-2 text-neutral-400">
                              {entry.recommendations.length > 0
                                ? entry.recommendations.map((recommendation) => recommendation.message).join(" ")
                                : "None"}
                            </td>
                            <td className="px-2 py-2">
                              {actionMode === "assign_account" ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <select
                                    value={selectedAccountId}
                                    onChange={(event) =>
                                      setReconciliationAssignments((previous) => ({
                                        ...previous,
                                        [entry.accountKey]: event.target.value
                                      }))
                                    }
                                    data-testid={`reconcile-account-select-${entry.accountKey}`}
                                    className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
                                  >
                                    <option value="">Select account</option>
                                    {accountAssignmentOptions.map((account) => (
                                      <option key={account.id} value={account.id}>
                                        {account.label}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => void assignReconciliationAccount(entry)}
                                    disabled={isAssigningAccount || !selectedAccountId}
                                    data-testid={`reconcile-assign-${entry.accountKey}`}
                                    className="rounded-lg border border-amber-600/70 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isAssigningAccount ? "Assigning..." : "Assign account"}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-neutral-500">No action</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs text-neutral-400">No reconciliation data loaded yet.</p>
            )}
            </section>
          ) : null}

          <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
            <h3 className="text-sm font-medium text-neutral-300">Recent Imports</h3>
            <div className="mt-3 space-y-2" data-testid="import-list">
              {imports.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm">
                  <div>
                    <strong className="text-neutral-100">{entry.fileName}</strong>
                    <p className="text-xs text-neutral-400">
                      {entry.status} · {entry.rowCount} rows · {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openImport(entry.id)}
                    aria-label={`Open import ${entry.fileName}`}
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
