import type { SavedView } from "@/lib/api/types";
import { createDefaultExplorerFilterState } from "./filters";

export const DEFAULT_SAVED_VIEW_ID = "__explorer_default__";

function createBuiltInDefaultView(): SavedView {
  return {
    id: DEFAULT_SAVED_VIEW_ID,
    userId: "",
    name: "Default",
    filters: createDefaultExplorerFilterState(),
    layout: {},
    createdAt: "",
    updatedAt: ""
  };
}

export function isDefaultSavedView(view: SavedView | undefined) {
  return view?.name.trim().toLowerCase() === "default";
}

export function buildExplorerSavedViews(savedViews: SavedView[]) {
  const persistedDefault = savedViews.find(isDefaultSavedView);
  const otherViews = savedViews.filter((view) => !isDefaultSavedView(view));
  return [persistedDefault || createBuiltInDefaultView(), ...otherViews];
}
