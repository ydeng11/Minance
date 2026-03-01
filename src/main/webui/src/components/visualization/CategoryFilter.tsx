import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { Label } from "@/components/ui/label.tsx";
import { MultiSelect } from "@/components/ui/multi-select";
import { ChartType } from '@/store/visualizationStore';

interface CategoryFilterProps {
    chartType: ChartType;
    setChartType: (value: ChartType) => void;
    categories: string[];
    selectedCategories: string[];
    setSelectedCategories: (categories: string[]) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
    chartType,
    setChartType,
    categories,
    selectedCategories,
    setSelectedCategories,
}) => {
    const categoryOptions = categories.map(category => ({
        label: category,
        value: category,
    }));

    return (
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <RadioGroup
                value={chartType}
                className="flex flex-wrap gap-4"
                onValueChange={setChartType}
                aria-label="Expense chart display mode"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="stacked" id="stacked" />
                    <Label htmlFor="stacked" className="text-sm font-medium">
                        Stacked
                    </Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="percentage" />
                    <Label htmlFor="percentage" className="text-sm font-medium">
                        Percentage
                    </Label>
                </div>
            </RadioGroup>

            <MultiSelect
                options={categoryOptions}
                onValueChange={setSelectedCategories}
                defaultValue={selectedCategories}
                placeholder={categories.length === 0 ? "Loading..." : "Select categories"}
                variant="inverted"
                animation={2}
                maxCount={5}
            />
        </div>
    );
};
