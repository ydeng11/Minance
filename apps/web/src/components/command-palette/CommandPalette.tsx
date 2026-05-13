"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  HelpCircle,
  Home,
  LineChart,
  MessageSquare,
  PieChart,
  Repeat2,
  Settings,
  Tags,
  UploadCloud,
  WalletCards
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: Array<{
  href: string;
  label: string;
  keywords?: string[];
  icon: typeof Home;
}> = [
  { href: "/", label: "Dashboard", keywords: ["home"], icon: Home },
  { href: "/explorer", label: "Explorer", icon: LineChart },
  { href: "/transactions", label: "Transactions", keywords: ["txn", "ledger"], icon: PieChart },
  { href: "/accounts", label: "Accounts", icon: WalletCards },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/recurrings", label: "Recurrings", keywords: ["recurring"], icon: Repeat2 },
  { href: "/import", label: "Import CSV", keywords: ["csv", "upload"], icon: UploadCloud },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/ai", label: "AI settings", keywords: ["models", "providers"], icon: Settings },
  { href: "/assistant", label: "Assistant", keywords: ["chat", "ai"], icon: MessageSquare },
  { href: "/help", label: "Help", icon: HelpCircle }
];

const itemClassName =
  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-primary outline-none data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command menu"
      overlayClassName="fixed inset-0 z-[200] bg-app-bg/70 backdrop-blur-sm"
      contentClassName={cn(
        "fixed left-1/2 top-[12%] z-[201] w-[min(100vw-2rem,28rem)] -translate-x-1/2",
        "overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel shadow-dialog",
        "[&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-border-subtle [&_[cmdk-input-wrapper]]:px-3 [&_[cmdk-input-wrapper]]:py-3",
        "[&_[cmdk-input]]:w-full [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:text-sm [&_[cmdk-input]]:text-text-primary",
        "[&_[cmdk-input]]:outline-none [&_[cmdk-input]]:placeholder:text-text-muted",
        "[&_[cmdk-list]]:max-h-[min(60vh,22rem)] [&_[cmdk-list]]:scroll-py-2 [&_[cmdk-list]]:p-2",
        "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-text-muted",
        "[&_[cmdk-empty]]:px-3 [&_[cmdk-empty]]:py-8 [&_[cmdk-empty]]:text-center [&_[cmdk-empty]]:text-sm [&_[cmdk-empty]]:text-text-muted"
      )}
    >
      <Command.Input aria-label="Search command menu" placeholder="Go to page or search…" />
      <Command.List>
        <Command.Empty>No matching pages.</Command.Empty>
        <Command.Group heading="Navigation">
          {NAV.map((entry) => (
            <Command.Item
              key={entry.href}
              value={`${entry.label} ${entry.href} ${entry.keywords?.join(" ") ?? ""}`}
              keywords={entry.keywords}
              onSelect={() => go(entry.href)}
              className={itemClassName}
            >
              <entry.icon className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
              {entry.label}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
