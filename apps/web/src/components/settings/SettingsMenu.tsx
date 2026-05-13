"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Settings2 } from "lucide-react";
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
  }
];

export function SettingsMenu() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 rounded-2xl border border-border-subtle bg-surface-panel/85 p-2 shadow-panel"
      data-testid="settings-menu"
      aria-label="Settings sections"
    >
      {SETTINGS_MENU_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/settings" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={item.testId}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
              isActive
                ? "bg-accent-soft text-accent"
                : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
