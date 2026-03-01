import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMinanceCategory, deleteMinanceCategory, linkCategories } from "@/services/apis/categoryMappingApis.tsx";
import { useCategoryStore } from "@/store/categoryStore.ts";
import { useCategoryGroupQuery } from "@/services/queries/useCategoryGroupQuery.tsx";
import { toast } from "@/hooks/use-toast.ts";


export const useCategoryGroupMutation = () => {
    const queryClient = useQueryClient();
    const { setMinanceCategories, selectedCategory } = useCategoryStore();
    const { allMinanceCategories } = useCategoryGroupQuery();

    const { mutateAsync: linkCategoriesAsync } = useMutation({
        mutationFn: linkCategories,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unlinkedCategories'] });
            queryClient.invalidateQueries({ queryKey: ['linkedCategories', selectedCategory] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
        onError: (error) => {
            console.error("Link categories error:", error);
            throw error; // Re-throw so the caller can handle it
        }
    });

    const { mutate: createCategoryGroupMutation } = useMutation({
        mutationFn: createMinanceCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unlinkedCategories'] });
            queryClient.invalidateQueries({ queryKey: ['allMinanceCategories'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            if (allMinanceCategories.data) {
                setMinanceCategories(allMinanceCategories.data);
            }
            toast({
                title: "Success",
                description: "Minance category created successfully",
            });
        },
        onError: (error) => {
            console.error("Create category error:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create category",
                variant: "destructive",
            });
        }
    });

    const { mutate: deleteCategoryGroupMutation } = useMutation({
        mutationFn: deleteMinanceCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['linkedCategories'] });
            queryClient.invalidateQueries({ queryKey: ['allMinanceCategories'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            if (allMinanceCategories.data) {
                setMinanceCategories(allMinanceCategories.data);
            }
            toast({
                title: "Success",
                description: "Minance category deleted successfully",
            });
        },
        onError: (error) => {
            console.error("Delete category error:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete category",
                variant: "destructive",
            });
        }
    });

    return {
        linkCategoriesAsync,
        deleteCategoryGroupMutation,
        createCategoryGroupMutation
    };
};
