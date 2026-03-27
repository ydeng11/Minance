import type { Account } from "@/lib/api/types";
import {
  formatAccountDisplayIdentifier,
  formatAccountTypeLabel
} from "../../../../../packages/domain/src/accounts";

export { formatAccountTypeLabel };

export function getAccountIdentifier(account: Account) {
  if (account.displayIdentifier) {
    return account.displayIdentifier;
  }
  return formatAccountDisplayIdentifier(account.displayName, account.sourceInstitution, account.accountType);
}
