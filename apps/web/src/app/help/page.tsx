import Link from "next/link";
import { BookOpenText, LifeBuoy, Shield, Server, HardDrive, Table, ChevronRight } from "lucide-react";
import { getHelpResources, type HelpLink } from "@/components/help/helpResources";

const HELP_SECTION_CLASS = "rounded-2xl border border-border-subtle bg-surface-panel/85 p-4 shadow-panel";
const HELP_LINK_CLASS =
  "inline-flex items-center gap-1.5 text-accent text-sm font-medium hover:underline";

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
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Operator Guide</h2>
        <p className="text-text-secondary">
          Self-host-first documentation for Minance operators. Deploy, configure, back up, and harden your instance.
        </p>
      </header>

      {/* ── Operator Guide ── */}
      <section id="operator-guide" className={HELP_SECTION_CLASS}>
        <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Server className="h-4 w-4 text-accent" />
          Operator Guide
        </h3>
        <div className="mt-3 space-y-3 text-sm text-text-secondary">
          <p>
            Minance Next runs as a single Docker container with SQLite persistence. No external
            database or managed services are required for baseline operation.
          </p>
          <div>
            <h4 className="font-medium text-text-primary">Quick start</h4>
            <ol className="mt-1 list-inside list-decimal space-y-1">
              <li>Copy <code>.env.selfhost.example</code> to <code>.env.selfhost</code>.</li>
              <li>Set <code>AI_CREDENTIAL_SECRET</code> to a strong random value (32+ bytes).</li>
              <li>Run <code>docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d</code>.</li>
              <li>Verify with <code>curl -I -fsS http://localhost:&lt;port&gt;</code>.</li>
            </ol>
          </div>
          <p>
            Full reference:{" "}
            <a
              href="https://github.com/ydeng11/minance/blob/main/docs/self-host-operations-runbook.md"
              target="_blank"
              rel="noreferrer"
              className={HELP_LINK_CLASS}
            >
              Self-Host Operations Runbook <ChevronRight className="h-3 w-3" />
            </a>
          </p>
        </div>
      </section>

      {/* ── Backup & Restore ── */}
      <section id="backup-restore" className={HELP_SECTION_CLASS}>
        <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <HardDrive className="h-4 w-4 text-accent" />
          Backup &amp; Restore
        </h3>
        <div className="mt-3 space-y-3 text-sm text-text-secondary">
          <div>
            <h4 className="font-medium text-text-primary">UI path</h4>
            <p className="mt-1">
              Navigate to{" "}
              <Link href="/settings" className={HELP_LINK_CLASS}>
                Settings → Data Controls → Database backups
              </Link>
              . Any signed-in user can create, list, download, and restore backups.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-text-primary">CLI scripts</h4>
            <p className="mt-1">
              Backup: <code>scripts/selfhost-backup.sh</code>
              <br />
              Restore: <code>scripts/selfhost-restore.sh --backup ./backups/&lt;stamp&gt; --apply</code>
            </p>
          </div>
          <p>
            Full reference:{" "}
            <a
              href="https://github.com/ydeng11/minance/blob/main/docs/self-host-operations-runbook.md#2-backup-and-restore-strategy"
              target="_blank"
              rel="noreferrer"
              className={HELP_LINK_CLASS}
            >
              Backup &amp; Restore Strategy <ChevronRight className="h-3 w-3" />
            </a>
          </p>
        </div>
      </section>

      {/* ── Security Checklist ── */}
      <section id="security-checklist" className={HELP_SECTION_CLASS}>
        <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Shield className="h-4 w-4 text-accent" />
          Security Checklist
        </h3>
        <div className="mt-3 space-y-2 text-sm text-text-secondary">
          <ul className="list-inside list-disc space-y-1">
            <li>Set a strong <code>AI_CREDENTIAL_SECRET</code> (32+ random bytes).</li>
            <li>Set <code>MINANCE_ALLOWED_ORIGINS</code> to explicit trusted origins.</li>
            <li>Restrict <code>.env.selfhost</code> permissions (<code>chmod 600</code>).</li>
            <li>Terminate TLS at reverse proxy and force HTTPS.</li>
            <li>Rotate provider API keys every 90 days.</li>
            <li>Run automated daily backups with monthly restore drills.</li>
          </ul>
          <p>
            Full checklist:{" "}
            <a
              href="https://github.com/ydeng11/minance/blob/main/docs/self-host-security-hardening-checklist.md"
              target="_blank"
              rel="noreferrer"
              className={HELP_LINK_CLASS}
            >
              Security Hardening Checklist <ChevronRight className="h-3 w-3" />
            </a>
          </p>
        </div>
      </section>

      {/* ── Feature Availability ── */}
      <section id="feature-matrix" className={HELP_SECTION_CLASS}>
        <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Table className="h-4 w-4 text-accent" />
          Feature Availability
        </h3>
        <div className="mt-3 overflow-x-auto text-sm text-text-secondary">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-text-muted">
                <th className="py-2 pr-4">Feature</th>
                <th className="py-2 pr-4">Self-host</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              <tr>
                <td className="py-2 pr-4 font-medium text-text-primary">Auth &amp; sessions</td>
                <td className="py-2 pr-4 text-accent">Supported</td>
                <td className="py-2">Local SQLite session store.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-text-primary">CSV import</td>
                <td className="py-2 pr-4 text-accent">Supported</td>
                <td className="py-2">Deterministic parser + manual mapping.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-text-primary">Transactions</td>
                <td className="py-2 pr-4 text-accent">Supported</td>
                <td className="py-2">CRUD, filters, day-boundary semantics.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-text-primary">Categories &amp; rules</td>
                <td className="py-2 pr-4 text-accent">Supported</td>
                <td className="py-2">CRUD, strategy tuning, mapping rules.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-text-primary">Dashboard &amp; analytics</td>
                <td className="py-2 pr-4 text-accent">Supported</td>
                <td className="py-2">Local transaction corpus only.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-text-primary">Recurring rules</td>
                <td className="py-2 pr-4 text-accent">Supported</td>
                <td className="py-2">Deterministic, no managed scheduler required.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-text-primary">Investments</td>
                <td className="py-2 pr-4 text-accent">Supported</td>
                <td className="py-2">Local holdings snapshots, no market feed required.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-text-primary">AI features</td>
                <td className="py-2 pr-4 text-warning">Optional</td>
                <td className="py-2">Requires BYOK provider keys. Deterministic fallbacks always available.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-text-primary">Account aggregation</td>
                <td className="py-2 pr-4 text-warning">Scoped out</td>
                <td className="py-2">Manual/CSV import is the default. Proprietary providers not included.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-text-primary">Backup &amp; restore</td>
                <td className="py-2 pr-4 text-accent">Supported</td>
                <td className="py-2">UI + CLI scripts, automated daily cadence recommended.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-text-primary">Saved views</td>
                <td className="py-2 pr-4 text-accent">Supported</td>
                <td className="py-2">Local persistence, portable via backup/restore.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs">
          Full matrix:{" "}
          <a
            href="https://github.com/ydeng11/minance/blob/main/docs/self-host-feature-matrix.md"
            target="_blank"
            rel="noreferrer"
            className={HELP_LINK_CLASS}
          >
            Self-Host Feature Matrix <ChevronRight className="h-3 w-3" />
          </a>
        </p>
      </section>

      {/* ── Documentation links ── */}
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

      {/* ── Support — only when external support is configured ── */}
      {resources.supportConfigured ? (
        <section className={HELP_SECTION_CLASS}>
          <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <LifeBuoy className="h-4 w-4 text-accent" />
            External Support
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            This deployment has optional external support channels configured by the operator.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {resources.supportLinks.map((item) => (
              <HelpCard key={item.id} item={item} />
            ))}
            {resources.messengerLink ? <HelpCard item={resources.messengerLink} /> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
