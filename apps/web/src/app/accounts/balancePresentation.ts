const LIABILITY_ACCOUNT_TYPES = new Set(["credit", "loan"]);

export function getAccountBalancePresentation(accountType: string, currentBalance: number) {
  const amount = Number(currentBalance);
  const signedAmount = Number.isFinite(amount) ? amount : 0;
  const isLiability = LIABILITY_ACCOUNT_TYPES.has(String(accountType || "").trim().toLowerCase());

  if (isLiability && signedAmount <= 0) {
    return {
      label: "Amount owed",
      amount: Math.abs(signedAmount)
    };
  }

  return {
    label: isLiability ? "Credit balance" : "Current balance",
    amount: signedAmount
  };
}
