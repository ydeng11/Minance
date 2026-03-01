import { OverviewSummary } from "@/services/apis/types.tsx";

export const fetchOverviewSummary = async (
    startDate: string,
    endDate: string
): Promise<OverviewSummary> => {
    const url = new URL("/1.0/minance/overview/summary", window.location.origin);
    url.searchParams.append("startDate", startDate);
    url.searchParams.append("endDate", endDate);

    const response = await fetch(url.toString());

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to fetch overview summary");
    }

    return response.json();
};
