"use client";

import { useState } from "react";
import { buildMerchantPresentation } from "../presentation";
import { money } from "@/lib/utils";
import type { AnomalyItem } from "@/lib/api/types";

interface AnomaliesProps {
  anomalies: AnomalyItem[];
  loading?: boolean;
}

const SHELL_CLASS =
  "rounded-[32px] border border-border-subtle bg-surface-panel/85 p-6 shadow-panel";
const LOADING_TITLE_CLASS = "text-xs font-semibold uppercase tracking-wide text-text-muted";
const SKELETON_CARD_CLASS = "h-28 animate-pulse rounded-[22px] bg-surface-field";
const EYEBROW_CLASS = "text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted";
const TITLE_CLASS = "mt-2 font-display text-3xl font-semibold tracking-tight text-text-primary";
const DESCRIPTION_CLASS = "mt-2 text-sm text-text-secondary";
const ANOMALY_CARD_CLASS = "rounded-[24px] border border-border-subtle bg-surface-field/80 p-4";
const MERCHANT_TITLE_CLASS = "text-sm font-semibold text-text-primary";
const MERCHANT_CAPTION_CLASS = "mt-1 truncate text-xs text-text-muted";
const REASON_BADGE_CLASS =
  "rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-accent";
const AMOUNT_CLASS = "font-display text-2xl font-semibold tracking-tight text-text-primary";
const META_CLASS = "mt-1 text-xs text-text-muted";
const EMPTY_CLASS = "rounded-[22px] border border-border-subtle bg-surface-field/70 p-4 text-sm text-text-secondary";
const ANOMALY_PAGE_SIZE = 5;
const PAGINATION_BAR_CLASS =
  "flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-surface-elevated/70 px-5 py-3.5";
const PAGINATION_SUMMARY_CLASS = "text-xs text-text-muted";
const PAGINATION_BUTTON_CLASS =
  "min-h-11 rounded-md border border-border-strong bg-surface-field px-2 py-1 text-xs text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60";
const PAGINATION_INDICATOR_CLASS = "text-xs text-text-secondary";

export function Anomalies({ anomalies, loading }: AnomaliesProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(anomalies.length / ANOMALY_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageStart = anomalies.length === 0 ? 0 : (safePage - 1) * ANOMALY_PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * ANOMALY_PAGE_SIZE, anomalies.length);
  const visibleAnomalies = anomalies.slice((safePage - 1) * ANOMALY_PAGE_SIZE, safePage * ANOMALY_PAGE_SIZE);

  if (loading) {
    return (
      <section className={SHELL_CLASS}>
        <h4 className={LOADING_TITLE_CLASS}>Anomalies</h4>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={SKELETON_CARD_CLASS} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={SHELL_CLASS}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className={EYEBROW_CLASS}>Anomaly ledger</div>
          <h4 className={TITLE_CLASS}>Anomalies</h4>
          <p className={DESCRIPTION_CLASS}>
            Outliers and new-spend behavior worth a second look.
          </p>
        </div>
      </div>
      <div className="mt-4" data-testid="analytics-anomalies">
        <div className="space-y-3" data-testid="analytics-anomaly-ledger">
          {anomalies.length ? (
            visibleAnomalies.map((entry) => {
              const presentation = buildMerchantPresentation(entry.merchant);
              const reasonLabel = entry.reason === "amount_outlier" ? "Amount outlier" : "New merchant spike";

              return (
                <article
                  key={entry.transactionId}
                  className={ANOMALY_CARD_CLASS}
                  data-testid="analytics-anomaly-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={MERCHANT_TITLE_CLASS}>{presentation.displayName}</div>
                      <div className={MERCHANT_CAPTION_CLASS} title={presentation.caption}>
                        {presentation.caption}
                      </div>
                    </div>
                    <div className={REASON_BADGE_CLASS}>
                      {reasonLabel}
                    </div>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <div className={AMOUNT_CLASS}>{money(entry.amount)}</div>
                      <div className={META_CLASS}>
                        {entry.transactionDate} · {entry.emoji ? `${entry.emoji} ` : ""}{entry.category}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className={EMPTY_CLASS}>
              No anomalies detected. Spending looks stable in this range.
            </div>
          )}
        </div>
      </div>
      {anomalies.length > ANOMALY_PAGE_SIZE && !loading ? (
        <div className={PAGINATION_BAR_CLASS}>
          <p className={PAGINATION_SUMMARY_CLASS}>
            {`Showing \u2013${pageEnd} of ${anomalies.length} anomalies`}
          </p>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className={PAGINATION_BUTTON_CLASS}
            >
              Previous
            </button>
            <span className={PAGINATION_INDICATOR_CLASS}>
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className={PAGINATION_BUTTON_CLASS}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
