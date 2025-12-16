import { describe, expect, it } from "vitest";
import {
    buildAssignmentSnapshot,
    detectAssignmentChanges,
    deriveCategoryMappingPayload,
    listUnmappedCategories,
    shouldEnableSaveButton,
} from "../categoryBoardUtils";
import type { Task } from "../TaskCard";
import type { AssignmentSnapshot } from "../categoryBoardUtils";

const buildTasks = (): Task[] => ([
    { id: "Groceries", columnId: "originalCat", content: "Groceries" },
    { id: "Travel", columnId: "minanceCat", content: "Travel" },
    { id: "Dining", columnId: "minanceCat", content: "Dining" },
    { id: "Travel", columnId: "minanceCat", content: "Travel" },
] as Task[]);

describe("categoryBoardUtils", () => {
    it("builds a snapshot for each task", () => {
        const snapshot = buildAssignmentSnapshot(buildTasks());
        expect(snapshot).toEqual({
            Groceries: "originalCat",
            Travel: "minanceCat",
            Dining: "minanceCat",
        });
    });

    it("detects changed assignments between snapshots", () => {
        const initialSnapshot: AssignmentSnapshot = {
            Groceries: "originalCat",
            Travel: "originalCat",
            Dining: "minanceCat",
        };
        const currentSnapshot: AssignmentSnapshot = {
            Groceries: "minanceCat",
            Travel: "minanceCat",
            Dining: "minanceCat",
        };

        const result = detectAssignmentChanges(initialSnapshot, currentSnapshot);
        expect(result.hasChanges).toBe(true);
        expect(result.changedTaskIds).toEqual(["Groceries", "Travel"]);
    });

    it("derives a mapping payload with unique categories for the selected minance category", () => {
        const payload = deriveCategoryMappingPayload(buildTasks(), "Travel");
        expect(payload).toEqual({
            minanceCategory: "Travel",
            listRawCategories: ["Travel", "Dining"],
        });
    });

    it("returns null mapping payload when nothing is assigned or category missing", () => {
        expect(deriveCategoryMappingPayload(buildTasks(), undefined)).toBeNull();

        const originalOnly: Task[] = [{ id: "Only", columnId: "originalCat", content: "Only" }];
        expect(deriveCategoryMappingPayload(originalOnly, "Dining")).toBeNull();
    });

    it("lists unmapped categories to display warning indicators", () => {
        const mixedTasks: Task[] = [
            { id: "Laundry", columnId: "originalCat", content: "Laundry" },
            { id: "Travel", columnId: "minanceCat", content: "Travel" },
        ];
        expect(listUnmappedCategories(mixedTasks)).toEqual(["Laundry"]);
    });

    it("only enables save button when assignments actually changed", () => {
        const initialSnapshot: AssignmentSnapshot = {
            Groceries: "originalCat",
            Travel: "minanceCat",
        };
        const unchanged: AssignmentSnapshot = {
            Groceries: "originalCat",
            Travel: "minanceCat",
        };
        const changed: AssignmentSnapshot = {
            Groceries: "minanceCat",
            Travel: "minanceCat",
        };

        expect(shouldEnableSaveButton(initialSnapshot, unchanged)).toBe(false);
        expect(shouldEnableSaveButton(initialSnapshot, changed)).toBe(true);
    });
});
