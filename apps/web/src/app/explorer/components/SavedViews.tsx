"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import type { SavedView } from "@/lib/api/types";

interface SavedViewsProps {
  savedViews: SavedView[];
  onSave: (name: string) => void;
  onApply: (view: SavedView) => void;
  onDelete: (viewId: string) => void;
  loading?: boolean;
}

export function SavedViews({ savedViews, onSave, onApply, onDelete, loading }: SavedViewsProps) {
  const [savedViewName, setSavedViewName] = useState("");

  function handleSave() {
    if (!savedViewName.trim()) {
      return;
    }
    onSave(savedViewName.trim());
    setSavedViewName("");
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Saved Views</h4>
        <div className="mt-3 h-24 animate-pulse rounded-md bg-neutral-900" />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4" data-testid="saved-views-section">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Saved Views</h4>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="grid flex-1 gap-1 text-sm text-neutral-300">
          Name
          <input
            value={savedViewName}
            onChange={(event) => setSavedViewName(event.target.value)}
            data-testid="saved-view-name"
            placeholder="Quarterly dining check"
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          data-testid="save-view-button"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
        >
          <Save className="h-4 w-4" />
          Save Current View
        </button>
      </div>

      <div className="mt-4 space-y-2" data-testid="saved-views-list">
        {savedViews.map((view) => (
          <div key={view.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm">
            <span className="text-neutral-300">{view.name}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onApply(view)}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-200 transition hover:bg-neutral-700"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => onDelete(view.id)}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-200 transition hover:bg-neutral-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
