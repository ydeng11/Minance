import {useQuery} from "@tanstack/react-query";
import {fetchAccountsByBank} from "@/services/apis/accountApis.tsx";
import {toast} from "@/hooks/use-toast.ts";

export const useAccountByBankQuery = (bankName: string) => {
    return useQuery({
        queryKey: ['accounts', bankName],
        queryFn: async () => {
            if (!bankName) return []; // Return an empty array if bankName is not provided
            try {
                return await fetchAccountsByBank(bankName);
            } catch (error) {
                toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to fetch accounts",
                    variant: "destructive",
                });
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: 2,
        enabled: !!bankName, // Only run query if bankName is truthy
    });
};
