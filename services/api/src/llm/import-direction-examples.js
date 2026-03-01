export const IMPORT_DIRECTION_FEW_SHOT_EXAMPLES = [
  {
    fixture: "amex_credit.csv",
    headers: ["Date", "Description", "Amount", "Category"],
    observations: [
      "Most purchase rows have positive amounts.",
      "Statement/payment adjustments appear as negative amounts."
    ],
    expected: {
      amount_mode: "single_amount",
      sign_convention: "positive_is_debit"
    }
  },
  {
    fixture: "chase_credit.csv",
    headers: ["Transaction Date", "Description", "Type", "Amount"],
    observations: [
      "Sale/purchase rows are negative.",
      "Payment rows are positive."
    ],
    expected: {
      amount_mode: "single_amount",
      sign_convention: "negative_is_debit"
    }
  },
  {
    fixture: "citi_credit.csv",
    headers: ["Date", "Description", "Debit", "Credit"],
    observations: [
      "Debit and Credit are separate amount columns.",
      "Debit column indicates expenses and Credit column indicates inflows/payments."
    ],
    expected: {
      amount_mode: "split_debit_credit",
      sign_convention: "split_columns"
    }
  },
  {
    fixture: "cash_app_debit.csv",
    headers: ["Date", "Transaction Type", "Amount", "Status"],
    observations: [
      "Card debits and sent P2P rows are negative.",
      "Boost/refund-like rows are positive."
    ],
    expected: {
      amount_mode: "single_amount",
      sign_convention: "negative_is_debit"
    }
  },
  {
    fixture: "minance_credit_debit.csv",
    headers: ["Transaction Date", "Description", "Type", "Amount"],
    observations: [
      "Sale/purchase rows are positive.",
      "Payment rows are negative."
    ],
    expected: {
      amount_mode: "single_amount",
      sign_convention: "positive_is_debit"
    }
  }
];
