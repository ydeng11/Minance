import { loadStore, saveStore, addAuditEvent } from "./store.js";
import { createId, nowIso } from "./utils.js";

export function listSavedViews(userId) {
  const store = loadStore();
  return store.savedViews
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createSavedView(userId, payload) {
  if (!payload?.name || String(payload.name).trim().length < 2) {
    throw new Error("Saved view name is required");
  }

  const store = loadStore();
  const now = nowIso();
  const view = {
    id: createId("view"),
    userId,
    name: String(payload.name).trim(),
    filters: payload.filters || {},
    layout: payload.layout || {},
    createdAt: now,
    updatedAt: now
  };

  store.savedViews.push(view);
  saveStore(store);
  addAuditEvent(userId, "saved_view.create", { viewId: view.id });
  return view;
}

export function updateSavedView(userId, viewId, payload) {
  const store = loadStore();
  const view = store.savedViews.find((entry) => entry.id === viewId && entry.userId === userId);
  if (!view) {
    throw new Error("Saved view not found");
  }

  if (payload.name) {
    view.name = String(payload.name).trim();
  }
  if (payload.filters) {
    view.filters = payload.filters;
  }
  if (payload.layout) {
    view.layout = payload.layout;
  }
  view.updatedAt = nowIso();

  saveStore(store);
  addAuditEvent(userId, "saved_view.update", { viewId });
  return view;
}

export function deleteSavedView(userId, viewId) {
  const store = loadStore();
  const before = store.savedViews.length;
  store.savedViews = store.savedViews.filter((entry) => !(entry.id === viewId && entry.userId === userId));

  if (before === store.savedViews.length) {
    throw new Error("Saved view not found");
  }

  saveStore(store);
  addAuditEvent(userId, "saved_view.delete", { viewId });
  return true;
}
