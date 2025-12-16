import { useMemo, useState, useEffect } from 'react';
import { useTransactionStore } from '@/store/transactionStore';
import { useDateRangeQuery } from '@/services/queries/useDateRangeQuery';
import { useImportStore } from '@/store/importStore';
import { useQueryClient } from '@tanstack/react-query';

type MerchantData = {
    merchant: string;
    totalSpent: number;
    transactionCount: number;
    averageAmount: number;
    lastTransaction: string;
    categories: Record<string, number>;
};

export const useMerchantAnalytics = () => {
    const { data: queryTransactions } = useDateRangeQuery();
    const { transactions } = useTransactionStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
    const [excludedMerchants, setExcludedMerchants] = useState<string[]>([]);
    const [showOthersCategory, setShowOthersCategory] = useState(false);

    // Get the query client for manual refetching
    const queryClient = useQueryClient();

    // Get the last import time to trigger refreshes
    const lastImportTime = useImportStore(state => state.lastImportTime);

    // Effect to refetch data when new transactions are imported
    useEffect(() => {
        if (lastImportTime > 0) {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }
    }, [lastImportTime, queryClient]);

    // Use query transactions if available, otherwise fall back to store
    const currentTransactions = queryTransactions || transactions;
    const hasTransactions = Boolean(currentTransactions && currentTransactions.length > 0);

    // Process merchant analytics data
    const merchantData = useMemo(() => {
        if (!currentTransactions || currentTransactions.length === 0) {
            return [];
        }

        const merchantMap = new Map<string, MerchantData>();

        // Group transactions by merchant/description
        currentTransactions.forEach(transaction => {
            // Use description as merchant name
            const merchant = transaction.description;
            if (!merchant) return;

            // Skip excluded merchants
            if (excludedMerchants.includes(merchant)) return;

            // Skip transactions with no amount
            if (transaction.amount === 0) return;

            // Initialize merchant data if not exists
            if (!merchantMap.has(merchant)) {
                merchantMap.set(merchant, {
                    merchant,
                    totalSpent: 0,
                    transactionCount: 0,
                    averageAmount: 0,
                    lastTransaction: transaction.transactionDate,
                    categories: {}
                });
            }

            const data = merchantMap.get(merchant)!;

            // Increment merchant stats
            data.totalSpent += Math.abs(transaction.amount);
            data.transactionCount += 1;

            // Track spending by category
            const category = transaction.category || 'Uncategorized';
            data.categories[category] = (data.categories[category] || 0) + Math.abs(transaction.amount);

            // Update last transaction date if newer
            if (new Date(transaction.transactionDate) > new Date(data.lastTransaction)) {
                data.lastTransaction = transaction.transactionDate;
            }
        });

        // Calculate average amount and convert to array
        return Array.from(merchantMap.values())
            .map(merchant => ({
                ...merchant,
                averageAmount: merchant.totalSpent / merchant.transactionCount
            }))
            .sort((a, b) => b.totalSpent - a.totalSpent); // Sort by total spent
    }, [currentTransactions, excludedMerchants]);

    // Filter merchants by search term
    const displayedMerchants = useMemo(() => {
        if (showOthersCategory) {
            // When showing Others category, get merchants beyond top 10
            return merchantData.slice(10);
        }

        // Otherwise use the regular filtered merchants
        if (!searchTerm.trim()) return merchantData;
        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        return merchantData.filter(m =>
            m.merchant.toLowerCase().includes(lowerSearchTerm)
        );
    }, [merchantData, searchTerm, showOthersCategory]);

    // Get data for selected merchant
    const selectedMerchantData = useMemo(() => {
        if (!selectedMerchant) return null;
        return merchantData.find(m => m.merchant === selectedMerchant) || null;
    }, [merchantData, selectedMerchant]);

    // Top merchants for pie chart
    const topMerchants = useMemo(() => {
        const top = merchantData.slice(0, 10);
        const othersMerchants = merchantData.slice(10);
        const otherSum = othersMerchants.reduce((sum, m) => sum + m.totalSpent, 0);

        const result = top.map(m => ({
            merchant: m.merchant,
            amount: m.totalSpent
        }));

        if (otherSum > 0) {
            result.push({ merchant: 'Others', amount: otherSum });
        }

        return {
            chartData: result,
            othersMerchants: othersMerchants
        };
    }, [merchantData]);

    // Get category chart data for selected merchant
    const categoryChartData = useMemo(() => {
        if (!selectedMerchantData) return [];

        return Object.entries(selectedMerchantData.categories)
            .map(([category, amount]) => ({
                category,
                amount
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [selectedMerchantData]);

    // Filter to show only "Others" merchants
    const handleShowOthersCategory = () => {
        setShowOthersCategory(!showOthersCategory);
        if (!showOthersCategory) {
            // If turning on Others view, clear any existing search
            setSearchTerm('');
        }
    };

    const resetFilters = () => {
        setSearchTerm('');
        setExcludedMerchants([]);
        setSelectedMerchant(null);
        setShowOthersCategory(false);
    };

    const emptyStateMessage = hasTransactions
        ? null
        : 'No transactions available for merchant analytics.';

    return {
        merchantData,
        displayedMerchants,
        selectedMerchantData,
        topMerchants,
        othersMerchants: topMerchants.othersMerchants,
        categoryChartData,
        searchTerm,
        setSearchTerm,
        selectedMerchant,
        setSelectedMerchant,
        excludedMerchants,
        setExcludedMerchants,
        showOthersCategory,
        handleShowOthersCategory,
        resetFilters,
        hasTransactions,
        emptyStateMessage
    };
};
