import { useQuery } from "@tanstack/react-query";
import { 
    getAllMinanceCategories, 
    getLinkedCategoriesForMinanceCategory, 
    getUnlinkedCategories 
} from "@/services/apis/categoryMappingApis";
import { toast } from "@/hooks/use-toast";

export const useCategoryGroupQuery = (selectedCategory?: string) => {
    const unlinkedCategories = useQuery({
        queryKey: ['unlinkedCategories'],
        queryFn: async () => {
            try {
                return await getUnlinkedCategories();
            } catch (error) {
                toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to fetch unlinked categories",
                    variant: "destructive",
                });
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2
    });

    const linkedCategories = useQuery({
        queryKey: ['linkedCategories', selectedCategory],
        queryFn: async () => {
            try {
                return await getLinkedCategoriesForMinanceCategory(selectedCategory!);
            } catch (error) {
                toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to fetch linked categories",
                    variant: "destructive",
                });
                throw error;
            }
        },
        enabled: !!selectedCategory,
        staleTime: 5 * 60 * 1000,
        retry: 2
    });

    const allMinanceCategories = useQuery({
        queryKey: ['allMinanceCategories'],
        queryFn: async () => {
            try {
                return await getAllMinanceCategories();
            } catch (error) {
                toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to fetch Minance categories",
                    variant: "destructive",
                });
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: 2
    });

    return {
        unlinkedCategories,
        linkedCategories,
        allMinanceCategories
    };
}; 