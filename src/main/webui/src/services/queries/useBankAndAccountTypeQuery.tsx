import {useQuery} from "@tanstack/react-query";
import {fetchSupportedAccountTypes, fetchSupportedBanks} from "@/services/apis/accountApis";

export const useBankAndAccountTypeQuery = () => {
    const supportedBanks = useQuery({
        queryKey: ['supportedBanks'],
        queryFn: fetchSupportedBanks,
    });

    const supportedAccountTypes = useQuery({
        queryKey: ['supportedAccountTypes'],
        queryFn: fetchSupportedAccountTypes,
    });

    return {
        supportedBanks,
        supportedAccountTypes,
        isLoading: supportedBanks.isLoading || supportedAccountTypes.isLoading,
        isError: supportedBanks.isError || supportedAccountTypes.isError,
    };
}; 