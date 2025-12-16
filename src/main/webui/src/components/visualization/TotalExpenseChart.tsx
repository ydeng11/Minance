import React, { useMemo } from 'react';
import { BarChart } from "@/components/analytics/BarChart.tsx";
import { ChartDataItem } from "@/types/chart";

interface TotalExpenseChartProps {
    chartData: ChartDataItem[];
    selectedCategories: string[];
    dataFormatter: (number: number) => string;
}

export const TotalExpenseChart: React.FC<TotalExpenseChartProps> = ({
    chartData,
    selectedCategories,
    dataFormatter
}) => {
    const totalData = useMemo(() => {
        // First calculate totals for each month
        const monthTotals = chartData.map(monthData => {
            const total = selectedCategories.reduce((sum, category) => {
                return sum + (Number(monthData[category]) || 0);
            }, 0);

            return {
                date: monthData.date,
                total
            };
        });

        // Then calculate month-over-month percentage changes
        return monthTotals.map((month, index) => {
            if (index === 0) {
                // No previous month for the first data point
                return {
                    ...month,
                    percentChange: null
                };
            }

            const previousMonth = monthTotals[index - 1];
            // Avoid division by zero
            if (previousMonth.total === 0) {
                return {
                    ...month,
                    percentChange: null
                };
            }

            // Calculate the percentage change
            const percentChange = ((month.total - previousMonth.total) / previousMonth.total) * 100;

            return {
                ...month,
                percentChange: percentChange
            };
        });
    }, [chartData, selectedCategories]);

    return (
        <div
            data-testid="total-expense-chart"
            className="mt-4 rounded-lg bg-gray-100 pt-4 shadow-lg"
        >
            {/* Percentage indicators above the chart */}
            <div className="mb-3 pl-[100px] pr-5 mx-auto">
                <div
                    className="grid w-full"
                    style={{
                        gridTemplateColumns: `repeat(${totalData.length}, 1fr)`,
                    }}
                >
                    {totalData.map((item, index) => {
                        if (index === 0) return <div key="spacer-0" className="invisible"></div>;

                        const percentChange = item.percentChange;
                        if (percentChange === null) return <div key={`no-percent-${index}`} className="invisible"></div>;

                        // Determine color based on value
                        const textColorClass = percentChange >= 0 ? 'text-green-600' : 'text-red-600';
                        const bgColorClass = percentChange >= 0 ? 'bg-green-50' : 'bg-red-50';

                        // Format percentage with sign
                        const formattedPercent = `${percentChange >= 0 ? '↑' : '↓'} ${Math.abs(percentChange).toFixed(1)}%`;

                        return (
                            <div
                                key={`percent-${index}`}
                                className={`text-center text-xs font-medium ${textColorClass} ${bgColorClass} px-2 py-1 rounded-full mx-auto w-fit`}
                            >
                                {formattedPercent}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Chart */}
            <BarChart
                data={totalData}
                index="date"
                categories={['total']}
                className="h-52"
                valueFormatter={dataFormatter}
                showXAxis={true}
                showYAxis={true}
                yAxisWidth={100}
                showGridLines={true}
                showLegend={false}
            />
        </div>
    );
};
