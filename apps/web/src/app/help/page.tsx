import Link from "next/link";
import { BookOpenText, LifeBuoy, MessageCircle } from "lucide-react";
import { getHelpResources, type HelpLink } from "@/components/help/helpResources";

const HELP_SECTION_CLASS = "rounded-2xl border border-border-subtle bg-surface-panel/85 p-4 shadow-panel";

function HelpCard({ item }: { item: HelpLink }) {
  const classes =
    "block rounded-xl border border-border-subtle bg-surface-field p-3 transition hover:bg-surface-elevated";

  const content = (
    <>
      <h3 className="text-sm font-semibold text-text-primary">{item.label}</h3>
      <p className="mt-1 text-sm text-text-secondary">{item.description}</p>
      <p className="mt-2 text-xs text-accent">{item.href}</p>
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
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Help Center</h2>
        <p className="text-text-secondary">Self-host-first docs and support links for Minance operators.</p>
      </header>

      <section className={HELP_SECTION_CLASS}>
        <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <BookOpenText className="h-4 w-4 text-accent" />
          Documentation
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {resources.docsLinks.map((item) => (
            <HelpCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section id="support-fallback" className={HELP_SECTION_CLASS}>
        <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <LifeBuoy className="h-4 w-4 text-accent" />
          Support
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {resources.supportLinks.map((item) => (
            <HelpCard key={item.id} item={item} />
          ))}
          {resources.messengerLink ? <HelpCard item={resources.messengerLink} /> : null}
        </div>

        {resources.supportConfigured ? null : (
          <div className="mt-3 rounded-lg border border-warning/35 bg-warning-soft px-3 py-2 text-xs text-warning">
            <p className="font-semibold">No hosted support endpoint configured.</p>
            <p className="mt-1">
              Set <code>NEXT_PUBLIC_HELP_SUPPORT_URL</code>, <code>NEXT_PUBLIC_HELP_SUPPORT_EMAIL</code>, or{" "}
              <code>NEXT_PUBLIC_HELP_MESSENGER_URL</code> to enable external support channels.
            </p>
          </div>
        )}
      </section>

      <section className={HELP_SECTION_CLASS}>
        <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <MessageCircle className="h-4 w-4 text-accent" />
          Self-host Defaults
        </h3>
        <ul className="mt-2 grid gap-2 text-sm text-text-secondary">
          <li>No subscription/billing tab is required for baseline operation.</li>
          <li>CSV/manual import remains the default ingestion flow when SaaS connectors are not configured.</li>
          <li>AI features remain optional and are controlled through BYOK provider settings.</li>
        </ul>
      </section>
    </div>
  );
}
