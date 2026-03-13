export function toggleTransactionSelection(selected: Set<string>, id: string) {
  const next = new Set(selected);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export function toggleSelectAllVisible(selected: Set<string>, visibleIds: string[], checked: boolean) {
  if (checked) {
    return new Set(visibleIds);
  }

  const next = new Set(selected);
  for (const id of visibleIds) {
    next.delete(id);
  }

  return next;
}

export function pruneSelectionToVisible(selected: Set<string>, visibleIds: string[]) {
  const visibleIdSet = new Set(visibleIds);
  return new Set(Array.from(selected).filter((id) => visibleIdSet.has(id)));
}
