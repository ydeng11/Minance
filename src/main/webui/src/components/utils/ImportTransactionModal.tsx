import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useBankAndAccountTypeQuery } from "@/services/queries/useBankAndAccountTypeQuery";
import { toast } from "@/hooks/use-toast";
import { useAccountByBankQuery } from "@/services/queries/useAccountsByBankQuery.tsx";
import { Account, TransactionsUploadForm } from "@/services/apis/types.tsx";
import { uploadTransactions } from "@/services/apis/transactionsApi.tsx";
import { useImportStore } from "@/store/importStore";
import { useQueryClient } from "@tanstack/react-query";

const ImportTransactions: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        bank: "",
        account: "",
        file: null as File | null,
        useMinanceFormat: false,
    });
    const { supportedBanks, isLoading: isBanksLoading, isError: isBanksError } = useBankAndAccountTypeQuery();
    const {
        data: accounts,
        isLoading: isAccountsLoading,
        isError: isAccountsError
    } = useAccountByBankQuery(formData.bank);

    // Get the triggerRefresh function from the import store
    const triggerRefresh = useImportStore(state => state.triggerRefresh);

    // Get the query client to invalidate queries
    const queryClient = useQueryClient();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData((prev) => ({ ...prev, file: e.target.files![0] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.file || !formData.bank || !formData.account) {
            toast({
                title: "Error",
                description: "Please fill in all fields",
                variant: "destructive",
            });
            return;
        }

        try {
            const uploadForm: TransactionsUploadForm = {
                bankName: formData.bank,
                accountName: formData.account,
                useMinanceFormat: formData.useMinanceFormat ? 'y' : 'n'
            };

            await uploadTransactions(formData.file, uploadForm);

            // Reset form and close dialog
            setOpen(false);
            setFormData({ bank: '', account: '', file: null, useMinanceFormat: false });

            // Notify success
            toast({
                title: "Success",
                description: "Transactions imported successfully",
            });

            // Trigger refresh for visualization components
            triggerRefresh();

            // Invalidate transaction queries to force refetch
            queryClient.invalidateQueries({ queryKey: ['transactions'] });

        } catch (error) {
            console.error('Error uploading file:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to import transactions",
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default">
                    Import Transactions
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Import transactions</DialogTitle>
                    <DialogDescription>Import transactions in csv format</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Bank Dropdown */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="bank" className="text-right">
                                Bank
                            </Label>
                            <Select
                                onValueChange={(value) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        bank: value,
                                        account: "", // Reset account when bank changes
                                    }))
                                }
                                value={formData.bank}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a bank" />
                                </SelectTrigger>
                                <SelectContent>
                                    {isBanksLoading ? (
                                        <div className="px-4 py-2">Loading banks...</div>
                                    ) : isBanksError ? (
                                        <div className="px-4 py-2 text-red-500">Error loading banks</div>
                                    ) : supportedBanks?.data?.length ? (
                                        supportedBanks.data.map((bank) => (
                                            <SelectItem key={bank} value={bank}>
                                                {bank}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="px-4 py-2 text-gray-500">No banks available</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Account Dropdown */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="account" className="text-right">
                                Account
                            </Label>
                            <Select
                                onValueChange={(value) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        account: value,
                                    }))
                                }
                                value={formData.account}
                                disabled={!formData.bank || isAccountsLoading}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select an account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {isAccountsLoading ? (
                                        <div className="px-4 py-2">Loading accounts...</div>
                                    ) : isAccountsError ? (
                                        <div className="px-4 py-2 text-red-500">Error loading accounts</div>
                                    ) : accounts?.length ? (
                                        accounts.map((account: Account) => (
                                            <SelectItem key={account.accountId} value={account.accountName}>
                                                {account.accountName}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="px-4 py-2 text-gray-500">No accounts available</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* File Input */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="csvFile" className="text-right">
                                CSV File
                            </Label>
                            <Input
                                id="csvFile"
                                type="file"
                                accept=".csv"
                                className="col-span-3"
                                onChange={handleFileChange}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Import</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ImportTransactions;
