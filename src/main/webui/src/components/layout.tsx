import React from 'react';
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import CatGroupingComponent from "@/components/settings/CatGroupingComponent.tsx";
import Overview from "@/components/Overview.tsx";
import { AccountManager } from "@/components/settings/AccountManager.tsx";
import Visualization from "@/components/visualization";
import { Sidebar } from "@/components/Sidebar.tsx";
import { DateRangePicker } from "@/components/utils/datePicker/date-range-picker.tsx";
import { useDateRangeStore } from "@/store/dateRangeStore";
import ImportTransactions from "@/components/utils/ImportTransactionModal.tsx";
import { Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Since Sheet is missing, I will stick to desktop-first for this step or just use a simple state for mobile menu if I don't add Sheet.

const Layout: React.FC = () => {
    const setDateRange = useDateRangeStore((state: { setDateRange: (from: string, to: string) => void }) => state.setDateRange);
    const location = useLocation();

    const currentHeader = React.useMemo(() => {
        const { pathname } = location;
        if (pathname.startsWith('/accounts')) {
            return { title: 'Settings / Accounts', subtitle: 'Manage connected bank accounts and balances.' };
        }
        if (pathname.startsWith('/categories')) {
            return { title: 'Settings / Categories', subtitle: 'Group raw bank categories into Minance categories.' };
        }
        if (pathname.startsWith('/visualization')) {
            return { title: 'Visualization', subtitle: 'Explore charts and breakdowns of your finances.' };
        }
        return { title: 'Overview', subtitle: 'Track cash flow, balances, and recent trends.' };
    }, [location]);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:block w-64 flex-shrink-0">
                <Sidebar className="h-full" />
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
                    <div className="flex items-center md:hidden">
                        {/* Mobile Menu Trigger Placeholder - would be a Sheet/Dialog trigger */}
                        <Button variant="ghost" size="icon" className="-ml-2">
                            <Menu className="h-6 w-6" />
                        </Button>
                        <span className="ml-2 font-bold text-lg">Minance</span>
                    </div>

                    <div className="flex-1 px-4 hidden md:block">
                        <div className="flex flex-col" aria-live="polite">
                            <h1 className="text-base font-semibold text-foreground">
                                {currentHeader.title}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {currentHeader.subtitle}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <DateRangePicker
                            onUpdate={({ range }) => {
                                if (range.from && range.to) {
                                    setDateRange(range.from.toISOString().split('T')[0], range.to.toISOString().split('T')[0]);
                                }
                            }}
                            initialDateFrom="2024-01-01"
                            initialDateTo="2025-12-31"
                            align="end"
                            showCompare={false}
                        />
                        <ImportTransactions />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="mx-auto max-w-7xl">
                        <Routes>
                            <Route path="/overview" element={<Overview />} />
                            <Route path="/visualization" element={<Visualization />} />
                            <Route path="/categories" element={<CatGroupingComponent />} />
                            <Route path="/accounts" element={<AccountManager />} />
                            <Route path="/settings/new-bank-account" element={<Navigate to="/accounts" replace />} />
                            <Route path="/settings/cat-grouping" element={<Navigate to="/categories" replace />} />
                            <Route path="/settings/*" element={<Navigate to="/categories" replace />} />
                            <Route path="/" element={<Overview />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
