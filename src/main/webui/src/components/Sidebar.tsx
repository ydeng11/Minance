import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    PieChart,
    Settings,
    Wallet,
    CreditCard
} from 'lucide-react';
import { Button } from "@/components/ui/button";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
    const location = useLocation();

    const links = [
        { name: 'Overview', href: '/overview', icon: LayoutDashboard },
        { name: 'Visualization', href: '/visualization', icon: PieChart },
        { name: 'Categories', href: '/categories', icon: Settings },
        { name: 'Accounts', href: '/accounts', icon: CreditCard },
    ];

    return (
        <div className={cn("pb-12 min-h-screen border-r bg-card", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <div className="flex items-center px-4 mb-6">
                        <Wallet className="mr-2 h-6 w-6 text-primary" />
                        <h2 className="text-xl font-bold tracking-tight text-primary">
                            Minance
                        </h2>
                    </div>
                    <div className="space-y-1">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = location.pathname.startsWith(link.href) || (link.href === '/overview' && location.pathname === '/');
                            return (
                                <Button
                                    key={link.href}
                                    asChild
                                    variant={isActive ? "secondary" : "ghost"}
                                    className={cn(
                                        "w-full justify-start",
                                        isActive ? "bg-secondary text-primary font-medium" : "text-muted-foreground"
                                    )}
                                >
                                    <NavLink to={link.href}>
                                        <Icon className="mr-2 h-4 w-4" />
                                        {link.name}
                                    </NavLink>
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
