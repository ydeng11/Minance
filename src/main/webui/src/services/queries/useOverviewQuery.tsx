import { useQuery } from "@tanstack/react-query";
import { fetchOverviewSummary } from "@/services/apis/overviewApis";
import { useDateRangeStore } from "@/store/dateRangeStore";

export const useOverviewQuery = () => {
    const { startDate, endDate } = useDateRangeStore();

    return useQuery({
        queryKey: ['overview', startDate, endDate],
        queryFn: () => fetchOverviewSummary(startDate, endDate),
        enabled: !!startDate && !!endDate,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
