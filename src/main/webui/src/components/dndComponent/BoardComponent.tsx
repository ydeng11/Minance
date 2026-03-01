import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BoardColumn, BoardContainer, Column } from "./BoardColumn";
import {
    Announcements,
    DndContext,
    type DragEndEvent,
    type DragOverEvent,
    DragOverlay,
    type DragStartEvent,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    UniqueIdentifier,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { type Task, TaskCard } from "./TaskCard";
import { hasDraggableData } from "./utils";
import { coordinateGetter } from "./multipleContainersKeyboardPreset";
import { AddCategoryDialog } from "./AddCategoryDialog";
import { useCategoryStore } from '@/store/categoryStore';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectSeparator,
} from "@/components/ui/select";
import { useCategoryGroupQuery } from "@/services/queries/useCategoryGroupQuery";
import { useCategoryGroupMutation } from "@/services/queries/useCategoryGroupMutation";
import { toast } from "@/hooks/use-toast";
import {
    buildAssignmentSnapshot,
    deriveCategoryMappingPayload,
    type AssignmentSnapshot,
} from "@/components/dndComponent/categoryBoardUtils";
import { Search, Loader2, CheckCircle2, AlertCircle, Plus, Trash2 } from "lucide-react";

const defaultCols = [
    {
        id: "originalCat" as const,
        title: "Original Cat",
    },
    {
        id: "minanceCat" as const,
        title: "Minance Cat",
    },
] satisfies Column[];

export type ColumnId = (typeof defaultCols)[number]["id"];

export function BoardComponent() {
    const [columns] = useState<Column[]>(defaultCols);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activeColumn, setActiveColumn] = useState<Column | null>(null);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const pickedUpTaskColumn = useRef<ColumnId | null>(null);

    // Multi-select state
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

    // Auto-save state
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [lastSavedSnapshot, setLastSavedSnapshot] = useState<AssignmentSnapshot>({});
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const saveVersionRef = useRef(0);
    const isHydratingRef = useRef(false);

    const { selectedCategory, setMinanceCategories, setSelectedCategory } = useCategoryStore();
    const {
        linkCategoriesAsync,
        deleteCategoryGroupMutation
    } = useCategoryGroupMutation();
    const { unlinkedCategories, linkedCategories, allMinanceCategories } = useCategoryGroupQuery(selectedCategory);

    const currentSnapshot = useMemo(() => buildAssignmentSnapshot(tasks), [tasks]);

    const sensors = useSensors(
        useSensor(MouseSensor),
        useSensor(TouchSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: coordinateGetter,
        })
    );

    // Auto-save function with debounce
    const triggerAutoSave = useCallback(async (tasksToSave: Task[]) => {
        if (!selectedCategory) return;

        // Clear any pending save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setSaveError(null);

        // Debounce: wait 400ms before actually saving
        saveTimeoutRef.current = setTimeout(async () => {
            const currentVersion = ++saveVersionRef.current;
            setIsSaving(true);

            try {
                const payload = deriveCategoryMappingPayload(tasksToSave, selectedCategory);

                if (!payload) {
                    setIsSaving(false);
                    return;
                }

                await linkCategoriesAsync(payload);

                // Only update if this is still the latest save request
                if (currentVersion === saveVersionRef.current) {
                    setLastSavedSnapshot(buildAssignmentSnapshot(tasksToSave));
                    setIsSaving(false);
                    setSaveError(null);
                }
            } catch (error) {
                // Only show error if this is still the latest save request
                if (currentVersion === saveVersionRef.current) {
                    const errorMsg = error instanceof Error ? error.message : "Failed to save";
                    setSaveError(errorMsg);
                    setIsSaving(false);

                    toast({
                        title: "Save failed",
                        description: errorMsg,
                        variant: "destructive",
                    });

                    // Rollback to last saved state
                    if (Object.keys(lastSavedSnapshot).length > 0) {
                        const rolledBackTasks = tasksToSave.map(task => ({
                            ...task,
                            columnId: lastSavedSnapshot[String(task.id)] || task.columnId
                        }));
                        setTasks(rolledBackTasks);
                    }
                }
            }
        }, 400);
    }, [selectedCategory, linkCategoriesAsync, lastSavedSnapshot]);

    // Load initial data
    useEffect(() => {
        if (allMinanceCategories.data) {
            setMinanceCategories(allMinanceCategories.data);
            // If no category is selected, select the first one
            if (!selectedCategory && allMinanceCategories.data.length > 0) {
                setSelectedCategory(allMinanceCategories.data[0].category);
            }
        }
    }, [allMinanceCategories.data, selectedCategory, setMinanceCategories, setSelectedCategory]);

    // Hydrate tasks from server - only when not dragging/saving
    useEffect(() => {
        if (!unlinkedCategories.data || !linkedCategories.data) return;
        if (activeTask || isSaving) return; // Don't update during drag or save

        isHydratingRef.current = true;

        const unlinkedTasks = unlinkedCategories.data.map((cat) => ({
            id: cat.name,
            content: cat.name,
            columnId: "originalCat" as const,
        }));

        const linkedTasks = linkedCategories.data.map((cat) => ({
            id: cat.name,
            content: cat.name,
            columnId: "minanceCat" as const,
        }));

        const combined = [...unlinkedTasks, ...linkedTasks].sort((a, b) =>
            a.content.localeCompare(b.content)
        );

        setTasks(combined);
        setLastSavedSnapshot(buildAssignmentSnapshot(combined));

        setTimeout(() => {
            isHydratingRef.current = false;
        }, 100);
    }, [unlinkedCategories.data, linkedCategories.data, activeTask, isSaving]);

    const handleDeleteCategory = () => {
        if (!selectedCategory) {
            toast({
                title: "Error",
                description: "Please select a category first",
                variant: "destructive",
            });
            return;
        }
        deleteCategoryGroupMutation({
            MCategoryId: allMinanceCategories.data?.find(cat => cat.category === selectedCategory)?.MCategoryId || '',
            category: selectedCategory
        });
    };

    const handleQuickAssign = (task: Task) => {
        if (!selectedCategory) {
            toast({
                title: "Select a category",
                description: "Choose a Minance category before assigning raw categories.",
                variant: "destructive",
            });
            return;
        }

        // Update state immutably
        setTasks((prev) => {
            const updated = prev.map((existing) =>
                existing.id === task.id ? { ...existing, columnId: "minanceCat" as const } : existing
            ).sort((a, b) => a.content.localeCompare(b.content));

            // Trigger auto-save
            triggerAutoSave(updated);
            return updated;
        });
    };

    // Multi-select handlers
    const handleToggleSelect = (taskId: string) => {
        setSelectedTasks((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (columnId: ColumnId) => {
        const columnTasks = tasks.filter(t => t.columnId === columnId);
        setSelectedTasks((prev) => {
            const newSet = new Set(prev);
            columnTasks.forEach(task => newSet.add(String(task.id)));
            return newSet;
        });
    };

    const handleClearSelection = () => {
        setSelectedTasks(new Set());
    };

    const handleBatchLink = () => {
        if (!selectedCategory) {
            toast({
                title: "Select a category",
                description: "Choose a Minance category before linking categories.",
                variant: "destructive",
            });
            return;
        }

        if (selectedTasks.size === 0) {
            toast({
                title: "No selection",
                description: "Select categories to link.",
                variant: "destructive",
            });
            return;
        }

        setTasks((prev) => {
            const updated = prev.map((task) =>
                selectedTasks.has(String(task.id)) && task.columnId === "originalCat"
                    ? { ...task, columnId: "minanceCat" as const }
                    : task
            ).sort((a, b) => a.content.localeCompare(b.content));

            // Clear selection after batch operation
            setSelectedTasks(new Set());

            // Trigger auto-save
            triggerAutoSave(updated);
            return updated;
        });
    };

    const handleBatchUnlink = () => {
        if (selectedTasks.size === 0) {
            toast({
                title: "No selection",
                description: "Select categories to unlink.",
                variant: "destructive",
            });
            return;
        }

        setTasks((prev) => {
            const updated = prev.map((task) =>
                selectedTasks.has(String(task.id)) && task.columnId === "minanceCat"
                    ? { ...task, columnId: "originalCat" as const }
                    : task
            ).sort((a, b) => a.content.localeCompare(b.content));

            // Clear selection after batch operation
            setSelectedTasks(new Set());

            // Trigger auto-save
            triggerAutoSave(updated);
            return updated;
        });
    };

    // Filter tasks by search term
    const filteredTasks = useMemo(() => {
        if (!searchTerm) return tasks;
        const lowerSearch = searchTerm.toLowerCase();
        return tasks.filter(task =>
            task.content.toLowerCase().includes(lowerSearch)
        );
    }, [tasks, searchTerm]);

    const unlinkedTasks = filteredTasks.filter(t => t.columnId === "originalCat");
    const linkedTasks = filteredTasks.filter(t => t.columnId === "minanceCat");

    const selectedUnlinked = Array.from(selectedTasks).filter(id =>
        unlinkedTasks.some(t => String(t.id) === id)
    ).length;
    const selectedLinked = Array.from(selectedTasks).filter(id =>
        linkedTasks.some(t => String(t.id) === id)
    ).length;

    const handleCategoryChange = (value: string) => {
        if (value === "add-new") {
            setIsDialogOpen(true);
        } else {
            setSelectedCategory(value);
        }
    };

    // Status indicator component
    const SaveStatus = () => {
        if (isSaving) {
            return (
                <Badge variant="secondary" className="gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                </Badge>
            );
        }
        if (saveError) {
            return (
                <Badge variant="destructive" className="gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    Error
                </Badge>
            );
        }
        if (Object.keys(lastSavedSnapshot).length > 0 &&
            JSON.stringify(currentSnapshot) === JSON.stringify(lastSavedSnapshot)) {
            return (
                <Badge variant="outline" className="gap-1.5 text-green-600 border-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Saved
                </Badge>
            );
        }
        return null;
    };

    function getDraggingTaskData(taskId: UniqueIdentifier, columnId: ColumnId) {
        const tasksInColumn = tasks.filter((task) => task.columnId === columnId);
        const taskPosition = tasksInColumn.findIndex((task) => task.id === taskId);
        const column = columns.find((col) => col.id === columnId);
        return {
            tasksInColumn,
            taskPosition,
            column,
        };
    }

    const announcements: Announcements = {
        onDragStart({ active }) {
            if (!hasDraggableData(active)) return;
            if (active.data.current?.type === "Column") {
                const startColumnIdx = columns.findIndex((col) => col.id === active.id);
                const startColumn = columns[startColumnIdx];
                return `Picked up Column ${startColumn?.title} at position: ${startColumnIdx + 1
                    } of ${columns.length}`;
            } else if (active.data.current?.type === "Task") {
                pickedUpTaskColumn.current = active.data.current.task.columnId;
                const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
                    active.id,
                    pickedUpTaskColumn.current
                );
                return `Picked up Task ${active.data.current.task.content
                    } at position: ${taskPosition + 1} of ${tasksInColumn.length
                    } in column ${column?.title}`;
            }
        },
        onDragOver({ active, over }) {
            if (!hasDraggableData(active) || !hasDraggableData(over)) return;

            if (
                active.data.current?.type === "Column" &&
                over.data.current?.type === "Column"
            ) {
                const overColumnIdx = columns.findIndex((col) => col.id === over.id);
                return `Column ${active.data.current.column.title} was moved over ${over.data.current.column.title
                    } at position ${overColumnIdx + 1} of ${columns.length}`;
            } else if (
                active.data.current?.type === "Task" &&
                over.data.current?.type === "Task"
            ) {
                const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
                    over.id,
                    over.data.current.task.columnId
                );
                if (over.data.current.task.columnId !== pickedUpTaskColumn.current) {
                    return `Task ${active.data.current.task.content
                        } was moved over column ${column?.title} in position ${taskPosition + 1
                        } of ${tasksInColumn.length}`;
                }
                return `Task was moved over position ${taskPosition + 1} of ${tasksInColumn.length
                    } in column ${column?.title}`;
            }
        },
        onDragEnd({ active, over }) {
            if (!hasDraggableData(active) || !hasDraggableData(over)) {
                pickedUpTaskColumn.current = null;
                return;
            }
            if (
                active.data.current?.type === "Column" &&
                over.data.current?.type === "Column"
            ) {
                const overColumnPosition = columns.findIndex((col) => col.id === over.id);

                return `Column ${active.data.current.column.title
                    } was dropped into position ${overColumnPosition + 1} of ${columns.length
                    }`;
            } else if (
                active.data.current?.type === "Task" &&
                over.data.current?.type === "Task"
            ) {
                const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
                    over.id,
                    over.data.current.task.columnId
                );
                if (over.data.current.task.columnId !== pickedUpTaskColumn.current) {
                    return `Task was dropped into column ${column?.title} in position ${taskPosition + 1
                        } of ${tasksInColumn.length}`;
                }
                return `Task was dropped into position ${taskPosition + 1} of ${tasksInColumn.length
                    } in column ${column?.title}`;
            }
            pickedUpTaskColumn.current = null;
        },
        onDragCancel({ active }) {
            pickedUpTaskColumn.current = null;
            if (!hasDraggableData(active)) return;
            return `Dragging ${active.data.current?.type} cancelled.`;
        },
    };

    return (
        <DndContext
            accessibility={{
                announcements,
            }}
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
        >
            <div data-testid="category-board" className="space-y-4">
                <BoardContainer>
                    <SortableContext items={columns}>
                        {/* Left Panel: Raw Categories */}
                        <div className="flex flex-col gap-3">
                            {/* Header - Title and Action Buttons */}
                            <div className="flex items-center justify-between min-h-[44px]">
                                <div>
                                    <h3 className="text-lg font-semibold">Raw Categories</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {unlinkedTasks.length} unlinked
                                        {selectedUnlinked > 0 && ` • ${selectedUnlinked} selected`}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {selectedUnlinked > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleClearSelection}
                                            data-testid="clear-selection-button"
                                        >
                                            Clear
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSelectAll("originalCat")}
                                        data-testid="select-all-unlinked-button"
                                    >
                                        Select All
                                    </Button>
                                </div>
                            </div>

                            {/* Search Box - Aligned with Right Panel Dropdown */}
                            <div className="relative h-10">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search categories..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-10"
                                />
                            </div>

                            {/* Batch Action Button - Aligned Space */}
                            <div className="min-h-[40px]">
                                {selectedUnlinked > 0 && (
                                    <Button
                                        onClick={handleBatchLink}
                                        className="w-full"
                                        data-testid="batch-link-button"
                                    >
                                        Link {selectedUnlinked} {selectedUnlinked === 1 ? 'Category' : 'Categories'}
                                    </Button>
                                )}
                            </div>

                            <BoardColumn
                                column={columns[0]}
                                tasks={unlinkedTasks}
                                onAssignTask={handleQuickAssign}
                                selectedTasks={selectedTasks}
                                onToggleSelect={handleToggleSelect}
                                showCheckboxes={true}
                            />
                        </div>

                        {/* Right Panel: Minance Category */}
                        <div className="flex flex-col gap-3">
                            {/* Header - Title and Action Buttons - Aligned with Left */}
                            <div className="flex items-center justify-between gap-2 min-h-[44px]">
                                <div>
                                    <h3 className="text-lg font-semibold">Minance Category</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {linkedTasks.length} linked
                                        {selectedLinked > 0 && ` • ${selectedLinked} selected`}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {selectedLinked > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleClearSelection}
                                            data-testid="clear-selection-linked-button"
                                        >
                                            Clear
                                        </Button>
                                    )}
                                    {linkedTasks.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleSelectAll("minanceCat")}
                                            data-testid="select-all-linked-button"
                                        >
                                            Select All
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Dropdown Row - Aligned with Left Search Box */}
                            <div className="flex items-center gap-2 h-10">
                                <div className="flex-1">
                                    <Select
                                        value={selectedCategory}
                                        onValueChange={handleCategoryChange}
                                    >
                                        <SelectTrigger data-testid="minance-category-select" className="h-10">
                                            <SelectValue placeholder="Select Minance Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allMinanceCategories.data?.map((cat) => (
                                                <SelectItem key={cat.MCategoryId} value={cat.category}>
                                                    {cat.category}
                                                </SelectItem>
                                            ))}
                                            <SelectSeparator />
                                            <SelectItem value="add-new">
                                                <div className="flex items-center gap-2">
                                                    <Plus className="h-4 w-4" />
                                                    Add New Category
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <SaveStatus />

                                <Button
                                    onClick={handleDeleteCategory}
                                    variant="outline"
                                    size="icon"
                                    disabled={!selectedCategory}
                                    title="Delete category"
                                    className="h-10 w-10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Batch Action Button - Aligned Space */}
                            <div className="min-h-[40px]">
                                {selectedLinked > 0 && (
                                    <Button
                                        onClick={handleBatchUnlink}
                                        variant="outline"
                                        className="w-full"
                                        data-testid="batch-unlink-button"
                                    >
                                        Unlink {selectedLinked} {selectedLinked === 1 ? 'Category' : 'Categories'}
                                    </Button>
                                )}
                            </div>

                            <BoardColumn
                                column={columns[1]}
                                tasks={linkedTasks}
                                selectedTasks={selectedTasks}
                                onToggleSelect={handleToggleSelect}
                                showCheckboxes={true}
                            />
                        </div>
                    </SortableContext>
                </BoardContainer>
            </div>

            <AddCategoryDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />

            {"document" in window &&
                createPortal(
                    <DragOverlay>
                        {activeColumn && (
                            <BoardColumn
                                isOverlay
                                column={activeColumn}
                                tasks={tasks.filter(
                                    (task) => task.columnId === activeColumn.id
                                )}
                            />
                        )}
                        {activeTask && <TaskCard task={activeTask} isOverlay />}
                    </DragOverlay>,
                    document.body
                )}
        </DndContext>

    );

    function onDragStart(event: DragStartEvent) {
        if (!hasDraggableData(event.active)) return;
        const data = event.active.data.current;
        if (data?.type === "Column") {
            setActiveColumn(data.column);
            return;
        }

        if (data?.type === "Task") {
            setActiveTask(data.task);
            return;
        }
    }

    function onDragEnd(event: DragEndEvent) {
        setActiveColumn(null);
        setActiveTask(null);

        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (!hasDraggableData(active)) return;

        const activeData = active.data.current;

        if (activeId === overId) return;

        const isActiveATask = activeData?.type === "Task";

        if (isActiveATask) {
            const overData = over.data.current;
            let targetColumnId: ColumnId | null = null;

            if (overData?.type === "Task") {
                targetColumnId = overData.task.columnId;
            } else if (overData?.type === "Column") {
                targetColumnId = overId as ColumnId;
            }

            if (targetColumnId) {
                setTasks((prevTasks) => {
                    // Check if the dragged task is part of a multi-selection
                    const isMultiDrag = selectedTasks.has(String(activeId)) && selectedTasks.size > 1;

                    let updated: Task[];
                    if (isMultiDrag) {
                        // Move all selected tasks to the target column
                        updated = prevTasks.map((task) =>
                            selectedTasks.has(String(task.id))
                                ? { ...task, columnId: targetColumnId }
                                : task
                        );
                        // Clear selection after multi-drag
                        setSelectedTasks(new Set());
                    } else {
                        // Single task drag
                        updated = prevTasks.map((task) =>
                            task.id === activeId
                                ? { ...task, columnId: targetColumnId }
                                : task
                        );
                    }

                    updated = updated.sort((a, b) => a.content.localeCompare(b.content));

                    // Trigger auto-save after drag
                    triggerAutoSave(updated);
                    return updated;
                });
            }
        }
    }

    function onDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        if (!hasDraggableData(active) || !hasDraggableData(over)) return;

        const activeData = active.data.current;
        const overData = over.data.current;

        const isActiveATask = activeData?.type === "Task";
        const isOverATask = overData?.type === "Task";
        const isOverAColumn = overData?.type === "Column";

        if (!isActiveATask) return;

        // Update column assignment during drag for visual feedback
        // Im dropping a Task over another Task
        if (isActiveATask && isOverATask) {
            setTasks((prevTasks) => {
                const activeTask = prevTasks.find((t) => t.id === activeId);
                const overTask = prevTasks.find((t) => t.id === overId);

                if (activeTask && overTask && activeTask.columnId !== overTask.columnId) {
                    return prevTasks.map((task) =>
                        task.id === activeId
                            ? { ...task, columnId: overTask.columnId }
                            : task
                    );
                }
                return prevTasks;
            });
        }

        // Im dropping a Task over a column
        if (isActiveATask && isOverAColumn) {
            setTasks((prevTasks) => {
                const activeTask = prevTasks.find((t) => t.id === activeId);
                if (activeTask && activeTask.columnId !== overId) {
                    return prevTasks.map((task) =>
                        task.id === activeId
                            ? { ...task, columnId: overId as ColumnId }
                            : task
                    );
                }
                return prevTasks;
            });
        }
    }
}
