export const DEFAULT_ACCOUNT_TYPE = "checking";
const DEFAULT_SOURCE_INSTITUTION = "Manual";
const SUPPORTED_ACCOUNT_TYPES = ["cash", "checking", "credit", "depository", "investment", "loan", "savings"];
const SUPPORTED_ACCOUNT_TYPE_SET = new Set(SUPPORTED_ACCOUNT_TYPES);

export function getSupportedAccountTypes() {
  return [...SUPPORTED_ACCOUNT_TYPES];
}

export function isSupportedAccountType(accountType: string | null | undefined) {
  const normalized = String(accountType || "").trim().toLowerCase();
  return SUPPORTED_ACCOUNT_TYPE_SET.has(normalized);
}

export function formatAccountTypeLabel(accountType: string | null | undefined) {
  return String(accountType || DEFAULT_ACCOUNT_TYPE)
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatAccountDisplayIdentifier(
  displayName: string,
  sourceInstitution: string | null | undefined,
  accountType: string | null | undefined
) {
  const institution = sourceInstitution || DEFAULT_SOURCE_INSTITUTION;
  return `${displayName} (${institution} | ${formatAccountTypeLabel(accountType)})`;
}
