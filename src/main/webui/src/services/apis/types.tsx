export interface Account {
    accountId: number;
    bankId: number;
    bankName: string;
    accountName: string;
    accountType: string;
    initBalance: number;
}

export interface TransactionsUploadForm {
    bankName: string;
    accountName: string;
    useMinanceFormat: string;
}

export interface Transaction {
    transactionId: number;
    accountId: number;
    category: string;
    description: string;
    transactionType: string;
    transactionDate: string;
    postDate: string;
    memo: string;
    address: string;
    city: string;
    stateName: string;
    country: string;
    zipcode: string;
    amount: number;
    bankName: string;
    accountName: string;
    uploadTime: string;
    isDuplicate: number;
}

export interface OverviewSummary {
    totalExpenses: number;
    totalExpensesChangePercent: number;
    creditTotal: number;
    creditChangePercent: number;
    debitTotal: number;
    debitChangePercent: number;
    transactionCount: number;
    transactionChangeCount: number;
}
