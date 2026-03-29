export function ProcessedRecordsToolbar(props: {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}) {
  const { statusFilter, onStatusFilterChange } = props;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="processed-status-filter" className="sr-only">
        Processed rows status
      </label>
      <select
        id="processed-status-filter"
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value)}
        data-testid="processed-status-filter"
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
      >
        <option value="">All statuses</option>
        <option value="valid">Valid</option>
        <option value="invalid">Invalid</option>
        <option value="duplicate">Duplicate</option>
        <option value="excluded">Excluded</option>
      </select>
    </div>
  );
}
