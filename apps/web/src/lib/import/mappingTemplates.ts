export const CANONICAL_IMPORT_FIELDS = [
  "date",
  "merchant",
  "description",
  "amount",
  "currency",
  "account",
  "category_raw",
  "memo"
] as const;

export type CanonicalImportField = (typeof CANONICAL_IMPORT_FIELDS)[number];

export interface ImportMappingTemplate {
  id: string;
  label: string;
  description: string;
  aliases: Partial<Record<CanonicalImportField, string[]>>;
}

export interface ResolvedTemplateMapping {
  mapping: Record<string, string | null>;
  matchedFields: CanonicalImportField[];
  unmatchedFields: CanonicalImportField[];
}

const IMPORT_MAPPING_TEMPLATES: ImportMappingTemplate[] = [
  {
    id: "generic_statement",
    label: "Generic Statement",
    description: "Standard bank/card statement headers with one signed amount column.",
    aliases: {
      date: ["date", "transaction date", "posted date", "post date"],
      merchant: ["merchant", "payee", "name", "description"],
      description: ["description", "details", "memo"],
      amount: ["amount", "transaction amount", "value"],
      currency: ["currency", "curr"],
      account: ["account", "account name", "card"],
      category_raw: ["category", "type"],
      memo: ["memo", "note", "notes"]
    }
  },
  {
    id: "split_outflow_inflow",
    label: "Split Outflow/Inflow",
    description: "Statements that provide separate outflow and inflow columns.",
    aliases: {
      date: ["date", "transaction date"],
      merchant: ["description", "merchant", "payee", "name"],
      description: ["memo", "details", "reference"],
      amount: ["outflow", "inflow", "debit", "credit", "amount"],
      currency: ["currency"],
      account: ["account", "account name"],
      category_raw: ["category"],
      memo: ["memo", "notes", "comment"]
    }
  },
  {
    id: "chase_csv",
    label: "Chase CSV",
    description: "Typical Chase export fields.",
    aliases: {
      date: ["transaction date", "post date", "date"],
      merchant: ["description", "merchant", "payee"],
      description: ["description", "memo"],
      amount: ["amount"],
      account: ["account", "account number"],
      category_raw: ["category", "type"],
      memo: ["memo", "notes"]
    }
  },
  {
    id: "balance_snapshot",
    label: "Balance Snapshot",
    description: "Account balance snapshots converted into importable rows.",
    aliases: {
      date: ["date", "as of", "snapshot date"],
      merchant: ["account", "account name"],
      description: ["description", "balance type", "notes"],
      amount: ["balance", "ending balance", "current balance", "amount"],
      currency: ["currency"],
      account: ["account", "account name"],
      memo: ["memo", "notes"]
    }
  }
];

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ");
}

function findHeaderMatch(
  headers: string[],
  usedHeaders: Set<string>,
  aliases: string[]
) {
  const normalizedAliases = aliases.map(normalizeHeader);

  for (const header of headers) {
    if (usedHeaders.has(header)) {
      continue;
    }
    const normalizedHeader = normalizeHeader(header);
    if (normalizedAliases.includes(normalizedHeader)) {
      return header;
    }
  }

  for (const header of headers) {
    if (usedHeaders.has(header)) {
      continue;
    }
    const normalizedHeader = normalizeHeader(header);
    if (normalizedAliases.some((alias) => normalizedHeader.includes(alias))) {
      return header;
    }
  }

  return null;
}

export function getImportMappingTemplates() {
  return IMPORT_MAPPING_TEMPLATES.slice();
}

export function resolveTemplateMapping(
  template: ImportMappingTemplate,
  headers: string[],
  seedMapping: Record<string, string | null> = {}
): ResolvedTemplateMapping {
  const usedHeaders = new Set<string>();
  const mapping: Record<string, string | null> = {};
  const matchedFields: CanonicalImportField[] = [];
  const unmatchedFields: CanonicalImportField[] = [];

  for (const field of CANONICAL_IMPORT_FIELDS) {
    const aliases = template.aliases[field] || [];
    const matchedHeader = aliases.length ? findHeaderMatch(headers, usedHeaders, aliases) : null;

    if (matchedHeader) {
      mapping[field] = matchedHeader;
      usedHeaders.add(matchedHeader);
      matchedFields.push(field);
      continue;
    }

    const seededHeader = seedMapping[field];
    if (seededHeader && headers.includes(seededHeader) && !usedHeaders.has(seededHeader)) {
      mapping[field] = seededHeader;
      usedHeaders.add(seededHeader);
      matchedFields.push(field);
      continue;
    }

    if (field === "account" && typeof mapping.merchant === "string" && headers.includes(mapping.merchant)) {
      mapping[field] = mapping.merchant;
      matchedFields.push(field);
      continue;
    }

    mapping[field] = null;
    unmatchedFields.push(field);
  }

  return {
    mapping,
    matchedFields,
    unmatchedFields
  };
}
