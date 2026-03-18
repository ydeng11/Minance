// apps/web/src/components/recurrings/RecurringTotalsBand.tsx
"use client";

import { money } from "@/lib/utils";
import type { RecurringRule } from "@/lib/api/types";

interface RecurringTotalsBandProps {
  rules: RecurringRule[];
}

export function RecurringTotalsBand({ rules }: RecurringTotalsBandProps) {
  const activeRules = rules.filter((r) => r.status === "active");

  const monthlyTotal = activeRules.reduce((sum, rule) => {
    const multiplier = {
      weekly: 4.33,
      biweekly: 2.17,
      monthly: 1,
      quarterly: 0.33,
      yearly: 0.08
    }[rule.cadence] || 1;
    return sum + rule.amount * multiplier;
  }, 0);

  const yearlyTotal = monthlyTotal * 12;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3" data-testid="recurring-totals-band">
      <div className="flex items-center justify-between gap-4 text-sm">
        <div>
          <span className="text-neutral-400">Active recurring:</span>
          <span className="ml-2 font-semibold text-neutral-100">{money(monthlyTotal)}/mo</span>
        </div>
        <div className="text-neutral-500">
          {money(yearlyTotal)}/yr
        </div>
      </div>
    </div>
  );
}