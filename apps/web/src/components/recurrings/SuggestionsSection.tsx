// apps/web/src/components/recurrings/SuggestionsSection.tsx
"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { money } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { RecurringSuggestion } from "@/lib/api/types";

interface SuggestionsSectionProps {
  suggestions: RecurringSuggestion[];
  onSuggestionHandled: () => void;
}

export function SuggestionsSection({ suggestions, onSuggestionHandled }: SuggestionsSectionProps) {
  const api = useApi();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCreate(suggestion: RecurringSuggestion) {
    setLoading(suggestion.id);
    try {
      await api.recurrings.createRuleFromSuggestion(suggestion.id, {
        name: suggestion.merchant_pattern,
        cadence: "monthly"
      });
      onSuggestionHandled();
    } catch (err) {
      console.error("Failed to create rule:", err);
    } finally {
      setLoading(null);
    }
  }

  async function handleDismiss(suggestion: RecurringSuggestion) {
    setLoading(suggestion.id);
    try {
      await api.recurrings.dismissSuggestion(suggestion.id);
      onSuggestionHandled();
    } catch (err) {
      console.error("Failed to dismiss:", err);
    } finally {
      setLoading(null);
    }
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4" data-testid="recurrings-suggestions">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Suggested Recurrings ({suggestions.length})
      </h4>
      <p className="mt-1 text-xs text-neutral-500">
        Merchants detected as potentially recurring. Create rules to track them.
      </p>
      <div className="mt-3 space-y-2">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-center justify-between rounded-lg bg-neutral-950 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-neutral-200">{suggestion.merchant_pattern}</p>
              <p className="text-xs text-neutral-500">
                {money(suggestion.amount)} · {suggestion.occurrence_count} months
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCreate(suggestion)}
                disabled={loading === suggestion.id}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                data-testid={`suggestion-create-${suggestion.id}`}
              >
                <Plus className="h-3 w-3" />
                Create
              </button>
              <button
                type="button"
                onClick={() => handleDismiss(suggestion)}
                disabled={loading === suggestion.id}
                className="inline-flex items-center gap-1 rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-700 disabled:opacity-50"
                data-testid={`suggestion-dismiss-${suggestion.id}`}
              >
                <X className="h-3 w-3" />
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}