"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Settings2, DatabaseZap } from "lucide-react";
import { cn } from "@/lib/utils";

const SETTINGS_MENU_ITEMS = [
  {
    name: "General",
    href: "/settings",
    icon: Settings2,
    testId: "settings-menu-general"
  },
  {
    name: "AI Settings",
    href: "/settings/ai",
    icon: Sparkles,
    testId: "settings-menu-ai"
  },
  {
    name: "Migration",
    href: "/settings/migration",
    icon: DatabaseZap,
    testId: "settings-menu-migration"
  }
];

export function SettingsMenu() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 rounded-2xl border border-neutral-900 bg-neutral-950/70 p-2"
      data-testid="settings-menu"
    >
      {SETTINGS_MENU_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/settings" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={item.testId}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-emerald-500/15 text-emerald-300"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
