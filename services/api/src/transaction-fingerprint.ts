import { stableHash } from "./utils.ts";

export function buildTransactionFingerprint({
  userId,
  accountKey,
  merchantNormalized,
  amount,
  transactionDate,
  memo
}) {
  return stableHash(
    [
      userId,
      String(accountKey || ""),
      String(merchantNormalized || ""),
      Math.abs(Number(amount || 0)).toFixed(2),
      String(transactionDate || ""),
      memo ? stableHash(String(memo)) : ""
    ].join("|")
  );
}
