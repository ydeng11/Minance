import type { Category, CategoryStrategyCoarse, CategoryStrategyGranular } from "@/lib/api/types";

function normalizeKeyCandidate(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeGroupOrder(groups: CategoryStrategyCoarse[]) {
  return groups.map((entry, index) => ({
    ...entry,
    order: index + 1
  }));
}

export function sortCoarseGroups(groups: CategoryStrategyCoarse[]) {
  const sorted = [...groups]
    .map((entry, index) => ({
      ...entry,
      key: normalizeKeyCandidate(entry.key || entry.name || `group_${index + 1}`),
      name: String(entry.name || entry.key || `Group ${index + 1}`).trim() || `Group ${index + 1}`,
      emoji: String(entry.emoji || "").trim(),
      order: Number(entry.order || index + 1),
      isExcluded: Boolean(entry.isExcluded)
    }))
    .filter((entry) => entry.key.length > 0)
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));

  return normalizeGroupOrder(sorted);
}

export function moveCoarseGroup(groups: CategoryStrategyCoarse[], key: string, direction: "up" | "down") {
  const ordered = sortCoarseGroups(groups);
  const index = ordered.findIndex((entry) => entry.key === key);
  if (index < 0) {
    return ordered;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= ordered.length) {
    return ordered;
  }

  const next = [...ordered];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return normalizeGroupOrder(next);
}

export function createCoarseGroup(name: string, emoji: string, existingGroups: CategoryStrategyCoarse[]) {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    return null;
  }

  const existingKeys = new Set(existingGroups.map((entry) => entry.key));
  const baseKey = normalizeKeyCandidate(trimmedName) || "group";
  let key = baseKey;
  let suffix = 2;
  while (existingKeys.has(key)) {
    key = `${baseKey}_${suffix}`;
    suffix += 1;
  }

  return {
    key,
    name: trimmedName,
    emoji: String(emoji || "").trim(),
    isExcluded: false,
    order: existingGroups.length + 1
  } satisfies CategoryStrategyCoarse;
}

export interface GroupedCategoryBucket extends CategoryStrategyCoarse {
  count: number;
  items: Category[];
}

export function groupCategoriesByCoarse(categories: Category[], coarseGroups: CategoryStrategyCoarse[]) {
  const ordered = sortCoarseGroups(coarseGroups);
  const categoriesByKey = new Map<string, Category[]>();
  for (const category of categories) {
    const key = String(category.coarseKey || "").trim();
    if (!key) {
      continue;
    }
    const existing = categoriesByKey.get(key);
    if (existing) {
      existing.push(category);
    } else {
      categoriesByKey.set(key, [category]);
    }
  }

  const buckets: GroupedCategoryBucket[] = ordered.map((group) => {
    const items = [...(categoriesByKey.get(group.key) || [])].sort((left, right) => left.name.localeCompare(right.name));
    categoriesByKey.delete(group.key);
    return {
      ...group,
      count: items.length,
      items
    };
  });

  for (const [key, items] of categoriesByKey.entries()) {
    buckets.push({
      key,
      name: key,
      emoji: "",
      isExcluded: false,
      order: buckets.length + 1,
      count: items.length,
      items: [...items].sort((left, right) => left.name.localeCompare(right.name))
    });
  }

  return buckets;
}

export function syncGranularAssignment(
  granularDraft: CategoryStrategyGranular[],
  category: Pick<Category, "name" | "emoji">,
  coarseKey: string
) {
  const normalizedName = String(category.name || "").trim().toLowerCase();
  if (!normalizedName) {
    return granularDraft;
  }

  let found = false;
  const next = granularDraft.map((entry) => {
    if (String(entry.name || "").trim().toLowerCase() !== normalizedName) {
      return entry;
    }
    found = true;
    return {
      ...entry,
      coarseKey,
      emoji: String(category.emoji || entry.emoji || "").trim()
    };
  });

  if (found) {
    return next;
  }

  return [
    ...next,
    {
      name: String(category.name || "").trim(),
      emoji: String(category.emoji || "").trim(),
      coarseKey,
      aliases: [],
      isSystem: false
    }
  ];
}
