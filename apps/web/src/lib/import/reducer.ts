import type { CommitImportResponse, ImportDetailsResponse, ImportJob, ImportProcessedRowsResponse } from "@/lib/api/types";

export interface ImportWorkflowState {
  selectedFileName: string | null;
  isAnalyzing: boolean;
  isSavingMapping: boolean;
  isCommitting: boolean;
  currentImport: ImportJob | null;
  details: ImportDetailsResponse | null;
  processedRows: ImportProcessedRowsResponse | null;
  commitResult: CommitImportResponse | null;
  error: string | null;
  notice: string | null;
}

export type ImportWorkflowAction =
  | { type: "file_selected"; fileName: string }
  | { type: "analyze_started" }
  | { type: "analyze_succeeded"; importJob: ImportJob; details: ImportDetailsResponse; processedRows: ImportProcessedRowsResponse }
  | { type: "mapping_save_started" }
  | { type: "mapping_save_succeeded"; details: ImportDetailsResponse; processedRows: ImportProcessedRowsResponse }
  | { type: "commit_started" }
  | { type: "commit_succeeded"; result: CommitImportResponse }
  | { type: "error"; message: string }
  | { type: "clear_notice" };

export const initialImportWorkflowState: ImportWorkflowState = {
  selectedFileName: null,
  isAnalyzing: false,
  isSavingMapping: false,
  isCommitting: false,
  currentImport: null,
  details: null,
  processedRows: null,
  commitResult: null,
  error: null,
  notice: null
};

export function importWorkflowReducer(
  state: ImportWorkflowState,
  action: ImportWorkflowAction
): ImportWorkflowState {
  switch (action.type) {
    case "file_selected":
      return {
        ...state,
        selectedFileName: action.fileName,
        error: null,
        notice: null,
        commitResult: null
      };
    case "analyze_started":
      return {
        ...state,
        isAnalyzing: true,
        error: null,
        notice: null,
        commitResult: null
      };
    case "analyze_succeeded":
      return {
        ...state,
        isAnalyzing: false,
        currentImport: action.importJob,
        details: action.details,
        processedRows: action.processedRows,
        error: null,
        notice: "Import analyzed."
      };
    case "mapping_save_started":
      return {
        ...state,
        isSavingMapping: true,
        error: null,
        notice: null
      };
    case "mapping_save_succeeded":
      return {
        ...state,
        isSavingMapping: false,
        details: action.details,
        processedRows: action.processedRows,
        error: null,
        notice: "Mapping saved."
      };
    case "commit_started":
      return {
        ...state,
        isCommitting: true,
        error: null,
        notice: null,
        commitResult: null
      };
    case "commit_succeeded":
      return {
        ...state,
        isCommitting: false,
        commitResult: action.result,
        error: null,
        notice: "Import committed."
      };
    case "error":
      return {
        ...state,
        isAnalyzing: false,
        isSavingMapping: false,
        isCommitting: false,
        error: action.message,
        notice: null
      };
    case "clear_notice":
      return {
        ...state,
        notice: null
      };
    default:
      return state;
  }
}
