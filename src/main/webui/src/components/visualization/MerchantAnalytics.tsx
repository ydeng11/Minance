import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DonutChart } from "@/components/analytics/DonutChart";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchIcon, XCircleIcon, PlusCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMerchantAnalytics } from '@/hooks/useMerchantAnalytics';

export const MerchantAnalytics: React.FC = () => {
    const {
        displayedMerchants,
        selectedMerchantData,
        topMerchants,
        categoryChartData,
        searchTerm,
        setSearchTerm,
        selectedMerchant,
        setSelectedMerchant,
        excludedMerchants,
        setExcludedMerchants,
        showOthersCategory,
        handleShowOthersCategory,
        othersMerchants,
        resetFilters,
        emptyStateMessage,
    } = useMerchantAnalytics();

    const [exclusionInput, setExclusionInput] = useState('');

    // Handle adding a merchant to exclusion list
    const handleAddExclusion = () => {
        if (!exclusionInput.trim() || excludedMerchants.includes(exclusionInput.trim())) return;
        setExcludedMerchants([...excludedMerchants, exclusionInput.trim()]);
        setExclusionInput('');
    };

    // Handle removing a merchant from exclusion list
    const handleRemoveExclusion = (merchant: string) => {
        setExcludedMerchants(excludedMerchants.filter(m => m !== merchant));
    };

    // Handle excluding the selected merchant
    const handleExcludeSelected = () => {
        if (selectedMerchant && !excludedMerchants.includes(selectedMerchant)) {
            setExcludedMerchants([...excludedMerchants, selectedMerchant]);
            setSelectedMerchant(null);
        }
    };

    // Format currency values
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('us', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Format date values
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div data-testid="merchant-analytics-area" className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search merchants..."
                        className="pl-8"
                        data-testid="merchant-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                        <Input
                            placeholder="Add merchant to exclude..."
                            value={exclusionInput}
                            onChange={(e) => setExclusionInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddExclusion();
                            }}
                        />
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddExclusion}
                    >
                        <PlusCircleIcon className="mr-1 h-4 w-4" />
                        Add Filter
                    </Button>

                    {selectedMerchant && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExcludeSelected}
                        >
                            <XCircleIcon className="mr-1 h-4 w-4" />
                            Exclude Selected
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={resetFilters}
                    >
                        Reset Filters
                    </Button>
                </div>
            </div>

            {emptyStateMessage && (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                    {emptyStateMessage}
                </div>
            )}

            {excludedMerchants.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">Excluded merchants:</span>
                    {excludedMerchants.map(merchant => (
                        <Badge
                            key={merchant}
                            variant="outline"
                            className="flex items-center gap-1"
                        >
                            {merchant}
                            <XCircleIcon
                                className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveExclusion(merchant)}
                            />
                        </Badge>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Merchant Spending Distribution */}
                <Card>
                    <CardHeader className="flex flex-col space-y-1">
                        <CardTitle className="text-lg font-medium">Top Merchants by Spending</CardTitle>
                        <div className="flex justify-between items-center">
                            <div className="text-xs text-muted-foreground">
                                Showing top 10 merchants. "Others" combines all remaining merchants.
                            </div>
                            <Button
                                size="sm"
                                variant={showOthersCategory ? "default" : "outline"}
                                onClick={handleShowOthersCategory}
                                className="text-xs"
                            >
                                {showOthersCategory ? "Show All Merchants" : "Show 'Others' Merchants"}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DonutChart
                            data={topMerchants.chartData}
                            category="merchant"
                            value="amount"
                            valueFormatter={formatCurrency}
                            showTooltip={true}
                            showLabel={true}
                            className="h-60 w-full max-w-xs mx-auto"
                        />
                    </CardContent>
                </Card>

                {/* Merchant Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">
                            {selectedMerchantData ? `${selectedMerchantData.merchant} Details` : 'Select a Merchant'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent data-testid="merchant-detail-card">
                        {selectedMerchantData ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-muted/50 p-3 rounded-md">
                                        <div className="text-sm text-muted-foreground">Total Spent</div>
                                        <div className="text-xl font-bold">{formatCurrency(selectedMerchantData.totalSpent)}</div>
                                    </div>
                                    <div className="bg-muted/50 p-3 rounded-md">
                                        <div className="text-sm text-muted-foreground">Transactions</div>
                                        <div className="text-xl font-bold">{selectedMerchantData.transactionCount}</div>
                                    </div>
                                    <div className="bg-muted/50 p-3 rounded-md">
                                        <div className="text-sm text-muted-foreground">Average</div>
                                        <div className="text-xl font-bold">{formatCurrency(selectedMerchantData.averageAmount)}</div>
                                    </div>
                                    <div className="bg-muted/50 p-3 rounded-md">
                                        <div className="text-sm text-muted-foreground">Last Transaction</div>
                                        <div className="text-xl font-bold">{formatDate(selectedMerchantData.lastTransaction)}</div>
                                    </div>
                                </div>

                                {/* Categories distribution */}
                                <div>
                                    <h3 className="text-sm font-medium mb-2">Category Breakdown</h3>
                                    <div className="bg-muted/50 p-3 rounded-md">
                                        <div className="space-y-2">
                                            {categoryChartData.map(cat => (
                                                <div key={cat.category} className="flex justify-between">
                                                    <div>{cat.category}</div>
                                                    <div className="font-medium">{formatCurrency(cat.amount)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Select a merchant from the table below to view details
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Merchant Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-medium">
                        {showOthersCategory
                            ? "Merchants in 'Others' Category"
                            : "Merchant Spending Analysis"}
                    </CardTitle>
                    {showOthersCategory && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <p>
                                Showing merchants not in the top 10 (combined as "Others" in the chart)
                            </p>
                            <Badge data-testid="others-merchant-count" variant="secondary">
                                {othersMerchants.length} merchants
                            </Badge>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table data-testid="merchant-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Merchant</TableHead>
                                    <TableHead className="text-right">Total Spent</TableHead>
                                    <TableHead className="text-right">Transactions</TableHead>
                                    <TableHead className="text-right">Average</TableHead>
                                    <TableHead>Last Transaction</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedMerchants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                            No merchants found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayedMerchants.slice(0, 20).map((merchant) => (
                                        <TableRow
                                            key={merchant.merchant}
                                            className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedMerchant === merchant.merchant ? 'bg-muted/50' : ''}`}
                                            onClick={() => setSelectedMerchant(merchant.merchant)}
                                        >
                                            <TableCell className="font-medium truncate max-w-[200px]">
                                                {merchant.merchant}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(merchant.totalSpent)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {merchant.transactionCount}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(merchant.averageAmount)}
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(merchant.lastTransaction)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {displayedMerchants.length > 20 && (
                        <div className="text-center text-sm text-muted-foreground mt-2">
                            Showing top 20 of {displayedMerchants.length} merchants
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
