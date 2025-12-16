import {create} from 'zustand';
import {MinanceCategory} from '@/services/apis/categoryMappingApis.tsx';

interface CategoryState {
    selectedCategory: string;
    minanceCategories: MinanceCategory[];
    setSelectedCategory: (category: string) => void;
    setMinanceCategories: (categories: MinanceCategory[]) => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
    selectedCategory: '',
    minanceCategories: [],
    setSelectedCategory: (category) => set({selectedCategory: category}),
    setMinanceCategories: (categories) => set({minanceCategories: categories}),
})); 