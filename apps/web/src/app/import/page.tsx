"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCcw,
  Save,
  UploadCloud
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { getRequestFeedbackMessage } from "@/lib/feedback/requestFeedback";
import { importWorkflowReducer, initialImportWorkflowState } from "@/lib/import/reducer";
import { StatusMessage } from "@/components/feedback/StatusMessage";
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
  shouldShowReconciliationSummary
} from "./accountAssignment";
import { ImportAccountSelector, ImportIssuesSummaryPanel, ProcessedRowAccountSelect } from "./pageComponents";
import { money } from "@/lib/utils";

const IMPORT_ANALYZED_SUCCESS_MESSAGE = "Import analyzed. Review the preview before saving mapping.";
const MAPPING_SAVED_SUCCESS_MESSAGE = "Mapping saved. Continue to account review.";
const IMPORT_ACCOUNT_ASSIGNED_SUCCESS_MESSAGE = "Import account assigned. Review any remaining unmatched rows.";
const RECONCILIATION_ACCOUNT_MAPPED_SUCCESS_MESSAGE =
  "Reconciliation account mapped. Check the remaining issues before commit.";
const IMPORT_COMMITTED_SUCCESS_MESSAGE = "Import committed. Review imported transactions if anything looks off.";

const LOAD_IMPORT_DETAILS_ERROR_MESSAGE =
  "Import details couldn't be loaded. Nothing changed. Reopen the import and try again.";
const LOAD_IMPORT_DATA_ERROR_MESSAGE =
  "Import data couldn't be loaded. Nothing changed. Refresh the page and try again.";
const IMPORT_ANALYSIS_ERROR_MESSAGE =
  "Import analysis couldn't finish. Nothing changed. Check the file format and try again.";
const MAPPING_SAVE_ERROR_MESSAGE =
  "Mapping couldn't be saved. Nothing changed. Review required columns and try again.";
const ROW_UPDATE_ERROR_MESSAGE =
  "Row changes couldn't be saved. Nothing changed. Review the row values and try again.";
const IMPORT_ACCOUNT_ASSIGNMENT_ERROR_MESSAGE =
  "Import account couldn't be assigned. Nothing changed. Choose an account and try again.";
const ROW_ACCOUNT_ASSIGNMENT_ERROR_MESSAGE =
  "Account assignment couldn't be applied. Nothing changed. Choose an account and try again.";
const RECONCILIATION_ACCOUNT_MAPPING_ERROR_MESSAGE =
  "Reconciliation account couldn't be mapped. Nothing changed. Choose an account and try again.";
const IMPORT_COMMIT_ERROR_MESSAGE =
  "Import commit couldn't be completed. Nothing changed. Review the remaining issues, then commit again.";
const IMPORT_UPLOAD_SECTION_CLASS =
  "rounded-2xl border border-dashed border-border-strong bg-surface-panel/80 p-10 text-center shadow-panel";
const IMPORT_UPLOAD_STATE_PANEL_CLASS = "rounded-xl border border-border-subtle bg-surface-field/70 p-10";
const IMPORT_UPLOAD_ICON_CLASS = "rounded-full border border-border-subtle bg-surface-field p-4";
const IMPORT_SELECTED_ICON_CLASS = "rounded-full border border-accent/25 bg-accent-soft p-4";
const IMPORT_SECONDARY_ACTION_CLASS =
  "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-field px-4 py-3 font-medium text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const IMPORT_PRIMARY_ACTION_CLASS =
  "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-accent/35 bg-accent px-4 py-3 font-semibold text-app-bg transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg disabled:cursor-not-allowed disabled:opacity-60";
const IMPORT_PREVIEW_TABLE_WRAP_CLASS = "mt-3 overflow-hidden rounded-lg border border-border-subtle";
const IMPORT_PREVIEW_TABLE_HEAD_CLASS = "bg-surface-elevated/70 text-text-secondary";
const IMPORT_PREVIEW_TABLE_BODY_CLASS = "divide-y divide-border-subtle";
const IMPORT_PREVIEW_TABLE_CELL_CLASS = "px-3 py-2 text-text-secondary";
const IMPORT_PREVIEW_TABLE_STRONG_CELL_CLASS = "px-3 py-2 text-text-primary";
const IMPORT_ADVANCED_DETAILS_CLASS = "rounded-2xl border border-border-subtle bg-surface-panel/80";
const IMPORT_ADVANCED_SUMMARY_CLASS = "cursor-pointer px-4 py-3 text-sm font-medium text-text-secondary";
const IMPORT_SECTION_PANEL_CLASS = "rounded-xl border border-border-subtle bg-surface-panel/80 p-4 shadow-panel";
const IMPORT_SECTION_TITLE_CLASS = "text-sm font-medium text-text-secondary";
const IMPORT_MAPPING_TEMPLATE_CARD_CLASS =
  "md:col-span-2 lg:col-span-4 rounded-lg border border-border-subtle bg-surface-field/60 p-3";
const IMPORT_FIELD_LABEL_CLASS = "grid gap-1 text-xs text-text-secondary";
const IMPORT_TEMPLATE_LABEL_CLASS = "grid min-w-48 flex-1 gap-1 text-xs text-text-secondary";
const IMPORT_SELECT_FIELD_CLASS =
  "min-h-11 rounded-lg border border-border-subtle bg-surface-field px-2 py-1.5 text-text-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-focus-ring";
const IMPORT_SMALL_SECONDARY_ACTION_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-xs text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60";
const IMPORT_SMALL_PRIMARY_ACTION_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border border-accent/35 bg-accent px-3 py-2 text-sm font-semibold text-app-bg transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60";
const IMPORT_HELPER_TEXT_CLASS = "mt-2 text-xs text-text-muted";
const IMPORT_NOTICE_TEXT_CLASS = "mt-2 text-xs text-accent";
const IMPORT_COMMIT_JSON_CLASS =
  "mt-3 max-h-52 overflow-auto rounded-lg border border-border-subtle bg-surface-field p-2 text-xs text-text-primary";
const IMPORT_PROCESSED_FIELD_CLASS =
  "min-h-11 rounded border border-focus-ring bg-surface-field px-2 py-1 text-text-primary placeholder:text-text-muted outline-none transition focus:ring-2 focus:ring-focus-ring focus-visible:ring-2 focus-visible:ring-focus-ring";
const IMPORT_PROCESSED_EMPTY_CLASS =
  "rounded-xl border border-border-subtle bg-surface-field/70 px-4 py-5 text-sm text-text-muted";
const IMPORT_PROCESSED_CARD_CLASS = "rounded-xl border border-border-subtle bg-surface-panel/80 p-4 shadow-panel";
const IMPORT_PROCESSED_LABEL_CLASS = "grid gap-1 text-xs text-text-secondary";
const IMPORT_PROCESSED_STATUS_CLASS =
  "rounded-full border border-border-subtle bg-surface-field px-2 py-0.5 text-text-secondary";
const IMPORT_PROCESSED_META_CLASS = "mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-muted";
const IMPORT_TABLE_HEAD_ROW_CLASS = "border-b border-border-subtle text-left text-text-secondary";
const IMPORT_TABLE_ROW_CLASS = "border-b border-border-subtle align-top";
const IMPORT_TABLE_EMPTY_CLASS = "px-3 py-6 text-center text-xs text-text-muted";
const IMPORT_TABLE_MUTED_CELL_CLASS = "px-2 py-2 text-[11px] text-text-muted";
const IMPORT_TABLE_PRIMARY_CELL_CLASS = "px-2 py-2 text-text-primary";
const IMPORT_TABLE_SECONDARY_CELL_CLASS = "px-2 py-2 text-text-secondary";
const IMPORT_RECONCILIATION_EMPTY_CLASS =
  "rounded-xl border border-border-subtle bg-surface-field/70 px-4 py-5 text-sm text-text-muted";
const IMPORT_RECONCILIATION_CARD_CLASS = "rounded-xl border border-border-subtle bg-surface-panel/80 p-4 shadow-panel";
const IMPORT_RECONCILIATION_BADGE_CLASS =
  "rounded-full border border-border-subtle bg-surface-field px-2 py-1 text-[11px] text-text-secondary";
const IMPORT_RECONCILIATION_TERM_CLASS = "text-xs uppercase tracking-[0.16em] text-text-muted";
const IMPORT_RECONCILIATION_VALUE_CLASS = "mt-1 text-text-primary";
const IMPORT_RECONCILIATION_MUTED_VALUE_CLASS = "mt-1 text-text-secondary";
const IMPORT_RECONCILIATION_NO_ACTION_CLASS = "text-sm text-text-secondary";
const IMPORT_RECONCILIATION_SMALL_NO_ACTION_CLASS = "text-[11px] text-text-secondary";
const IMPORT_RECONCILIATION_REFRESH_ACTION_CLASS =
  "inline-flex min-h-11 items-center gap-1 rounded-lg border border-border-subtle bg-surface-field px-2 py-1 text-xs text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-60";
const IMPORT_RECENT_IMPORT_ROW_CLASS =
  "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-field/70 px-3 py-2 text-sm";
const IMPORT_RECENT_IMPORT_ACTION_CLASS =
  "inline-flex min-h-11 items-center rounded-lg border border-border-subtle bg-surface-field px-3 py-1 text-xs text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";

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
  const [workflowGuidance, setWorkflowGuidance] = useState("");
  const [allProcessedRows, setAllProcessedRows] = useState<ProcessedRow[]>([]);
  const [importAccountId, setImportAccountId] = useState("");
  const [importDefaultRowIds, setImportDefaultRowIds] = useState<string[]>([]);
  const [hasInitializedImportAccountState, setHasInitializedImportAccountState] = useState(false);
  const [state, dispatch] = useReducer(importWorkflowReducer, initialImportWorkflowState);
  const mappingTemplates = useMemo(() => getImportMappingTemplates(), []);

  const globalMessage = state.error || workflowGuidance || "";

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
  const reconciliationWarningActionClass =
    "min-h-11 rounded-lg border border-warning/45 bg-warning-soft text-warning transition hover:bg-warning-soft/80 disabled:cursor-not-allowed disabled:opacity-60";

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

  function publishInlineError(error: unknown, fallback: string) {
    setWorkflowGuidance("");
    dispatch({
      type: "error",
      message: getRequestFeedbackMessage(error, fallback)
    });
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
      setWorkflowGuidance("");
    } catch (error) {
      publishInlineError(error, LOAD_IMPORT_DETAILS_ERROR_MESSAGE);
    }
  }

  async function initialize() {
    try {
      await Promise.all([refreshImports(), refreshCategories(), refreshAccounts()]);
    } catch (error) {
      publishInlineError(error, LOAD_IMPORT_DATA_ERROR_MESSAGE);
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
      setWorkflowGuidance("");
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
      setWorkflowGuidance("");
      toast.success(IMPORT_ANALYZED_SUCCESS_MESSAGE);
      await refreshImports();
    } catch (error) {
      publishInlineError(error, IMPORT_ANALYSIS_ERROR_MESSAGE);
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
      setWorkflowGuidance("");
      toast.success(MAPPING_SAVED_SUCCESS_MESSAGE);
      await refreshImports();
    } catch (error) {
      publishInlineError(error, MAPPING_SAVE_ERROR_MESSAGE);
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
      publishInlineError(error, ROW_UPDATE_ERROR_MESSAGE);
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
      setWorkflowGuidance("");
      dispatch({ type: "error", message: "Select a valid account before assigning." });
      return;
    }

    setIsAssigningAccount(true);
    try {
      const didApply = importDefaultRowIds.length > 0
        ? await applyAccountToRows(importDefaultRowIds, selectedAccount.id)
        : true;
      if (didApply) {
        setImportAccountId(nextAccountId);
        setWorkflowGuidance("Review the processed rows below before commit.");
        toast.success(IMPORT_ACCOUNT_ASSIGNED_SUCCESS_MESSAGE);
      }
    } catch (error) {
      publishInlineError(error, IMPORT_ACCOUNT_ASSIGNMENT_ERROR_MESSAGE);
    } finally {
      setIsAssigningAccount(false);
    }
  }

  async function applyAccountToRows(rowIds: string[], accountId: string): Promise<boolean> {
    if (!currentImportId || !rowIds.length) {
      return false;
    }

    const account = accountOptions.find((entry) => entry.id === accountId);
    if (!account) {
      setWorkflowGuidance("");
      dispatch({ type: "error", message: "Select a valid account before assigning." });
      return false;
    }

    setIsAssigningAccount(true);
    try {
      await Promise.all(
        rowIds.map((rowId) => api.imports.updateProcessedRow(currentImportId, rowId, { account_name: account.displayName }))
      );
      await refreshProcessedRows(currentImportId);
      return true;
    } catch (error) {
      publishInlineError(error, ROW_ACCOUNT_ASSIGNMENT_ERROR_MESSAGE);
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
      setWorkflowGuidance("");
      dispatch({ type: "error", message: `Select an account to map ${entry.accountName}.` });
      return;
    }

    try {
      const rowIds = collectRowIdsByAccountKey(allProcessedRows, entry.accountKey);
      if (!rowIds.length) {
        setWorkflowGuidance("");
        dispatch({ type: "error", message: `No processed rows found for ${entry.accountName}.` });
        return;
      }

      const didApply = await applyAccountToRows(rowIds, assignedAccountId);
      if (didApply) {
        const assignedRowIds = new Set(rowIds);
        setImportDefaultRowIds((previous) => previous.filter((rowId) => !assignedRowIds.has(rowId)));
        setWorkflowGuidance("Check the remaining issues before commit.");
        toast.success(RECONCILIATION_ACCOUNT_MAPPED_SUCCESS_MESSAGE);
      }
      setReconciliationAssignments((previous) => {
        const next = { ...previous };
        delete next[entry.accountKey];
        return next;
      });
    } catch (error) {
      publishInlineError(error, RECONCILIATION_ACCOUNT_MAPPING_ERROR_MESSAGE);
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
      setWorkflowGuidance("");
      toast.success(IMPORT_COMMITTED_SUCCESS_MESSAGE);
      await Promise.all([refreshImports(), refreshProcessedRows(currentImportId)]);
    } catch (error) {
      publishInlineError(error, IMPORT_COMMIT_ERROR_MESSAGE);
    }
  }

  function renderProcessedRowsTable(data: ImportProcessedRowsResponse | null) {
    if (!data || !data.items.length) {
      return (
        <tr>
          <td colSpan={11} className={IMPORT_TABLE_EMPTY_CLASS}>
            No rows found for the selected filter.
          </td>
        </tr>
      );
    }

    return data.items.map((row) => {
      const accountOptionsForRow = buildImportAccountOptions(accountOptions, row.normalized.account_name);

      return (
        <tr key={row.rowId} className={IMPORT_TABLE_ROW_CLASS}>
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
            <span className={IMPORT_PROCESSED_STATUS_CLASS}>{row.status}</span>
          </td>
          <td className="px-2 py-2">
            <input
              defaultValue={row.normalized.transaction_date || ""}
              type="date"
              className={`w-28 ${IMPORT_PROCESSED_FIELD_CLASS}`}
              aria-label={`Date for row ${row.rowId}`}
              onBlur={(event) => void updateProcessedRow(row.rowId, { transaction_date: event.target.value })}
            />
          </td>
          <td className="px-2 py-2">
            <input
              defaultValue={row.normalized.merchant_raw}
              className={`w-40 ${IMPORT_PROCESSED_FIELD_CLASS}`}
              aria-label={`Merchant for row ${row.rowId}`}
              onBlur={(event) => void updateProcessedRow(row.rowId, { merchant_raw: event.target.value })}
            />
          </td>
          <td className="px-2 py-2">
            <input
              defaultValue={row.normalized.description}
              className={`w-44 ${IMPORT_PROCESSED_FIELD_CLASS}`}
              aria-label={`Description for row ${row.rowId}`}
              onBlur={(event) => void updateProcessedRow(row.rowId, { description: event.target.value })}
            />
          </td>
          <td className="px-2 py-2">
            <input
              defaultValue={row.normalized.amount == null ? "" : String(row.normalized.amount)}
              type="number"
              step="0.01"
              className={`w-24 ${IMPORT_PROCESSED_FIELD_CLASS}`}
              aria-label={`Amount for row ${row.rowId}`}
              onBlur={(event) => void updateProcessedRow(row.rowId, { amount: Number(event.target.value) })}
            />
          </td>
          <td className="px-2 py-2">
            <select
              defaultValue={row.normalized.direction}
              className={`w-20 ${IMPORT_PROCESSED_FIELD_CLASS}`}
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
              className={`w-36 ${IMPORT_PROCESSED_FIELD_CLASS}`}
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
              className={`w-32 ${IMPORT_PROCESSED_FIELD_CLASS}`}
              aria-label={`Memo for row ${row.rowId}`}
              onBlur={(event) => void updateProcessedRow(row.rowId, { memo: event.target.value || null })}
            />
          </td>
          <td className={IMPORT_TABLE_MUTED_CELL_CLASS}>{row.issues.join("; ")}</td>
        </tr>
      );
    });
  }

  function renderProcessedRowsMobileCards(data: ImportProcessedRowsResponse | null) {
    if (!data || !data.items.length) {
      return (
        <div className={IMPORT_PROCESSED_EMPTY_CLASS}>
          No rows found for the selected filter.
        </div>
      );
    }

    return data.items.map((row) => {
      const accountOptionsForRow = buildImportAccountOptions(accountOptions, row.normalized.account_name);
      const issueSummary = row.issues.length ? row.issues.join("; ") : "No issues";

      return (
        <article
          key={row.rowId}
          className={IMPORT_PROCESSED_CARD_CLASS}
          data-testid={`processed-mobile-card-${row.rowId}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Processed row</p>
              <p className="mt-1 text-sm font-medium text-text-primary">{row.normalized.merchant_raw || "Untitled row"}</p>
            </div>
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                data-testid={`processed-mobile-include-${row.rowId}`}
                defaultChecked={row.include}
                aria-label={`Include row ${row.rowId}`}
                onChange={(event) => void updateProcessedRow(row.rowId, { include: event.target.checked })}
                className="h-4 w-4 rounded border-border-strong bg-surface-field text-accent focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
              Include
            </label>
          </div>

          <div className={IMPORT_PROCESSED_META_CLASS}>
            <span className={IMPORT_PROCESSED_STATUS_CLASS}>{row.status}</span>
            <span>{issueSummary}</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className={IMPORT_PROCESSED_LABEL_CLASS}>
              Date
              <input
                defaultValue={row.normalized.transaction_date || ""}
                type="date"
                className={`w-full ${IMPORT_PROCESSED_FIELD_CLASS}`}
                aria-label={`Date for row ${row.rowId}`}
                onBlur={(event) => void updateProcessedRow(row.rowId, { transaction_date: event.target.value })}
              />
            </label>
            <label className={IMPORT_PROCESSED_LABEL_CLASS}>
              Amount
              <input
                defaultValue={row.normalized.amount == null ? "" : String(row.normalized.amount)}
                type="number"
                step="0.01"
                className={`w-full ${IMPORT_PROCESSED_FIELD_CLASS}`}
                aria-label={`Amount for row ${row.rowId}`}
                onBlur={(event) => void updateProcessedRow(row.rowId, { amount: Number(event.target.value) })}
              />
            </label>
            <label className={IMPORT_PROCESSED_LABEL_CLASS}>
              Merchant
              <input
                defaultValue={row.normalized.merchant_raw}
                className={`w-full ${IMPORT_PROCESSED_FIELD_CLASS}`}
                aria-label={`Merchant for row ${row.rowId}`}
                onBlur={(event) => void updateProcessedRow(row.rowId, { merchant_raw: event.target.value })}
              />
            </label>
            <label className={IMPORT_PROCESSED_LABEL_CLASS}>
              Direction
              <select
                defaultValue={row.normalized.direction}
                className={`w-full ${IMPORT_PROCESSED_FIELD_CLASS}`}
                aria-label={`Direction for row ${row.rowId}`}
                onChange={(event) => void updateProcessedRow(row.rowId, { direction: event.target.value as "outflow" | "inflow" })}
              >
                <option value="outflow">outflow</option>
                <option value="inflow">inflow</option>
              </select>
            </label>
          </div>

          <label className={`mt-3 ${IMPORT_PROCESSED_LABEL_CLASS}`}>
            Description
            <input
              defaultValue={row.normalized.description}
              className={`w-full ${IMPORT_PROCESSED_FIELD_CLASS}`}
              aria-label={`Description for row ${row.rowId}`}
              onBlur={(event) => void updateProcessedRow(row.rowId, { description: event.target.value })}
            />
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className={IMPORT_PROCESSED_LABEL_CLASS}>
              Category
              <select
                defaultValue={row.normalized.category_final || ""}
                className={`w-full ${IMPORT_PROCESSED_FIELD_CLASS}`}
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
            </label>
            <label className={IMPORT_PROCESSED_LABEL_CLASS}>
              Account
              <ProcessedRowAccountSelect
                rowId={row.rowId}
                accountOptions={accountOptionsForRow}
                testIdPrefix="processed-mobile-account"
                value={resolveImportAccountValue(accountOptions, row.normalized.account_name)}
                onChange={(value) => void updateProcessedRow(row.rowId, { account_name: value })}
              />
            </label>
          </div>

          <label className={`mt-3 ${IMPORT_PROCESSED_LABEL_CLASS}`}>
            Memo
            <input
              defaultValue={row.normalized.memo || ""}
              data-testid={`processed-mobile-memo-${row.rowId}`}
              className={`w-full ${IMPORT_PROCESSED_FIELD_CLASS}`}
              aria-label={`Memo for row ${row.rowId}`}
              onBlur={(event) => void updateProcessedRow(row.rowId, { memo: event.target.value || null })}
            />
          </label>
        </article>
      );
    });
  }

  function renderReconciliationMobileCards() {
    if (!reconciliation) {
      return (
        <div className={IMPORT_RECONCILIATION_EMPTY_CLASS}>
          No reconciliation data loaded yet.
        </div>
      );
    }

    return reconciliation.accounts.map((entry) => {
      const actionMode = getReconciliationActionMode(entry);
      const selectedAccountId = reconciliationAssignments[entry.accountKey] || "";
      const recommendationText = getReconciliationRecommendationText(entry);

      return (
        <article
          key={entry.accountKey}
          className={IMPORT_RECONCILIATION_CARD_CLASS}
          data-testid={`reconciliation-mobile-card-${entry.accountKey}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-text-primary">{entry.accountName}</p>
              <p className="mt-1 text-xs text-text-muted">{entry.status}</p>
            </div>
            <span className={IMPORT_RECONCILIATION_BADGE_CLASS}>
              {entry.includedValidRows}/{entry.totalRows} rows
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className={IMPORT_RECONCILIATION_TERM_CLASS}>Imported</dt>
              <dd className={IMPORT_RECONCILIATION_VALUE_CLASS}>{money(entry.importedNet)}</dd>
            </div>
            <div>
              <dt className={IMPORT_RECONCILIATION_TERM_CLASS}>Ledger</dt>
              <dd className={IMPORT_RECONCILIATION_VALUE_CLASS}>{money(entry.existingWindowNet)}</dd>
            </div>
            <div>
              <dt className={IMPORT_RECONCILIATION_TERM_CLASS}>Discrepancy</dt>
              <dd className={IMPORT_RECONCILIATION_VALUE_CLASS}>{money(entry.discrepancyAmount)}</dd>
            </div>
            <div>
              <dt className={IMPORT_RECONCILIATION_TERM_CLASS}>Recommendation</dt>
              <dd className={IMPORT_RECONCILIATION_MUTED_VALUE_CLASS}>{recommendationText}</dd>
            </div>
          </dl>

          <div className="mt-4">
            {actionMode === "assign_account" ? (
              <div className="grid gap-2">
                <select
                  value={selectedAccountId}
                  onChange={(event) =>
                    setReconciliationAssignments((previous) => ({
                      ...previous,
                      [entry.accountKey]: event.target.value
                    }))
                  }
                  data-testid={`reconcile-mobile-account-select-${entry.accountKey}`}
                  className={`${IMPORT_SELECT_FIELD_CLASS} py-2 text-sm`}
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
                  data-testid={`reconcile-mobile-assign-${entry.accountKey}`}
                  className={`${reconciliationWarningActionClass} px-3 py-2 text-sm`}
                >
                  {isAssigningAccount ? "Assigning..." : "Assign account"}
                </button>
              </div>
            ) : (
              <span className={IMPORT_RECONCILIATION_NO_ACTION_CLASS}>No action</span>
            )}
          </div>
        </article>
      );
    });
  }

  function getReconciliationRecommendationText(entry: ImportReconciliationAccount) {
    return entry.recommendations.length > 0
      ? entry.recommendations.map((recommendation) => recommendation.message).join(" ")
      : "None";
  }

  return (
    <div className="space-y-6" data-testid="import-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Import Transactions</h2>
        <p className="mt-1 text-text-secondary">Upload CSV, OFX, or QFX exports from any bank. Our AI will automatically categorize and format them.</p>
      </header>

      {globalMessage ? (
        <StatusMessage>{globalMessage}</StatusMessage>
      ) : null}

      <section className={IMPORT_UPLOAD_SECTION_CLASS}>
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
            setWorkflowGuidance("");
            if (nextFile) {
              dispatch({ type: "file_selected", fileName: nextFile.name });
            } else {
              dispatch({ type: "clear_notice" });
            }
          }}
        />

        <div className={IMPORT_UPLOAD_STATE_PANEL_CLASS}>
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className={IMPORT_SELECTED_ICON_CLASS}>
                <FileText className="h-8 w-8 text-accent" />
              </div>
              <p className="text-lg font-medium text-accent" data-testid="import-selected-file">{file.name}</p>
              <p className="text-sm text-text-secondary">Ready to process. Upload again to replace this file.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={IMPORT_UPLOAD_ICON_CLASS}>
                <UploadCloud className="h-8 w-8 text-text-muted" aria-hidden="true" />
              </div>
              <p className="text-lg font-medium text-text-primary">Upload a CSV file to begin</p>
              <p className="text-sm text-text-secondary">Supports CSV, OFX, QFX exports from major banks.</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={openFilePicker}
          data-testid="import-upload"
          className={IMPORT_SECONDARY_ACTION_CLASS}
        >
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
          Upload CSV
        </button>

        <button
          type="button"
          onClick={() => void processFile()}
          data-testid="import-process"
          disabled={!file || state.isAnalyzing}
          className={IMPORT_PRIMARY_ACTION_CLASS}
        >
          {state.isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Processing via AI...
            </>
          ) : (
            "Process Transactions"
          )}
        </button>
      </section>

      {state.details ? (
        <section className={IMPORT_SECTION_PANEL_CLASS}>
          <div className="flex items-center gap-2 text-accent">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <h3 className="text-sm font-medium">Analyzed {state.details.importJob.rowCount} rows in {state.details.importJob.fileName}</h3>
          </div>
          <div className={IMPORT_PREVIEW_TABLE_WRAP_CLASS}>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Analyzed import preview rows</caption>
              <thead className={IMPORT_PREVIEW_TABLE_HEAD_CLASS}>
                <tr>
                  <th scope="col" className="px-3 py-2">Date</th>
                  <th scope="col" className="px-3 py-2">Merchant</th>
                  <th scope="col" className="px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody className={IMPORT_PREVIEW_TABLE_BODY_CLASS}>
                {state.details.processedPreview.slice(0, 5).map((row) => (
                  <tr key={row.rowId}>
                    <td className={IMPORT_PREVIEW_TABLE_CELL_CLASS}>{row.normalized.transaction_date || "-"}</td>
                    <td className={IMPORT_PREVIEW_TABLE_STRONG_CELL_CLASS}>{row.normalized.merchant_raw}</td>
                    <td className={IMPORT_PREVIEW_TABLE_STRONG_CELL_CLASS}>{row.normalized.amount == null ? "-" : money(row.normalized.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <details className={IMPORT_ADVANCED_DETAILS_CLASS} data-testid="advanced-import-controls" open>
        <summary className={IMPORT_ADVANCED_SUMMARY_CLASS}>Advanced Import Controls</summary>
        <div className="space-y-4 px-4 pb-4">
          <section className={IMPORT_SECTION_PANEL_CLASS} data-testid="mapping-panel">
            <h3 className={IMPORT_SECTION_TITLE_CLASS}>Mapping Review</h3>

            {state.details ? (
              <>
                <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  <div className={IMPORT_MAPPING_TEMPLATE_CARD_CLASS}>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className={IMPORT_TEMPLATE_LABEL_CLASS}>
                        Mapping template
                        <select
                          value={selectedTemplateId}
                          onChange={(event) => setSelectedTemplateId(event.target.value)}
                          data-testid="mapping-template-select"
                          className={IMPORT_SELECT_FIELD_CLASS}
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
                        className={IMPORT_SMALL_SECONDARY_ACTION_CLASS}
                      >
                        Apply Template
                      </button>
                    </div>
                    <p className={IMPORT_HELPER_TEXT_CLASS}>
                      {(mappingTemplates.find((entry) => entry.id === selectedTemplateId) || mappingTemplates[0])?.description}
                    </p>
                    {mappingTemplateNotice ? (
                      <p className={IMPORT_NOTICE_TEXT_CLASS} data-testid="mapping-template-notice">
                        {mappingTemplateNotice}
                      </p>
                    ) : null}
                  </div>

                  {CANONICAL_IMPORT_FIELDS.map((field) => (
                    <label key={field} className={IMPORT_FIELD_LABEL_CLASS}>
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
                        className={IMPORT_SELECT_FIELD_CLASS}
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
                    className={IMPORT_SMALL_SECONDARY_ACTION_CLASS}
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Save Mapping
                  </button>
                  <button
                    type="button"
                    onClick={() => void commitImport()}
                    disabled={state.isCommitting}
                    data-testid="commit-import"
                    className={IMPORT_SMALL_PRIMARY_ACTION_CLASS}
                  >
                    {state.isCommitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Commit Import
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">Analyze a CSV to review mapping.</p>
            )}

            <pre
              className={IMPORT_COMMIT_JSON_CLASS}
              data-testid="import-summary"
            >
              {commitSummaryJson}
            </pre>
          </section>

          <section className={IMPORT_SECTION_PANEL_CLASS} data-testid="processed-panel">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={IMPORT_SECTION_TITLE_CLASS}>Processed Records Editor</h3>
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
                  className={IMPORT_SELECT_FIELD_CLASS}
                >
                  <option value="">All statuses</option>
                  <option value="valid">Valid</option>
                  <option value="invalid">Invalid</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="excluded">Excluded</option>
                </select>
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

            <p className={IMPORT_HELPER_TEXT_CLASS} data-testid="processed-summary">
              {state.processedRows
                ? `Total: ${state.processedRows.summary.all} · Included: ${state.processedRows.summary.included} · Valid: ${state.processedRows.summary.valid} · Invalid: ${state.processedRows.summary.invalid} · Duplicate: ${state.processedRows.summary.duplicate} · Excluded: ${state.processedRows.summary.excluded}`
                : "No processed rows loaded yet."}
            </p>

            <div className="mt-3 space-y-3 lg:hidden" data-testid="processed-mobile-cards">
              {renderProcessedRowsMobileCards(state.processedRows)}
            </div>

            <div
              className="mt-3 hidden overflow-auto lg:block"
              tabIndex={0}
              aria-label="Processed records table"
            >
              <table className="min-w-[1100px] w-full text-xs" data-testid="processed-table">
                <caption className="sr-only">Processed row editor table</caption>
                <thead>
                  <tr className={IMPORT_TABLE_HEAD_ROW_CLASS}>
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
            <section className={IMPORT_SECTION_PANEL_CLASS} data-testid="reconciliation-panel">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={IMPORT_SECTION_TITLE_CLASS}>Reconciliation</h3>
                <button
                  type="button"
                  onClick={() => {
                    if (currentImportId) {
                      void refreshProcessedRows(currentImportId);
                    }
                  }}
                  disabled={!currentImportId || isReconciliationLoading}
                  className={IMPORT_RECONCILIATION_REFRESH_ACTION_CLASS}
                >
                  {isReconciliationLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Refresh
                </button>
              </div>

              {!currentImportId ? (
                <p className={IMPORT_HELPER_TEXT_CLASS}>Analyze a CSV to compute reconciliation.</p>
              ) : reconciliation ? (
                <>
                  <p className={IMPORT_HELPER_TEXT_CLASS} data-testid="reconciliation-summary">
                    Accounts: {reconciliation.summary.accountsTotal}
                    {" · "}Balanced: {reconciliation.summary.balancedAccounts}
                    {" · "}Needs review: {reconciliation.summary.needsReviewAccounts}
                    {" · "}Missing account links: {reconciliation.summary.missingAccounts}
                    {" · "}Net discrepancy: {money(reconciliation.summary.discrepancyAmount)}
                  </p>
                  <div className="mt-3 space-y-3 lg:hidden" data-testid="reconciliation-mobile-cards">
                    {renderReconciliationMobileCards()}
                  </div>
                  <div className="mt-3 hidden overflow-auto lg:block">
                    <table className="min-w-[1100px] w-full text-xs" data-testid="reconciliation-table">
                      <caption className="sr-only">Reconciliation summary by account</caption>
                      <thead>
                        <tr className={IMPORT_TABLE_HEAD_ROW_CLASS}>
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
                            <tr key={entry.accountKey} className={IMPORT_TABLE_ROW_CLASS}>
                              <td className={IMPORT_TABLE_PRIMARY_CELL_CLASS}>{entry.accountName}</td>
                              <td className={IMPORT_TABLE_SECONDARY_CELL_CLASS}>{entry.status}</td>
                              <td className={IMPORT_TABLE_SECONDARY_CELL_CLASS}>{entry.includedValidRows}/{entry.totalRows}</td>
                              <td className={IMPORT_TABLE_PRIMARY_CELL_CLASS}>{money(entry.importedNet)}</td>
                              <td className={IMPORT_TABLE_SECONDARY_CELL_CLASS}>{money(entry.existingWindowNet)}</td>
                              <td className={IMPORT_TABLE_PRIMARY_CELL_CLASS}>{money(entry.discrepancyAmount)}</td>
                              <td className={IMPORT_TABLE_MUTED_CELL_CLASS}>
                                {getReconciliationRecommendationText(entry)}
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
                                      className={`${IMPORT_SELECT_FIELD_CLASS} text-xs`}
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
                                      className={`${reconciliationWarningActionClass} px-2 py-1 text-xs`}
                                    >
                                      {isAssigningAccount ? "Assigning..." : "Assign account"}
                                    </button>
                                  </div>
                                ) : (
                                  <span className={IMPORT_RECONCILIATION_SMALL_NO_ACTION_CLASS}>No action</span>
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
                <p className={IMPORT_HELPER_TEXT_CLASS}>No reconciliation data loaded yet.</p>
              )}
            </section>
          ) : null}

          <section className={IMPORT_SECTION_PANEL_CLASS}>
            <h3 className={IMPORT_SECTION_TITLE_CLASS}>Recent Imports</h3>
            <div className="mt-3 space-y-2" data-testid="import-list">
              {imports.map((entry) => (
                <div key={entry.id} className={IMPORT_RECENT_IMPORT_ROW_CLASS}>
                  <div>
                    <strong className="text-text-primary">{entry.fileName}</strong>
                    <p className="text-xs text-text-secondary">
                      {entry.status} · {entry.rowCount} rows · {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openImport(entry.id)}
                    aria-label={`Open import ${entry.fileName}`}
                    className={IMPORT_RECENT_IMPORT_ACTION_CLASS}
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </details>
    </div>
  );
}
