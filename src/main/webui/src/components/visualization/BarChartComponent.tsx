import React, { useEffect, useMemo, useState } from 'react';
import { useTransactionStore } from '@/store/transactionStore';
import { CategoryFilter } from './CategoryFilter';
import { ExpenseBarChart } from './ExpenseBarChart';
import { TotalExpenseChart } from './TotalExpenseChart';
import { CategoryPieChart } from './CategoryPieChart';
import { useDateRangeQuery } from '@/services/queries/useDateRangeQuery';
import { useImportStore } from '@/store/importStore';
import { useQueryClient } from '@tanstack/react-query';
import { buildMonthlyCategorySeries } from '@/lib/chartUtils';
import { useVisualizationStore } from '@/store/visualizationStore';

const BarChartComponent: React.FC = () => {
    const { data: queryTransactions, isLoading, isError, error } = useDateRangeQuery();
    const { transactions, setTransactions } = useTransactionStore();
    const { chartType, setChartType, selectedCategories, setSelectedCategories } = useVisualizationStore();
    const [hasInitialized, setHasInitialized] = useState(false);

    const queryClient = useQueryClient();
    const lastImportTime = useImportStore(state => state.lastImportTime);

    useEffect(() => {
        if (lastImportTime > 0) {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }
    }, [lastImportTime, queryClient]);

    useEffect(() => {
        if (queryTransactions) {
            setTransactions(queryTransactions);
        }
    }, [queryTransactions, setTransactions]);

    const currentTransactions = useMemo(() => queryTransactions || transactions, [queryTransactions, transactions]);

    // Derive chart data using useMemo instead of useEffect + useState
    const { categories, chartData } = useMemo(() => {
        if (!currentTransactions || currentTransactions.length === 0) {
            return { categories: [], chartData: [] };
        }
        const { categories: derivedCategories, data } = buildMonthlyCategorySeries(currentTransactions);
        return { categories: derivedCategories, chartData: data };
    }, [currentTransactions]);

    // Initialize selected categories when data first arrives
    useEffect(() => {
        // 1. Basic guard clauses
        if (hasInitialized || categories.length === 0) {
            return;
        }

        // 2. Calculate the desired selection
        const sanitized =
            selectedCategories.length > 0
                ? selectedCategories.filter((category) => categories.includes(category))
                : categories;

        const newSelection = sanitized.length > 0 ? sanitized : categories;

        // 3. CRITICAL FIX: Check if the update is actually necessary.
        // We compare the sorted stringified versions to ensure content equality
        // regardless of order or reference.
        const isSameSelection =
            selectedCategories.length === newSelection.length &&
            selectedCategories.every((val, index) => val === newSelection[index]);
        // Note: If order doesn't matter, you might want to sort before comparing,
        // but usually visual consistency implies stable order.

        if (isSameSelection) {
            // If data is already correct, just mark initialized and exit
            setHasInitialized(true);
            return;
        }

        // 4. Only update store if data is truly different
        queueMicrotask(() => {
            setSelectedCategories(newSelection);
            setHasInitialized(true);
        });
    }, [categories, hasInitialized, selectedCategories, setSelectedCategories]);

    const dataFormatter = (value: number) =>
        Intl.NumberFormat('us', {
            style: 'currency',
            currency: 'USD'
        }).format(value);

    const resolvedChartType = chartType === "percentage" ? "percent" : chartType;

    // Determine what content to show
    const showLoading = isLoading;
    const showError = !isLoading && isError;
    const showEmpty = !isLoading && !isError && chartData.length === 0;
    const showCharts = !isLoading && !isError && chartData.length > 0;

    return (
        <div>
            {/* CategoryFilter must ALWAYS render to maintain consistent hooks */}
            <CategoryFilter
                chartType={chartType}
                setChartType={setChartType}
                categories={categories}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
            />

            {showLoading && (
                <div
                    data-testid="expense-charts-loading"
                    className="flex h-64 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
                >
                    Loading chart data…
                </div>
            )}

            {showError && (
                <div
                    data-testid="expense-charts-error"
                    className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center text-destructive"
                >
                    Unable to load expense charts: {(error as Error)?.message ?? 'Unknown error'}
                </div>
            )}

            {showEmpty && (
                <div
                    data-testid="expense-charts-empty"
                    className="rounded-lg border bg-muted/40 p-8 text-center text-muted-foreground"
                >
                    No transactions available for the selected date range.
                </div>
            )}

            {/* Always render chart components to maintain consistent hooks, but hide when not needed */}
            <div style={{ display: showCharts ? 'block' : 'none' }}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="lg:col-span-2">
                        <ExpenseBarChart
                            chartData={chartData}
                            chartType={resolvedChartType}
                            selectedCategories={selectedCategories}
                            dataFormatter={dataFormatter}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <TotalExpenseChart
                            chartData={chartData}
                            selectedCategories={selectedCategories}
                            dataFormatter={dataFormatter}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <CategoryPieChart selectedCategories={selectedCategories} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BarChartComponent;
