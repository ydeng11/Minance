import { getSupportedAccountTypes as getCanonicalSupportedAccountTypes } from "../../../../../packages/domain/src/accounts";

export function resolveSupportedAccountTypes(accountTypes: string[]) {
  return accountTypes.length ? accountTypes : getCanonicalSupportedAccountTypes();
}
