import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transaction } from '@/services/apis/types';

interface TransactionState {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set) => ({
      transactions: [],
      setTransactions: (transactions) => set({ transactions }),
    }),
    {
      name: 'transaction-storage',
    }
  )
); 