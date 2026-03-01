import type { UniqueIdentifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cva } from "class-variance-authority";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { ColumnId } from "@/components/dndComponent/BoardComponent.tsx";

export interface Task {
    id: UniqueIdentifier;
    columnId: ColumnId;
    content: string;
}

interface TaskCardProps {
    task: Task;
    isOverlay?: boolean;
    onAssign?: (task: Task) => void;
    isSelected?: boolean;
    onToggleSelect?: (taskId: string) => void;
    showCheckbox?: boolean;
}

export type TaskType = "Task";

export interface TaskDragData {
    type: TaskType;
    task: Task;
}

const slugify = (value: UniqueIdentifier) =>
    String(value).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

export function TaskCard({ task, isOverlay, onAssign, isSelected, onToggleSelect, showCheckbox }: TaskCardProps) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: "Task",
            task,
        } satisfies TaskDragData,
        attributes: {
            roleDescription: "Task",
        },
    });

    const style = {
        transition,
        transform: CSS.Translate.toString(transform),
    };

    const variants = cva("hover:bg-accent/50 transition-colors");

    const slug = slugify(task.id);
    const testId =
        task.columnId === "originalCat" ? `raw-category-${slug}` : `linked-category-${slug}`;

    let className = variants();
    if (isOverlay) className += " ring-2 ring-primary";
    else if (isDragging) className += " ring-2 opacity-30";
    if (isSelected) className += " bg-accent border-primary";

    return (
        <Card
            ref={setNodeRef}
            style={style}
            data-testid={testId}
            data-category-name={task.content}
            data-selected={isSelected ? "true" : "false"}
            className={className}
        >
            <CardHeader className="px-3 py-2 flex flex-row items-center gap-2">
                {showCheckbox && onToggleSelect && (
                    <Checkbox
                        checked={isSelected || false}
                        onCheckedChange={() => onToggleSelect(String(task.id))}
                        data-testid={`checkbox-category-${slug}`}
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
                <Button
                    variant={"ghost"}
                    {...attributes}
                    {...listeners}
                    className="p-1 text-muted-foreground hover:text-foreground h-auto cursor-grab"
                >
                    <span className="sr-only">Move category</span>
                    <GripVertical className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium flex-1 truncate">
                    {task.content}
                </span>
                {onAssign && (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="ml-auto text-xs h-7"
                        data-testid={`move-category-${slug}`}
                        onClick={() => onAssign(task)}
                    >
                        Link
                    </Button>
                )}
            </CardHeader>

        </Card>
    );
}
