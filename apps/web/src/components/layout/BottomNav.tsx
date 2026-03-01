"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PieChart, LineChart, UploadCloud, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Home", href: "/", icon: Home, testId: "mnav-dashboard" },
  { name: "Txns", href: "/transactions", icon: PieChart, testId: "mnav-transactions" },
  { name: "Invest", href: "/investments", icon: LineChart, testId: "mnav-investments" },
  { name: "Import", href: "/import", icon: UploadCloud, testId: "mnav-import" },
  { name: "Settings", href: "/settings", icon: Settings, testId: "mnav-settings" }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-neutral-900 bg-neutral-950/90 p-3 backdrop-blur-xl md:hidden" data-testid="mobile-nav">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={item.testId}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors",
              isActive ? "text-emerald-400" : "text-neutral-500 hover:text-neutral-200"
            )}
          >
            <item.icon className={cn("h-4 w-4", isActive && "text-emerald-400")} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
