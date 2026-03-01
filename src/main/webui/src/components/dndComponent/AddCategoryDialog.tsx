import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useCategoryGroupMutation} from "@/services/queries/useCategoryGroupMutation";

interface AddCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddCategoryDialog({open, onOpenChange}: AddCategoryDialogProps) {
    const [categoryName, setCategoryName] = React.useState('');
    const {createCategoryGroupMutation} = useCategoryGroupMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        createCategoryGroupMutation(categoryName, {
            onSuccess: () => {
                onOpenChange(false);
                setCategoryName('');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                    <DialogDescription>
                        Create a new Minance category for transaction grouping.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input
                                id="name"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Add Category</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 