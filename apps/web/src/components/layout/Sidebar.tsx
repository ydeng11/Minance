"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PieChart, LineChart, UploadCloud, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: Home, testId: "nav-dashboard" },
  { name: "Transactions", href: "/transactions", icon: PieChart, testId: "nav-transactions" },
  { name: "Investments", href: "/investments", icon: LineChart, testId: "nav-investments" },
  { name: "Import CSV", href: "/import", icon: UploadCloud, testId: "nav-import" },
  { name: "Settings", href: "/settings", icon: Settings, testId: "nav-settings" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-neutral-900 bg-neutral-950/60 px-3 py-4 backdrop-blur-xl" data-testid="desktop-sidebar">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/20">
          <div className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-neutral-100">Minance</span>
      </div>

      <nav className="flex flex-col gap-1" data-testid="primary-nav">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-3 text-[11px] text-neutral-600">Reference parity mode</div>
    </aside>
  );
}
