import type { ImportAccountOption, ImportIssueVisibilitySummary } from "./accountAssignment";
import { shouldShowImportIssues } from "./accountAssignment";

interface ImportAccountSelectorProps {
  accountOptions: ImportAccountOption[];
  value: string;
  isApplying: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function ImportAccountSelector({
  accountOptions,
  value,
  isApplying,
  disabled = false,
  onChange
}: ImportAccountSelectorProps) {
  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-900/40 px-3 py-3" data-testid="import-account-panel">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-64 flex-1 gap-1 text-xs text-neutral-300">
          Import into account
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            data-testid="import-account-select"
            disabled={isApplying || disabled}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-200 outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Select account</option>
            {accountOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        Row-level account edits stay available below for exceptions.
      </p>
    </div>
  );
}

interface ProcessedRowAccountSelectProps {
  rowId: string;
  accountOptions: ImportAccountOption[];
  value: string;
  onChange: (value: string) => void;
}

export function ProcessedRowAccountSelect({
  rowId,
  accountOptions,
  value,
  onChange
}: ProcessedRowAccountSelectProps) {
  return (
    <select
      value={value}
      className="w-44 rounded border border-neutral-500 bg-neutral-900 px-2 py-1 text-neutral-100 placeholder:text-neutral-400 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/40"
      aria-label={`Account for row ${rowId}`}
      data-testid={`processed-account-${rowId}`}
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
    <section className="rounded-xl border border-amber-900/60 bg-amber-500/5 p-4" data-testid="issues-panel">
      <h3 className="text-sm font-medium text-amber-100">Issues found</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-amber-800/80 bg-neutral-950 px-2 py-1 text-xs text-amber-100"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
