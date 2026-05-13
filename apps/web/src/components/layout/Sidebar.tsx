"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PieChart,
  WalletCards,
  Tags,
  Repeat2,
  UploadCloud,
  Settings,
  LineChart
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: Home, testId: "nav-dashboard" },
  { name: "Explorer", href: "/explorer", icon: LineChart, testId: "nav-explorer" },
  { name: "Transactions", href: "/transactions", icon: PieChart, testId: "nav-transactions" },
  { name: "Accounts", href: "/accounts", icon: WalletCards, testId: "nav-accounts" },
  { name: "Categories", href: "/categories", icon: Tags, testId: "nav-categories" },
  { name: "Recurrings", href: "/recurrings", icon: Repeat2, testId: "nav-recurrings" },
  // TODO(maybe-later): Re-enable Investments navigation when product scope includes investments again.
  { name: "Import CSV", href: "/import", icon: UploadCloud, testId: "nav-import" },
  { name: "Settings", href: "/settings", icon: Settings, testId: "nav-settings" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-full w-64 flex-col border-r border-border-subtle bg-surface-panel/75 px-3 py-4 shadow-panel [background-image:var(--gradient-shell)] backdrop-blur-xl"
      data-testid="desktop-sidebar"
    >
      <div className="mb-6 px-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">Workspace</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/35 bg-accent-soft">
            <div className="h-3 w-3 rounded-full bg-accent" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-text-primary">Minance</span>
        </div>
      </div>

      <nav className="flex flex-col gap-1" data-testid="primary-nav" aria-label="Primary">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
                isActive
                  ? "border border-accent/20 bg-accent-soft text-accent"
                  : "border border-transparent text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-3 text-[11px] text-text-muted">Reference parity mode</div>
    </aside>
  );
}
