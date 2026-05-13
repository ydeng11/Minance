"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, CreditCard, Repeat, Wallet } from "lucide-react";
import {
  buildSummarySecondaryState,
  buildSummarySparklineSeries,
  getSummaryValueClassName
} from "../presentation";
import { money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse } from "@/lib/api/types";
import { ExplorerCard } from "./ExplorerCard";
import { ExplorerMiniSparkline } from "./ExplorerMiniSparkline";
import { useApi } from "@/hooks/useApi";
import { SuggestionsCallout } from "@/components/recurrings/SuggestionsCallout";

interface ExplorerSummaryBandProps {
  summary: ExplorerAnalyticsResponse["summary"] | null;
  comparison: ExplorerAnalyticsResponse["comparison"] | null;
  loading?: boolean;
}

const HERO_CARD_CLASS_NAME =
  "rounded-[34px] border border-border-subtle bg-surface-panel/90 p-6 shadow-panel xl:col-span-5";
const SUPPORT_CARD_CLASS_NAME = "min-h-[196px]";
const SUPPORT_CARD_CONTENT_CLASS_NAME = "flex h-full flex-col gap-4";
const CONTEXT_BAND_CLASS_NAME = "mt-auto rounded-[22px] border border-border-subtle bg-surface-field/70 px-4 py-3";
const SKELETON_LINE_CLASS_NAME = "h-4 w-24 animate-pulse rounded-full bg-surface-field";
const SKELETON_VALUE_CLASS_NAME = "h-10 w-32 animate-pulse rounded-2xl bg-surface-field";
const SKELETON_CAPTION_CLASS_NAME = "h-4 w-28 animate-pulse rounded-full bg-surface-field";
const HERO_SKELETON_VALUE_CLASS_NAME = "h-16 w-48 animate-pulse rounded-[24px] bg-surface-field";
const SKELETON_PANEL_CLASS_NAME = "h-24 animate-pulse rounded-[24px] bg-surface-field";
const HERO_LABEL_CLASS_NAME = "text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted";
const METRIC_LABEL_CLASS_NAME = "text-[11px] font-medium uppercase tracking-[0.22em] text-text-muted";
const METRIC_VALUE_CLASS_NAME = "mt-4 font-semibold tracking-tight text-text-primary";
const HERO_ICON_CLASS_NAME =
  "flex h-12 w-12 items-center justify-center rounded-[18px] border border-accent/30 bg-accent-soft text-accent";
const SUPPORT_ICON_CLASS_NAME =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent-soft text-accent";
const HERO_CONTEXT_PANEL_CLASS_NAME = "mt-6 rounded-[24px] border border-border-subtle bg-surface-field/60 p-4";
const CONTEXT_META_ROW_CLASS_NAME =
  "flex items-center justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted";
const CONTEXT_LABEL_CLASS_NAME = "text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted";
const HERO_CONTEXT_TEXT_CLASS_NAME = "mt-2 text-sm text-text-secondary";
const CONTEXT_TEXT_CLASS_NAME = "mt-1 text-sm text-text-secondary";
const SPARKLINE_STROKE_CLASS_NAME = "stroke-accent";

function formatDelta(delta: { delta: number; percent: number | null } | null | undefined, moneyMode = true) {
  if (!delta) {
    return null;
  }

  const prefix = delta.delta > 0 ? "+" : "";
  const value = moneyMode ? money(delta.delta) : `${prefix}${delta.delta}`;
  if (delta.percent == null) {
    return value;
  }
  return `${value} · ${prefix}${delta.percent}%`;
}

export function ExplorerSummaryBand({ summary, comparison, loading }: ExplorerSummaryBandProps) {
  const api = useApi();
  const [suggestionsCount, setSuggestionsCount] = useState(0);

  const currentSummary = summary?.current;
  const summaryDelta = summary?.delta;
  const comparisonEnabled = comparison?.enabled ?? false;
  const sparklineSeries = buildSummarySparklineSeries(summary?.sparkline);
  const spendState = buildSummarySecondaryState({
    comparisonEnabled,
    deltaLabel: "Compared with previous period",
    sparkline: sparklineSeries.spend
  });
  const incomeState = buildSummarySecondaryState({
    comparisonEnabled,
    deltaLabel: "Compared with previous period",
    sparkline: sparklineSeries.income
  });
  const netState = buildSummarySecondaryState({
    comparisonEnabled,
    deltaLabel: "Compared with previous period",
    sparkline: sparklineSeries.net
  });
  const spendDeltaText = formatDelta(summaryDelta?.totalSpend);
  const incomeDeltaText = formatDelta(summaryDelta?.totalIncome);
  const netDeltaText = formatDelta(summaryDelta?.netFlow);
  const recurringDeltaText = formatDelta(summaryDelta?.recurringSpend);

  useEffect(() => {
    async function loadSuggestionsCount() {
      try {
        const response = await api.recurrings.getSuggestions({ count_only: true });
        if ("count" in response) {
          setSuggestionsCount(response.count);
        }
      } catch {
        // Silently ignore errors - suggestions callout is optional
      }
    }
    void loadSuggestionsCount();
  }, [api]);

  return (
    <div className="grid gap-4 xl:grid-cols-12" data-testid="explorer-summary-band">
      <section
        className={HERO_CARD_CLASS_NAME}
        data-testid="explorer-summary-hero"
      >
        {loading ? (
          <div className="space-y-4">
            <div className={SKELETON_LINE_CLASS_NAME} />
            <div className={HERO_SKELETON_VALUE_CLASS_NAME} />
            <div className={SKELETON_PANEL_CLASS_NAME} />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={HERO_LABEL_CLASS_NAME}>Net flow</p>
                <p className={`mt-5 font-display font-semibold tracking-tight text-text-primary ${getSummaryValueClassName(currentSummary ? money(currentSummary.netFlow) : "$0.00")}`}>
                  {currentSummary ? money(currentSummary.netFlow) : "$0.00"}
                </p>
              </div>
              <div className={HERO_ICON_CLASS_NAME}>
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <div className={HERO_CONTEXT_PANEL_CLASS_NAME}>
              {netState.mode === "sparkline" ? (
                <>
                  <div className={CONTEXT_META_ROW_CLASS_NAME}>
                    <span>{netState.label}</span>
                    <span>within current filters</span>
                  </div>
                  <ExplorerMiniSparkline
                    data={sparklineSeries.net}
                    testId="explorer-summary-sparkline-net"
                    strokeClassName={SPARKLINE_STROKE_CLASS_NAME}
                  />
                </>
              ) : (
                <>
                  <p className={CONTEXT_LABEL_CLASS_NAME}>{netState.label}</p>
                  <p className={HERO_CONTEXT_TEXT_CLASS_NAME}>{netDeltaText || "No prior-period delta available."}</p>
                </>
              )}
            </div>
          </>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:col-span-7 xl:grid-cols-3" data-testid="explorer-summary-support-grid">
        <ExplorerCard className={SUPPORT_CARD_CLASS_NAME} contentClassName={SUPPORT_CARD_CONTENT_CLASS_NAME}>
          {loading ? (
            <div className="space-y-4">
              <div className={SKELETON_LINE_CLASS_NAME} />
              <div className={SKELETON_VALUE_CLASS_NAME} />
              <div className={SKELETON_CAPTION_CLASS_NAME} />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={METRIC_LABEL_CLASS_NAME}>Total spend</p>
                  <p className={`${METRIC_VALUE_CLASS_NAME} ${getSummaryValueClassName(currentSummary ? money(currentSummary.totalSpend) : "$0.00")}`}>
                    {currentSummary ? money(currentSummary.totalSpend) : "$0.00"}
                  </p>
                </div>
                <div className={SUPPORT_ICON_CLASS_NAME}>
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
              <div className={CONTEXT_BAND_CLASS_NAME}>
                {spendState.mode === "sparkline" ? (
                  <>
                    <div className={CONTEXT_META_ROW_CLASS_NAME}>
                      <span>{spendState.label}</span>
                      <span>within current filters</span>
                    </div>
                    <ExplorerMiniSparkline
                      data={sparklineSeries.spend}
                      testId="explorer-summary-sparkline-spend"
                      strokeClassName={SPARKLINE_STROKE_CLASS_NAME}
                    />
                  </>
                ) : (
                  <>
                    <p className={CONTEXT_LABEL_CLASS_NAME}>{spendState.label}</p>
                    <p className={CONTEXT_TEXT_CLASS_NAME}>{spendDeltaText || "No prior-period delta available."}</p>
                  </>
                )}
              </div>
            </>
          )}
        </ExplorerCard>

        <ExplorerCard className={SUPPORT_CARD_CLASS_NAME} contentClassName={SUPPORT_CARD_CONTENT_CLASS_NAME}>
          {loading ? (
            <div className="space-y-4">
              <div className={SKELETON_LINE_CLASS_NAME} />
              <div className={SKELETON_VALUE_CLASS_NAME} />
              <div className={SKELETON_CAPTION_CLASS_NAME} />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={METRIC_LABEL_CLASS_NAME}>Total income</p>
                  <p className={`${METRIC_VALUE_CLASS_NAME} ${getSummaryValueClassName(currentSummary ? money(currentSummary.totalIncome) : "$0.00")}`}>
                    {currentSummary ? money(currentSummary.totalIncome) : "$0.00"}
                  </p>
                </div>
                <div className={SUPPORT_ICON_CLASS_NAME}>
                  <ArrowDownRight className="h-5 w-5" />
                </div>
              </div>
              <div className={CONTEXT_BAND_CLASS_NAME}>
                {incomeState.mode === "sparkline" ? (
                  <>
                    <div className={CONTEXT_META_ROW_CLASS_NAME}>
                      <span>{incomeState.label}</span>
                      <span>within current filters</span>
                    </div>
                    <ExplorerMiniSparkline
                      data={sparklineSeries.income}
                      testId="explorer-summary-sparkline-income"
                      strokeClassName={SPARKLINE_STROKE_CLASS_NAME}
                    />
                  </>
                ) : (
                  <>
                    <p className={CONTEXT_LABEL_CLASS_NAME}>{incomeState.label}</p>
                    <p className={CONTEXT_TEXT_CLASS_NAME}>{incomeDeltaText || "No prior-period delta available."}</p>
                  </>
                )}
              </div>
            </>
          )}
        </ExplorerCard>

        <ExplorerCard className={SUPPORT_CARD_CLASS_NAME} contentClassName={SUPPORT_CARD_CONTENT_CLASS_NAME}>
          {loading ? (
            <div className="space-y-4">
              <div className={SKELETON_LINE_CLASS_NAME} />
              <div className={SKELETON_VALUE_CLASS_NAME} />
              <div className={SKELETON_CAPTION_CLASS_NAME} />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={METRIC_LABEL_CLASS_NAME}>Recurring spend</p>
                  <p className={`${METRIC_VALUE_CLASS_NAME} ${getSummaryValueClassName(currentSummary ? money(currentSummary.recurringSpend) : "$0.00")}`}>
                    {currentSummary ? money(currentSummary.recurringSpend) : "$0.00"}
                  </p>
                </div>
                <div className={SUPPORT_ICON_CLASS_NAME}>
                  <Repeat className="h-5 w-5" />
                </div>
              </div>
              <div className={CONTEXT_BAND_CLASS_NAME}>
                <p className={CONTEXT_LABEL_CLASS_NAME}>
                  {comparisonEnabled ? "Compared with previous period" : "Selected range"}
                </p>
                <p className={CONTEXT_TEXT_CLASS_NAME}>
                  {comparisonEnabled ? (recurringDeltaText || "No prior-period delta available.") : "Watch this line when fixed costs start crowding the ledger."}
                </p>
                {suggestionsCount > 0 ? (
                  <div className="mt-2">
                    <SuggestionsCallout count={suggestionsCount} />
                  </div>
                ) : null}
              </div>
            </>
          )}
        </ExplorerCard>
      </div>
    </div>
  );
}
