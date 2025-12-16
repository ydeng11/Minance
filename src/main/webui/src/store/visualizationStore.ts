import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChartType = "stacked" | "percentage";

interface VisualizationPreferences {
    chartType: ChartType;
    selectedCategories: string[];
    setChartType: (chartType: ChartType) => void;
    setSelectedCategories: (categories: string[]) => void;
}

export const useVisualizationStore = create<VisualizationPreferences>()(
    persist(
        (set) => ({
            chartType: "stacked",
            selectedCategories: [],
            setChartType: (chartType) => set({ chartType }),
            setSelectedCategories: (selectedCategories) => set({ selectedCategories }),
        }),
        {
            name: "visualization-preferences",
        }
    )
);
