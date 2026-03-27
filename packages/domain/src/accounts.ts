const DEFAULT_ACCOUNT_TYPE = "checking";
const DEFAULT_SOURCE_INSTITUTION = "Manual";

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
