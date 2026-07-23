import type { InsightDriver, InsightFactsResponse } from "@/lib/api/types";

type FlowPoint = { income: number; spend: number };

export type DriverDisplayRow = InsightDriver & { groupedCount?: number };

export function getSharedFlowMaximum(points: FlowPoint[]) {
  return Math.max(0, ...points.flatMap((point) => [point.income, point.spend]));
}

export function buildDriverDisplayRows(drivers: InsightDriver[]): DriverDisplayRow[] {
  const ranked = drivers
    .filter((driver) => driver.delta !== 0)
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
  if (ranked.length <= 4) return ranked;

  const visible = ranked.slice(0, 3);
  const remainder = ranked.slice(3);
  const delta = remainder.reduce((sum, driver) => sum + driver.delta, 0);
  const current = remainder.reduce((sum, driver) => sum + driver.current, 0);
  const previous = remainder.reduce((sum, driver) => sum + driver.previous, 0);

  return [
    ...visible,
    {
      key: "__other__",
      label: `Other (${remainder.length})`,
      current,
      previous,
      delta,
      contributionPercent: remainder.reduce((sum, driver) => sum + driver.contributionPercent, 0),
      countDelta: remainder.reduce((sum, driver) => sum + driver.countDelta, 0),
      meaningful: false,
      evidenceTransactionIds: remainder.flatMap((driver) => driver.evidenceTransactionIds).slice(0, 5),
      evidence: remainder.flatMap((driver) => driver.evidence).slice(0, 5),
      groupedCount: remainder.length
    }
  ];
}

export function buildInsightHeadline(change: InsightFactsResponse["changeAttribution"]) {
  if (!change) return "More history is needed to explain what changed.";
  if (!change.meaningful) return "Tracked expenses are broadly stable for this comparison.";

  const leading = change.dimensions.category.find((driver) => driver.meaningful)
    || change.dimensions.category[0];
  if (!leading) {
    return change.totalExpenseDelta > 0
      ? "Expenses rose, without one dominant category."
      : "Expenses fell, without one dominant category.";
  }
  const direction = change.totalExpenseDelta > 0 ? "increase" : "decrease";
  return `${leading.label} explains ${Math.round(leading.contributionPercent)}% of the expense ${direction}.`;
}
