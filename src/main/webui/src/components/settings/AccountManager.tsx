"use client"

import * as React from "react"
import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import { Account } from "@/services/apis/types.tsx";
import { useAccountMutation } from "@/services/queries/useAccountMutation.tsx";
import { useAccountsQuery } from "@/services/queries/useAccountQueries.tsx";
import { useBankAndAccountTypeQuery } from "@/services/queries/useBankAndAccountTypeQuery.tsx";
import { Card } from "@/components/ui/card";
import { AccountForm, type AccountFormValues } from "@/components/settings/AccountForm";

// eslint-disable-next-line react-refresh/only-export-components
export const columns: ColumnDef<Account>[] = [
    {
        accessorKey: "bankName",
        header: "Bank",
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("bankName")}</div>
        ),
    },
    {
        accessorKey: "accountName",
        header: "Account",
        cell: ({ row }) => <div>{row.getValue("accountName")}</div>,
    },
    {
        accessorKey: "accountType",
        header: "Type",
        cell: ({ row }) => (
            <div>{row.getValue("accountType")}</div>
        ),
    },
    {
        accessorKey: "initBalance",
        header: "Balance",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("initBalance"))
            const formatted = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
            }).format(amount)
            return <div className="font-medium">{formatted}</div>
        },
    }
]

const emptyAccountValues: AccountFormValues = {
    bankName: '',
    accountName: '',
    accountType: '',
    initBalance: 0.0,
};

export function AccountManager() {
    const { data, isLoading, isError, error: accountsError } = useAccountsQuery();
    const { createAccountMutation, updateAccountMutation, deleteAccountMutation } = useAccountMutation();
    const accounts = data ?? [];

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [isDialogOpen, setIsDialogOpen] = React.useState<boolean>(false);
    const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create");
    const [formValues, setFormValues] = React.useState<AccountFormValues>(emptyAccountValues);
    const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(null);
    const { supportedBanks, supportedAccountTypes, isLoading: isLoadingOptions } = useBankAndAccountTypeQuery();

    const buildAccountPayload = (values: AccountFormValues, account?: Account) => ({
        accountId: account?.accountId ?? 0,
        bankId: account?.bankId ?? 0,
        bankName: values.bankName,
        accountName: values.accountName,
        accountType: values.accountType,
        initBalance: values.initBalance,
    });

    const handleDialogSubmit = (values: AccountFormValues) => {
        if (dialogMode === "edit" && selectedAccount) {
            updateAccountMutation({
                ...buildAccountPayload(values, selectedAccount),
                accountId: selectedAccount.accountId,
            });
        } else {
            createAccountMutation(buildAccountPayload(values));
        }
        setIsDialogOpen(false);
        setSelectedAccount(null);
        setFormValues(emptyAccountValues);
    };

    const handleDeleteAccount = async (accountId: number) => {
        try {
            deleteAccountMutation({ accountId });
        } catch (error) {
            console.error('Failed to delete account:', error);
        }
    };

    const openCreateDialog = () => {
        setDialogMode("create");
        setSelectedAccount(null);
        setFormValues(emptyAccountValues);
        setIsDialogOpen(true);
    };

    const openModifyDialog = (account: Account) => {
        setSelectedAccount(account);
        setDialogMode("edit");
        setFormValues({
            bankName: account.bankName,
            accountName: account.accountName,
            accountType: account.accountType,
            initBalance: account.initBalance,
        });
        setIsDialogOpen(true);
    };

    const actionsColumn: ColumnDef<Account> = {
        id: "actions",
        cell: ({ row }) => {
            const account: Account = row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            data-testid="account-actions-trigger"
                        >
                            <span className="sr-only">Open menu</span>
                            <DotsHorizontalIcon className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => openModifyDialog(account)}
                            className="cursor-pointer"
                        >
                            Modify
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleDeleteAccount(account.accountId)}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    };

    const table = useReactTable({
        data: accounts,
        columns: [...columns, actionsColumn],
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    if (isLoading) {
        return (
            <Card data-testid="accounts-skeleton" className="p-6 text-center text-muted-foreground">
                Loading accounts…
            </Card>
        );
    }

    if (isError) {
        return (
            <Card
                data-testid="accounts-error"
                className="border-destructive/50 bg-destructive/5 p-6 text-center text-destructive"
            >
                Unable to load accounts: {(accountsError as Error)?.message ?? 'Unknown error'}
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Account Manager</h2>
                    <p className="text-muted-foreground">
                        Manage your connected bank accounts and balances.
                    </p>
                </div>
                <Button onClick={openCreateDialog}>
                    Add New Account
                </Button>
            </div>

            <Card>
                <div className="p-0">
                    <Table data-testid="account-table">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length + 1}
                                        className="h-24 text-center"
                                    >
                                        No accounts found. Add one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{dialogMode === 'edit' ? 'Modify Account' : 'Add New Account'}</DialogTitle>
                        <DialogDescription>
                            {dialogMode === 'edit'
                                ? 'Update the details for this account.'
                                : 'Enter the details for your new bank account.'}
                        </DialogDescription>
                    </DialogHeader>
                    <AccountForm
                        mode={dialogMode}
                        initialValues={formValues}
                        supportedBanks={supportedBanks.data ?? []}
                        supportedAccountTypes={supportedAccountTypes.data ?? []}
                        isSubmitting={isLoadingOptions}
                        onSubmit={handleDialogSubmit}
                        onCancel={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}
