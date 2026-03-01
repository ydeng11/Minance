import type { Task } from "./TaskCard";
import type { CategoryMapping } from "@/services/apis/categoryMappingApis";

export type CategoryColumnId = "originalCat" | "minanceCat";

export type AssignmentSnapshot = Record<string, CategoryColumnId>;

export const buildAssignmentSnapshot = (tasks: Task[]): AssignmentSnapshot => {
    return tasks.reduce<AssignmentSnapshot>((snapshot, task) => {
        snapshot[String(task.id)] = task.columnId as CategoryColumnId;
        return snapshot;
    }, {});
};

export const detectAssignmentChanges = (
    initialSnapshot: AssignmentSnapshot,
    currentSnapshot: AssignmentSnapshot
) => {
    const changedTaskIds = Object.keys(currentSnapshot).filter((taskId) => {
        return initialSnapshot[taskId] !== currentSnapshot[taskId];
    });

    return {
        hasChanges: changedTaskIds.length > 0,
        changedTaskIds,
    };
};

export const deriveCategoryMappingPayload = (
    tasks: Task[],
    selectedCategory?: string | null
): CategoryMapping | null => {
    if (!selectedCategory) {
        return null;
    }

    const uniqueRawCategories = Array.from(
        new Set(
            tasks
                .filter((task) => task.columnId === "minanceCat")
                .map((task) => task.content)
        )
    );

    if (uniqueRawCategories.length === 0) {
        return null;
    }

    return {
        listRawCategories: uniqueRawCategories,
        minanceCategory: selectedCategory,
    };
};

export const listUnmappedCategories = (tasks: Task[]): string[] => {
    return tasks
        .filter((task) => task.columnId === "originalCat")
        .map((task) => String(task.content))
        .sort((a, b) => a.localeCompare(b));
};

export const shouldEnableSaveButton = (
    initialSnapshot: AssignmentSnapshot,
    currentSnapshot: AssignmentSnapshot
) => {
    return detectAssignmentChanges(initialSnapshot, currentSnapshot).hasChanges;
};
