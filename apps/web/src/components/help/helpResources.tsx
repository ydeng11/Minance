export interface HelpLink {
  id: string;
  label: string;
  description: string;
  href: string;
  external?: boolean;
}

export interface HelpResources {
  docsLinks: HelpLink[];
  supportLinks: HelpLink[];
  messengerLink: HelpLink | null;
  supportConfigured: boolean;
}

const DEFAULT_HELP_CENTER_PATH = "/help";

function normalizeExternalUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return null;
}

function normalizeSupportEmail(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.includes("@")) {
    return null;
  }

  return `mailto:${trimmed}`;
}

export function getHelpResources(): HelpResources {
  const externalDocsUrl = normalizeExternalUrl(process.env.NEXT_PUBLIC_HELP_DOCS_URL);
  const supportUrl = normalizeExternalUrl(process.env.NEXT_PUBLIC_HELP_SUPPORT_URL);
  const supportEmail = normalizeSupportEmail(process.env.NEXT_PUBLIC_HELP_SUPPORT_EMAIL);
  const messengerUrl = normalizeExternalUrl(process.env.NEXT_PUBLIC_HELP_MESSENGER_URL);

  const docsLinks: HelpLink[] = [
    {
      id: "help-center",
      label: "Help Center",
      description: "Local self-host documentation and troubleshooting.",
      href: DEFAULT_HELP_CENTER_PATH
    },
    {
      id: "csv-import-guide",
      label: "CSV Import",
      description: "Open import tools for mapping, review, and commit.",
      href: "/import"
    }
  ];

  if (externalDocsUrl) {
    docsLinks.push({
      id: "external-docs",
      label: "External Docs",
      description: "Optional hosted documentation configured by the operator.",
      href: externalDocsUrl,
      external: true
    });
  }

  const supportLinks: HelpLink[] = [];

  if (supportUrl) {
    supportLinks.push({
      id: "support-portal",
      label: "Support Portal",
      description: "Operator-configured external support endpoint.",
      href: supportUrl,
      external: true
    });
  }

  if (supportEmail) {
    supportLinks.push({
      id: "support-email",
      label: "Support Email",
      description: "Contact support via email.",
      href: supportEmail,
      external: true
    });
  }

  if (!supportLinks.length) {
    supportLinks.push({
      id: "support-fallback",
      label: "Self-host fallback",
      description: "No hosted support URL configured; use local troubleshooting docs.",
      href: `${DEFAULT_HELP_CENTER_PATH}#support-fallback`
    });
  }

  const messengerLink = messengerUrl
    ? {
        id: "support-messenger",
        label: "Support Messenger",
        description: "Optional embedded/hosted messenger configured by the operator.",
        href: messengerUrl,
        external: true
      }
    : null;

  return {
    docsLinks,
    supportLinks,
    messengerLink,
    supportConfigured: Boolean(supportUrl || supportEmail || messengerUrl)
  };
}
