import type { InsightFactsResponse } from "@/lib/api/types";

export type HomeStory = { kind: "change" | "review" | "commitments"; count?: number };

export function describeOperatingFlow(flow: InsightFactsResponse["operatingFlow"]) {
  if (!flow) return "Choose one currency to see operating flow.";
  if (flow.transition === "surplus_to_deficit") return "Spending moved this period from a surplus into a deficit.";
  if (flow.transition === "deficit_to_surplus") return "Income and spending moved this period back into a surplus.";
  if (flow.current.net < 0) return "Expenses are currently running ahead of income.";
  if (flow.current.net > 0) return "Income is currently running ahead of expenses.";
  return "Income and expenses are currently balanced.";
}

export function buildHomeStories(insights: InsightFactsResponse) {
  const supporting: HomeStory[] = [];
  if (insights.reviewTransactions.length) supporting.push({ kind: "review", count: insights.reviewTransactions.length });
  if (
    (insights.recurring?.priceDrift?.length || 0)
    + (insights.recurring?.upcoming30Days?.length || 0)
    + (insights.recurring?.possibleRecurringCount || 0) > 0
  ) {
    supporting.push({ kind: "commitments", count: insights.recurring?.upcoming30Days?.length || 0 });
  }
  return { primary: { kind: "change" } as HomeStory, supporting: supporting.slice(0, 2) };
}
