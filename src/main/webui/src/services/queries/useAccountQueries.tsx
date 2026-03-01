import {useQuery} from "@tanstack/react-query";
import {Account} from "@/services/apis/types.tsx";
import {fetchAccounts} from "@/services/apis/accountApis.tsx";


export const useAccountsQuery = () => {
    return useQuery<Account[]>({
        queryKey: ['accounts'],
        queryFn: fetchAccounts,
        initialData: [],
    });
};