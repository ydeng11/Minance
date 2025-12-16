import { create } from 'zustand';

const currentYear = new Date().getFullYear();

interface DateRangeState {
  startDate: string;
  endDate: string;
  setDateRange: (startDate: string, endDate: string) => void;
}

export const DEFAULT_START_DATE = `${currentYear}-01-01`;
export const DEFAULT_END_DATE = `${currentYear}-12-31`;

export const useDateRangeStore = create<DateRangeState>((set) => ({
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  setDateRange: (startDate: string, endDate: string) => set({ startDate, endDate }),
})); 