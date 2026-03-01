import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createTransaction, deleteTransactions, updateTransaction} from "@/services/apis/transactionsApi.tsx";
import {toast} from "@/hooks/use-toast.ts";
import {Transaction} from "@/services/apis/types.tsx";

export const useTransactionMutation = () => {
    const queryClient = useQueryClient();

    const {mutate: importTransactionMutation} = useMutation({
        mutationFn: createTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['transactions']});
            toast({
                title: "Success",
                description: "Transactions imported successfully",
            });
        },
        onError: (error: Error) => {
            console.error("Import transactions error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to import transactions",
                variant: "destructive",
            });
        }
    });

    const {mutate: updateTransactionMutation} = useMutation({
        mutationFn: (params: { accountId: number, transactionId: number, transaction: Transaction }) =>
            updateTransaction(params.accountId, params.transactionId, params.transaction),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['transactions']});
            toast({
                title: "Success",
                description: "Transaction updated successfully",
            });
        },
        onError: (error: Error) => {
            console.error("Update transaction error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to update transaction",
                variant: "destructive",
            });
        }
    });

    const {mutate: deleteTransactionMutation} = useMutation({
        mutationFn: deleteTransactions,
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['transactions']});
            toast({
                title: "Success",
                description: "Transactions deleted successfully",
            });
        },
        onError: (error: Error) => {
            console.error("Delete transactions error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to delete transactions",
                variant: "destructive",
            });
        }
    });

    return {
        importTransactionMutation,
        updateTransactionMutation,
        deleteTransactionMutation
    };
}; 