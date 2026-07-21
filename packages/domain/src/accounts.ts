export const DEFAULT_ACCOUNT_TYPE = "checking";
const DEFAULT_SOURCE_INSTITUTION = "Manual";
const DEFAULT_RENEWAL_CYCLE_MONTHS = 12;
const SUPPORTED_ACCOUNT_TYPES = ["cash", "checking", "credit", "depository", "investment", "loan", "savings"];
const SUPPORTED_ACCOUNT_TYPE_SET = new Set(SUPPORTED_ACCOUNT_TYPES);

export interface AccountBenefit {
  id: string;
  name: string;
  monetaryValue: number | null;
  used: boolean;
  lastUsedDate: string | null;
  consumable: boolean;
}

export interface CreditCardMetadata {
  annualFee: number | null;
  activationDate: string | null;
  lastRenewalDate: string | null;
  renewalCycleMonths: number;
  benefits: AccountBenefit[];
}

export type AccountClassMetadata =
  | { type: "credit"; credit: CreditCardMetadata }
  | { type: "loan" }
  | { type: "investment" }
  | { type: "savings" }
  | { type: "checking" }
  | { type: "depository" }
  | { type: "cash" };

export function getSupportedAccountTypes() {
  return [...SUPPORTED_ACCOUNT_TYPES];
}

function normalizeAccountType(accountType: string | null | undefined): string {
  return String(accountType || "").trim().toLowerCase();
}

export function isSupportedAccountType(accountType: string | null | undefined) {
  return SUPPORTED_ACCOUNT_TYPE_SET.has(normalizeAccountType(accountType));
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

/**
 * Computes the next renewal date given activation and/or last renewal date.
 * Priority: lastRenewalDate + cycle > activationDate + cycle > null.
 * Returns ISO date string or null if insufficient data.
 */
export function computeNextRenewalDate(
  activationDate: string | null | undefined,
  lastRenewalDate: string | null | undefined,
  renewalCycleMonths: number
): string | null {
  if (!renewalCycleMonths || renewalCycleMonths < 1) return null;

  const baseDate = lastRenewalDate || activationDate;
  if (!baseDate) return null;

  const parsed = new Date(baseDate + "T00:00:00Z");
  if (Number.isNaN(parsed.getTime())) return null;

  parsed.setUTCMonth(parsed.getUTCMonth() + renewalCycleMonths);
  return parsed.toISOString().slice(0, 10);
}

/**
 * Returns true if the card's nextRenewalDate is in the past (benefits should reset).
 * Compares ISO date strings to avoid timezone inconsistencies.
 */
export function shouldRenewBenefits(metadata: CreditCardMetadata): boolean {
  const nextDate = computeNextRenewalDate(
    metadata.activationDate,
    metadata.lastRenewalDate,
    metadata.renewalCycleMonths
  );
  if (!nextDate) return false;

  const todayStr = new Date().toISOString().slice(0, 10);
  return nextDate <= todayStr;
}

/**
 * Resets all benefits' used flags and optionally sets a new lastRenewalDate.
 * All benefits (both consumable and earning rates) are reset so users
 * can cross off temporarily maxed-out categories each cycle.
 * Returns a shallow copy with updated fields.
 */
export function resetBenefitsForRenewal(
  metadata: CreditCardMetadata,
  renewalDate?: string | null
): CreditCardMetadata {
  return {
    ...metadata,
    lastRenewalDate: renewalDate ?? metadata.lastRenewalDate,
    benefits: metadata.benefits.map((benefit) => ({
      ...benefit,
      used: false,
      lastUsedDate: null
    }))
  };
}

/**
 * Creates a default AccountClassMetadata for a given account type.
 * Non-credit types return null. Credit gets sensible defaults.
 */
export function createDefaultClassMetadata(
  accountType: string | null | undefined
): AccountClassMetadata | null {
  if (normalizeAccountType(accountType) === "credit") {
    return {
      type: "credit",
      credit: {
        annualFee: null,
        activationDate: null,
        lastRenewalDate: null,
        renewalCycleMonths: DEFAULT_RENEWAL_CYCLE_MONTHS,
        benefits: []
      }
    };
  }

  return null;
}

/**
 * Infer account class from an account type string.
 */
export function inferAccountClass(
  accountType: string | null | undefined
): AccountClassMetadata["type"] | null {
  const normalized = normalizeAccountType(accountType);
  if (SUPPORTED_ACCOUNT_TYPE_SET.has(normalized)) {
    return normalized as AccountClassMetadata["type"];
  }
  return null;
}
