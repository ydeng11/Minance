import {Transaction, TransactionsUploadForm} from "@/services/apis/types.tsx";

export const uploadTransactions = async (file: File, form: TransactionsUploadForm): Promise<string> => {
    const formData = new FormData();
    formData.append('csv', file);
    formData.append('form', JSON.stringify(form));

    const response = await fetch("/1.0/minance/transactions/upload_csv", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to upload transactions");
    }

    return response.text();
};

export const createTransaction = async (transaction: Transaction): Promise<string> => {
    const response = await fetch("/1.0/minance/transactions/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(transaction),
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to create transaction");
    }

    return response.text();
};

export const updateTransaction = async (
    accountId: number,
    transactionId: number,
    transaction: Transaction
): Promise<Transaction> => {
    const response = await fetch(
        `/1.0/minance/transactions/update/account/${accountId}/transaction/${transactionId}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(transaction),
        }
    );

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to update transaction");
    }

    return response.json();
};

export const retrieveTransactions = async (
    bankName: string,
    accountName: string,
    isDuplicate?: boolean
): Promise<Transaction[]> => {
    const url = new URL(`/1.0/minance/transactions/retrieve/${bankName}/${accountName}`);
    if (isDuplicate) {
        url.searchParams.append('duplicate', 'y');
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to retrieve transactions");
    }

    return response.json();
};

export const deleteTransaction = async (transactionId: number): Promise<void> => {
    const response = await fetch(`/1.0/minance/transactions/delete/${transactionId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to delete transaction");
    }
};

export const deleteTransactions = async (transactionIds: number[]): Promise<string> => {
    const response = await fetch("/1.0/minance/transactions/delete", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionIds),
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to delete transactions");
    }

    return response.text();
};

export const deleteTransactionsByUploadTime = async (uploadTime: string): Promise<string> => {
    const response = await fetch(
        `/1.0/minance/transactions/delete/uploadTime/${uploadTime}`,
        {
            method: "DELETE",
        }
    );

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to delete transactions by upload time");
    }

    return response.text();
};

export const retrieveAllTransactions = async (): Promise<Transaction[]> => {
    const response = await fetch("/1.0/minance/transactions/retrieve");

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to retrieve transactions");
    }

    return response.json();
};

export const retrieveTransactionsByDateRange = async (startDate: string, endDate: string): Promise<Transaction[]> => {
    const response = await fetch(
        `/1.0/minance/transactions/retrieve/${startDate}/${endDate}`
    );

    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Failed to retrieve transactions");
    }

    return response.json();
};