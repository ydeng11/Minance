import {useQuery} from "@tanstack/react-query";
import {retrieveTransactionsByDateRange} from "@/services/apis/transactionsApi";
import {useDateRangeStore} from "@/store/dateRangeStore";
import {toast} from "@/hooks/use-toast.ts";

export const useTransactionQuery = () => {
    const {startDate, endDate} = useDateRangeStore();

    return useQuery({
        queryKey: ['transactions', startDate, endDate],
        queryFn: async () => {
            try {
                return await retrieveTransactionsByDateRange(startDate, endDate);
            } catch (error) {
                toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to fetch transactions",
                    variant: "destructive",
                });
                throw error;
            }
        },
        enabled: !!startDate && !!endDate,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
        refetchOnWindowFocus: true,
    });
}; 