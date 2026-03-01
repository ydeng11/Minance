import { ExpenseTable } from "@/components/visualization/ExpenseTable.tsx";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Activity,
    CreditCard,
    DollarSign,
    TrendingUp,
    TrendingDown
} from "lucide-react";
import { useOverviewQuery } from "@/services/queries/useOverviewQuery";

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
};

const formatPercent = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
};

const Overview = () => {
    const { data: overview, isLoading, isError } = useOverviewQuery();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <h2 className="sr-only">Financial overview metrics</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">...</div>
                                <p className="text-sm text-muted-foreground mt-1">...</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Expenses</CardTitle>
                        <CardDescription>
                            A list of your recent transactions across all accounts.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ExpenseTable />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isError || !overview) {
        return (
            <div className="space-y-6">
                <h2 className="sr-only">Financial overview metrics</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-muted-foreground">Error loading overview data</p>
                        </CardContent>
                    </Card>
                </div>
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Expenses</CardTitle>
                        <CardDescription>
                            A list of your recent transactions across all accounts.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ExpenseTable />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totalExpensesChange = overview.totalExpensesChangePercent;
    const creditChange = overview.creditChangePercent;
    const debitChange = overview.debitChangePercent;
    const transactionChange = overview.transactionChangeCount;

    return (
        <div className="space-y-6">
            <h2 className="sr-only">Financial overview metrics</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Expenses
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(overview.totalExpenses)}</div>
                        <p className="text-sm text-muted-foreground flex items-center mt-1 font-medium">
                            {totalExpensesChange >= 0 ? (
                                <>
                                    <TrendingUp className="h-3 w-3 text-rose-700 mr-1" aria-hidden="true" />
                                    <span className="text-rose-700 font-semibold">{formatPercent(totalExpensesChange)}</span>
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="h-3 w-3 text-emerald-700 mr-1" aria-hidden="true" />
                                    <span className="text-emerald-700 font-semibold">{formatPercent(totalExpensesChange)}</span>
                                </>
                            )}
                            <span className="ml-1">from last period</span>
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Credit
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {overview.creditTotal >= 0 ? '+' : ''}{formatCurrency(overview.creditTotal)}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center mt-1 font-medium">
                            {creditChange >= 0 ? (
                                <>
                                    <TrendingUp className="h-3 w-3 text-emerald-800 mr-1" aria-hidden="true" />
                                    <span className="text-emerald-800 font-semibold">{formatPercent(creditChange)}</span>
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="h-3 w-3 text-rose-800 mr-1" aria-hidden="true" />
                                    <span className="text-rose-800 font-semibold">{formatPercent(creditChange)}</span>
                                </>
                            )}
                            <span className="ml-1">from last period</span>
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Debit</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {overview.debitTotal >= 0 ? '+' : ''}{formatCurrency(overview.debitTotal)}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center mt-1 font-medium">
                            {debitChange >= 0 ? (
                                <>
                                    <TrendingUp className="h-3 w-3 text-emerald-800 mr-1" aria-hidden="true" />
                                    <span className="text-emerald-800 font-semibold">{formatPercent(debitChange)}</span>
                                </>
                            ) : (
                                <>
                                    <TrendingDown className="h-3 w-3 text-amber-900 mr-1" aria-hidden="true" />
                                    <span className="text-amber-900 font-semibold">{formatPercent(debitChange)}</span>
                                </>
                            )}
                            <span className="ml-1">from last period</span>
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Transactions
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{overview.transactionCount}</div>
                        <p className="text-sm text-muted-foreground flex items-center mt-1 font-medium">
                            <span className="text-foreground font-semibold">
                                {transactionChange >= 0 ? '+' : ''}{transactionChange}
                            </span>
                            <span className="ml-1">from last period</span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Recent Expenses</CardTitle>
                    <CardDescription>
                        A list of your recent transactions across all accounts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ExpenseTable />
                </CardContent>
            </Card>
        </div>
    );
};

export default Overview;
