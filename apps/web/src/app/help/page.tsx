import Link from "next/link";
import { BookOpenText, LifeBuoy, MessageCircle } from "lucide-react";
import { getHelpResources, type HelpLink } from "@/components/help/helpResources";

function HelpCard({ item }: { item: HelpLink }) {
  const classes =
    "block rounded-xl border border-neutral-900 bg-neutral-950/70 p-3 transition hover:border-neutral-700 hover:bg-neutral-900";

  const content = (
    <>
      <h3 className="text-sm font-semibold text-neutral-100">{item.label}</h3>
      <p className="mt-1 text-sm text-neutral-400">{item.description}</p>
      <p className="mt-2 text-xs text-emerald-300">{item.href}</p>
    </>
  );

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" className={classes} data-testid={`help-page-link-${item.id}`}>
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} className={classes} data-testid={`help-page-link-${item.id}`}>
      {content}
    </Link>
  );
}

export default function HelpPage() {
  const resources = getHelpResources();

  return (
    <div className="space-y-6" data-testid="help-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Help Center</h2>
        <p className="text-neutral-400">Self-host-first docs and support links for Minance operators.</p>
      </header>

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
          <BookOpenText className="h-4 w-4 text-emerald-400" />
          Documentation
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {resources.docsLinks.map((item) => (
            <HelpCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section id="support-fallback" className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
          <LifeBuoy className="h-4 w-4 text-emerald-400" />
          Support
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {resources.supportLinks.map((item) => (
            <HelpCard key={item.id} item={item} />
          ))}
          {resources.messengerLink ? <HelpCard item={resources.messengerLink} /> : null}
        </div>

        {resources.supportConfigured ? null : (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            <p className="font-semibold">No hosted support endpoint configured.</p>
            <p className="mt-1">
              Set <code>NEXT_PUBLIC_HELP_SUPPORT_URL</code>, <code>NEXT_PUBLIC_HELP_SUPPORT_EMAIL</code>, or{" "}
              <code>NEXT_PUBLIC_HELP_MESSENGER_URL</code> to enable external support channels.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
          <MessageCircle className="h-4 w-4 text-emerald-400" />
          Self-host Defaults
        </h3>
        <ul className="mt-2 grid gap-2 text-sm text-neutral-400">
          <li>No subscription/billing tab is required for baseline operation.</li>
          <li>CSV/manual import remains the default ingestion flow when SaaS connectors are not configured.</li>
          <li>AI features remain optional and are controlled through BYOK provider settings.</li>
        </ul>
      </section>
    </div>
  );
}
