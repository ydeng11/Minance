import { useQuery } from "@tanstack/react-query";
import { retrieveTransactionsByDateRange } from "@/services/apis/transactionsApi";
import { useDateRangeStore } from "@/store/dateRangeStore";

export const useDateRangeQuery = () => {
    const { startDate, endDate } = useDateRangeStore();

    return useQuery({
        queryKey: ['transactions', startDate, endDate],
        queryFn: () => retrieveTransactionsByDateRange(startDate, endDate),
        enabled: !!startDate && !!endDate,
        staleTime: 1000 * 60 * 5,
    });
}; 