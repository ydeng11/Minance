import React, { useMemo } from 'react';
import { DonutChart } from "@/components/analytics/DonutChart";
import { useTransactionStore } from '@/store/transactionStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDateRangeQuery } from '@/services/queries/useDateRangeQuery';
import { useImportStore } from '@/store/importStore';
import { useQueryClient } from '@tanstack/react-query';

interface CategoryPieChartProps {
    selectedCategories: string[];
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
    selectedCategories
}) => {
    // Get transactions directly from the date range query to update when date picker changes
    const { data: queryTransactions } = useDateRangeQuery();
    const { transactions } = useTransactionStore();

    // Get the query client for manual refetching
    const queryClient = useQueryClient();

    // Get the last import time to trigger refreshes
    const lastImportTime = useImportStore(state => state.lastImportTime);

    // Effect to refetch data when new transactions are imported
    React.useEffect(() => {
        if (lastImportTime > 0) {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }
    }, [lastImportTime, queryClient]);

    // Use query transactions if available, otherwise fall back to store
    const currentTransactions = queryTransactions || transactions;

    // Process the data for the pie chart
    const pieChartData = useMemo(() => {
        if (!currentTransactions || currentTransactions.length === 0) {
            return [];
        }

        // Filter for expenses (positive amounts) and selected categories
        // Positive amounts = expenses, negative amounts = payments/transfers/refunds
        const filteredTransactions = currentTransactions.filter(
            transaction =>
                transaction.amount > 0 &&
                selectedCategories.includes(transaction.category || 'Uncategorized')
        );

        // Group and sum the transactions by category
        const categoryTotals = filteredTransactions.reduce((acc, transaction) => {
            const category = transaction.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + transaction.amount;
            return acc;
        }, {} as Record<string, number>);

        // Convert to array format required by DonutChart
        return Object.entries(categoryTotals).map(([category, amount]) => ({
            category,
            amount, // Already positive from filtering, no need for Math.abs
        })).sort((a, b) => b.amount - a.amount); // Sort by amount (largest first)
    }, [currentTransactions, selectedCategories]);

    // Calculate total
    const total = useMemo(() => {
        return pieChartData.reduce((sum, item) => sum + item.amount, 0);
    }, [pieChartData]);

    // Format currency values
    const valueFormatter = (value: number) => {
        return new Intl.NumberFormat('us', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <Card data-testid="category-pie-chart" className="mt-4 rounded-lg bg-gray-100 shadow-lg">
            <CardHeader>
                <CardTitle className="text-lg font-medium">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center">
                    {pieChartData.length > 0 ? (
                        <>
                            <DonutChart
                                data={pieChartData}
                                category="category"
                                value="amount"
                                valueFormatter={valueFormatter}
                                showTooltip={true}
                                showLabel={true}
                                label={valueFormatter(total)}
                                className="h-60 w-full max-w-xs mx-auto"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 w-full">
                                {pieChartData.map((item) => (
                                    <div key={item.category} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-md">
                                        <span className="font-medium truncate">{item.category}</span>
                                        <span className="text-sm ml-2 font-bold text-right">
                                            {valueFormatter(item.amount)}
                                            <span className="ml-1 text-gray-500 font-normal">
                                                ({((item.amount / total) * 100).toFixed(1)}%)
                                            </span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="py-8 text-center text-gray-500">
                            No data available for the selected categories
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
