// services/accountApi.ts

import {Account} from "./types"; // Define Account interface

export const createAccount = async (account: Account): Promise<Account> => {
    const response = await fetch("/1.0/minance/account/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(account),
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to create account");
    }

    return response.json();
};

export const updateAccount = async (account: Account): Promise<Account> => {
    const response = await fetch("/1.0/minance/account/update", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(account),
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to update account");
    }

    return response.json();
};

export const deleteAccount = async (
    params: { accountId?: number; bankName?: string; accountName?: string }
): Promise<void> => {
    const queryParams = {
        'account-id': params.accountId,
        'bank-name': params.bankName,
        'account-name': params.accountName
    };
    const query = new URLSearchParams(
        Object.entries(queryParams)
            .filter(([, v]) => v !== undefined)
            .reduce((acc, [k, v]) => ({...acc, [k]: v}), {})
    ).toString();
    const response = await fetch(`/1.0/minance/account/delete?${query}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to delete account");
    }
};

export const fetchAccounts = async (): Promise<Account[]> => {
    const response = await fetch("/1.0/minance/account/listAll");
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to retrieve accounts");
    }
    return response.json();
};

export const fetchAccountsByBank = async (bankName: string): Promise<Account[]> => {
    const response = await fetch(
        `/1.0/minance/account/listAccountsForBank?bank-name=${encodeURIComponent(
            bankName
        )}`
    );

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to retrieve accounts for bank");
    }

    return response.json();
};

export const fetchSupportedBanks = async (): Promise<string[]> => {
    const response = await fetch("/1.0/minance/account/supportedBanks");
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to retrieve supported banks");
    }
    return response.json();
};

export const fetchSupportedAccountTypes = async (): Promise<string[]> => {
    const response = await fetch("/1.0/minance/account/supportedAccountTypes");
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to retrieve supported account types");
    }
    return response.json();
};
