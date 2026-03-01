import { create } from 'zustand';

interface ImportState {
    lastImportTime: number;
    triggerRefresh: () => void;
}

export const useImportStore = create<ImportState>()((set) => ({
    lastImportTime: 0,
    triggerRefresh: () => set({ lastImportTime: Date.now() })
}));
