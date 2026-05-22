import type { ImportAccountOption, ImportIssueVisibilitySummary } from "./accountAssignment";
import { shouldShowImportIssues } from "./accountAssignment";

interface ImportAccountSelectorProps {
  accountOptions: ImportAccountOption[];
  value: string;
  isApplying: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
  selectClassName?: string;
  showHelper?: boolean;
  testId?: string;
  onChange: (value: string) => void;
}

export function ImportAccountSelector({
  accountOptions,
  value,
  isApplying,
  disabled = false,
  label = "Import into account",
  className = "grid gap-1 text-xs text-text-secondary",
  selectClassName = "rounded-lg border border-border-subtle bg-surface-panel px-2 py-1.5 text-text-primary outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60",
  showHelper = false,
  testId = "import-account-select",
  onChange
}: ImportAccountSelectorProps) {
  return (
    <label className={className} data-testid="import-account-selector">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
        disabled={isApplying || disabled}
        className={selectClassName}
      >
        <option value="">Select account</option>
        {accountOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {showHelper ? (
        <span className="text-xs font-normal text-text-secondary">
          Row-level account edits stay available below for exceptions.
        </span>
      ) : null}
    </label>
  );
}

interface ProcessedRowAccountSelectProps {
  rowId: string;
  accountOptions: ImportAccountOption[];
  value: string;
  className?: string;
  testIdPrefix?: string;
  onChange: (value: string) => void;
}

export function ProcessedRowAccountSelect({
  rowId,
  accountOptions,
  value,
  className = "w-full md:w-44",
  testIdPrefix = "processed-account",
  onChange
}: ProcessedRowAccountSelectProps) {
  return (
    <select
      value={value}
      className={`${className} rounded border border-border-strong bg-surface-field px-2 py-1 text-text-primary placeholder:text-text-secondary outline-none transition focus:border-accent focus:ring-1 focus:ring-focus-ring`}
      aria-label={`Account for row ${rowId}`}
      data-testid={`${testIdPrefix}-${rowId}`}
      onChange={(event) => onChange(event.target.value)}
    >
      {accountOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface ImportIssuesSummaryPanelProps {
  summary: ImportIssueVisibilitySummary;
}

export function ImportIssuesSummaryPanel({ summary }: ImportIssuesSummaryPanelProps) {
  if (!shouldShowImportIssues(summary)) {
    return null;
  }

  const items: string[] = [];
  if (summary.invalidRows > 0) {
    items.push(`${summary.invalidRows} invalid rows`);
  }
  if (summary.duplicateRows > 0) {
    items.push(`${summary.duplicateRows} duplicate rows`);
  }
  if (summary.lowDirectionConfidenceRows > 0) {
    items.push(`${summary.lowDirectionConfidenceRows} rows need direction review`);
  }
  if (summary.multipleAccountGroups) {
    items.push("Multiple account groups detected");
  }
  if (summary.hasMissingAccount) {
    items.push("Missing account links");
  }
  if (summary.hasDiscrepancy) {
    items.push("Reconciliation discrepancy detected");
  }

  return (
    <section className="rounded-xl border border-warning/35 bg-warning-soft p-4" data-testid="issues-panel">
      <h3 className="text-sm font-medium text-warning">Issues found</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-warning/40 bg-surface-panel px-2 py-1 text-xs text-warning"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
