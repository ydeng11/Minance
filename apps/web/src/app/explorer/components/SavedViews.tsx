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

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const SECTION_CLASS = "rounded-xl border border-border-subtle bg-surface-panel/85 p-4 shadow-panel";
const TITLE_CLASS = "text-xs font-semibold uppercase tracking-wide text-text-muted";
const FIELD_CLASS =
  `rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-text-primary placeholder:text-text-secondary outline-none transition focus:border-accent ${FOCUS_RING_CLASS}`;
const PRIMARY_ACTION_CLASS =
  `inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-field px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-elevated ${FOCUS_RING_CLASS}`;
const VIEW_ROW_CLASS = "flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-field px-3 py-2 text-sm";
const VIEW_ACTION_CLASS =
  `rounded-md border border-border-subtle bg-surface-elevated px-3 py-1 text-xs text-text-primary transition hover:bg-surface-panel ${FOCUS_RING_CLASS}`;

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
      <section className={SECTION_CLASS}>
        <h4 className={TITLE_CLASS}>Saved Views</h4>
        <div className="mt-3 h-24 animate-pulse rounded-md bg-surface-field" />
      </section>
    );
  }

  return (
    <section className={SECTION_CLASS} data-testid="saved-views-section">
      <h4 className={TITLE_CLASS}>Saved Views</h4>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="grid flex-1 gap-1 text-sm text-text-secondary">
          Name
          <input
            value={savedViewName}
            onChange={(event) => setSavedViewName(event.target.value)}
            data-testid="saved-view-name"
            placeholder="Quarterly dining check"
            className={FIELD_CLASS}
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          data-testid="save-view-button"
          className={PRIMARY_ACTION_CLASS}
        >
          <Save className="h-4 w-4" />
          Save Current View
        </button>
      </div>

      <div className="mt-4 space-y-2" data-testid="saved-views-list">
        {savedViews.map((view) => (
          <div key={view.id} className={VIEW_ROW_CLASS}>
            <span className="text-text-secondary">{view.name}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onApply(view)}
                className={VIEW_ACTION_CLASS}
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => onDelete(view.id)}
                className={VIEW_ACTION_CLASS}
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
