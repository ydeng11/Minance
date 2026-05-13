import type { Account, Category, Transaction } from "@/lib/api/types";
import { localDateYmd, toInputDate } from "@/lib/utils";

const TAG_PATTERN = /^[a-z0-9]+(?:[ _-][a-z0-9]+)*$/;
const TAG_MAX_LENGTH = 40;
const TAG_MAX_COUNT = 25;
const TRANSACTION_TYPE_VALUES = new Set(["expense", "income", "transfer"]);

export interface TransactionFormDraft {
  id: string;
  transaction_date: string;
  description: string;
  merchant_raw: string;
  amount: string;
  direction: "outflow" | "inflow";
  category_final: string;
  account_name: string;
  memo: string;
  tags: string;
  transaction_type: "" | "expense" | "income" | "transfer";
}

export interface TransactionFormErrors {
  transaction_date?: string;
  description?: string;
  amount?: string;
  category_final?: string;
  tags?: string;
  transaction_type?: string;
}

export interface TransactionFormPayload {
  transaction_date: string;
  description: string;
  merchant_raw: string;
  amount: number;
  direction: "outflow" | "inflow";
  category_final: string;
  account_name: string;
  memo: string | null;
  tags: string[];
  transaction_type?: "expense" | "income" | "transfer";
}

export interface TransactionFormValidationResult {
  errors: TransactionFormErrors;
  payload: TransactionFormPayload | null;
}

export interface TransactionAccountOption {
  value: string;
  label: string;
}

export function createInitialTransactionDraft(options: { category?: string; today?: string } = {}): TransactionFormDraft {
  return {
    id: "",
    transaction_date: options.today || localDateYmd(),
    description: "",
    merchant_raw: "",
    amount: "",
    direction: "outflow",
    category_final: options.category || "",
    account_name: "Manual Account",
    memo: "",
    tags: "",
    transaction_type: ""
  };
}

function normalizeAccountIdentity(value: string) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findAccountByIdentity(accounts: Account[], value: string) {
  const normalized = normalizeAccountIdentity(value);
  if (!normalized) {
    return null;
  }

  return accounts.find((account) => (
    normalizeAccountIdentity(account.displayName) === normalized ||
    normalizeAccountIdentity(account.displayIdentifier || "") === normalized ||
    normalizeAccountIdentity(account.normalizedKey) === normalized
  )) || null;
}

export function buildDraftFromTransaction(transaction: Transaction, accounts: Account[] = []): TransactionFormDraft {
  const normalizedAmount = Number.isFinite(Number(transaction.amount))
    ? Math.abs(Number(transaction.amount))
    : 0;
  const normalizedFromId = transaction.account_id
    ? accounts.find((account) => account.id === transaction.account_id) || null
    : null;
  const fallbackAccount = findAccountByIdentity(accounts, transaction.account_key || "");
  const accountName = normalizedFromId?.displayName || fallbackAccount?.displayName || transaction.account_key || "Manual Account";

  return {
    id: transaction.id,
    transaction_date: toInputDate(transaction.transaction_date),
    description: transaction.description || "",
    merchant_raw: transaction.merchant_raw || "",
    amount: String(normalizedAmount),
    direction: transaction.direction === "inflow" ? "inflow" : "outflow",
    category_final: transaction.category_final || "",
    account_name: accountName,
    memo: transaction.memo || "",
    tags: Array.isArray(transaction.tags) ? transaction.tags.join(", ") : "",
    transaction_type:
      transaction.transaction_type === "expense" ||
      transaction.transaction_type === "income" ||
      transaction.transaction_type === "transfer"
        ? transaction.transaction_type
        : ""
    };
}

export function reconcileDraftAccountName(
  draft: TransactionFormDraft,
  accounts: Account[] = []
): TransactionFormDraft {
  if (!draft.id || accounts.length === 0) {
    return draft;
  }

  const matchingAccount = findAccountByIdentity(accounts, draft.account_name);
  if (!matchingAccount || matchingAccount.displayName === draft.account_name) {
    return draft;
  }

  return {
    ...draft,
    account_name: matchingAccount.displayName
  };
}

export function buildTransactionAccountOptions(
  accounts: Account[],
  currentAccountName = ""
): TransactionAccountOption[] {
  const options = accounts
    .map((account) => ({
      value: account.displayName,
      label: account.displayIdentifier || account.displayName
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  const currentRaw = String(currentAccountName || "").trim();
  const matchingAccount = findAccountByIdentity(accounts, currentRaw);
  const current = matchingAccount?.displayName || currentRaw;
  if (!current || options.some((option) => option.value === current)) {
    return options;
  }

  return [{ value: current, label: current }, ...options];
}

export function buildTransactionFilterAccountOptions(
  accounts: Account[],
  transactionAccountKeys: Array<string | null | undefined> = []
): TransactionAccountOption[] {
  const options = new Map<string, string>();

  for (const account of accounts) {
    if (!account.normalizedKey) {
      continue;
    }

    options.set(account.normalizedKey, account.displayIdentifier || account.displayName || account.normalizedKey);
  }

  for (const rawKey of transactionAccountKeys) {
    const key = String(rawKey || "").trim();
    if (!key || options.has(key)) {
      continue;
    }

    options.set(key, key);
  }

  return Array.from(options.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function normalizeComparable(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeCategory(categoryName: string, categories: Category[]) {
  const normalized = normalizeComparable(categoryName);
  if (!normalized) {
    return null;
  }

  const direct = categories.find((entry) => normalizeComparable(entry.name) === normalized);
  return direct || null;
}

export function parseTagListInput(rawInput: string): { tags: string[]; error?: string } {
  const tags = String(rawInput || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (tags.length > TAG_MAX_COUNT) {
    return {
      tags: [],
      error: `Use up to ${TAG_MAX_COUNT} tags.`
    };
  }

  const normalizedTags: string[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    if (tag.length > TAG_MAX_LENGTH) {
      return {
        tags: [],
        error: `Tags must be ${TAG_MAX_LENGTH} characters or fewer.`
      };
    }

    if (!TAG_PATTERN.test(tag)) {
      return {
        tags: [],
        error: "Tags can include letters/numbers separated by spaces, dashes, or underscores."
      };
    }

    if (!seen.has(tag)) {
      seen.add(tag);
      normalizedTags.push(tag);
    }
  }

  return {
    tags: normalizedTags
  };
}

export function validateTransactionDraft(
  draft: TransactionFormDraft,
  categories: Category[]
): TransactionFormValidationResult {
  const errors: TransactionFormErrors = {};

  const transactionDate = String(draft.transaction_date || "").trim();
  const description = String(draft.description || "").trim();
  const merchantRaw = String(draft.merchant_raw || "").trim();
  const categoryName = String(draft.category_final || "").trim();
  const accountName = String(draft.account_name || "").trim() || "Manual Account";
  const memo = String(draft.memo || "").trim();
  const amountValue = Number(draft.amount);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
    errors.transaction_date = "Date is required.";
  }

  if (!description) {
    errors.description = "Description is required.";
  }

  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    errors.amount = "Amount must be greater than 0.";
  }

  const categoryMatch = normalizeCategory(categoryName, categories);
  if (!categoryName) {
    errors.category_final = "Category is required.";
  } else if (categories.length > 0 && !categoryMatch) {
    errors.category_final = "Category must match an existing category.";
  }

  const parsedTags = parseTagListInput(draft.tags);
  if (parsedTags.error) {
    errors.tags = parsedTags.error;
  }

  const transactionType = String(draft.transaction_type || "").trim().toLowerCase();
  if (transactionType && !TRANSACTION_TYPE_VALUES.has(transactionType)) {
    errors.transaction_type = "Transaction type is invalid.";
  }

  if (transactionType === "expense" && draft.direction === "inflow") {
    errors.transaction_type = "Expense type cannot use inflow direction.";
  }
  if (transactionType === "income" && draft.direction === "outflow") {
    errors.transaction_type = "Income type cannot use outflow direction.";
  }
  if (normalizeComparable(categoryName) === "transfer" && transactionType && transactionType !== "transfer") {
    errors.transaction_type = "Transfer category must use transfer type.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      payload: null
    };
  }

  const payload: TransactionFormPayload = {
    transaction_date: transactionDate,
    description,
    merchant_raw: merchantRaw || description,
    amount: Math.abs(amountValue),
    direction: draft.direction,
    category_final: categoryMatch?.name || categoryName,
    account_name: accountName,
    memo: memo || null,
    tags: parsedTags.tags
  };

  if (transactionType) {
    payload.transaction_type = transactionType as "expense" | "income" | "transfer";
  }

  return {
    errors: {},
    payload
  };
}

/** Maps draft fields to `TransactionFormErrors` keys for inline blur validation. */
export const TRANSACTION_FORM_FIELD_ERROR_KEYS: Partial<
  Record<keyof TransactionFormDraft, keyof TransactionFormErrors>
> = {
  transaction_date: "transaction_date",
  description: "description",
  amount: "amount",
  category_final: "category_final",
  tags: "tags",
  transaction_type: "transaction_type"
};
