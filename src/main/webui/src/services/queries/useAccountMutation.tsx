import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createAccount, deleteAccount, updateAccount} from "@/services/apis/accountApis.tsx";

export const useAccountMutation = () => {
    const queryClient = useQueryClient();

    const {mutate: createAccountMutation} = useMutation({
        mutationFn: createAccount,
        onSuccess: () => {
            console.log("createAccountMutation success");
            queryClient.invalidateQueries({queryKey: ['accounts'],}).then(() => {
                return
            });
        },
        onMutate: () => {
            console.log("createAccountMutation onMutate");
        },
        onError: (error) => {
            console.error("createAccountMutation onError", error);
        },
        onSettled: () => {
            console.log("createAccountMutation onSettled");
        },
    }, queryClient);

    const {mutate: updateAccountMutation} = useMutation({
        mutationFn: updateAccount,
        onSuccess: () => {
            console.log("updateAccountMutation success");
            queryClient.invalidateQueries({queryKey: ['accounts'],}).then(() => {
                return
            });
        },
        onMutate: () => {
            console.log("updateAccountMutation onMutate");
        },
        onError: (error) => {
            console.error("updateAccountMutation onError", error);
        },
        onSettled: () => {
            console.log("updateAccountMutation onSettled");
        },
    }, queryClient);

    const {mutate: deleteAccountMutation} = useMutation({
        mutationFn: deleteAccount,
        onSuccess: () => {
            console.log("deleteAccountMutation success");
            queryClient.invalidateQueries({queryKey: ['accounts'],}).then(() => {
                return
            });
        },
        onMutate: () => {
            console.log("deleteAccountMutation onMutate");
        },
        onError: (error) => {
            console.error("deleteAccountMutation onError", error);
        },
        onSettled: () => {
            console.log("deleteAccountMutation onSettled");
        },
    }, queryClient);

    return {createAccountMutation, updateAccountMutation, deleteAccountMutation};
};
