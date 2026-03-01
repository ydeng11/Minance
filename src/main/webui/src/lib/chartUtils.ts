import { addMonths, isAfter, parseISO, startOfMonth } from "date-fns";
import type { Transaction } from "@/services/apis/types";
import type { ChartDataItem } from "@/types/chart";

// Tremor Raw chartColors [v0.1.0]

export type ColorUtility = "bg" | "stroke" | "fill" | "text"

export const chartColors = {
    blue: {
        bg: "bg-blue-500",
        stroke: "stroke-blue-500",
        fill: "fill-blue-500",
        text: "text-blue-500",
    },
    emerald: {
        bg: "bg-emerald-500",
        stroke: "stroke-emerald-500",
        fill: "fill-emerald-500",
        text: "text-emerald-500",
    },
    violet: {
        bg: "bg-violet-500",
        stroke: "stroke-violet-500",
        fill: "fill-violet-500",
        text: "text-violet-500",
    },
    amber: {
        bg: "bg-amber-500",
        stroke: "stroke-amber-500",
        fill: "fill-amber-500",
        text: "text-amber-500",
    },
    gray: {
        bg: "bg-gray-500",
        stroke: "stroke-gray-500",
        fill: "fill-gray-500",
        text: "text-gray-500",
    },
    cyan: {
        bg: "bg-cyan-500",
        stroke: "stroke-cyan-500",
        fill: "fill-cyan-500",
        text: "text-cyan-500",
    },
    pink: {
        bg: "bg-pink-500",
        stroke: "stroke-pink-500",
        fill: "fill-pink-500",
        text: "text-pink-500",
    },
    lime: {
        bg: "bg-lime-500",
        stroke: "stroke-lime-500",
        fill: "fill-lime-500",
        text: "text-lime-500",
    },
    fuchsia: {
        bg: "bg-fuchsia-500",
        stroke: "stroke-fuchsia-500",
        fill: "fill-fuchsia-500",
        text: "text-fuchsia-500",
    },
} as const satisfies {
    [color: string]: {
        [key in ColorUtility]: string
    }
}

export type AvailableChartColorsKeys = keyof typeof chartColors

export const AvailableChartColors: AvailableChartColorsKeys[] = Object.keys(
    chartColors,
) as Array<AvailableChartColorsKeys>

export const constructCategoryColors = (
    categories: string[],
    colors: AvailableChartColorsKeys[],
): Map<string, AvailableChartColorsKeys> => {
    const categoryColors = new Map<string, AvailableChartColorsKeys>()
    categories.forEach((category, index) => {
        categoryColors.set(category, colors[index % colors.length])
    })
    return categoryColors
}

export const getColorClassName = (
    color: AvailableChartColorsKeys,
    type: ColorUtility,
): string => {
    const fallbackColor = {
        bg: "bg-gray-500",
        stroke: "stroke-gray-500",
        fill: "fill-gray-500",
        text: "text-gray-500",
    }
    return chartColors[color]?.[type] ?? fallbackColor[type]
}

// Tremor Raw getYAxisDomain [v0.0.0]

export const getYAxisDomain = (
    autoMinValue: boolean,
    minValue: number | undefined,
    maxValue: number | undefined,
) => {
    const minDomain = autoMinValue ? "auto" : minValue ?? 0
    const maxDomain = maxValue ?? "auto"
    return [minDomain, maxDomain]
}

// Tremor Raw hasOnlyOneValueForKey [v0.1.0]

export function hasOnlyOneValueForKey(
    array: Record<string, unknown>[],
    keyToCheck: string,
): boolean {
    const val: unknown[] = []

    for (const obj of array) {
        if (Object.prototype.hasOwnProperty.call(obj, keyToCheck)) {
            val.push(obj[keyToCheck])
            if (val.length > 1) {
                return false
            }
        }
    }

    return true
}

const monthFormatter = new Intl.DateTimeFormat("en", {
    month: "short",
    year: "2-digit",
});

export const formatChartMonth = (date: Date) => monthFormatter.format(date);

export const buildMonthlyCategorySeries = (
    transactions: Transaction[],
): { categories: string[]; data: ChartDataItem[] } => {
    // Filter for expenses: POSITIVE amounts are expenses (charges to credit cards, debits from accounts)
    // NEGATIVE amounts are payments/transfers/refunds
    const expenses = transactions.filter(
        (transaction) => typeof transaction.amount === "number" && transaction.amount > 0,
    );

    if (expenses.length === 0) {
        return {
            categories: [],
            data: [],
        };
    }

    const orderedMonths = expenses
        .map((transaction) => startOfMonth(parseISO(transaction.transactionDate)))
        .sort((a, b) => a.getTime() - b.getTime());

    const timeline: Date[] = [];
    for (
        let cursor = startOfMonth(orderedMonths[0]);
        !isAfter(cursor, orderedMonths[orderedMonths.length - 1]);
        cursor = addMonths(cursor, 1)
    ) {
        timeline.push(cursor);
    }

    // Extract categories only from expenses (positive amounts)
    // This excludes non-expense categories like "Transfers", "Other Income", etc.
    const categories = Array.from(
        new Set(
            expenses.map((transaction) => {
                const category = transaction.category?.trim();
                return category && category !== "" ? category : "Uncategorized";
            }),
        ),
    ).sort((a, b) => a.localeCompare(b));

    const series: ChartDataItem[] = timeline.map((date) => {
        const label = formatChartMonth(date);
        const item: ChartDataItem = { date: label };
        categories.forEach((category) => {
            item[category] = 0;
        });
        return item;
    });

    const monthMap = new Map(series.map((item) => [item.date, item]));

    expenses.forEach((transaction) => {
        const category = transaction.category?.trim();
        const normalizedCategory = category && category !== "" ? category : "Uncategorized";
        const monthKey = formatChartMonth(
            startOfMonth(parseISO(transaction.transactionDate)),
        );
        const entry = monthMap.get(monthKey);
        if (!entry) {
            return;
        }
        entry[normalizedCategory] =
            (Number(entry[normalizedCategory]) || 0) + Math.abs(transaction.amount);
    });

    return {
        categories,
        data: series,
    };
};
