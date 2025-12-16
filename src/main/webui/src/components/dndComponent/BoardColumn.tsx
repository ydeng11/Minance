import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { type UniqueIdentifier, useDndContext } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";
import { Task, TaskCard } from "./TaskCard";
import { cva } from "class-variance-authority";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area.tsx";

export interface Column {
    id: UniqueIdentifier;
    title: string;
}

export type ColumnType = "Column";

export interface ColumnDragData {
    type: ColumnType;
    column: Column;
}

interface BoardColumnProps {
    column: Column;
    tasks: Task[];
    isOverlay?: boolean;
    onAssignTask?: (task: Task) => void;
    selectedTasks?: Set<string>;
    onToggleSelect?: (taskId: string) => void;
    showCheckboxes?: boolean;
}

export function BoardColumn({ column, tasks, isOverlay, onAssignTask, selectedTasks, onToggleSelect, showCheckboxes }: BoardColumnProps) {
    const tasksIds = useMemo(() => {
        return tasks.map((task) => task.id);
    }, [tasks]);

    const {
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: column.id,
        data: {
            type: "Column",
            column,
        } satisfies ColumnDragData,
        attributes: {
            roleDescription: `Column: ${column.title}`,
        },
    });

    const style = {
        transition,
        transform: CSS.Translate.toString(transform),
    };

    const variants = cva(
        "flex flex-col flex-1 min-w-0",
        {
            variants: {
                dragging: {
                    default: "border-2 border-transparent",
                    over: "ring-2 opacity-30",
                    overlay: "ring-2 ring-primary",
                },
            },
        }
    );

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={variants({
                dragging: isOverlay ? "overlay" : isDragging ? "over" : undefined,
            })}
        >
            <ScrollArea className="h-[calc(100vh-20rem)]">
                <CardContent className="flex flex-col gap-2 p-3">
                    <SortableContext items={tasksIds}>
                        {tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onAssign={column.id === "originalCat" ? onAssignTask : undefined}
                                isSelected={selectedTasks?.has(String(task.id))}
                                onToggleSelect={onToggleSelect}
                                showCheckbox={showCheckboxes}
                            />
                        ))}
                    </SortableContext>
                </CardContent>
            </ScrollArea>
        </Card>
    );
}

export function BoardContainer({ children }: { children: React.ReactNode }) {
    const dndContext = useDndContext();

    const variations = cva("w-full", {
        variants: {
            dragging: {
                default: "",
                active: "cursor-grabbing",
            },
        },
    });

    return (
        <div
            className={variations({
                dragging: dndContext.active ? "active" : "default",
            })}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {children}
            </div>
        </div>
    );
}
