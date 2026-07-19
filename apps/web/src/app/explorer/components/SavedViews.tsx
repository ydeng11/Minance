"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Save } from "lucide-react";
import type { SavedView } from "@/lib/api/types";
import {
  DEFAULT_SAVED_VIEW_ID,
  buildExplorerSavedViews,
  isDefaultSavedView
} from "../savedViews";

interface SavedViewsToolbarProps {
  savedViews: SavedView[];
  activeViewId: string;
  onSave: (view: SavedView) => void;
  onCreate: (name: string) => void;
  onApply: (view: SavedView) => void;
  onDelete: (view: SavedView) => void;
  loading?: boolean;
}

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const CONTROL_CLASS =
  `inline-flex min-h-9 items-center rounded-xl border border-border-subtle bg-surface-field text-sm text-text-secondary transition hover:border-border-strong hover:bg-surface-elevated hover:text-text-primary ${FOCUS_RING_CLASS}`;

export function SavedViewsToolbar({
  savedViews,
  activeViewId,
  onSave,
  onCreate,
  onApply,
  onDelete,
  loading = false
}: SavedViewsToolbarProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [newViewName, setNewViewName] = useState("");
  const views = useMemo(() => buildExplorerSavedViews(savedViews), [savedViews]);
  const selectedView = views.find((view) => view.id === activeViewId) || views[0];

  function closeDropdown() {
    detailsRef.current?.removeAttribute("open");
  }

  function handleCreate() {
    const name = newViewName.trim();
    if (!name) {
      return;
    }
    onCreate(name);
    setNewViewName("");
    closeDropdown();
  }

  return (
    <div className="relative flex items-center gap-2" data-testid="saved-views-toolbar">
      <button
        type="button"
        onClick={() => onSave(selectedView)}
        disabled={loading}
        aria-label="Save the View"
        title="Save the View"
        data-testid="save-view-button"
        className={`${CONTROL_CLASS} justify-center px-2.5 text-accent disabled:cursor-wait disabled:opacity-50`}
      >
        <Save className="h-4 w-4" aria-hidden="true" />
      </button>

      <details
        ref={detailsRef}
        className="group relative"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            closeDropdown();
          }
        }}
      >
        <summary
          className={`${CONTROL_CLASS} min-w-36 cursor-pointer list-none justify-between gap-3 px-3 [&::-webkit-details-marker]:hidden`}
          data-testid="saved-view-menu"
          aria-label={`Saved view: ${selectedView.name}`}
        >
          <span className="max-w-32 truncate">{selectedView.name}</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>

        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel p-2 shadow-dialog">
          <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            Saved views
          </p>
          <div className="max-h-64 space-y-1 overflow-y-auto" data-testid="saved-views-list">
            {views.map((view) => {
              const selected = view.id === selectedView.id;
              const deleteLabel = isDefaultSavedView(view) ? "Reset Default" : `Delete ${view.name}`;
              return (
                <div
                  key={view.id}
                  className={`flex items-center gap-1 rounded-xl ${selected ? "bg-accent-soft" : "hover:bg-surface-field"}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onApply(view);
                      closeDropdown();
                    }}
                    className={`min-h-10 min-w-0 flex-1 truncate px-3 text-left text-sm ${selected ? "font-semibold text-accent" : "text-text-secondary"} ${FOCUS_RING_CLASS}`}
                    data-testid={`saved-view-apply-${view.id}`}
                  >
                    {view.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(view)}
                    aria-label={deleteLabel}
                    title={deleteLabel}
                    data-testid={`saved-view-delete-${view.id}`}
                    className={`mr-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg text-text-muted transition hover:bg-danger-soft hover:text-danger ${FOCUS_RING_CLASS}`}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex items-center gap-1 border-t border-border-subtle pt-2">
            <label className="sr-only" htmlFor="saved-view-name">New view name</label>
            <input
              id="saved-view-name"
              value={newViewName}
              onChange={(event) => setNewViewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleCreate();
                }
              }}
              data-testid="saved-view-name"
              placeholder="New view name"
              className={`min-h-10 min-w-0 flex-1 rounded-xl border border-border-subtle bg-surface-field px-3 text-sm text-text-primary placeholder:text-text-muted ${FOCUS_RING_CLASS}`}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newViewName.trim()}
              aria-label="Add saved view"
              title="Add saved view"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent transition hover:bg-accent-soft/80 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING_CLASS}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
