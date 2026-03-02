"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PieChart,
  WalletCards,
  Tags,
  Repeat2,
  LineChart,
  UploadCloud,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Home", href: "/", icon: Home, testId: "mnav-dashboard" },
  { name: "Txns", href: "/transactions", icon: PieChart, testId: "mnav-transactions" },
  { name: "Accts", href: "/accounts", icon: WalletCards, testId: "mnav-accounts" },
  { name: "Cats", href: "/categories", icon: Tags, testId: "mnav-categories" },
  { name: "Recur", href: "/recurrings", icon: Repeat2, testId: "mnav-recurrings" },
  { name: "Invest", href: "/investments", icon: LineChart, testId: "mnav-investments" },
  { name: "Import", href: "/import", icon: UploadCloud, testId: "mnav-import" },
  { name: "Settings", href: "/settings", icon: Settings, testId: "mnav-settings" }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-900 bg-neutral-950/90 px-2 py-2 backdrop-blur-xl md:hidden"
      data-testid="mobile-nav"
      aria-label="Primary"
    >
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-[62px] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
                isActive ? "text-emerald-400" : "text-neutral-500 hover:text-neutral-200"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-emerald-400")} aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
